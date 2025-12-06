import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import pollingService from '../services/pollingService';
import { useConversationWebSocket } from '../hooks/useConversationWebSocket';
import { validateConversationArray, ultraSafeFilter, ultraSafeForEach } from '../utils/emergencyArraySafety';
import { messageCache } from '../utils/messageCache';
import websocketService from '../services/websocketService';

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
  isTemporary?: boolean;
  isSending?: boolean;
  hasError?: boolean;
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
  boostingRequest?: string;
}

interface PollingContextType {
  isConnected: boolean;
  conversations: Conversation[];
  activeConversation: string | null;
  messages: Map<string, Message[]>;
  typingUsers: Map<string, string[]>;
  unreadCounts: Map<string, number>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  markAsRead: (conversationId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  createConversation: (participantId: string, boostingRequestId?: string) => Promise<Conversation>;
  getConversationByBoostingRequest: (boostingRequestId: string) => Promise<Conversation | null>;
  refreshConversations: () => Promise<void>;
}

const PollingContext = createContext<PollingContextType | undefined>(undefined);

export const usePolling = () => {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within a PollingProvider');
  }
  return context;
};

export const PollingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const lastMessageIds = useRef<Map<string, string>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());


  const wsConversations = useConversationWebSocket();


  useEffect(() => {
    if (wsConversations.conversations.length > 0) {
      handleConversationsUpdate(wsConversations.conversations as any);
    }
  }, [wsConversations.conversations]);


  useEffect(() => {
    const handleProposalAccepted = (data: any) => {
      
      setConversations(prev => prev.map(conv => {
        if (conv._id === data.conversationId) {
          return {
            ...conv,
            isTemporary: false,
            status: 'accepted',
            boostingStatus: 'in_progress'
          };
        }
        return conv;
      }));
    };
    
    const handleDeliveryConfirmed = (data: any) => {
      
      setConversations(prev => prev.map(conv => {
        if (conv._id === data.conversationId) {
          return {
            ...conv,
            boostingStatus: 'completed',
            isBlocked: data.blocked || true,
            deliveryConfirmedAt: data.confirmedAt
          };
        }
        return conv;
      }));
      

      if (data.blocked) {
        setTimeout(() => {
          setConversations(prev => prev.filter(conv => conv._id !== data.conversationId));
        }, 2000);
      }
    };
    

    websocketService.on('proposal:accepted', handleProposalAccepted);
    websocketService.on('delivery_confirmed', handleDeliveryConfirmed);
    
    return () => {
      websocketService.off('proposal:accepted', handleProposalAccepted);
      websocketService.off('delivery_confirmed', handleDeliveryConfirmed);
    };
  }, [setConversations]);


  useEffect(() => {
    if (user && token) {
      setIsConnected(true);
      initializePolling();
    } else {
      setIsConnected(false);
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [user, token]);


  const initializePolling = async () => {
    try {

      wsConversations.startPolling(Date.now());
      
    } catch (error) {
      

      try {
        const initialConversations = await pollingService.getConversations();
        handleConversationsUpdate(initialConversations);
        pollingService.startConversationPolling(handleConversationsUpdate);
      } catch (fallbackError) {

      }
    }
  };


  const handleConversationsUpdate = (updatedConversations: Conversation[]) => {

    if (typeof updatedConversations === 'string') {
      return;
    }
    
    if (!updatedConversations) {
      return;
    }


    const validConversations = validateConversationArray(updatedConversations);
    


    const byId = new Map<string, Conversation>();
    for (const conv of validConversations) {
      const id = (conv as any)._id?.toString?.() || (conv as any).id || Math.random().toString(36).slice(2);
      const existing = byId.get(id);
      if (!existing) {
        byId.set(id, conv);
      } else {

        const newer = new Date((conv as any).updatedAt || (conv as any).lastMessageAt || 0) >
                      new Date((existing as any).updatedAt || (existing as any).lastMessageAt || 0);
        if (newer) byId.set(id, conv);
      }
    }
    const deduplicatedConversations = Array.from(byId.values());
    
    setConversations(deduplicatedConversations);
    

    const newUnreadCounts = new Map<string, number>();
    ultraSafeForEach<Conversation>(validConversations, (conv) => {
      if (conv && conv._id && conv.unreadCount !== undefined) {
        newUnreadCounts.set(conv._id, conv.unreadCount);
      }
    });
    setUnreadCounts(newUnreadCounts);
  };


  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
      startMessagePolling(activeConversation);
      startTypingPolling(activeConversation);
    } else {
      pollingService.stopMessagePolling('');
      pollingService.stopTypingPolling('');
    }

    return () => {
      if (activeConversation) {
        pollingService.stopMessagePolling(activeConversation);
        pollingService.stopTypingPolling(activeConversation);
      }
    };
  }, [activeConversation]);


  useEffect(() => {
    const handlePusherMessage = (event: CustomEvent) => {
    
      const { message, conversationId } = event.detail;
      
      if (message && conversationId) {
      
        

        handleNewMessages(conversationId, [message]);
        

        setTimeout(() => {
          refreshConversations();
        }, 50);
      }
    };


    window.addEventListener('pusher-message-received', handlePusherMessage as EventListener);
    
    return () => {
      window.removeEventListener('pusher-message-received', handlePusherMessage as EventListener);
    };
  }, []);


  const loadMessages = async (conversationId: string) => {
    try {
      const initialMessages = await pollingService.getMessages(conversationId);
      setMessages(prev => new Map(prev).set(conversationId, initialMessages));
      

      if (initialMessages.length > 0) {
        const lastMessage = initialMessages[initialMessages.length - 1];
        lastMessageIds.current.set(conversationId, lastMessage._id);
      }
    } catch (error) {

    }
  };


  const startMessagePolling = (conversationId: string) => {

    const currentUserId = user?.id || (user as any)?._id;
    if (currentUserId) {
      const cachedMessages = messageCache.loadMessages(conversationId);
      
      if (cachedMessages.length > 0) {


        setMessages(prev => {
          const newMessages = new Map(prev);
          newMessages.set(conversationId, cachedMessages);
          return newMessages;
        });


        const lastCachedMessage = cachedMessages[cachedMessages.length - 1];
        if (lastCachedMessage) {
          lastMessageIds.current.set(conversationId, lastCachedMessage._id);
        }
      }
    }


    setTimeout(() => {
      
      const lastMessageId = lastMessageIds.current.get(conversationId) || null;
      
      pollingService.startMessagePolling(conversationId, lastMessageId, (newMessages) => {
        handleNewMessages(conversationId, newMessages);
      });
    }, 30000);
  };


  const handleNewMessages = (conversationId: string, newMessages: Message[]) => {

    const validNewMessages = validateConversationArray(newMessages);
    
    setMessages(prev => {
      const updatedMessages = new Map(prev);
      const existingMessages = validateConversationArray(updatedMessages.get(conversationId));
      

      const temporaryMessages = existingMessages.filter(m => m.isTemporary);
      const realMessages = existingMessages.filter(m => !m.isTemporary);
      

      const existingIds = new Set(realMessages.map(m => m._id));
      const uniqueNewMessages = ultraSafeFilter<Message>(validNewMessages, (m) => 
        Boolean(m && m._id && !existingIds.has(m._id))
      );


      const currentUserId = user?.id || (user as any)?._id;
      const processedNewMessages = uniqueNewMessages.map(message => {

        const existingMessage = [...temporaryMessages, ...realMessages].find(m => m._id === message._id);
        
        if (existingMessage && (existingMessage.isOwn || existingMessage.fromMe)) {


          return {
            ...message,
            isOwn: existingMessage.isOwn,
            fromMe: existingMessage.fromMe,
            preservedFromCache: true
          } as any;
        }


        const senderId = (message as any).senderId || 
                         message.sender?._id || 
                         (message.sender as any)?.id || 
                         message.sender ||
                         (message as any).userId ||
                         (message as any).from ||
                         (message as any).authorId;

        const isFromCurrentUser = currentUserId && senderId === currentUserId;

        if (isFromCurrentUser) {

          return {
            ...message,
            isOwn: true,
            fromMe: true,
            processedFromBackend: true
          } as any;
        }

        return message;
      });
      
      if (processedNewMessages.length > 0) {
        

        const allMessages = [...temporaryMessages, ...realMessages, ...processedNewMessages];
        

        allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        updatedMessages.set(conversationId, allMessages);
        

        const currentUserId = user?.id || (user as any)?._id;
        if (currentUserId) {
          messageCache.saveMessages(conversationId, allMessages, currentUserId);
        }
        

        const lastMessage = processedNewMessages[processedNewMessages.length - 1];
        if (lastMessage && lastMessage._id) {
          lastMessageIds.current.set(conversationId, lastMessage._id);
        }
      }
      
      return updatedMessages;
    });
  };


  const startTypingPolling = (conversationId: string) => {
    pollingService.startTypingPolling(conversationId, (typingUserIds) => {
      setTypingUsers(prev => new Map(prev).set(conversationId, typingUserIds));
    });
  };


  const sendMessage = async (conversationId: string, content: string) => {
    try {
      

      const frontendMessage = {
        _id: `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversation: conversationId,
        sender: {
          _id: user?.id || (user as any)?._id,
          name: user?.name || 'Você',
          profileImage: (user as any)?.profileImage || undefined
        },
        content: content,
        createdAt: new Date().toISOString(),
        readBy: [],
        deliveredTo: [],

        isOwn: true,
        fromMe: true,
        frontendOnly: true,
        senderId: user?.id || (user as any)?._id
      };
      

      setMessages(prev => {
        const newMessages = new Map(prev);
        const existingMessages = newMessages.get(conversationId) || [];
        const updatedMessages = [...existingMessages, frontendMessage];
        

        updatedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        newMessages.set(conversationId, updatedMessages);
        return newMessages;
      });
      

      const currentUserId = user?.id || (user as any)?._id;
      if (currentUserId) {
        const existingMessages = messageCache.loadMessages(conversationId);
        const allMessages = [...existingMessages, frontendMessage];
        messageCache.saveMessages(conversationId, allMessages, currentUserId);
      }
      

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('pusher-message-received', {
          detail: { message: frontendMessage, conversationId: conversationId }
        }));
      }, 100);
      
    } catch (error) {

      

      setMessages(prev => {
        const newMessages = new Map(prev);
        const conversationMessages = newMessages.get(conversationId) || [];
        
        const updatedMessages = conversationMessages.map(msg => {
          if ((msg as any).frontendOnly && msg.content === content) {
            return { ...msg, hasError: true };
          }
          return msg;
        });
        
        newMessages.set(conversationId, updatedMessages);
        return newMessages;
      });
      
      throw error;
    }
  };


  const markAsRead = async (conversationId: string) => {
    try {
      await pollingService.markAsRead(conversationId);
      

      setUnreadCounts(prev => new Map(prev).set(conversationId, 0));
      

      refreshConversations();
    } catch (error) {

    }
  };


  const setTyping = (conversationId: string, isTyping: boolean) => {

    const existingTimeout = typingTimeouts.current.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeouts.current.delete(conversationId);
    }

    if (isTyping) {

      pollingService.setTypingStatus(conversationId, true);
      

      const timeout = setTimeout(() => {
        pollingService.setTypingStatus(conversationId, false);
        typingTimeouts.current.delete(conversationId);
      }, 3000);
      
      typingTimeouts.current.set(conversationId, timeout);
    } else {
      pollingService.setTypingStatus(conversationId, false);
    }
  };


  const createConversation = async (participantId: string, boostingRequestId?: string) => {
    try {
      const conversation = await pollingService.createConversation(participantId, boostingRequestId);
      

      await refreshConversations();
      
      return conversation;
    } catch (error) {
      throw error;
    }
  };


  const getConversationByBoostingRequest = async (boostingRequestId: string) => {
    try {
      return await pollingService.getConversationByBoostingRequest(boostingRequestId);
    } catch (error) {
      return null;
    }
  };


  const refreshConversations = async () => {
    try {
      const updatedConversations = await pollingService.getConversations();
      handleConversationsUpdate(updatedConversations);
    } catch (error) {

    }
  };


  const cleanup = () => {
    pollingService.cleanup();
    setConversations([]);
    setMessages(new Map());
    setTypingUsers(new Map());
    setUnreadCounts(new Map());
    lastMessageIds.current.clear();
    

    typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
    typingTimeouts.current.clear();
  };

  const contextValue: PollingContextType = {
    isConnected,
    conversations,
    activeConversation,
    messages,
    typingUsers,
    unreadCounts,
    sendMessage,
    setActiveConversation,
    markAsRead,
    setTyping,
    createConversation,
    getConversationByBoostingRequest,
    refreshConversations
  };

  return (
    <PollingContext.Provider value={contextValue}>
      {children}
    </PollingContext.Provider>
  );
};

export default PollingContext;
