import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import AuthFullScreen from '../components/AuthFullScreen';
import { useIsMobile } from '../hooks/useIsMobile';


const ForgotPasswordModalPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    
    navigate('/');
  };

  
  if (isMobile) {
    return (
      <AuthFullScreen
        initialMode="forgot"
        onClose={handleClose}
      />
    );
  }

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AuthModal
        isOpen={isOpen}
        onClose={handleClose}
        initialMode="forgot"
      />
    </div>
  );
};

export default ForgotPasswordModalPage;
