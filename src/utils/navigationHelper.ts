


const navigationDebounce = new Map<string, number>();

export const safeNavigate = (
  navigate: (path: string) => void,
  path: string,
  options?: {
    delay?: number;
    debounceMs?: number;
    cleanup?: () => void;
  }
) => {
  const { delay = 0, debounceMs = 300, cleanup } = options || {};
  
  
  const now = Date.now();
  const lastNav = navigationDebounce.get(path);
  
  if (lastNav && now - lastNav < debounceMs) {
    console.log(`[Navigation] Debounced: ${path}`);
    return;
  }
  
  navigationDebounce.set(path, now);
  
  
  if (cleanup) {
    try {
      cleanup();
    } catch (error) {
      console.error('[Navigation] Cleanup error:', error);
    }
  }
  
  
  if (delay > 0) {
    const timeoutId = setTimeout(() => {
      try {
        navigate(path);
      } catch (error) {
        console.error('[Navigation] Navigate error:', error);
      }
    }, delay);
    
    
    return () => clearTimeout(timeoutId);
  } else {
    try {
      navigate(path);
    } catch (error) {
      console.error('[Navigation] Navigate error:', error);
    }
  }
};


class LoadingManager {
  private loadingStates = new Map<string, boolean>();
  private listeners = new Set<(key: string, loading: boolean) => void>();
  
  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
    this.listeners.forEach(listener => listener(key, loading));
  }
  
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }
  
  subscribe(listener: (key: string, loading: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  clear() {
    this.loadingStates.clear();
  }
}

export const loadingManager = new LoadingManager();


class CleanupManager {
  private cleanups = new Map<string, Array<() => void>>();
  
  register(key: string, cleanup: () => void) {
    if (!this.cleanups.has(key)) {
      this.cleanups.set(key, []);
    }
    this.cleanups.get(key)!.push(cleanup);
  }
  
  execute(key: string) {
    const cleanupList = this.cleanups.get(key);
    if (cleanupList) {
      cleanupList.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('[Cleanup] Error:', error);
        }
      });
      this.cleanups.delete(key);
    }
  }
  
  executeAll() {
    this.cleanups.forEach((cleanupList, key) => {
      this.execute(key);
    });
  }
}

export const cleanupManager = new CleanupManager();


export const registerCleanup = (key: string, cleanup: () => void) => {
  cleanupManager.register(key, cleanup);
};


const formSubmissions = new Map<string, number>();

export const safeFormSubmit = async <T>(
  key: string,
  submitFn: () => Promise<T>,
  options?: {
    debounceMs?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
): Promise<T | null> => {
  const { debounceMs = 1000, onStart, onEnd, onError } = options || {};
  
  
  if (loadingManager.isLoading(key)) {
    console.log(`[Form] Already submitting: ${key}`);
    return null;
  }
  
  
  const now = Date.now();
  const lastSubmit = formSubmissions.get(key);
  
  if (lastSubmit && now - lastSubmit < debounceMs) {
    console.log(`[Form] Debounced: ${key}`);
    return null;
  }
  
  formSubmissions.set(key, now);
  loadingManager.setLoading(key, true);
  
  if (onStart) onStart();
  
  try {
    const result = await submitFn();
    return result;
  } catch (error) {
    console.error(`[Form] Submit error (${key}):`, error);
    if (onError) onError(error);
    return null;
  } finally {
    loadingManager.setLoading(key, false);
    if (onEnd) onEnd();
  }
};


export const clearAllNavigationState = () => {
  navigationDebounce.clear();
  formSubmissions.clear();
  loadingManager.clear();
  cleanupManager.executeAll();
};
