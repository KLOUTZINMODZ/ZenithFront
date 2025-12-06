


import { localStorageService, type StoredMessage } from './localStorageService';
import unifiedCacheService from './unifiedCacheService';

interface MessageStorageOptions {
  forceSync?: boolean;
  includeTempMessages?: boolean;
  debugMode?: boolean;
}

class MessageStorageManager {
  private static instance: MessageStorageManager;

  static getInstance(): MessageStorageManager {
    if (!MessageStorageManager.instance) {
      MessageStorageManager.instance = new MessageStorageManager();
    }
    return MessageStorageManager.instance;
  }

  private log(_message: string, _data?: any): void {

  }

  


  saveMessage(conversationId: string, message: any, currentUserId?: string): boolean {
    try {
      if (!message || !conversationId) {
        this.log('❌ Dados inválidos para salvamento', { conversationId, message });
        return false;
      }


      const storedMessage: StoredMessage = {
        _id: message._id || message.tempId || `temp_${Date.now()}`,
        conversation: conversationId,
        sender: this.normalizeSender(message.sender, currentUserId),
        content: message.content || '',
        type: message.type || 'text',
        attachments: message.attachments || [],
        createdAt: message.createdAt || new Date().toISOString(),
        readBy: message.readBy || [],
        deliveredTo: message.deliveredTo || [],
        status: message.status || 'sent',
        tempId: message.tempId,
        isTemporary: message.isTemporary || false
      };


      const hasContent = storedMessage.content && storedMessage.content.trim().length > 0;
      const hasAttachments = Array.isArray(storedMessage.attachments) && storedMessage.attachments.length > 0;
      if (!hasContent && !hasAttachments) {
        this.log('⚠️ Mensagem sem conteúdo/arquivo, pulando salvamento');
        return false;
      }


      localStorageService.addMessage(conversationId, storedMessage);
      

      unifiedCacheService.addMessage(conversationId, {
        _id: storedMessage._id,
        conversation: conversationId,
        sender: storedMessage.sender,
        content: storedMessage.content,
        type: storedMessage.type,
        attachments: storedMessage.attachments || [],
        createdAt: storedMessage.createdAt,
        readBy: storedMessage.readBy,
        deliveredTo: storedMessage.deliveredTo,
        status: storedMessage.status,
        tempId: storedMessage.tempId,
        isTemporary: storedMessage.isTemporary
      });

      this.log('Mensagem salva com sucesso', {
        id: storedMessage._id,
        tempId: storedMessage.tempId,
        content: storedMessage.content.substring(0, 50),
        isOwn: this.isOwnMessage(storedMessage, currentUserId)
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  


  loadMessages(conversationId: string, options: MessageStorageOptions = {}): StoredMessage[] {
    try {
      const { includeTempMessages = true } = options;


      let messages = localStorageService.loadConversationMessages(conversationId);

      
      const cacheMessages = unifiedCacheService.getMessages(conversationId);
      
      
      const messageMap = new Map<string, StoredMessage>();
      const tempIdToRealId = new Map<string, string>();
      
      
      const allMessages = [...messages, ...cacheMessages.map(cm => ({
        _id: cm._id,
        conversation: conversationId,
        sender: cm.sender,
        content: cm.content,
        type: cm.type,
        createdAt: cm.createdAt,
        readBy: cm.readBy || [],
        deliveredTo: cm.deliveredTo || [],
        status: cm.status,
        tempId: cm.tempId,
        isTemporary: cm.isTemporary
      } as StoredMessage))];
      
      allMessages.forEach(msg => {
        if (msg._id && msg.tempId && !msg._id.startsWith('temp_') && !msg.isTemporary) {
          tempIdToRealId.set(msg.tempId, msg._id);
        }
      });
      
      
      allMessages.forEach(msg => {
        
        if (msg.isTemporary && msg.tempId && tempIdToRealId.has(msg.tempId)) {
          this.log('⚠️ Pulando mensagem temporária duplicada', { 
            tempId: msg.tempId, 
            realId: tempIdToRealId.get(msg.tempId) 
          });
          return; 
        }
        
        
        const key = msg._id && !msg._id.startsWith('temp_') 
          ? msg._id 
          : msg.tempId 
          ? (tempIdToRealId.get(msg.tempId) || msg.tempId)
          : `${msg.content}_${msg.createdAt}`;
          
        
        const existing = messageMap.get(key);
        if (existing) {
          
          if (!existing.isTemporary && msg.isTemporary) {
            return; 
          }
          
          if (existing._id && !existing._id.startsWith('temp_') && (!msg._id || msg._id.startsWith('temp_'))) {
            return; 
          }
        }
        
        messageMap.set(key, msg);
      });

      messages = Array.from(messageMap.values());

      if (!includeTempMessages) {
        messages = messages.filter(msg => !msg.isTemporary);
      }


      messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      this.log(`📥 Carregou ${messages.length} mensagens da conversa ${conversationId}`);

      return messages;
    } catch (error) {
            return [];
    }
  }

  


  saveMessages(conversationId: string, messages: any[], currentUserId?: string): number {
    let savedCount = 0;
    
    messages.forEach(message => {
      if (this.saveMessage(conversationId, message, currentUserId)) {
        savedCount++;
      }
    });

    this.log(`💾 Salvou ${savedCount}/${messages.length} mensagens da conversa ${conversationId}`);
    return savedCount;
  }

  


  private normalizeSender(sender: any, currentUserId?: string): StoredMessage['sender'] {
    if (!sender) {
      return {
        _id: currentUserId || 'unknown',
        name: 'Unknown User',
        profileImage: undefined
      };
    }

    if (typeof sender === 'string') {
      return {
        _id: sender,
        name: sender === currentUserId ? 'Você' : 'Unknown User',
        profileImage: undefined
      };
    }

    if (typeof sender === 'object') {
      return {
        _id: sender._id || sender.id || currentUserId || 'unknown',
        name: sender.name || sender.username || (sender._id === currentUserId ? 'Você' : 'Unknown User'),
        profileImage: sender.profileImage || sender.avatar
      };
    }

    return {
      _id: currentUserId || 'unknown',
      name: 'Unknown User',
      profileImage: undefined
    };
  }

  


  private isOwnMessage(message: StoredMessage, currentUserId?: string): boolean {
    if (!currentUserId) return false;
    return message.sender._id === currentUserId;
  }

  


  forceSyncStorage(conversationId: string): void {
    try {
      const localMessages = localStorageService.loadConversationMessages(conversationId);
      const cacheMessages = unifiedCacheService.getMessages(conversationId);

      this.log(`🔄 Sincronizando storage - Local: ${localMessages.length}, Cache: ${cacheMessages.length}`);


      cacheMessages.forEach(cacheMsg => {
        const exists = localMessages.find(localMsg => 
          (localMsg._id && cacheMsg._id && localMsg._id === cacheMsg._id) ||
          (localMsg.tempId && cacheMsg.tempId && localMsg.tempId === cacheMsg.tempId)
        );

        if (!exists) {
          const storedMsg: StoredMessage = {
            _id: cacheMsg._id,
            conversation: conversationId,
            sender: cacheMsg.sender,
            content: cacheMsg.content,
            type: cacheMsg.type,
            createdAt: cacheMsg.createdAt,
            readBy: cacheMsg.readBy || [],
            deliveredTo: cacheMsg.deliveredTo || [],
            status: cacheMsg.status,
            tempId: cacheMsg.tempId,
            isTemporary: cacheMsg.isTemporary
          };
          localStorageService.addMessage(conversationId, storedMsg);
        }
      });


      localMessages.forEach(localMsg => {
        const exists = cacheMessages.find(cacheMsg => 
          (cacheMsg._id && localMsg._id && cacheMsg._id === localMsg._id) ||
          (cacheMsg.tempId && localMsg.tempId && cacheMsg.tempId === localMsg.tempId)
        );

        if (!exists) {
          unifiedCacheService.addMessage(conversationId, {
            _id: localMsg._id,
            conversation: conversationId,
            sender: localMsg.sender,
            content: localMsg.content,
            type: localMsg.type,
            createdAt: localMsg.createdAt,
            readBy: localMsg.readBy,
            deliveredTo: localMsg.deliveredTo,
            status: localMsg.status,
            tempId: localMsg.tempId,
            isTemporary: localMsg.isTemporary
          });
        }
      });

      this.log('Sincronização de storage concluída');
    } catch (error) {
    }
  }

  


  getStorageStats(): {
    localStorage: any;
    unifiedCache: any;
    syncStatus: 'synced' | 'diverged' | 'error';
  } {
    try {
      const localStats = localStorageService.getStorageStats();
      const cacheStats = unifiedCacheService.getCacheStats();


      const syncStatus = localStats.totalMessages === cacheStats.totalMessages ? 'synced' : 'diverged';

      return {
        localStorage: localStats,
        unifiedCache: cacheStats,
        syncStatus
      };
    } catch (error) {
      return {
        localStorage: null,
        unifiedCache: null,
        syncStatus: 'error'
      };
    }
  }

  


  clearStorage(conversationId?: string, createBackup = true): void {
    try {
      if (createBackup) {
        const backup = {
          timestamp: new Date().toISOString(),
          localStorage: localStorageService.exportData(),
          unifiedCache: unifiedCacheService.getCacheStats()
        };
        localStorage.setItem('hacklote_storage_backup', JSON.stringify(backup));
        this.log('💾 Backup criado antes da limpeza');
      }

      if (conversationId) {
        localStorageService.clearConversationMessages(conversationId);
        unifiedCacheService.removeMessages(conversationId);
        this.log(`🧹 Storage limpo para conversa ${conversationId}`);
      } else {
        localStorageService.clearAllMessages();
        unifiedCacheService.clearAll();
        this.log('🧹 Todo o storage foi limpo');
      }
    } catch (error) {
    }
  }
}

export const messageStorageManager = MessageStorageManager.getInstance();
export default messageStorageManager;
