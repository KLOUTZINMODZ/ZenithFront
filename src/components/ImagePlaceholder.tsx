import React from 'react';
import { ImageOff } from 'lucide-react';

interface ImagePlaceholderProps {
  className?: string;
  style?: React.CSSProperties;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ className = '', style }) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 ${className}`}
      style={style}
    >
      <ImageOff className="w-16 h-16 text-gray-600 mb-3" />
      <span className="text-gray-500 text-sm font-medium">Sem Imagem</span>
    </div>
  );
};

export default ImagePlaceholder;
