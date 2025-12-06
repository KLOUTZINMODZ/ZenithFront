import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroBanner } from '../../services/homeService';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../hooks/useDevice';

interface HeroBannerCarouselProps {
  banners: HeroBanner[];
}

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDevice();

  
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000); 

    return () => clearInterval(timer);
  }, [banners.length]);

  const goToNext = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrevious = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (!banners || banners.length === 0) {
    return null; 
  }

  const currentBanner = banners[currentIndex];

  
  const badgeColors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
  };

  
  
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (_e: any, { offset, velocity }: any) => {
    if (!isMobile) return; 
    
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      goToNext();
    } else if (swipe > swipeConfidenceThreshold) {
      goToPrevious();
    }
  };

  const slideVariants = {
    enter: {
      opacity: 0,
      scale: 1.05
    },
    center: {
      opacity: 1,
      scale: 1,
      zIndex: 1
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      zIndex: 0
    }
  };

  return (
    <section className={`relative overflow-hidden ${
      isMobile ? 'rounded-xl mx-3' : isTablet ? 'rounded-2xl' : 'rounded-2xl'
    } ${
      isMobile ? 'h-[480px]' : isTablet ? 'h-[520px]' : 'h-[600px]'
    } bg-gray-900`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 0.6, ease: "easeInOut" },
            scale: { duration: 0.8, ease: "easeInOut" }
          }}
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={handleDragEnd}
          className="absolute inset-0"
        >
          {}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentBanner.backgroundImage})` }}
          >
            {}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
          </div>

          {}
          <div className="relative h-full flex items-center">
            <div className={`container mx-auto ${
              isMobile ? 'px-5' : isTablet ? 'px-8' : 'px-8 md:px-16 lg:px-24'
            }`}>
              <div className={isMobile ? 'max-w-full' : 'max-w-2xl'}>
                {}
                {currentBanner.badge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className={isMobile ? 'mb-4' : 'mb-6'}
                  >
                    <span className={`inline-block ${
                      isMobile ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-xs'
                    } rounded-full font-bold text-white uppercase tracking-wider ${badgeColors[currentBanner.badge.color]}`}>
                      {currentBanner.badge.text}
                    </span>
                  </motion.div>
                )}

                {}
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className={`${
                    isMobile 
                      ? 'text-3xl' 
                      : isTablet 
                        ? 'text-4xl md:text-5xl' 
                        : 'text-5xl md:text-6xl lg:text-7xl'
                  } font-black text-white ${
                    isMobile ? 'mb-2 leading-tight' : 'mb-4 leading-tight'
                  }`}
                >
                  {currentBanner.title}
                  {currentBanner.highlightText && (
                    <>
                      <br />
                      <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 text-transparent bg-clip-text">
                        {currentBanner.highlightText}
                      </span>
                    </>
                  )}
                </motion.h1>

                {}
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className={`${
                    isMobile 
                      ? 'text-sm leading-relaxed mb-6' 
                      : isTablet
                        ? 'text-base leading-relaxed mb-7'
                        : 'text-lg md:text-xl leading-relaxed mb-8'
                  } text-gray-200`}
                >
                  {currentBanner.description}
                </motion.p>

                {}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className={`flex ${
                    isMobile ? 'flex-col gap-3' : 'flex-wrap gap-4'
                  }`}
                >
                  {}
                  <button
                    onClick={() => navigate(currentBanner.primaryButton.link)}
                    className={`group relative ${
                      isMobile 
                        ? 'px-6 py-3 text-base w-full' 
                        : 'px-8 py-4 text-lg'
                    } bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold overflow-hidden shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">{currentBanner.primaryButton.text}</span>
                  </button>

                  {}
                  {currentBanner.secondaryButton && (
                    <button
                      onClick={() => navigate(currentBanner.secondaryButton!.link)}
                      className={`group ${
                        isMobile 
                          ? 'px-6 py-3 text-base w-full' 
                          : 'px-8 py-4 text-lg'
                      } bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300 hover:scale-105`}
                    >
                      {currentBanner.secondaryButton.text}
                    </button>
                  )}
                </motion.div>
              </div>
            </div>
          </div>

        </motion.div>
      </AnimatePresence>

      {}
      {banners.length > 1 && !isMobile && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hover:bg-white/10 text-white p-3 rounded-full transition-all"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hover:bg-white/10 text-white p-3 rounded-full transition-all"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {}
      {banners.length > 1 && !isMobile && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {}
      {banners.length > 1 && (
        <div className={`absolute ${
          isMobile ? 'top-3 right-3' : 'top-4 right-4'
        } z-20 bg-black/50 backdrop-blur-sm ${
          isMobile ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        } rounded-full text-white font-medium`}>
          {currentIndex + 1} / {banners.length}
        </div>
      )}
    </section>
  );
};
