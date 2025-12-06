import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import websocketService from '../services/websocketService';
import pollingService from '../services/pollingService';
import { localStorageService } from '../services/localStorageService';
import messageStorageManager from '../services/messageStorageManager';
import { smartCacheService } from '../services/smartCacheService';
import { optimizedMessageLoader } from '../services/optimizedMessageLoader';
import LastMessageLocalStorage from '../services/lastMessageLocalStorage';
import imageUploadService from '../services/imageUploadService';
import purchaseService from '../services/purchaseService';
import userService from '../services/userService';
import chatCacheService from '../services/chatCacheService';


interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  content: string;
  type: string;
  attachments?: Array<{ url: string; thumbUrl?: string; name?: string; size?: number; mimeType?: string }>;
  createdAt: string;
  readBy: Array<string | { user: string; readAt: string }>; 
  deliveredTo: string[];

  tempId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isTemporary?: boolean;
  retryCount?: number;
}

interface Conversation {
  _id: string;
  participants: any[];
  lastMessage?: Message;
  lastMessageAt: string;
  updatedAt?: string;
  unreadCount: number;
  isOnline?: boolean;
  name?: string;
  isReported?: boolean;
  reportedAt?: string;
  reportedBy?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  isActive?: boolean;

  isTemporary?: boolean;
  expiresAt?: string;
  status?: 'pending' | 'accepted' | 'expired' | 'active';
  boostingStatus?: string;
  marketplace?: any;
}

interface ChatState {
  isConnected: boolean;
  conversations: Conversation[];
  messages: Map<string, Message[]>;
  activeConversation: string | null;
  typingUsers: Map<string, string[]>;
  unreadCounts: Map<string, number>;
  connectionMode: 'websocket' | 'polling' | 'hybrid';
}

type TempStatus = Conversation['status'];

interface TemporaryInfo {
  isTemporary: boolean;
  status?: TempStatus;
  expiresAt?: string;
}


class MessageDeduplicator {
  private processedMessages = new Set<string>();
  private tempIdToRealId = new Map<string, string>();
  private recentMessages = new Map<string, number>();
  
  generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  isDuplicate(message: Message, customKey?: string): boolean {

    if (message._id && this.processedMessages.has(message._id)) {
      return true;
    }
    

    if (message.tempId && this.tempIdToRealId.has(message.tempId)) {
      return true;
    }
    

    const keySource = customKey 
      || ((message.type === 'image' && (message as any).attachments?.[0]?.url) 
          ? (message as any).attachments?.[0]?.url 
          : message.content);
    const messageKey = `${keySource}_${message.sender?._id || message.sender}`;
    if (this.recentMessages.has(messageKey)) {
      const lastTime = this.recentMessages.get(messageKey)!;
      const timeDiff = Date.now() - lastTime;
      if (timeDiff < 5000) {
        return true;
      }
    }
    
    return false;
  }
  
  markAsProcessed(message: Message, customKey?: string): void {
    if (message._id) {
      this.processedMessages.add(message._id);
    }
    
    if (message.tempId && message._id) {
      this.tempIdToRealId.set(message.tempId, message._id);
    }
    

    const keySource = customKey 
      || ((message.type === 'image' && (message as any).attachments?.[0]?.url) 
          ? (message as any).attachments?.[0]?.url 
          : message.content);
    const messageKey = `${keySource}_${message.sender?._id || message.sender}`;
    this.recentMessages.set(messageKey, Date.now());
  }
  
  replaceTempWithReal(tempId: string, realMessage: Message): boolean {
    if (this.tempIdToRealId.has(tempId)) {
      return false;
    }
    
    this.tempIdToRealId.set(tempId, realMessage._id);
    this.processedMessages.add(realMessage._id);
    return true;
  }
  
  cleanup(): void {

    if (this.processedMessages.size > 1000) {
      this.processedMessages.clear();
    }
    
    if (this.tempIdToRealId.size > 500) {
      this.tempIdToRealId.clear();
    }
    

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [messageKey, timestamp] of this.recentMessages) {
      if (timestamp < fiveMinutesAgo) {
        this.recentMessages.delete(messageKey);
      }
    }
  }
}


class ChatPersistence {
  private readonly STORAGE_PREFIX = 'unified_chat_';
  
  saveActiveConversation(conversationId: string | null): void {
    if (conversationId) {
      localStorage.setItem(`${this.STORAGE_PREFIX}active_conversation`, conversationId);
    } else {
      localStorage.removeItem(`${this.STORAGE_PREFIX}active_conversation`);
    }
  }
  
  getActiveConversation(): string | null {
    return localStorage.getItem(`${this.STORAGE_PREFIX}active_conversation`);
  }
  
  saveUserContext(userId: string): void {
    localStorage.setItem(`${this.STORAGE_PREFIX}user_id`, userId);
    localStorage.setItem(`${this.STORAGE_PREFIX}last_active`, Date.now().toString());
  }
  
  getUserContext(): { userId: string | null; lastActive: number } {
    return {
      userId: localStorage.getItem(`${this.STORAGE_PREFIX}user_id`),
      lastActive: parseInt(localStorage.getItem(`${this.STORAGE_PREFIX}last_active`) || '0')
    };
  }
  
  saveConversationState(conversations: Conversation[]): void {
    try {
      const serializable = conversations.map(conv => ({
        ...conv,
        lastMessage: conv.lastMessage ? {
          ...conv.lastMessage,

          sender: typeof conv.lastMessage.sender === 'object' 
            ? conv.lastMessage.sender 
            : { _id: conv.lastMessage.sender, name: 'Unknown', profileImage: undefined }
        } : undefined
      }));
      
      localStorage.setItem(`${this.STORAGE_PREFIX}conversations`, JSON.stringify(serializable));
    } catch (error) {

    }
  }
  
  getConversationState(): Conversation[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}conversations`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }
  
  clearAll(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.STORAGE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  }
}


class MessageRetrySystem {
  private retryQueue = new Map<string, { message: Message; attempt: number; nextRetry: number }>();
  private maxRetries = 3;
  private retryDelays = [1000, 3000, 5000];
  
  addToRetryQueue(message: Message): void {
    if (!message.tempId) return;
    
    this.retryQueue.set(message.tempId, {
      message: { ...message, status: 'failed' },
      attempt: 0,
      nextRetry: Date.now() + this.retryDelays[0]
    });
  }
  
  getRetryableMessages(): Message[] {
    const now = Date.now();
    const retryable: Message[] = [];
    
    for (const [, entry] of this.retryQueue) {
      if (now >= entry.nextRetry && entry.attempt < this.maxRetries) {
        retryable.push(entry.message);
      }
    }
    
    return retryable;
  }
  
  markRetryAttempt(tempId: string): void {
    const entry = this.retryQueue.get(tempId);
    if (!entry) return;
    
    entry.attempt++;
    if (entry.attempt < this.maxRetries) {
      entry.nextRetry = Date.now() + this.retryDelays[entry.attempt];
    }
  }
  
  removeFromRetryQueue(tempId: string): void {
    this.retryQueue.delete(tempId);
  }
  
  getFailedMessages(): Message[] {
    return Array.from(this.retryQueue.values())
      .filter(entry => entry.attempt >= this.maxRetries)
      .map(entry => ({ ...entry.message, status: 'failed' as const }));
  }
  
  clearRetryQueue(): void {
    this.retryQueue.clear();
  }
  
  getRetryQueueSize(): number {
    return this.retryQueue.size;
  }
}


export const useUnifiedChat = () => {
  const { user } = useAuth();
  const { conversations: socketConversations, loadConversations, isConnected } = useSocket();
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  

  const [state, setState] = useState<ChatState>({
    isConnected: false,
    conversations: [],
    messages: new Map(),
    activeConversation: null,
    typingUsers: new Map(),
    unreadCounts: new Map(),
    connectionMode: 'hybrid'
  });
  

  const deduplicator = useRef(new MessageDeduplicator());
  const persistence = useRef(new ChatPersistence());
  const wsDetachRef = useRef<null | (() => void)>(null);
  const retrySystem = useRef(new MessageRetrySystem());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  

  const tempIndexRef = useRef<Map<string, TemporaryInfo>>(new Map());
  

  const retryInterval = useRef<NodeJS.Timeout>();
  const cleanupInterval = useRef<NodeJS.Timeout>();
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  

  const heartbeatInterval = useRef<NodeJS.Timeout>();
  const lastHeartbeat = useRef<number>(Date.now());
  


  
  const getCurrentUserId = useCallback((): string => {
    return user?.id || (user as any)?._id || (user as any)?.userId || '';
  }, [user]);

  
  const isMarketplaceConversation = useCallback((conv: any): boolean => {
    try {
      const meta = conv?.metadata || {};
      return Boolean(meta.purchaseId) || meta.context === 'marketplace_purchase';
    } catch {
      return false;
    }
  }, []);

  
  const enrichConversations = useCallback(async (conversations: any[]): Promise<any[]> => {
    const results = await Promise.all(conversations.map(async (conv) => {
      try {
        if (!isMarketplaceConversation(conv)) return conv;

        const meta = conv.metadata || {};
        const hasClientData = Boolean(meta.clientData?.name || meta.clientData?.avatar);
        const hasBoosterData = Boolean(meta.boosterData?.name || meta.boosterData?.avatar);
        const hasExplicitUsers = Boolean(conv.client?.name || conv.booster?.name);
        if ((hasClientData && hasBoosterData) || hasExplicitUsers) return conv;

        const purchaseId = meta.purchaseId;
        if (!purchaseId) return conv;

        const purchaseResp = await purchaseService.getById(purchaseId);
        const pData = (purchaseResp as any)?.data || {};
        const buyerId = pData.buyerId || pData.clientId || pData.buyer || null;
        const sellerId = pData.sellerId || pData.seller || null;
        if (!buyerId && !sellerId) return conv;

        const getUserData = async (id: string) => {
          if (!id) return null as any;
          try {
            const cached = chatCacheService.getCachedUserData(id);
            if (cached) return cached;
            const user = await userService.getUserById(id);
            chatCacheService.cacheUserData(id, user);
            return user;
          } catch {
            return null as any;
          }
        };

        const [buyer, seller] = await Promise.all([
          buyerId ? getUserData(String(buyerId)) : Promise.resolve(null),
          sellerId ? getUserData(String(sellerId)) : Promise.resolve(null)
        ]);

        const buyerData = buyer ? {
          userid: String(buyer._id || buyer.userid || buyerId),
          _id: String(buyer._id || buyer.userid || buyerId),
          name: buyer.name || buyer.username || 'Cliente',
          avatar: buyer.avatar || buyer.profilePicture || buyer.profileImage || null
        } : undefined;

        const sellerData = seller ? {
          userid: String(seller._id || seller.userid || sellerId),
          _id: String(seller._id || seller.userid || sellerId),
          name: seller.name || seller.username || 'Vendedor',
          avatar: seller.avatar || seller.profilePicture || seller.profileImage || null
        } : undefined;

        const enriched: any = { ...conv };
        enriched.metadata = { ...meta };
        if (buyerData) enriched.metadata.clientData = { ...(enriched.metadata.clientData || {}), ...buyerData };
        if (sellerData) enriched.metadata.boosterData = { ...(enriched.metadata.boosterData || {}), ...sellerData };

        
        if (!enriched.client && buyerData) enriched.client = { userid: buyerData.userid, name: buyerData.name, avatar: buyerData.avatar };
        if (!enriched.booster && sellerData) enriched.booster = { userid: sellerData.userid, name: sellerData.name, avatar: sellerData.avatar };

        
        try {
          if (Array.isArray(enriched.participants)) {
            enriched.participants = enriched.participants.map((p: any) => {
              const pid = (p && (p.user?._id || p._id || p.$oid || p)) ? String(p.user?._id || p._id || p.$oid || p) : null;
              if (!pid) return p;
              if (buyerData && pid === String(buyerData._id)) {
                return { user: { _id: buyerData._id, name: buyerData.name, profileImage: buyerData.avatar } };
              }
              if (sellerData && pid === String(sellerData._id)) {
                return { user: { _id: sellerData._id, name: sellerData.name, profileImage: sellerData.avatar } };
              }
              return p;
            });
          }
        } catch {}

        return enriched;
      } catch {
        return conv;
      }
    }));
    return results;
  }, [isMarketplaceConversation]);
  
  const isOwnMessage = useCallback((message: Message): boolean => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return false;
    

    if (typeof message.sender === 'string') {
      return message.sender === currentUserId;
    }
    
    if (message.sender && typeof message.sender === 'object') {
      return message.sender._id === currentUserId;
    }
    
    return false;
  }, [getCurrentUserId]);
  


  
  const forceSaveMessage = useCallback((conversationId: string, message: Message) => {
    const currentUserId = getCurrentUserId();
    const success = messageStorageManager.saveMessage(conversationId, message, currentUserId);
    
    if (!success) {

      try {
        const backupKey = `emergency_message_${conversationId}_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(message));
      } catch (error) {

      }
    }
  }, [getCurrentUserId]);
  

  


  

  


  

  const updateState = useCallback((updater: (prevState: ChatState) => ChatState) => {
    setState(prevState => {
      const newState = updater(prevState);
      

      if (newState.conversations !== prevState.conversations) {
        const map = new Map<string, TemporaryInfo>();
        for (const conv of newState.conversations) {
          if (!conv || !conv._id) continue;
          map.set(conv._id, {
            isTemporary: !!conv.isTemporary,
            status: conv.status,
            expiresAt: conv.expiresAt
          });
        }
        tempIndexRef.current = map;
      }


      setTimeout(() => {
        persistence.current.saveConversationState(newState.conversations);
        if (newState.activeConversation !== prevState.activeConversation) {
          persistence.current.saveActiveConversation(newState.activeConversation);
        }
      }, 0);
      
      return newState;
    });
  }, []);

  const addMessage = useCallback((conversationId: string, message: Message) => {
    const normalizeId = (val: any): string => {
      try {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
          if ((val as any).$oid) return String((val as any).$oid);
          if ((val as any)._id) return String((val as any)._id);
          if (typeof (val as any).toString === 'function') return (val as any).toString();
        }
        return String(val);
      } catch { return String(val); }
    };
    const convId = normalizeId(conversationId);
    if (deduplicator.current.isDuplicate(message)) {
      return;
    }

    deduplicator.current.markAsProcessed(message);

    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      const conversationMessages = newMessages.get(convId) || [];

      if (message.tempId && message._id) {
        const tempIndex = conversationMessages.findIndex(m => m.tempId === message.tempId);
        if (tempIndex !== -1) {
          conversationMessages[tempIndex] = message;
          newMessages.set(convId, [...conversationMessages]);
          retrySystem.current.removeFromRetryQueue(message.tempId);

          forceSaveMessage(convId, message);

          return {
            ...prevState,
            messages: newMessages
          };
        }
      }

      if (!message.isTemporary) {
        const messageSenderId = message.sender?._id || message.sender;

        const duplicateByContent = conversationMessages.find(existing => {
          const existingSenderId = existing.sender?._id || existing.sender;

          if ((message.type === 'image' || existing.type === 'image')) {
            const a1 = (message.attachments && message.attachments[0]?.url) || '';
            const b1 = (existing.attachments && existing.attachments[0]?.url) || '';
            if (a1 && b1) {
              return a1 === b1 && existingSenderId === messageSenderId && !existing.isTemporary;
            }
            return false;
          }
          return existing.content === message.content &&
                 existingSenderId === messageSenderId &&
                 !existing.isTemporary &&
                 Math.abs(new Date(existing.createdAt).getTime() - new Date(message.createdAt).getTime()) < 10000;
        });

        if (duplicateByContent) {
          return prevState;
        }

        const tempMessageIndex = conversationMessages.findIndex(temp =>
          temp.isTemporary &&
          temp.content === message.content &&
          temp.sender?._id === messageSenderId
        );

        if (tempMessageIndex !== -1) {
          conversationMessages[tempMessageIndex] = {
            ...message,
            tempId: conversationMessages[tempMessageIndex].tempId
          };
          newMessages.set(conversationId, [...conversationMessages]);

          forceSaveMessage(conversationId, message);

          return {
            ...prevState,
            messages: newMessages
          };
        }
      }

      const updatedMessages = [...conversationMessages, message];
      newMessages.set(convId, updatedMessages);


      if (!message.isTemporary) {
        const senderId = typeof message.sender === 'string' 
          ? message.sender 
          : message.sender?._id || 'unknown';
        const lastText = message.type === 'image' ? '[Imagem]' : (message.content || '');
        if (lastText) {
        LastMessageLocalStorage.saveLastMessage(convId, {
          text: lastText,
          timestamp: message.createdAt,
          senderId: senderId,
          messageId: message._id,
          type: message.type || 'text'
        });
        }
      }

      const updatedConversations = prevState.conversations.map(conv => {
        if (conv._id === convId) {
          const isOwn = isOwnMessage(message);
          const isActive = prevState.activeConversation === convId;
          const prevUnread = conv.unreadCount || 0;
          const nextUnread = (isOwn || isActive) ? prevUnread : (prevUnread + 1);
          return {
            ...conv,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: nextUnread
          };
        }
        return conv;
      });
      
      const newUnreadCounts = new Map(prevState.unreadCounts);
      const updatedConv = updatedConversations.find(c => c._id === convId);
      if (updatedConv) newUnreadCounts.set(convId, updatedConv.unreadCount || 0);

      return {
        ...prevState,
        messages: newMessages,
        conversations: updatedConversations.map(conv => ({
          ...conv,
          lastMessageAt: conv.lastMessageAt || new Date().toISOString()
        })) as any[],
        unreadCounts: newUnreadCounts
      };
    });
  }, [updateState, isOwnMessage]);
  


  
  const addOptimisticMessage = useCallback((conversationId: string, content: string): string => {
    const tempId = deduplicator.current.generateTempId();
    const currentUserId = getCurrentUserId();
    
    const optimisticMessage: Message = {
      _id: '',
      conversation: conversationId,
      sender: {
        _id: currentUserId,
        name: user?.name || 'Você',
        profileImage: (user as any)?.profileImage
      },
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
      readBy: [],
      deliveredTo: [],
      tempId,
      status: 'sending',
      isTemporary: true,
      retryCount: 0
    };
    

    forceSaveMessage(conversationId, optimisticMessage);
    
    addMessage(conversationId, optimisticMessage);
    return tempId;
  }, [addMessage, getCurrentUserId, user, forceSaveMessage]);
  


  
  const determineConnectionMode = useCallback((): 'websocket' | 'polling' | 'hybrid' => {
    const ws = typeof websocketService.getConnectionStatus === 'function' ? websocketService.getConnectionStatus() : false;
    const sock = isConnected; 
    if (ws && sock) return 'hybrid';
    if (ws) return 'websocket';
    return 'polling';
  }, [isConnected]);
  

  const sendingMessages = useRef(new Set<string>());
  
  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<void> => {
    if (!conversationId || !content.trim()) return;

    const trimmedContent = content.trim();

    const conversation = state.conversations.find(c => c._id === conversationId);

    const storageKey = `chat_blocked_${conversationId}`;
    let storedBlock: { isBlocked?: boolean; reason?: string; blockedAt?: string } | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        storedBlock = JSON.parse(raw);
      }
    } catch {}

    const status = (conversation?.status || '').toLowerCase();
    const inactiveStatuses = new Set(['expired', 'cancelled', 'blocked', 'finished', 'finalized', 'concluded']);
    const isTemporaryInactive = conversation?.isTemporary && ['rejected', 'deleted', 'expired'].includes(status);
    const isInactiveStatus = conversation?.isActive === false
      || inactiveStatuses.has(status)
      || isTemporaryInactive;

    const isBackendBlocked = Boolean(conversation && (isInactiveStatus || conversation.isBlocked === true));
    const isLocalOnlyBlock = Boolean(storedBlock?.isBlocked && !isBackendBlocked);

    if (isLocalOnlyBlock) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}

      updateState(prevState => {
        const updated = prevState.conversations.map(conv => conv._id === conversationId ? {
          ...conv,
          isBlocked: false,
          blockedReason: undefined,
          isActive: conv.isActive !== false ? conv.isActive : true
        } : conv);
        return {
          ...prevState,
          conversations: updated as any
        };
      });
    }

    const shouldBlock = isBackendBlocked || (!conversation && storedBlock?.isBlocked);

    if (shouldBlock) {
      const reason = storedBlock?.reason
        || conversation?.blockedReason
        || (isInactiveStatus ? 'inactive_conversation' : 'blocked');

      updateState(prevState => {
        const updated = prevState.conversations.map(conv => conv._id === conversationId ? {
          ...conv,
          isBlocked: true,
          blockedReason: reason,
          isActive: false
        } : conv);
        return {
          ...prevState,
          conversations: updated as any
        };
      });

      try {
        localStorage.setItem(storageKey, JSON.stringify({
          isBlocked: true,
          reason,
          blockedAt: new Date().toISOString()
        }));
      } catch {}

      return;
    }

    const messageKey = `${conversationId}-${trimmedContent}-${Date.now()}`;
    if (sendingMessages.current.has(messageKey)) {
      return;
    }
    sendingMessages.current.add(messageKey);

    const tempId = addOptimisticMessage(conversationId, trimmedContent);

    setTimeout(async () => {
      try {

        const conversation = state.conversations.find(c => c._id === conversationId);
        if (conversation?.isReported) {
          updateOptimisticMessageStatus(tempId, 'failed');
          sendingMessages.current.delete(messageKey);
          return;
        }
        

        updateOptimisticMessageStatus(tempId, 'sending');
        
        const mode = determineConnectionMode();
        

        let messageSent = false;
        const cleanup = () => {
          sendingMessages.current.delete(messageKey);
        };


        if (mode === 'websocket' || mode === 'hybrid') {
          const wsSuccess = websocketService.sendMessage(conversationId, trimmedContent, 'text');
          if (wsSuccess) {
            updateOptimisticMessageStatus(tempId, 'sent');
            

            
            messageSent = true;
            cleanup();
            return;
          }
        }


        if (!messageSent) {
          try {
            await pollingService.sendMessage(conversationId, trimmedContent);
            updateOptimisticMessageStatus(tempId, 'sent');
            

            
            cleanup();
          } catch (error) {
            updateOptimisticMessageStatus(tempId, 'failed');
            retrySystem.current.addToRetryQueue({
              ...getCurrentOptimisticMessage(tempId),
              status: 'failed'
            } as Message);
            cleanup();
          }
        }
      } catch (error) {
        updateOptimisticMessageStatus(tempId, 'failed');
        sendingMessages.current.delete(messageKey);
      }
    }, 0);
  }, [determineConnectionMode, addOptimisticMessage, state.conversations, updateState]);


  const sendImage = useCallback(async (conversationId: string, file: File): Promise<void> => {
    if (!conversationId || !file) return;

    const tempId = deduplicator.current.generateTempId();
    const currentUserId = getCurrentUserId();

    const optimisticImage: Message = {
      _id: '',
      conversation: conversationId,
      sender: {
        _id: currentUserId,
        name: user?.name || 'Você',
        profileImage: (user as any)?.profileImage
      },
      content: 'Enviando imagem…',
      type: 'image',
      attachments: [],
      createdAt: new Date().toISOString(),
      readBy: [],
      deliveredTo: [],
      tempId,
      status: 'sending',
      isTemporary: true,
      retryCount: 0
    };

    forceSaveMessage(conversationId, optimisticImage);
    addMessage(conversationId, optimisticImage);

    try {
      
      const uploaded = await imageUploadService.uploadImageBase64(conversationId, file);
      

      patchOptimisticMessage(tempId, { attachments: [uploaded], content: '' });


      const wsOk = websocketService.sendMessage(conversationId, '', 'image', [uploaded], tempId);
      if (wsOk) {
        updateOptimisticMessageStatus(tempId, 'sent');
        return;
      }


      const restResp = await imageUploadService.sendImageMessage(conversationId, uploaded);
      
      if (restResp?._id || restResp?.id) {
        patchOptimisticMessage(tempId, { _id: restResp._id || restResp.id, isTemporary: false, status: 'sent' });
      }
      updateOptimisticMessageStatus(tempId, 'sent');
    } catch (error: any) {
            patchOptimisticMessage(tempId, { content: 'Falha ao enviar imagem' });
      updateOptimisticMessageStatus(tempId, 'failed');
    }
  }, [getCurrentUserId, user, addMessage, forceSaveMessage]);
  

  const getCurrentOptimisticMessage = (tempId: string): Partial<Message> => {
    for (const [, messages] of state.messages) {
      const message = messages.find(m => m.tempId === tempId);
      if (message) return message;
    }
    return {};
  };
  
  const updateOptimisticMessageStatus = (tempId: string, status: Message['status']) => {
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      
      for (const [conversationId, messages] of newMessages) {
        const messageIndex = messages.findIndex(m => m.tempId === tempId);
        if (messageIndex !== -1) {
          const updatedMessages = [...messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status
          };

          try { forceSaveMessage(conversationId, updatedMessages[messageIndex]); } catch {}
          newMessages.set(conversationId, updatedMessages);
          break;
        }
      }
      
      return {
        ...prevState,
        messages: newMessages
      };
    });
  };


  const patchOptimisticMessage = (tempId: string, patch: Partial<Message>) => {
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      let patched = false;
      for (const [conversationId, messages] of newMessages) {
        const idx = messages.findIndex(m => m.tempId === tempId);
        if (idx !== -1) {
          const updated = { ...messages[idx], ...patch } as Message;
          const list = [...messages];
          list[idx] = updated;
          newMessages.set(conversationId, list);

          try { forceSaveMessage(conversationId, updated); } catch {}
          patched = true;
          break;
        }
      }
      if (!patched) return prevState;
      return { ...prevState, messages: newMessages };
    });
  };
  


  
  const processRetryQueue = useCallback(async () => {
    const retryableMessages = retrySystem.current.getRetryableMessages();
    
    for (const message of retryableMessages) {
      if (!message.tempId) continue;
      
      try {
        retrySystem.current.markRetryAttempt(message.tempId);
        

        await pollingService.sendMessage(message.conversation, message.content);
        

        retrySystem.current.removeFromRetryQueue(message.tempId);
        updateOptimisticMessageStatus(message.tempId, 'sent');
        
      } catch (error) {
        updateOptimisticMessageStatus(message.tempId, 'failed');
      }
    }
  }, []);
  

  useEffect(() => {
    if (!socketConversations || socketConversations.length === 0) return;


    let persistedMap: Record<string, any> = {};
    try {
      const stored = localStorage.getItem('unified_chat_conversations');
      if (stored) {
        const persisted = JSON.parse(stored);
        if (Array.isArray(persisted)) {
          persisted.forEach((c: any) => { if (c && c._id) persistedMap[c._id] = c; });
        }
      }
    } catch {}


    const blockedMap: Record<string, { isBlocked: boolean; reason?: string }> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (key.startsWith('chat_blocked_')) {
          const convId = key.replace('chat_blocked_', '');
          try {
            const info = JSON.parse(localStorage.getItem(key) || 'null');
            if (info) blockedMap[convId] = info;
          } catch {}
        }
      }
    } catch {}

    const currentUserId = getCurrentUserId();

    const normalizeId = (val: any): string => {
      try {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
          if (val.$oid) return String(val.$oid);
          if (val._id) return String(val._id);
          if (typeof val.toString === 'function') return val.toString();
        }
        return String(val);
      } catch { return String(val); }
    };

    const transformedConversations = (socketConversations || []).reduce((acc: any[], conv: any) => {
      const metadataSource = conv?.metadata as any;
      const metadataGetter = (key: string) => {
        if (!metadataSource) return undefined;
        if (metadataSource instanceof Map) {
          return metadataSource.get(key);
        }
        if (typeof metadataSource?.get === 'function') {
          try {
            return metadataSource.get(key);
          } catch {}
        }
        return metadataSource?.[key];
      };

      const autoRejectedReason = metadataGetter('autoRejectedReason');
      const autoRejectedAt = metadataGetter('autoRejectedAt');
      const autoRejectedConversation = autoRejectedReason === 'another_proposal_accepted';

      if (autoRejectedConversation && (conv?.status === 'expired' || conv?.status === 'cancelled' || !!autoRejectedAt)) {
        return acc;
      }

      const base = {
        ...conv,
        _id: normalizeId(conv?._id || conv?.id),
        lastMessageAt: conv.updatedAt || new Date().toISOString(),
        unreadCount: conv.unreadCount || 0
      };


      try {
        const deletedFor = base?.metadata?.deletedFor;
        if (Array.isArray(deletedFor) && currentUserId && deletedFor.includes(currentUserId)) {
          return acc;
        }
      } catch {}

      const persisted = persistedMap[conv?._id];
      const blocked = blockedMap[conv?._id];


      if (
        persisted?.status === 'cancelled' ||
        persisted?.boostingStatus === 'cancelled' ||
        persisted?.isBlocked === true ||
        persisted?.blockedReason === 'pedido_finalizado' ||
        (blocked?.isBlocked === true && (blocked?.reason === 'atendimento_cancelado' || blocked?.reason === 'pedido_finalizado'))
      ) {
        acc.push({
          ...base,
          status: 'cancelled',
          boostingStatus: 'cancelled',
          isTemporary: false,
          isActive: false,
          isBlocked: true,
          blockedReason: blocked?.reason || persisted?.blockedReason || base.blockedReason,
          metadata: base.metadata ? { ...base.metadata, proposalData: undefined } : {}
        });
        return acc;
      }

      acc.push(base);
      return acc;
    }, [] as any[]);

    
    updateState(prevState => {
      const prevById = new Map(prevState.conversations.map(c => [c._id, c]));
      const merged = (transformedConversations as any).map((c: any) => {
        const prev = prevById.get(c._id);
        const mapCount = prevState.unreadCounts.get(c._id) || 0;
        const prevCount = (prev?.unreadCount || 0) || mapCount;
        const baseCount = c.unreadCount || 0;
        return { ...c, unreadCount: Math.max(baseCount, prevCount) };
      });
      return {
        ...prevState,
        conversations: merged as any,
        isConnected: isConnected
      };
    });

    
    (async () => {
      try {
        const enrichedList = await enrichConversations(transformedConversations as any);
        updateState(prevState => {
          const prevById = new Map(prevState.conversations.map(c => [c._id, c]));
          const merged = (enrichedList as any).map((c: any) => {
            const prev = prevById.get(c._id);
            const mapCount = prevState.unreadCounts.get(c._id) || 0;
            const prevCount = (prev?.unreadCount || 0) || mapCount;
            const baseCount = c.unreadCount || 0;
            return { ...c, unreadCount: Math.max(baseCount, prevCount) };
          });
          return {
            ...prevState,
            conversations: merged as any
          };
        });
      } catch {}
    })();
  }, [socketConversations, isConnected, updateState, getCurrentUserId]);

  
  useEffect(() => {
    const onWsConnected = () => {
      updateState(prev => ({ ...prev, isConnected: true, connectionMode: determineConnectionMode() }));
    };
    const onWsDisconnected = () => {
      updateState(prev => ({ ...prev, isConnected: (isConnected || false), connectionMode: determineConnectionMode() }));
    };
    websocketService.on('connected', onWsConnected);
    websocketService.on('disconnected', onWsDisconnected);

    
    const tokenLocal = (localStorage.getItem('token') || localStorage.getItem('authToken') || '') as string;
    if (tokenLocal) {
      try { websocketService.connect({ token: tokenLocal, reconnect: true }); } catch {}
    }

    const onVis = () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (!websocketService.getConnectionStatus()) websocketService.forceReconnect();
        }
      } catch {}
    };
    try { window.addEventListener('visibilitychange', onVis); } catch {}
    try { window.addEventListener('focus', onVis); } catch {}

    return () => {
      websocketService.off('connected', onWsConnected);
      websocketService.off('disconnected', onWsDisconnected);
      try { window.removeEventListener('visibilitychange', onVis); } catch {}
      try { window.removeEventListener('focus', onVis); } catch {}
    };
  }, [determineConnectionMode, isConnected, updateState]);

  
  useEffect(() => {
    updateState(prev => ({
      ...prev,
      isConnected: (isConnected || websocketService.getConnectionStatus()),
      connectionMode: determineConnectionMode()
    }));
  }, [isConnected, determineConnectionMode]);


  useEffect(() => {
    if (!user || !token) return;
    

    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      persistence.current.saveUserContext(currentUserId);
    }
    const savedConversations = persistence.current.getConversationState();
    const savedActiveConversation = persistence.current.getActiveConversation();
    
    if (savedConversations.length > 0) {
      updateState(prevState => ({
        ...prevState,
        conversations: savedConversations,
        activeConversation: savedActiveConversation
      }));
    }
    

    initializeConnections();
    

    retryInterval.current = setInterval(processRetryQueue, 10000);
    cleanupInterval.current = setInterval(() => {
      deduplicator.current.cleanup();
      smartCacheService.cleanupOldCache();
    }, 600000);
    
    return () => {
      
      if (retryInterval.current) {
        clearInterval(retryInterval.current);
        retryInterval.current = undefined;
      }
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
        cleanupInterval.current = undefined;
      }
      typingTimeouts.current.clear();
      sendingMessages.current.clear();
      try {
        websocketService.disconnect();
      } catch (error) {
              }
      
      try { if (wsDetachRef.current) wsDetachRef.current(); wsDetachRef.current = null; } catch {}
      smartCacheService.destroy();
      optimizedMessageLoader.cleanup();
      deduplicator.current.cleanup();
      retrySystem.current = new MessageRetrySystem();
      reconnectAttempts.current = 0;
    };
  }, [user, token, getCurrentUserId, processRetryQueue]);
  
  const loadMessagesOptimized = useCallback(async (conversationId: string, forceSync: boolean = false) => {
    try {
      const result = await optimizedMessageLoader.loadMessages(conversationId, {
        forceSync,
        useBackground: true
      });
      
      if (result.messages.length > 0 || result.source === 'cache' || forceSync) {
        updateState(prevState => {
          const newMessages = new Map(prevState.messages);
          const currentMessages = newMessages.get(conversationId) || [];
          
          if (result.messages.length === 0 && currentMessages.length > 0 && !forceSync) {
            return prevState;
          }
          

          const mergedMessages = [...currentMessages];
          

          result.messages.forEach(loadedMsg => {
            const existingIndex = mergedMessages.findIndex(m => {
              
              if (m._id && loadedMsg._id && m._id === loadedMsg._id) return true;
              
              
              if (m.tempId && loadedMsg.tempId && m.tempId === loadedMsg.tempId) return true;
              if (m.tempId && loadedMsg._id && m.tempId === loadedMsg._id) return true;
              
              
              const loadedSenderId = typeof loadedMsg.sender === 'string' 
                ? loadedMsg.sender 
                : loadedMsg.sender?._id;
              const existingSenderId = typeof m.sender === 'string' 
                ? m.sender 
                : m.sender?._id;
              
              if (loadedMsg.type === 'image' && m.type === 'image') {
                const loadedUrl = loadedMsg.attachments?.[0]?.url;
                const existingUrl = m.attachments?.[0]?.url;
                if (loadedUrl && existingUrl && loadedUrl === existingUrl && loadedSenderId === existingSenderId) {
                  return true;
                }
              }
              
              
              if (m.content && loadedMsg.content && 
                  m.content === loadedMsg.content && 
                  loadedSenderId === existingSenderId) {
                const timeDiff = Math.abs(
                  new Date(m.createdAt).getTime() - new Date(loadedMsg.createdAt).getTime()
                );
                if (timeDiff < 10000) return true;
              }
              
              return false;
            });
            
            if (existingIndex === -1) {
              mergedMessages.push(loadedMsg as Message);
            } else {
              
              mergedMessages[existingIndex] = {
                ...loadedMsg as Message,
                tempId: mergedMessages[existingIndex].tempId || (loadedMsg as Message).tempId
              };
            }
          });
          
          
          
          mergedMessages.sort((a, b) => {
            const aTime = new Date(a.createdAt || 0).getTime();
            const bTime = new Date(b.createdAt || 0).getTime();
            return aTime - bTime;
          });
          
          // ✅ SEGURANÇA EXTRA: Deduplicação final por _id
          // Remove qualquer duplicata que possa ter passado
          const seenIds = new Set<string>();
          const deduplicatedMessages = mergedMessages.filter(msg => {
            if (!msg._id) return true;  // Mensagens temporárias sem _id
            
            const id = String(msg._id);
            if (seenIds.has(id)) {
              return false;  // Remove duplicata
            }
            
            seenIds.add(id);
            return true;  // Mantém primeira ocorrência
          });
          
          newMessages.set(conversationId, deduplicatedMessages);
          
          return {
            ...prevState,
            messages: newMessages
          };
        });
        
      }
    } catch (error) {

    }
  }, [updateState]);
  


  
  const handleMessagesUpdated = useCallback((event: CustomEvent) => {
    const { conversationId, messages } = event.detail;
    
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      const currentMessages = newMessages.get(conversationId) || [];
      

      const existingMessages = [...currentMessages];
      

      const updatedMessages = [...existingMessages];
      
      if (messages.length === 0 && existingMessages.length > 0) {
        return prevState;
      }
      
      messages.forEach((newMsg: Message) => {
        const existingIndex = updatedMessages.findIndex(existing => 
          existing._id === newMsg._id || 
          (existing.tempId && newMsg.tempId && existing.tempId === newMsg.tempId) ||
          (existing.tempId && newMsg._id && existing.tempId === newMsg.tempId)
        );
        if (existingIndex !== -1) {
          updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...newMsg } as Message;
        } else {
          updatedMessages.push(newMsg);
        }
      });

      
      updatedMessages.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });
      
      newMessages.set(conversationId, updatedMessages);
      
      return {
        ...prevState,
        messages: newMessages
      };
    });
  }, [updateState]);
  
  const handleSyncRequest = useCallback((event: CustomEvent) => {
    const { conversationId } = event.detail;
    loadMessagesOptimized(conversationId, false);
  }, [loadMessagesOptimized]);
  

  const [wasAwayFromChat] = useState(false);


  useEffect(() => {
    if (state.activeConversation) {
      smartCacheService.setActiveConversation(state.activeConversation);
      
      const isFirstLoad = !state.messages.has(state.activeConversation) || 
                         state.messages.get(state.activeConversation)?.length === 0;
      const shouldForceSync = isFirstLoad || wasAwayFromChat;
      

      loadMessagesOptimized(state.activeConversation, shouldForceSync);
    } else {
      smartCacheService.setActiveConversation(null);
    }
  }, [state.activeConversation, loadMessagesOptimized, wasAwayFromChat]);
  

  useEffect(() => {
    window.addEventListener('messages-updated', handleMessagesUpdated as EventListener);
    window.addEventListener('chat-sync-request', handleSyncRequest as EventListener);
    
    return () => {
      window.removeEventListener('messages-updated', handleMessagesUpdated as EventListener);
      window.removeEventListener('chat-sync-request', handleSyncRequest as EventListener);
    };
  }, [handleMessagesUpdated, handleSyncRequest]);
  
  
  const loadConversationsHTTP = useCallback(async () => {
    try {
      
      const response = await fetch('https://zenith.enrelyugi.com.br/api/conversations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.conversations && Array.isArray(data.conversations)) {
        
        updateState(prevState => ({
          ...prevState,
          conversations: data.conversations,
          connectionMode: 'polling'
        }));
        
        return data.conversations;
      }
      
    } catch (error) {
      throw error;
    }
  }, [token]);
  
  const initializeConnections = async () => {
    try {

      if (token) {
        await websocketService.connect({ token });
        
        try { wsDetachRef.current?.(); } catch {}
        wsDetachRef.current = setupWebSocketListeners();
      }
      

      loadConversations();
      
      updateState(prevState => ({
        ...prevState,
        isConnected: isConnected
      }));
      
    } catch (error) {

      updateState(prevState => ({
        ...prevState,
        connectionMode: 'polling',
        isConnected: true
      }));
      
      // ✅ Tentar carregar por HTTP se WebSocket falhar
      try {
        await loadConversationsHTTP();
      } catch (httpError) {
      }
    }
  };
  


  

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeat.current;
      

      if (timeSinceLastHeartbeat > 30000) {
        attemptReconnection();
      }
      

      if (websocketService && state.isConnected) {
        try {

          websocketService.emit('ping', { timestamp: now });
        } catch (error) {
        }
      }
    }, 15000);
  }, [state.isConnected]);

  const updateHeartbeat = useCallback(() => {
    lastHeartbeat.current = Date.now();
  }, []);

  const setupWebSocketListeners = () => {
    const handleConnected = () => {
      reconnectAttempts.current = 0;
      updateHeartbeat();
      startHeartbeat();
      updateState(prevState => ({
        ...prevState,
        isConnected: true,
        connectionMode: 'hybrid'
      }));
    };
    
    const handleDisconnected = () => {
      updateState(prevState => ({
        ...prevState,
        isConnected: false,
        connectionMode: 'polling'
      }));
      

      attemptReconnection();
    };
    
    const handleNewMessage = (data: any) => {
      const { message } = data;
      if (!message) return;
      
      updateHeartbeat();
      

      if (isOwnMessage(message)) {
        return;
      }
      

      const processedMessage: Message = {
        ...message,
        type: message.type || 'text',
        status: 'delivered',
        isTemporary: false
      };
      

      addMessage(processedMessage.conversation, processedMessage);
      forceSaveMessage(processedMessage.conversation, processedMessage);
      

      const senderId = typeof processedMessage.sender === 'string' 
        ? processedMessage.sender 
        : processedMessage.sender?._id || 'unknown';
      const lastText = processedMessage.type === 'image' ? '[Imagem]' : (processedMessage.content || '');
      if (lastText) {
        LastMessageLocalStorage.saveLastMessage(processedMessage.conversation, {
          text: lastText,
          timestamp: processedMessage.createdAt,
          senderId: senderId,
          messageId: processedMessage._id,
          type: processedMessage.type || 'text'
        });
      }
      

      window.dispatchEvent(new CustomEvent('unified-chat-new-message', {
        detail: { message: processedMessage, conversationId: message.conversation }
      }));
    };
    
    const handleMessageSent = (data: any) => {
      const { message, conversationId, tempId } = data;
      if (!message) return;
      const convId = message.conversation || conversationId;
      if (!convId) return;
      
      
      
      
      
      const recentMessagesKey = (message.attachments && message.attachments[0]?.url) || message.content;
      if (deduplicator.current.isDuplicate(message, recentMessagesKey)) {
        return;
      }
      
      
      deduplicator.current.markAsProcessed(message, recentMessagesKey);
      
      
      updateState(prevState => {
        const newMessages = new Map(prevState.messages);
        const conversationMessages = newMessages.get(convId) || [];
        
        
        const tempMessageIndex = conversationMessages.findIndex(m => 
          m.isTemporary && (
            (tempId && m.tempId === tempId) ||
            (m.content === message.content && isOwnMessage(m))
          )
        );
        
        if (tempMessageIndex !== -1) {
          
          const tempMessageToReplace = conversationMessages[tempMessageIndex];
          const updatedMessage: Message = {
            ...tempMessageToReplace,
            ...message,
            status: 'sent',
            isTemporary: false,
            tempId: message.tempId,
            
            createdAt: message.createdAt || tempMessageToReplace.createdAt,
            _id: message._id || tempMessageToReplace._id
          };

          const updatedMessages = [...conversationMessages];
          updatedMessages[tempMessageIndex] = updatedMessage;
          newMessages.set(convId, updatedMessages);

          
          if (tempMessageToReplace.tempId) {
            try {
              localStorageService.removeMessageByTempId(convId, tempMessageToReplace.tempId);
            } catch (error) {
                          }
          }

          
          if (updatedMessage._id) {
            try {
              forceSaveMessage(convId, updatedMessage);
            } catch (error) {
                          }
          }

          return {
            ...prevState,
            messages: newMessages
          };
        } else {

          const existingIndex = conversationMessages.findIndex(m => 
            m._id === message._id && !m.isTemporary
          );
          
          if (existingIndex !== -1) {
            return prevState;
          }
          
          const recentMessagesKey = (message.attachments && message.attachments[0]?.url) || message.content;
          if (deduplicator.current.isDuplicate(message, recentMessagesKey)) {
            return prevState;
          }
          
          deduplicator.current.markAsProcessed(message, recentMessagesKey);
          
          const realMessage: Message = {
            ...message,
            status: 'sent',
            isTemporary: false
          };
          
          const updatedMessages = [...conversationMessages, realMessage];
          newMessages.set(convId, updatedMessages);


          if (realMessage._id) {
            forceSaveMessage(convId, realMessage);
          }
          
          return {
            ...prevState,
            messages: newMessages
          };
        }
      });
      

      window.dispatchEvent(new CustomEvent('message-sent-confirmation', {
        detail: { message, conversationId }
      }));
    };
    
    
    const handlePendingMessages = (data: any) => {
      try {
        const { conversationId, messages } = data || {};
        if (!conversationId || !Array.isArray(messages) || messages.length === 0) return;
        messages.forEach((m: any) => {
          const processed: Message = {
            ...(m as any),
            type: (m as any)?.type || 'text',
            status: 'delivered',
            isTemporary: false
          } as Message;
          addMessage(conversationId, processed);
          try { forceSaveMessage(conversationId, processed); } catch {}
          try {
            const senderId = typeof processed.sender === 'string' ? processed.sender : (processed.sender?._id || 'unknown');
            const lastText = processed.type === 'image' ? '[Imagem]' : (processed.content || '');
            if (lastText) {
              LastMessageLocalStorage.saveLastMessage(conversationId, {
                text: lastText,
                timestamp: processed.createdAt,
                senderId,
                messageId: processed._id,
                type: processed.type || 'text'
              });
            }
          } catch {}
        });
      } catch {}
    };

    
    const handleOfflineRecovery = (data: any) => {
      try {
        const { conversationId } = data || {};
        const list = Array.isArray(data?.messages) ? data.messages : [];
        if (!list.length) return;
        list.forEach((entry: any) => {
          const raw = (entry && entry.data && entry.data.message) ? entry.data.message : (entry?.message || entry);
          if (!raw) return;
          const processed: Message = {
            ...(raw as any),
            type: (raw as any)?.type || 'text',
            status: 'delivered',
            isTemporary: false
          } as Message;
          const convId = (entry?.data?.conversationId) || processed.conversation || conversationId;
          if (!convId) return;
          addMessage(convId, processed);
          try { forceSaveMessage(convId, processed); } catch {}
          try {
            const senderId = typeof processed.sender === 'string' ? processed.sender : (processed.sender?._id || 'unknown');
            const lastText = processed.type === 'image' ? '[Imagem]' : (processed.content || '');
            if (lastText) {
              LastMessageLocalStorage.saveLastMessage(convId, {
                text: lastText,
                timestamp: processed.createdAt,
                senderId,
                messageId: processed._id,
                type: processed.type || 'text'
              });
            }
          } catch {}
        });
      } catch {}
    };
    
    const handleConversationUpdated = (data: any) => {
      const { conversationId, deleted, status, isTemporary } = data || {};
      if (!conversationId) return;


      if (deleted === true || (isTemporary && status === 'rejected')) {
        updateState(prevState => {
          const filtered = prevState.conversations.filter(c => c._id !== conversationId);
          const newMessages = new Map(prevState.messages);
          newMessages.delete(conversationId);
          return {
            ...prevState,
            conversations: (filtered as any),
            messages: newMessages,
            activeConversation: prevState.activeConversation === conversationId ? null : prevState.activeConversation
          };
        });
        
        try {
          const stored = localStorage.getItem('unified_chat_conversations');
          if (stored) {
            const convs = JSON.parse(stored);
            const updated = (Array.isArray(convs) ? convs : []).filter((c: any) => c && c._id !== conversationId);
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
          }
        } catch (_) {}
      } else {

        if (status === 'accepted' && isTemporary === false) {
                    
          updateState(prevState => {
            const updated = prevState.conversations.map(c => c._id === conversationId ? {
              ...c,
              status: 'accepted',
              isTemporary: false,
              boostingStatus: data.boostingStatus || 'active'
            } : c);
            return { ...prevState, conversations: (updated as any) };
          });
          
          
          try {
            const stored = localStorage.getItem('unified_chat_conversations');
            if (stored) {
              const convs = JSON.parse(stored);
              const updatedLS = (Array.isArray(convs) ? convs : []).map((c: any) => 
                c && c._id === conversationId
                  ? { 
                      ...c, 
                      status: 'accepted', 
                      isTemporary: false, 
                      boostingStatus: data.boostingStatus || 'active',
                      isActive: true 
                    }
                  : c
              );
              localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedLS));
                          }
          } catch (err) {
                      }
        }


        if (status === 'expired') {
          updateState(prevState => {
            const updated = prevState.conversations.map(c => c._id === conversationId ? {
              ...c,
              status: 'expired'
            } : c);
            return { ...prevState, conversations: (updated as any) };
          });

          try {
            const stored = localStorage.getItem('unified_chat_conversations');
            if (stored) {
              const convs = JSON.parse(stored);
              const updatedLS = (Array.isArray(convs) ? convs : []).map((c: any) => c && c._id === conversationId
                ? { ...c, status: 'expired', isActive: false }
                : c
              );
              localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedLS));
            }
          } catch (_) {}
        }


        if (status === 'cancelled') {
          updateState(prevState => {
            const updated = prevState.conversations.map(c => c._id === conversationId ? {
              ...c,
              status: 'cancelled',
              boostingStatus: 'cancelled',
              isTemporary: false,
              isActive: false,
              isBlocked: true
            } : c);
            return { ...prevState, conversations: (updated as any) };
          });

          try {
            const stored = localStorage.getItem('unified_chat_conversations');
            if (stored) {
              const convs = JSON.parse(stored);
              const updatedLS = (Array.isArray(convs) ? convs : []).map((c: any) => c && c._id === conversationId
                ? { 
                    ...c, 
                    status: 'cancelled', 
                    boostingStatus: 'cancelled',
                    isTemporary: false,
                    isActive: false,
                    isBlocked: true,
                    metadata: c.metadata ? { ...c.metadata, proposalData: undefined } : {}
                  }
                : c
              );
              localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedLS));
              window.dispatchEvent(new CustomEvent('conversations:force-update', { detail: { conversations: updatedLS } }));
            }
          } catch (_) {}
        }

        
        if (status === 'completed' || data.boostingStatus === 'completed') {
                    
          updateState(prevState => {
            const updated = prevState.conversations.map(c => c._id === conversationId ? {
              ...c,
              status: 'accepted', 
              boostingStatus: 'completed',
              isTemporary: false,
              isActive: false, 
              isBlocked: data.isBlocked !== undefined ? data.isBlocked : true
            } : c);
            return { ...prevState, conversations: (updated as any) };
          });
          
          
          try {
            const stored = localStorage.getItem('unified_chat_conversations');
            if (stored) {
              const convs = JSON.parse(stored);
              const updatedLS = (Array.isArray(convs) ? convs : []).map((c: any) => 
                c && c._id === conversationId
                  ? { 
                      ...c, 
                      status: 'accepted',
                      boostingStatus: 'completed',
                      isTemporary: false, 
                      isActive: false,
                      isBlocked: data.isBlocked !== undefined ? data.isBlocked : true
                    }
                  : c
              );
              localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedLS));
                          }
          } catch (err) {
                      }
        }

        
        try {
          const { lastMessage, lastMessageDate, unreadCount, participants, marketplace } = data || {};
          if (
            lastMessage != null ||
            lastMessageDate != null ||
            unreadCount != null ||
            participants != null ||
            marketplace != null
          ) {
            updateState(prevState => {
              const updated = prevState.conversations.map(c => c._id === conversationId ? {
                ...c,
                lastMessage: typeof lastMessage === 'string' ? ({
                  _id: c.lastMessage?._id || '',
                  conversation: conversationId,
                  sender: c.lastMessage?.sender || { _id: 'unknown', name: 'Usuário' },
                  content: lastMessage,
                  type: 'text',
                  createdAt: (lastMessageDate || c.lastMessageAt || new Date().toISOString()),
                  readBy: [],
                  deliveredTo: [],
                  status: 'delivered',
                } as any) : (lastMessage || c.lastMessage),
                lastMessageAt: (lastMessageDate || c.lastMessageAt),
                unreadCount: (typeof unreadCount === 'number' ? unreadCount : c.unreadCount),
                participants: participants || c.participants,
                marketplace: marketplace || c.marketplace
              } : c);
              return { ...prevState, conversations: (updated as any) };
            });
          }
        } catch {}
      }
    };
    
    const handleProposalReceived = async (data: any) => {
      const { conversationId, proposalData, clientData, boosterData, expiresAt } = data || {};
      
      if (!conversationId) {
        return;
      }
      
      try {
        // ✅ ESTRATÉGIA 1: Adicionar conversa imediatamente ao estado (não esperar WebSocket)
        updateState(prevState => {
          // Verificar se já existe
          const exists = prevState.conversations.some(c => c._id === conversationId);
          
          if (exists) {
            return prevState;
          }
          
          // Criar objeto de conversa com dados do evento
          const newConversation: any = {
            _id: conversationId,
            participants: [],
            isTemporary: true,
            status: 'pending',
            expiresAt: expiresAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              proposalData: proposalData || {}
            },
            unreadCount: 1,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            type: 'boosting'
          };
          
          // Adicionar participants se disponíveis
          if (clientData) {
            newConversation.participants.push({
              user: clientData,
              role: 'client'
            });
          }
          if (boosterData) {
            newConversation.participants.push({
              user: boosterData,
              role: 'booster'
            });
          }
          
          // Adicionar lastMessage se proposalData disponível
          if (proposalData) {
            newConversation.lastMessage = {
              content: `💰 Nova proposta: R$ ${proposalData.price || '0.00'}`,
              createdAt: new Date().toISOString(),
              type: 'system'
            };
          }
          
          // Adicionar no início da lista
          return {
            ...prevState,
            conversations: [newConversation, ...prevState.conversations]
          };
        });
        
        setTimeout(async () => {
          try {
            await loadConversations();
          } catch (syncError) {
            
            // ✅ ESTRATÉGIA 3: Fallback HTTP se WebSocket falhar
            await loadConversationsHTTP();
          }
        }, 1000);
        
      } catch (error) {
        // Último recurso - forçar reload HTTP
        await loadConversationsHTTP();
      }
    };
    
    const handleProposalAccepted = async (data: any) => {
      const { conversationId } = data || {};

      try {
        
        
        updateState(prevState => {
          const updated = prevState.conversations.map(c => 
            c._id === conversationId ? {
              ...c,
              isTemporary: false,
              status: 'accepted',
              boostingStatus: 'active',
              expiresAt: undefined,
              updatedAt: new Date().toISOString()
            } : c
          );
          return { ...prevState, conversations: updated as any };
        });
        
        
        
        setTimeout(async () => {
          try {
            await loadConversations();
          } catch (syncError) {
            
          }
        }, 500);
      
      } catch (error) {
      }
    };
    
    const handleProposalRejected = async (data: any) => {
      const { conversationId } = data || {};
    
      
      try {
        
        updateState(prevState => {
          const filtered = prevState.conversations.filter(c => c._id !== conversationId);
          const newMessages = new Map(prevState.messages);
          newMessages.delete(conversationId);
          
          return {
            ...prevState,
            conversations: filtered as any,
            messages: newMessages,
            activeConversation: prevState.activeConversation === conversationId ? null : prevState.activeConversation
          };
        });
        
        
        try {
          const stored = localStorage.getItem('unified_chat_conversations');
          if (stored) {
            const convs = JSON.parse(stored);
            const updated = (Array.isArray(convs) ? convs : []).filter((c: any) => c && c._id !== conversationId);
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
          }
        } catch {}
    
      } catch (error) {
  
      }
    };
    
    const handleServiceCancelled = (data: any) => {
      const { conversationId, deletedForClient, boostingStatus, isActive } = data || {};
      if (!conversationId) return;
      const currentUserId = getCurrentUserId();
      const isClientDeleted = deletedForClient && currentUserId && deletedForClient.toString() === currentUserId.toString();

      if (isClientDeleted) {

        updateState(prevState => {
          const filtered = prevState.conversations.filter(c => c._id !== conversationId);
          const newMessages = new Map(prevState.messages);
          newMessages.delete(conversationId);
          return {
            ...prevState,
            conversations: (filtered as any),
            messages: newMessages,
            activeConversation: prevState.activeConversation === conversationId ? null : prevState.activeConversation
          };
        });
        try {
          const stored = localStorage.getItem('unified_chat_conversations');
          if (stored) {
            const convs = JSON.parse(stored);
            const updated = (Array.isArray(convs) ? convs : []).filter((c: any) => c && c._id !== conversationId);
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
          }
        } catch (_) {}
      } else {

        updateState(prevState => {
          const updated = prevState.conversations.map(c => c._id === conversationId ? {
            ...c,
            boostingStatus: boostingStatus || 'cancelled',
            status: 'cancelled',
            isTemporary: false,
            isActive: typeof isActive === 'boolean' ? isActive : false,
            isBlocked: true
          } : c);
          return { ...prevState, conversations: (updated as any) };
        });


        try {
          const stored = localStorage.getItem('unified_chat_conversations');
          if (stored) {
            const convs = JSON.parse(stored);
            const updatedLS = (Array.isArray(convs) ? convs : []).map((c: any) => c && c._id === conversationId
              ? { 
                  ...c, 
                  boostingStatus: 'cancelled',
                  status: 'cancelled',
                  isTemporary: false,
                  isActive: false,
                  isBlocked: true,
                  metadata: c.metadata ? { ...c.metadata, proposalData: undefined } : {}
                }
              : c
            );
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedLS));
            window.dispatchEvent(new CustomEvent('conversations:force-update', { detail: { conversations: updatedLS } }));
          }
        } catch (_) {}
      }
    };
    

    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    const handleConversationDeleted = (data: any) => {
      const conversationId = data?.conversationId || data?._id;
      if (!conversationId) return;

      // CRITICAL: Remover conversa do estado e localStorage
      updateState(prevState => {
        const filtered = prevState.conversations.filter(c => c._id !== conversationId);
        const newMessages = new Map(prevState.messages);
        newMessages.delete(conversationId);

        return {
          ...prevState,
          conversations: filtered as any,
          messages: newMessages,
          activeConversation: prevState.activeConversation === conversationId ? null : prevState.activeConversation
        };
      });

      // Remover do localStorage
      try {
        const stored = localStorage.getItem('unified_chat_conversations');
        if (stored) {
          const convs = JSON.parse(stored);
          const updated = (Array.isArray(convs) ? convs : []).filter((c: any) => c && c._id !== conversationId);
          localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
        }
      } catch {}

      // Marcar como bloqueado para referência futura
      try {
        const key = `chat_blocked_${conversationId}`;
        localStorage.setItem(key, JSON.stringify({
          isBlocked: true,
          reason: data?.reason || 'deleted',
          deletedReason: data?.reason,
          acceptedConversationId: data?.acceptedConversationId,
          blockedAt: new Date().toISOString(),
          message: data?.message || 'Chat foi removido'
        }));
      } catch {}

      // Disparar evento customizado para UI atualizar
      try {
        window.dispatchEvent(new CustomEvent('conversation:deleted', {
          detail: {
            conversationId,
            reason: data?.reason,
            acceptedConversationId: data?.acceptedConversationId,
            message: data?.message
          }
        }));
      } catch {}

    };

    websocketService.on('message:new', handleNewMessage);
    websocketService.on('message:sent', handleMessageSent);
    websocketService.on('conversation:updated', handleConversationUpdated);
    websocketService.on('message:pending', handlePendingMessages);
    websocketService.on('message:offline_recovery', handleOfflineRecovery);
    
    websocketService.on('message:offline_batch', handleOfflineRecovery);
    websocketService.on('service:cancelled', handleServiceCancelled);
    websocketService.on('boosting:cancelled', handleServiceCancelled);
    websocketService.on('boosting:broken', handleServiceCancelled);
    websocketService.on('proposal:received', handleProposalReceived);
    websocketService.on('proposal:accepted', handleProposalAccepted);
    websocketService.on('proposal:rejected', handleProposalRejected);
    websocketService.on('conversation:deleted', handleConversationDeleted);
    

    websocketService.on('pong', updateHeartbeat);
    

    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('message:new', handleNewMessage);
      websocketService.off('message:sent', handleMessageSent);
      websocketService.off('conversation:updated', handleConversationUpdated);
      websocketService.off('message:pending', handlePendingMessages);
      websocketService.off('message:offline_recovery', handleOfflineRecovery);
      websocketService.off('message:offline_batch', handleOfflineRecovery);
      websocketService.off('service:cancelled', handleServiceCancelled);
      websocketService.off('boosting:cancelled', handleServiceCancelled);
      websocketService.off('boosting:broken', handleServiceCancelled);
      websocketService.off('proposal:received', handleProposalReceived);
      websocketService.off('proposal:accepted', handleProposalAccepted);
      websocketService.off('proposal:rejected', handleProposalRejected);
      websocketService.off('conversation:deleted', handleConversationDeleted);
      websocketService.off('pong', updateHeartbeat);
    };
  };
  
  const attemptReconnection = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectAttempts.current++;
    
    setTimeout(async () => {
      try {
        if (token) {
          await websocketService.connect({ token });
        }
      } catch (error) {
        attemptReconnection();
      }
    }, delay);
  };
  


  
  const setActiveConversation = useCallback((conversationId: string | null) => {
    updateState(prevState => ({
      ...prevState,
      activeConversation: conversationId
    }));
  }, [updateState]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        return;
      }

      const conversationMessages = state.messages.get(conversationId) || [];

      const unreadMessages = conversationMessages.filter(msg => {
        const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
        if (senderId === currentUserId) {
          return false;
        }

        const readBy = msg.readBy || [];
        const isRead = readBy.some((r: any) => {
          const readUserId = typeof r === 'string' ? r : (r.user || r._id);
          return readUserId?.toString() === currentUserId?.toString();
        });

        return !isRead;
      });

      const unreadMessageIds = unreadMessages
        .map(msg => msg._id)
        .filter(id => id && !id.startsWith('temp_'));

      if (unreadMessageIds.length === 0) {
        updateState(prevState => {
          const newUnreadCounts = new Map(prevState.unreadCounts);
          newUnreadCounts.set(conversationId, 0);

          const updatedConversations = prevState.conversations.map(conv =>
            conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
          );

          return {
            ...prevState,
            unreadCounts: newUnreadCounts,
            conversations: updatedConversations
          };
        });
        return;
      }

      await pollingService.markAsRead(conversationId, unreadMessageIds);

      updateState(prevState => {
        const newUnreadCounts = new Map(prevState.unreadCounts);
        newUnreadCounts.set(conversationId, 0);

        const updatedConversations = prevState.conversations.map(conv =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        );

        const updatedMessages = new Map(prevState.messages);
        const currentMessages = updatedMessages.get(conversationId) || [];
        const markedMessages = currentMessages.map(msg => {
          if (unreadMessageIds.includes(msg._id)) {
            const readBy = msg.readBy || [];
            const alreadyRead = readBy.some((r: any) => {
              const readUserId = typeof r === 'string' ? r : (r.user || r._id);
              return readUserId?.toString() === currentUserId?.toString();
            });

            if (!alreadyRead) {
              return {
                ...msg,
                readBy: [
                  ...readBy,
                  { user: currentUserId, readAt: new Date().toISOString() }
                ] as Array<string | { user: string; readAt: string }>
              };
            }
          }
          return msg;
        });
        updatedMessages.set(conversationId, markedMessages as Message[]);

        return {
          ...prevState,
          unreadCounts: newUnreadCounts,
          conversations: updatedConversations,
          messages: updatedMessages
        };
      });
    } catch (error) {
    }
  }, [updateState, getCurrentUserId, state.messages]);
  
  const refreshConversations = useCallback(async () => {
    try {
      const serverConversations = await pollingService.getConversations();


      let persistedMap: Record<string, any> = {};
      const blockedMap: Record<string, { isBlocked: boolean; reason?: string }> = {};
      try {
        const stored = localStorage.getItem('unified_chat_conversations');
        if (stored) {
          const persisted = JSON.parse(stored);
          if (Array.isArray(persisted)) {
            persisted.forEach((c: any) => { if (c && c._id) persistedMap[c._id] = c; });
          }
        }
      } catch {}
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i) || '';
          if (key.startsWith('chat_blocked_')) {
            const convId = key.replace('chat_blocked_', '');
            try {
              const info = JSON.parse(localStorage.getItem(key) || 'null');
              if (info) blockedMap[convId] = info;
            } catch {}
          }
        }
      } catch {}

      const currentUserId = getCurrentUserId();

      const normalizeId2 = (val: any): string => {
        try {
          if (!val) return '';
          if (typeof val === 'string') return val;
          if (typeof val === 'object') {
            if (val.$oid) return String(val.$oid);
            if (val._id) return String(val._id);
            if (typeof val.toString === 'function') return val.toString();
          }
          return String(val);
        } catch { return String(val); }
      };

      const transformed = (serverConversations || []).reduce((acc: any[], conv: any) => {
        const base = {
          ...conv,
          _id: normalizeId2(conv?._id || conv?.id),
          lastMessageAt: conv.updatedAt || new Date().toISOString(),
          unreadCount: conv.unreadCount || 0
        };

        try {
          const deletedFor = base?.metadata?.deletedFor;
          if (Array.isArray(deletedFor) && currentUserId && deletedFor.includes(currentUserId)) {
            return acc;
          }
        } catch {}

        const persisted = persistedMap[base._id];
        const blocked = blockedMap[base._id];

        if (
          persisted?.status === 'cancelled' ||
          persisted?.boostingStatus === 'cancelled' ||
          persisted?.isBlocked === true ||
          persisted?.blockedReason === 'pedido_finalizado' ||
          (blocked?.isBlocked === true && (blocked?.reason === 'atendimento_cancelado' || blocked?.reason === 'pedido_finalizado'))
        ) {
          acc.push({
            ...base,
            status: 'cancelled',
            boostingStatus: 'cancelled',
            isTemporary: false,
            isActive: false,
            isBlocked: true,
            blockedReason: blocked?.reason || persisted?.blockedReason || base.blockedReason,
            metadata: base.metadata ? { ...base.metadata, proposalData: undefined } : {}
          });
          return acc;
        }

        acc.push(base);
        return acc;
      }, [] as any[]);

      updateState(prevState => {
        const prevById = new Map(prevState.conversations.map(c => [c._id, c]));
        const merged = (transformed as any).map((c: any) => {
          const prev = prevById.get(c._id);
          const mapCount = prevState.unreadCounts.get(c._id) || 0;
          const prevCount = (prev?.unreadCount || 0) || mapCount;
          const baseCount = c.unreadCount || 0;
          
          
          
          
          const now = Date.now();
          const prevUpdatedAtRaw = (prev as any)?.updatedAt;
          const prevUpdatedAt = prevUpdatedAtRaw ? new Date(prevUpdatedAtRaw).getTime() : 0;
          const isRecentUpdate = (now - prevUpdatedAt) < 10000; 

          const shouldPreserveOptimistic = prev && 
            isRecentUpdate && 
            prev.status === 'accepted' && 
            prev.isTemporary === false;
          
          return { 
            ...c, 
            unreadCount: Math.max(baseCount, prevCount),
            
            ...(shouldPreserveOptimistic ? {
              isTemporary: false,
              status: 'accepted',
              boostingStatus: (prev as any)?.boostingStatus || 'active',
              expiresAt: undefined
            } : {})
          };
        });
        return {
          ...prevState,
          conversations: merged as any
        };
      });
    } catch (error) {
    }
  }, [updateState, getCurrentUserId]);


  useEffect(() => {
    const handleForceUpdate = (event: CustomEvent) => {
      const { conversations } = event.detail;
      if (conversations) {
        updateState(prevState => {
          const prevById = new Map(prevState.conversations.map(c => [c._id, c]));
          const merged = (conversations as any).map((c: any) => {
            const prev = prevById.get(c._id);
            const mapCount = prevState.unreadCounts.get(c._id) || 0;
            const prevCount = (prev?.unreadCount || 0) || mapCount;
            const baseCount = c.unreadCount || 0;
            return { ...c, unreadCount: Math.max(baseCount, prevCount) };
          });
          return {
            ...prevState,
            conversations: merged
          };
        });
      }
    };

    window.addEventListener('conversations:force-update', handleForceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('conversations:force-update', handleForceUpdate as EventListener);
    };
  }, [updateState]);


  const isTemporaryConversation = useCallback((conversationId?: string | null): boolean => {
    const id = conversationId ?? state.activeConversation;
    if (!id) return false;
    const info = tempIndexRef.current.get(id);
    return !!(info && info.isTemporary);
  }, [state.activeConversation]);

  const getTemporaryStatus = useCallback((conversationId?: string | null): TempStatus | null => {
    const id = conversationId ?? state.activeConversation;
    if (!id) return null;
    return tempIndexRef.current.get(id)?.status ?? null;
  }, [state.activeConversation]);

  const getTemporaryExpiresAt = useCallback((conversationId?: string | null): string | null => {
    const id = conversationId ?? state.activeConversation;
    if (!id) return null;
    return tempIndexRef.current.get(id)?.expiresAt ?? null;
  }, [state.activeConversation]);

  const getTemporaryInfo = useCallback((): { conversationId: string | null; isTemporary: boolean; status: TempStatus | null; expiresAt: string | null } => {
    const id = state.activeConversation;
    const info = id ? tempIndexRef.current.get(id) : undefined;
    return {
      conversationId: id,
      isTemporary: info?.isTemporary ?? false,
      status: info?.status ?? null,
      expiresAt: info?.expiresAt ?? null
    };
  }, [state.activeConversation]);

  const isActiveTemporaryPending = useCallback((): boolean => {
    const id = state.activeConversation;
    if (!id) return false;
    const info = tempIndexRef.current.get(id);
    return !!(info && info.isTemporary && info.status === 'pending');
  }, [state.activeConversation]);


  const clearPendingMessages = useCallback((conversationId?: string) => {
    
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      
      if (conversationId) {

        const messages = newMessages.get(conversationId) || [];
        const filteredMessages = messages.filter(msg => 
          msg.status !== 'sending' && !msg.isTemporary
        );
        newMessages.set(conversationId, filteredMessages);
        
      } else {

        let totalRemoved = 0;
        
        for (const [convId, messages] of newMessages) {
          const filteredMessages = messages.filter(msg => 
            msg.status !== 'sending' && !msg.isTemporary
          );
          newMessages.set(convId, filteredMessages);
          totalRemoved += messages.length - filteredMessages.length;
        }
        
      }
      
      return {
        ...prevState,
        messages: newMessages
      };
    });
  }, [updateState]);

  const clearFailedMessages = useCallback((conversationId?: string) => {
    
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      
      if (conversationId) {

        const messages = newMessages.get(conversationId) || [];
        const filteredMessages = messages.filter(msg => msg.status !== 'failed');
        newMessages.set(conversationId, filteredMessages);
        
      } else {

        let totalRemoved = 0;
        
        for (const [convId, messages] of newMessages) {
          const filteredMessages = messages.filter(msg => msg.status !== 'failed');
          newMessages.set(convId, filteredMessages);
          totalRemoved += messages.length - filteredMessages.length;
        }
        
      }
      
      return {
        ...prevState,
        messages: newMessages
      };
    });
  }, [updateState]);

  const clearAllPendingAndFailed = useCallback((conversationId?: string) => {
    
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      
      if (conversationId) {

        const messages = newMessages.get(conversationId) || [];
        const filteredMessages = messages.filter(msg => 
          msg.status !== 'sending' && 
          msg.status !== 'failed' && 
          !msg.isTemporary
        );
        newMessages.set(conversationId, filteredMessages);
        
      } else {

        let totalRemoved = 0;
        
        for (const [convId, messages] of newMessages) {
          const filteredMessages = messages.filter(msg => 
            msg.status !== 'sending' && 
            msg.status !== 'failed' && 
            !msg.isTemporary
          );
          newMessages.set(convId, filteredMessages);
          totalRemoved += messages.length - filteredMessages.length;
        }
        
      }
      
      

      retrySystem.current.clearRetryQueue();
      
      return {
        ...prevState,
        messages: newMessages
      };
    });
  }, [updateState]);


  const clearOldPendingMessages = useCallback(() => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    updateState(prevState => {
      const newMessages = new Map(prevState.messages);
      let totalRemoved = 0;
      
      for (const [convId, messages] of newMessages) {
        const filteredMessages = messages.filter(msg => {
          if (msg.status === 'sending' || msg.isTemporary) {
            const messageTime = new Date(msg.createdAt).getTime();
            return messageTime > fiveMinutesAgo;
          }
          return true;
        });
        
        const removed = messages.length - filteredMessages.length;
        if (removed > 0) {
          newMessages.set(convId, filteredMessages);
          totalRemoved += removed;
        }
      }
      
      if (totalRemoved > 0) {
      }
      
      return {
        ...prevState,
        messages: newMessages
      };
    });
  }, [updateState]);
  


  

  useEffect(() => {

    const autoCleanupInterval = setInterval(() => {
      clearOldPendingMessages();
    }, 10 * 60 * 1000);
    
    cleanupInterval.current = autoCleanupInterval;
    
    return () => {
      if (autoCleanupInterval) {
        clearInterval(autoCleanupInterval);
      }
    };
  }, [clearOldPendingMessages]);
  
  


  
  
  const getStorageStats = useCallback(() => {
    return localStorageService.getStorageStats();
  }, []);
  
  const exportStoredMessages = useCallback(() => {
    try {
      const exportData = localStorageService.exportData();
      return exportData;
    } catch (error) {
      return '';
    }
  }, []);
  
  const importStoredMessages = useCallback((jsonData: string) => {
    try {
      const success = localStorageService.importData(jsonData);
      if (success) {
        if (state.activeConversation) {
        loadMessagesOptimized(state.activeConversation);
      }

        if (state.activeConversation) {
          loadMessagesOptimized(state.activeConversation);
        }
      }
      return success;
    } catch (error) {
      return false;
    }
  }, [loadMessagesOptimized, state.activeConversation]);
  

  const clearStoredMessages = useCallback((conversationId?: string) => {
    try {
      messageStorageManager.clearStorage(conversationId, true);
      updateState(prevState => {
        const newMessages = new Map(prevState.messages);
        if (conversationId) {
          newMessages.delete(conversationId);
        } else {
          newMessages.clear();
        }
        return { ...prevState, messages: newMessages };
      });
    } catch (error) {

    }
  }, [updateState]);
  


  
  return {

    isConnected: state.isConnected,
    conversations: state.conversations,
    messages: state.messages,
    activeConversation: state.activeConversation,
    typingUsers: state.typingUsers,
    unreadCounts: state.unreadCounts,
    connectionMode: state.connectionMode,
    

    sendMessage,
    sendImage,
    setActiveConversation,
    markAsRead,
    refreshConversations,
    

    getFailedMessages: () => retrySystem.current.getFailedMessages(),
    retryMessage: (tempId: string) => {
      const message = getCurrentOptimisticMessage(tempId) as Message;
      if (message) {
        retrySystem.current.addToRetryQueue(message);
      }
    },
    clearPendingMessages,
    clearFailedMessages,
    clearAllPendingAndFailed,
    clearOldPendingMessages,
    

    getStorageStats,
    exportStoredMessages,
    importStoredMessages,
    clearStoredMessages,
    forceSync: useCallback((conversationId?: string) => {
      const targetConversation = conversationId || state.activeConversation;
      if (targetConversation) {
        loadMessagesOptimized(targetConversation, true);
      }
    }, [state.activeConversation, loadMessagesOptimized]),
    getCacheStats: useCallback(() => {
      return {
        ...localStorageService.getStorageStats(),
        ...smartCacheService.getCacheStats(),
        pendingUpdates: optimizedMessageLoader.hasPendingUpdates()
      };
    }, []),
    


    isTemporaryConversation,
    getTemporaryStatus,
    getTemporaryInfo,
    isActiveTemporaryPending,
    getTemporaryExpiresAt,
    isOwnMessage,
    getCurrentUserId
  };
};

export default useUnifiedChat;
