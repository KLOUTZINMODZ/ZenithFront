import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from './useWebSocket';
import chatCacheService from '../services/chatCacheService';
import api from '../services/api';

interface OptimizedMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  conversation: string;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOwn: boolean;
  tempId?: string;
}

interface OptimizedConversation {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: OptimizedMessage;
  unreadCount: number;
  updatedAt: string;
  isOnline?: boolean;
  name?: string;
}

interface UseChatOptimizedReturn {

  conversations: OptimizedConversation[];
  messages: OptimizedMessage[];
  activeConversation: OptimizedConversation | null;
  

  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  

  setActiveConversation: (conversationId: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => void;
  refreshConversations: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  

  typingUsers: string[];
  setTyping: (isTyping: boolean) => void;
  

  cacheStats: any;
}


export function useChatOptimized(): UseChatOptimizedReturn {
  const { user } = useAuth();
  const { isConnected, sendMessage: wsSendMessage } = useWebSocket();
  

  const [conversations, setConversations] = useState<OptimizedConversation[]>([]);
  const [messages, setMessages] = useState<OptimizedMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [cacheStats, setCacheStats] = useState<any>({});
  

  const lastApiCall = useRef<number>(0);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = user?.id || (user as any)?._id || '';


  useEffect(() => {
    if (currentUserId) {
      chatCacheService.initializeCache(currentUserId);
      loadCachedData();
      updateCacheStats();
    }
  }, [currentUserId]);


  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.message) {
        handleIncomingMessage(detail.message);
      }
    };

    const handleDeliveryStatus = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.messageId && detail?.status) {
        updateMessageStatus(detail.messageId, detail.status);
      }
    };

    const handleTyping = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.userId && detail?.isTyping !== undefined) {
        handleTypingIndicator(detail.userId, detail.isTyping);
      }
    };

    window.addEventListener('new-message', handleNewMessage);
    window.addEventListener('delivery-status', handleDeliveryStatus);
    window.addEventListener('typing-indicator', handleTyping);

    return () => {
      window.removeEventListener('new-message', handleNewMessage);
      window.removeEventListener('delivery-status', handleDeliveryStatus);
      window.removeEventListener('typing-indicator', handleTyping);
    };
  }, [activeConversationId, currentUserId]);


  const loadCachedData = useCallback(() => {
    try {

      const cachedConversations = chatCacheService.getCachedConversations();
      if (cachedConversations.length > 0) {
        setConversations(cachedConversations.map(processConversation));
      }


      if (activeConversationId) {
        const cachedMessages = chatCacheService.getCachedMessages(activeConversationId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages.map(processMessage));
        }
      }
    } catch (error) {
    }
  }, [activeConversationId, currentUserId]);

  const updateCacheStats = useCallback(() => {
    setCacheStats(chatCacheService.getCacheStats());
  }, []);


  const processMessage = useCallback((message: any): OptimizedMessage => {
    const isOwn = message.sender?._id === currentUserId || message.sender === currentUserId;
    
    return {
      _id: message._id || message.id,
      content: message.content,
      sender: {
        _id: message.sender?._id || message.sender,
        name: isOwn ? 'You' : (message.sender?.name || 'User'),
        profileImage: message.sender?.profileImage
      },
      conversation: message.conversation,
      createdAt: message.createdAt,
      readBy: message.readBy || [],
      deliveredTo: message.deliveredTo || [],
      status: message.status || (isOwn ? 'sent' : 'delivered'),
      isOwn,
      tempId: message.tempId
    };
  }, [currentUserId]);

  const processConversation = useCallback((conversation: any): OptimizedConversation => {

    const otherParticipant = conversation.participants?.find((p: any) => 
      (p.user?._id || p._id) !== currentUserId
    );

    const displayName = conversation.name || 
                       otherParticipant?.user?.name || 
                       otherParticipant?.name || 
                       'Chat';

    return {
      _id: conversation._id,
      participants: conversation.participants || [],
      lastMessage: conversation.lastMessage ? processMessage(conversation.lastMessage) : undefined,
      unreadCount: conversation.unreadCount || 0,
      updatedAt: conversation.updatedAt,
      isOnline: conversation.isOnline,
      name: displayName
    };
  }, [currentUserId, processMessage]);


  const shouldMakeApiCall = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall.current;
    const minInterval = 5000;

    return timeSinceLastCall > minInterval || !chatCacheService.isCacheValid();
  }, []);

  const refreshConversations = useCallback(async (): Promise<void> => {
    if (!shouldMakeApiCall()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      lastApiCall.current = Date.now();

      const response = await api.get('/api/v1/conversations');
      const fetchedConversations = response.data?.conversations || [];


      const processedConversations = fetchedConversations.map(processConversation);
      setConversations(processedConversations);
      chatCacheService.cacheConversations(processedConversations);

      updateCacheStats();
    } catch (error: any) {
      setError(error.message || 'Failed to load conversations');
      

      loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [shouldMakeApiCall, processConversation, loadCachedData]);

  const refreshMessages = useCallback(async (): Promise<void> => {
    if (!activeConversationId || !shouldMakeApiCall()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      lastApiCall.current = Date.now();

      const response = await api.get(`/api/v1/conversations/${activeConversationId}/messages`);
      const fetchedMessages = response.data?.messages || [];


      const processedMessages = fetchedMessages.map(processMessage);
      setMessages(processedMessages);
      chatCacheService.cacheMessages(activeConversationId, processedMessages);

      updateCacheStats();
    } catch (error: any) {
      setError(error.message || 'Failed to load messages');
      

      const cachedMessages = chatCacheService.getCachedMessages(activeConversationId);
      setMessages(cachedMessages.map(processMessage));
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, shouldMakeApiCall, processMessage]);


  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!activeConversationId || !content.trim()) return;

    try {

      const tempId = chatCacheService.addOptimisticMessage(
        activeConversationId,
        content.trim(),
        currentUserId
      );


      const optimisticMessage: OptimizedMessage = {
        _id: '',
        tempId,
        content: content.trim(),
        sender: {
          _id: currentUserId,
          name: 'You',
          profileImage: user?.profileImage
        },
        conversation: activeConversationId,
        createdAt: new Date().toISOString(),
        readBy: [],
        deliveredTo: [],
        status: 'sending',
        isOwn: true
      };

      setMessages(prev => [...prev, optimisticMessage]);


      if (isConnected) {
        wsSendMessage(activeConversationId, content.trim(), 'text');
      } else {

        const response = await api.post(`/api/v1/conversations/${activeConversationId}/messages`, {
          content: content.trim(),
          type: 'text'
        });


        if (response.data?.message) {
          chatCacheService.confirmOptimisticMessage(
            activeConversationId,
            tempId,
            processMessage(response.data.message)
          );
          

          setMessages(prev => prev.map(msg => 
            msg.tempId === tempId 
              ? { ...processMessage(response.data.message), isOwn: true }
              : msg
          ));
        }
      }

    } catch (error: any) {
      

      if (activeConversationId) {
        setMessages(prev => prev.map(msg => 
          msg.status === 'sending' && msg.isOwn
            ? { ...msg, status: 'failed' }
            : msg
        ));
      }
      
      setError(error.message || 'Failed to send message');
    }
  }, [activeConversationId, currentUserId, user, isConnected, wsSendMessage, processMessage]);

  const handleIncomingMessage = useCallback((messageData: any) => {
    const processedMessage = processMessage(messageData);
    

    chatCacheService.addMessageToCache(processedMessage.conversation, processedMessage);
    

    if (processedMessage.conversation === activeConversationId) {
      setMessages(prev => {

        const exists = prev.some(m => m._id === processedMessage._id);
        return exists ? prev : [...prev, processedMessage];
      });
    }


    setConversations(prev => prev.map(conv => {
      if (conv._id === processedMessage.conversation) {
        return {
          ...conv,
          lastMessage: processedMessage,
          updatedAt: processedMessage.createdAt,
          unreadCount: processedMessage.isOwn ? conv.unreadCount : conv.unreadCount + 1
        };
      }
      return conv;
    }));

  }, [activeConversationId, processMessage]);

  const updateMessageStatus = useCallback((messageId: string, status: OptimizedMessage['status']) => {
    if (!activeConversationId) return;


    chatCacheService.updateMessageStatus(activeConversationId, messageId, status);
    

    setMessages(prev => prev.map(msg => 
      (msg._id === messageId || msg.tempId === messageId)
        ? { ...msg, status }
        : msg
    ));
  }, [activeConversationId]);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (!activeConversationId || messageIds.length === 0) return;

    try {

      if (isConnected) {
        wsSendMessage(activeConversationId, JSON.stringify({
          type: 'mark_read',
          messageIds
        }), 'system');
      }


      messageIds.forEach(messageId => {
        updateMessageStatus(messageId, 'read');
      });

    } catch (error) {
    }
  }, [activeConversationId, isConnected, wsSendMessage, updateMessageStatus]);


  const setTyping = useCallback((isTyping: boolean) => {
    if (!activeConversationId || !isConnected) return;

    try {
      wsSendMessage(activeConversationId, JSON.stringify({
        type: 'typing',
        isTyping
      }), 'system');


      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }


      if (isTyping) {
        typingTimeout.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    } catch (error) {
    }
  }, [activeConversationId, isConnected, wsSendMessage]);

  const handleTypingIndicator = useCallback((userId: string, isTyping: boolean) => {
    if (userId === currentUserId) return;

    setTypingUsers(prev => {
      if (isTyping) {
        return prev.includes(userId) ? prev : [...prev, userId];
      } else {
        return prev.filter(id => id !== userId);
      }
    });


    if (isTyping) {
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }, 5000);
    }
  }, [currentUserId]);


  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    setMessages([]);
    setTypingUsers([]);
    setError(null);

    if (conversationId) {

      const cachedMessages = chatCacheService.getCachedMessages(conversationId);
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages.map(processMessage));
      }


      refreshMessages();
    }
  }, [processMessage, refreshMessages]);


  const activeConversation = conversations.find(c => c._id === activeConversationId) || null;


  useEffect(() => {
    if (currentUserId) {
      refreshConversations();
    }
  }, [currentUserId, refreshConversations]);

  return {

    conversations,
    messages,
    activeConversation,
    

    isConnected,
    isLoading,
    error,
    

    setActiveConversation,
    sendMessage,
    markAsRead,
    refreshConversations,
    refreshMessages,
    

    typingUsers,
    setTyping,
    

    cacheStats
  };
}
