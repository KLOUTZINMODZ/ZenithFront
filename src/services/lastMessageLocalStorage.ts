interface LastMessageData {
  text: string;
  timestamp: string;
  senderId: string;
  messageId?: string;
  type?: string;
  updatedAt: number;
}

interface LastMessageCache {
  [conversationId: string]: LastMessageData;
}

class LastMessageLocalStorage {
  private static readonly STORAGE_KEY = 'hacklote_last_messages';
  private static memoryCache: LastMessageCache = {};
  private static debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  

  private static validateMessageData(conversationId: string, messageData: Omit<LastMessageData, 'updatedAt'>): boolean {
    if (!conversationId || typeof conversationId !== 'string') {
      return false;
    }
    
    if (!messageData?.text || typeof messageData.text !== 'string') {
      return false;
    }
    
    if (!messageData?.senderId || typeof messageData.senderId !== 'string') {
      return false;
    }
    
    return true;
  }
  

  private static log(_message: string, ..._args: any[]): void {

  }
  


  private static triggerUIUpdate(conversationId: string, messageData: LastMessageData): void {

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('last-message-updated', {
        detail: {
          conversationId,
          lastMessage: messageData
        }
      }));
    }
  }

  static saveLastMessage(conversationId: string, messageData: Omit<LastMessageData, 'updatedAt'>): void {

    if (!this.validateMessageData(conversationId, messageData)) {
      return;
    }


    const existingTimeout = this.debounceTimeouts.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }


    const messageWithTimestamp = {
      ...messageData,
      updatedAt: Date.now()
    };
    this.memoryCache[conversationId] = messageWithTimestamp;


    this.triggerUIUpdate(conversationId, messageWithTimestamp);


    const timeout = setTimeout(() => {
      try {
        const cache = this.getAllLastMessages();
        cache[conversationId] = messageWithTimestamp;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
        
        this.log(`💾 [LocalStorage] Última mensagem salva para conversa ${conversationId}:`, messageData.text);
      } catch (error) {

        delete this.memoryCache[conversationId];
      } finally {
        this.debounceTimeouts.delete(conversationId);
      }
    }, 0);

    this.debounceTimeouts.set(conversationId, timeout);
  }
  

  static getLastMessage(conversationId: string): LastMessageData | null {
    if (!conversationId || typeof conversationId !== 'string') {
      return null;
    }

    try {

      const memoryMessage = this.memoryCache[conversationId];
      if (memoryMessage) {
        this.log(`🧠 [MemoryCache] Mensagem recuperada da memória para ${conversationId}`);
        return memoryMessage;
      }


      const cache = this.getAllLastMessages();
      const localMessage = cache[conversationId];
      
      if (localMessage) {

        this.memoryCache[conversationId] = localMessage;
        this.log(`💾 [LocalStorage] Mensagem recuperada e cached para ${conversationId}`);
      }
      
      return localMessage || null;
    } catch (error) {
      

      return this.memoryCache[conversationId] || null;
    }
  }
  

  static getAllLastMessages(): LastMessageCache {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }
  

  static updateLastMessageIfNewer(conversationId: string, messageData: Omit<LastMessageData, 'updatedAt'>, messageTimestamp: number): boolean {
    try {
      const existing = this.getLastMessage(conversationId);
      

      if (!existing || messageTimestamp > existing.updatedAt) {
        this.saveLastMessage(conversationId, messageData);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  

  static syncWithBackend(conversations: any[]): void {
    if (!Array.isArray(conversations)) {
      return;
    }

    try {
      this.log(`🔄 [LocalStorage] Sincronizando ${conversations.length} conversas com localStorage`);
      
      let syncedCount = 0;
      
      conversations.forEach(conversation => {
        if (!conversation?._id) {
          return;
        }

        const hasValidMessage = conversation.lastMessageText && conversation.lastMessageAt;
        if (!hasValidMessage) {
          return;
        }

        try {
          const backendTimestamp = new Date(conversation.lastMessageAt).getTime();
          

          if (isNaN(backendTimestamp)) {
            return;
          }

          const localMessage = this.getLastMessage(conversation._id);
          

          if (!localMessage || backendTimestamp > localMessage.updatedAt) {
            this.saveLastMessage(conversation._id, {
              text: String(conversation.lastMessageText).substring(0, 500),
              timestamp: conversation.lastMessageAt,
              senderId: conversation.lastMessage?.sender || 'unknown',
              messageId: conversation.lastMessage?._id,
              type: conversation.lastMessage?.type || 'text'
            });
            syncedCount++;
          }
        } catch (convError) {
        }
      });
      
      this.log(`[LocalStorage] Sincronização concluída: ${syncedCount} mensagens atualizadas`);
      

      this.autoCleanup();
      
    } catch (error) {
    }
  }
  

  static cleanOldMessages(daysOld: number = 30): void {
    try {
      const cache = this.getAllLastMessages();
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      const cleaned = Object.fromEntries(
        Object.entries(cache).filter(([_, message]) => message.updatedAt > cutoffTime)
      );
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleaned));
      
    } catch (error) {
    }
  }
  

  static removeLastMessage(conversationId: string): void {
    try {
      const cache = this.getAllLastMessages();
      delete cache[conversationId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
      
    } catch (error) {
    }
  }
  

  private static autoCleanup(): void {
    const lastCleanupKey = 'hacklote_last_cleanup';
    
    try {
      const lastCleanup = localStorage.getItem(lastCleanupKey);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      

      if (lastCleanup && parseInt(lastCleanup) > oneDayAgo) {
        return;
      }
      
      this.cleanOldMessages(7);
      localStorage.setItem(lastCleanupKey, Date.now().toString());
      
      this.log('🧹 [LocalStorage] Auto-cleanup executado');
    } catch (error) {
    }
  }


  static clearMemoryCache(): void {
    this.memoryCache = {};
    this.log('🧠 [MemoryCache] Cache em memória limpo');
  }


  static getCacheStats(): { totalConversations: number; oldestMessage: Date | null; newestMessage: Date | null; memoryCacheSize: number } {
    try {
      const cache = this.getAllLastMessages();
      const messages = Object.values(cache);
      
      if (messages.length === 0) {
        return { totalConversations: 0, oldestMessage: null, newestMessage: null, memoryCacheSize: Object.keys(this.memoryCache).length };
      }
      
      const timestamps = messages.map(m => m.updatedAt);
      
      return {
        totalConversations: messages.length,
        oldestMessage: new Date(Math.min(...timestamps)),
        newestMessage: new Date(Math.max(...timestamps)),
        memoryCacheSize: Object.keys(this.memoryCache).length
      };
    } catch (error) {
      return { totalConversations: 0, oldestMessage: null, newestMessage: null, memoryCacheSize: 0 };
    }
  }
}

export default LastMessageLocalStorage;
