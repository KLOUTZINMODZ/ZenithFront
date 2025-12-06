


export interface NormalizedMessage {
  _id: string;
  tempId?: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
  } | string;
  content: string;
  type: string;
  status?: 'sending' | 'sent' | 'failed';
  attachments?: any[];
  readBy?: Array<{ user: string; readAt: string }>;
  createdAt: string;
  updatedAt?: string;
  isTemporary?: boolean;
  metadata?: any;
}


export function normalizeMessage(rawMessage: any): NormalizedMessage | null {
  if (!rawMessage) return null;


  const message = rawMessage?.data?.message || rawMessage?.message || rawMessage;


  if (!message.content && !message.attachments?.length) {
        return null;
  }


  let sender = message.sender;
  if (typeof sender === 'string') {
    sender = { _id: sender, name: 'Unknown' };
  } else if (sender && typeof sender === 'object') {
    sender = {
      _id: sender._id || sender.id,
      name: sender.name || 'Unknown',
      email: sender.email,
      avatar: sender.avatar
    };
  }


  const normalized: NormalizedMessage = {
    _id: message._id || message.id || `temp_${Date.now()}_${Math.random()}`,
    tempId: message.tempId,
    conversation: message.conversation || message.conversationId,
    sender: sender || { _id: 'unknown', name: 'Unknown' },
    content: message.content || '',
    type: message.type || 'text',
    status: message.status,
    attachments: message.attachments || [],
    readBy: message.readBy || [],
    createdAt: message.createdAt || new Date().toISOString(),
    updatedAt: message.updatedAt,
    isTemporary: message.isTemporary || false,
    metadata: message.metadata
  };

  return normalized;
}


export function normalizeMessages(messages: any[]): NormalizedMessage[] {
  if (!Array.isArray(messages)) return [];
  
  return messages
    .map(msg => normalizeMessage(msg))
    .filter((msg): msg is NormalizedMessage => msg !== null);
}


export function isDuplicateMessage(msg1: any, msg2: any): boolean {
  const norm1 = normalizeMessage(msg1);
  const norm2 = normalizeMessage(msg2);
  
  if (!norm1 || !norm2) return false;
  

  if (norm1._id && norm2._id && norm1._id === norm2._id) {
    return true;
  }
  

  if (norm1.tempId && norm2.tempId && norm1.tempId === norm2.tempId) {
    return true;
  }
  

  const sender1 = typeof norm1.sender === 'string' ? norm1.sender : norm1.sender._id;
  const sender2 = typeof norm2.sender === 'string' ? norm2.sender : norm2.sender._id;
  
  if (norm1.content === norm2.content && sender1 === sender2) {
    const time1 = new Date(norm1.createdAt).getTime();
    const time2 = new Date(norm2.createdAt).getTime();
    
    if (Math.abs(time1 - time2) < 10000) {
      return true;
    }
  }
  
  return false;
}


export function mergeMessages(existing: any[], incoming: any[]): NormalizedMessage[] {
  const normalized = normalizeMessages([...existing, ...incoming]);
  const unique: NormalizedMessage[] = [];
  const seen = new Set<string>();
  
  for (const msg of normalized) {
    const key = msg._id || msg.tempId || `${msg.content}_${msg.createdAt}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(msg);
    }
  }
  

  unique.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB;
  });
  
  return unique;
}
