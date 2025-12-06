


export interface CacheMetadata {
  conversationId: string;
  lastSyncTimestamp: number;
  lastMessageTimestamp: number;
  totalMessages: number;
  needsSync: boolean;
}

export interface CacheStrategy {
  maxAge: number;
  syncInterval: number;
  forceSync: boolean;
}

class SmartCacheService {
  private readonly CACHE_METADATA_KEY = 'hacklote_cache_metadata';
  private readonly DEFAULT_STRATEGY: CacheStrategy = {
    maxAge: 5 * 60 * 1000,
    syncInterval: 30 * 1000,
    forceSync: false
  };

  private syncTimers = new Map<string, NodeJS.Timeout>();
  private activeConversation: string | null = null;

  


  needsSync(conversationId: string, strategy: Partial<CacheStrategy> = {}): boolean {
    const metadata = this.getCacheMetadata(conversationId);
    const config = { ...this.DEFAULT_STRATEGY, ...strategy };
    
    if (!metadata) return true;
    if (config.forceSync) return true;
    if (metadata.needsSync) return true;
    
    const timeSinceSync = Date.now() - metadata.lastSyncTimestamp;
    const isStale = timeSinceSync > config.maxAge;
    

    if (conversationId === this.activeConversation) {
      return isStale || timeSinceSync > (config.maxAge / 2);
    }
    
    return isStale;
  }

  


  markAsSynced(conversationId: string, messageCount: number, lastMessageTimestamp?: number): void {
    const metadata: CacheMetadata = {
      conversationId,
      lastSyncTimestamp: Date.now(),
      lastMessageTimestamp: lastMessageTimestamp || Date.now(),
      totalMessages: messageCount,
      needsSync: false
    };
    
    this.saveCacheMetadata(conversationId, metadata);
  }

  


  markForSync(conversationId: string): void {
    const metadata = this.getCacheMetadata(conversationId);
    if (metadata) {
      metadata.needsSync = true;
      this.saveCacheMetadata(conversationId, metadata);
    }
  }

  


  setActiveConversation(conversationId: string | null): void {

    if (this.activeConversation && this.syncTimers.has(this.activeConversation)) {
      clearInterval(this.syncTimers.get(this.activeConversation)!);
      this.syncTimers.delete(this.activeConversation);
    }
    
    this.activeConversation = conversationId;
    

    if (conversationId) {
      const timer = setInterval(() => {
        this.checkAndRequestSync(conversationId);
      }, this.DEFAULT_STRATEGY.syncInterval);
      
      this.syncTimers.set(conversationId, timer);
    }
  }

  


  private checkAndRequestSync(conversationId: string): void {
    if (this.needsSync(conversationId)) {

      window.dispatchEvent(new CustomEvent('chat-sync-request', {
        detail: { conversationId }
      }));
    }
  }

  


  getCacheStrategy(conversationId: string): CacheStrategy {
    const isActive = conversationId === this.activeConversation;
    
    if (isActive) {
      return {
        maxAge: 2 * 60 * 1000,
        syncInterval: 15 * 1000,
        forceSync: false
      };
    }
    
    return this.DEFAULT_STRATEGY;
  }

  


  shouldUseCache(conversationId: string): 'cache-only' | 'cache-then-sync' | 'api-first' {
    const metadata = this.getCacheMetadata(conversationId);
    
    if (!metadata) {
      return 'api-first';
    }
    
    const isActive = conversationId === this.activeConversation;
    const timeSinceSync = Date.now() - metadata.lastSyncTimestamp;
    
    if (timeSinceSync < 30 * 1000 && !metadata.needsSync) {
      return 'cache-only';
    }
    
    if (isActive && timeSinceSync < 2 * 60 * 1000) {
      return 'cache-then-sync';
    }
    
    return 'api-first';
  }

  


  onWebSocketMessage(conversationId: string, _messageData: any): void {

    this.markForSync(conversationId);
    

    const metadata = this.getCacheMetadata(conversationId);
    if (metadata) {
      metadata.lastMessageTimestamp = Date.now();
      this.saveCacheMetadata(conversationId, metadata);
    }
  }

  


  getInitialLoadStrategy(conversationId: string): {
    useCache: boolean;
    syncAfterLoad: boolean;
    syncDelay: number;
  } {
    const metadata = this.getCacheMetadata(conversationId);
    const hasCache = metadata && metadata.totalMessages > 0;
    
    if (!hasCache) {
      return {
        useCache: false,
        syncAfterLoad: false,
        syncDelay: 0
      };
    }
    
    const timeSinceSync = Date.now() - metadata.lastSyncTimestamp;
    const isRecentCache = timeSinceSync < 60 * 1000;
    
    return {
      useCache: true,
      syncAfterLoad: !isRecentCache,
      syncDelay: isRecentCache ? 5000 : 1000
    };
  }

  


  private saveCacheMetadata(conversationId: string, metadata: CacheMetadata): void {
    try {
      const allMetadata = this.getAllCacheMetadata();
      allMetadata[conversationId] = metadata;
      localStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(allMetadata));
    } catch (error) {
    }
  }

  


  private getCacheMetadata(conversationId: string): CacheMetadata | null {
    try {
      const allMetadata = this.getAllCacheMetadata();
      return allMetadata[conversationId] || null;
    } catch (error) {
      return null;
    }
  }

  


  private getAllCacheMetadata(): Record<string, CacheMetadata> {
    try {
      const stored = localStorage.getItem(this.CACHE_METADATA_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  


  getCacheStats(): {
    totalConversations: number;
    averageAge: number;
    needsSyncCount: number;
  } {
    const allMetadata = this.getAllCacheMetadata();
    const conversations = Object.values(allMetadata);
    
    if (conversations.length === 0) {
      return { totalConversations: 0, averageAge: 0, needsSyncCount: 0 };
    }
    
    const now = Date.now();
    const totalAge = conversations.reduce((sum, meta) => 
      sum + (now - meta.lastSyncTimestamp), 0);
    
    return {
      totalConversations: conversations.length,
      averageAge: totalAge / conversations.length,
      needsSyncCount: conversations.filter(meta => meta.needsSync).length
    };
  }

  


  cleanupOldCache(): void {
    const allMetadata = this.getAllCacheMetadata();
    const maxAge = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    let cleanedCount = 0;
    
    for (const [conversationId, metadata] of Object.entries(allMetadata)) {
      if (now - metadata.lastSyncTimestamp > maxAge) {
        delete allMetadata[conversationId];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      localStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(allMetadata));
    }
  }

  


  destroy(): void {
    for (const timer of this.syncTimers.values()) {
      clearInterval(timer);
    }
    this.syncTimers.clear();
  }
}

export const smartCacheService = new SmartCacheService();
