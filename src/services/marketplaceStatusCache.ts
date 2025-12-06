


interface CachedStatus {
  purchaseId: string;
  status: string;
  timestamp: number; 
  source: 'api' | 'websocket' | 'local';
  data: {
    buyerId?: string;
    sellerId?: string;
    conversationId?: string;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    autoReleaseAt?: string | null;
    deliveryMethod?: string;
  };
}

class MarketplaceStatusCache {
  private cache = new Map<string, CachedStatus>();
  private readonly TTL = 5 * 60 * 1000; 
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanupInterval();
  }
  
  private startCleanupInterval(): void {
    
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    
    if (typeof window !== 'undefined') {
      this.cleanupIntervalId = setInterval(() => {
        this.cleanup();
      }, 2 * 60 * 1000);
    }
  }

  


  set(purchaseId: string, status: string, data: any, source: 'api' | 'websocket' | 'local'): boolean {
    const key = String(purchaseId);
    const existing = this.cache.get(key);
    const now = Date.now();
    
    const newEntry: CachedStatus = {
      purchaseId: key,
      status: String(status || ''),
      timestamp: now,
      source,
      data: {
        buyerId: data?.buyerId,
        sellerId: data?.sellerId,
        conversationId: data?.conversationId,
        shippedAt: data?.shippedAt || null,
        deliveredAt: data?.deliveredAt || null,
        autoReleaseAt: data?.autoReleaseAt || null,
        deliveryMethod: data?.deliveryMethod
      }
    };

    
    if (!existing) {
      this.cache.set(key, newEntry);
            return true;
    }

    

    
    if (source === 'websocket') {
      this.cache.set(key, newEntry);
            return true;
    }

    
    if (source === 'api') {
      
      if (existing.source === 'websocket') {
        const age = now - existing.timestamp;
        
        if (age < this.TTL) {
                    return false;
        }
      }

      
      const age = now - existing.timestamp;
      if (age < 30000 && existing.status !== status) {
                return false;
      }

      
      this.cache.set(key, newEntry);
            return true;
    }

    
    if (source === 'local') {
      if (existing.source === 'websocket' && (now - existing.timestamp) < 10000) {
                return false;
      }
      
      this.cache.set(key, newEntry);
            return true;
    }

    return false;
  }

  


  get(purchaseId: string): CachedStatus | null {
    const key = String(purchaseId);
    const cached = this.cache.get(key);
    
    if (!cached) return null;

    
    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
            this.cache.delete(key);
      return null;
    }

    return cached;
  }

  


  delete(purchaseId: string): void {
    const key = String(purchaseId);
    this.cache.delete(key);
      }

  


  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      if (age > this.TTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
          }

    return removed;
  }

  


  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      total: entries.length,
      bySource: {
        websocket: entries.filter(e => e.source === 'websocket').length,
        api: entries.filter(e => e.source === 'api').length,
        local: entries.filter(e => e.source === 'local').length
      },
      averageAge: entries.length > 0 
        ? Math.round(entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length / 1000)
        : 0
    };
  }

  


  clear(): void {
    this.cache.clear();
  }
}


const marketplaceStatusCache = new MarketplaceStatusCache();

export default marketplaceStatusCache;
