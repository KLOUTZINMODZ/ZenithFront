


interface ProposalWSMessage {
  type: string;
  data?: any;
  error?: string;
  timestamp?: string;
  boostingId?: string;
}

type ProposalEventCallback = (data: any) => void;

class ProposalWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<ProposalEventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private subscribedBoostings: Set<string> = new Set();
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
        const chatApiUrl = (import.meta as any).env?.VITE_CHAT_API_URL || 'https://zenith.enrelyugi.com.br/';
        let wsUrl = chatApiUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
        
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
            this.resubscribeAll();
          }, 0);
          
          this.emit('connected', { timestamp: new Date().toISOString() });
          resolve();
        };

        this.ws.onmessage = (event) => {
          requestAnimationFrame(() => {
            try {
              const message: ProposalWSMessage = JSON.parse(event.data);
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
    this.subscribedBoostings.clear();
    this.reconnectAttempts = 0;
  }

  


  subscribeToBoostingProposals(boostingId: string): void {
    if (!boostingId) return;

    this.subscribedBoostings.add(boostingId);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'proposal:subscribe',
        boostingId
      });
    }
  }

  


  unsubscribeFromBoostingProposals(boostingId: string): void {
    if (!boostingId) return;

    this.subscribedBoostings.delete(boostingId);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'proposal:unsubscribe',
        boostingId
      });
    }
  }

  


  private resubscribeAll(): void {
    if (this.subscribedBoostings.size === 0) return;
    
    this.subscribedBoostings.forEach(boostingId => {
      this.send({
        type: 'proposal:subscribe',
        boostingId
      });
    });
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

  


  private handleMessage(message: ProposalWSMessage): void {
    const { type, data, error, boostingId } = message;

    if (error) {
      this.emit('error', { error, timestamp: new Date().toISOString() });
      return;
    }

    switch (type) {
      case 'connection':
        this.emit('connected', data);
        break;

      case 'proposal:new':
        this.emit('proposal:new', { 
          proposal: data?.proposal,
          boostingId: boostingId || data?.boostingId 
        });
        break;

      case 'proposal:updated':
        this.emit('proposal:updated', { 
          proposal: data?.proposal,
          boostingId: boostingId || data?.boostingId 
        });
        break;

      case 'proposal:accepted':
        this.emit('proposal:accepted', { 
          proposalId: data?.proposalId,
          boostingId: boostingId || data?.boostingId,
          conversationId: data?.conversationId 
        });
        break;

      case 'proposal:rejected':
        this.emit('proposal:rejected', { 
          proposalId: data?.proposalId,
          boostingId: boostingId || data?.boostingId 
        });
        break;

      case 'proposal:cancelled':
        this.emit('proposal:cancelled', { 
          proposalId: data?.proposalId,
          boostingId: boostingId || data?.boostingId 
        });
        break;

      case 'boosting:cancelled':
        this.emit('boosting:cancelled', {
          boostingId: boostingId || data?.boostingId,
          conversationId: data?.conversationId,
          message: data?.message,
          reason: data?.reason,
          timestamp: data?.timestamp,
          cancelledBy: data?.cancelledBy
        });
        break;

      case 'boosting:broken':
        this.emit('boosting:broken', {
          boostingId: boostingId || data?.boostingId,
          conversationId: data?.conversationId,
          reason: data?.reason,
          requestedBy: data?.requestedBy,
          timestamp: data?.timestamp
        });
        break;

      case 'proposal:subscribed':
        break;

      case 'proposal:unsubscribed':
        break;
        
      case 'proposal:subscribe':
      case 'proposal:unsubscribe':
        
        break;

      case 'pong':
        
        break;
        
      case 'proposal:received':
        
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
      }
    }
  }

  


  on(event: string, callback: ProposalEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  


  off(event: string, callback: ProposalEventCallback): void {
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
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
        }
      });
    }
  }

  


  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  


  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}


const proposalWebSocketService = new ProposalWebSocketService();

export default proposalWebSocketService;
