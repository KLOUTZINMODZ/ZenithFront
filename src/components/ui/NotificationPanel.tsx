import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, AlertTriangle, Info, ShoppingCart } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Notification, NotificationType } from '../../types';
import { useNavigate } from 'react-router-dom';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAllNotifications 
  } = useNotifications();
  const navigate = useNavigate();

  const getIconByType = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'transaction':
        return <ShoppingCart className="w-5 h-5 text-blue-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-purple-400" />;
    }
  };

  const getBackgroundByType = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-400 bg-opacity-10';
      case 'warning':
        return 'bg-yellow-400 bg-opacity-10';
      case 'error':
        return 'bg-red-400 bg-opacity-10';
      case 'transaction':
        return 'bg-blue-400 bg-opacity-10';
      case 'info':
      default:
        return 'bg-purple-400 bg-opacity-10';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours} h atrás`;
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              duration: 0.3, 
              type: "spring", 
              stiffness: 500, 
              damping: 30 
            }}
            className="
              fixed right-4 top-16 w-80 sm:w-96 max-h-[80vh] 
              bg-gray-900 border border-gray-700 rounded-xl shadow-2xl 
              overflow-hidden z-50
            "
          >
            {}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-800 transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {}
            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p>Você não tem notificações</p>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`
                          relative p-4 border-b border-gray-800 
                          ${!notification.isRead ? 'bg-gray-800' : ''}
                          ${notification.link ? 'cursor-pointer' : ''}
                          hover:bg-gray-800 transition-colors duration-200
                        `}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex">
                          {}
                          <div className={`
                            flex-shrink-0 w-10 h-10 rounded-full mr-3 
                            flex items-center justify-center
                            ${getBackgroundByType(notification.type)}
                          `}>
                            {notification.image ? (
                              <img 
                                src={notification.image} 
                                alt="" 
                                className="w-full h-full rounded-full object-cover" 
                              />
                            ) : (
                              getIconByType(notification.type)
                            )}
                          </div>

                          {}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <h4 className="text-sm font-medium text-white truncate">
                                {notification.title}
                              </h4>
                              <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 mt-1">
                              {notification.message}
                            </p>
                          </div>
                        </div>

                        {}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="
                            absolute top-2 right-2 p-1 rounded-full 
                            opacity-0 group-hover:opacity-100 hover:bg-gray-700 
                            transition-opacity duration-200
                          "
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>

                        {}
                        {!notification.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {}
                  <div className="p-3 text-center">
                    <button
                      onClick={clearAllNotifications}
                      className="
                        text-xs text-gray-400 hover:text-white 
                        transition-colors duration-200
                      "
                    >
                      Limpar todas as notificações
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;