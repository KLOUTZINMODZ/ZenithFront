import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Notification, NotificationType } from '../types';
import { notificationService } from '../services';
import notificationSSEService from '../services/notificationSSEService';
import notificationWebSocketService from '../services/notificationWebSocketService';
import { useAuth } from './AuthContext';
import realtimeMessageService from '../services/realtimeMessageService';
import { limitArraySize, ARRAY_LIMITS } from '../utils/arrayHelpers';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};


const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Bem-vindo ao Zenith!',
    message: 'Obrigado por se juntar à maior comunidade de games do Brasil.',
    type: 'info',
    isRead: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  }
];

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]); 
  const [toastQueue, setToastQueue] = useState<Notification[]>([]); 
  const MAX_VISIBLE_TOASTS = 3;
  
  
  const recentNotificationsCache = React.useRef<Map<string, number>>(new Map());
  const DEDUPLICATION_WINDOW_MS = 5000; 
  
  
  const processedTransactionsCache = React.useRef<Set<string>>(new Set());
  
  
  const genId = (): string => {
    try {
      
      if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
        return (crypto as any).randomUUID();
      }
    } catch {}
    
    return `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };
  

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token && user) {
          const response = await notificationService.getNotifications();
          
          // Mapear as notificações da API para o formato esperado pelo componente
          const mappedNotifications = (response.data?.notifications || []).map(notification => {
            // Garantir que os campos id e timestamp existam
            return {
              id: notification.id || notification._id || genId(), // Usar _id da API como id se não houver id
              _id: notification._id,
              title: notification.title,
              message: notification.message,
              type: notification.type as NotificationType,
              isRead: notification.isRead,
              timestamp: notification.timestamp || notification.createdAt, // Usar createdAt como timestamp
              createdAt: notification.createdAt,
              updatedAt: notification.updatedAt,
              link: notification.link,
              image: notification.image,
              meta: notification.meta,
              relatedId: notification.relatedId,
              relatedType: notification.relatedType
            };
          });

          setNotifications(mappedNotifications);
        } else {

          setNotifications(mockNotifications);
        }
      } catch (error) {

        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) {
          try {
            const parsedNotifications = JSON.parse(savedNotifications);
            
            // Garantir que todas as notificações carregadas tenham datas válidas
            if (Array.isArray(parsedNotifications)) {
              const processedNotifications = parsedNotifications.map((notification) => {
                try {
                  // Verificar e corrigir a data timestamp
                  if (notification.timestamp) {
                    const date = new Date(notification.timestamp);
                    // Se a data é válida, mantém o formato ISO
                    if (!isNaN(date.getTime())) {
                      notification.timestamp = date.toISOString();
                    } else {
                      notification.timestamp = new Date().toISOString();
                    }
                  } else {
                    // Se não há timestamp, adiciona um
                    notification.timestamp = new Date().toISOString();
                  }
                  return notification;
                } catch (error) {
                  // Garante que haja um timestamp, mesmo se houve erro
                  notification.timestamp = notification.timestamp || new Date().toISOString();
                  return notification;
                }
              });
              setNotifications(processedNotifications);
            } else {
              setNotifications(mockNotifications);
            }
          } catch (e) {
            setNotifications(mockNotifications);
          }
        } else {
          setNotifications(mockNotifications);
        }
      }
    };

    fetchNotifications();
  }, [user]);


  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;


    const handleNewNotification = (data: any) => {
      if (data.notification) {
        let notification = data.notification;
        
        // Mapear a notificação para o formato esperado pelo componente
        notification = {
          id: notification.id || notification._id || genId(),
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type as NotificationType,
          isRead: notification.isRead,
          timestamp: notification.timestamp || notification.createdAt, // Usar createdAt como timestamp se não tiver timestamp
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
          link: notification.link,
          image: notification.image,
          meta: notification.meta,
          relatedId: notification.relatedId,
          relatedType: notification.relatedType
        };
        
        if (isDuplicate(notification)) {
          return;
        }
        
        setNotifications(prev => {
          
          const existsById = prev.some(n => n.id === notification.id);
          if (existsById) {
            return prev;
          }
          
          
          const existsByContent = prev.some(n => 
            n.title === notification.title && 
            n.message === notification.message &&
            n.type === notification.type
          );
          if (existsByContent) {
            return prev;
          }
          
          return [notification, ...prev];
        });
        
        enqueueToast(notification);
        
        
        
        try {
          const nType = String(notification.type || '').toLowerCase();
          if (nType === 'purchase:new' || nType === 'purchase:initiated') {
            
            realtimeMessageService.requestConversationList();
            
            try {
              const ws = realtimeMessageService.getWebSocket();
              ws?.send(JSON.stringify({ type: 'conversations:get_list', lastCheck: Date.now(), timestamp: new Date().toISOString() }));
            } catch {}
          }
        } catch {}
      }
    };

    const handleUnreadCount = (data: any) => {
      
    };

    const handleNotificationRead = (data: any) => {
            if (data.notificationId || data.notificationIds) {
        const idsToMark = data.notificationIds || [data.notificationId];
        setNotifications(prev => 
          prev.map(notification => 
            idsToMark.includes(notification.id)
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    };

    const handleNotificationHistory = (data: any) => {
            if (data.notifications && Array.isArray(data.notifications)) {
        setNotifications(prev => {

          const existingIds = new Set(prev.map(n => n.id));
          const newNotifications = data.notifications.filter((n: any) => !existingIds.has(n.id));
          return [...prev, ...newNotifications].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    };

    
    const handleWalletBalanceUpdated = (payload: any) => {
      try {
        const data = payload?.data || {};
        const status = data?.status || '';
        const amountNet = data?.amountNet || data?.amount || 0;
        const transactionId = data?.transactionId || '';
        
        
        if (transactionId && processedTransactionsCache.current.has(transactionId)) {
          return;
        }
        
        
        if (status === 'credited' || status === 'paid') {
          
          if (transactionId) {
            processedTransactionsCache.current.add(transactionId);
            
            
            setTimeout(() => {
              processedTransactionsCache.current.delete(transactionId);
            }, 30000);
          }
          
          const formattedAmount = amountNet.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });

          
          const depositNotification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> = {
            title: 'Depósito Confirmado!',
            message: `Saldo de ${formattedAmount} foi adicionado à sua conta`,
            type: 'success'
          };

          addNotification(depositNotification);
        }
      } catch (error) {
      }
    };

    const handleConnected = (source: string) => {
      
      if (source === 'WebSocket') {
        notificationWebSocketService.getHistory({ limit: 50 });
      }
    };

    const handleError = (data: any) => {
          };


    notificationWebSocketService.connect()
      .then(() => {
                

        notificationWebSocketService.on('new_notification', handleNewNotification);
        notificationWebSocketService.on('unread_count', handleUnreadCount);
        notificationWebSocketService.on('notification_read', handleNotificationRead);
        notificationWebSocketService.on('notification_history', handleNotificationHistory);
        notificationWebSocketService.on('wallet_balance_updated', handleWalletBalanceUpdated);
        notificationWebSocketService.on('connected', () => handleConnected('WebSocket'));
        notificationWebSocketService.on('error', handleError);
      })
      .catch((wsError) => {
                

        notificationSSEService.connect()
          .then(() => {
                        

            notificationSSEService.on('new_notification', handleNewNotification);
            notificationSSEService.on('unread_count', handleUnreadCount);
            notificationSSEService.on('notification_read', handleNotificationRead);
            notificationSSEService.on('connected', (data: any) => handleConnected('SSE'));
            notificationSSEService.on('error', handleError);
          })
          .catch((sseError) => {
                      });
      });


    return () => {

      notificationWebSocketService.off('new_notification', handleNewNotification);
      notificationWebSocketService.off('unread_count', handleUnreadCount);
      notificationWebSocketService.off('notification_read', handleNotificationRead);
      notificationWebSocketService.off('notification_history', handleNotificationHistory);
      notificationWebSocketService.off('wallet_balance_updated', handleWalletBalanceUpdated);
      notificationWebSocketService.off('connected', handleConnected);
      notificationWebSocketService.off('error', handleError);
      notificationWebSocketService.disconnect();
      

      notificationSSEService.off('new_notification', handleNewNotification);
      notificationSSEService.off('unread_count', handleUnreadCount);
      notificationSSEService.off('notification_read', handleNotificationRead);
      notificationSSEService.off('connected', (data: any) => handleConnected('SSE'));
      notificationSSEService.off('error', handleError);
      notificationSSEService.disconnect();
    };
  }, [user]);


  // Função auxiliar para garantir datas ISO válidas antes da serialização
  const ensureValidDates = (notifications: Notification[]): Notification[] => {
    return notifications.map(notification => {
      try {
        // Garantir que a data seja sempre uma string ISO válida
        let timestamp = notification.timestamp;
        if (timestamp) {
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            timestamp = date.toISOString();
          }
        }
        return {
          ...notification,
          timestamp
        };
      } catch (error) {
        return notification;
      }
    });
  };

  useEffect(() => {
    try {
      // Garantir datas válidas antes de salvar no localStorage
      const notificationsWithValidDates = ensureValidDates(notifications);
      localStorage.setItem('notifications', JSON.stringify(notificationsWithValidDates));
    } catch (error) {
    }
  }, [notifications]);


  const unreadCount = Array.isArray(notifications) ? notifications.filter(notification => !notification.isRead).length : 0;

  
  const getNotificationKey = (notification: Partial<Notification>): string => {
    const title = (notification.title || '').toLowerCase().trim();
    const message = (notification.message || '').toLowerCase().trim();
    const type = notification.type || 'info';
    return `${type}:${title}:${message}`;
  };

  
  const isDuplicate = (notification: Partial<Notification>): boolean => {
    const key = getNotificationKey(notification);
    const now = Date.now();
    const lastTimestamp = recentNotificationsCache.current.get(key);
    
    if (lastTimestamp && (now - lastTimestamp) < DEDUPLICATION_WINDOW_MS) {
      return true;
    }
    
    
    recentNotificationsCache.current.set(key, now);
    
    
    for (const [cacheKey, timestamp] of recentNotificationsCache.current.entries()) {
      if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
        recentNotificationsCache.current.delete(cacheKey);
      }
    }
    
    return false;
  };

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    
    if (isDuplicate(notification)) {
      return; 
    }
    
    // Garantindo que o timestamp seja sempre um ISO string válido
    let timestamp;
    try {
      const now = new Date();
      if (!isNaN(now.getTime())) {
        timestamp = now.toISOString();
      } else {
        timestamp = new Date().toISOString();
      }
    } catch (error) {
      // Cria um timestamp como string ISO diretamente
      timestamp = new Date().toISOString();
    }
    
    const newNotification: Notification = {
      ...notification,
      id: genId(),
      timestamp,
      isRead: false,
    };

    setNotifications(prev => {
      
      const exists = prev.some(n => 
        n.title === newNotification.title && 
        n.message === newNotification.message &&
        n.type === newNotification.type
      );
      if (exists) {
        return prev;
      }
      
      
      const updated = [newNotification, ...prev];
      return limitArraySize(updated, ARRAY_LIMITS.NOTIFICATIONS);
    });
    
    enqueueToast(newNotification);
  }, []);

  
  const enqueueToast = (n: Notification) => {
    
    const existsVisible = toasts.some(t => t.id === n.id);
    const existsQueued = toastQueue.some(t => t.id === n.id);
    if (existsVisible || existsQueued) {
      return;
    }
    
    
    const existsVisibleContent = toasts.some(t => 
      t.title === n.title && 
      t.message === n.message &&
      t.type === n.type
    );
    const existsQueuedContent = toastQueue.some(t => 
      t.title === n.title && 
      t.message === n.message &&
      t.type === n.type
    );
    if (existsVisibleContent || existsQueuedContent) {
      return;
    }

    if (toasts.length < MAX_VISIBLE_TOASTS) {
      setToasts(prev => [...prev, n]); 
    } else {
      setToastQueue(prev => [...prev, n]); 
    }
  };

  const markAsRead = useCallback(async (id: string) => {

    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );

    try {

      if (notificationWebSocketService.isConnected()) {
        notificationWebSocketService.markAsRead([id]);
      }
      

      await notificationService.markAsRead(id);
    } catch (error) {
      
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {

    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );

    try {

      if (notificationWebSocketService.isConnected()) {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
          notificationWebSocketService.markAsRead(unreadIds);
        }
      }
      

      await notificationService.markAllAsRead();
    } catch (error) {
      
    }
  }, [notifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  }, []);

  const removeToast = useCallback((id: string) => {
    
    setToasts(prevVisible => {
      const wasVisible = prevVisible.some(t => t.id === id);
      const nextVisible = prevVisible.filter(t => t.id !== id);
      if (!wasVisible) return prevVisible; 
      let nextFromQueue: Notification | null = null;
      setToastQueue(prevQ => {
        if (prevQ.length > 0) {
          [nextFromQueue] = prevQ;
          return prevQ.slice(1);
        }
        return prevQ;
      });
      if (nextFromQueue) {
        return [...nextVisible, nextFromQueue]; 
      }
      return nextVisible;
    });
    
    setToastQueue(prevQ => prevQ.filter(t => t.id !== id));
  }, []);

  
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      toasts,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAllNotifications,
      removeToast
    }),
    [notifications, unreadCount, toasts, addNotification, markAsRead, markAllAsRead, removeNotification, clearAllNotifications, removeToast]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};