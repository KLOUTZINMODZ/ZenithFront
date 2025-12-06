import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullScreen = false }) => {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen bg-gray-900' : ''}`}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-500 rounded-full animate-spin animation-delay-150"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;