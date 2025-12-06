/**
 * Validadores de Dados WebSocket
 * 
 * Valida e sanitiza dados recebidos via WebSocket para garantir
 * tipagem correta e prevenir erros em runtime.
 */

import {
  WebSocketEvent,
  WebSocketEventType,
  ValidationResult,
  DataValidator,
  DataValidationError,
  Message,
  Conversation,
  ConversationUpdatedEvent,
  ServiceCancelledEvent,
  WalletBalanceUpdatedEvent,
  PurchaseStatusChangedEvent,
  PresenceOnlineEvent,
  PresenceOfflineEvent,
  MessageNewEvent,
  MarketplacePurchaseStatus
} from '../types/websocket.types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isObject = (value: unknown): value is Record<string, any> => 
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isArray = (value: unknown): value is any[] => Array.isArray(value);

const createError = (field: string, expected: string, received: any): string => {
  return `Campo '${field}' inválido. Esperado: ${expected}, Recebido: ${typeof received}`;
};

// ============================================================================
// BASE VALIDATORS
// ============================================================================

/**
 * Valida estrutura base de evento WebSocket
 */
export const validateBaseEvent = (data: unknown): ValidationResult<WebSocketEvent> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Evento WebSocket deve ser um objeto'] };
  }

  const event = data as any;

  // Validar type
  if (!isString(event.type) || !event.type) {
    errors.push(createError('type', 'string', event.type));
  }

  // Validar timestamp
  if (!isString(event.timestamp) || !event.timestamp) {
    errors.push(createError('timestamp', 'string (ISO date)', event.timestamp));
  }

  // data é opcional, mas se existir deve ser objeto
  if (event.data !== undefined && event.data !== null && !isObject(event.data)) {
    errors.push(createError('data', 'object', event.data));
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? (event as WebSocketEvent) : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// MESSAGE VALIDATORS
// ============================================================================

/**
 * Valida mensagem individual
 */
export const validateMessage = (data: unknown): ValidationResult<Message> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Mensagem deve ser um objeto'] };
  }

  const msg = data as any;

  // Campos obrigatórios
  if (!isString(msg._id) || !msg._id) errors.push(createError('_id', 'string', msg._id));
  if (!isString(msg.conversation)) errors.push(createError('conversation', 'string', msg.conversation));
  if (!isString(msg.sender)) errors.push(createError('sender', 'string', msg.sender));
  if (!isString(msg.content)) errors.push(createError('content', 'string', msg.content));
  if (!isString(msg.createdAt)) errors.push(createError('createdAt', 'string', msg.createdAt));

  // type deve ser um dos valores permitidos
  if (msg.type && !['text', 'image', 'system'].includes(msg.type)) {
    errors.push(`Campo 'type' deve ser 'text', 'image' ou 'system'. Recebido: ${msg.type}`);
  }

  // Arrays opcionais
  if (msg.readBy && !isArray(msg.readBy)) errors.push(createError('readBy', 'array', msg.readBy));
  if (msg.deliveredTo && !isArray(msg.deliveredTo)) errors.push(createError('deliveredTo', 'array', msg.deliveredTo));

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? (msg as Message) : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Valida evento message:new
 */
export const validateMessageNewEvent = (data: unknown): ValidationResult<MessageNewEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de message:new deve ser um objeto'] };
  }

  const eventData = data as any;

  // Validar message
  const messageValidation = validateMessage(eventData.message);
  if (!messageValidation.valid) {
    errors.push(...(messageValidation.errors || []));
  }

  // Validar conversationId
  if (!isString(eventData.conversationId) || !eventData.conversationId) {
    errors.push(createError('conversationId', 'string', eventData.conversationId));
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// CONVERSATION VALIDATORS
// ============================================================================

/**
 * Valida conversa individual
 */
export const validateConversation = (data: unknown): ValidationResult<Conversation> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Conversa deve ser um objeto'] };
  }

  const conv = data as any;

  // Campos obrigatórios
  if (!isString(conv._id) || !conv._id) errors.push(createError('_id', 'string', conv._id));
  if (!isArray(conv.participants)) errors.push(createError('participants', 'array', conv.participants));
  if (!isString(conv.createdAt)) errors.push(createError('createdAt', 'string', conv.createdAt));
  if (!isString(conv.updatedAt)) errors.push(createError('updatedAt', 'string', conv.updatedAt));

  // Validar participants
  if (isArray(conv.participants)) {
    conv.participants.forEach((p: any, i: number) => {
      if (!isObject(p)) {
        errors.push(`Participant[${i}] deve ser um objeto`);
      } else if (!isString(p._id)) {
        errors.push(`Participant[${i}]._id deve ser uma string`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? (conv as Conversation) : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Valida evento conversation:updated
 */
export const validateConversationUpdatedEvent = (
  data: unknown
): ValidationResult<ConversationUpdatedEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de conversation:updated deve ser um objeto'] };
  }

  const eventData = data as any;

  // conversationId ou _id é obrigatório
  if (!isString(eventData.conversationId) && !isString(eventData._id)) {
    errors.push('Deve conter conversationId ou _id');
  }

  // updatedAt é obrigatório
  if (!isString(eventData.updatedAt)) {
    errors.push(createError('updatedAt', 'string', eventData.updatedAt));
  }

  // Campos opcionais mas tipados
  if (eventData.status && !isString(eventData.status)) {
    errors.push(createError('status', 'string', eventData.status));
  }
  if (eventData.boostingStatus && !isString(eventData.boostingStatus)) {
    errors.push(createError('boostingStatus', 'string', eventData.boostingStatus));
  }
  if (eventData.isActive !== undefined && !isBoolean(eventData.isActive)) {
    errors.push(createError('isActive', 'boolean', eventData.isActive));
  }
  if (eventData.isBlocked !== undefined && !isBoolean(eventData.isBlocked)) {
    errors.push(createError('isBlocked', 'boolean', eventData.isBlocked));
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// BOOSTING VALIDATORS
// ============================================================================

/**
 * Valida evento service:cancelled
 */
export const validateServiceCancelledEvent = (
  data: unknown
): ValidationResult<ServiceCancelledEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de service:cancelled deve ser um objeto'] };
  }

  const eventData = data as any;

  // Campos obrigatórios
  if (!isString(eventData.conversationId)) {
    errors.push(createError('conversationId', 'string', eventData.conversationId));
  }
  if (!isString(eventData.cancelledBy)) {
    errors.push(createError('cancelledBy', 'string', eventData.cancelledBy));
  }
  if (!isString(eventData.timestamp)) {
    errors.push(createError('timestamp', 'string', eventData.timestamp));
  }

  // boostingStatus deve ser 'cancelled'
  if (eventData.boostingStatus !== 'cancelled') {
    errors.push(`boostingStatus deve ser 'cancelled', recebido: ${eventData.boostingStatus}`);
  }

  // isActive deve ser false
  if (eventData.isActive !== false) {
    errors.push(`isActive deve ser false, recebido: ${eventData.isActive}`);
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// WALLET VALIDATORS
// ============================================================================

/**
 * Valida evento wallet:balance_updated
 */
export const validateWalletBalanceUpdatedEvent = (
  data: unknown
): ValidationResult<WalletBalanceUpdatedEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de wallet:balance_updated deve ser um objeto'] };
  }

  const eventData = data as any;

  // Campos obrigatórios
  if (!isString(eventData.userId)) {
    errors.push(createError('userId', 'string', eventData.userId));
  }
  if (!isNumber(eventData.balance)) {
    errors.push(createError('balance', 'number', eventData.balance));
  }
  if (!isString(eventData.timestamp)) {
    errors.push(createError('timestamp', 'string', eventData.timestamp));
  }

  // escrowBalance é opcional mas deve ser number
  if (eventData.escrowBalance !== undefined && !isNumber(eventData.escrowBalance)) {
    errors.push(createError('escrowBalance', 'number', eventData.escrowBalance));
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// MARKETPLACE VALIDATORS
// ============================================================================

/**
 * Valida evento purchase:status_changed
 */
export const validatePurchaseStatusChangedEvent = (
  data: unknown
): ValidationResult<PurchaseStatusChangedEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de purchase:status_changed deve ser um objeto'] };
  }

  const eventData = data as any;

  // Campos obrigatórios
  if (!isString(eventData.conversationId)) {
    errors.push(createError('conversationId', 'string', eventData.conversationId));
  }
  if (!isString(eventData.purchaseId)) {
    errors.push(createError('purchaseId', 'string', eventData.purchaseId));
  }
  if (!isString(eventData.buyerId)) {
    errors.push(createError('buyerId', 'string', eventData.buyerId));
  }
  if (!isString(eventData.sellerId)) {
    errors.push(createError('sellerId', 'string', eventData.sellerId));
  }

  // Status deve ser um dos valores permitidos
  const validStatuses: MarketplacePurchaseStatus[] = [
    'initiated',
    'escrow_reserved',
    'pending',
    'paid',
    'shipped',
    'delivered',
    'completed',
    'confirmed',
    'cancelled'
  ];
  if (!validStatuses.includes(eventData.status as MarketplacePurchaseStatus)) {
    errors.push(`status deve ser um de: ${validStatuses.join(', ')}. Recebido: ${eventData.status}`);
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// PRESENCE VALIDATORS
// ============================================================================

/**
 * Valida evento presence:online
 */
export const validatePresenceOnlineEvent = (
  data: unknown
): ValidationResult<PresenceOnlineEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de presence:online deve ser um objeto'] };
  }

  const eventData = data as any;

  if (!isString(eventData.userId)) {
    errors.push(createError('userId', 'string', eventData.userId));
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Valida evento presence:offline
 */
export const validatePresenceOfflineEvent = (
  data: unknown
): ValidationResult<PresenceOfflineEvent['data']> => {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Data de presence:offline deve ser um objeto'] };
  }

  const eventData = data as any;

  if (!isString(eventData.userId)) {
    errors.push(createError('userId', 'string', eventData.userId));
  }
  if (!isString(eventData.lastSeen)) {
    errors.push(createError('lastSeen', 'string', eventData.lastSeen));
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? eventData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};

// ============================================================================
// MAIN VALIDATOR FACTORY
// ============================================================================

/**
 * Factory para criar validadores específicos por tipo de evento
 */
export const createEventValidator = (eventType: WebSocketEventType): DataValidator => {
  const validators: Partial<Record<WebSocketEventType, (data: unknown) => ValidationResult>> = {
    'message:new': validateMessageNewEvent,
    'conversation:updated': validateConversationUpdatedEvent,
    'service:cancelled': validateServiceCancelledEvent,
    'wallet:balance_updated': validateWalletBalanceUpdatedEvent,
    'purchase:status_changed': validatePurchaseStatusChangedEvent,
    'presence:online': validatePresenceOnlineEvent,
    'presence:offline': validatePresenceOfflineEvent,
  };

  const validator = validators[eventType];

  return {
    validate: (data: unknown) => {
      if (!validator) {
        // Se não tem validador específico, apenas valida estrutura base
        return { valid: true, data };
      }
      return validator(data);
    }
  };
};

// ============================================================================
// SANITIZERS
// ============================================================================

/**
 * Sanitiza dados removendo campos não esperados e normalizando valores
 */
export const sanitizeEventData = <T extends Record<string, any>>(
  data: T,
  allowedFields: string[]
): Partial<T> => {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data) {
      sanitized[field as keyof T] = data[field];
    }
  }
  
  return sanitized;
};

/**
 * Normaliza conversationId (aceita conversationId ou _id)
 */
export const normalizeConversationId = (data: { conversationId?: string; _id?: string }): string => {
  return data.conversationId || data._id || '';
};

/**
 * Safe parse de JSON
 */
export const safeJSONParse = <T = any>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};
