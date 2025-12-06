


import OfflineStorageService from './OfflineStorageService.js';

class OfflineSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncQueue = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000;
    
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  


  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingMessages();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });


    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.syncPendingMessages();
      }
    });
  }

  


  startPeriodicSync() {

    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingMessages();
      }
    }, 30000);


    setInterval(() => {
      this.cleanupOldMessages();
    }, 3600000);
  }

  


  async syncPendingMessages(userId = null) {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingMessages = await OfflineStorageService.getPendingMessages(userId);
      
      if (pendingMessages.length === 0) {
        return;
      }


      const syncPromises = pendingMessages.map(message => 
        this.syncSingleMessage(message)
      );

      const results = await Promise.allSettled(syncPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;


      this.emitSyncComplete(successful, failed);

    } catch (error) {
    } finally {
      this.syncInProgress = false;
    }
  }

  


  async syncSingleMessage(message) {
    const messageKey = `${message.conversationId}_${message.messageId}`;
    

    if (this.syncQueue.has(messageKey)) {
      return;
    }

    this.syncQueue.add(messageKey);

    try {

      if (message.syncStatus === 'synced') {
        this.syncQueue.delete(messageKey);
        return;
      }


      const response = await this.sendMessageToServer(message);
      
      if (response.success) {

        await OfflineStorageService.markMessageAsSynced(message.id);
        

        this.retryAttempts.delete(messageKey);
        
        

        this.emitMessageSynced(message, response.serverMessage);
        
      } else {
        throw new Error(response.error || 'Falha na sincronização');
      }

    } catch (error) {
      

      await this.handleSyncRetry(messageKey, message, error);
      
    } finally {
      this.syncQueue.delete(messageKey);
    }
  }

  


  async sendMessageToServer(message) {
    const apiUrl = process.env.REACT_APP_API_URL || 'https://zenith.enrelyugi.com.br';
    
    try {
      const response = await fetch(`${apiUrl}/api/messages/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversationId: message.conversationId,
          message: {
            content: message.content,
            sender: message.sender,
            timestamp: message.timestamp,
            messageId: message.messageId,
            isOfflineMessage: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, serverMessage: data.message };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  


  async handleSyncRetry(messageKey, message, error) {
    const attempts = this.retryAttempts.get(messageKey) || 0;
    
    if (attempts < this.maxRetries) {
      this.retryAttempts.set(messageKey, attempts + 1);
      
      

      const delay = this.retryDelay * Math.pow(2, attempts);
      
      setTimeout(() => {
        if (this.isOnline) {
          this.syncSingleMessage(message);
        }
      }, delay);
      
    } else {
      

      await this.markMessageAsFailed(message, error);
      
      this.retryAttempts.delete(messageKey);
    }
  }

  


  async markMessageAsFailed(message, error) {
    try {

      const transaction = OfflineStorageService.db.transaction(['offlineMessages'], 'readwrite');
      const store = transaction.objectStore('offlineMessages');
      
      message.syncStatus = 'failed';
      message.failedAt = new Date().toISOString();
      message.failureReason = error.message;
      
      await store.put(message);
      
      

      this.emitMessageFailed(message, error);
      
    } catch (dbError) {
    }
  }

  


  async storeIncomingMessage(message, conversationId, userId) {
    try {

      const existingMessages = await OfflineStorageService.getOfflineMessages(conversationId, userId);
      const isDuplicate = existingMessages.some(existing => 
        existing.messageId === message.id || 
        (existing.content === message.content && 
         Math.abs(existing.timestamp - message.timestamp) < 1000)
      );

      if (isDuplicate) {
        return false;
      }


      const offlineMessage = {
        ...message,
        syncStatus: 'synced',
        receivedOffline: true
      };

      await OfflineStorageService.storeOfflineMessage(offlineMessage, conversationId, userId);
      
      

      this.emitOfflineMessageReceived(message, conversationId);
      
      return true;

    } catch (error) {
      return false;
    }
  }

  


  async getOfflineMessagesForDisplay(conversationId, userId) {
    try {
      const messages = await OfflineStorageService.getOfflineMessages(conversationId, userId);
      

      const displayMessages = messages.filter(msg => 
        msg.syncStatus === 'synced' || msg.syncStatus === 'pending'
      );

      
      return displayMessages;

    } catch (error) {
      return [];
    }
  }

  


  async cleanupOldMessages() {
    try {
      const deletedCount = await OfflineStorageService.cleanupSyncedMessages(7);
      
      if (deletedCount > 0) {
      }

    } catch (error) {
    }
  }

  


  async getSyncStats() {
    try {
      const storageStats = await OfflineStorageService.getStorageStats();
      
      return {
        ...storageStats,
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        queueSize: this.syncQueue.size,
        retryCount: this.retryAttempts.size
      };

    } catch (error) {
      return null;
    }
  }

  


  async forcSync(userId = null) {
    if (this.syncInProgress) {
      return false;
    }

    if (!this.isOnline) {
      return false;
    }

    await this.syncPendingMessages(userId);
    return true;
  }


  emitSyncComplete(successful, failed) {
    window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
      detail: { successful, failed, timestamp: Date.now() }
    }));
  }

  emitMessageSynced(message, serverMessage) {
    window.dispatchEvent(new CustomEvent('offlineMessageSynced', {
      detail: { message, serverMessage, timestamp: Date.now() }
    }));
  }

  emitMessageFailed(message, error) {
    window.dispatchEvent(new CustomEvent('offlineMessageFailed', {
      detail: { message, error: error.message, timestamp: Date.now() }
    }));
  }

  emitOfflineMessageReceived(message, conversationId) {
    window.dispatchEvent(new CustomEvent('offlineMessageReceived', {
      detail: { message, conversationId, timestamp: Date.now() }
    }));
  }
}

export default new OfflineSyncService();
