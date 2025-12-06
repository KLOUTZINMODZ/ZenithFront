/**
 * Tipos e Interfaces WebSocket
 * 
 * Define todos os tipos de eventos, payloads e estados relacionados
 * ao sistema de comunicação em tempo real.
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export type WebSocketEventType =
  // Mensagens
  | 'message:new'
  | 'message:sent'
  | 'message:delivered'
  | 'message:read'
  | 'message:typing'
  | 'message:history'
  | 'message:offline_recovery'
  | 'message:pending'
  | 'message:delivery_failed'
  | 'message:delivery_status'
  // Conversas
  | 'conversation:list'
  | 'conversation:updated'
  | 'conversations:update'
  | 'conversation:opened'
  | 'conversation:closed'
  // Presença
  | 'presence:online'
  | 'presence:offline'
  | 'presence:status'
  | 'presence:bulk_update'
  // Marketplace
  | 'purchase:status_changed'
  | 'purchase:shipped'
  | 'purchase:delivered'
  | 'purchase:confirmed'
  | 'purchase:support_ticket'
  // Boosting
  | 'service:cancelled'
  | 'proposal:cancelled'
  | 'boosting:proposal-accepted'
  | 'boosting:cancelled'
  | 'boosting:broken'
  // Wallet
  | 'wallet:balance_updated'
  | 'wallet:escrow_updated'
  // Sistema
  | 'connection'
  | 'pong'
  | 'error';

export interface BaseWebSocketEvent<T = any> {
  type: WebSocketEventType;
  data?: T;
  timestamp: string;
  error?: string;
}

// ============================================================================
// MESSAGE EVENTS
// ============================================================================

export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'system';
  createdAt: string;
  updatedAt?: string;
  readBy?: string[];
  deliveredTo?: string[];
  metadata?: Record<string, any>;
  tempId?: string;
}

export interface MessageNewEvent extends BaseWebSocketEvent {
  type: 'message:new';
  data: {
    message: Message;
    conversationId: string;
  };
}

export interface MessageSentEvent extends BaseWebSocketEvent {
  type: 'message:sent';
  data: {
    message: Message;
    tempId?: string;
    conversationId: string;
  };
}

export interface MessageTypingEvent extends BaseWebSocketEvent {
  type: 'message:typing';
  data: {
    userId: string;
    conversationId: string;
    isTyping: boolean;
  };
}

export interface MessageDeliveredEvent extends BaseWebSocketEvent {
  type: 'message:delivered';
  data: {
    messageId: string;
    recipientId: string;
    deliveredAt: string;
  };
}

export interface MessageReadEvent extends BaseWebSocketEvent {
  type: 'message:read';
  data: {
    messageIds: string[];
    conversationId: string;
    userId: string;
    readAt: string;
  };
}

// ============================================================================
// CONVERSATION EVENTS
// ============================================================================

export interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
  }>;
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount?: number;
  isTemporary?: boolean;
  status?: 'temporary' | 'accepted' | 'cancelled' | 'blocked';
  boostingStatus?: 'pending' | 'active' | 'completed' | 'cancelled';
  isActive?: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
  type?: 'marketplace' | 'boosting' | 'support';
  metadata?: Map<string, any> | Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationUpdatedEvent extends BaseWebSocketEvent {
  type: 'conversation:updated';
  data: {
    _id: string;
    conversationId?: string;
    status?: string;
    boostingStatus?: string;
    isActive?: boolean;
    isBlocked?: boolean;
    blockedReason?: string;
    updatedAt: string;
    [key: string]: any;
  };
}

export interface ConversationsUpdateEvent extends BaseWebSocketEvent {
  type: 'conversations:update';
  data: {
    conversations: Conversation[];
    timestamp: string;
    hasUpdates: boolean;
  };
}

export interface ConversationListEvent extends BaseWebSocketEvent {
  type: 'conversation:list';
  data: Conversation[];
}

// ============================================================================
// PRESENCE EVENTS
// ============================================================================

export interface PresenceStatus {
  online: boolean;
  lastSeen?: string;
  lastActiveAt?: string;
}

export interface PresenceOnlineEvent extends BaseWebSocketEvent {
  type: 'presence:online';
  data: {
    userId: string;
    onlineSince?: string;
  };
}

export interface PresenceOfflineEvent extends BaseWebSocketEvent {
  type: 'presence:offline';
  data: {
    userId: string;
    lastSeen: string;
  };
}

export interface PresenceBulkUpdateEvent extends BaseWebSocketEvent {
  type: 'presence:bulk_update';
  data: {
    [userId: string]: PresenceStatus;
  };
}

// ============================================================================
// MARKETPLACE EVENTS
// ============================================================================

export type MarketplacePurchaseStatus =
  | 'initiated'
  | 'escrow_reserved'
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'confirmed'
  | 'cancelled';

export type MarketplaceOrderKind = 'marketplace' | 'boosting';

export interface PurchaseStatusChangedEvent extends BaseWebSocketEvent {
  type: 'purchase:status_changed';
  data: {
    conversationId: string;
    purchaseId?: string;
    orderNumber?: string;
    boostingOrderId?: string;
    status: MarketplacePurchaseStatus;
    type?: MarketplaceOrderKind;
    buyerId?: string;
    sellerId?: string;
    price?: number;
    currency?: string;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    autoReleaseAt?: string | null;
    [key: string]: any;
  };
}

export interface PurchaseSupportTicketEvent extends BaseWebSocketEvent {
  type: 'purchase:support_ticket';
  data: {
    conversationId: string;
    purchaseId: string;
    ticketId: string;
    status: string;
  };
}

// ============================================================================
// BOOSTING EVENTS
// ============================================================================

export interface ServiceCancelledEvent extends BaseWebSocketEvent {
  type: 'service:cancelled';
  data: {
    conversationId: string;
    reason: string;
    cancelledBy: string;
    boostingStatus: 'cancelled';
    isActive: false;
    deletedForClient?: string | null;
    timestamp: string;
  };
}

export interface BoostingProposalAcceptedEvent extends BaseWebSocketEvent {
  type: 'boosting:proposal-accepted';
  data: {
    conversationId: string;
    proposalId: string;
    boostingId?: string;
    acceptedProposal: any;
    proposalData: {
      status: 'accepted';
      boosterId: string;
      clientId: string;
    };
    clientData: {
      userid: string;
      name: string;
      avatar?: string;
    };
    boosterData: {
      userid: string;
      name: string;
      avatar?: string;
    };
    timestamp: string;
  };
}

export interface BoostingCancelledEvent extends BaseWebSocketEvent {
  type: 'boosting:cancelled';
  data: {
    boostingId: string;
    conversationId: string;
    message: string;
    reason: string;
    timestamp: string;
  };
}

export interface BoostingBrokenEvent extends BaseWebSocketEvent {
  type: 'boosting:broken';
  data: {
    boostingId: string;
    conversationId?: string;
    reason?: string;
    requestedBy?: string;
    timestamp?: string;
  };
}

// ============================================================================
// WALLET EVENTS
// ============================================================================

export interface WalletBalanceUpdatedEvent extends BaseWebSocketEvent {
  type: 'wallet:balance_updated';
  data: {
    userId: string;
    balance: number;
    escrowBalance?: number;
    timestamp: string;
  };
}

export interface WalletEscrowUpdatedEvent extends BaseWebSocketEvent {
  type: 'wallet:escrow_updated';
  data: {
    userId: string;
    escrowBalance: number;
    balance?: number;
    timestamp: string;
  };
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type WebSocketEvent =
  | MessageNewEvent
  | MessageSentEvent
  | MessageTypingEvent
  | MessageDeliveredEvent
  | MessageReadEvent
  | ConversationUpdatedEvent
  | ConversationsUpdateEvent
  | ConversationListEvent
  | PresenceOnlineEvent
  | PresenceOfflineEvent
  | PresenceBulkUpdateEvent
  | PurchaseStatusChangedEvent
  | PurchaseSupportTicketEvent
  | ServiceCancelledEvent
  | BoostingProposalAcceptedEvent
  | WalletBalanceUpdatedEvent
  | WalletEscrowUpdatedEvent
  | BaseWebSocketEvent;

// ============================================================================
// EVENT HANDLER TYPES
// ============================================================================

export type WebSocketEventHandler<T extends WebSocketEvent = WebSocketEvent> = (
  event: T
) => void | Promise<void>;

export type WebSocketEventHandlers = {
  [K in WebSocketEventType]?: WebSocketEventHandler<Extract<WebSocketEvent, { type: K }>>;
};

// ============================================================================
// STATE TYPES
// ============================================================================

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
  lastActivity?: string;
}

export interface ChatState {
  conversations: Conversation[];
  messages: Map<string, Message[]>;
  activeConversation: string | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface WebSocketListenerConfig {
  /** Se deve reconectar automaticamente */
  autoReconnect?: boolean;
  /** Intervalo entre reconexões (ms) */
  reconnectInterval?: number;
  /** Máximo de tentativas de reconexão */
  maxReconnectAttempts?: number;
  /** Se deve logar eventos no console */
  debug?: boolean;
  /** Se deve usar debounce para eventos batched */
  useBatching?: boolean;
  /** Tempo de debounce (ms) */
  debounceTime?: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

export interface DataValidator<T = any> {
  validate: (data: unknown) => ValidationResult<T>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class WebSocketEventError extends Error {
  constructor(
    message: string,
    public eventType: WebSocketEventType,
    public originalError?: Error,
    public data?: any
  ) {
    super(message);
    this.name = 'WebSocketEventError';
  }
}

export class DataValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public receivedValue?: any
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}
