import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { MarketplaceItem } from '../../services/homeService';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';
import { useDevice } from '../../hooks/useDevice';
import ImagePlaceholder from '../ImagePlaceholder';

interface MarketplaceCarouselProps {
  items: MarketplaceItem[];
}

export const MarketplaceCarousel: React.FC<MarketplaceCarouselProps> = ({ items }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDevice();

  const scroll = (_direction: 'left' | 'right') => {
    // Layout agora é em grade vertical; função mantida apenas por compatibilidade
    return;
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <ShoppingCart className="w-20 h-20 mx-auto mb-4 opacity-30" />
        <p className="text-lg">Nenhum item disponível no momento</p>
      </div>
    );
  }

  const visibleItems = isMobile ? items.slice(0, 4) : items.slice(0, 6);

  return (
    <div className={`relative ${
      isMobile ? '' : ''
    }`}>
      {}
      <div
        ref={scrollContainerRef}
        className={`grid ${
          isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-6 gap-4'
        }`}
      >
        {visibleItems.map((item, index) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`flex-shrink-0 w-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl overflow-hidden border-2 border-gray-700/40 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer group`}
            onClick={() => navigate(`/marketplace/${item._id}`)}
          >
            {}
            <div className="relative h-[240px] bg-gray-950 overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <ImagePlaceholder 
                className="absolute inset-0" 
                style={{ display: item.image ? 'none' : 'flex' }} 
              />
              {}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90"></div>
              
              {}
              <div className="absolute top-3 left-3">
                {item.featured && (
                  <div className="bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg mb-2">
                    POPULAR
                  </div>
                )}
                <div className="bg-gray-900/80 backdrop-blur-sm text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg uppercase tracking-wide">
                  {item.game}
                </div>
              </div>

              {}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-base mb-1 leading-tight" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {item.title}
                </h3>
                <p className="text-gray-400 text-xs mb-3 truncate uppercase tracking-wide">
                  {item.description || item.seller.name}
                </p>
                
                {}
                <div className="flex items-center justify-between">
                  <p className="text-white font-bold text-2xl">
                    {formatCurrency(item.price, true)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {}
    </div>
  );
};
