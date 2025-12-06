import { useState, useCallback } from 'react';

type AuthMode = 'login' | 'register' | 'forgot';

export const useAuthModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  const openModal = useCallback((initialMode: AuthMode = 'login') => {
    setMode(initialMode);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
  }, []);

  return {
    isOpen,
    mode,
    openModal,
    closeModal,
    switchMode
  };
};
