import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import AuthModal from './AuthModal';
import AuthFullScreen from './AuthFullScreen';
import { useIsMobile } from '../hooks/useIsMobile';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthButtonProps {
  mode?: AuthMode;
  children?: React.ReactNode;
  className?: string;
}


const AuthButton: React.FC<AuthButtonProps> = ({ 
  mode = 'login', 
  children = 'Entrar',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <motion.button
        onClick={handleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={className || 'flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg'}
      >
        <LogIn className="w-5 h-5" />
        {children}
      </motion.button>

      {}
      {isMobile ? (
        isOpen && (
          <AuthFullScreen
            initialMode={mode}
            onClose={handleClose}
          />
        )
      ) : (
        <AuthModal
          isOpen={isOpen}
          onClose={handleClose}
          initialMode={mode}
        />
      )}
    </>
  );
};

export default AuthButton;
