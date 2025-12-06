import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationToast from './NotificationToast';
import { Notification } from '../../types';

interface NotificationToastContainerProps {
  toasts: Notification[];
  removeToast: (id: string) => void;
}

const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 items-end">
      <AnimatePresence initial={false}>
        {toasts.map((toast, i) => (
          <motion.div
            key={`${toast.id}-${i}`}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{
              layout: { type: "spring", stiffness: 300, damping: 30 }
            }}
          >
            <NotificationToast
              notification={toast}
              onClose={() => removeToast(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToastContainer;