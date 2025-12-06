import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, FileText, Shield, RefreshCcw, Users } from 'lucide-react';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';

interface TermsRoute {
  label: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const routeOptions: TermsRoute[] = [
  {
    label: 'Termos de Uso',
    description: 'Leia as diretrizes completas para utilização da plataforma.',
    path: '/terms',
    icon: FileText,
  },
  {
    label: 'Política de Privacidade',
    description: 'Entenda como tratamos os seus dados pessoais.',
    path: '/privacy',
    icon: Shield,
  },
  {
    label: 'Política de Reembolso',
    description: 'Saiba como funcionam cancelamentos e devoluções.',
    path: '/refund',
    icon: RefreshCcw,
  },
  {
    label: 'Termos para Vendedores',
    description: 'Regras específicas para quem comercializa na plataforma.',
    path: '/seller-terms',
    icon: Users,
  },
];

const TermsWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobileDevice();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const openWidget = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWidget();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeWidget]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    if (isMobile) {
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }
    document.body.style.touchAction = 'none';

    const focusTimeout = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 220);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      window.clearTimeout(focusTimeout);
    };
  }, [isOpen, prefersReducedMotion, isMobile]);

  const handleNavigate = (path: string) => {
    const delay = prefersReducedMotion ? 0 : 200;
    setIsOpen(false);
    window.setTimeout(() => navigate(path), delay);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: prefersReducedMotion ? 0 : 0.25 } },
    exit: { opacity: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2 } },
  } as const;

  const drawerVariants = {
    hidden: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
    visible: isMobile
      ? {
          y: 0,
          opacity: 1,
          transition: prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 380, damping: 32, mass: 0.72, bounce: 0.16 },
        }
      : {
          x: 0,
          opacity: 1,
          transition: prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 480, damping: 34, mass: 0.7, bounce: 0.18 },
        },
    exit: isMobile
      ? { y: '100%', opacity: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] } }
      : { x: '100%', opacity: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] } },
  } as const;

  const headerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.24, 0.82, 0.25, 1] },
    },
  } as const;

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.8, 0.25, 1] },
    },
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.25, 0.8, 0.25, 1] },
    },
  } as const;

  const panelWidthClass = isMobile ? 'w-full' : 'w-[460px] md:w-[480px]';

  const portalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="terms-backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={backdropVariants}
            onClick={closeWidget}
          />

          <motion.div
            key="terms-drawer"
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-full justify-end"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={drawerVariants}
            drag={isMobile ? 'y' : 'x'}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (isMobile && info.offset.y > 140) {
                closeWidget();
              }
              if (!isMobile && info.offset.x > 140) {
                closeWidget();
              }
            }}
          >
              <motion.div
                ref={panelRef}
                tabIndex={-1}
                className={`relative flex h-full ${panelWidthClass} flex-col bg-gradient-to-br from-gray-900 via-gray-950 to-black shadow-2xl focus:outline-none ${
                  isMobile ? 'rounded-t-3xl border-t border-white/10 p-5 pt-6' : 'rounded-l-3xl border-l border-white/10 p-6'
                }`}
              >
                <motion.button
                  onClick={closeWidget}
                  className={`absolute ${isMobile ? 'right-5 top-5' : 'right-5 top-5'} rounded-full bg-white/5 p-2 text-gray-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70`}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  aria-label="Fechar Termos"
                >
                  <X className="h-5 w-5" />
                </motion.button>

                {isMobile && (
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
                )}

                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={headerVariants}
                  className={`${isMobile ? 'pr-10 text-center' : 'pr-10 text-left'}`}
                >
                  <div className={`inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-200 ${
                    isMobile ? '' : ''
                  }`}>
                    Termos & Políticas
                  </div>
                  <h2 className={`mt-4 text-2xl font-bold text-white sm:text-3xl ${isMobile ? 'text-center' : ''}`}>
                    Central de Termos
                  </h2>
                  <p className={`mt-2 text-sm text-gray-300 sm:text-base ${isMobile ? 'text-center' : ''}`}>
                    Consulte rapidamente todas as políticas que regem a sua experiência na plataforma.
                  </p>
                </motion.div>

                <motion.div
                  className="mt-6 flex-1 overflow-y-auto pb-6"
                  initial="hidden"
                  animate="visible"
                  variants={listVariants}
                >
                  <div className="grid gap-3 sm:gap-4">
                    {routeOptions.map(({ label, description, path, icon: Icon }) => (
                      <motion.button
                        key={path}
                        onClick={() => handleNavigate(path)}
                        variants={cardVariants}
                        className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-4 text-left transition-all hover:border-purple-500/50 hover:bg-purple-950/40 focus:outline-none focus:ring-2 focus:ring-purple-500/70"
                        whileHover={prefersReducedMotion ? undefined : { translateY: -1 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/70 to-blue-600/70 text-white shadow-lg shadow-purple-900/40">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <span className="text-base font-semibold text-white sm:text-lg">{label}</span>
                          <span className="mt-1 text-sm text-gray-300 sm:text-sm">{description}</span>
                        </div>
                        <motion.span
                          aria-hidden
                          className="text-sm font-medium text-purple-300 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Abrir
                        </motion.span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
  );

  return (
    <>
      <button
        data-terms-widget-trigger="true"
        onClick={openWidget}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      {createPortal(portalContent, document.body)}
    </>
  );
};

export default TermsWidget;
