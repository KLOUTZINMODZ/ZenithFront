import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Info, ShoppingCart, X } from 'lucide-react';
import { Notification, NotificationType } from '../../types';
import { useNavigate } from 'react-router-dom';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  autoClose = true,
  duration = 5000,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoClose) {
      timer = setTimeout(() => {
        onClose();
      }, duration);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoClose, duration, onClose]);

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

  const getBorderColorByType = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-l-green-400';
      case 'warning':
        return 'border-l-yellow-400';
      case 'error':
        return 'border-l-red-400';
      case 'transaction':
        return 'border-l-blue-400';
      case 'info':
      default:
        return 'border-l-purple-400';
    }
  };

  const handleClick = () => {
    if (notification.link) {
      navigate(notification.link);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30 
      }}
      className={`
        flex items-start p-4 rounded-lg shadow-lg 
        bg-gray-800 border border-gray-700 border-l-4 ${getBorderColorByType(notification.type)}
        ${notification.link ? 'cursor-pointer' : ''}
        max-w-sm w-full
      `}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mr-3">
        {notification.image ? (
          <img 
            src={notification.image} 
            alt="" 
            className="w-8 h-8 rounded-full object-cover" 
          />
        ) : (
          getIconByType(notification.type)
        )}
      </div>
      
      <div className="flex-1 min-w-0 mr-2">
        <h4 className="text-sm font-medium text-white">
          {notification.title}
        </h4>
        <p className="text-xs text-gray-300 mt-1">
          {notification.message}
        </p>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-700 transition-colors duration-200"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </motion.div>
  );
};

export default NotificationToast;