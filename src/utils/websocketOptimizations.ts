


export class MessageBatcher<T = any> {
  private queue: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callback: (batch: T[]) => void;
  private readonly batchSize: number;
  private readonly maxWait: number;

  constructor(
    callback: (batch: T[]) => void,
    options: { batchSize?: number; maxWait?: number } = {}
  ) {
    this.callback = callback;
    this.batchSize = options.batchSize || 10;
    this.maxWait = options.maxWait || 100; 
  }

  add(item: T) {
    this.queue.push(item);

    
    if (this.queue.length >= this.batchSize) {
      this.flush();
      return;
    }

    
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxWait);
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.callback(batch), { timeout: 50 });
    } else {
      requestAnimationFrame(() => this.callback(batch));
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}


export class EventThrottler {
  private lastCallTime: number = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly interval: number = 300) {}

  throttle<T extends (...args: any[]) => void>(fn: T): T {
    return ((...args: any[]) => {
      const now = Date.now();

      if (now - this.lastCallTime >= this.interval) {
        this.lastCallTime = now;
        fn(...args);
      } else {
        
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
          this.lastCallTime = Date.now();
          fn(...args);
        }, this.interval - (now - this.lastCallTime));
      }
    }) as T;
  }

  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}


export class EventDebouncer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly delay: number = 300) {}

  debounce<T extends (...args: any[]) => void>(fn: T): T {
    return ((...args: any[]) => {
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => fn(...args), this.delay);
    }) as T;
  }

  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}


export class CallbackManager<T = any> {
  private callbacks = new Map<string, Set<(data: T) => void>>();
  private executionQueue: Array<{ event: string; data: T }> = [];
  private isProcessing = false;

  on(event: string, callback: (data: T) => void) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  off(event: string, callback: (data: T) => void) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(event);
      }
    }
  }

  emit(event: string, data: T) {
    
    this.executionQueue.push({ event, data });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.executionQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    
    requestIdleCallback(
      () => {
        const chunk = this.executionQueue.splice(0, 5); 

        for (const { event, data } of chunk) {
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            for (const callback of callbacks) {
              try {
                callback(data);
              } catch (error) {
                console.error(`[CallbackManager] Error in callback for '${event}':`, error);
              }
            }
          }
        }

        
        if (this.executionQueue.length > 0) {
          this.processQueue();
        } else {
          this.isProcessing = false;
        }
      },
      { timeout: 50 }
    );
  }

  clear() {
    this.callbacks.clear();
    this.executionQueue = [];
    this.isProcessing = false;
  }
}


export class MessageDeduplicator {
  private seen = new Map<string, number>();
  private readonly ttl: number;

  constructor(ttl: number = 5000) {
    this.ttl = ttl;
  }

  isDuplicate(id: string): boolean {
    const now = Date.now();
    const lastSeen = this.seen.get(id);

    if (lastSeen && now - lastSeen < this.ttl) {
      return true; 
    }

    
    this.seen.set(id, now);

    
    this.cleanup();

    return false;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, timestamp] of this.seen.entries()) {
      if (now - timestamp > this.ttl) {
        this.seen.delete(id);
      }
    }
  }

  clear() {
    this.seen.clear();
  }
}


export class ConnectionQualityMonitor {
  private latencies: number[] = [];
  private readonly maxSamples = 10;
  private lastPingTime: number = 0;

  recordPing(sentAt: number, receivedAt: number = Date.now()) {
    const latency = receivedAt - sentAt;
    this.latencies.push(latency);

    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencies.length);
  }

  getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avg = this.getAverageLatency();

    if (avg < 100) return 'excellent';
    if (avg < 300) return 'good';
    if (avg < 600) return 'fair';
    return 'poor';
  }

  shouldReduceTraffic(): boolean {
    
    return this.getAverageLatency() > 500;
  }

  clear() {
    this.latencies = [];
  }
}


export class AdaptiveHeartbeat {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentInterval: number;
  private readonly baseInterval: number;
  private readonly slowInterval: number;
  private readonly qualityMonitor: ConnectionQualityMonitor;
  private tabVisible: boolean = true;

  constructor(
    private sendPing: () => void,
    options: { baseInterval?: number; slowInterval?: number } = {}
  ) {
    this.baseInterval = options.baseInterval || 25000; 
    this.slowInterval = options.slowInterval || 60000; 
    this.currentInterval = this.baseInterval;
    this.qualityMonitor = new ConnectionQualityMonitor();

    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    this.tabVisible = document.visibilityState === 'visible';
    this.adjustInterval();
  };

  start() {
    this.stop();
    this.ping();
  }

  private ping() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      const now = Date.now();
      this.sendPing();
      
      
      this.adjustInterval();
    }, this.currentInterval);
  }

  private adjustInterval() {
    let newInterval = this.baseInterval;

    
    if (!this.tabVisible) {
      newInterval = this.slowInterval;
    }
    
    else if (this.qualityMonitor.shouldReduceTraffic()) {
      newInterval = this.slowInterval;
    }

    if (newInterval !== this.currentInterval) {
      this.currentInterval = newInterval;
      this.ping(); 
    }
  }

  recordPong(sentAt: number) {
    this.qualityMonitor.recordPing(sentAt);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  destroy() {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}


export class SmartQueue<T = any> {
  private highPriority: T[] = [];
  private normalPriority: T[] = [];
  private lowPriority: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  add(item: T, priority: 'high' | 'normal' | 'low' = 'normal') {
    const queue = this.getQueue(priority);
    
    queue.push(item);

    
    this.enforceLimit();
  }

  private getQueue(priority: 'high' | 'normal' | 'low'): T[] {
    switch (priority) {
      case 'high': return this.highPriority;
      case 'low': return this.lowPriority;
      default: return this.normalPriority;
    }
  }

  private enforceLimit() {
    const total = this.highPriority.length + this.normalPriority.length + this.lowPriority.length;
    
    while (total > this.maxSize && this.lowPriority.length > 0) {
      this.lowPriority.shift();
    }
    
    while (total > this.maxSize && this.normalPriority.length > 0) {
      this.normalPriority.shift();
    }
  }

  shift(): T | undefined {
    
    if (this.highPriority.length > 0) {
      return this.highPriority.shift();
    }
    if (this.normalPriority.length > 0) {
      return this.normalPriority.shift();
    }
    if (this.lowPriority.length > 0) {
      return this.lowPriority.shift();
    }
    return undefined;
  }

  get length(): number {
    return this.highPriority.length + this.normalPriority.length + this.lowPriority.length;
  }

  clear() {
    this.highPriority = [];
    this.normalPriority = [];
    this.lowPriority = [];
  }
}


export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private readonly maxSamples = 50;

  record(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const samples = this.metrics.get(operation)!;
    samples.push(duration);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getAverage(operation: string): number {
    const samples = this.metrics.get(operation);
    if (!samples || samples.length === 0) return 0;

    const sum = samples.reduce((a, b) => a + b, 0);
    return sum / samples.length;
  }

  getStats(operation: string) {
    const samples = this.metrics.get(operation);
    if (!samples || samples.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    return {
      avg: this.getAverage(operation),
      min: Math.min(...samples),
      max: Math.max(...samples),
      count: samples.length
    };
  }

  clear() {
    this.metrics.clear();
  }
}


export function measurePerformance<T>(
  fn: () => T,
  label: string,
  monitor?: PerformanceMonitor
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    if (monitor) {
      monitor.record(label, duration);
    } else {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
  }
}
