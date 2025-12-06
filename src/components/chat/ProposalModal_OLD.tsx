import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Clock, DollarSign, CheckCircle, XCircle, ChevronUp, AlertCircle, MessageSquare, User } from 'lucide-react';

interface ProposalData {
  price: number;
  estimatedTime: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired' | 'active' | 'rejected' | 'delivered' | 'cancelled';
  isTemporary: boolean;
  expiresAt?: string;
  acceptedAt?: string;
  clientName?: string;
  boosterName?: string;
  clientAvatar?: string;
  boosterAvatar?: string;
  game?: string;
  category?: string;
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
}

const ProposalModal: React.FC<ProposalModalProps> = ({
  isVisible,
  proposalData,
  onAccept,
  onReject,
  isLoading = false,
  userRole = 'unknown',
  className = '',
  isMarketplace = false,
  usePortal = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');


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
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          text: 'Proposta Pendente'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          text: 'Atendimento Cancelado'
        };
      case 'accepted':
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          text: 'Proposta Aceita'
        };
      case 'delivered':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          text: 'Pedido Entregue'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          text: 'Proposta Recusada'
        };
      case 'expired':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          text: 'Proposta Expirada'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          text: 'Status Desconhecido'
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
        duration: 0.4,
        type: "spring" as const,
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      y: -100,
      transition: { duration: 0.2 }
    }
  };

  const contentVariants = {
    collapsed: { 
      opacity: 0,
      height: 0,
      transition: {
        opacity: { duration: 0.1 },
        height: { duration: 0.2 }
      }
    },
    expanded: { 
      opacity: 1,
      height: 'auto',
      transition: {
        opacity: { duration: 0.2, delay: 0.1 },
        height: { duration: 0.3 }
      }
    }
  };

  if (!proposalData) return null;

  const content = (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`
            ${usePortal ? 'fixed' : 'absolute'} top-0 left-0 right-0
            rounded-b-xl shadow-lg border border-gray-700
            bg-gray-900/70 backdrop-blur-sm
            ${className}
          `}
          style={{
            willChange: 'transform, opacity',
            zIndex: usePortal ? 10000 : 50
          }}
        >
          {}
          <motion.div 
            className={`
              ${statusConfig.bgColor} 
              px-4 py-3
              border-b ${statusConfig.borderColor}
              cursor-pointer
            `}
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                <span className="font-semibold text-white text-sm">
                  {statusConfig.text}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {proposalData.isTemporary && timeRemaining && (
                  <span className="text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
                    {timeRemaining}
                  </span>
                )}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {}
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {}
                    <div className="flex items-center space-x-2 bg-gray-700/30 rounded-lg p-3">
                      <DollarSign className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Valor</p>
                        <p className="font-semibold text-white truncate">
                          R$ {proposalData.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {}
                    <div className="flex items-center space-x-2 bg-gray-700/30 rounded-lg p-3">
                      <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Tempo</p>
                        <p className="font-semibold text-white truncate">
                          {proposalData.estimatedTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {}
                  {proposalData.message && (
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400 mb-1">Mensagem</p>
                          <p className="text-sm text-white break-words">
                            {proposalData.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {}
                  {(proposalData.clientName || proposalData.boosterName) && (
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2">Participantes</p>
                      <div className="space-y-1">
                        {proposalData.clientName && (
                          <p className="text-sm text-white">
                            <span className="text-gray-400">{isMarketplace ? 'Comprador' : 'Cliente'}:</span> {proposalData.clientName}
                          </p>
                        )}
                        {proposalData.boosterName && (
                          <p className="text-sm text-white">
                            <span className="text-gray-400">{isMarketplace ? 'Vendedor' : 'Booster'}:</span> {proposalData.boosterName}
                          </p>
                        )}
                      </div>
                    </div>
                  )}


                  {}
                  {proposalData.acceptedAt && (
                    <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-700/50">
                      Aceita em {new Date(proposalData.acceptedAt).toLocaleString('pt-BR')}
                    </div>
                  )}

        
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!usePortal) return content;
  const target = document.body;
  return createPortal(
    <div className="modal-backdrop">{content}</div>,
    target
  );
}
;

export default ProposalModal;
