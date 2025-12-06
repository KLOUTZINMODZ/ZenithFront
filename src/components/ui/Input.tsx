import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="space-y-2 group">
      {label && (
        <label className="block text-sm font-medium text-gray-300 group-focus-within:text-white transition-colors duration-200">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <div className="text-gray-400 group-focus-within:text-white transition-colors duration-200">
              {icon}
            </div>
          </div>
        )}
        <div className="relative">
          <motion.input
            ref={ref}
            className={`
              w-full px-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-gray-700/70 rounded-xl 
              text-white placeholder-gray-400 
              focus:ring-2 focus:ring-gray-500 focus:border-transparent
              transition-all duration-200
              hover:border-gray-600
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${className}
            `}
            whileFocus={{ scale: 1.01 }}
            {...(props as any)}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-500/10 to-gray-500/10 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200" />
        </div>
      </div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-700/30 rounded-lg p-2"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;