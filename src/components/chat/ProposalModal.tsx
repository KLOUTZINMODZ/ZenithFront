import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Clock, DollarSign, CheckCircle, XCircle, ChevronUp, AlertCircle, MessageSquare, User, Gamepad2, Info, X } from 'lucide-react';

interface ProposalData {
  price: number;
  estimatedTime: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired' | 'active' | 'rejected' | 'delivered' | 'cancelled' | 'completed' | 'shipped' | 'initiated' | 'escrow_reserved';
  isTemporary: boolean;
  expiresAt?: string;
  acceptedAt?: string;
  clientName?: string;
  boosterName?: string;
  clientAvatar?: string;
  boosterAvatar?: string;
  game?: string;
  category?: string;
  deliveredAt?: string;
  shippedAt?: string;
  completedAt?: string;
}

interface ProposalModalProps {
  isVisible: boolean;
  proposalData: ProposalData | null;
  onAccept?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
  userRole?: 'client' | 'booster' | 'unknown';
  className?: string;
  isMarketplace?: boolean;
  usePortal?: boolean;
  onOpenMobileSheet?: () => void; // Função para abrir o sheet externamente
  isMobileSheetOpen?: boolean; // Estado externo do sheet
  onCloseMobileSheet?: () => void; // Função para fechar o sheet externamente
  renderFabInline?: boolean; // Se true, não renderiza FAB (será renderizado no header)
}

const ProposalModal: React.FC<ProposalModalProps> = ({
  isVisible,
  proposalData,
  className = '',
  isMarketplace = false,
  usePortal = false,
  onOpenMobileSheet,
  isMobileSheetOpen: externalSheetOpen,
  onCloseMobileSheet,
  renderFabInline = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [internalSheetOpen, setInternalSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Usar estado externo se fornecido, senão usar interno
  const isMobileSheetOpen = externalSheetOpen !== undefined ? externalSheetOpen : internalSheetOpen;
  const setIsMobileSheetOpen = onOpenMobileSheet && onCloseMobileSheet 
    ? (open: boolean) => open ? onOpenMobileSheet() : onCloseMobileSheet()
    : setInternalSheetOpen;

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!proposalData?.isTemporary || !proposalData?.expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expiry = new Date(proposalData.expiresAt!);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expirado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [proposalData?.isTemporary, proposalData?.expiresAt]);

  useEffect(() => {
    if (!(usePortal && isVisible)) return;
    try {
      document.documentElement.classList.add('modal-open');
      return () => {
        document.documentElement.classList.remove('modal-open');
      };
    } catch {}
  }, [usePortal, isVisible]);

  const getStatusConfig = () => {
    switch (proposalData?.status) {
      case 'pending':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          text: isMarketplace ? 'Pedido Pendente' : 'Proposta Pendente',
          description: isMarketplace ? 'Aguardando confirmação de pagamento' : 'Aguardando resposta'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-red-400',
          text: isMarketplace ? 'Pedido Cancelado' : 'Atendimento Cancelado',
          description: 'Este pedido foi cancelado'
        };
      case 'accepted':
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          text: isMarketplace ? 'Pedido Confirmado' : 'Proposta Aceita',
          description: isMarketplace ? 'Pagamento confirmado' : 'Serviço em andamento'
        };
      case 'initiated':
      case 'escrow_reserved':
        return {
          icon: CheckCircle,
          color: 'text-blue-400',
          text: 'Pagamento Reservado',
          description: 'Aguardando vendedor confirmar envio'
        };
      case 'shipped':
        return {
          icon: CheckCircle,
          color: 'text-purple-400',
          text: 'Pedido Enviado',
          description: 'Vendedor confirmou o envio'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-emerald-400',
          text: 'Pedido Finalizado',
          description: 'Entrega confirmada pelo cliente'
        };
      case 'delivered':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          text: isMarketplace ? 'Pedido Entregue' : 'Serviço Concluído',
          description: 'Transação finalizada com sucesso'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-400',
          text: 'Proposta Recusada',
          description: 'Esta proposta foi recusada'
        };
      case 'expired':
        return {
          icon: XCircle,
          color: 'text-red-400',
          text: 'Proposta Expirada',
          description: 'O prazo para resposta expirou'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400',
          text: 'Status Desconhecido',
          description: ''
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const modalVariants = {
    hidden: {
      opacity: 0,
      y: -100,
      transition: { duration: 0.2 }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.25
      }
    },
    exit: {
      opacity: 0,
      y: -100,
      transition: { duration: 0.2 }
    }
  };

  if (!proposalData) return null;

  // ==================== COMPONENTE MOBILE (BOTTOM SHEET + FAB) ====================
  const mobileContent = (
    <>
      {/* Floating Action Button (FAB) - Visível apenas quando não está aberto e não renderizado inline */}
      {!renderFabInline && (
        <AnimatePresence>
          {isVisible && !isMobileSheetOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 0.5
                }
              }}
              exit={{ 
                scale: 0, 
                opacity: 0, 
                y: 20,
                transition: {
                  duration: 0.2,
                  ease: [0.4, 0, 1, 1]
                }
              }}
              whileHover={{ 
                scale: 1.1,
                boxShadow: "0 20px 25px -5px rgba(139, 92, 246, 0.3), 0 10px 10px -5px rgba(139, 92, 246, 0.2)",
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 20
                }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileSheetOpen(true)}
              className="fixed bottom-20 right-4 z-40 bg-purple-600 text-white rounded-full p-4 shadow-lg"
              aria-label="Ver informações da proposta"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut",
                  repeatDelay: 2
                }}
              >
                <Info className="w-6 h-6" />
              </motion.div>
              {/* Badge com indicador */}
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.8, 1]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"
              />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Bottom Sheet - Renderizado via Portal para sobreposição total */}
      {createPortal(
        <AnimatePresence mode="wait">
          {isMobileSheetOpen && (
          <>
            {/* Backdrop - z-[9999] para sobrepor tudo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: [0.32, 0.72, 0, 1] // Custom easing para fade suave
              }}
              onClick={() => setIsMobileSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              style={{ position: 'fixed' }}
            />

            {/* Bottom Sheet Content - z-[10000] para ficar acima do backdrop */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ 
                y: 0, 
                opacity: 1,
                transition: {
                  type: "spring",
                  damping: 35,
                  stiffness: 400,
                  mass: 0.8,
                  restDelta: 0.001,
                  restSpeed: 0.001
                }
              }}
              exit={{ 
                y: "100%", 
                opacity: 0,
                transition: {
                  type: "spring",
                  damping: 40,
                  stiffness: 450,
                  mass: 0.6
                }
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.2 }}
              onDragEnd={(_, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setIsMobileSheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[10000] bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
              style={{ position: 'fixed' }}
            >
              {/* Header com botão de fechar */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color} flex-shrink-0`} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-100">
                      {statusConfig.text}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">
                      {statusConfig.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="ml-2 p-2 hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Timer */}
                {proposalData.isTemporary && timeRemaining && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-yellow-400 font-medium">Chat Temporário</p>
                      <p className="text-sm text-white">Expira em {timeRemaining}</p>
                    </div>
                  </div>
                )}

                {/* Valor e Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-gray-400">Valor</p>
                    </div>
                    <p className="text-lg font-bold text-white">
                      R$ {proposalData.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-gray-400">Tempo</p>
                    </div>
                    <p className="text-base font-semibold text-white">
                      {proposalData.estimatedTime}
                    </p>
                  </div>
                </div>

                {/* Serviço */}
                {(proposalData.game || proposalData.category) && (
                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      <p className="text-xs text-gray-400">Serviço</p>
                    </div>
                    <p className="text-sm text-white font-medium">
                      {proposalData.game && proposalData.category 
                        ? `${proposalData.game} - ${proposalData.category}`
                        : proposalData.game || proposalData.category}
                    </p>
                  </div>
                )}

                {/* Mensagem */}
                {proposalData.message && (
                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <p className="text-xs text-gray-400">Mensagem</p>
                    </div>
                    <p className="text-sm text-white break-words">
                      {proposalData.message}
                    </p>
                  </div>
                )}

                {/* Participantes */}
                {(proposalData.clientName || proposalData.boosterName) && (
                  <div className="space-y-3">
                    {proposalData.clientName && (
                      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-2">
                          {isMarketplace ? 'Comprador' : 'Cliente'}
                        </p>
                        <div className="flex items-center gap-2">
                          {proposalData.clientAvatar ? (
                            <img 
                              src={proposalData.clientAvatar} 
                              alt={proposalData.clientName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-gray-700" 
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          <span className="text-sm text-white font-medium">
                            {proposalData.clientName}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {proposalData.boosterName && (
                      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-2">
                          {isMarketplace ? 'Vendedor' : 'Booster'}
                        </p>
                        <div className="flex items-center gap-2">
                          {proposalData.boosterAvatar ? (
                            <img 
                              src={proposalData.boosterAvatar} 
                              alt={proposalData.boosterName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-gray-700" 
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          <span className="text-sm text-white font-medium">
                            {proposalData.boosterName}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                {(proposalData.acceptedAt || proposalData.shippedAt || proposalData.deliveredAt || proposalData.completedAt) && (
                  <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/30 space-y-2">
                    {proposalData.acceptedAt && (
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        Aceita em {new Date(proposalData.acceptedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {proposalData.shippedAt && (
                      <div className="text-xs text-purple-400 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        📦 Enviado em {new Date(proposalData.shippedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {proposalData.deliveredAt && (
                      <div className="text-xs text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Entregue em {new Date(proposalData.deliveredAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {proposalData.completedAt && (
                      <div className="text-xs text-emerald-400 font-medium flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        🎉 Finalizado em {new Date(proposalData.completedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom padding para não ficar colado no bottom */}
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );

  // ==================== COMPONENTE DESKTOP (MODAL ORIGINAL) ====================
  const desktopContent = (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`${usePortal ? 'fixed' : 'absolute'} top-0 left-0 right-0 ${className}`}
          style={{ zIndex: usePortal ? 10000 : 50, margin: 0 }}
        >
          <div
            className="rounded-b-xl shadow-lg border-b border-l border-r border-gray-700 bg-gray-900/70 backdrop-blur-sm"
            style={{ margin: 0, width: '100%' }}
          >
            {}
            <div
              className="px-2 sm:px-4 py-2 sm:py-3 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${statusConfig.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-100 block">
                      {statusConfig.text}
                    </span>
                    {statusConfig.description && (
                      <span className="text-[10px] sm:text-xs text-gray-400 block truncate">
                        {statusConfig.description}
                      </span>
                    )}
                  </div>
                  {proposalData.isTemporary && timeRemaining && (
                    <span className="text-[9px] sm:text-[10px] text-gray-300 bg-gray-700/60 border border-gray-600/50 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                      ⏱️ {timeRemaining}
                    </span>
                  )}
                </div>
                
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="ml-1 sm:ml-2"
                >
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
                </motion.div>
              </div>
            </div>

            {}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-2 sm:px-4 pb-2 sm:pb-4"
                >
                  {}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-800/60 rounded-lg p-2 sm:p-3">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">Valor</p>
                        <p className="text-sm sm:text-base text-white font-semibold truncate">
                          R$ {proposalData.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-800/60 rounded-lg p-2 sm:p-3">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">Tempo</p>
                        <p className="text-sm sm:text-base text-white font-semibold truncate">
                          {proposalData.estimatedTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {}
                  {(proposalData.game || proposalData.category) && (
                    <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 bg-gray-800/60 rounded-lg p-2 sm:p-3">
                      <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">Serviço</p>
                        <p className="text-xs sm:text-sm text-white font-medium truncate">
                          {proposalData.game && proposalData.category 
                            ? `${proposalData.game} - ${proposalData.category}`
                            : proposalData.game || proposalData.category}
                        </p>
                      </div>
                    </div>
                  )}

                  {}
                  {proposalData.message && (
                    <div className="mt-2 sm:mt-3 bg-gray-800/60 rounded-lg p-2 sm:p-3">
                      <div className="flex items-start gap-1.5 sm:gap-2">
                        <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-[11px] text-gray-400 mb-1">Mensagem</p>
                          <p className="text-xs sm:text-sm text-white break-words">
                            {proposalData.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {}
                  {(proposalData.clientName || proposalData.boosterName) && (
                    <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {proposalData.clientName && (
                        <div className="bg-gray-800/60 rounded-lg p-2 sm:p-3">
                          <p className="text-[10px] sm:text-[11px] text-gray-400 mb-1">
                            {isMarketplace ? 'Comprador' : 'Cliente'}
                          </p>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {proposalData.clientAvatar ? (
                              <img 
                                src={proposalData.clientAvatar} 
                                alt={proposalData.clientName}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-gray-700 flex-shrink-0" 
                              />
                            ) : (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-300" />
                              </div>
                            )}
                            <span className="text-xs sm:text-sm text-white truncate">
                              {proposalData.clientName}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {proposalData.boosterName && (
                        <div className="bg-gray-800/60 rounded-lg p-2 sm:p-3">
                          <p className="text-[10px] sm:text-[11px] text-gray-400 mb-1">
                            {isMarketplace ? 'Vendedor' : 'Booster'}
                          </p>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {proposalData.boosterAvatar ? (
                              <img 
                                src={proposalData.boosterAvatar} 
                                alt={proposalData.boosterName}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-gray-700 flex-shrink-0" 
                              />
                            ) : (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-300" />
                              </div>
                            )}
                            <span className="text-xs sm:text-sm text-white truncate">
                              {proposalData.boosterName}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {}
                  <div className="mt-2 sm:mt-3 pt-2 border-t border-gray-700/50 space-y-1">
                    {proposalData.acceptedAt && (
                      <div className="text-[10px] sm:text-[11px] text-gray-400 text-center">
                        Aceita em {new Date(proposalData.acceptedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {proposalData.shippedAt && (
                      <div className="text-[10px] sm:text-[11px] text-purple-400 text-center">
                        📦 Enviado em {new Date(proposalData.shippedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {proposalData.deliveredAt && (
                      <div className="text-[10px] sm:text-[11px] text-green-400 text-center">
                        Entregue em {new Date(proposalData.deliveredAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {proposalData.completedAt && (
                      <div className="text-[10px] sm:text-[11px] text-emerald-400 text-center font-medium">
                        🎉 Finalizado em {new Date(proposalData.completedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ==================== RENDERIZAÇÃO CONDICIONAL ====================
  // Mobile: Bottom Sheet + FAB
  // Desktop: Modal dropdown no topo
  const contentToRender = isMobile ? mobileContent : desktopContent;

  if (!usePortal) return contentToRender;
  
  const target = document.body;
  return createPortal(
    <div className="modal-backdrop">{contentToRender}</div>,
    target
  );
};

export default ProposalModal;

// ==================== COMPONENTE BOTÃO INLINE PARA HEADER ====================
interface ProposalHeaderButtonProps {
  isVisible: boolean;
  hasProposal: boolean;
  onClick: () => void;
  className?: string;
}

export const ProposalHeaderButton: React.FC<ProposalHeaderButtonProps> = ({
  isVisible,
  hasProposal,
  onClick,
  className = ''
}) => {
  if (!isVisible || !hasProposal) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={`relative rounded-xl transition-colors ${className}`}
      title="Ver informações da proposta"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Info className="w-6 h-6 md:w-5 md:h-5" />
      {/* Badge com indicador animado */}
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900 shadow-sm"
      />
    </motion.button>
  );
};
