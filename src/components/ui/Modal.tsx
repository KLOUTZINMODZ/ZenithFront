import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const htmlEl = document.documentElement;
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      

      htmlEl.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      htmlEl.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };


  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 isolate" 
          style={{ 
            width: '100vw', 
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden'
          }}
        >
          <motion.div
            ref={overlayRef}
            className="fixed inset-0 z-0 backdrop-blur-sm bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '100%'
            }}
          />
          <div 
            className="fixed inset-0 z-10 flex items-center justify-center p-4 pointer-events-none"
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '100%'
            }}
          >
            <motion.div
              className="relative bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto border border-gray-700/50 pointer-events-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ 
                margin: '0 auto',
                maxWidth: '450px',
                width: '100%'
              }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
  


  return createPortal(
    modalContent,
    document.getElementById('modal-root') || document.body
  );
};

export default Modal;