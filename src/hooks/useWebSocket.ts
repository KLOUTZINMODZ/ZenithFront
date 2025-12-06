import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';
import cacheService from '../services/cacheService';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMessage, mergeMessages } from '../utils/messageNormalizer';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Message {
  _id: string;
  conversation: string;
  sender: User;
  content: string;
  type: string;
  attachments?: any[];
  readBy?: { user: string; readAt: string }[];
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTemporary?: boolean;
  expiresAt?: string;
  status?: string;
  client?: string;
  booster?: string;
  metadata?: any;
}

interface UseWebSocketReturn {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversation: string | null;
  isConnected: boolean;
  typingUsers: { [conversationId: string]: User[] };
  sendMessage: (conversationId: string, content: string, type?: string, attachments?: any[]) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string, messageIds: string[]) => void;
  openConversation: (conversationId: string) => void;
  closeConversation: (conversationId: string) => void;
  loadMoreMessages: (conversationId: string, before?: string) => void;
  refreshConversations: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { user } = useAuth();

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: User[] }>({});
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeConversationRef = useRef<string | null>(null);
  const cacheLoadedRef = useRef<boolean>(false);
  const pendingMessages = useRef<any[]>([]);

  useEffect(() => {
    if (!token || !user) return;


    const loadFromCache = () => {
        if (!user?.id) return;
        const cachedConversations = cacheService.getCachedConversations(user.id);
        if (cachedConversations && cachedConversations.length > 0) {
            setConversations(cachedConversations);

            const allCachedMessages: { [conversationId: string]: Message[] } = {};
            cachedConversations.forEach(conv => {
                const msgs = cacheService.getCachedMessages(conv._id);
                if (msgs && msgs.length > 0) {
                    allCachedMessages[conv._id] = msgs;
                }
            });
            setMessages(allCachedMessages);
        }
    };

    loadFromCache();
    cacheLoadedRef.current = true;


    setTimeout(() => {
      if (pendingMessages.current.length > 0) {
        const messagesToProcess = [...pendingMessages.current];
        pendingMessages.current = [];
        
        messagesToProcess.forEach(msg => {
          if (msg.type === 'new') {
            handleNewMessage(msg.data);
          } else if (msg.type === 'offline') {
            handleOfflineMessages(msg.data);
          }
        });
      }
    }, 100);


    const connectWebSocket = async () => {
      try {
        await websocketService.connect({ token });
      } catch (error) {
      }
    };

    connectWebSocket();


    const handleConnected = () => {
      setIsConnected(true);

      websocketService.getConversations();
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleNewMessage = (data: any) => {
      
      requestAnimationFrame(() => {
        if (!cacheLoadedRef.current) {
          pendingMessages.current.push({ type: 'new', data });
          return;
        }
        
        const { message, conversationId } = data;
        
        const normalizedMsg = normalizeMessage(message);
        if (!normalizedMsg) {
          return;
        }

        
        setMessages(prev => {
          const prevArr = prev[conversationId] || [];
          const updatedArr = mergeMessages(prevArr, [normalizedMsg]);
          
          
          requestIdleCallback(() => {
            try { cacheService.cacheMessages(conversationId, updatedArr, 'server'); } catch {}
          });
          
          return { ...prev, [conversationId]: updatedArr };
        });

        setConversations(prev => prev.map(conv => {
          if (conv._id !== conversationId) return conv;
          const isActive = conversationId === activeConversationRef.current;
          const currentUnread = conv.unreadCount || 0;
          return {
            ...conv,
            lastMessage: message,
            lastMessageAt: (message as any).createdAt,
            unreadCount: isActive ? 0 : currentUnread + 1
          };
        }));

        
        if (message._id) {
          setTimeout(() => {
            websocketService.emit('message:ack', {
              conversationId,
              messageIds: [message._id],
              type: 'new'
            });
          }, 0);
        }

        window.dispatchEvent(new CustomEvent('new-message', {
          detail: { message, conversationId }
        }));
      });
    };

    const handleMessageSent = (data: any) => {
      
      requestAnimationFrame(() => {
        const { message, tempId } = data;
        const { conversation: conversationId } = message;

        if (!tempId) {
          handleNewMessage(data);
          return;
        }

        setMessages(prev => {
          const conversationMessages = prev[conversationId] || [];
          const updatedMessages = conversationMessages.map(m => 
            m._id === tempId ? message : m
          );
          
          if (!conversationMessages.some(m => m._id === tempId) && !conversationMessages.some(m => m._id === message._id)) {
              updatedMessages.push(message);
          }

          
          requestIdleCallback(() => {
            cacheService.cacheMessages(conversationId, updatedMessages, 'server');
          });
          
          return { ...prev, [conversationId]: updatedMessages };
        });

        setConversations(prev => prev.map(conv => {
          if (conv._id !== conversationId) return conv;
          return { ...conv, lastMessage: message, lastMessageAt: message.createdAt };
        }));
      });
    };

    const handleTyping = (data: any) => {
      const { userId, conversationId, isTyping } = data;
      if (conversationId !== activeConversation) return;

      const timeoutKey = `${conversationId}:${userId}`;

      setTypingUsers(prev => {
        const current = prev[conversationId] || [];
        let updated: User[] = current;


        const existingTimeout = typingTimeouts.current.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        if (isTyping) {

          if (!current.some(u => u._id === userId)) {
            updated = [...current, { _id: userId, name: '', email: '' }];
          }


          const timeout = setTimeout(() => {
            setTypingUsers(prev2 => {
              const arr = prev2[conversationId] || [];
              const filtered = arr.filter(u => u._id !== userId);
              return { ...prev2, [conversationId]: filtered };
            });
            typingTimeouts.current.delete(timeoutKey);
          }, 3000);

          typingTimeouts.current.set(timeoutKey, timeout);
        } else {

          updated = current.filter(u => u._id !== userId);
          typingTimeouts.current.delete(timeoutKey);
        }

        return { ...prev, [conversationId]: updated };
      });
    };

    const handleMessageRead = (data: any) => {
      const { messageIds, userId, conversationId } = data;
      setMessages(prev => {
        const next = { ...prev } as { [conversationId: string]: Message[] };
        const updateConv = (cid: string) => {
          const arr = next[cid];
          if (!arr) return;
          next[cid] = arr.map(msg => {
            if (messageIds.includes(msg._id)) {
              const readBy = msg.readBy || [];
              if (!readBy.some(r => r.user === userId)) {
                return {
                  ...msg,
                  readBy: [...readBy, { user: userId, readAt: new Date().toISOString() }]
                };
              }
            }
            return msg;
          });
        };
        if (conversationId) updateConv(conversationId); else Object.keys(next).forEach(updateConv);
        return next;
      });
    };

    const handlePendingMessages = useCallback((data: any) => {
      const { conversationId } = data;
      if (data.messages && Array.isArray(data.messages) && conversationId) {
        setMessages(prev => {
          const prevArr = prev[conversationId] || [];
          const merged = [...prevArr];
          data.messages.forEach((msg: any) => {
            if (!merged.some(m => m._id === msg._id)) {
              merged.push(msg);
            }
          });
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          try { cacheService.cacheMessages(conversationId, merged, 'server'); } catch {}
          return { ...prev, [conversationId]: merged };
        });


        setConversations(prev => prev.map(conv => (
          conv._id === conversationId
            ? { ...conv, lastMessage: data.messages[data.messages.length - 1], lastMessageAt: data.messages[data.messages.length - 1]?.createdAt }
            : conv
        )));
      }
    }, []);

    const handleOfflineMessages = useCallback((data: any) => {
      
      requestAnimationFrame(() => {
        if (!cacheLoadedRef.current) {
          pendingMessages.current.push({ type: 'offline', data });
          return;
        }
        
        const { conversationId } = data;
        if (data.messages && Array.isArray(data.messages) && conversationId) {
          const normalized = data.messages
            .map((item: any) => normalizeMessage(item))
            .filter((msg: any): msg is NonNullable<typeof msg> => msg !== null);

          setMessages(prev => {
            const prevArr = prev[conversationId] || [];
            const merged = mergeMessages(prevArr, normalized);
            
            
            requestIdleCallback(() => {
              try { cacheService.cacheMessages(conversationId, merged, 'server'); } catch {}
            });
            
            return { ...prev, [conversationId]: merged };
          });

          setConversations(prev => 
            prev.map(conv => 
              conv._id === conversationId
                ? { ...conv, lastMessage: normalized[normalized.length - 1], lastMessageAt: normalized[normalized.length - 1]?.createdAt }
                : conv
            )
          );

          
          const messageIds = normalized.map((msg: any) => msg._id).filter(Boolean);
          if (messageIds.length > 0) {
            setTimeout(() => {
              websocketService.emit('message:ack', {
                conversationId,
                messageIds,
                type: 'offline_recovery'
              });
            }, 0);
          }
        }
      });
    }, []);

    const handleConversationList = useCallback((data: any) => {
      
      requestAnimationFrame(() => {
        const processedConversations = data.map((conv: any) => ({
          ...conv,
          unreadCount: conv.unreadCount || 0
        }));
        
        setConversations(processedConversations);
        
        
        if (user?.id) {
          requestIdleCallback(() => {
            cacheService.cacheConversations(user.id, processedConversations, 'server');
          });
        }
      });
    }, [user]);

    const handleMessageHistory = (data: any) => {
      const { conversationId, messages: history } = data;
      

      if (history && history.length > 0) {
        cacheService.cacheMessages(conversationId, history, 'server');
      }
      
      setMessages(prev => ({
        ...prev,
        [conversationId]: history || []
      }));
    };

    const handleConversationOpened = (data: any) => {
      setActiveConversation(data.conversationId);
    };

    const handleConversationClosed = (data: any) => {
      if (activeConversation === data.conversationId) {
        setActiveConversation(null);
      }
    };

    const handleError = (_error: any) => {
    };


    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('message:new', handleNewMessage);
    websocketService.on('message:sent', handleMessageSent);
    const typingStartHandler = (d: any) => handleTyping({ ...d, isTyping: true });
    const typingStopHandler = (d: any) => handleTyping({ ...d, isTyping: false });
    websocketService.on('user:typing', typingStartHandler);
    websocketService.on('user:stopped_typing', typingStopHandler);
    websocketService.on('message:read', handleMessageRead);
    websocketService.on('message:pending', handlePendingMessages);
    websocketService.on('message:offline_batch', handleOfflineMessages);
    websocketService.on('message:offline_recovery', handleOfflineMessages);
    websocketService.on('conversation:list', handleConversationList);
    websocketService.on('message:history', handleMessageHistory);
    websocketService.on('conversation:opened', handleConversationOpened);
    websocketService.on('conversation:closed', handleConversationClosed);
    websocketService.on('error', handleError);


    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('message:new', handleNewMessage);
      websocketService.off('message:sent', handleMessageSent);
      websocketService.off('user:typing', typingStartHandler);
      websocketService.off('user:stopped_typing', typingStopHandler);
      websocketService.off('message:read', handleMessageRead);
      websocketService.off('message:pending', handlePendingMessages);
      websocketService.off('message:offline_batch', handleOfflineMessages);
      websocketService.off('message:offline_recovery', handleOfflineMessages);
      websocketService.off('conversation:list', handleConversationList);
      websocketService.off('message:history', handleMessageHistory);
      websocketService.off('conversation:opened', handleConversationOpened);
      websocketService.off('conversation:closed', handleConversationClosed);
      websocketService.off('error', handleError);
      

      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
      
      websocketService.disconnect();
    };
  }, [token, user]);


  useEffect(() => {
    activeConversationRef.current = activeConversation;
    if (activeConversation) {
      websocketService.getMessageHistory(activeConversation);
    }
  }, [activeConversation]);

  const sendMessage = useCallback((conversationId: string, content: string, type: string = 'text', attachments: any[] = []) => {
    if (!user) return;


    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      conversation: conversationId,
      sender: {
        _id: user.id,
        name: user.name,
        avatar: user.avatar,
      } as User,
      content,
      type,
      attachments: attachments || [],
      createdAt: new Date().toISOString(),

      ...( { status: 'pending' } as any)
    };


    setMessages(prev => {
      const updatedMessages = [...(prev[conversationId] || []), tempMessage];
      cacheService.cacheMessages(conversationId, updatedMessages, 'local');
      return { ...prev, [conversationId]: updatedMessages };
    });


    websocketService.sendMessage(conversationId, content, type, attachments, tempId);

  }, [user]);

  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    websocketService.sendTypingIndicator(conversationId, isTyping);
  }, []);

  const markAsRead = useCallback((conversationId: string, messageIds: string[]) => {
    websocketService.markMessagesAsRead(conversationId, messageIds);
  }, []);

  const openConversation = useCallback((conversationId: string) => {
    setActiveConversation(conversationId);
    websocketService.openConversation(conversationId);
  }, []);

  const closeConversation = useCallback((conversationId: string) => {
    websocketService.closeConversation(conversationId);
  }, []);

  const loadMoreMessages = useCallback((conversationId: string, before?: string) => {
    websocketService.getMessageHistory(conversationId, 50, before);
  }, []);

  const refreshConversations = useCallback(() => {
    websocketService.getConversations();
  }, []);

  return {
    isConnected,
    conversations,
    messages,
    activeConversation,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    openConversation,
    closeConversation,
    loadMoreMessages,
    refreshConversations
  };
};
