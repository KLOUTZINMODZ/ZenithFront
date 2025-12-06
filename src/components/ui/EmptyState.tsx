import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-12 bg-gray-800/90 rounded-xl p-8 border border-gray-700/40 shadow-lg"
    >
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-700/50 mb-6 text-gray-300">
        <Icon size={32} />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">{description}</p>
      
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg hover:shadow-purple-900/20"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
