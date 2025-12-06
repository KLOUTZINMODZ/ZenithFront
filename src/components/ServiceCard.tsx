import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MarketItem } from '../types';

interface ServiceCardProps {
  item: MarketItem;
  className?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ item, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/marketplace/${item.id}`);
  };

  return (
    <motion.div
      className={`bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden cursor-pointer ${className}`}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="relative">
        <div className="aspect-w-16 aspect-h-9 w-full">
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-white">
          {item.category}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-xs">
                {typeof item.rating === 'object' && item.rating?.average !== undefined 
                  ? item.rating.average.toFixed(1) 
                  : (typeof item.rating === 'number' ? item.rating.toFixed(1) : '5.0')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-white text-xs">{item.views}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-400">{item.game}</span>
          <span className="text-xs text-gray-400">Vendedor: {item.seller}</span>
        </div>
        <h3 className="text-white font-medium line-clamp-2">{item.title}</h3>
        <div className="flex items-center justify-between pt-2">
          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            {item.price}
          </div>
          <motion.button
            className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white text-sm font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/marketplace/${item.id}`);
            }}
          >
            Ver Detalhes
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};


export default memo(ServiceCard, (prevProps, nextProps) => {
  
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.rating === nextProps.item.rating &&
    prevProps.item.views === nextProps.item.views &&
    prevProps.className === nextProps.className
  );
});