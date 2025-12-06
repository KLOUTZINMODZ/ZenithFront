import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = true }) => {
  return (
    <motion.div
      className={`
        bg-gray-800 rounded-xl border border-gray-700 overflow-hidden
        ${hover ? 'hover:border-gray-600' : ''}
        ${className}
      `}
      whileHover={hover ? { y: -2, scale: 1.01 } : {}}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};

export default Card;