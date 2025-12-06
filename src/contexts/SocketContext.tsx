import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import realtimeMessageService from '../services/realtimeMessageService';

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
}

interface TypingUser {
  userId: string;
  user: {
    name: string;
    profileImage?: string;
  };
}

interface SocketContextType {
  socket: any;
  isConnected: boolean;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: Map<string, TypingUser>;
  unreadCounts: Map<string, number>;
  

  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, attachments?: string[]) => Promise<void>;
  markAsRead: (conversationId: string, messageIds?: string[]) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  loadConversations: () => void;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  createConversation: (participantId: string, metadata?: any) => Promise<Conversation>;
  

  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  reconnectWebSocket: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [unreadCounts] = useState<Map<string, number>>(new Map());
  const [isConnected, setIsConnected] = useState(false);


  
  useEffect(() => {
    return () => {
      
      try {
        realtimeMessageService.disconnect();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (user) {

      realtimeMessageService.connect();
      

      const unsubscribeConnection = realtimeMessageService.onConnectionStatus(setIsConnected);
      

      const unsubscribeConversations = realtimeMessageService.onConversationUpdate((newConversations) => {
        setConversations(newConversations);
      });

      return () => {
        unsubscribeConnection();
        unsubscribeConversations();
      };
    } else {

      realtimeMessageService.disconnect();
      setIsConnected(false);
      setConversations([]);
      setMessages([]);
    }
  }, [user]);


  const loadConversations = useCallback(() => {
    if (isConnected) {
      realtimeMessageService.requestConversationList();
    } else {
    }
  }, [isConnected]);


  const loadMessages = useCallback((conversationId: string): Promise<Message[]> => {
    return new Promise((resolve) => {
      if (isConnected) {
        

        const unsubscribe = realtimeMessageService.onMessageHistory((messages: Message[]) => {
          setMessages(messages);
          unsubscribe();
          resolve(messages);
        });
        

        realtimeMessageService.requestMessageHistory(conversationId);
      } else {
        resolve([]);
      }
    });
  }, [isConnected]);

  const joinConversation = useCallback((conversationId: string) => {

    const conversation = conversations.find(c => c && c._id && typeof c._id === 'string' && c._id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      loadMessages(conversationId);
      unreadCounts.delete(conversationId);
    }
  }, [conversations, loadMessages]);

  const leaveConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    typingUsers.clear();
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://zenith.enrelyugi.com.br/api/v1';
      const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.data.message]);
      }
    } catch (error) {
    }
  }, []);

  const createConversation = useCallback(async (participantId: string, metadata?: any): Promise<Conversation> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const API_URL = import.meta.env.VITE_API_URL || 'https://zenith.enrelyugi.com.br/api/v1';
    const response = await fetch(`${API_URL}/api/messages/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participantId,
        metadata
      })
    });

    if (response.ok) {
      const data = await response.json();
      const conversation = data.data.conversation;
      
      setConversations(prev => {

        const exists = prev.find(c => c && c._id && typeof c._id === 'string' && c._id === conversation._id);
        if (!exists) {
          return [conversation, ...prev];
        }
        return prev;
      });
      
      return conversation;
    }
    
    throw new Error('Failed to create conversation');
  }, []);


  const connectWebSocket = useCallback(() => {
    realtimeMessageService.connect();
  }, []);

  const disconnectWebSocket = useCallback(() => {
    realtimeMessageService.disconnect();
  }, []);

  const reconnectWebSocket = useCallback(() => {
    realtimeMessageService.reconnect();
  }, []);

  const value: SocketContextType = {
    socket: null,
    isConnected,
    conversations,
    currentConversation,
    messages,
    typingUsers,
    unreadCounts,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead: () => {},
    startTyping: () => {},
    stopTyping: () => {},
    loadConversations,
    loadMessages,
    createConversation,
    connectWebSocket,
    disconnectWebSocket,
    reconnectWebSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
