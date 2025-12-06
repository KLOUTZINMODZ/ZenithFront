


import { useLocation } from 'react-router-dom';
import unifiedCacheService from './unifiedCacheService';
import chatCacheService from './chatCacheService';
import { messageCache } from '../utils/messageCache';

interface CacheRestoreOptions {
  force?: boolean;
  clearOldData?: boolean;
}

class RouteAwareCacheService {
  private static instance: RouteAwareCacheService;
  private initialized = false;
  private restoredForCurrentSession = false;
  
  static getInstance(): RouteAwareCacheService {
    if (!RouteAwareCacheService.instance) {
      RouteAwareCacheService.instance = new RouteAwareCacheService();
    }
    return RouteAwareCacheService.instance;
  }
  
  private constructor() {

  }
  
  


  private isMessagesRoute(): boolean {
    const currentPath = window.location.pathname;
    return currentPath === '/messages' || currentPath.startsWith('/messages/');
  }
  
  


  private async performCacheMigration(): Promise<void> {
    try {

      messageCache.clearOldCache();
      

      unifiedCacheService.migrateOldCaches();
      
      
    } catch (error) {

    }
  }
  
  


  async restoreCacheIfOnMessagesRoute(options: CacheRestoreOptions = {}): Promise<boolean> {

    if (this.restoredForCurrentSession && !options.force) {
      return false;
    }
    

    if (!this.isMessagesRoute()) {
      return false;
    }
    
    try {

      await this.performCacheMigration();
      

      this.restoredForCurrentSession = true;
      this.initialized = true;
      

      if (options.clearOldData) {
        this.clearExpiredCache();
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  


  async forceRestoreCache(): Promise<void> {
    await this.restoreCacheIfOnMessagesRoute({ force: true });
  }
  
  


  private clearExpiredCache(): void {
    try {

      unifiedCacheService.cleanup();
      

      messageCache.clearOldCache();
      
    } catch (error) {

    }
  }
  
  


  clearAllCache(): void {
    try {
      unifiedCacheService.clearAll();
      chatCacheService.clearCache();
      messageCache.clearCache();
      
      this.restoredForCurrentSession = false;
      this.initialized = false;
      
    } catch (error) {

    }
  }
  
  


  isInitialized(): boolean {
    return this.initialized;
  }
  
  


  getCombinedStats() {
    return {
      unified: unifiedCacheService.getCacheStats(),
      message: messageCache.getCacheStats(),
      initialized: this.initialized,
      restoredThisSession: this.restoredForCurrentSession,
      currentRoute: window.location.pathname,
      isMessagesRoute: this.isMessagesRoute()
    };
  }
  
  


  resetSessionState(): void {


    this.restoredForCurrentSession = false;
  }
}


const routeAwareCacheService = RouteAwareCacheService.getInstance();


export const useRouteAwareCache = () => {
  const location = useLocation();
  
  const restoreCache = async (options?: CacheRestoreOptions) => {
    return await routeAwareCacheService.restoreCacheIfOnMessagesRoute(options);
  };
  
  const isMessagesRoute = location.pathname === '/messages' || location.pathname.startsWith('/messages/');
  
  return {
    restoreCache,
    forceRestoreCache: routeAwareCacheService.forceRestoreCache.bind(routeAwareCacheService),
    clearAllCache: routeAwareCacheService.clearAllCache.bind(routeAwareCacheService),
    isInitialized: routeAwareCacheService.isInitialized.bind(routeAwareCacheService),
    getCombinedStats: routeAwareCacheService.getCombinedStats.bind(routeAwareCacheService),
    resetSessionState: routeAwareCacheService.resetSessionState.bind(routeAwareCacheService),
    isMessagesRoute,
    currentRoute: location.pathname
  };
};

export default routeAwareCacheService;
