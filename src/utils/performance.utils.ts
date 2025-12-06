/**
 * Utilitários de Performance
 * 
 * Funções de otimização para prevenir chamadas excessivas,
 * melhorar performance e reduzir re-renders.
 */

// ============================================================================
// DEBOUNCE
// ============================================================================

/**
 * Cria uma versão debounced de uma função
 * A função só será executada após {wait}ms sem novas chamadas
 * 
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   api.search(query);
 * }, 300);
 * 
 * debouncedSearch('hello'); // Não executa ainda
 * debouncedSearch('world'); // Cancela anterior, espera 300ms
 * // Após 300ms: executa com 'world'
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };

  (debounced as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}


export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttled = (...args: Parameters<T>) => {
    lastArgs = args;

    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      lastArgs = null;

      timeoutId = setTimeout(() => {
        inThrottle = false;
        
        // Se houver chamadas pendentes, executar a última
        if (lastArgs) {
          throttled(...lastArgs);
        }
      }, limit);
    }
  };

  // Adicionar método para cancelar
  (throttled as any).cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inThrottle = false;
    lastArgs = null;
  };

  return throttled;
}

// ============================================================================
// BATCH PROCESSOR
// ============================================================================

/**
 * Processa itens em lote para otimizar operações
 * 
 * @example
 * ```ts
 * const processor = new BatchProcessor(
 *   (items) => {
 *     // Processa todos os itens de uma vez
 *     updateMultipleMessages(items);
 *   },
 *   { maxWait: 100, maxSize: 10 }
 * );
 * 
 * processor.add(message1);
 * processor.add(message2);
 * processor.add(message3);
 * // Após 100ms ou 10 itens: processa todos juntos
 * ```
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private processing: boolean = false;

  constructor(
    private processFn: (batch: T[]) => void | Promise<void>,
    private options: {
      maxWait?: number;
      maxSize?: number;
      onError?: (error: Error) => void;
    } = {}
  ) {
    this.options = {
      maxWait: 100,
      maxSize: 10,
      ...options
    };
  }

  /**
   * Adiciona item ao batch
   */
  add(item: T): void {
    this.batch.push(item);

    // Se atingiu tamanho máximo, processar imediatamente
    if (this.batch.length >= (this.options.maxSize || 10)) {
      this.flush();
    } 
    // Senão, agendar processamento
    else if (!this.timeout) {
      this.timeout = setTimeout(() => {
        this.flush();
      }, this.options.maxWait || 100);
    }
  }

  /**
   * Processa o batch imediatamente
   */
  async flush(): Promise<void> {
    // Limpar timeout se existir
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Se não há itens ou já está processando, retornar
    if (this.batch.length === 0 || this.processing) {
      return;
    }

    // Copiar e limpar batch
    const itemsToProcess = [...this.batch];
    this.batch = [];
    this.processing = true;

    try {
      await this.processFn(itemsToProcess);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (this.options.onError) {
        this.options.onError(err);
      } else {
        console.error('[BatchProcessor] Erro ao processar batch:', err);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Retorna tamanho atual do batch
   */
  size(): number {
    return this.batch.length;
  }

  /**
   * Limpa o batch sem processar
   */
  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.batch = [];
  }

  /**
   * Destrói o processor
   */
  destroy(): void {
    this.clear();
    this.processing = false;
  }
}

// ============================================================================
// MEMOIZATION
// ============================================================================

/**
 * Cache simples com TTL
 */
export class SimpleCache<K, V> {
  private cache = new Map<K, { value: V; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private defaultTTL: number = 60000, // 1 minuto
    private maxSize: number = 100
  ) {
    // Iniciar limpeza periódica
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000); // Limpar a cada 30s
  }

  /**
   * Armazena valor no cache
   */
  set(key: K, value: V, ttl?: number): void {
    // Se cache está cheio, remover item mais antigo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL)
    });
  }

  /**
   * Busca valor no cache
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    // Verificar se expirou
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * Verifica se chave existe
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove item do cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpa itens expirados
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retorna tamanho do cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Destrói o cache
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Memoiza resultado de uma função
 * 
 * @example
 * ```ts
 * const expensiveCalculation = memoize((a: number, b: number) => {
 *   // Cálculo pesado
 *   return a * b * Math.random();
 * });
 * 
 * expensiveCalculation(2, 3); // Executa
 * expensiveCalculation(2, 3); // Retorna do cache
 * ```
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T & { cache: SimpleCache<string, ReturnType<T>> } {
  const cache = new SimpleCache<string, ReturnType<T>>(
    options.ttl || 60000,
    options.maxSize || 100
  );

  const keyGenerator = options.keyGenerator || ((...args: any[]) => JSON.stringify(args));

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);
    
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T & { cache: SimpleCache<string, ReturnType<T>> };

  memoized.cache = cache;

  return memoized;
}

// ============================================================================
// REQUEST ANIMATION FRAME THROTTLE
// ============================================================================

/**
 * Throttle usando requestAnimationFrame
 * Ideal para eventos de scroll, resize, etc.
 * 
 * @example
 * ```ts
 * const rafScroll = rafThrottle(() => {
 *   // Atualizar posição
 * });
 * 
 * window.addEventListener('scroll', rafScroll);
 * ```
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        rafId = null;
        lastArgs = null;
      });
    }
  };

  // Adicionar método para cancelar
  (throttled as any).cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
  };

  return throttled;
}

// ============================================================================
// IDLE CALLBACK SCHEDULER
// ============================================================================

/**
 * Agenda execução durante idle time do navegador
 * 
 * @example
 * ```ts
 * scheduleIdleTask(() => {
 *   // Tarefa não urgente
 *   processAnalytics();
 * });
 * ```
 */
export function scheduleIdleTask(
  callback: () => void,
  options: { timeout?: number } = {}
): number {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback, { timeout: options.timeout || 1000 });
  } else {
    // Fallback para setTimeout
    return setTimeout(callback, 1) as any;
  }
}

/**
 * Cancela idle task
 */
export function cancelIdleTask(id: number): void {
  if ('cancelIdleCallback' in window) {
    cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

// ============================================================================
// ASYNC QUEUE
// ============================================================================

/**
 * Fila assíncrona com controle de concorrência
 * 
 * @example
 * ```ts
 * const queue = new AsyncQueue(2); // Max 2 tarefas simultâneas
 * 
 * queue.enqueue(() => fetchUser(1));
 * queue.enqueue(() => fetchUser(2));
 * queue.enqueue(() => fetchUser(3));
 * // Executa 2 por vez
 * ```
 */
export class AsyncQueue {
  private queue: Array<() => Promise<any>> = [];
  private running: number = 0;

  constructor(private concurrency: number = 1) {}

  /**
   * Adiciona tarefa à fila
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  /**
   * Processa fila
   */
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift();

    if (task) {
      try {
        await task();
      } finally {
        this.running--;
        this.process();
      }
    }
  }

  /**
   * Retorna tamanho da fila
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Limpa a fila
   */
  clear(): void {
    this.queue = [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  debounce,
  throttle,
  BatchProcessor,
  SimpleCache,
  memoize,
  rafThrottle,
  scheduleIdleTask,
  cancelIdleTask,
  AsyncQueue
};
