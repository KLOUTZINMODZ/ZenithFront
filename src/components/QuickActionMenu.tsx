import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Menu, X, HelpCircle, FileText } from 'lucide-react';

// Variantes de animação com física aprimorada
const containerVariants = {
  hidden: { 
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.08,
      staggerDirection: -1, // De baixo para cima
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: 1,
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0,
    x: 30,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    }
  },
  exit: {
    opacity: 0,
    x: 30,
    scale: 0.8,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1], // ease-in
    }
  }
};

const iconVariants = {
  idle: { 
    rotate: 0,
    scale: 1,
  },
  open: { 
    rotate: 180,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      mass: 1,
    }
  },
  close: {
    rotate: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      mass: 1,
    }
  }
};

const buttonVariants = {
  idle: { 
    scale: 1,
  },
  hover: { 
    scale: 1.08,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    }
  },
  tap: { 
    scale: 0.92,
    transition: {
      type: 'spring',
      stiffness: 600,
      damping: 20,
    }
  }
};

const QuickActionMenu: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSupportClick = () => {
    setIsMenuOpen(false);
    // Trigger do botão nativo do SupportWidget
    const supportTrigger = document.querySelector('[data-support-widget-trigger="true"]') as HTMLElement;
    if (supportTrigger) {
      supportTrigger.click();
    }
  };

  const handleTermsClick = () => {
    setIsMenuOpen(false);
    const termsTrigger = document.querySelector('[data-terms-widget-trigger="true"]') as HTMLElement;
    if (termsTrigger) {
      termsTrigger.click();
    }
  };

  const handleFaqClick = () => {
    setIsMenuOpen(false);
    navigate('/faq');
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
        {/* Expanded Menu Options */}
        <AnimatePresence mode="wait">
          {isMenuOpen && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-3"
            >
              <motion.button
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { type: 'spring', stiffness: 400, damping: 15 }
                }}
                whileTap={{ 
                  scale: 0.95,
                  transition: { type: 'spring', stiffness: 600, damping: 20 }
                }}
                onClick={handleTermsClick}
                className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-full shadow-lg shadow-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="font-semibold">Termos</span>
              </motion.button>

              <motion.button
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { type: 'spring', stiffness: 400, damping: 15 }
                }}
                whileTap={{ 
                  scale: 0.95,
                  transition: { type: 'spring', stiffness: 600, damping: 20 }
                }}
                onClick={handleFaqClick}
                className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-lg shadow-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-semibold">FAQ</span>
              </motion.button>

              {/* Suporte - Primeiro a aparecer (de baixo para cima) */}
              <motion.button
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { type: 'spring', stiffness: 400, damping: 15 }
                }}
                whileTap={{ 
                  scale: 0.95,
                  transition: { type: 'spring', stiffness: 600, damping: 20 }
                }}
                onClick={handleSupportClick}
                className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full shadow-lg shadow-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ 
                    duration: 0.5,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1]
                  }}
                >
                  <MessageSquare className="w-5 h-5" />
                </motion.div>
                <span className="font-semibold">Suporte</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Toggle Button */}
        <motion.button
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          animate={isMenuOpen ? { rotate: 90 } : { rotate: 0 }}
          transition={{
            rotate: {
              type: 'spring',
              stiffness: 200,
              damping: 15,
              mass: 0.8,
            }
          }}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors duration-300 ${
            isMenuOpen
              ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500'
              : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isMenuOpen ? (
              <motion.div
                key="close"
                variants={iconVariants}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0, 
                  opacity: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    mass: 1,
                  }
                }}
                exit={{ 
                  scale: 0, 
                  rotate: 180, 
                  opacity: 0,
                  transition: {
                    duration: 0.2,
                    ease: [0.4, 0, 1, 1],
                  }
                }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ scale: 0, rotate: 180, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0, 
                  opacity: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    mass: 1,
                  }
                }}
                exit={{ 
                  scale: 0, 
                  rotate: -180, 
                  opacity: 0,
                  transition: {
                    duration: 0.2,
                    ease: [0.4, 0, 1, 1],
                  }
                }}
                className="relative"
              >
                <Menu className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
};

export default QuickActionMenu;
