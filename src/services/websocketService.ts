import { 
  MessageBatcher, 
  MessageDeduplicator, 
  AdaptiveHeartbeat,
  SmartQueue,
  PerformanceMonitor
} from '../utils/websocketOptimizations';


class Emitter {
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private eventBatchers: Map<string, MessageBatcher<any>> = new Map();
  private perfMonitor = new PerformanceMonitor();
  
  
  private readonly BATCHABLE_EVENTS = new Set([
    'message:new',
    'message:delivered',
    'message:read',
    'presence:online',
    'presence:offline',
    'notification'
  ]);

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
      this.eventBatchers.delete(event);
    } else {
      this.listeners.clear();
      this.eventBatchers.clear();
    }
  }

  cleanup() {
    
    this.listeners.clear();
    
    
    for (const [_, batcher] of this.eventBatchers) {
      try {
        
        (batcher as any).flush?.();
      } catch {}
    }
    this.eventBatchers.clear();
  }

  emit(event: string, ...args: any[]) {
    const set = this.listeners.get(event);
    if (!set) return;
    
    
    if (this.BATCHABLE_EVENTS.has(event)) {
      this.emitBatched(event, args, set);
    } else {
      
      this.emitImmediate(event, args, set);
    }
  }
  
  private emitBatched(event: string, args: any[], listeners: Set<(...args: any[]) => void>) {
    if (!this.eventBatchers.has(event)) {
      this.eventBatchers.set(event, new MessageBatcher(
        (batch) => {
          const start = performance.now();
          for (const listener of listeners) {
            try {
              
              listener(...batch[batch.length - 1]); 
            } catch (e) {
            }
          }
          this.perfMonitor.record(`emit:${event}`, performance.now() - start);
        },
        { batchSize: 5, maxWait: 50 } 
      ));
    }
    
    this.eventBatchers.get(event)!.add(args);
  }
  
  private emitImmediate(event: string, args: any[], listeners: Set<(...args: any[]) => void>) {
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        for (const listener of listeners) {
          try { 
            listener(...args); 
          } catch (e) { 
          }
        }
      }, { timeout: 100 });
    } else {
      requestAnimationFrame(() => {
        for (const listener of listeners) {
          try { 
            listener(...args); 
          } catch (e) { 
          }
        }
      });
    }
  }
  
  getStats() {
    const stats: Record<string, any> = {};
    for (const [event] of this.listeners) {
      stats[event] = this.perfMonitor.getStats(`emit:${event}`);
    }
    return stats;
  }
  
  destroy() {
    for (const batcher of this.eventBatchers.values()) {
      batcher.destroy();
    }
    this.eventBatchers.clear();
    this.listeners.clear();
  }
}

interface WebSocketMessage {
  type: string;
  data?: any;
  error?: string;
  timestamp: string;
}

interface ConnectionOptions {
  token: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

class WebSocketService extends Emitter {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnected: boolean = false;
  
  
  private messageQueue = new SmartQueue<WebSocketMessage>(100);
  private lastQueueLogTime: number = 0;
  private readonly QUEUE_LOG_THROTTLE = 5000;
  private pendingAcks: Map<string, { timestamp: number; message: any }> = new Map();
  private readonly ACK_TIMEOUT = 10000;
  private readonly MAX_PENDING_ACKS = 100; 
  private ackCheckerInterval: ReturnType<typeof setInterval> | null = null;
  
  
  private messageDeduplicator = new MessageDeduplicator(5000);
  
  
  private adaptiveHeartbeat: AdaptiveHeartbeat | null = null;
  private heartbeatIntervalMs: number = 25000;
  private heartbeatTimeoutMs: number = 15000;
  private maxMissedPongs: number = 2;
  private lastPingAt: number | null = null;
  private awaitingPong: boolean = false;
  private missedPongs: number = 0;
  private tabHidden: boolean = false;


  private isConnecting: boolean = false;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastServerActivity: number = Date.now();
  private offline: boolean = false;
  private presence: Map<string, { online: boolean; lastSeen?: string; lastActiveAt?: string }> = new Map();
  private readonly MAX_PRESENCE_ENTRIES = 500; 
  private presenceSubscriptions: Set<string> = new Set();
  private tabHiddenSince: number | null = null;
  private readonly MAX_HIDDEN_TIME = 30 * 60 * 1000; 
  
  private handleVisibility = () => {
    try {
      if (typeof document !== 'undefined') {
        const isVisible = document.visibilityState === 'visible';
        this.tabHidden = !isVisible;
        
        if (isVisible) {
          
          const hiddenDuration = this.tabHiddenSince ? Date.now() - this.tabHiddenSince : 0;
          this.tabHiddenSince = null;
          
          
          if (hiddenDuration > this.MAX_HIDDEN_TIME) {
            this.cleanupOldData();
          }
          
          
          if (!this.isConnected && this.shouldReconnect && !this.offline) {
            this.reconnect(true);
          }
          
          this.lastServerActivity = Date.now();
        } else {
          
          this.tabHiddenSince = Date.now();
        }
      }
    } catch {}
  };
  private handleFocus = () => {
    try {
      if (!this.isConnected && this.shouldReconnect && !this.offline) {
        this.reconnect(true);
      }
    } catch {}
  };
  private getLatestToken = (): string => {
    try {
      return (localStorage.getItem('token') || localStorage.getItem('authToken') || this.token || '').toString();
    } catch {
      return this.token || '';
    }
  };

  constructor() {
    super();

    const envWs = ((import.meta as any).env?.VITE_CHAT_WS_URL) || 'wss://zenith.enrelyugi.com.br/ws';
    let wsUrl = envWs;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
    }
    this.url = wsUrl.replace(/\/$/, '');
    this.token = '';
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = Infinity;
    

    this.loadPersistedQueue();
    

    this.startAckTimeoutChecker();


    if (typeof window !== 'undefined' && (window as any).addEventListener) {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      try { window.addEventListener('visibilitychange', this.handleVisibility); } catch {}
      try { window.addEventListener('focus', this.handleFocus); } catch {}
    }
  }

  private handleOnline = () => {
    this.offline = false;
    if (!this.isConnected && this.shouldReconnect) {

      this.reconnectAttempts = 0;
      this.reconnect(true);
    }
  };

  private handleOffline = () => {
    this.offline = true;

    try { this.ws?.close(); } catch {  }
    this.isConnected = false;
    this.emit('disconnected');
  };

  connect(options: ConnectionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = options.token || this.getLatestToken();
      this.shouldReconnect = options.reconnect !== false;
      this.reconnectInterval = options.reconnectInterval ?? 5000;
      this.maxReconnectAttempts = (options.maxReconnectAttempts ?? Infinity);


      if (this.isConnecting || this.isConnected) {
        resolve();
        return;
      }
      if (this.offline) {

        this.reconnect(true);
        resolve();
        return;
      }

      try {
        this.isConnecting = true;
        const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
        this.ws = new WebSocket(wsUrl);


        if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); }
        this.handshakeTimer = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            try { this.ws.close(); } catch {  }
          }
          this.isConnecting = false;
          if (this.shouldReconnect) this.reconnect();
        }, 12000);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastServerActivity = Date.now();
          
          this.awaitingPong = false;
          this.missedPongs = 0;
          this.lastPingAt = null;
          if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }
          if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
          this.emit('connected');

          this.processMessageQueue();
          this.startPingInterval();

          
          try {
            const ids = Array.from(this.presenceSubscriptions);
            if (ids.length > 0) {
              this.send({ type: 'presence:subscribe', userIds: ids });
              this.send({ type: 'presence:query', userIds: ids });
            }
          } catch {}
          resolve();
        };

        this.ws.onmessage = (event) => {
          
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              this.lastServerActivity = Date.now();
              try {
                const message: WebSocketMessage = JSON.parse(event.data);
                this.handleMessage(message);
              } catch (error) {
              }
            }, { timeout: 100 });
          } else {
            requestAnimationFrame(() => {
              this.lastServerActivity = Date.now();
              try {
                const message: WebSocketMessage = JSON.parse(event.data);
                this.handleMessage(message);
              } catch (error) {
              }
            });
          }
        };

        this.ws.onerror = (error) => {
          if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }
          this.emit('error', error);
          this.isConnecting = false;
          if (!this.isConnected) {

            if (this.offline) {
              this.reconnect(true);
              resolve();
            } else {
              reject(error);
            }
          }
        };

        this.ws.onclose = (ev) => {
          if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }
          this.isConnected = false;
          this.isConnecting = false;
          this.emit('disconnected');

          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
          }

          
          try {
            const code = (ev as any)?.code;
            const reason = (ev as any)?.reason || '';
            if (this.shouldReconnect && !this.offline) {
              if (code === 4001 || code === 4401 || /auth|token|unauth|expired/i.test(String(reason))) {
                this.token = this.getLatestToken();
                this.reconnect(true);
                return;
              }
              if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnect();
              }
            }
          } catch {
            if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts && !this.offline) {
              this.reconnect();
            }
          }
        };
      } catch (error) {
        this.isConnecting = false;
        if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }
        reject(error);
      }
    });
  }

  private reconnect(immediate: boolean = false) {

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts++;
    const base = Math.min(this.reconnectInterval * Math.pow(2, Math.max(0, this.reconnectAttempts - 1)), 30000);
    const jitter = base * (0.2 * (Math.random() - 0.5) * 2);
    const delay = immediate ? 0 : Math.max(250, base + jitter);

    this.reconnectTimer = setTimeout(() => {
      
      try { this.token = this.getLatestToken(); } catch {}
      this.connect({ 
        token: this.token, 
        reconnect: true,
        reconnectInterval: this.reconnectInterval,
        maxReconnectAttempts: this.maxReconnectAttempts
      }).catch(() => {

      });
    }, delay);
  }

  private startPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.pingInterval = setInterval(() => {
      if (!this.isConnected) return;
      const now = Date.now();

      
      const effectiveTimeout = this.tabHidden 
        ? this.heartbeatTimeoutMs * 2  
        : this.heartbeatTimeoutMs;     

      
      if (now - this.lastServerActivity < this.heartbeatIntervalMs * 0.5) {
        return;
      }

      
      if (this.awaitingPong && this.lastPingAt && (now - this.lastPingAt > effectiveTimeout)) {
        this.awaitingPong = false;
        this.missedPongs += 1;
                
        if (this.missedPongs >= this.maxMissedPongs) {
          
                    try { this.ws?.close(); } catch {  }
          return;
        }
      }

      
      if (!this.awaitingPong) {
        this.lastPingAt = now;
        this.awaitingPong = true;
        this.send({ type: 'ping' });
      }
    }, this.heartbeatIntervalMs);
  }

  private handleMessage(message: WebSocketMessage) {
    
    if (message.type === 'error' && (message as any).banned) {
                  
      
      localStorage.clear();
      
      
      this.disconnect();
      
      
      window.dispatchEvent(new CustomEvent('user-banned', { 
        detail: {
          reason: (message as any).error || 'Conta banida',
          source: 'websocket'
        }
      }));
      
      
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
      return;
    }

    
    if (message.type === 'user:banned') {
                  
      
      alert(`🚫 Sua conta foi banida!\n\nMotivo: ${(message as any).reason || 'Violação dos termos de uso'}\n\nVocê será desconectado imediatamente.`);
      
      
      localStorage.clear();
      sessionStorage.clear();
      
      
      this.disconnect();
      
      
      window.dispatchEvent(new CustomEvent('user-banned', { 
        detail: {
          reason: (message as any).reason || 'Violação dos termos de uso',
          source: 'realtime',
          timestamp: (message as any).timestamp
        }
      }));
      
      
      window.location.href = '/';
      
      return;
    }

    if (message.type === 'message:delivery_ack' && (message.data as any)?.messageId) {
      const messageId = (message.data as any).messageId;
      this.pendingAcks.delete(messageId);
      return;
    }
    

    if ((message.data as any)?.messageId) {
      this.sendAcknowledgment((message.data as any).messageId);
    }

    switch (message.type) {
      case 'connection':
        this.emit('connection', message.data);
        break;

      case 'message:new':
        this.emit('message:new', message.data);
        break;

      
      case 'message:sent':
        this.emit('message:sent', message.data);
        break;

      case 'message:send':
        this.emit('message:sent', message.data);
        break;

      case 'message:read':
        this.emit('message:read', message.data);
        break;

      
      case 'message:delivery_status':
        this.emit('message:delivery_status', message.data);
        break;
      case 'message:delivered':
        this.emit('message:delivered', message.data);
        break;

      case 'message:delivery_confirmed':
        this.emit('message:delivery_confirmed', message.data);
        break;

      case 'conversation:updated':
        this.emit('conversation:updated', message.data);
        break;
      case 'conversations:update':
        this.emit('conversations:update', message.data);
        break;
      case 'conversations:list':
        this.emit('conversations:list', message.data);
        break;
      case 'conversations:polling_started':
        this.emit('conversations:polling_started', message.data);
        break;
      case 'conversations:polling_stopped':
        this.emit('conversations:polling_stopped', message.data);
        break;
      case 'conversations:error':
        this.emit('conversations:error', message.data || { message: 'Erro desconhecido' });
        break;

      case 'user:typing':
        this.emit('user:typing', message.data);
        break;

      case 'user:stopped_typing':
        this.emit('user:stopped_typing', message.data);
        break;

      case 'message:pending':
        this.emit('message:pending', message.data);
        break;

      case 'message:offline_batch':
        this.emit('message:offline_batch', message.data);
        break;

      case 'message:offline_recovery':
        this.emit('message:offline_recovery', message.data);
        break;

      case 'notification':
        this.emit('notification', message.data);
        break;

      case 'proposal:received':
        this.emit('proposal:received', message.data);
        break;

      case 'proposal:accepted':
        this.emit('proposal:accepted', message.data);
        break;

      case 'proposal:rejected':
        this.emit('proposal:rejected', message.data);
        break;

      case 'proposal:expired':
        this.emit('proposal:expired', message.data);
        break;

      case 'delivery_confirmed':
        this.emit('delivery_confirmed', message.data);
        break;

      case 'service:cancelled':
        this.emit('service:cancelled', message.data);
        break;

      case 'marketplace:status_changed': {
   
        this.emit('marketplace:status_changed', message.data);

        try {
          const payload: any = {
            type: 'purchase:status_changed',
            data: {
              conversationId: (message.data as any)?.conversationId,
              purchaseId: (message.data as any)?.purchaseId,
              status: String((message.data as any)?.status || ''),
              buyerId: (message.data as any)?.buyerId,
              sellerId: (message.data as any)?.sellerId,
              shippedAt: (message.data as any)?.shippedAt ?? null,
              deliveredAt: (message.data as any)?.deliveredAt ?? null,
              autoReleaseAt: (message.data as any)?.autoReleaseAt ?? null,
              source: (message.data as any)?.source || 'realtime',
              updatedAt: (message.data as any)?.updatedAt || message.timestamp
            },
            timestamp: message.timestamp
          };

          this.emit('purchase:status_changed', payload);
        } catch {
 
        }
        break;
      }

      case 'support:ticket_created':
        this.emit('support:ticket_created', message.data);
        break;

      case 'pong':
        this.lastServerActivity = Date.now();
        
        this.awaitingPong = false;
        this.missedPongs = 0;
        break;

      
      case 'presence:online': {
        try {
          const u = (message as any).data?.userId || (message as any).userId;
          const onlineSince = (message as any).data?.onlineSince;
          if (u) {
            this.presence.set(String(u), { online: true, lastSeen: undefined, lastActiveAt: onlineSince });
            this.emit('presence:online', { userId: String(u), onlineSince });
          }
        } catch {}
        break;
      }
      case 'presence:offline': {
        try {
          const u = (message as any).data?.userId || (message as any).userId;
          const lastSeen = (message as any).data?.lastSeen;
          const lastActiveAt = (message as any).data?.lastActiveAt;
          if (u) {
            this.presence.set(String(u), { online: false, lastSeen, lastActiveAt });
            this.emit('presence:offline', { userId: String(u), lastSeen, lastActiveAt });
          }
        } catch {}
        break;
      }
      case 'presence:snapshot': {
        try {
          const statuses = (message as any).data?.statuses || [];
          statuses.forEach((s: any) => {
            if (!s || !s.userId) return;
            this.presence.set(String(s.userId), { online: !!s.online, lastSeen: s.lastSeen || undefined, lastActiveAt: s.lastActiveAt || undefined });
          });
          this.emit('presence:snapshot', { statuses });
        } catch {}
        break;
      }

      default:
    }
  }

  send(message: any): boolean {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      
      this.messageQueue.add(message, 'normal');
      this.persistQueue();
      

      const now = Date.now();
      if (now - this.lastQueueLogTime > this.QUEUE_LOG_THROTTLE) {
        this.lastQueueLogTime = now;
      }
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      
      this.messageQueue.add(message, 'high'); 
      this.persistQueue();
      return false;
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        (message as any).messageId = messageId;
        

        this.pendingAcks.set(messageId, {
          timestamp: Date.now(),
          message: message
        });
        
        this.send(message);
      }
    }
    

    if (this.messageQueue.length === 0) {
      this.clearPersistedQueue();
    }
  }


  sendMessage(conversationId: string, content: string, type: string = 'text', attachments: any[] = [], tempId?: string) {
    return this.send({
      type: 'message:send',
      data: {
        conversationId,
        content,
        type,
        attachments,
        tempId
      }
    });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    return this.send({
      type: 'message:typing',
      conversationId,
      isTyping
    });
  }

  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    return this.send({
      type: 'message:read',
      conversationId,
      messageIds
    });
  }

  openConversation(conversationId: string) {
    return this.send({
      type: 'conversation:open',
      conversationId
    });
  }

  closeConversation(conversationId: string) {
    return this.send({
      type: 'conversation:close',
      conversationId
    });
  }

  getConversations() {
    return this.send({
      type: 'conversation:list'
    });
  }

  
  startConversationsPolling(lastCheck?: number) {
    return this.send({
      type: 'conversations:start_polling',
      lastCheck: lastCheck || Date.now()
    });
  }

  stopConversationsPolling() {
    return this.send({
      type: 'conversations:stop_polling'
    });
  }

  getConversationsViaWS(lastCheck?: number) {
    return this.send({
      type: 'conversations:get_list',
      lastCheck: lastCheck || Date.now()
    });
  }

  getMessageHistory(conversationId: string, limit: number = 50, before?: string) {
    return this.send({
      type: 'message:history',
      conversationId,
      limit,
      before
    });
  }

  
  subscribePresence(userIds: string[]) {
    try { userIds.forEach(id => this.presenceSubscriptions.add(String(id))); } catch {}
    return this.send({ type: 'presence:subscribe', userIds });
  }
  unsubscribePresence(userIds: string[]) {
    try { userIds.forEach(id => this.presenceSubscriptions.delete(String(id))); } catch {}
    return this.send({ type: 'presence:unsubscribe', userIds });
  }
  queryPresence(userIds: string[]) {
    return this.send({ type: 'presence:query', userIds });
  }
  getPresence(userId: string): { online: boolean; lastSeen?: string; lastActiveAt?: string } | undefined {
    return this.presence.get(String(userId));
  }

  disconnect() {
    this.shouldReconnect = false;
    
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ackCheckerInterval) {
      clearInterval(this.ackCheckerInterval);
      this.ackCheckerInterval = null;
    }
    
    
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.emit('disconnected');
  }

  
  destroy() {
    this.disconnect();
    
    
    if (typeof window !== 'undefined') {
      try {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        window.removeEventListener('visibilitychange', this.handleVisibility);
        window.removeEventListener('focus', this.handleFocus);
      } catch {}
    }
    
    
    this.pendingAcks.clear();
    this.presence.clear();
    this.presenceSubscriptions.clear();
    
    
    try {
      while (this.messageQueue.shift() !== undefined) {
        
      }
    } catch {}
    
    
    this.cleanup();
    
    
    try {
      localStorage.removeItem('ws_message_queue');
    } catch {}
  }

  
  private cleanupOldData() {
    const now = Date.now();
    
    
    for (const [messageId, ackData] of this.pendingAcks.entries()) {
      if (now - ackData.timestamp > this.ACK_TIMEOUT * 3) {
        this.pendingAcks.delete(messageId);
      }
    }
    
    
    if (this.pendingAcks.size > this.MAX_PENDING_ACKS) {
      const entries = Array.from(this.pendingAcks.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - this.MAX_PENDING_ACKS);
      toRemove.forEach(([id]) => this.pendingAcks.delete(id));
    }
    
    
    if (this.presence.size > this.MAX_PRESENCE_ENTRIES) {
      const entries = Array.from(this.presence.keys());
      const toRemove = entries.slice(0, this.presence.size - this.MAX_PRESENCE_ENTRIES);
      toRemove.forEach(key => this.presence.delete(key));
    }
    
    
    try {
      if (this.messageQueue.length > 80) {
        let removed = 0;
        while (removed < 30 && this.messageQueue.shift() !== undefined) {
          removed++;
        }
      }
    } catch {}
  }

  
  forceReconnect() {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    try { this.ws?.close(); } catch {}
    this.reconnect(true);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  setUrl(url: string) {
    this.url = url;
  }


  private loadPersistedQueue() {
    requestIdleCallback(() => {
      try {
        const persistedQueue = localStorage.getItem('ws_message_queue');
        if (persistedQueue) {
          const messages = JSON.parse(persistedQueue);
          
          if (Array.isArray(messages)) {
            messages.forEach(msg => this.messageQueue.add(msg, 'normal'));
          }
        }
      } catch (error) {
      }
    }, { timeout: 1000 });
  }

  private persistQueue() {
    
    requestIdleCallback(() => {
      try {
        
        const messages: any[] = [];
        let msg;
        const tempQueue = new SmartQueue<WebSocketMessage>(100);
        
        
        while ((msg = this.messageQueue.shift()) !== undefined) {
          messages.push(msg);
          tempQueue.add(msg, 'normal');
        }
        
        
        this.messageQueue = tempQueue;
        
        
        if (messages.length > 0) {
          localStorage.setItem('ws_message_queue', JSON.stringify(messages));
        }
      } catch (error) {
      }
    }, { timeout: 500 });
  }

  private clearPersistedQueue() {
    requestIdleCallback(() => {
      try {
        localStorage.removeItem('ws_message_queue');
      } catch (error) {
      }
    });
  }

  private startAckTimeoutChecker() {
    
    if (this.ackCheckerInterval) {
      clearInterval(this.ackCheckerInterval);
      this.ackCheckerInterval = null;
    }
    
    this.ackCheckerInterval = setInterval(() => {
      const now = Date.now();
      for (const [messageId, ackData] of this.pendingAcks.entries()) {
        if (now - ackData.timestamp > this.ACK_TIMEOUT) {
          this.pendingAcks.delete(messageId);
          
          this.messageQueue.add(ackData.message, 'high');
          this.persistQueue();
        }
      }
      
      
      
      if (Math.random() < 0.2) { 
        this.cleanupOldData();
      }
    }, 5000);
  }

  private sendAcknowledgment(messageId: string) {
    this.send({
      type: 'message:delivery_ack',
      messageId
    });
  }
}


const websocketService = new WebSocketService();
export default websocketService;
