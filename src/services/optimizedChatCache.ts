


interface OptimizedMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  conversation: string;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOwn: boolean;
  tempId?: string;
}

interface OptimizedConversation {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
  updatedAt: string;
  isOnline?: boolean;
  name?: string;
}

interface CacheMetadata {
  lastSync: number;
  version: string;
  userId: string;
  totalApiCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

interface CacheStats {
  totalSize: number;
  conversationsCount: number;
  messagesCount: number;
  cacheHitRate: number;
  lastSync: Date;
  apiCallsSaved: number;
}

class OptimizedChatCache {
  private static instance: OptimizedChatCache;
  private readonly CACHE_VERSION = '2.0.0';
  private readonly CACHE_EXPIRY = 15 * 60 * 1000;
  private readonly MAX_MESSAGES_PER_CONVERSATION = 200;
  private readonly MAX_CONVERSATIONS = 100;
  private readonly STORAGE_PREFIX = 'whatsapp_chat_';

  private constructor() {}

  static getInstance(): OptimizedChatCache {
    if (!OptimizedChatCache.instance) {
      OptimizedChatCache.instance = new OptimizedChatCache();
    }
    return OptimizedChatCache.instance;
  }


  initializeCache(userId: string): void {
    try {
      const metadata: CacheMetadata = {
        lastSync: Date.now(),
        version: this.CACHE_VERSION,
        userId,
        totalApiCalls: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
      
      this.setItem('metadata', metadata);
      

      if (!this.getItem('conversations')) {
        this.setItem('conversations', []);
      }
      if (!this.getItem('messages')) {
        this.setItem('messages', {});
      }
      if (!this.getItem('user_profiles')) {
        this.setItem('user_profiles', {});
      }

    } catch (error) {
      this.clearCache();
    }
  }

  isCacheValid(): boolean {
    try {
      const metadata = this.getCacheMetadata();
      if (!metadata) return false;

      const isExpired = Date.now() - metadata.lastSync > this.CACHE_EXPIRY;
      const isVersionValid = metadata.version === this.CACHE_VERSION;

      return !isExpired && isVersionValid;
    } catch {
      return false;
    }
  }


  cacheConversations(conversations: OptimizedConversation[]): void {
    try {

      const sortedConversations = conversations
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, this.MAX_CONVERSATIONS);

      this.setItem('conversations', sortedConversations);
      this.updateCacheMetadata({ lastSync: Date.now() });


      this.cacheUserProfiles(sortedConversations);

    } catch (error) {
    }
  }

  getCachedConversations(): OptimizedConversation[] {
    try {
      if (!this.isCacheValid()) {
        this.incrementCacheMiss();
        return [];
      }

      const conversations = this.getItem('conversations') || [];
      this.incrementCacheHit();
      

      return this.enrichConversationsWithProfiles(conversations);
    } catch (error) {
      this.incrementCacheMiss();
      return [];
    }
  }


  cacheMessages(conversationId: string, messages: OptimizedMessage[]): void {
    try {
      const allMessages = this.getItem('messages') || {};
      

      const sortedMessages = messages
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-this.MAX_MESSAGES_PER_CONVERSATION);

      allMessages[conversationId] = sortedMessages;
      this.setItem('messages', allMessages);


      this.cacheMessageSenderProfiles(sortedMessages);

    } catch (error) {
    }
  }

  getCachedMessages(conversationId: string): OptimizedMessage[] {
    try {
      if (!this.isCacheValid()) {
        this.incrementCacheMiss();
        return [];
      }

      const allMessages = this.getItem('messages') || {};
      const messages = allMessages[conversationId] || [];
      this.incrementCacheHit();


      return this.enrichMessagesWithProfiles(messages);
    } catch (error) {
      this.incrementCacheMiss();
      return [];
    }
  }


  cacheUserProfiles(conversations: OptimizedConversation[]): void {
    try {
      const profiles = this.getItem('user_profiles') || {};
      
      conversations.forEach(conv => {
        conv.participants?.forEach(participant => {
          if (participant.user && participant.user._id) {
            profiles[participant.user._id] = {
              _id: participant.user._id,
              name: participant.user.name || 'User',
              profileImage: participant.user.profileImage
            };
          }
        });
      });

      this.setItem('user_profiles', profiles);
    } catch (error) {
    }
  }

  cacheMessageSenderProfiles(messages: OptimizedMessage[]): void {
    try {
      const profiles = this.getItem('user_profiles') || {};
      
      messages.forEach(message => {
        if (message.sender && message.sender._id) {
          profiles[message.sender._id] = {
            _id: message.sender._id,
            name: message.sender.name || 'User',
            profileImage: message.sender.profileImage
          };
        }
      });

      this.setItem('user_profiles', profiles);
    } catch (error) {
    }
  }


  enrichConversationsWithProfiles(conversations: OptimizedConversation[]): OptimizedConversation[] {
    const profiles = this.getItem('user_profiles') || {};
    
    return conversations.map(conv => ({
      ...conv,
      participants: conv.participants?.map(participant => ({
        ...participant,
        user: {
          ...participant.user,
          name: profiles[participant.user._id]?.name || participant.user.name || 'User',
          profileImage: profiles[participant.user._id]?.profileImage || participant.user.profileImage
        }
      })) || []
    }));
  }

  enrichMessagesWithProfiles(messages: OptimizedMessage[]): OptimizedMessage[] {
    const profiles = this.getItem('user_profiles') || {};
    
    return messages.map(message => ({
      ...message,
      sender: {
        ...message.sender,
        name: profiles[message.sender._id]?.name || message.sender.name || 'User',
        profileImage: profiles[message.sender._id]?.profileImage || message.sender.profileImage
      }
    }));
  }


  addOptimisticMessage(conversationId: string, message: OptimizedMessage): void {
    try {
      const allMessages = this.getItem('messages') || {};
      const messages = allMessages[conversationId] || [];
      

      const updatedMessages = [...messages, message];
      allMessages[conversationId] = updatedMessages;
      this.setItem('messages', allMessages);


      this.updateConversationLastMessage(conversationId, message);

    } catch (error) {
    }
  }

  updateMessageStatus(conversationId: string, messageId: string, status: OptimizedMessage['status']): void {
    try {
      const allMessages = this.getItem('messages') || {};
      const messages = allMessages[conversationId] || [];
      
      const updatedMessages = messages.map((msg: OptimizedMessage) => 
        (msg._id === messageId || msg.tempId === messageId)
          ? { ...msg, status }
          : msg
      );

      allMessages[conversationId] = updatedMessages;
      this.setItem('messages', allMessages);

    } catch (error) {
    }
  }

  replaceOptimisticMessage(conversationId: string, tempId: string, realMessage: OptimizedMessage): void {
    try {
      const allMessages = this.getItem('messages') || {};
      const messages = allMessages[conversationId] || [];
      
      const updatedMessages = messages.map((msg: OptimizedMessage) => 
        msg.tempId === tempId ? { ...realMessage, isOwn: msg.isOwn } : msg
      );

      allMessages[conversationId] = updatedMessages;
      this.setItem('messages', allMessages);

    } catch (error) {
    }
  }


  updateConversationLastMessage(conversationId: string, message: OptimizedMessage): void {
    try {
      const conversations = this.getItem('conversations') || [];
      
      const updatedConversations = conversations.map((conv: OptimizedConversation) => 
        conv._id === conversationId
          ? {
              ...conv,
              lastMessage: message.content,
              lastMessageDate: message.createdAt,
              updatedAt: message.createdAt
            }
          : conv
      );

      this.setItem('conversations', updatedConversations);
    } catch (error) {
    }
  }

  updateConversationUnreadCount(conversationId: string, count: number): void {
    try {
      const conversations = this.getItem('conversations') || [];
      
      const updatedConversations = conversations.map((conv: OptimizedConversation) => 
        conv._id === conversationId
          ? { ...conv, unreadCount: count }
          : conv
      );

      this.setItem('conversations', updatedConversations);
    } catch (error) {
    }
  }


  getCacheStats(): CacheStats {
    try {
      const metadata = this.getCacheMetadata();
      const conversations = this.getItem('conversations') || [];
      const messages = this.getItem('messages') || {};
      
      const messagesCount = Object.values(messages).reduce(
        (total: number, msgs: any) => total + (msgs?.length || 0), 
        0
      );

      const totalSize = this.calculateCacheSize();
      const cacheHitRate = metadata 
        ? (metadata.cacheHits / (metadata.cacheHits + metadata.cacheMisses)) * 100 
        : 0;

      const apiCallsSaved = metadata ? metadata.cacheHits : 0;

      return {
        totalSize,
        conversationsCount: conversations.length,
        messagesCount,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        lastSync: new Date(metadata?.lastSync || 0),
        apiCallsSaved
      };
    } catch (error) {
      return {
        totalSize: 0,
        conversationsCount: 0,
        messagesCount: 0,
        cacheHitRate: 0,
        lastSync: new Date(0),
        apiCallsSaved: 0
      };
    }
  }


  private setItem(key: string, value: any): void {
    try {
      localStorage.setItem(
        `${this.STORAGE_PREFIX}${key}`, 
        JSON.stringify(value)
      );
    } catch (error: any) {

      if (error.name === 'QuotaExceededError') {
        this.clearOldestData();

        localStorage.setItem(
          `${this.STORAGE_PREFIX}${key}`, 
          JSON.stringify(value)
        );
      }
    }
  }

  private getItem(key: string): any {
    try {
      const item = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  }

  private getCacheMetadata(): CacheMetadata | null {
    return this.getItem('metadata');
  }

  private updateCacheMetadata(updates: Partial<CacheMetadata>): void {
    const current = this.getCacheMetadata();
    if (current) {
      this.setItem('metadata', { ...current, ...updates });
    }
  }

  private incrementCacheHit(): void {
    const metadata = this.getCacheMetadata();
    if (metadata) {
      this.updateCacheMetadata({ cacheHits: metadata.cacheHits + 1 });
    }
  }

  private incrementCacheMiss(): void {
    const metadata = this.getCacheMetadata();
    if (metadata) {
      this.updateCacheMetadata({ 
        cacheMisses: metadata.cacheMisses + 1,
        totalApiCalls: metadata.totalApiCalls + 1
      });
    }
  }

  private calculateCacheSize(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value?.length || 0);
      }
    }
    return totalSize;
  }

  private clearOldestData(): void {
    

    const messages = this.getItem('messages') || {};
    const conversationIds = Object.keys(messages);
    
    if (conversationIds.length > 0) {

      const oldestConversationId = conversationIds[0];
      delete messages[oldestConversationId];
      this.setItem('messages', messages);
    }
  }

  clearCache(): void {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
    }
  }


  logPerformanceMetrics(): void {

  }
}


const optimizedChatCache = OptimizedChatCache.getInstance();
export default optimizedChatCache;
