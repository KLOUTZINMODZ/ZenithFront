


interface CachedMessage {
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

interface CachedConversation {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: CachedMessage;
  unreadCount: number;
  updatedAt: string;
  isOnline?: boolean;
}

interface CacheMetadata {
  lastSync: number;
  version: string;
  userId: string;
}

class ChatCacheService {
  private static instance: ChatCacheService;
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_EXPIRY = 10 * 60 * 1000;
  private readonly MAX_MESSAGES_PER_CONVERSATION = 100;
  private readonly MAX_CONVERSATIONS = 50;

  private constructor() {}

  static getInstance(): ChatCacheService {
    if (!ChatCacheService.instance) {
      ChatCacheService.instance = new ChatCacheService();
    }
    return ChatCacheService.instance;
  }


  


  initializeCache(userId: string): void {
    const metadata: CacheMetadata = {
      lastSync: Date.now(),
      version: this.CACHE_VERSION,
      userId
    };
    
    localStorage.setItem('chat_cache_metadata', JSON.stringify(metadata));
    

    if (!localStorage.getItem('chat_conversations')) {
      localStorage.setItem('chat_conversations', JSON.stringify([]));
    }
    if (!localStorage.getItem('chat_messages')) {
      localStorage.setItem('chat_messages', JSON.stringify({}));
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

  


  clearCache(): void {
    localStorage.removeItem('chat_cache_metadata');
    localStorage.removeItem('chat_conversations');
    localStorage.removeItem('chat_messages');
    localStorage.removeItem('chat_user_data');
  }

  


  private getCacheMetadata(): CacheMetadata | null {
    try {
      const metadata = localStorage.getItem('chat_cache_metadata');
      return metadata ? JSON.parse(metadata) : null;
    } catch {
      return null;
    }
  }

  


  updateSyncTimestamp(): void {
    const metadata = this.getCacheMetadata();
    if (metadata) {
      metadata.lastSync = Date.now();
      localStorage.setItem('chat_cache_metadata', JSON.stringify(metadata));
    }
  }


  


  cacheConversations(conversations: CachedConversation[]): void {
    try {

      const sortedConversations = conversations
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, this.MAX_CONVERSATIONS);

      localStorage.setItem('chat_conversations', JSON.stringify(sortedConversations));
      this.updateSyncTimestamp();
    } catch (error) {
    }
  }

  


  getCachedConversations(): CachedConversation[] {
    try {
      if (!this.isCacheValid()) return [];
      
      const conversations = localStorage.getItem('chat_conversations');
      return conversations ? JSON.parse(conversations) : [];
    } catch {
      return [];
    }
  }

  


  updateConversationCache(conversation: CachedConversation): void {
    try {
      const conversations = this.getCachedConversations();
      const index = conversations.findIndex(c => c && c._id && conversation && conversation._id && c._id === conversation._id);
      
      if (index >= 0) {
        conversations[index] = conversation;
      } else {
        conversations.unshift(conversation);
      }
      
      this.cacheConversations(conversations);
    } catch (error) {
    }
  }


  


  cacheMessages(conversationId: string, messages: CachedMessage[]): void {
    try {
      const allMessages = this.getAllCachedMessages();
      

      const limitedMessages = messages
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, this.MAX_MESSAGES_PER_CONVERSATION);

      allMessages[conversationId] = limitedMessages;
      
      localStorage.setItem('chat_messages', JSON.stringify(allMessages));
      this.updateSyncTimestamp();
    } catch (error) {
    }
  }

  


  getCachedMessages(conversationId: string): CachedMessage[] {
    try {
      if (!this.isCacheValid()) return [];
      
      const allMessages = this.getAllCachedMessages();
      return allMessages[conversationId] || [];
    } catch {
      return [];
    }
  }

  


  addMessageToCache(conversationId: string, message: CachedMessage): void {
    try {
      const messages = this.getCachedMessages(conversationId);
      

      const existingIndex = messages.findIndex(m => 
        (m && m._id && message && message._id && m._id === message._id) || 
        (m && m.tempId && message && message.tempId && m.tempId === message.tempId)
      );
      
      if (existingIndex >= 0) {

        messages[existingIndex] = message;
      } else {

        messages.push(message);
      }
      
      this.cacheMessages(conversationId, messages);
    } catch (error) {
    }
  }

  


  updateMessageStatus(conversationId: string, messageId: string, status: CachedMessage['status']): void {
    try {
      const messages = this.getCachedMessages(conversationId);
      const messageIndex = messages.findIndex(m => 
        m && ((m._id && m._id === messageId) || (m.tempId && m.tempId === messageId))
      );
      
      if (messageIndex >= 0) {
        messages[messageIndex].status = status;
        this.cacheMessages(conversationId, messages);
      }
    } catch (error) {
    }
  }

  


  private getAllCachedMessages(): Record<string, CachedMessage[]> {
    try {
      const messages = localStorage.getItem('chat_messages');
      return messages ? JSON.parse(messages) : {};
    } catch {
      return {};
    }
  }


  


  cacheUserData(userId: string, userData: any): void {
    try {
      const allUserData = this.getAllCachedUserData();
      allUserData[userId] = {
        ...userData,
        cachedAt: Date.now()
      };
      
      localStorage.setItem('chat_user_data', JSON.stringify(allUserData));
    } catch (error) {
    }
  }

  


  getCachedUserData(userId: string): any | null {
    try {
      if (!this.isCacheValid()) return null;
      
      const allUserData = this.getAllCachedUserData();
      const userData = allUserData[userId];
      
      if (!userData) return null;
      

      const isExpired = Date.now() - userData.cachedAt > 60 * 60 * 1000;
      return isExpired ? null : userData;
    } catch {
      return null;
    }
  }

  


  private getAllCachedUserData(): Record<string, any> {
    try {
      const userData = localStorage.getItem('chat_user_data');
      return userData ? JSON.parse(userData) : {};
    } catch {
      return {};
    }
  }


  


  addOptimisticMessage(conversationId: string, content: string, senderId: string): string {
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    const optimisticMessage: CachedMessage = {
      _id: '',
      tempId,
      content,
      sender: {
        _id: senderId,
        name: 'You',
        profileImage: undefined
      },
      conversation: conversationId,
      createdAt: new Date().toISOString(),
      readBy: [],
      deliveredTo: [],
      status: 'sending',
      isOwn: true
    };

    this.addMessageToCache(conversationId, optimisticMessage);
    return tempId;
  }

  


  confirmOptimisticMessage(conversationId: string, tempId: string, serverMessage: CachedMessage): void {
    try {
      const messages = this.getCachedMessages(conversationId);
      const messageIndex = messages.findIndex(m => m.tempId === tempId);
      
      if (messageIndex >= 0) {

        messages[messageIndex] = {
          ...serverMessage,
          status: 'sent',
          isOwn: true
        };
        
        this.cacheMessages(conversationId, messages);
      }
    } catch (error) {
    }
  }

  


  markOptimisticMessageFailed(conversationId: string, tempId: string): void {
    this.updateMessageStatus(conversationId, tempId, 'failed');
  }


  


  getCacheStats(): {
    conversations: number;
    totalMessages: number;
    cacheSize: string;
    lastSync: string;
    isValid: boolean;
  } {
    const conversations = this.getCachedConversations();
    const allMessages = this.getAllCachedMessages();
    const totalMessages = Object.values(allMessages).reduce((sum, msgs) => sum + msgs.length, 0);
    

    const cacheData = {
      conversations: localStorage.getItem('chat_conversations'),
      messages: localStorage.getItem('chat_messages'),
      userData: localStorage.getItem('chat_user_data'),
      metadata: localStorage.getItem('chat_cache_metadata')
    };
    
    const cacheSize = Object.values(cacheData)
      .filter(Boolean)
      .reduce((sum, data) => sum + (data?.length || 0), 0);

    const metadata = this.getCacheMetadata();
    
    return {
      conversations: conversations.length,
      totalMessages,
      cacheSize: `${(cacheSize / 1024).toFixed(2)} KB`,
      lastSync: metadata ? new Date(metadata.lastSync).toLocaleString() : 'Never',
      isValid: this.isCacheValid()
    };
  }
}

export default ChatCacheService.getInstance();
