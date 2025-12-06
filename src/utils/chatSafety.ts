


export interface SafeConversation {
  _id: string;
  participants: any[];
  lastMessage?: SafeMessage;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  name?: string;

  isTemporary?: boolean;
  expiresAt?: string;
  status?: 'pending' | 'accepted' | 'expired' | 'active';

  client?: {
    userid: string;
    name: string;
    email?: string;
    avatar?: string;
    isVerified?: boolean;
    totalOrders?: number;
    rating?: number;
    registeredAt?: string;
  };
  booster?: {
    userid: string;
    name: string;
    email?: string;
    avatar?: string;
    isVerified?: boolean;
    rating?: number;
    totalBoosts?: number;
    completedBoosts?: number;
    specializations?: string[];
    registeredAt?: string;
  };
  metadata?: Map<string, any>;
}

export interface SafeMessage {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  content: string;
  type: string;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
  tempId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isTemporary?: boolean;
  retryCount?: number;
}


export const isValidConversation = (conv: any): conv is SafeConversation => {
  if (!conv || typeof conv !== 'object') {
    return false;
  }
  
  if (!conv._id || typeof conv._id !== 'string' || conv._id.trim().length === 0) {
    return false;
  }
  
  return true;
};


export const isValidMessage = (msg: any): msg is SafeMessage => {
  if (!msg || typeof msg !== 'object') {
    return false;
  }
  
  if (!msg._id && !msg.tempId) {
    return false;
  }
  
  if (msg._id && (typeof msg._id !== 'string' || msg._id.trim().length === 0)) {
    return false;
  }
  
  return true;
};


export const sanitizeConversations = (conversations: any[]): SafeConversation[] => {
  if (!Array.isArray(conversations)) {
    return [];
  }
  
  const validConversations = conversations
    .filter(isValidConversation)
    .map(conv => ({
      ...conv,
      lastMessageAt: conv.lastMessageAt || new Date().toISOString(),
      unreadCount: conv.unreadCount || 0,
      participants: conv.participants || []
    }));
    
  return validConversations;
};


export const sanitizeMessages = (messages: any[]): SafeMessage[] => {
  if (!Array.isArray(messages)) {
    return [];
  }
  
  const validMessages = messages
    .filter(isValidMessage)
    .map(msg => ({
      ...msg,
      type: msg.type || 'message',
      status: msg.status || 'delivered',
      sender: msg.sender || { _id: 'unknown', name: 'Usuário Desconhecido' },
      readBy: msg.readBy || [],
      deliveredTo: msg.deliveredTo || []
    }));
    
  return validMessages;
};


export const findConversationSafely = (
  conversations: SafeConversation[], 
  conversationId: string | null
): SafeConversation | undefined => {
  if (!conversationId || !Array.isArray(conversations)) {
    return undefined;
  }
  
  return conversations.find(c => 
    c && 
    c._id && 
    typeof c._id === 'string' && 
    c._id === conversationId
  );
};


export const isValidSender = (sender: any): boolean => {
  return sender && 
         typeof sender === 'object' && 
         sender._id && 
         typeof sender._id === 'string' && 
         sender._id.trim().length > 0;
};


export const getSenderIdSafely = (message: any): string | null => {
  if (!message || !message.sender) {
    return null;
  }
  
  if (typeof message.sender === 'string') {
    return message.sender;
  }
  
  if (message.sender._id && typeof message.sender._id === 'string') {
    return message.sender._id;
  }
  
  return null;
};


export const safeMap = <T, R>(
  array: T[] | undefined | null,
  mapFn: (item: T, index: number) => R,
  filterFn?: (item: T) => boolean
): R[] => {
  if (!Array.isArray(array)) {
    return [];
  }
  
  let filteredArray = array;
  if (filterFn) {
    filteredArray = array.filter(filterFn);
  }
  
  return filteredArray.map(mapFn);
};


export const logIdError = (_context: string, _item: any, _error?: Error) => {

};


export const safeIncludes = (
  array: any[] | undefined | null,
  value: any
): boolean => {
  if (!Array.isArray(array)) {
    return false;
  }
  return array.includes(value);
};


export const safeStringIncludes = (
  str: string | undefined | null,
  searchString: string
): boolean => {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return str.includes(searchString);
};
