import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { X, Heart, Trash2, ShoppingCart, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';

interface FavoritesWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const FavoritesWidget: React.FC<FavoritesWidgetProps> = ({ isOpen, onClose }) => {
  const { favorites, removeFavorite, clearFavorites, favoritesCount } = useFavorites();
  const navigate = useNavigate();
  const isMobileDevice = useIsMobileDevice();
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [sizeMode, setSizeMode] = useState<'compact' | 'comfortable' | 'expanded'>('compact');

  // Variantes de animação (igual ao SupportWidget)
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: prefersReducedMotion ? 0.01 : 0.2 } },
    exit: { opacity: 0, transition: { duration: prefersReducedMotion ? 0.01 : 0.15 } }
  };

  const drawerVariants: Variants = {
    hidden: isMobileDevice 
      ? { y: '100%', opacity: 0.8 }
      : { x: '100%', opacity: 0.8 },
    visible: {
      y: 0,
      x: 0,
      opacity: 1,
      transition: {
        type: prefersReducedMotion ? 'tween' : 'spring',
        damping: 25,
        stiffness: 300,
        duration: prefersReducedMotion ? 0.01 : undefined
      }
    },
    exit: isMobileDevice
      ? { y: '100%', opacity: 0, transition: { duration: prefersReducedMotion ? 0.01 : 0.25 } }
      : { x: '100%', opacity: 0, transition: { duration: prefersReducedMotion ? 0.01 : 0.25 } }
  };

  // Handler para drag em mobile
  const handleDragEnd = (_: any, info: any) => {
    if (isMobileDevice && info.offset.y > 120) {
      onClose();
    }
  };

  // Classes de largura do drawer
  const drawerWidthClasses = () => {
    if (sizeMode === 'expanded') return 'w-full max-w-4xl';
    if (sizeMode === 'comfortable') return 'w-full max-w-2xl';
    return 'w-full max-w-lg';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleViewItem = (itemId: string) => {
    navigate(`/marketplace/${itemId}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`fixed inset-0 z-[9999] flex ${isMobileDevice ? 'items-end' : 'items-stretch justify-end'}`}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Drawer */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={isMobileDevice ? "y" : false}
            dragElastic={0.15}
            dragConstraints={isMobileDevice ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="favoritesWidgetTitle"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            className={`
              relative flex flex-col overflow-hidden
              ${isMobileDevice 
                ? 'w-full h-[95vh] rounded-t-3xl border-t' 
                : `${drawerWidthClasses()} h-full border-l rounded-none`
              }
              bg-gray-900/98 backdrop-blur-xl border-white/10
              ${isMobileDevice ? 'shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)]' : 'shadow-[-20px_0_60px_-10px_rgba(0,0,0,0.6)]'}
            `}
          >
            {/* Mobile Drag Handle */}
            {isMobileDevice && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                <div className="w-12 h-1.5 rounded-full bg-gray-500/60" />
              </div>
            )}

            {/* Header */}
            <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-gray-800/60 bg-gradient-to-br from-pink-600/20 via-purple-500/10 to-transparent backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/10 border border-pink-400/20 flex-shrink-0">
                  <Heart className="w-5 h-5 text-pink-300 fill-pink-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="favoritesWidgetTitle" className="text-white font-bold text-sm sm:text-base truncate">Meus Favoritos</h3>
                  <p className="text-[10px] sm:text-xs text-pink-200/60 truncate">
                    {favoritesCount} {favoritesCount === 1 ? 'item' : 'itens'} salvos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isMobileDevice && (
                  <button
                    onClick={() => setSizeMode(prev => prev === 'expanded' ? 'comfortable' : prev === 'comfortable' ? 'compact' : 'expanded')}
                    className="p-2 rounded-lg hover:bg-gray-700/60 text-gray-300 transition-colors"
                    title={sizeMode === 'expanded' ? 'Reduzir' : 'Expandir'}
                  >
                    {sizeMode === 'expanded' ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700/60 text-gray-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {favorites.length === 0 ? (
                // Empty State
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                    Nenhum favorito ainda
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 max-w-xs">
                    Adicione itens aos seus favoritos clicando no ícone de coração
                  </p>
                </div>
              ) : (
                <>
                  {/* Favorites List */}
                  <div className="p-4 space-y-3">
                    {favorites.map((item) => (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 hover:border-pink-500/30 rounded-xl p-3 sm:p-4 transition-all group backdrop-blur-sm"
                      >
                        <div className="flex gap-3">
                          {/* Image */}
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="w-8 h-8 text-purple-400" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold text-white mb-1 line-clamp-2">
                              {item.title}
                            </h4>
                            
                            {item.seller && (
                              <p className="text-xs text-gray-400 mb-2">
                                Por {item.seller.name}
                                {item.seller.rating && (
                                  <span className="ml-1">⭐ {item.seller.rating.toFixed(1)}</span>
                                )}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-base sm:text-lg font-bold text-purple-400">
                                {formatPrice(item.price)}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleViewItem(item._id)}
                                  className="p-2 bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg transition-colors shadow-lg shadow-pink-900/30"
                                  title="Ver item"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeFavorite(item._id)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  {favorites.length > 0 && (
                    <div className="border-t border-gray-800/60 p-4 bg-gray-900/50 backdrop-blur-sm">
                      <button
                        onClick={clearFavorites}
                        className="w-full px-4 py-3 bg-gradient-to-br from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        Limpar todos os favoritos
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FavoritesWidget;
