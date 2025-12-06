


export interface StoredMessage {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  content: string;
  type: string;
  attachments?: Array<{ url: string; thumbUrl?: string; name?: string; size?: number; mimeType?: string }>;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
  tempId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isTemporary?: boolean;
  retryCount?: number;
}

export interface StoredConversationMessages {
  conversationId: string;
  messages: StoredMessage[];
  lastUpdated: string;
}

class LocalStorageService {
  private readonly MESSAGES_KEY = 'hacklote_chat_messages';
  private readonly CONVERSATIONS_KEY = 'hacklote_chat_conversations';
  private readonly VERSION_KEY = 'hacklote_chat_version';
  private readonly CURRENT_VERSION = '1.0.0';

  constructor() {
    this.initializeStorage();
  }

  


  private initializeStorage(): void {
    try {
      const version = localStorage.getItem(this.VERSION_KEY);
      if (version !== this.CURRENT_VERSION) {
        this.clearAllData();
        localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
      }
    } catch (error) {
    }
  }

  


  saveConversationMessages(conversationId: string, messages: StoredMessage[]): void {
    try {
      const allMessages = this.getAllMessages();
      

      const validMessages = messages.filter(msg => 
        msg && 
        (msg._id || msg.tempId) && 
        ( (msg.content && String(msg.content).length > 0) || (Array.isArray((msg as any).attachments) && (msg as any).attachments.length > 0) ) &&
        msg.sender
      );

      allMessages[conversationId] = {
        conversationId,
        messages: validMessages,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(allMessages));
      
    } catch (error) {
    }
  }

  


  loadConversationMessages(conversationId: string): StoredMessage[] {
    try {
      const allMessages = this.getAllMessages();
      const conversationData = allMessages[conversationId];
      
      let messages: StoredMessage[] = [];
      
      if (conversationData) {
        messages = [...conversationData.messages];
      }
      

      const emergencyMessages = this.recoverEmergencyBackup(conversationId);
      if (emergencyMessages.length > 0) {
        

        emergencyMessages.forEach(emergencyMsg => {
          const exists = messages.find(m => 
            (m._id && emergencyMsg._id && m._id === emergencyMsg._id) ||
            (m.tempId && emergencyMsg.tempId && m.tempId === emergencyMsg.tempId)
          );
          
          if (!exists) {
            messages.push(emergencyMsg);
          }
        });
        

        if (emergencyMessages.length > 0) {
          this.saveConversationMessages(conversationId, messages);
        }
      }
      
      return messages;
    } catch (error) {

      try {
        const emergencyMessages = this.recoverEmergencyBackup(conversationId);
        if (emergencyMessages.length > 0) {
          return emergencyMessages;
        }
      } catch (emergencyError) {
      }
      return [];
    }
  }

  


  addMessage(conversationId: string, message: StoredMessage): void {
    try {


      if (!message._id && !message.tempId) {
        return;
      }


      if ((!message.content || String(message.content).length === 0) && (!Array.isArray((message as any).attachments) || (message as any).attachments.length === 0)) {
        return;
      }

      const existingMessages = this.loadConversationMessages(conversationId);
      

      const existingIndex = existingMessages.findIndex(m => {

        if (m._id && message._id) {
          return m._id === message._id;
        }

        if (message.tempId && m.tempId) {
          return m.tempId === message.tempId;
        }

        if (message._id && m.tempId) {
          return message.tempId === m.tempId;
        }
        if (m._id && message.tempId) {
          return m._id === message._id;
        }
        return false;
      });

      if (existingIndex !== -1) {

        const existing = existingMessages[existingIndex];
        const shouldUpdate = 
          (!existing._id && message._id) ||
          (existing.status === 'sending' && message.status !== 'sending') ||
          (existing.isTemporary && !message.isTemporary) ||
          (message._id && existing.tempId && !existing._id);

        if (shouldUpdate) {

          const updatedMessage = {
            ...message,
            tempId: existing.tempId || message.tempId
          };
          existingMessages[existingIndex] = updatedMessage;
        } else {

          return;
        }
      } else {

        existingMessages.push(message);
      }

      this.saveConversationMessages(conversationId, existingMessages);
    } catch (error) {

      this.saveEmergencyBackup(conversationId, message);
    }
  }

  


  removeMessage(conversationId: string, messageId: string): void {
    try {
      const existingMessages = this.loadConversationMessages(conversationId);
      const filteredMessages = existingMessages.filter(m => 
        m._id !== messageId && m.tempId !== messageId
      );

      this.saveConversationMessages(conversationId, filteredMessages);
    } catch (error) {
    }
  }

  


  removeMessageByTempId(conversationId: string, tempId: string): boolean {
    try {
      const existingMessages = this.loadConversationMessages(conversationId);
      const filteredMessages = existingMessages.filter(m => m.tempId !== tempId);
      
      if (filteredMessages.length < existingMessages.length) {
        this.saveConversationMessages(conversationId, filteredMessages);
        return true;
      }
      return false;
    } catch (error) {
            return false;
    }
  }

  


  private getAllMessages(): Record<string, StoredConversationMessages> {
    try {
      const stored = localStorage.getItem(this.MESSAGES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  


  getStorageStats(): { 
    totalConversations: number; 
    totalMessages: number; 
    storageSize: string;
  } {
    try {
      const allMessages = this.getAllMessages();
      const totalConversations = Object.keys(allMessages).length;
      const totalMessages = Object.values(allMessages).reduce(
        (total, conv) => total + conv.messages.length, 
        0
      );
      
      const storageData = localStorage.getItem(this.MESSAGES_KEY) || '';
      const storageSize = `${(storageData.length / 1024).toFixed(2)} KB`;

      return { totalConversations, totalMessages, storageSize };
    } catch (error) {
      return { totalConversations: 0, totalMessages: 0, storageSize: '0 KB' };
    }
  }

  


  clearAllMessages(): void {
    try {
      localStorage.removeItem(this.MESSAGES_KEY);
    } catch (error) {
    }
  }

  


  clearConversationMessages(conversationId: string): void {
    try {
      const allMessages = this.getAllMessages();
      delete allMessages[conversationId];
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(allMessages));
    } catch (error) {
    }
  }

  


  private clearAllData(): void {
    try {
      localStorage.removeItem(this.MESSAGES_KEY);
      localStorage.removeItem(this.CONVERSATIONS_KEY);
    } catch (error) {
    }
  }

  


  exportData(): string {
    try {
      const allMessages = this.getAllMessages();
      const exportData = {
        version: this.CURRENT_VERSION,
        exportDate: new Date().toISOString(),
        messages: allMessages
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      return '';
    }
  }

  


  importData(jsonData: string): boolean {
    try {
      const importData = JSON.parse(jsonData);
      if (importData.messages) {
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(importData.messages));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  


  private saveEmergencyBackup(conversationId: string, message: StoredMessage): void {
    try {
      const emergencyKey = `hacklote_emergency_${conversationId}`;
      const existing = localStorage.getItem(emergencyKey);
      const emergencyMessages = existing ? JSON.parse(existing) : [];
      

      emergencyMessages.push({
        ...message,
        emergencyBackup: true,
        backupTimestamp: new Date().toISOString()
      });
      
      localStorage.setItem(emergencyKey, JSON.stringify(emergencyMessages));
    } catch (error) {
    }
  }

  


  recoverEmergencyBackup(conversationId: string): StoredMessage[] {
    try {
      const emergencyKey = `hacklote_emergency_${conversationId}`;
      const emergencyData = localStorage.getItem(emergencyKey);
      
      if (emergencyData) {
        const emergencyMessages = JSON.parse(emergencyData);
                

        localStorage.removeItem(emergencyKey);
        
        return emergencyMessages.map((msg: any) => {
          const { emergencyBackup, backupTimestamp, ...cleanMessage } = msg;
          return cleanMessage;
        });
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }
}


export const localStorageService = new LocalStorageService();
