import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}


const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  


  const isAuthorized = requireAuth ? !!user : !user;


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-3"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <Loader2 className="w-5 h-5 text-gray-400" />
          </motion.div>
          <span className="text-sm text-gray-400">Carregando...</span>
        </motion.div>
      </div>
    );
  }


  if (!isAuthorized) {
    if (requireAuth) {

      return <Navigate to="/login" replace state={{ from: location }} />;
    } else {

      const to = (location.state as any)?.from?.pathname || '/';
      return <Navigate to={to} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;