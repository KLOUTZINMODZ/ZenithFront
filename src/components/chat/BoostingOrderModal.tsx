import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CheckCircle, Clock, DollarSign, GamepadIcon, User, ChevronUp, Info, X, Star } from 'lucide-react';

export interface BoostingOrderDetails {
  agreementId?: string;
  boostingRequestId?: string;
  status?: string; 
  price?: number;
  boosterReceives?: number;
  feeAmount?: number;
  currency?: string; 
  game?: string;
  category?: string;
  currentRank?: string;
  desiredRank?: string;
  estimatedTime?: string;
  acceptedAt?: string | Date | null;
  completedAt?: string | Date | null;
  client?: { name?: string | null; avatar?: string | null };
  booster?: { name?: string | null; avatar?: string | null; rating?: number };
}

interface BoostingOrderModalProps {
  isVisible: boolean;
  details: BoostingOrderDetails | null;
  className?: string;
  role?: 'client' | 'booster' | 'unknown';
  canConfirm?: boolean;
  onConfirmDelivery?: () => void;
  confirmLoading?: boolean;
  usePortal?: boolean;
  onOpenMobileSheet?: () => void;
  isMobileSheetOpen?: boolean;
  onCloseMobileSheet?: () => void;
  renderFabInline?: boolean;
  canRate?: boolean;
  onRate?: () => void;
}

const statusMap: Record<string, { text: string; color: string; bg: string; border: string; Icon: any }> = {
  pending: { text: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', Icon: Clock },
  active: { text: 'Em Andamento', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', Icon: GamepadIcon },
  completed: { text: 'Concluído', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', Icon: CheckCircle },
  cancelled: { text: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', Icon: Clock },
  broken: { text: 'Cancelado pelo cliente', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', Icon: Clock }
};

const BoostingOrderModal: React.FC<BoostingOrderModalProps> = ({
  isVisible,
  details,
  className = '',
  role = 'unknown',
  canConfirm = false,
  onConfirmDelivery,
  confirmLoading = false,
  usePortal = false,
  onOpenMobileSheet,
  isMobileSheetOpen: externalSheetOpen,
  onCloseMobileSheet,
  renderFabInline = false,
  canRate = false,
  onRate
}) => {
  const [expanded, setExpanded] = useState(true);
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
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { ui, Icon } = useMemo(() => {
    const st = (details?.status || '').toLowerCase();
    const def = { text: 'Serviço de Boosting', color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/30', Icon: Info };
    const cfg = statusMap[st] || def;
    return { ui: cfg, Icon: cfg.Icon };
  }, [details?.status]);

  if (!isVisible || !details) return null;

  const formatPrice = (v?: number, cur?: string) => {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur || 'BRL' }).format(v);
    } catch {
      return `R$ ${v.toFixed(2)}`;
    }
  };

  const formatDate = (d?: string | Date | null) => {
    if (!d) return '—';
    try {
      const date = typeof d === 'string' ? new Date(d) : d;
      return date.toLocaleString('pt-BR');
    } catch {
      return '—';
    }
  };

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
                boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.2)",
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 20
                }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileSheetOpen(true)}
              className="fixed bottom-20 right-4 z-40 bg-blue-600 text-white rounded-full p-4 shadow-lg"
              aria-label="Ver informações do boosting"
              title="Ver informações da proposta"
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

      {/* Bottom Sheet - Renderizado via Portal */}
      {createPortal(
        <AnimatePresence mode="wait">
          {isMobileSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: [0.32, 0.72, 0, 1]
              }}
              onClick={() => setIsMobileSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              style={{ position: 'fixed' }}
            />

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
              onDragEnd={(_, { offset, velocity }: any) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setIsMobileSheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[10000] bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
              style={{ position: 'fixed' }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className={`w-5 h-5 ${ui.color} flex-shrink-0`} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-100">{ui.text}</h3>
                    {details.agreementId && (
                      <p className="text-xs text-gray-400 truncate">
                        #{details.agreementId.slice(-6)}
                      </p>
                    )}
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
                {/* Valor e Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-gray-400">Valor</p>
                    </div>
                    <p className="text-lg font-bold text-white">{formatPrice(details.price, details.currency)}</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-gray-400">Tempo</p>
                    </div>
                    <p className="text-base font-semibold text-white text-xs">{details.estimatedTime || '—'}</p>
                  </div>
                </div>

                {/* Detalhes do Serviço */}
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <GamepadIcon className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-gray-400">Serviço</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Jogo:</span>
                      <span className="text-white font-medium">{details.game || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Categoria:</span>
                      <span className="text-white font-medium">{details.category || '—'}</span>
                    </div>
                    {details.currentRank && details.desiredRank && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Progresso:</span>
                        <span className="text-white font-medium">{details.currentRank} → {details.desiredRank}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Participantes */}
                <div className="space-y-3">
                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Cliente</p>
                    <div className="flex items-center gap-2">
                      {details.client?.avatar ? (
                        <img src={details.client.avatar} className="w-8 h-8 rounded-full object-cover border-2 border-gray-700" alt="Cliente" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <span className="text-sm text-white font-medium">{details.client?.name || 'Cliente'}</span>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Booster</p>
                    <div className="flex items-center gap-2">
                      {details.booster?.avatar ? (
                        <img src={details.booster.avatar} className="w-8 h-8 rounded-full object-cover border-2 border-gray-700" alt="Booster" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <Info className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <span className="text-sm text-white font-medium">{details.booster?.name || 'Booster'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {(canConfirm || canRate) && (
                  <div className="space-y-2 pt-2">
                    {role === 'client' && canConfirm && details.status === 'active' && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium"
                        onClick={() => { setIsMobileSheetOpen(false); if (!confirmLoading) onConfirmDelivery?.(); }}
                        disabled={!!confirmLoading}
                      >
                        {confirmLoading ? 'Confirmando…' : 'Confirmar Entrega'}
                      </button>
                    )}
                    {role === 'client' && canRate && details.status === 'completed' && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium flex items-center justify-center gap-2"
                        onClick={() => { setIsMobileSheetOpen(false); onRate?.(); }}
                      >
                        <Star className="w-4 h-4" />
                        Avaliar Booster
                      </button>
                    )}
                  </div>
                )}
              </div>

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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className={`${usePortal ? 'fixed' : 'absolute'} top-0 left-0 right-0 ${className}`}
          style={{ zIndex: usePortal ? 10000 : undefined }}
        >
          <motion.div className="rounded-b-xl shadow-lg border border-gray-700 bg-gray-900/70 backdrop-blur-sm">
            {}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${ui.color}`} />
                <span className="text-sm font-semibold text-gray-100">{ui.text}</span>
                {details.agreementId && (
                  <span className="text-[10px] text-gray-300 bg-gray-700/60 border border-gray-600/50 px-2 py-0.5 rounded">
                    #{details.agreementId.slice(-6)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {role === 'client' && canConfirm && details.status === 'active' && (
                  <button
                    className="px-3 py-1.5 rounded bg-green-600/80 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs font-medium transition-colors"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      if (!confirmLoading) onConfirmDelivery?.();
                    }}
                    disabled={!!confirmLoading}
                  >
                    {confirmLoading ? 'Confirmando…' : 'Confirmar Entrega'}
                  </button>
                )}
                {role === 'client' && canRate && details.status === 'completed' && (
                  <button
                    className="px-3 py-1.5 rounded bg-amber-600/80 hover:bg-amber-600 text-white text-xs flex items-center gap-1 font-medium transition-colors"
                    onClick={(e: any) => { e.stopPropagation(); onRate?.(); }}
                  >
                    <Star className="w-3 h-3" />
                    Avaliar
                  </button>
                )}
                <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                  <ChevronUp className="w-4 h-4 text-gray-300" />
                </motion.div>
              </div>
            </div>

            {}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-4 pb-4"
                >
                  {}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-3">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400">Valor Total</p>
                        <p className="text-white font-semibold truncate">{formatPrice(details.price, details.currency)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-3">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400">Tempo Estimado</p>
                        <p className="text-white font-semibold truncate">{details.estimatedTime || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {}
                  {details.status === 'completed' && details.boosterReceives !== undefined && details.feeAmount !== undefined && (
                    <div className="mt-3 bg-gray-800/60 rounded-lg p-3 border border-green-500/30">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        <span>Distribuição Financeira</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-300">Booster recebeu:</span>
                          <span className="text-sm font-semibold text-green-400">{formatPrice(details.boosterReceives)} (95%)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-300">Taxa da plataforma:</span>
                          <span className="text-sm font-medium text-gray-400">{formatPrice(details.feeAmount)} (5%)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {}
                  <div className="mt-3 bg-gray-800/60 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
                      <GamepadIcon className="w-3 h-3 text-purple-400" />
                      <span>Detalhes do Serviço</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Jogo:</span>
                        <span className="text-xs text-white font-medium">{details.game || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Categoria:</span>
                        <span className="text-xs text-white font-medium">{details.category || '—'}</span>
                      </div>
                      {details.currentRank && details.desiredRank && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Progresso:</span>
                          <span className="text-xs text-white font-medium">
                            {details.currentRank} → {details.desiredRank}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {}
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-1">Cliente</p>
                      <div className="flex items-center gap-2">
                        {details.client?.avatar ? (
                          <>
                            <img
                              src={details.client.avatar}
                              className="w-6 h-6 rounded-full object-cover border border-gray-700"
                              alt="Cliente"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center hidden">
                              <User className="w-3 h-3 text-gray-300" />
                            </div>
                          </>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-300" />
                          </div>
                        )}
                        <span className="text-sm text-white truncate">{details.client?.name || 'Cliente'}</span>
                      </div>
                    </div>

                    {}
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-1">Booster</p>
                      <div className="flex items-center gap-2">
                        {details.booster?.avatar ? (
                          <>
                            <img
                              src={details.booster.avatar}
                              className="w-6 h-6 rounded-full object-cover border border-gray-700"
                              alt="Booster"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center hidden">
                              <Info className="w-3 h-3 text-gray-300" />
                            </div>
                          </>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <Info className="w-3 h-3 text-gray-300" />
                          </div>
                        )}
                        <span className="text-sm text-white truncate">{details.booster?.name || 'Booster'}</span>
                        {details.booster?.rating && (
                          <span className="text-[10px] text-yellow-400">⭐ {details.booster.rating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {}
                  {(details.acceptedAt || details.completedAt) && (
                    <div className="mt-3 bg-gray-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1.5">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>Datas</span>
                      </div>
                      <div className="space-y-1">
                        {details.acceptedAt && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Iniciado em:</span>
                            <span className="text-xs text-white">{formatDate(details.acceptedAt)}</span>
                          </div>
                        )}
                        {details.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Concluído em:</span>
                            <span className="text-xs text-green-400">{formatDate(details.completedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Renderizar mobile ou desktop conforme o tamanho da tela
  if (isMobile) {
    return mobileContent;
  }

  if (!usePortal) return desktopContent;
  const target = document.getElementById('modal-root') || document.body;
  return createPortal(
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0 as any, zIndex: 2147483647 }}>
      {desktopContent}
    </div>,
    target
  );
};

// ==================== COMPONENTE BOTÃO INLINE PARA HEADER ====================
interface BoostingHeaderButtonProps {
  isVisible: boolean;
  hasOrder: boolean;
  onClick: () => void;
  className?: string;
}

export const BoostingHeaderButton: React.FC<BoostingHeaderButtonProps> = ({
  isVisible,
  hasOrder,
  onClick,
  className = ''
}) => {
  if (!isVisible || !hasOrder) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={`relative rounded-xl transition-colors ${className}`}
      title="Ver informações do boosting"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Info className="w-6 h-6 md:w-5 md:h-5" />
      {/* Badge com indicador animado */}
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-purple-400 rounded-full border-2 border-gray-900 shadow-sm"
      />
    </motion.button>
  );
};

export default BoostingOrderModal;
