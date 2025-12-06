import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types';

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
    
    setIsOpen(false);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const formatDate = (dateString?: string) => {
    // Validar se dateString existe e não é vazio
    if (!dateString) return 'Data inválida';
    
    try {
      // Tenta corrigir strings de data malformadas que possam ser salvas no localStorage
      let correctedDateString = dateString;
      
      // Verifica se a string já é uma string ISO válida
      if (!dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) && !isNaN(Date.parse(dateString))) {
        correctedDateString = new Date(dateString).toISOString();
      }
      
      // Log para depuração
      // console.log('Processando data:', dateString);
      
      const date = new Date(correctedDateString);
      
      // Validar se a data é válida
      if (isNaN(date.getTime())) {
        console.log('Data inválida detectada:', dateString);
        return 'Data inválida';
      }
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      // Validar se o cálculo resultou em um número válido
      if (isNaN(diffInMinutes)) {
        console.log('Cálculo de diferença de data inválido:', dateString, date);
        return 'Data inválida';
      }
      
      if (diffInMinutes < 1) return 'Agora';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
      return `${Math.floor(diffInMinutes / 1440)}d`;
    } catch (error) {
      console.error('Erro ao processar data da notificação:', error, dateString);
      return 'Data inválida';
    }
  };


  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 group"
      >
        <Bell className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-200" />
        
        {}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-purple-500 rounded-full text-xs text-white font-medium shadow-lg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 sm:right-0 xs:right-2 mt-2 w-80 sm:w-80 xs:w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-x-hidden"
          >
            {}
            <div className="flex items-center justify-between p-3 border-b border-gray-700/30">
              <h3 className="text-gray-200 font-medium text-sm">Notificações</h3>
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full">
                    {unreadCount} nova{unreadCount === 1 ? '' : 's'}
                  </span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-800/50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {}
            <div className="max-h-80 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative p-3 cursor-pointer transition-all duration-200 ${
                      !notification.isRead 
                        ? 'bg-purple-500/5 border-l-2 border-purple-500' 
                        : 'hover:bg-gray-800/30'
                    } ${index !== notifications.length - 1 ? 'border-b border-gray-800/50' : ''}`}
                    whileHover={{ x: 4 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start space-x-3">
                      {}
                      <div className="flex-shrink-0 mt-1">
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        )}
                      </div>

                      {}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-gray-200 truncate pr-2 overflow-hidden">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                            {formatDate(notification.createdAt || notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed overflow-hidden">
                          {notification.message}
                        </p>
                        
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-700/30 bg-gray-900/50">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-xs text-purple-400 hover:text-purple-300 transition-colors py-1 px-3 rounded-md hover:bg-purple-500/10"
                >
                  Ver todas as notificações
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
