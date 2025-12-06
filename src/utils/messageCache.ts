


interface CachedMessage {
  _id: string;
  conversation: string;
  sender: any;
  content: string;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];

  isOwn?: boolean;
  fromMe?: boolean;
  senderId?: string;

  cachedAt: string;
  processedFromBackend?: boolean;
}

interface MessageCacheData {
  [conversationId: string]: CachedMessage[];
}

class MessageCache {
  private readonly CACHE_KEY = 'hacklote_messages_cache';
  private readonly CACHE_VERSION = '1.0';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000;


  saveMessages(conversationId: string, messages: any[], currentUserId: string): void {
    try {
      const existingCache = this.loadCache();
      

      const processedMessages: CachedMessage[] = messages.map(message => {

        const senderId = message.senderId || 
                         message.sender?._id || 
                         message.sender?.id || 
                         message.sender ||
                         message.userId ||
                         message.from ||
                         message.authorId;


        const isFromCurrentUser = currentUserId && senderId === currentUserId;

        return {
          _id: message._id,
          conversation: message.conversation || conversationId,
          sender: message.sender,
          content: message.content,
          createdAt: message.createdAt,
          readBy: message.readBy || [],
          deliveredTo: message.deliveredTo || [],

          isOwn: isFromCurrentUser || message.isOwn || false,
          fromMe: isFromCurrentUser || message.fromMe || false,
          senderId: senderId,

          cachedAt: new Date().toISOString(),
          processedFromBackend: message.processedFromBackend || false
        };
      });


      existingCache[conversationId] = processedMessages;
      

      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        version: this.CACHE_VERSION,
        data: existingCache,
        lastUpdated: new Date().toISOString()
      }));


    } catch (error) {
    }
  }


  loadMessages(conversationId: string): CachedMessage[] {
    try {
      const cache = this.loadCache();
      const messages = cache[conversationId] || [];
      

      const validMessages = messages.filter(message => {
        const messageAge = Date.now() - new Date(message.cachedAt).getTime();
        return messageAge < this.MAX_CACHE_AGE;
      });

      return validMessages;
    } catch (error) {
      return [];
    }
  }


  addMessage(conversationId: string, message: any, currentUserId: string): void {
    try {
      const existingMessages = this.loadMessages(conversationId);
      

      const messageExists = existingMessages.some(m => m && m._id && message && message._id && m._id === message._id);
      if (messageExists) {
        return;
      }


      const senderId = message.senderId || 
                       message.sender?._id || 
                       message.sender?.id || 
                       message.sender ||
                       message.userId ||
                       message.from ||
                       message.authorId;

      const isFromCurrentUser = currentUserId && senderId === currentUserId;

      const processedMessage: CachedMessage = {
        _id: message._id,
        conversation: message.conversation || conversationId,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt,
        readBy: message.readBy || [],
        deliveredTo: message.deliveredTo || [],
        isOwn: isFromCurrentUser || message.isOwn || false,
        fromMe: isFromCurrentUser || message.fromMe || false,
        senderId: senderId,
        cachedAt: new Date().toISOString(),
        processedFromBackend: message.processedFromBackend || false
      };


      const updatedMessages = [...existingMessages, processedMessage];
      this.saveMessages(conversationId, updatedMessages, currentUserId);


    } catch (error) {
    }
  }


  clearOldCache(): void {
    try {
      const cache = this.loadCache();
      let hasChanges = false;

      Object.keys(cache).forEach(conversationId => {
        const messages = cache[conversationId];
        const validMessages = messages.filter(message => {
          const messageAge = Date.now() - new Date(message.cachedAt).getTime();
          return messageAge < this.MAX_CACHE_AGE;
        });

        if (validMessages.length !== messages.length) {
          cache[conversationId] = validMessages;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify({
          version: this.CACHE_VERSION,
          data: cache,
          lastUpdated: new Date().toISOString()
        }));
      }
    } catch (error) {
    }
  }


  private loadCache(): MessageCacheData {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return {};

      const parsedCache = JSON.parse(cached);
      

      if (parsedCache.version !== this.CACHE_VERSION) {
        this.clearCache();
        return {};
      }

      return parsedCache.data || {};
    } catch (error) {
      return {};
    }
  }


  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
    }
  }


  hasMessage(conversationId: string, messageId: string): boolean {
    const messages = this.loadMessages(conversationId);
    return messages.some(m => m._id === messageId);
  }


  getCacheStats(): any {
    try {
      const cache = this.loadCache();
      const stats = {
        totalConversations: Object.keys(cache).length,
        totalMessages: 0,
        messagesWithFromMe: 0,
        cacheSize: 0
      };

      Object.values(cache).forEach(messages => {
        stats.totalMessages += messages.length;
        stats.messagesWithFromMe += messages.filter(m => m.isOwn).length;
      });

      const cacheString = localStorage.getItem(this.CACHE_KEY) || '';
      stats.cacheSize = new Blob([cacheString]).size;

      return stats;
    } catch (error) {
      return null;
    }
  }
}


export const messageCache = new MessageCache();


messageCache.clearOldCache();

export default messageCache;
