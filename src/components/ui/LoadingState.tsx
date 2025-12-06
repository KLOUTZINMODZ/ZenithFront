import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  size = 'md',
  text = 'Carregando...'
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col justify-center items-center py-12 w-full"
    >
      <Loader2 className={`${sizeMap[size]} text-purple-500 animate-spin mb-4`} />
      {text && <p className="text-gray-400 animate-pulse">{text}</p>}
    </motion.div>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ocorreu um erro',
  message,
  onRetry
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center py-8 px-4"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 mb-4">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-8 h-8 text-red-500" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6">{message}</p>
      
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors"
        >
          Tentar novamente
        </motion.button>
      )}
    </motion.div>
  );
};

export default { LoadingState, ErrorState };
