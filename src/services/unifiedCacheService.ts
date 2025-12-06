


interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface MessageCacheEntry {
  _id: string;
  conversation: string;
  sender: any;
  content: string;
  type: string;
  attachments?: Array<{ url: string; thumbUrl?: string; name?: string; size?: number; mimeType?: string }>;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  tempId?: string;
  isTemporary?: boolean;
}

interface ConversationCacheEntry {
  _id: string;
  participants: any[];
  lastMessage?: MessageCacheEntry;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  name?: string;
}

interface CacheMetadata {
  version: string;
  lastSync: number;
  userId: string;
  totalMessages: number;
  totalConversations: number;
}

class UnifiedCacheService {
  private static instance: UnifiedCacheService;
  private readonly STORAGE_PREFIX = 'unified_chat_cache_';
  private readonly CACHE_VERSION = '2.0.0';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000;
  
  private cleanupTimer?: NodeJS.Timeout;
  
  static getInstance(): UnifiedCacheService {
    if (!UnifiedCacheService.instance) {
      UnifiedCacheService.instance = new UnifiedCacheService();
    }
    return UnifiedCacheService.instance;
  }
  
  private constructor() {
    this.initializeCleanup();


  }
  


  
  public migrateOldCaches(): void {
    try {
      

      const oldOptimizedData = this.getOldCacheData('whatsapp_chat_');
      

      const oldChatData = this.getOldCacheData('chat_');
      
      if (oldOptimizedData.conversations.length > 0 || oldChatData.conversations.length > 0) {

        const useOptimized = oldOptimizedData.lastSync > oldChatData.lastSync;
        const dataToMigrate = useOptimized ? oldOptimizedData : oldChatData;
        
        this.migrateData(dataToMigrate);
      }
      

      this.cleanupOldCaches();
      
    } catch (error) {
    }
  }
  
  private getOldCacheData(prefix: string): any {
    try {
      const conversations = JSON.parse(localStorage.getItem(`${prefix}conversations`) || '[]');
      const messages = JSON.parse(localStorage.getItem(`${prefix}messages`) || '{}');
      const metadata = JSON.parse(localStorage.getItem(`${prefix}metadata`) || '{}');
      
      return {
        conversations,
        messages,
        lastSync: metadata.lastSync || 0
      };
    } catch {
      return { conversations: [], messages: {}, lastSync: 0 };
    }
  }
  
  private migrateData(oldData: any): void {
    if (oldData.conversations.length > 0) {
      this.setConversations(oldData.conversations);
    }
    
    if (Object.keys(oldData.messages).length > 0) {
      for (const [conversationId, messages] of Object.entries(oldData.messages)) {
        this.setMessages(conversationId, messages as MessageCacheEntry[]);
      }
    }
  }
  
  private cleanupOldCaches(): void {
    const oldPrefixes = ['whatsapp_chat_', 'chat_', 'optimized_chat_'];
    const oldKeys = ['conversations', 'messages', 'metadata', 'user_data', 'cache_metadata'];
    
    oldPrefixes.forEach(prefix => {
      oldKeys.forEach(key => {
        localStorage.removeItem(`${prefix}${key}`);
      });
    });
    
  }
  


  
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: this.CACHE_VERSION
      };
      
      localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      this.handleStorageError();
    }
  }
  
  private getCache<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      if (!stored) return null;
      
      const entry: CacheEntry<T> = JSON.parse(stored);
      

      if (entry.version !== this.CACHE_VERSION) {
        this.removeCache(key);
        return null;
      }
      

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.removeCache(key);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      this.removeCache(key);
      return null;
    }
  }
  
  private removeCache(key: string): void {
    localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
  }
  
  private handleStorageError(): void {

    this.cleanup();
    

    if (this.getStorageUsage() > 0.9) {
      this.clearAll();
    }
  }
  
  private getStorageUsage(): number {
    try {
      const total = 5 * 1024 * 1024;
      let used = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      return used / total;
    } catch {
      return 0;
    }
  }
  


  
  setConversations(conversations: ConversationCacheEntry[]): void {
    this.setCache('conversations', conversations);
    this.updateMetadata({
      totalConversations: conversations.length
    });
  }
  
  getConversations(): ConversationCacheEntry[] {
    return this.getCache<ConversationCacheEntry[]>('conversations') || [];
  }
  
  addConversation(conversation: ConversationCacheEntry): void {
    const conversations = this.getConversations();
    const existingIndex = conversations.findIndex(c => c._id === conversation._id);
    
    if (existingIndex !== -1) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }
    
    this.setConversations(conversations);
  }
  
  updateConversation(conversationId: string, updates: Partial<ConversationCacheEntry>): void {
    const conversations = this.getConversations();
    const index = conversations.findIndex(c => c._id === conversationId);
    
    if (index !== -1) {
      conversations[index] = { ...conversations[index], ...updates };
      this.setConversations(conversations);
    }
  }
  
  removeConversation(conversationId: string): void {
    const conversations = this.getConversations();
    const filtered = conversations.filter(c => c._id !== conversationId);
    this.setConversations(filtered);
    

    this.removeMessages(conversationId);
  }
  


  
  setMessages(conversationId: string, messages: MessageCacheEntry[]): void {
    this.setCache(`messages_${conversationId}`, messages);
    this.updateMetadata({
      totalMessages: this.getTotalMessageCount() + messages.length
    });
  }
  
  getMessages(conversationId: string): MessageCacheEntry[] {
    return this.getCache<MessageCacheEntry[]>(`messages_${conversationId}`) || [];
  }
  
  addMessage(conversationId: string, message: MessageCacheEntry): void {
    const messages = this.getMessages(conversationId);
    

    const isDuplicate = messages.some(m => 
      (m._id && m._id === message._id) ||
      (m.tempId && m.tempId === message.tempId)
    );
    
    if (!isDuplicate) {
      messages.push(message);
      this.setMessages(conversationId, messages);
      

      this.updateConversation(conversationId, {
        lastMessage: message,
        lastMessageAt: message.createdAt
      });
    }
  }
  
  updateMessage(conversationId: string, messageId: string, updates: Partial<MessageCacheEntry>): void {
    const messages = this.getMessages(conversationId);
    const index = messages.findIndex(m => m._id === messageId || m.tempId === messageId);
    
    if (index !== -1) {
      messages[index] = { ...messages[index], ...updates };
      this.setMessages(conversationId, messages);
    }
  }
  
  replaceTemporaryMessage(conversationId: string, tempId: string, realMessage: MessageCacheEntry): void {
    const messages = this.getMessages(conversationId);
    const index = messages.findIndex(m => m.tempId === tempId);
    
    if (index !== -1) {
      messages[index] = { ...realMessage, tempId };
      this.setMessages(conversationId, messages);
    }
  }
  
  removeMessage(conversationId: string, messageId: string): void {
    const messages = this.getMessages(conversationId);
    const filtered = messages.filter(m => m._id !== messageId && m.tempId !== messageId);
    this.setMessages(conversationId, filtered);
  }
  
  removeMessages(conversationId: string): void {
    this.removeCache(`messages_${conversationId}`);
  }
  


  
  private updateMetadata(updates: Partial<CacheMetadata>): void {
    const current = this.getMetadata();
    const updated = {
      ...current,
      ...updates,
      lastSync: Date.now()
    };
    
    this.setCache('metadata', updated, this.DEFAULT_TTL * 7);
  }
  
  getMetadata(): CacheMetadata {
    const defaultMetadata: CacheMetadata = {
      version: this.CACHE_VERSION,
      lastSync: 0,
      userId: '',
      totalMessages: 0,
      totalConversations: 0
    };
    
    return this.getCache<CacheMetadata>('metadata') || defaultMetadata;
  }
  
  private getTotalMessageCount(): number {
    let total = 0;
    const conversations = this.getConversations();
    
    conversations.forEach(conv => {
      const messages = this.getMessages(conv._id);
      total += messages.length;
    });
    
    return total;
  }
  
  getCacheStats(): {
    conversations: number;
    totalMessages: number;
    storageUsage: string;
    lastSync: Date;
    version: string;
  } {
    const metadata = this.getMetadata();
    const conversations = this.getConversations();
    const totalMessages = this.getTotalMessageCount();
    const storageUsage = (this.getStorageUsage() * 100).toFixed(1) + '%';
    
    return {
      conversations: conversations.length,
      totalMessages,
      storageUsage,
      lastSync: new Date(metadata.lastSync),
      version: metadata.version
    };
  }
  


  
  searchMessages(query: string, conversationId?: string): MessageCacheEntry[] {
    const results: MessageCacheEntry[] = [];
    const searchTerm = query.toLowerCase();
    
    if (conversationId) {

      const messages = this.getMessages(conversationId);
      results.push(...messages.filter(m => 
        m.content.toLowerCase().includes(searchTerm)
      ));
    } else {

      const conversations = this.getConversations();
      conversations.forEach(conv => {
        const messages = this.getMessages(conv._id);
        results.push(...messages.filter(m => 
          m.content.toLowerCase().includes(searchTerm)
        ));
      });
    }
    
    return results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  getUnreadMessages(userId: string): Map<string, MessageCacheEntry[]> {
    const unreadMap = new Map<string, MessageCacheEntry[]>();
    const conversations = this.getConversations();
    
    conversations.forEach(conv => {
      const messages = this.getMessages(conv._id);
      const unread = messages.filter(m => 
        m.sender._id !== userId && 
        !m.readBy.includes(userId)
      );
      
      if (unread.length > 0) {
        unreadMap.set(conv._id, unread);
      }
    });
    
    return unreadMap;
  }
  


  
  private initializeCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  cleanup(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.STORAGE_PREFIX)) continue;
        
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          
          const entry: CacheEntry<any> = JSON.parse(stored);
          

          if (now - entry.timestamp > entry.ttl || entry.version !== this.CACHE_VERSION) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
      

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
      }
    } catch (error) {
    }
  }
  
  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
    } catch (error) {
    }
  }
  


  
  markAsSynced(userId: string): void {
    this.updateMetadata({ userId, lastSync: Date.now() });
  }
  
  needsSync(maxAge: number = 5 * 60 * 1000): boolean {
    const metadata = this.getMetadata();
    return Date.now() - metadata.lastSync > maxAge;
  }
  


  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}


const unifiedCacheService = UnifiedCacheService.getInstance();


if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    unifiedCacheService.destroy();
  });
}

export default unifiedCacheService;
export type { MessageCacheEntry, ConversationCacheEntry, CacheMetadata };
