
interface WSMessage {
  type: string;
  data?: any;
  error?: string;
  timestamp?: string;
}


type WSEventCallback = (data: any) => void;

class NotificationWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isProcessingQueue = false;
  private lastReconnectTime = 0;
  private reconnectCooldown = 2000; 

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      if (now - this.lastReconnectTime < this.reconnectCooldown) {
        return;
      }

      if (this.isConnecting) {
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.lastReconnectTime = now;
      this.isConnecting = true;
      this.shouldReconnect = true;

      this.connectionTimeout = setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          if (this.ws) {
            this.ws.close();
            this.ws = null;
          }
          reject(new Error('Connection timeout'));
        }
      }, 10000); 

      try {
        const explicitWs = (import.meta as any).env?.VITE_CHAT_WS_URL as string | undefined;
        const chatApiUrl = (import.meta as any).env?.VITE_CHAT_API_URL || 'https://zenith.enrelyugi.com.br/';
        const derivedWs = chatApiUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
        let wsUrl = (explicitWs && explicitWs.trim().length > 0) ? explicitWs : derivedWs;
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
          wsUrl = wsUrl.replace('ws://', 'wss://');
        }
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;
  
        this.ws = new WebSocket(wsUrlWithToken);

        this.ws.onopen = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          setTimeout(() => {
            this.startHeartbeat();
            this.subscribeToNotifications();
            this.processMessageQueue();
          }, 0);
          this.emit('connected', { timestamp: new Date().toISOString() });
          resolve();
        };

        this.ws.onmessage = (event) => {
          requestAnimationFrame(() => {
            try {
              const message: WSMessage = JSON.parse(event.data);
              this.handleMessage(message);
            } catch (error) {
            }
          });
        };

        this.ws.onclose = (event) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.isConnecting = false;
          this.stopHeartbeat();
          
          
          if (this.shouldReconnect && event.code !== 1000) {
            
            setTimeout(() => this.handleError(), 0);
          }
        };

        this.ws.onerror = (error) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.isConnecting = false;
          
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      try {
        this.ws.close(1000, 'User disconnected');
      } catch (e) {
      }
      this.ws = null;
    }
    
    this.listeners.clear();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  private subscribeToNotifications(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.id || payload._id || payload.userId;
          (window as any).currentUserId = userId;
        } catch (e) {}
      }

      let watchedGameIds: number[] = [];
      try {
        const preferencesStr = localStorage.getItem('notification_preferences');
        if (preferencesStr) {
          const preferences = JSON.parse(preferencesStr);
          watchedGameIds = preferences.watchedGameIds || [];
        }
      } catch (e) {}

      this.send({
        type: 'notification:subscribe',
        types: [
          'new_proposal', 'proposal_accepted', 'new_boosting', 'boosting_completed', 'targeted_test',
          'wallet_deposit', 'wallet_withdraw', 'wallet_withdrawal',
          'qa:new_question', 'qa:answered',
          'order_completed', 'dispute_opened', 'dispute_message', 'message', 'group'
        ],
        games: watchedGameIds
      });
      this.send({
        type: 'notification:get_unread_count'
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(message: WSMessage): void {
    const chatMessageTypes = [
      'message:new',
      'message:sent',
      'message:typing',
      'message:read',
      'message:pending',
      'conversation:list',
      'conversation:opened',
      'conversation:closed',
      'message:history'
    ];

    if (chatMessageTypes.includes(message.type)) {
      return;
    }
    const { type, data, error } = message;

    if (error) {
      this.emit('error', { error, timestamp: new Date().toISOString() });
      return;
    }


    switch (type) {
      case 'connection':
        this.emit('connected', data);
        break;

      case 'notification:new':
        if (data?.notification) {
          this.emit('new_notification', { notification: data.notification });
        }
        break;

      case 'wallet:balance_updated':
        this.emit('wallet_balance_updated', { data });
        break;

      case 'wallet:escrow_updated':
        this.emit('wallet_escrow_updated', { data });
        break;

      case 'notification:unread_count':
        if (data?.count !== undefined) {
          this.emit('unread_count', { count: data.count });
        }
        break;

      case 'notification:read':
        if (data?.notificationId) {
          this.emit('notification_read', { notificationId: data.notificationId });
        }
        break;

      case 'notification:marked_read':
        if (data?.unreadCount !== undefined) {
          this.emit('unread_count', { count: data.unreadCount });
        }
        if (data?.notificationIds) {
          this.emit('notification_read', { notificationIds: data.notificationIds });
        }
        break;

      case 'notification:history':
        if (data?.notifications) {
          this.emit('notification_history', { notifications: data.notifications });
        }
        break;

      case 'notification:subscribed':
        break;

      case 'notification:error':
        break;

      case 'pong':
        break;

      default:
    }
  }

  private handleError(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', { 
        error: 'Max reconnection attempts reached',
        timestamp: new Date().toISOString() 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    setTimeout(() => {
      if (this.shouldReconnect && !this.isConnecting) {
        this.connect().catch((error) => {
        });
      }
    }, delay);
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        this.messageQueue.push(data);
      }
    } else {
      this.messageQueue.push(data);
    }
  }

  private processMessageQueue(): void {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const processNext = () => {
      if (this.messageQueue.length === 0 || !this.isConnected()) {
        this.isProcessingQueue = false;
        return;
      }

      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
      if (this.messageQueue.length > 0) {
        requestAnimationFrame(processNext);
      } else {
        this.isProcessingQueue = false;
      }
    };

    requestAnimationFrame(processNext);
  }


  markAsRead(notificationIds: string[]): void {
    this.send({
      type: 'notification:mark_read',
      notificationIds
    });
  }

  acknowledgeNotification(notificationId: string, action = 'received'): void {
    this.send({
      type: 'notification:acknowledge',
      notificationId,
      action
    });
  }

  getHistory(options: { limit?: number; unreadOnly?: boolean; types?: string[] } = {}): void {
    this.send({
      type: 'notification:get_history',
      ...options
    });
  }

  testNotification(message = 'Test notification', notificationType = 'info'): void {
    this.send({
      type: 'notification:test',
      message,
      notificationType
    });
  }


  on(event: string, callback: WSEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: WSEventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      requestAnimationFrame(() => {
        callbacks.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
          }
        });
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }

  getConnectionState(): number | null {
    return this.ws?.readyState || null;
  }
}


const notificationWebSocketService = new NotificationWebSocketService();
export default notificationWebSocketService;
