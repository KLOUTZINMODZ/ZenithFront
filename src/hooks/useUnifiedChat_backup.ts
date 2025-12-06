import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocketService';
import pollingService from '../services/pollingService';
import { localStorageService, type StoredMessage } from '../services/localStorageService';


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
  createdAt: string;
  readBy: string[];
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
  unreadCount: number;
  isOnline?: boolean;
  name?: string;
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


class MessageDeduplicator {
  private processedMessages = new Set<string>();
  private tempIdToRealId = new Map<string, string>();
  
  generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  isDuplicate(message: Message): boolean {

    if (message._id && this.processedMessages.has(message._id)) {
      return true;
    }
    

    if (message.tempId && this.tempIdToRealId.has(message.tempId)) {
      return true;
    }
    
    return false;
  }
  
  markAsProcessed(message: Message): void {
    if (message._id) {
      this.processedMessages.add(message._id);
    }
    
    if (message.tempId && message._id) {
      this.tempIdToRealId.set(message.tempId, message._id);
    }
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

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [tempId] of this.tempIdToRealId) {
      const timestamp = parseInt(tempId.split('_')[1]);
      if (timestamp < oneHourAgo) {
        const realId = this.tempIdToRealId.get(tempId);
        if (realId) {
          this.processedMessages.delete(realId);
        }
        this.tempIdToRealId.delete(tempId);
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
    
    for (const [tempId, entry] of this.retryQueue) {
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
  const retrySystem = useRef(new MessageRetrySystem());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  

  const retryInterval = useRef<NodeJS.Timeout>();
  const cleanupInterval = useRef<NodeJS.Timeout>();
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  


  
  const getCurrentUserId = useCallback((): string => {
    return user?.id || user?._id || (user as any)?.userId || '';
  }, [user]);
  
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
  


  
  const updateState = useCallback((updater: (prevState: ChatState) => ChatState) => {
    setState(prevState => {
      const newState = updater(prevState);
      

      persistence.current.saveConversationState(newState.conversations);
      if (newState.activeConversation !== prevState.activeConversation) {
        persistence.current.saveActiveConversation(newState.activeConversation);
      }
      
      return newState;
    });
  }, []);
  
  const addMessage = useCallback((conversationId: string, message: Message) => {
      content: message.content?.substring(0, 20) + '...',
      status: message.status,
        retrySystem.current.removeFromRetryQueue(message.tempId);
      } else {

        updatedMessages = [...conversationMessages, message];
      }
    } else {

      updatedMessages = [...conversationMessages, message];
    }

    newMessages.set(conversationId, updatedMessages);


    syncStateWithStorage(conversationId, updatedMessages);


    const updatedConversations = prevState.conversations.map(conv => {
      if (conv._id === conversationId) {
        return {
          ...conv,
          lastMessage: message,
          lastMessageAt: message.createdAt
        };
      }
      return conv;
    });

    return {
      ...prevState,
      messages: newMessages,
      conversations: updatedConversations
    };
  });
}, [updateState, isOwnMessage, syncStateWithStorage]);


const loadConversationMessages = useCallback(async (conversationId: string) => {
  try {

    const storedMessages = localStorageService.loadConversationMessages(conversationId);

    if (storedMessages.length > 0) {

      updateState(prevState => {
        const newMessages = new Map(prevState.messages);


        const sortedMessages = storedMessages.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        newMessages.set(conversationId, sortedMessages as Message[]);

        return {
          ...prevState,
          messages: newMessages
        };
      });
    }


    if (state.connectionMode === 'websocket' || state.connectionMode === 'hybrid') {
      websocketService.loadMessages(conversationId);
    } else {
      const apiMessages = await pollingService.getMessages(conversationId);
      if (apiMessages && apiMessages.length > 0) {

        updateState(prevState => {
          const newMessages = new Map(prevState.messages);
          const currentMessages = newMessages.get(conversationId) || [];


          const existingIds = new Set(currentMessages.map(m => m._id));


          const newApiMessages = apiMessages.filter(msg => !existingIds.has(msg._id));

          if (newApiMessages.length > 0) {
            const allMessages = [...currentMessages, ...newApiMessages];
            allMessages.sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            newMessages.set(conversationId, allMessages);


            syncStateWithStorage(conversationId, allMessages);
          }

          return {
            ...prevState,
            messages: newMessages
          };
        });
      }
    }
  } catch (error) {
  }
}, [state.connectionMode, updateState, syncStateWithStorage]);


const syncConversationMessages = useCallback(async (conversationId: string) => {

  if (syncInProgress.current.has(conversationId)) {
    return;
  }

  syncInProgress.current.add(conversationId);

  try {


    const apiMessages = await pollingService.getMessages(conversationId);

    if (apiMessages && apiMessages.length > 0) {
      updateState(prevState => {
        const newMessages = new Map(prevState.messages);
        const currentMessages = newMessages.get(conversationId) || [];


        const currentMessagesMap = new Map();
        currentMessages.forEach(msg => {
          if (msg._id) currentMessagesMap.set(msg._id, msg);
          if (msg.tempId) currentMessagesMap.set(msg.tempId, msg);
        });


        const mergedMessages = [...currentMessages];

        apiMessages.forEach((apiMsg: any) => {
          const existingMsg = currentMessagesMap.get(apiMsg._id) ||
            (apiMsg.tempId && currentMessagesMap.get(apiMsg.tempId));

          if (!existingMsg) {

            mergedMessages.push({
              ...apiMsg,
              status: apiMsg.status || 'delivered',
              isTemporary: false
            });
          } else {

            const existingIndex = mergedMessages.findIndex(m =>
              m._id === apiMsg._id ||
              (m.tempId && apiMsg.tempId && m.tempId === apiMsg.tempId)
            );

            if (existingIndex !== -1 && !mergedMessages[existingIndex].isTemporary) {
              mergedMessages[existingIndex] = {
                ...mergedMessages[existingIndex],
                ...apiMsg,
                status: apiMsg.status || mergedMessages[existingIndex].status,
                isTemporary: false
              };
            }
          }
        });


        const uniqueMessages = mergedMessages.filter((msg, index, arr) =>
          arr.findIndex(m =>
            m._id === msg._id ||
            (m.tempId && msg.tempId && m.tempId === msg.tempId)
          ) === index
        );

        uniqueMessages.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        newMessages.set(conversationId, uniqueMessages);


        const messagesToStore = uniqueMessages.filter(m =>
          !m.isTemporary &&
          m.status !== 'sending' &&
          m._id
        );

        if (messagesToStore.length > 0) {
          localStorageService.saveConversationMessages(
            conversationId,
            messagesToStore as StoredMessage[]
          );
        }


        return {
          ...prevState,
          messages: newMessages
        };
      });
    }
  } catch (error) {
  } finally {
    syncInProgress.current.delete(conversationId);
  }
}, [updateState]);


const handleMessageSent = (data: any) => {
  const { message, conversationId } = data;
  if (!message || !conversationId) return;

  if (deduplicator.current.isDuplicate(message)) return;
  deduplicator.current.markAsProcessed(message);

  updateState(prevState => {
    const newMessages = new Map(prevState.messages);
    const conversationMessages = newMessages.get(conversationId) || [];
    let updatedMessages: Message[];


    const tempMessageIndex = conversationMessages.findIndex(m =>
      m.isTemporary &&
      m.content === message.content &&
      isOwnMessage(m) &&
      m.status === 'sending'
    );

    if (tempMessageIndex !== -1) {

      const realMessage: Message = {
        ...message,
        status: 'sent',
        isTemporary: false,
        tempId: conversationMessages[tempMessageIndex].tempId
      };

      updatedMessages = [...conversationMessages];
      updatedMessages[tempMessageIndex] = realMessage;


      retrySystem.current.removeFromRetryQueue(realMessage.tempId);
    } else {

      const realMessage: Message = {
        ...message,
        status: 'sent',
        isTemporary: false
      };

      updatedMessages = [...conversationMessages, realMessage];
    }

    newMessages.set(conversationId, updatedMessages);


    syncStateWithStorage(conversationId, updatedMessages);

    return {
      ...prevState,
      messages: newMessages
    };
  });


  window.dispatchEvent(new CustomEvent('message-sent-confirmation', {
    detail: { message, conversationId }
  }));
};


return {

  isConnected: state.isConnected,
  conversations: state.conversations,
  messages: state.messages,
  activeConversation: state.activeConversation,
  typingUsers: state.typingUsers,
  unreadCounts: state.unreadCounts,
  connectionMode: state.connectionMode,


  sendMessage,
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


  clearStoredMessages,

  exportStoredMessages,
  importStoredMessages,
  syncStateWithStorage,
  loadMessagesFromStorage,


  validateAndRecoverMessages: (conversationId?: string) => {
    if (conversationId) {
      validateAndRecoverMessages(conversationId);
    } else if (state.activeConversation) {
      validateAndRecoverMessages(state.activeConversation);
    }
  },
  forceSync: (conversationId?: string) => {
    const targetConversation = conversationId || state.activeConversation;
    if (targetConversation) {
      syncConversationMessages(targetConversation);
    }
  },


  isOwnMessage,
  getCurrentUserId
      }
    },
    

    isOwnMessage,
    getCurrentUserId
  };
};

export default useUnifiedChat;
