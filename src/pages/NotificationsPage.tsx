import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, RefreshCw, Filter, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import notificationService from '../services/notificationService';
import notificationWebSocketService from '../services/notificationWebSocketService';
import './NotificationsPage.css';

interface UINotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  image?: string;
  timestamp: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification, notifications: ctxNotifications } = useNotifications();
  
  const [allNotifications, setAllNotifications] = useState<UINotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;


  const mapApiNotification = (n: any): UINotification => {
    const id = String(n?.id || n?._id || `${Date.now()}_${Math.random()}`);
    const timestamp = String(n?.timestamp || n?.createdAt || new Date().toISOString());
    const itemId = n?.meta?.itemId;
    const link = n?.link || (itemId ? `/marketplace/${itemId}` : undefined);
    return {
      id,
      title: n?.title || 'Notificação',
      message: n?.message || '',
      type: String(n?.type || 'info'),
      isRead: !!n?.isRead,
      link,
      image: n?.image,
      timestamp
    } as UINotification;
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      
      const response = await notificationService.getNotifications(1, 100, false);
      if (response.success && response.data) {
        const mapped = (response.data.notifications || []).map(mapApiNotification);
        setAllNotifications(prev => {
          const byId: Record<string, UINotification> = {};
          for (const n of prev) byId[n.id] = n;
          for (const n of mapped) byId[n.id] = { ...byId[n.id], ...n };
          const merged = Object.values(byId);
          merged.sort((a, b) => new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? 1 : -1);
          return merged;
        });
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
            addNotification({
        title: 'Erro',
        message: 'Não foi possível carregar as notificações',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };


  const markAsRead = async (notificationId: string) => {
    
    const prevList = allNotifications;
    const prevUnread = unreadCount;
    setAllNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      try { if (notificationWebSocketService.isConnected()) notificationWebSocketService.markAsRead([notificationId]); } catch {}
      const response = await notificationService.markAsRead(notificationId);
      if (!response.success) throw new Error(response.message || 'Falha na API');
    } catch (error) {
            
      setAllNotifications(prevList);
      setUnreadCount(prevUnread);
      addNotification({ title: 'Aviso', message: 'Não foi possível marcar como lida. Tente novamente.', type: 'warning' });
    }
  };


  const markAllAsRead = async () => {
    
    const prevList = allNotifications;
    const prevUnread = unreadCount;
    const unreadIds = allNotifications.filter(n => !n.isRead).map(n => n.id);
    setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      try { if (notificationWebSocketService.isConnected() && unreadIds.length) notificationWebSocketService.markAsRead(unreadIds); } catch {}
      const response = await notificationService.markAllAsRead();
      if (!response.success) throw new Error(response.message || 'Falha na API');
    } catch (error) {
            
      setAllNotifications(prevList);
      setUnreadCount(prevUnread);
      addNotification({ title: 'Aviso', message: 'Não foi possível marcar todas como lidas. Tente novamente.', type: 'warning' });
    }
  };


  const handleNotificationClick = async (notification: UINotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };


  

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications();
  }, [user, navigate]);

  
  useEffect(() => {
    if (!Array.isArray(ctxNotifications)) return;
    const mapped = ctxNotifications.map(mapApiNotification);
    setAllNotifications(prev => {
      const byId: Record<string, UINotification> = {};
      for (const n of prev) byId[n.id] = n;
      for (const n of mapped) byId[n.id] = { ...byId[n.id], ...n };
      const merged = Object.values(byId);
      merged.sort((a, b) => new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? 1 : -1);
      return merged;
    });
  }, [ctxNotifications]);

  
  useEffect(() => {
    if (!user) return;

    const mapWsNotification = (n: any): UINotification => {
      const id = String(n?.id || n?._id || `${Date.now()}_${Math.random()}`);
      const timestamp = String(n?.timestamp || new Date().toISOString());
      const type = String(n?.type || 'info');
      const itemId = n?.meta?.itemId;
      const link = itemId ? `/marketplace/${itemId}` : undefined;
      return {
        id,
        title: n?.title || 'Notificação',
        message: n?.message || '',
        type,
        isRead: !!n?.isRead,
        link,
        image: n?.image,
        timestamp
      } as UINotification;
    };

    const upsert = (incoming: any[]) => {
      if (!Array.isArray(incoming)) return;
      setAllNotifications(prev => {
        const mapped = incoming.map(mapWsNotification);
        const byId: Record<string, any> = {};
        
        for (const n of prev) byId[n.id] = n;
        
        for (const n of mapped) byId[n.id] = { ...byId[n.id], ...n };
        const merged = Object.values(byId) as UINotification[];
        
        merged.sort((a, b) => new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? 1 : -1);
        return merged;
      });
    };

    const onNew = (payload: any) => {
      const n = payload?.notification;
      if (!n) return;
      upsert([n]);
    };

    const onHistory = (payload: any) => {
      const list = payload?.notifications;
      if (!Array.isArray(list)) return;
      upsert(list);
    };

    notificationWebSocketService.on('new_notification', onNew);
    notificationWebSocketService.on('notification_history', onHistory);
    try { notificationWebSocketService.getHistory({ limit: 50 }); } catch {}

    return () => {
      notificationWebSocketService.off('new_notification', onNew);
      notificationWebSocketService.off('notification_history', onHistory);
    };
  }, [user]);


  
  const { filteredNotifications, totalPages } = useMemo(() => {
    let filtered = allNotifications;
    
    
    if (filter === 'unread') filtered = filtered.filter(n => !n.isRead);
    if (filter === 'read') filtered = filtered.filter(n => n.isRead);
    
    
    const total = filtered.length;
    const pages = Math.ceil(total / itemsPerPage);
    
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    
    return {
      filteredNotifications: paginated,
      totalPages: pages
    };
  }, [allNotifications, filter, currentPage, itemsPerPage]);
  
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'new_proposal':
        return { color: 'text-blue-400 bg-blue-900/20 border-blue-700/30', label: 'Nova Proposta' };
      case 'proposal_accepted':
        return { color: 'text-green-400 bg-green-900/20 border-green-700/30', label: 'Proposta Aceita' };
      case 'new_boosting':
        return { color: 'text-purple-400 bg-purple-900/20 border-purple-700/30', label: 'Novo Boosting' };
      case 'boosting_completed':
        return { color: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30', label: 'Boosting Concluído' };
      case 'qa:new_question':
        return { color: 'text-purple-300 bg-purple-900/20 border-purple-700/30', label: 'Nova Pergunta' };
      case 'qa:answered':
        return { color: 'text-green-300 bg-green-900/20 border-green-700/30', label: 'Pergunta Respondida' };
      default:
        return { color: 'text-gray-400 bg-gray-900/20 border-gray-700/30', label: 'Notificação' };
    }
  };

  if (!user) return null;

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Notificações</h1>
              <p className="text-sm text-gray-400">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas lidas'}
              </p>
            </div>
            
            <motion.button
              onClick={() => fetchNotifications()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-all text-sm font-medium disabled:opacity-50"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </motion.button>
          </div>
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5"
        >
          <div className="flex flex-wrap gap-2">
            {['all', 'unread', 'read'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  filter === filterOption
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <Filter className="w-4 h-4" />
                {filterOption === 'all' ? 'Todas' : filterOption === 'unread' ? 'Não lidas' : 'Lidas'}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-300 transition-all text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Marcar todas como lidas
            </button>
          )}
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 px-4"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Bell className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">
                {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {filter === 'unread' 
                  ? 'Você está em dia com suas notificações!'
                  : 'Quando você receber notificações, elas aparecerão aqui.'
                }
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification, index) => {
                  const typeInfo = getTypeInfo(notification.type);
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`notification-card group bg-white/5 backdrop-blur-sm rounded-xl p-4 border cursor-pointer transition-all ${
                        !notification.isRead 
                          ? 'border-purple-500/30 bg-purple-900/10 hover:border-purple-500/50' 
                          : 'border-white/10 hover:border-white/20'
                      } hover:bg-white/10`}
                    >
                      <div className="flex items-start gap-3">
                        {}
                        <div className="flex-shrink-0">
                          {notification.image ? (
                            <img
                              src={notification.image}
                              alt=""
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                          )}
                        </div>

                        {}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-white mb-1 line-clamp-1 group-hover:text-purple-300 transition-colors">
                                {notification.title}
                              </h3>
                              <p className="text-sm text-gray-400 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(notification.timestamp)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                  title="Marcar como lida"
                                >
                                  <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {}
        {totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-6 pb-4"
          >
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all font-medium text-sm"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/20'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all font-medium text-sm"
            >
              Próxima
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
