import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from './useWebSocket';
import chatCacheService from '../services/chatCacheService';
import api from '../services/api';

interface WhatsAppMessage {
  _id: string;
  content: string;

  senderId: string;
  receiverId: string;
  conversationId: string;

  sender?: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  conversation?: string;
  createdAt: string;
  updatedAt?: string;
  readBy?: string[];
  deliveredTo?: string[];
  isRead?: boolean;
  readAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  attachments?: any[];

  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOwn: boolean;
  tempId?: string;
  retryCount?: number;
}

interface WhatsAppConversation {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
  updatedAt: string;
  isOnline?: boolean;
  name?: string;
}

interface UseWhatsAppChatReturn {

  conversations: WhatsAppConversation[];
  messages: WhatsAppMessage[];
  activeConversation: WhatsAppConversation | null;
  unreadCounts: Record<string, number>;
  

  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  

  typingUsers: string[];
  

  setActiveConversation: (conversationId: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => void;
  setTyping: (isTyping: boolean) => void;
  retryFailedMessage: (messageId: string) => void;
  refreshConversations: () => Promise<void>;
}


export function useWhatsAppChat(): UseWhatsAppChatReturn {
  const { user } = useAuth();
  const { isConnected, sendMessage: wsSendMessage } = useWebSocket();
  

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  

  const lastApiCall = useRef<number>(0);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const currentUserId = user?.id || (user as any)?._id || '';


  const cacheService = chatCacheService;


  useEffect(() => {
    if (currentUserId) {
      cacheService.initializeCache(currentUserId);
      loadCachedData();
    }
  }, [currentUserId]);


  useEffect(() => {
    if (!isConnected) return;

    const handleNewMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      handleIncomingMessage(message);
    };

    const handleMessageDelivered = (event: CustomEvent) => {
      const { messageId, conversationId } = event.detail;
      updateMessageStatus(messageId, 'delivered');
    };

    const handleMessageRead = (event: CustomEvent) => {
      const { messageId, conversationId } = event.detail;
      updateMessageStatus(messageId, 'read');
    };

    const handleTyping = (event: CustomEvent) => {
      const { userId, conversationId, isTyping } = event.detail;
      if (conversationId === activeConversationId && userId !== currentUserId) {
        setTypingUsers(prev => 
          isTyping 
            ? [...prev.filter(id => id !== userId), userId]
            : prev.filter(id => id !== userId)
        );
      }
    };


    window.addEventListener('new-message', handleNewMessage as EventListener);
    window.addEventListener('message-delivered', handleMessageDelivered as EventListener);
    window.addEventListener('message-read', handleMessageRead as EventListener);
    window.addEventListener('user-typing', handleTyping as EventListener);

    return () => {
      window.removeEventListener('new-message', handleNewMessage as EventListener);
      window.removeEventListener('message-delivered', handleMessageDelivered as EventListener);
      window.removeEventListener('message-read', handleMessageRead as EventListener);
      window.removeEventListener('user-typing', handleTyping as EventListener);
    };
  }, [isConnected, activeConversationId, currentUserId]);


  const loadCachedData = useCallback(() => {
    try {
      const cachedConversations = cacheService.getCachedConversations();
      if (cachedConversations.length > 0) {
        setConversations(cachedConversations);
        

        const counts: Record<string, number> = {};
        cachedConversations.forEach(conv => {
          counts[conv._id] = conv.unreadCount || 0;
        });
        setUnreadCounts(counts);
      }


      if (activeConversationId) {
        const cachedMessages = cacheService.getCachedMessages(activeConversationId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages.map(msg => ({
            ...msg,

            isOwn: msg.isOwn === true ? true : msg.sender._id === currentUserId
          })));
        }
      }
    } catch (error) {
    }
  }, [activeConversationId, currentUserId]);


  const handleIncomingMessage = useCallback((message: any) => {
    const whatsAppMessage: WhatsAppMessage = {
      _id: message._id,
      content: message.content,
      sender: message.sender,
      conversation: message.conversation,
      createdAt: message.createdAt,
      readBy: message.readBy || [],
      deliveredTo: message.deliveredTo || [],
      status: 'delivered',

      isOwn: message.isOwn === true ? true : message.sender._id === currentUserId
    } as any;


    if (message.conversation === activeConversationId) {
      setMessages(prev => {
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        
        const newMessages = [...prev, whatsAppMessage];

        cacheService.cacheMessages(activeConversationId, newMessages);
        return newMessages;
      });


      if (!whatsAppMessage.isOwn) {
        wsSendMessage(activeConversationId, '', 'delivery_confirmation', {
          messageId: message._id
        });
      }
    }


    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message.content,
            lastMessageDate: message.createdAt,
            unreadCount: whatsAppMessage.isOwn ? 0 : (conv.unreadCount || 0) + 1
          };
        }
        return conv;
      });
      

      cacheService.cacheConversations(updated);
      return updated;
    });


    if (!whatsAppMessage.isOwn) {
      setUnreadCounts(prev => ({
        ...prev,
        [message.conversation]: (prev[message.conversation] || 0) + 1
      }));
    }
  }, [activeConversationId, currentUserId, wsSendMessage]);


  const updateMessageStatus = useCallback((messageId: string, status: WhatsAppMessage['status']) => {
    setMessages(prev => {
      const updated = prev.map(msg => 
        msg._id === messageId ? { ...msg, status } : msg
      );
      

      if (activeConversationId) {
        cacheService.cacheMessages(activeConversationId, updated);
      }
      
      return updated;
    });
  }, [activeConversationId]);


  const setActiveConversation = useCallback(async (conversationId: string | null) => {
    if (conversationId === activeConversationId) return;

    setActiveConversationId(conversationId);
    setMessages([]);
    setTypingUsers([]);

    if (!conversationId) return;


    const cachedMessages = cacheService.getCachedMessages(conversationId);
    if (cachedMessages.length > 0 && cacheService.isCacheValid()) {
      setMessages(cachedMessages.map(msg => ({
        ...msg,
        isOwn: msg.sender._id === currentUserId
      })));
      return;
    }


    try {
      setIsLoading(true);
      const response = await api.get(`/conversations/${conversationId}/messages`);
      const apiMessages = response.data.messages || [];
      
      const whatsAppMessages: WhatsAppMessage[] = apiMessages.map((msg: any) => ({
        _id: msg._id,
        content: msg.content,
        sender: msg.sender,
        conversation: msg.conversation,
        createdAt: msg.createdAt,
        readBy: msg.readBy || [],
        deliveredTo: msg.deliveredTo || [],
        status: 'delivered',
        isOwn: msg.sender._id === currentUserId
      }));

      setMessages(whatsAppMessages);
      

      cacheService.cacheMessages(conversationId, whatsAppMessages);
      
    } catch (error) {
      setError('Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, currentUserId]);


  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversationId || !content.trim()) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: WhatsAppMessage = {
      _id: tempId,
      tempId,
      content: content.trim(),
      sender: {
        _id: currentUserId,
        name: user?.name || 'You'
      },
      conversation: activeConversationId,
      createdAt: new Date().toISOString(),
      readBy: [currentUserId],
      deliveredTo: [],
      status: 'sending',
      isOwn: true
    } as any;


    setMessages(prev => [...prev, optimisticMessage]);

    try {

      await wsSendMessage(activeConversationId, content, 'text');
      

      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );

    } catch (error) {
      

      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, status: 'failed' as const, retryCount: 0 }
            : msg
        )
      );
      

      scheduleRetry(tempId, content, 1);
    }
  }, [activeConversationId, currentUserId, user?.name, wsSendMessage]);


  const scheduleRetry = useCallback((messageId: string, content: string, attempt: number) => {
    if (attempt > 3) return;

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
    
    const timeoutId = setTimeout(async () => {
      try {
        await wsSendMessage(activeConversationId!, content, 'text');
        

        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId || msg.tempId === messageId
              ? { ...msg, status: 'sent' as const }
              : msg
          )
        );
        
        retryTimeouts.current.delete(messageId);
        
      } catch (error) {
        
        if (attempt < 3) {
          scheduleRetry(messageId, content, attempt + 1);
        } else {

          setMessages(prev => 
            prev.map(msg => 
              msg._id === messageId || msg.tempId === messageId
                ? { ...msg, status: 'failed' as const, retryCount: attempt }
                : msg
            )
          );
        }
      }
    }, delay);
    
    retryTimeouts.current.set(messageId, timeoutId);
  }, [activeConversationId, wsSendMessage]);


  const retryFailedMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m._id === messageId || m.tempId === messageId);
    if (!message || message.status !== 'failed') return;


    const existingTimeout = retryTimeouts.current.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      retryTimeouts.current.delete(messageId);
    }


    setMessages(prev => 
      prev.map(msg => 
        (msg._id === messageId || msg.tempId === messageId)
          ? { ...msg, status: 'sending' as const }
          : msg
      )
    );


    scheduleRetry(messageId, message.content, 1);
  }, [messages, scheduleRetry]);


  const markAsRead = useCallback((messageIds: string[]) => {
    if (!activeConversationId || messageIds.length === 0) return;


    setMessages(prev => 
      prev.map(msg => 
        messageIds.includes(msg._id) && !msg.readBy.includes(currentUserId)
          ? { ...msg, readBy: [...msg.readBy, currentUserId], status: 'read' }
          : msg
      )
    );


    wsSendMessage(activeConversationId, '', 'read_confirmation', {
      messageIds
    });


    setUnreadCounts(prev => ({
      ...prev,
      [activeConversationId]: 0
    }));
  }, [activeConversationId, currentUserId, wsSendMessage]);


  const setTyping = useCallback((isTyping: boolean) => {
    if (!activeConversationId) return;


    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    if (isTyping) {

      wsSendMessage(activeConversationId, '', 'typing', { isTyping: true });
      

      typingTimeout.current = setTimeout(() => {
        wsSendMessage(activeConversationId, '', 'typing', { isTyping: false });
      }, 3000);
    } else {

      wsSendMessage(activeConversationId, '', 'typing', { isTyping: false });
    }
  }, [activeConversationId, wsSendMessage]);


  const refreshConversations = useCallback(async () => {

    const now = Date.now();
    if (now - lastApiCall.current < 30000) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/conversations');
      const apiConversations = response.data.conversations || [];
      
      const whatsAppConversations: WhatsAppConversation[] = apiConversations.map((conv: any) => ({
        _id: conv._id,
        participants: conv.participants,
        lastMessage: conv.lastMessage?.content,
        lastMessageDate: conv.lastMessage?.createdAt,
        unreadCount: conv.unreadCount?.[currentUserId] || 0,
        updatedAt: conv.updatedAt,
        name: conv.name
      }));

      setConversations(whatsAppConversations);
      

      const counts: Record<string, number> = {};
      whatsAppConversations.forEach(conv => {
        counts[conv._id] = conv.unreadCount;
      });
      setUnreadCounts(counts);
      

      cacheService.cacheConversations(whatsAppConversations);
      lastApiCall.current = now;
      
    } catch (error) {
      setError('Erro ao atualizar conversas');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);


  useEffect(() => {
    if (currentUserId && conversations.length === 0) {
      refreshConversations();
    }
  }, [currentUserId, conversations.length, refreshConversations]);


  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);

  const activeConversation = conversations.find(c => c._id === activeConversationId) || null;

  return {
    conversations,
    messages,
    activeConversation,
    unreadCounts,
    isConnected,
    isLoading,
    error,
    typingUsers,
    setActiveConversation,
    sendMessage,
    markAsRead,
    setTyping,
    retryFailedMessage,
    refreshConversations
  };
}
