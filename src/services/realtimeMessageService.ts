interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  content: string;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
}

interface Conversation {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: Message;
  unreadCount?: number;
  updatedAt: string;
  isTemporary?: boolean;
  status?: string;
  expiresAt?: string;
  client?: any;
  booster?: any;
  metadata?: any;
  proposal?: string;
  acceptedProposal?: {
    boosterId: string;
    proposedPrice: number;
    estimatedTime: string;
    acceptedAt: string;
  };
}

interface WebSocketMessage {
  type: string;
  data?: any;
  error?: string;
  timestamp?: string;
}

type ConversationUpdateCallback = (conversations: Conversation[]) => void;
type MessageUpdateCallback = (conversationId: string, messages: Message[]) => void;
type ConnectionStatusCallback = (isConnected: boolean) => void;

class RealtimeMessageService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  private handshakeTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastServerActivity: number = Date.now();
  private offline: boolean = false;
  private handleVisibility = () => {
    try {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!this.isConnected && this.shouldReconnect && !this.offline) {
          this.scheduleReconnect(0);
        }
      }
    } catch {}
  };
  private handleFocus = () => {
    try {
      if (!this.isConnected && this.shouldReconnect && !this.offline) {
        this.scheduleReconnect(0);
      }
    } catch {}
  };


  private conversationCallbacks = new Set<ConversationUpdateCallback>();
  private messageCallbacks = new Map<string, Set<MessageUpdateCallback>>();
  private connectionCallbacks = new Set<ConnectionStatusCallback>();


  private isConnected = false;
  private currentConversations: Conversation[] = [];

  private persistConversationsToStorage(conversations: Conversation[]): void {
    if (typeof window === 'undefined') return;
    try {
      const replacer = (_key: string, value: any) => {
        if (value instanceof Map) {
          return Object.fromEntries(value.entries());
        }
        return value;
      };
      const serialized = JSON.stringify(conversations, replacer);
      window.localStorage.setItem('unified_chat_conversations', serialized);
    } catch (error) {
      
    }
  }

  private broadcastConversationUpdate(conversations: Conversation[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('conversations:force-update', {
        detail: { conversations }
      }));
    } catch (error) {
      
    }
  }

  private updateConversationState(conversations: Conversation[]): void {
    this.currentConversations = conversations;
    this.persistConversationsToStorage(conversations);
    this.broadcastConversationUpdate(conversations);
  }

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);


    if (typeof window !== 'undefined' && (window as any).addEventListener) {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      try { window.addEventListener('visibilitychange', this.handleVisibility as any); } catch {}
      try { window.addEventListener('focus', this.handleFocus as any); } catch {}
    }
  }

  private handleOnline = () => {
    this.offline = false;
    if (!this.isConnected && this.shouldReconnect) {
      this.reconnectAttempts = 0;
      this.scheduleReconnect(0);
    }
  };

  private handleOffline = () => {
    this.offline = true;
    try { this.ws?.close(); } catch {  }
    this.isConnected = false;
  };

  private handleProposalRejected(data: any): void {
    const conversationId = data?.conversationId;

    if (conversationId) {
      const exists = this.currentConversations.some(conv => conv._id === conversationId);

      if (exists) {
        const updatedConversations = this.currentConversations.filter(conv => conv._id !== conversationId);
        this.updateConversationState(updatedConversations);

        const snapshot = updatedConversations.slice();

        requestAnimationFrame(() => {
          this.conversationCallbacks.forEach(callback => {
            try {
              callback(snapshot);
            } catch (error) {
            }
          });
        });
      }
    }

    try {

      window.dispatchEvent(new CustomEvent('boosting:proposal-rejected', {
        detail: { conversationId, proposalId: data?.proposalId }
      }));
    } catch {}


    this.requestConversationList();
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = this.getLatestToken();
      if (!token) {
        this.isConnecting = false;
        return;
      }

      if (this.offline) {

        this.isConnecting = false;
        this.scheduleReconnect();
        return;
      }

      const envWs = (import.meta as any).env?.VITE_CHAT_WS_URL as string | undefined;
      const baseWs = envWs || 'wss://zenith.enrelyugi.com.br/ws';
      const wsUrl = `${baseWs}?token=${encodeURIComponent(token)}`;

      this.ws = new WebSocket(wsUrl);


      if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
      this.handshakeTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          try { this.ws.close(); } catch {}
        }
        this.isConnecting = false;
        this.scheduleReconnect();
      }, 12000);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.lastServerActivity = Date.now();
        if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        
        this.notifyConnectionStatus(true);
        this.startHeartbeat();
        

        
        this.requestConversationList();
        
        try {
          this.ws?.send(JSON.stringify({
            type: 'conversations:get_list',
            lastCheck: Date.now(),
            timestamp: new Date().toISOString()
          }));
        } catch {}
      };

      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;

    } catch (error) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(event: MessageEvent): void {
    
    requestAnimationFrame(() => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.lastServerActivity = Date.now();

      switch (message.type) {
        case 'conversations:update': {
          
          const payload = (message as any).data;
          const list = Array.isArray(payload) ? payload : (payload?.conversations || []);
          this.handleConversationList(list);
          break;
        }
        case 'conversations:list': {
          
          const payload = (message as any).data;
          const list = Array.isArray(payload) ? payload : (payload?.conversations || []);
          this.handleConversationList(list);
          break;
        }
        case 'conversation:list':
          this.handleConversationList(message.data);
          break;
        
        case 'conversation:updated':
          this.handleConversationUpdate(message.data);
          break;
        case 'conversation:deleted':
          this.handleConversationDeleted(message.data);
          break;
        
        case 'conversation:new':
          this.handleNewConversation(message.data);
          break;
        
        case 'message:new':
          this.handleNewMessage(message.data);
          break;
        
        case 'message:history':
          this.handleMessageHistory(message.data);
          break;
        
        case 'proposal:accepted':
          this.handleProposalAccepted(message.data);
          break;
        case 'proposal:rejected':
          this.handleProposalRejected(message.data);
          break;
        
        case 'marketplace:status_changed':
          
          this.requestConversationList();
          break;

        case 'conversations:polling_started':
        case 'conversations:polling_stopped':
        case 'conversations:error':
          
          break;

        case 'error':
          break;
        
        case 'pong':

          this.lastServerActivity = Date.now();
          break;
        
        default:
      }
      } catch (error) {
      }
    });
  }

  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    this.notifyConnectionStatus(false);

    if (this.shouldReconnect && event.code !== 1000 && !this.offline) {
      const reason = (event as any)?.reason || '';
      if (event.code === 4001 || event.code === 4401 || /auth|token|unauth|expired/i.test(String(reason))) {
        
        this.scheduleReconnect(0);
        return;
      }
      this.scheduleReconnect();
    }
  }

  private handleError(_error: Event): void {
    this.isConnected = false;
    this.isConnecting = false;
  }

  private scheduleReconnect(forcedDelay?: number): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts++;
    const base = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    const jitter = base * (0.2 * (Math.random() - 0.5) * 2);
    const delay = typeof forcedDelay === 'number' ? forcedDelay : Math.max(250, base + jitter);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect && !this.offline) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const now = Date.now();

        if (now - this.lastServerActivity > 60000) {
          try { this.ws.close(); } catch {}
          return;
        }
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private notifyConnectionStatus(connected: boolean): void {
    
    requestAnimationFrame(() => {
      this.connectionCallbacks.forEach(callback => {
        try {
          callback(connected);
        } catch (error) {
        }
      });
    });
  }


  private handleConversationList(conversations: Conversation[]): void {
    const normalized = Array.isArray(conversations) ? [...conversations] : [];
    this.updateConversationState(normalized);

    const snapshot = normalized.slice();


    requestAnimationFrame(() => {
      this.conversationCallbacks.forEach(callback => {
        try {
          callback(snapshot);
        } catch (error) {
        }
      });
    });
  }

  private handleConversationUpdate(conversation: Conversation): void {
    const conversationId = (conversation as any)?._id || (conversation as any)?.id || (conversation as any)?.conversationId;

    if (!conversationId) {
      this.requestConversationList();
      return;
    }

    const normalizedConversation: Conversation = {
      ...(conversation as Conversation),
      _id: conversationId
    };

    const isDeleted = (normalizedConversation as any)?.deleted === true
      || (normalizedConversation as any)?.isDeleted === true
      || (normalizedConversation as any)?.status === 'deleted';

    if (isDeleted) {
      this.handleConversationDeleted({
        conversationId,
        reason: (normalizedConversation as any)?.deletedReason || (normalizedConversation as any)?.reason
      });
      return;
    }

    const existingIndex = this.currentConversations.findIndex(c => c._id === conversationId);
    let updatedConversations: Conversation[];

    if (existingIndex >= 0) {
      const existing = this.currentConversations[existingIndex];
      const merged: Conversation = {
        ...existing,
        ...normalizedConversation,
        metadata: normalizedConversation.metadata ?? existing.metadata,
        client: normalizedConversation.client ?? existing.client,
        booster: normalizedConversation.booster ?? existing.booster,
        lastMessage: normalizedConversation.lastMessage ?? existing.lastMessage
      };

      updatedConversations = [...this.currentConversations];
      updatedConversations[existingIndex] = merged;
    } else {
      updatedConversations = [normalizedConversation, ...this.currentConversations];
    }

    this.updateConversationState(updatedConversations);

    const snapshot = updatedConversations.slice();

    requestAnimationFrame(() => {
      this.conversationCallbacks.forEach(callback => {
        try {
          callback(snapshot);
        } catch (error) {
        }
      });
    });

    this.requestConversationList();
  }

  private handleConversationDeleted(data: { conversationId?: string; _id?: string; reason?: string }): void {
    const conversationId = data?.conversationId || data?._id;

    if (!conversationId) {
      this.requestConversationList();
      return;
    }

    const updatedConversations = this.currentConversations.filter(conversation => conversation._id !== conversationId);

    this.updateConversationState(updatedConversations);

    const snapshot = updatedConversations.slice();

    requestAnimationFrame(() => {
      this.conversationCallbacks.forEach(callback => {
        try {
          callback(snapshot);
        } catch (error) {
        }
      });
    });

    this.messageCallbacks.delete(conversationId);

    try {
      window.dispatchEvent(new CustomEvent('conversation:deleted', {
        detail: {
          conversationId,
          reason: data?.reason || 'deleted'
        }
      }));
    } catch (error) {
    }

    this.requestConversationList();
  }

  private handleNewConversation(data: any): void {

    
    // ✅ Se veio com dados completos, adicionar diretamente
    if (data.conversation) {
      const newConversation = data.conversation;
      const conversationId = newConversation._id;
      
      // ✅ IMPORTANTE: Verificar se já existe antes de adicionar
      const exists = this.currentConversations.some(c => c._id === conversationId);
      
      if (exists) {

        const updatedConversations = this.currentConversations.map(c => {
          if (c._id !== conversationId) return c;
          return {
            ...c,
            ...newConversation,
            metadata: newConversation.metadata ?? c.metadata,
            client: newConversation.client ?? c.client,
            booster: newConversation.booster ?? c.booster,
            lastMessage: newConversation.lastMessage ?? c.lastMessage
          } as Conversation;
        });

        this.updateConversationState(updatedConversations);

        const snapshot = updatedConversations.slice();

        this.conversationCallbacks.forEach(callback => {
          try {
            callback(snapshot);
          } catch (error) {
          }
        });
        
        return;  // Não sincronizar se apenas atualizou
      }
      
      // Adicionar à lista atual (nova conversa)
      const updatedConversations = [newConversation, ...this.currentConversations];
      this.updateConversationState(updatedConversations);

      const snapshot = updatedConversations.slice();
      
      // Notificar callbacks
      this.conversationCallbacks.forEach(callback => {
        try {
          callback(snapshot);
        } catch (error) {
        }
      });
      
    }
    
    // ✅ Sincronizar com backend apenas para novas conversas
    setTimeout(() => this.requestConversationList(), 500);
  }

  private handleNewMessage(data: { conversationId: string; message: Message }): void {
    
    requestAnimationFrame(() => {
      const callbacks = this.messageCallbacks.get(data.conversationId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(data.conversationId, [data.message]);
          } catch (error) {
          }
        });
      }
      
      
      setTimeout(() => this.requestConversationList(), 0);
    });
  }

  private handleMessageHistory(data: { conversationId: string; messages: Message[] }): void {
    

    const callbacks = this.messageCallbacks.get(data.conversationId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data.conversationId, data.messages);
        } catch (error) {
        }
      });
    }
    

    const historyCallbacks = this.messageCallbacks.get('__message_history__');
    if (historyCallbacks) {
      historyCallbacks.forEach(callback => {
        try {
          callback(data.conversationId, data.messages);
        } catch (error) {
        }
      });
    }
  }

  private handleProposalAccepted(data: any): void {
    
    requestAnimationFrame(() => {
      if (this.currentConversations.length > 0) {
        const updatedConversations = this.currentConversations.map((conv: Conversation) => {
          if (conv._id === data.conversationId) {
            return {
              ...conv,
              status: 'accepted',
              isTemporary: false,
              acceptedProposal: data.acceptedProposal || {
                boosterId: data.boosterId,
                proposedPrice: data.proposedPrice,
                estimatedTime: data.estimatedTime,
                acceptedAt: data.acceptedAt || new Date().toISOString()
              }
            };
          }
          return conv;
        });
        
        this.currentConversations = updatedConversations;
        
        this.conversationCallbacks.forEach(callback => {
          try {
            callback(updatedConversations);
          } catch (error) {
          }
        });
      }
    });
  }


  getWebSocket(): WebSocket | null {
    return this.ws;
  }


  requestConversationList(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'conversation:list',
        timestamp: new Date().toISOString()
      }));
    }
  }

  requestMessageHistory(conversationId: string, limit = 50): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message:history',
        data: { conversationId, limit },
        timestamp: new Date().toISOString()
      }));
    }
  }

  sendMessage(conversationId: string, content: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message:send',
        data: { conversationId, content },
        timestamp: new Date().toISOString()
      }));
    }
  }


  onConversationUpdate(callback: ConversationUpdateCallback): () => void {
    this.conversationCallbacks.add(callback);
    

    if (this.isConnected) {
      this.requestConversationList();
    }
    
    return () => {
      this.conversationCallbacks.delete(callback);
    };
  }

  onMessageUpdate(conversationId: string, callback: MessageUpdateCallback): () => void {
    if (!this.messageCallbacks.has(conversationId)) {
      this.messageCallbacks.set(conversationId, new Set());
    }
    
    this.messageCallbacks.get(conversationId)!.add(callback);
    

    if (this.isConnected) {
      this.requestMessageHistory(conversationId);
    }
    
    return () => {
      const callbacks = this.messageCallbacks.get(conversationId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.messageCallbacks.delete(conversationId);
        }
      }
    };
  }

  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionCallbacks.add(callback);
    

    callback(this.isConnected);
    
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  onMessageHistory(callback: (messages: Message[]) => void): () => void {
    const wrappedCallback: MessageUpdateCallback = (_conversationId: string, messages: Message[]) => {
      callback(messages);
    };
    

    const tempId = '__message_history__';
    if (!this.messageCallbacks.has(tempId)) {
      this.messageCallbacks.set(tempId, new Set());
    }
    
    this.messageCallbacks.get(tempId)!.add(wrappedCallback);
    
    return () => {
      const callbacks = this.messageCallbacks.get(tempId);
      if (callbacks) {
        callbacks.delete(wrappedCallback);
        if (callbacks.size === 0) {
          this.messageCallbacks.delete(tempId);
        }
      }
    };
  }


  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.isConnected = false;
    this.isConnecting = false;
    if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }


  reconnect(): void {
    this.disconnect();
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 1000);
  }

  private getLatestToken(): string | null {
    try {
      return localStorage.getItem('token') || localStorage.getItem('authToken');
    } catch { return null; }
  }

  forceReconnect(): void {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    try { this.ws?.close(); } catch {}
    this.scheduleReconnect(0);
  }
}


export default new RealtimeMessageService();
