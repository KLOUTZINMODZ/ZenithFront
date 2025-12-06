


import { smartCacheService } from './smartCacheService';
import { localStorageService, StoredMessage } from './localStorageService';
import pollingService from './pollingService';

export interface LoadResult {
  messages: StoredMessage[];
  source: 'cache' | 'api' | 'hybrid';
  isFresh: boolean;
  needsBackgroundSync: boolean;
}

export interface LoadOptions {
  forceSync?: boolean;
  maxCacheAge?: number;
  useBackground?: boolean;
}

class OptimizedMessageLoader {
  private loadingPromises = new Map<string, Promise<LoadResult>>();
  private backgroundSyncQueue = new Set<string>();
  private isProcessingSync = false;

  


  async loadMessages(
    conversationId: string, 
    options: LoadOptions = {}
  ): Promise<LoadResult> {

    if (this.loadingPromises.has(conversationId)) {
      return this.loadingPromises.get(conversationId)!;
    }

    const loadPromise = this.performLoad(conversationId, options);
    this.loadingPromises.set(conversationId, loadPromise);

    try {
      const result = await loadPromise;
      

      if (result.needsBackgroundSync && options.useBackground !== false) {
        this.scheduleBackgroundSync(conversationId);
      }
      
      return result;
    } finally {
      this.loadingPromises.delete(conversationId);
    }
  }

  


  private async performLoad(
    conversationId: string,
    options: LoadOptions
  ): Promise<LoadResult> {
    const strategy = smartCacheService.shouldUseCache(conversationId);
    


    if (strategy === 'cache-only' && !options.forceSync) {
      const cachedMessages = localStorageService.loadConversationMessages(conversationId);
      
      if (cachedMessages.length > 0) {
        
        smartCacheService.markAsSynced(
          conversationId, 
          cachedMessages.length,
          this.getLastMessageTimestamp(cachedMessages)
        );
        
        return {
          messages: cachedMessages,
          source: 'cache',
          isFresh: true,
          needsBackgroundSync: false
        };
      }
    }


    if (strategy === 'cache-then-sync') {
      const cachedMessages = localStorageService.loadConversationMessages(conversationId);
      
      if (cachedMessages.length > 0 && !options.forceSync) {
        
        return {
          messages: cachedMessages,
          source: 'hybrid',
          isFresh: false,
          needsBackgroundSync: true
        };
      }
    }


    const cachedMessages = localStorageService.loadConversationMessages(conversationId);
    
    if (cachedMessages.length > 0) {
      
      smartCacheService.markAsSynced(
        conversationId,
        cachedMessages.length,
        this.getLastMessageTimestamp(cachedMessages)
      );
      
      return {
        messages: cachedMessages,
        source: 'cache',
        isFresh: true,
        needsBackgroundSync: false
      };
    }


    return {
      messages: [],
      source: 'api',
      isFresh: true,
      needsBackgroundSync: false
    };
  }

  


  private scheduleBackgroundSync(conversationId: string): void {
    this.backgroundSyncQueue.add(conversationId);
    
    if (!this.isProcessingSync) {

      setTimeout(() => this.processBackgroundSync(), 100);
    }
  }

  


  private async processBackgroundSync(): Promise<void> {
    if (this.isProcessingSync || this.backgroundSyncQueue.size === 0) {
      return;
    }

    this.isProcessingSync = true;

    for (const conversationId of this.backgroundSyncQueue) {
      try {
        await this.performBackgroundSync(conversationId);
        this.backgroundSyncQueue.delete(conversationId);
      } catch (error) {

      }
    }

    this.isProcessingSync = false;
    

    if (this.backgroundSyncQueue.size > 0) {
      setTimeout(() => this.processBackgroundSync(), 5000);
    }
  }

  


  private async performBackgroundSync(conversationId: string): Promise<void> {

    return;
  }

  


  private mergeMessages(existing: StoredMessage[], newMessages: StoredMessage[]): StoredMessage[] {
    const merged = [...existing];
    const existingIds = new Set(existing.map(m => m._id));
    
    newMessages.forEach(newMsg => {
      if (!existingIds.has(newMsg._id)) {
        merged.push(newMsg);
      } else {

        const existingIndex = merged.findIndex(m => m._id === newMsg._id);
        if (existingIndex !== -1) {
          const existing = merged[existingIndex];
          if (this.isMessageMoreComplete(newMsg, existing)) {
            merged[existingIndex] = newMsg;
          }
        }
      }
    });


    return merged.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  


  private isMessageMoreComplete(newMsg: StoredMessage, existing: StoredMessage): boolean {

    if (newMsg._id && !existing._id) return true;
    

    if (!newMsg.isTemporary && existing.isTemporary) return true;
    

    const statusOrder = ['sending', 'sent', 'delivered', 'read'];
    const newStatus = statusOrder.indexOf(newMsg.status);
    const existingStatus = statusOrder.indexOf(existing.status);
    
    return newStatus > existingStatus;
  }

  


  private getLastMessageTimestamp(messages: StoredMessage[]): number {
    if (messages.length === 0) return Date.now();
    
    const lastMessage = messages[messages.length - 1];
    return new Date(lastMessage.createdAt).getTime();
  }

  


  async forceSync(conversationId: string): Promise<StoredMessage[]> {
    const result = await this.loadMessages(conversationId, { 
      forceSync: true,
      useBackground: false 
    });
    
    return result.messages;
  }

  


  hasPendingUpdates(): number {
    return this.backgroundSyncQueue.size;
  }

  


  cleanup(): void {
    this.loadingPromises.clear();
    this.backgroundSyncQueue.clear();
    this.isProcessingSync = false;
  }
}

export const optimizedMessageLoader = new OptimizedMessageLoader();
