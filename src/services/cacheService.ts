interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  version: string;
  source: 'local' | 'server' | 'sync';
}
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  syncCount: number;
}
class FrontendCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly MAX_MEMORY_SIZE = 500;
  private readonly DEFAULT_TTL = 300000;
  private readonly STORAGE_PREFIX = 'hacklote_cache_';
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    syncCount: 0
  };
  constructor() {
    this.startCleanupInterval();
    this.syncWithStorage();
  }
  get<T>(key: string): T | null {
    try {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.stats.hits++;
        return memoryEntry.data as T;
      }
      const storageEntry = this.getFromStorage<T>(key);
      if (storageEntry && !this.isExpired(storageEntry)) {
        this.memoryCache.set(key, storageEntry);
        this.stats.hits++;
        return storageEntry.data as T;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }
  set<T>(key: string, data: T, ttlMs?: number, source: 'local' | 'server' | 'sync' = 'local'): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs || this.DEFAULT_TTL,
        version: this.generateVersion(),
        source
      };
      this.evictIfNecessary();
      this.memoryCache.set(key, entry);
      this.setInStorage(key, entry);
      this.stats.sets++;
    } catch (error) {
    }
  }
  delete(key: string): boolean {
    try {
      const memoryDeleted = this.memoryCache.delete(key);
      this.removeFromStorage(key);
      if (memoryDeleted) {
        this.stats.invalidations++;
      }
      return memoryDeleted;
    } catch (error) {
      return false;
    }
  }
  cacheMessages(conversationId: string, messages: any[], source: 'local' | 'server' = 'local'): void {
    const key = `messages:${conversationId}`;
    this.set(key, messages, 600000, source);
  }
  getCachedMessages(conversationId: string): any[] | null {
    const key = `messages:${conversationId}`;
    return this.get<any[]>(key);
  }
  cacheConversations(userId: string, conversations: any[], source: 'local' | 'server' = 'local'): void {
    const key = `conversations:${userId}`;
    this.set(key, conversations, 300000, source);
  }
  getCachedConversations(userId: string): any[] | null {
    const key = `conversations:${userId}`;
    return this.get<any[]>(key);
  }
  cacheUserSession(userId: string, sessionData: any): void {
    const key = `session:${userId}`;
    this.set(key, sessionData, 3600000);
  }
  getUserSession(userId: string): any | null {
    const key = `session:${userId}`;
    return this.get(key);
  }
  invalidateConversation(conversationId: string, userId?: string): void {
    this.delete(`messages:${conversationId}`);
    if (userId) {
      this.delete(`conversations:${userId}`);
    }
  }
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_PREFIX) && key.includes(userId)) {
        const cacheKey = key.substring(this.STORAGE_PREFIX.length);
        keysToDelete.push(cacheKey);
      }
    }
    keysToDelete.forEach(key => this.delete(key));
  }
  syncWithServer(serverData: { [key: string]: any }): void {
    try {
      let syncCount = 0;
      for (const [key, data] of Object.entries(serverData)) {
        const existingEntry = this.memoryCache.get(key);
        if (!existingEntry || this.isExpired(existingEntry)) {
          this.set(key, data, undefined, 'server');
          syncCount++;
        }
      }
      this.stats.syncCount += syncCount;
    } catch (error) {
    }
  }
  clear(): void {
    this.memoryCache.clear();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      syncCount: 0
    };
  }
  getStats(): CacheStats & { hitRate: string; memorySize: number; storageSize: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) : '0.00';
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      storageSize: this.getStorageSize()
    };
  }
  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.ttl) return false;
    return Date.now() > (entry.timestamp + entry.ttl);
  }
  private generateVersion(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  private evictIfNecessary(): void {
    if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
      const entriesToRemove = Math.floor(this.MAX_MEMORY_SIZE * 0.1);
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      for (let i = 0; i < entriesToRemove; i++) {
        const [key] = sortedEntries[i];
        this.memoryCache.delete(key);
      }
    }
  }
  private getFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const item = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }
  private setInStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
    }
  }
  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
    } catch {
    }
  }
  private getStorageSize(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_PREFIX)) {
        count++;
      }
    }
    return count;
  }
  private syncWithStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const cacheKey = key.substring(this.STORAGE_PREFIX.length);
          const entry = this.getFromStorage(cacheKey);
          if (entry && !this.isExpired(entry)) {
            this.memoryCache.set(cacheKey, entry);
          } else if (entry && this.isExpired(entry)) {
            this.removeFromStorage(cacheKey);
          }
        }
      }
    } catch (error) {
    }
  }
  private startCleanupInterval(): void {
    
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  private cleanup(): void {
    try {
      let cleanedCount = 0;
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const cacheKey = key.substring(this.STORAGE_PREFIX.length);
          const entry = this.getFromStorage(cacheKey);
          if (entry && this.isExpired(entry)) {
            this.removeFromStorage(cacheKey);
            cleanedCount++;
          }
        }
      }
      if (cleanedCount > 0) {
      }
    } catch (error) {
    }
  }
}
const cacheService = new FrontendCacheService();
export default cacheService;
