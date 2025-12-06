import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CheckCircle, Clock, DollarSign, Package, ShoppingBag, User, ChevronUp, X, Star, Inbox } from 'lucide-react';

export interface MarketplaceOrderDetails {
  purchaseId?: string;
  status?: string; 
  price?: number;
  currency?: string; 
  itemTitle?: string;
  itemImageUrl?: string;
  purchaseDate?: string | Date | null;
  buyer?: { name?: string | null; avatar?: string | null };
  seller?: { name?: string | null; avatar?: string | null };
  deliveryMethod?: string;
}

interface MarketplaceOrderModalProps {
  isVisible: boolean;
  details: MarketplaceOrderDetails | null;
  className?: string;
  role?: 'buyer' | 'seller' | 'unknown';
  canShip?: boolean;
  onShip?: () => void;
  shipLoading?: boolean;
  canConfirm?: boolean;
  onConfirmDelivery?: () => void;
  confirmLoading?: boolean;
  
  canNotReceived?: boolean;
  onNotReceived?: () => void;
  notReceivedLoading?: boolean;
  usePortal?: boolean;
  
  // Controle externo do mobile sheet
  onOpenMobileSheet?: () => void;
  isMobileSheetOpen?: boolean;
  onCloseMobileSheet?: () => void;
  renderFabInline?: boolean;
  
  // Novos botões de ação
  canRate?: boolean;
  onRate?: () => void;
  canCheckAccount?: boolean;
  onCheckAccount?: () => void;
  purchaseType?: 'marketplace' | 'boosting';
}

const statusMap: Record<string, { text: string; color: string; bg: string; border: string; Icon: any }> = {
  initiated: { text: 'Pedido Iniciado', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', Icon: Clock },
  escrow_reserved: { text: 'Em Espera', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', Icon: Clock },
  shipped: { text: 'Enviado', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', Icon: Package },
  completed: { text: 'Concluído', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', Icon: CheckCircle },
  cancelled: { text: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', Icon: Clock }
};

const formatDeliveryMethodLabel = (value?: string) => {
  if (!value) return '';
  const method = value.toLowerCase();
  if (method === 'manual') return 'Entrega manual';
  if (method === 'automatic') return 'Entrega automática';
  return value;
};

const getDeliveryDescription = (value?: string) => {
  if (!value) return '';
  const method = value.toLowerCase();
  if (method === 'automatic') return '';
  if (method === 'manual') return '';
  return '';
};

const getDeliveryAccent = (value?: string) => {
  const method = value?.toLowerCase();
  if (method === 'automatic') {
    return {
      wrapperClasses: 'border border-emerald-500/30 bg-emerald-500/10',
      iconColor: 'text-emerald-400'
    };
  }
  return {
    wrapperClasses: 'border border-amber-500/30 bg-amber-500/10',
    iconColor: 'text-amber-400'
  };
};

const MarketplaceOrderModal: React.FC<MarketplaceOrderModalProps> = ({ isVisible, details, className = '', role = 'unknown', canShip = false, onShip, shipLoading = false, canConfirm = false, onConfirmDelivery, confirmLoading = false, canNotReceived = false, onNotReceived, notReceivedLoading = false, usePortal = false, onOpenMobileSheet, isMobileSheetOpen: externalSheetOpen, onCloseMobileSheet, renderFabInline = false, canRate = false, onRate, canCheckAccount = false, onCheckAccount, purchaseType = 'marketplace' }) => {
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
    const def = { text: 'Compra', color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/30', Icon: ShoppingBag };
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
    } catch { return '—'; }
  };

  const handleRateClick = useCallback(() => {
    const purchaseId = details?.purchaseId;
    if (purchaseId) {
      const encodedId = encodeURIComponent(purchaseId);
      window.open(`https://zenithgg.com.br/orders/${encodedId}`, '_blank');
      return;
    }
    onRate?.();
  }, [details?.purchaseId, onRate]);

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
              aria-label="Ver informações do pedido"
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
                <ShoppingBag className="w-6 h-6" />
              </motion.div>
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.8, 1]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border-2 border-gray-900"
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
                ease: [0.32, 0.72, 0, 1] // Custom easing para fade suave
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
              onDragEnd={(_, { offset, velocity }) => {
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
                    {details.purchaseId && (
                      <p className="text-xs text-gray-400 truncate">
                        #{details.purchaseId.slice(-6)}
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
                {/* Valor, Data e Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <p className="text-xs text-gray-400">Data</p>
                    </div>
                    <p className="text-base font-semibold text-white text-xs">{formatDate(details.purchaseDate)}</p>
                  </div>

                  {details.deliveryMethod && (() => {
                    const accent = getDeliveryAccent(details.deliveryMethod);
                    const description = getDeliveryDescription(details.deliveryMethod);
                    return (
                      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50 flex items-center gap-3 sm:col-span-2">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent.wrapperClasses}`}>
                          <Package className={`w-5 h-5 ${accent.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">Entrega</p>
                          <p className="text-sm font-semibold text-white">{formatDeliveryMethodLabel(details.deliveryMethod)}</p>
                          {description && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Produto */}
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50 flex items-center gap-3">
                  {details.itemImageUrl ? (
                    <img src={details.itemImageUrl} alt={details.itemTitle || 'Item'} className="w-12 h-12 rounded object-cover border border-gray-700" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 mb-1">Produto</p>
                    <p className="text-sm text-white font-medium">{details.itemTitle || '—'}</p>
                  </div>
                </div>

                {/* Participantes */}
                <div className="space-y-3">
                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Comprador</p>
                    <div className="flex items-center gap-2">
                      {details.buyer?.avatar ? (
                        <img src={details.buyer.avatar} className="w-8 h-8 rounded-full object-cover border-2 border-gray-700" alt="Comprador" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <span className="text-sm text-white font-medium">{details.buyer?.name || 'Cliente'}</span>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Vendedor</p>
                    <div className="flex items-center gap-2">
                      {details.seller?.avatar ? (
                        <img src={details.seller.avatar} className="w-8 h-8 rounded-full object-cover border-2 border-gray-700" alt="Vendedor" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <span className="text-sm text-white font-medium">{details.seller?.name || 'Vendedor'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {(canConfirm || canShip || canNotReceived || canRate || canCheckAccount) && (
                  <div className="space-y-2 pt-2">
                    {role === 'buyer' && canConfirm && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium"
                        onClick={() => { setIsMobileSheetOpen(false); if (!confirmLoading) onConfirmDelivery?.(); }}
                        disabled={!!confirmLoading}
                      >
                        {confirmLoading ? 'Confirmando…' : 'Confirmar recebimento'}
                      </button>
                    )}
                    {role === 'buyer' && canNotReceived && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm font-medium"
                        onClick={() => { setIsMobileSheetOpen(false); if (!notReceivedLoading) onNotReceived?.(); }}
                        disabled={!!notReceivedLoading}
                      >
                        {notReceivedLoading ? 'Enviando…' : 'Pedido não recebido'}
                      </button>
                    )}
                    {role === 'seller' && canShip && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-sm font-medium"
                        onClick={() => { setIsMobileSheetOpen(false); if (!shipLoading) onShip?.(); }}
                        disabled={!!shipLoading}
                      >
                        {shipLoading ? 'Enviando…' : 'Confirmar envio'}
                      </button>
                    )}
                    {role === 'buyer' && canRate && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white text-sm font-medium flex items-center justify-center gap-2"
                        onClick={() => { setIsMobileSheetOpen(false); handleRateClick(); }}
                      >
                        <Star className="w-4 h-4" />
                        Avaliar
                      </button>
                    )}
                    {role === 'buyer' && canCheckAccount && (
                      <button
                        className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm font-medium flex items-center justify-center gap-2"
                        onClick={() => { setIsMobileSheetOpen(false); onCheckAccount?.(); }}
                      >
                        <Inbox className="w-4 h-4" />
                        Conferir Conta
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
          style={{ zIndex: usePortal ? 10000 : 50, margin: 0 }}
        >
          <motion.div
            className={`rounded-b-xl shadow-lg border-b border-l border-r border-gray-700 bg-gray-900/70 backdrop-blur-sm`}
            style={{ margin: 0, width: '100%' }}
          >
            {}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${ui.color}`} />
                <span className="text-sm font-semibold text-gray-100">
                  {ui.text}
                </span>
                {details.purchaseId && (
                  <span className="text-[10px] text-gray-300 bg-gray-700/60 border border-gray-600/50 px-2 py-0.5 rounded">
                    #{details.purchaseId.slice(-6)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {role === 'buyer' && (canConfirm || (details.status || '').toLowerCase() === 'shipped') && (
                  <button
                    className="px-3 py-1.5 rounded bg-green-600/80 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs"
                    onClick={(e: any) => { e.stopPropagation(); if (!confirmLoading) onConfirmDelivery?.(); }}
                    disabled={!!confirmLoading}
                  >
                    {confirmLoading ? 'Confirmando…' : 'Confirmar recebimento'}
                  </button>
                )}
                {role === 'buyer' && (canNotReceived || (details.status || '').toLowerCase() === 'shipped') && (
                  <button
                    className="px-3 py-1.5 rounded bg-yellow-600/80 hover:bg-yellow-600 disabled:bg-gray-600 text-white text-xs"
                    onClick={(e: any) => { e.stopPropagation(); if (!notReceivedLoading) onNotReceived?.(); }}
                    disabled={!!notReceivedLoading}
                  >
                    {notReceivedLoading ? 'Enviando…' : 'Pedido não recebido'}
                  </button>
                )}
                {role === 'seller' && canShip && (
                  <button
                    className="px-3 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-600 disabled:bg-gray-600 text-white text-xs"
                    onClick={(e: any) => { e.stopPropagation(); if (!shipLoading) onShip?.(); }}
                    disabled={!!shipLoading}
                  >
                    {shipLoading ? 'Enviando…' : 'Confirmar envio'}
                  </button>
                )}
                {role === 'buyer' && canRate && (
                  <button
                    className="px-3 py-1.5 rounded bg-amber-600/80 hover:bg-amber-600 text-white text-xs flex items-center gap-1"
                    onClick={(e: any) => { e.stopPropagation(); handleRateClick(); }}
                  >
                    <Star className="w-3 h-3" />
                    Avaliar
                  </button>
                )}
                {role === 'buyer' && canCheckAccount && (
                  <button
                    className="px-3 py-1.5 rounded bg-purple-600/80 hover:bg-purple-600 text-white text-xs flex items-center gap-1"
                    onClick={(e: any) => { e.stopPropagation(); onCheckAccount?.(); }}
                  >
                    <Inbox className="w-3 h-3" />
                    Conta
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {}
                    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-3">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400">Valor</p>
                        <p className="text-white font-semibold truncate">{formatPrice(details.price, details.currency)}</p>
                      </div>
                    </div>

                    {}
                    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-3">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400">Data</p>
                        <p className="text-white font-semibold truncate">{formatDate(details.purchaseDate)}</p>
                      </div>
                    </div>

                    {details.deliveryMethod && (() => {
                      const accent = getDeliveryAccent(details.deliveryMethod);
                      const description = getDeliveryDescription(details.deliveryMethod);
                      return (
                        <div className="flex items-center gap-3 bg-gray-800/60 rounded-lg p-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent.wrapperClasses}`}>
                            <Package className={`w-4 h-4 ${accent.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-400">Entrega</p>
                            <p className="text-white font-semibold truncate">{formatDeliveryMethodLabel(details.deliveryMethod)}</p>
                            {description && (
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {}
                  <div className="mt-3 bg-gray-800/60 rounded-lg p-3 flex items-center gap-3">
                    {details.itemImageUrl ? (
                      <img src={details.itemImageUrl} alt={details.itemTitle || 'Item'} className="w-10 h-10 rounded object-cover border border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400">Produto</p>
                      <p className="text-sm text-white font-medium truncate">{details.itemTitle || '—'}</p>
                    </div>
                  </div>

                  {}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-1">Comprador</p>
                      <div className="flex items-center gap-2">
                        {details.buyer?.avatar ? (
                          <img src={details.buyer.avatar} className="w-6 h-6 rounded-full object-cover border border-gray-700" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-300" />
                          </div>
                        )}
                        <span className="text-sm text-white truncate">{details.buyer?.name || 'Cliente'}</span>
                      </div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-1">Vendedor</p>
                      <div className="flex items-center gap-2">
                        {details.seller?.avatar ? (
                          <img src={details.seller.avatar} className="w-6 h-6 rounded-full object-cover border border-gray-700" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-300" />
                          </div>
                        )}
                        <span className="text-sm text-white truncate">{details.seller?.name || 'Vendedor'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ==================== RENDERIZAÇÃO CONDICIONAL ====================
  const contentToRender = isMobile ? mobileContent : desktopContent;

  if (!usePortal) return contentToRender;
  
  const target = document.getElementById('modal-root') || document.body;
  return createPortal(
    <div className="modal-backdrop">{contentToRender}</div>,
    target
  );
};

export default MarketplaceOrderModal;

// ==================== COMPONENTE BOTÃO INLINE PARA HEADER ====================
interface MarketplaceHeaderButtonProps {
  isVisible: boolean;
  hasOrder: boolean;
  onClick: () => void;
  className?: string;
}

export const MarketplaceHeaderButton: React.FC<MarketplaceHeaderButtonProps> = ({
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
      title="Ver informações do pedido"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <ShoppingBag className="w-6 h-6 md:w-5 md:h-5" />
      {/* Badge com indicador animado */}
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-gray-900 shadow-sm"
      />
    </motion.button>
  );
};
