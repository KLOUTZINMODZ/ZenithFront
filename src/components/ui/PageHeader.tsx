import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  onRefresh,
  isRefreshing = false
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400">
            <Icon size={24} />
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            {title}
          </h1>
          <p className="text-gray-400">{description}</p>
        </div>
      </div>
      
      {onRefresh && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <RefreshCw 
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
          Atualizar
        </motion.button>
      )}
    </motion.div>
  );
};

export default PageHeader;
