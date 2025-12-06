import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Sparkles, Zap, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  useEffect(() => {

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);


    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);


    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      

      setTimeout(() => {
        if (!standalone) {
          setShowInstallPrompt(true);
        }
      }, 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);


    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
          });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    // Simular progress bar
    const progressInterval = setInterval(() => {
      setInstallProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setInstallProgress(100);
      
      setTimeout(() => {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
        setIsInstalling(false);
        setInstallProgress(0);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsInstalling(false);
      setInstallProgress(0);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);

    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };


  if (isStandalone || 
      sessionStorage.getItem('pwa-install-dismissed') || 
      (!deferredPrompt && !isIOS) || 
      !showInstallPrompt) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 260,
            damping: 20
          }
        }}
        exit={{ 
          opacity: 0, 
          y: 100, 
          scale: 0.95,
          transition: { duration: 0.2 }
        }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        {/* Glassmorphism Container */}
        <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 overflow-hidden">
          {/* Animated Background Gradient */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ backgroundSize: '200% 200%' }}
          />
          
          {/* Progress Bar */}
          {isInstalling && (
            <motion.div 
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-t-2xl"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: installProgress / 100 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-white/30"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
          )}

          <div className="relative p-4">
            <div className="flex items-start gap-3">
              {/* Animated Icon */}
              <motion.div 
                className="flex-shrink-0 relative"
                animate={{
                  scale: isInstalling ? [1, 1.05, 1] : 1,
                  y: isInstalling ? [0, -2, 0] : 0
                }}
                transition={{
                  duration: 1.5,
                  repeat: isInstalling ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-600/50">
                  {isInstalling ? (
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ 
                        duration: 1.2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      <Zap className="w-6 h-6 text-white" />
                    </motion.div>
                  ) : (
                    <Smartphone className="w-6 h-6 text-white" />
                  )}
                </div>
                {!isInstalling && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
                  </motion.div>
                )}
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <motion.h3 
                  className="text-white font-bold text-base mb-1 flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {isInstalling ? 'Instalando...' : 'Instalar Zenith'}
                  {installProgress === 100 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </motion.div>
                  )}
                </motion.h3>
                
                <motion.p 
                  className="text-gray-300 text-sm mb-3 leading-relaxed"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {isInstalling ? (
                    <span className="flex items-center gap-2">
                      <span>Preparando instalação</span>
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {installProgress}%
                      </motion.span>
                    </span>
                  ) : (
                    isIOS 
                      ? 'Adicione à tela inicial para acesso instantâneo'
                      : 'Instale nosso app para experiência completa'
                  )}
                </motion.p>
                

                {/* Buttons */}
                <motion.div 
                  className="flex gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {isIOS ? (
                    <div className="text-gray-300 text-xs bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50">
                      Toque em <span className="font-bold text-blue-400">⎙</span> e depois em <span className="font-semibold text-white">"Adicionar à Tela de Início"</span>
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleInstallClick}
                      disabled={isInstalling}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                      whileHover={!isInstalling ? { scale: 1.02, y: -1 } : {}}
                      whileTap={!isInstalling ? { scale: 0.98 } : {}}
                    >
                      {isInstalling ? (
                        <>
                          <motion.div
                            animate={{ 
                              y: [0, -3, 0],
                              opacity: [1, 0.6, 1]
                            }}
                            transition={{ 
                              duration: 1, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </motion.div>
                          <span>Instalando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Instalar</span>
                        </>
                      )}
                    </motion.button>
                  )}
                  
                  {!isInstalling && (
                    <motion.button
                      onClick={handleDismiss}
                      className="flex items-center justify-center gap-1 bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all border border-gray-700/50 hover:border-gray-600"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Depois
                    </motion.button>
                  )}
                </motion.div>
              </div>
              
              {/* Close Button */}
              {!isInstalling && (
                <motion.button
                  onClick={handleDismiss}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center border border-gray-700/50"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
