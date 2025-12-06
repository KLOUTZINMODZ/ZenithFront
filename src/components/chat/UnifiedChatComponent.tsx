import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Search, 
  Settings, 
  User, 
  DollarSign, 
  FileText, 
  XCircle, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  X,
  Loader2,
  Image as ImageIcon,
  ChevronDown
} from 'lucide-react';
import { useUnifiedChat } from '../../hooks/useUnifiedChat';
import { StorageManager } from './StorageManager';
import boostingChatService, { ProposalData } from '../../services/boostingChatService';
import boostingService from '../../services/boostingService';
import { userRoleDetectionService, UserRole } from '../../services/userRoleDetectionService';
import LastMessageLocalStorage from '../../services/lastMessageLocalStorage';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import archivedChatsStorage from '../../services/archivedChatsStorage';
import { SafeConversation } from '../../utils/chatSafety';
import { useProposalModal } from '../../hooks/useProposalModal';
import { validateMessage } from '../../utils/messageValidation';
import ProposalModal, { ProposalHeaderButton } from './ProposalModal';
import MarketplaceOrderModal, { MarketplaceHeaderButton } from './MarketplaceOrderModal';
import BoostingOrderModal, { BoostingOrderDetails, BoostingHeaderButton } from './BoostingOrderModal';
import ChatBlockedBanner from './ChatBlockedBanner';
import './UnifiedChatComponent.css';
import purchaseService from '../../services/purchaseService';
import websocketService from '../../services/websocketService';
import supportService from '../../services/supportService';
import ConversationItem from './ConversationItem';
import { useDebounce } from '../../hooks/useDebounce';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';
import marketplaceStatusCache from '../../services/marketplaceStatusCache';
import { useChatEvents } from '../../hooks/useChatEvents';

const UnifiedChatComponent: React.FC<{ initialConversationId?: string }> = ({ initialConversationId }) => {
  const navigate = useNavigate();

  const { 

    conversations,
    activeConversation,
    messages,
    isConnected,
    connectionMode,
    

    setActiveConversation,
    sendMessage,
    sendImage,
    retryMessage,
    refreshConversations,
    
    markAsRead,
    

    getStorageStats,
    exportStoredMessages,
    importStoredMessages,
    clearStoredMessages,
    

    isOwnMessage,
    

    isTemporaryConversation,
    getTemporaryStatus,
    getTemporaryExpiresAt,
    unreadCounts,
  
  } = useUnifiedChat();
  
  const { user } = useAuth();
  const { addNotification } = useNotifications();


  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [visibleConversationsCount, setVisibleConversationsCount] = useState(50);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMobileProposalSheetOpen, setIsMobileProposalSheetOpen] = useState(false);
  const [isMobileMarketplaceSheetOpen, setIsMobileMarketplaceSheetOpen] = useState(false);
  const [isMobileBoostingSheetOpen, setIsMobileBoostingSheetOpen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isDetectingRole, setIsDetectingRole] = useState(false);
  const [activeModalView, setActiveModalView] = useState<'main' | 'storage' | 'proposal' | 'cancel' | 'report' | 'support' | 'confirm' | 'success' | 'cancel_success'>('main');
  const [isTyping, setIsTyping] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [isChatBlocked, setIsChatBlocked] = useState(false);
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const proposalCacheRef = useRef(new Map<string, ProposalData | null>());
  const [cancelReason, setCancelReason] = useState('');
  const [reportData, setReportData] = useState({ reason: '', description: '', evidence: '' });
  const [supportDescription, setSupportDescription] = useState('');
  const [showLengthError, setShowLengthError] = useState<{show: boolean, messageLength: number} | null>(null);
  const [marketplaceInfo, setMarketplaceInfo] = useState<{ purchaseId: string; buyerId: string; sellerId: string; status: string; deliveryMethod?: string } | null>(null);
  const [boostingOrderDetails, setBoostingOrderDetails] = useState<BoostingOrderDetails | null>(null);
  const [isShipping, setIsShipping] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isDisputingNotReceived, setIsDisputingNotReceived] = useState(false);
  const [isOpeningSupport, setIsOpeningSupport] = useState(false);
  const [presenceOther, setPresenceOther] = useState<{ online: boolean; lastSeen?: string; lastActiveAt?: string } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  

  

  const {
    isVisible: isProposalModalVisible,
    proposalData: modalProposalData,
    userRole: proposalUserRole,
    isLoading: isProposalLoading,
    rejectProposal: rejectModalProposal,
    hideModal: hideProposalModal,
    showTestModal
  } = useProposalModal(activeConversation);
  
  useChatEvents({
    userId: user?.id,
    debug: ((import.meta as any).env?.DEV === true || (import.meta as any).env?.MODE === 'development'),
    
    onPurchaseStatusChanged: useCallback((update: any) => {
      try {
        const { conversationId, purchaseId, status, buyerId, sellerId, shippedAt, deliveredAt, autoReleaseAt, type, deliveryMethod } = update || {};
        const nextStatus = String(status || '');
        const isSameConversation = conversationId && activeConversation && String(conversationId) === String(activeConversation);
        const isSamePurchase = marketplaceInfo?.purchaseId && purchaseId && String(purchaseId) === String(marketplaceInfo.purchaseId);

        if (purchaseId && type !== 'boosting') {
          marketplaceStatusCache.set(purchaseId, nextStatus, {
            purchaseId,
            buyerId,
            sellerId,
            conversationId,
            status: nextStatus,
            shippedAt,
            deliveredAt,
            autoReleaseAt,
            deliveryMethod: deliveryMethod || marketplaceInfo?.deliveryMethod
          }, 'websocket');
        }

        if (type === 'boosting') {
          const sameConv = conversationId && activeConversation && String(conversationId) === String(activeConversation);
          if (sameConv) {
            setBoostingOrderDetails((prev: BoostingOrderDetails | null) => prev ? { ...prev, status: nextStatus } : prev);
          }
          return;
        }

        if (isSameConversation || isSamePurchase) {
          const currentUserId = (user?.id || getUserIdFromToken() || '').toString();
          const isBuyer = !!(marketplaceInfo?.buyerId && currentUserId && String(marketplaceInfo.buyerId) === currentUserId);

          if (nextStatus === 'completed' && (marketplaceInfo?.status || '') !== 'completed') {
            try {
              if (isBuyer) {
                addNotification({
                  title: 'Pedido concluído',
                  message: 'Obrigado por confirmar! Pedido finalizado com sucesso.',
                  type: 'success'
                });
              }
            } catch {}
          }

          setMarketplaceInfo(prev => {
            if (prev) return { ...prev, status: nextStatus || (prev.status || ''), deliveryMethod: deliveryMethod || prev.deliveryMethod };
            
            try {
              const conv = conversations.find(c => c._id === activeConversation) as any;
              if (conv && (conv.marketplace || conv.metadata)) {
                const mpx = conv.marketplace || {};
                const meta = conv.metadata || {};
                const toIdLocal = (v: any): string | undefined => {
                  if (!v) return undefined; if (typeof v === 'string') return v;
                  if (typeof v === 'object') {
                    if (v.$oid) return String(v.$oid);
                    if (v._id) return String(v._id);
                    if (typeof v.toString === 'function') return v.toString();
                  }
                  return undefined;
                };
                const pickFirst = (...vals: any[]): string | undefined => {
                  for (const v of vals) { const id = toIdLocal(v); if (id) return id; }
                  return undefined;
                };
                const derivedPurchaseId = pickFirst(mpx.purchaseId, meta.purchaseId, purchaseId);
                const buyerId = pickFirst(
                  mpx?.buyer?.userid, mpx?.buyer?._id,
                  meta?.clientData?.userid, meta?.clientData?._id,
                  meta?.client?.userid, meta?.client?._id,
                  conv?.client?.userid, conv?.client?._id
                );
                const sellerId = pickFirst(
                  mpx?.seller?.userid, mpx?.seller?._id,
                  meta?.boosterData?.userid, meta?.boosterData?._id,
                  meta?.booster?.userid, meta?.booster?._id,
                  conv?.booster?.userid, conv?.booster?._id
                );
                const derivedDeliveryMethod = deliveryMethod || mpx.deliveryMethod || mpx.item?.deliveryMethod || meta.deliveryMethod;
                if (derivedPurchaseId && (buyerId || sellerId)) {
                  return { purchaseId: String(derivedPurchaseId), buyerId: String(buyerId || ''), sellerId: String(sellerId || ''), status: nextStatus, deliveryMethod: derivedDeliveryMethod };
                }
              }
            } catch {}
            return prev;
          });
        }
      } catch {}
    }, [activeConversation, conversations, marketplaceInfo?.purchaseId, marketplaceInfo?.status, user?.id, addNotification, setBoostingOrderDetails]),
    
    onSupportTicket: useCallback((ticket: any) => {
      try {
        const { conversationId, purchaseId } = ticket || {};
        const matchesConversation = conversationId && activeConversation && String(conversationId) === String(activeConversation);
        const matchesPurchase = marketplaceInfo?.purchaseId && purchaseId && String(purchaseId) === String(marketplaceInfo.purchaseId);
        if (matchesConversation || matchesPurchase) {
          setIsChatBlocked(true);
          if (activeConversation) {
            saveBlockedStateToStorage(activeConversation, true, 'support_ticket');
          }
          try {
            addNotification({ title: 'Suporte acionado', message: 'Chat bloqueado até avaliação do suporte.', type: 'info' });
          } catch {}
        }
      } catch {}
    }, [activeConversation, marketplaceInfo?.purchaseId, addNotification]),

    onServiceCancelled: useCallback((data: any) => {
      try {
        const { conversationId, reason, boostingStatus, isActive } = data || {};
        const matchesConversation = conversationId && activeConversation && String(conversationId) === String(activeConversation);
        
        if (matchesConversation) {
          setBoostingOrderDetails((prev: BoostingOrderDetails | null) => 
            prev ? { ...prev, status: 'cancelled' } : prev
          );
          
          setConversations(prev => prev.map(c => 
            c._id === conversationId 
              ? { ...c, boostingStatus: boostingStatus || 'cancelled', isActive: false }
              : c
          ));
          
          setIsChatBlocked(true);
          if (activeConversation) {
            saveBlockedStateToStorage(activeConversation, true, 'service_cancelled');
          }
          
          try {
            addNotification({
              title: 'Serviço cancelado',
              message: reason || 'O pedido de boosting foi cancelado.',
              type: 'warning'
            });
          } catch {}
          
          if (!isActive) {
            setTimeout(() => {
              refreshConversations();
            }, 1000);
          }
        }
      } catch (err) {
      }
    }, [activeConversation, addNotification, refreshConversations]),

    onProposalCancelled: useCallback((data: any) => {
      try {
        const { proposalId, boostingId } = data || {};
        
        if (boostingOrderDetails?.agreementId === proposalId || boostingOrderDetails?.agreementId === boostingId) {
          setBoostingOrderDetails(null);
        }
        
        if (activeConversation) {
          setIsChatBlocked(true);
          saveBlockedStateToStorage(activeConversation, true, 'proposal_cancelled');
        }
        
        try {
          addNotification({
            title: 'Proposta cancelada',
            message: 'A proposta de boosting foi cancelada.',
            type: 'warning'
          });
        } catch {}
      } catch (err) {
      }
    }, [activeConversation, boostingOrderDetails, addNotification])
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);


  const [lastMessageUpdateTrigger, setLastMessageUpdateTrigger] = useState(0);
  
  const updateScrollIndicators = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    isNearBottomRef.current = distanceFromBottom <= 160;
    setShowScrollToBottom(distanceFromBottom > 160);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateScrollIndicators();
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true } as AddEventListenerOptions);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeConversation, updateScrollIndicators]);
  
  const [previewImage, setPreviewImage] = useState<{ file: File; url: string } | null>(null);
  const [isSendingPreview, setIsSendingPreview] = useState(false);
  
  const [imageViewer, setImageViewer] = useState<{ url: string; alt?: string } | null>(null);

  useEffect(() => {
    return () => {
      try { if (previewImage?.url) URL.revokeObjectURL(previewImage.url); } catch {}
    };
  }, [previewImage]);

  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const formatDayLabel = (d: Date): string => {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (isSameLocalDay(d, now)) return 'Hoje';
      if (isSameLocalDay(d, yesterday)) return 'Ontem';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return '';
    }
  };

  const relativeTimeFrom = (iso?: string): string => {
    if (!iso) return '';
    try {
      const now = Date.now();
      const t = new Date(iso).getTime();
      const diffMs = Math.max(0, now - t);
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'agora';
      if (mins < 60) return `há ${mins} min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `há ${hrs} h`;
      const days = Math.floor(hrs / 24);
      return `há ${days} d`;
    } catch {
      return '';
    }
  };

  const handleRemovePreview = useCallback(() => {
    try { if (previewImage?.url) URL.revokeObjectURL(previewImage.url); } catch {}
    setPreviewImage(null);
    setIsSendingPreview(false);
  }, [previewImage]);

  const handleSendPreviewImage = useCallback(async () => {
    if (!previewImage?.file || !activeConversation) return;
    setIsSendingPreview(true);
    try {
      await sendImage(activeConversation, previewImage.file);
    } finally {
      handleRemovePreview();
    }
  }, [activeConversation, previewImage, sendImage, handleRemovePreview]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior });
    isNearBottomRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  useEffect(() => {
    if (!activeConversation) {
      previousConversationIdRef.current = null;
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) return;

    const conversationChanged = previousConversationIdRef.current !== activeConversation;
    const currentMessageCount = messages.get(activeConversation || '')?.length || 0;
    if (conversationChanged) {
      previousConversationIdRef.current = activeConversation;
    }

    const shouldStickToBottom = conversationChanged || currentMessageCount === 0 || isNearBottomRef.current;

    if (shouldStickToBottom) {
      const behavior: ScrollBehavior = conversationChanged || currentMessageCount === 0 ? 'auto' : 'smooth';
      const rafId = requestAnimationFrame(() => scrollToBottom(behavior));
      return () => cancelAnimationFrame(rafId);
    }

    updateScrollIndicators();
  }, [activeConversation, messages, scrollToBottom, updateScrollIndicators]);

  useEffect(() => {
    if (!imageViewer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setImageViewer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageViewer]);

  useEffect(() => {
    if (activeConversation) {
      try { markAsRead(activeConversation); } catch {}
    }
  }, [activeConversation, markAsRead]);

  useEffect(() => {
    if (!activeConversation) return;

    return () => {
      setActiveModalView('main');
      setCancelReason('');
      setReportData({ reason: '', description: '', evidence: '' });
      setSupportDescription('');
      setIsLoadingAction(false);
      setIsDetectingRole(false);
    };
  }, [activeConversation]);

  useEffect(() => {
    if (activeConversation && messages && messages.length > 0) {
      const timer = setTimeout(() => {
        try { 
          markAsRead(activeConversation); 
        } catch (error) {
        }
      }, 1000); 
      
      return () => clearTimeout(timer);
    }
  }, [messages, activeConversation, markAsRead]);

  useEffect(() => {
    const handleConversationDeleted = (event: CustomEvent) => {
      const { conversationId, message } = event.detail || {};

      if (activeConversation === conversationId) {
        setActiveConversation(null);
        
        try {
          addNotification({
            title: 'Chat removido',
            message: message || 'Este chat foi removido porque outra proposta foi aceita.',
            type: 'info'
          });
        } catch {}
      }

      try {
        refreshConversations();
      } catch {}
    };

    window.addEventListener('conversation:deleted', handleConversationDeleted as EventListener);
    return () => window.removeEventListener('conversation:deleted', handleConversationDeleted as EventListener);
  }, [activeConversation, setActiveConversation, addNotification, refreshConversations]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const path = window.location?.pathname || '';
      if (!path.startsWith('/messages')) return;

      const htmlEl = document.documentElement as HTMLElement;
      const bodyEl = document.body as HTMLElement;
      const rootEl = document.getElementById('root') as HTMLElement | null;
      const contentEl = document.querySelector('.content-container') as HTMLElement | null;

      const targets: HTMLElement[] = [htmlEl, bodyEl];
      if (rootEl) targets.push(rootEl);
      if (contentEl) targets.push(contentEl);

      const prev: Array<{ el: HTMLElement; overflow: string; overscroll: string }> = [];
      targets.forEach((el) => {
        prev.push({ el, overflow: el.style.overflow, overscroll: el.style.getPropertyValue('overscroll-behavior') });
        el.style.overflow = 'hidden';
        try { el.style.setProperty('overscroll-behavior', 'none'); } catch {}
      });

      const freezeWindowScroll = () => {
        if (window.scrollX !== 0 || window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      };
      
      window.scrollTo(0, 0);
      window.addEventListener('scroll', freezeWindowScroll, { passive: true });

      return () => {
        window.removeEventListener('scroll', freezeWindowScroll);
        
        prev.forEach(({ el, overflow, overscroll }) => {
          el.style.overflow = overflow || '';
          if (overscroll) el.style.setProperty('overscroll-behavior', overscroll);
          else el.style.removeProperty('overscroll-behavior');
        });
      };
    } catch {}
  }, []);

  useEffect(() => {
    if (initialConversationId && typeof initialConversationId === 'string') {
      try {
        setActiveConversation(initialConversationId);
        
        try { localStorage.setItem('unified_chat_active_conversation', initialConversationId); } catch {}
      } catch {}
    }
  }, [initialConversationId, setActiveConversation]);

  useEffect(() => {
    const handleLastMessageUpdate = (event: CustomEvent) => {
      const { conversationId } = event.detail;

      if (conversations.some(conv => conv._id === conversationId)) {
        setLastMessageUpdateTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('last-message-updated', handleLastMessageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('last-message-updated', handleLastMessageUpdate as EventListener);
    };
  }, [conversations]);

  useEffect(() => {
    try {
      const conv = conversations.find(c => c._id === activeConversation);
      if (!conv) {
        setMarketplaceInfo(null);
        return;
      }
      if (isMarketplaceConversation(conv)) {
        const localInfo = getMarketplaceInfoFromConversation(conv);

        const rank = (s?: string) => {
          const t = String(s || '').toLowerCase();
          switch (t) {
            case 'initiated': return 0;
            case 'escrow_reserved': return 1;
            case 'shipped': return 2;
            case 'completed': return 3;
            case 'cancelled': return 4; 
            default: return -1;
          }
        };

        if (localInfo) {
          setMarketplaceInfo(prev => {
            if (!prev) return localInfo;
            
            if (prev.purchaseId && localInfo.purchaseId && String(prev.purchaseId) !== String(localInfo.purchaseId)) {
              return localInfo;
            }
            
            const prevRank = rank(prev.status);
            const nextRank = rank(localInfo.status);
            const mergedStatus = nextRank > prevRank ? (localInfo.status || prev.status) : (prev.status || localInfo.status);
            return {
              purchaseId: localInfo.purchaseId || prev.purchaseId,
              buyerId: (localInfo as any).buyerId || (prev as any).buyerId,
              sellerId: (localInfo as any).sellerId || (prev as any).sellerId,
              status: mergedStatus || '',
              deliveryMethod: localInfo.deliveryMethod || prev.deliveryMethod
            } as any;
          });
        } else {
          setMarketplaceInfo(prev => prev || null);
        }

        const pid = getPurchaseId(conv);
        if (!pid) {
          setMarketplaceInfo(prev => (prev && prev.status ? prev : null));
          return;
        }
        
        const cached = marketplaceStatusCache.get(pid);
        if (cached) {
          setMarketplaceInfo({
            purchaseId: cached.purchaseId,
            buyerId: cached.data.buyerId || '',
            sellerId: cached.data.sellerId || '',
            status: cached.status,
            deliveryMethod: cached.data.deliveryMethod
          } as any);
          
          if (cached.source === 'websocket' && (Date.now() - cached.timestamp) < 30000) {
            return;
          }
        }
        
        (async () => {
          try {
            const res = await purchaseService.getById(pid);
            if (res?.success && res.data) {
              const fetched = {
                purchaseId: res.data.purchaseId,
                buyerId: res.data.buyerId,
                sellerId: res.data.sellerId,
                status: res.data.status,
                shippedAt: res.data.shippedAt,
                deliveredAt: res.data.deliveredAt,
                autoReleaseAt: res.data.autoReleaseAt,
                deliveryMethod: res.data.deliveryMethod
              } as any;
              
              const accepted = marketplaceStatusCache.set(
                fetched.purchaseId,
                fetched.status,
                fetched,
                'api'
              );
              
              if (accepted) {
                setMarketplaceInfo(prev => {
                  if (!prev) return fetched;
                  if (prev.purchaseId && fetched.purchaseId && String(prev.purchaseId) !== String(fetched.purchaseId)) {
                    return fetched;
                  }
                  const prevRank = rank(prev.status);
                  const nextRank = rank(fetched.status);
                  
                  if (nextRank >= prevRank) {
                    return { ...prev, ...fetched, status: fetched.status, deliveryMethod: fetched.deliveryMethod || prev.deliveryMethod };
                  }
                  return prev;
                });
              }
            }
          } catch (err) {
          }
        })();
      } else {
        setMarketplaceInfo(null);
      }
    } catch {}
  }, [activeConversation, conversations]);

  const getUserIdFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (error) {
      return null;
    }
  };

  const getChatApiBase = () => {
    const envBase = ((import.meta as any).env?.VITE_CHAT_API_URL as string) || 'http://localhost:5000';
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envBase.startsWith('http://')) {
      return envBase.replace('http://', 'https://').replace(/\/$/, '');
    }
    return envBase.replace(/\/$/, '');
  };

  const isMarketplaceConversation = (conv?: any): boolean => {
    if (!conv) return false;
    if (conv.type === 'marketplace') return true;
    const meta: any = conv.metadata || {};
    try {
      if (typeof meta.get === 'function') {
        return Boolean(meta.get('purchaseId')) || meta.get('context') === 'marketplace_purchase';
      }
      return Boolean(meta.purchaseId) || meta.context === 'marketplace_purchase';
    } catch {
      return false;
    }
  };

  const getPurchaseId = (conv?: any): string | null => {
    if (!conv) return null;
    try {
      const mp = (conv as any).marketplace;
      if (mp?.purchaseId) {
        const pid = typeof mp.purchaseId === 'object' && (mp.purchaseId as any).toString ? (mp.purchaseId as any).toString() : String(mp.purchaseId);
        return pid || null;
      }
    } catch {}
    const meta: any = conv.metadata || {};
    try {
      if (typeof meta.get === 'function') {
        return meta.get('purchaseId') || null;
      }
      return meta.purchaseId || null;
    } catch {
      return null;
    }
  };

  const getMarketplaceInfoFromConversation = (conv?: any): { purchaseId: string; buyerId: string; sellerId: string; status: string; deliveryMethod?: string } | null => {
    if (!conv) return null;
    try {
      const mp = (conv as any).marketplace;
      if (mp && (mp.buyer || mp.seller)) {
        const buyerId = mp.buyer?.userid?.$oid || mp.buyer?.userid?._id || mp.buyer?.userid || mp.buyer?._id || '';
        const sellerId = mp.seller?.userid?.$oid || mp.seller?.userid?._id || mp.seller?.userid || mp.seller?._id || '';
        const purchaseId = ((): string => {
          if (!mp.purchaseId) return getPurchaseId(conv) || '';
          if (typeof mp.purchaseId === 'object' && (mp.purchaseId as any).$oid) return String((mp.purchaseId as any).$oid);
          if (typeof mp.purchaseId === 'object' && (mp.purchaseId as any).toString) return (mp.purchaseId as any).toString();
          return String(mp.purchaseId);
        })();
        const status = mp.statusCompra || (conv.metadata?.statusCompra) || '';
        const deliveryMethod = mp.deliveryMethod || mp.item?.deliveryMethod || conv.metadata?.deliveryMethod;
        if (purchaseId && (buyerId || sellerId)) {
          return { purchaseId: String(purchaseId), buyerId: String(buyerId), sellerId: String(sellerId), status: String(status || ''), deliveryMethod: deliveryMethod ? String(deliveryMethod) : undefined };
        }
      }
    } catch {}
    return null;
  };

  const toAbsoluteImageUrl = (u?: string) => {
    if (!u) return '';
    if (/^https?:\/\//.test(u)) return u;
    const base = getChatApiBase();
    let full = u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
    try {
      if (/ngrok/i.test(base)) {
        const url = new URL(full);
        if (!url.searchParams.has('ngrok-skip-browser-warning')) {
          url.searchParams.set('ngrok-skip-browser-warning', '1');
        }
        full = url.toString();
      }
    } catch {}
    return full;
  };


  const getConversationDisplayName = (conversation: any): string => {
    const currentUserId = (user?.id || getUserIdFromToken() || '').toString();

    const toId = (val: any): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        if (val.$oid) return String(val.$oid);
        if (val._id) return String(val._id);
        return String(val);
      }
      return undefined;
    };

    const isCurrentUser = (participant: any): boolean => {
      if (!participant) return false;

      if (currentUserId) {
        const participantMongoId = toId(participant._id);
        if (participantMongoId && participantMongoId === currentUserId) return true;
        const participantUserId = toId(participant.userid);
        if (participantUserId && participantUserId === currentUserId) return true;
      }

      try {
        const participantName =
          participant.name || participant.username || participant.legalName || participant.displayName;
        const currentName =
          (user as any)?.name || (user as any)?.username || (user as any)?.legalName || (user as any)?.displayName;
        if (participantName && currentName && String(participantName) === String(currentName)) {
          return true;
        }
      } catch {}

      return false;
    };

    try {
      const mp = (conversation as any).marketplace;
      if (mp && (mp.buyer || mp.seller)) {
        const buyer = mp.buyer || {};
        const seller = mp.seller || {};

        const buyerIsCurrent = isCurrentUser(buyer);
        const sellerIsCurrent = isCurrentUser(seller);

        if (buyerIsCurrent) {
          return (
            seller.name ||
            seller.legalName ||
            seller.username ||
            'Usuário'
          );
        }

        if (sellerIsCurrent) {
          return (
            buyer.name ||
            buyer.legalName ||
            buyer.username ||
            'Usuário'
          );
        }

        if (seller?.name) return seller.name;
        if (buyer?.name) return buyer.name;
      }
    } catch {}

    const c = (conversation as any).client;
    const b = (conversation as any).booster;
    if (c && b) {
      if (isCurrentUser(c)) {
        return b.name || b.legalName || b.username || 'Usuário';
      }
      if (isCurrentUser(b)) {
        return c.name || c.legalName || c.username || 'Usuário';
      }

      if (b?.name) return b.name;
      if (c?.name) return c.name;
    }

    try {
      const meta = (conversation as any).metadata || {};
      const cd = meta.clientData || meta.client || {};
      const bd = meta.boosterData || meta.booster || {};

      if (isCurrentUser(cd)) {
        return bd.name || bd.legalName || bd.username || 'Usuário';
      }
      if (isCurrentUser(bd)) {
        return cd.name || cd.legalName || cd.username || 'Usuário';
      }

      if (bd?.name) return bd.name;
      if (cd?.name) return cd.name;
    } catch {}

    if (conversation.participants && Array.isArray(conversation.participants)) {
      for (const participant of conversation.participants) {
        const participantUser = (participant as any).user || participant;
        if (!isCurrentUser(participantUser)) {
          return participantUser.name || participantUser.username || 'Usuário';
        }
      }
    }

    return conversation.name || 'Conversa';
  };


  const getUserAvatar = (senderId: string, conversation: any): string | null => {
    if (!conversation || !senderId) return null;


    const normalizedSenderId = typeof senderId === 'object' && (senderId as any).$oid ? (senderId as any).$oid : senderId.toString();


    const conv = conversation as any;
    if (conv.client && conv.booster) {

      const clientUserId = typeof conv.client.userid === 'object' 
        ? conv.client.userid.$oid || conv.client.userid.toString()
        : conv.client.userid?.toString();
      const boosterUserId = typeof conv.booster.userid === 'object'
        ? conv.booster.userid.$oid || conv.booster.userid.toString()
        : conv.booster.userid?.toString();


      if (normalizedSenderId === clientUserId && conv.client.avatar && conv.client.avatar !== 'Sem Avatar') {
        return toAbsoluteImageUrl(conv.client.avatar);
      }
      

      if (normalizedSenderId === boosterUserId && conv.booster.avatar && conv.booster.avatar !== 'Sem Avatar') {
        return toAbsoluteImageUrl(conv.booster.avatar);
      }
    }

    
    try {
      const meta = conv?.metadata || {};
      const cd = meta.clientData || meta.client || {};
      const bd = meta.boosterData || meta.booster || {};
      const cId = (typeof cd.userid === 'object' && cd.userid?.$oid) ? cd.userid.$oid : (cd.userid || cd._id);
      const bId = (typeof bd.userid === 'object' && bd.userid?.$oid) ? bd.userid.$oid : (bd.userid || bd._id);
      if (cId && normalizedSenderId === String(cId)) {
        const av = cd.avatar || cd.profileImage || cd.profilePicture;
        if (av && av !== 'Sem Avatar') return toAbsoluteImageUrl(av);
      }
      if (bId && normalizedSenderId === String(bId)) {
        const av = bd.avatar || bd.profileImage || bd.profilePicture;
        if (av && av !== 'Sem Avatar') return toAbsoluteImageUrl(av);
      }
    } catch {}


    if (conversation.participants && Array.isArray(conversation.participants)) {
      for (const participant of conversation.participants) {
        const participantUser = participant.user || participant;
        const participantId = participantUser._id || participantUser.id;
        
        if (participantId && participantId.toString() === normalizedSenderId) {
          const avatar = participantUser.avatar || participantUser.profilePicture || participantUser.profileImage;
          if (avatar && avatar !== 'Sem Avatar') {
            return toAbsoluteImageUrl(avatar);
          }
        }
      }
    }

    return null;
  };


  const getUserName = (senderId: string, conversation: any): string => {
    if (!conversation || !senderId) return 'Usuário';


    const normalizedSenderId = typeof senderId === 'object' && (senderId as any).$oid ? (senderId as any).$oid : senderId.toString();


    const conv = conversation as any;
    if (conv.client && conv.booster) {
      const clientUserId = typeof conv.client.userid === 'object' 
        ? conv.client.userid.$oid || conv.client.userid.toString()
        : conv.client.userid?.toString();
      const boosterUserId = typeof conv.booster.userid === 'object'
        ? conv.booster.userid.$oid || conv.booster.userid.toString()
        : conv.booster.userid?.toString();

      if (normalizedSenderId === clientUserId) {
        return conv.client.name || 'Cliente';
      }
      
      if (normalizedSenderId === boosterUserId) {
        return conv.booster.name || 'Booster';
      }
    }

    
    try {
      const meta = conv?.metadata || {};
      const cd = meta.clientData || meta.client || {};
      const bd = meta.boosterData || meta.booster || {};
      const cId = (typeof cd.userid === 'object' && cd.userid?.$oid) ? cd.userid.$oid : (cd.userid || cd._id);
      const bId = (typeof bd.userid === 'object' && bd.userid?.$oid) ? bd.userid.$oid : (bd.userid || bd._id);
      if (cId && normalizedSenderId === String(cId)) {
        return cd.name || cd.legalName || cd.username || 'Cliente';
      }
      if (bId && normalizedSenderId === String(bId)) {
        return bd.name || bd.legalName || bd.username || 'Vendedor';
      }
    } catch {}


    if (conversation.participants && Array.isArray(conversation.participants)) {
      for (const participant of conversation.participants) {
        const participantUser = participant.user || participant;
        const participantId = participantUser._id || participantUser.id;
        
        if (participantId && participantId.toString() === normalizedSenderId) {
          return participantUser.name || participantUser.username || 'Usuário';
        }
      }
    }

    return 'Usuário';
  };


  const getTimeRemaining = (expiresAt: string): string => {
    try {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        return 'Expirado';
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return 'Erro';
    }
  };




  const saveBlockedStateToStorage = (conversationId: string, isBlocked: boolean, reason?: string) => {
    try {
      const key = `chat_blocked_${conversationId}`;
      if (isBlocked) {
        localStorage.setItem(key, JSON.stringify({
          isBlocked: true,
          reason: reason || 'pedido_finalizado',
          blockedAt: new Date().toISOString()
        }));
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {

    }
  };

  const getBlockedStateFromStorage = (conversationId: string) => {
    try {
      const key = `chat_blocked_${conversationId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        return data;
      }
    } catch (error) {

    }
    return null;
  };


  useEffect(() => {
    if (activeConversation) {

      const storedBlocked = getBlockedStateFromStorage(activeConversation);
      

      const backendBlocked = conversations.find(conversation => conversation._id === activeConversation)?.isBlocked;
      
      if (backendBlocked || storedBlocked?.isBlocked) {
        setIsChatBlocked(true);
        

        if (backendBlocked && !storedBlocked?.isBlocked) {
          saveBlockedStateToStorage(activeConversation, true);
        }
      } else {
        setIsChatBlocked(false);

        if (storedBlocked?.isBlocked && !backendBlocked) {
          saveBlockedStateToStorage(activeConversation, false);
        }
      }
    }
  }, [conversations, activeConversation]);


  useEffect(() => {
    if (!activeConversation) return;
    
    const checkIntegrity = async () => {
      const backendBlocked = conversations.find(conversation => conversation._id === activeConversation)?.isBlocked;
      

      if (backendBlocked && !isChatBlocked) {

        setIsChatBlocked(true);
        saveBlockedStateToStorage(activeConversation, true);
      }
    };
    

    const integrityInterval = setInterval(checkIntegrity, 5000);
    
    return () => clearInterval(integrityInterval);
  }, [activeConversation, conversations, isChatBlocked]);


  useEffect(() => {
    if (conversations && conversations.length > 0) {

      LastMessageLocalStorage.syncWithBackend(conversations);
    }
  }, [conversations]);


  useEffect(() => {
    if (messages && activeConversation) {
      const conversationMessages = messages.get(activeConversation);
      if (conversationMessages && conversationMessages.length > 0) {
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        if (lastMessage) {
          LastMessageLocalStorage.saveLastMessage(activeConversation, {
            text: lastMessage.type === 'image' ? '[Imagem]' : (lastMessage.content || 'Mensagem sem conteúdo'),
            timestamp: lastMessage.createdAt || new Date().toISOString(),
            senderId: typeof lastMessage.sender === 'string' ? lastMessage.sender : lastMessage.sender?._id || 'unknown',
            messageId: lastMessage._id,
            type: lastMessage.type || 'text'
          });
        }
      }
    }
  }, [messages, activeConversation]);


  
  useEffect(() => {
    const detectRole = async () => {
      const userId = user?.id || getUserIdFromToken();
      
      if (activeConversation && userId) {
        
        const cachedRole = userRoleDetectionService.getCachedUserRole(
          activeConversation,
          userId.toString()
        );
        
        if (cachedRole) {
          
          setUserRole(cachedRole);
          setIsDetectingRole(false);
          return;
        }
        
        
        setIsDetectingRole(true);
        
        try {
          const detectedRole = await userRoleDetectionService.detectUserRole(
            activeConversation, 
            userId.toString()
          );
          
          setUserRole(detectedRole);
        } catch (error) {
          const fallbackRole = {
            role: 'unknown' as const,
            conversationId: activeConversation,
            userId: userId.toString()
          };
          setUserRole(fallbackRole);
        } finally {
          setIsDetectingRole(false);
        }
      } else {
        setUserRole(null);
        setIsDetectingRole(false);
      }
    };
    
    detectRole();
  }, [activeConversation, user?.id]);


  useEffect(() => {
    if (isConnected !== undefined) {
   
    }
  }, [isConnected, connectionMode]);


  
  const isMobileDevice = useIsMobileDevice();
  
  useEffect(() => {
    setIsSmallScreen(isMobileDevice);
  }, [isMobileDevice]);


  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => {
        setShowTypingIndicator(true);
      }, 2000);
      const hideTimer = setTimeout(() => {
        setShowTypingIndicator(false);
      }, 5000);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [isTyping]);


  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!messageInput.trim() || !activeConversation) return;
    
    const content = messageInput.trim();
    
    
    if (content.length > 10000) {
      setShowLengthError({ show: true, messageLength: content.length });
      setTimeout(() => setShowLengthError(null), 5000);
      return;
    }
    
    
    const validation = validateMessage(content);
    if (!validation.isValid) {
      addNotification({
        title: 'Mensagem bloqueada',
        message: validation.reason || 'Conteúdo não permitido detectado',
        type: 'error'
      });
      return;
    }
    
    setMessageInput('');
    
    try {
      await sendMessage(activeConversation, content);
    } catch (error: any) {

      

      if (error.isBlocked) {
        alert(`Chat bloqueado: ${error.blockedReason === 'pedido_finalizado' ? 'Pedido finalizado. Para iniciar uma nova conversa, faça um novo pedido.' : 'Chat foi bloqueado.'}`);
        return;
      }
      

      setMessageInput(content);
    }
  }, [messageInput, activeConversation, sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (e.target.value.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, []);

  const handleConversationSelect = useCallback((conversation: any) => {
    setActiveConversation(conversation._id);
    setShowMobileChat(true);
    try { markAsRead(conversation._id); } catch {}
  }, [setActiveConversation, markAsRead]);


  useEffect(() => {
    if (!showSettingsModal || !activeConversation) return;
    
    
    const currentConversation = conversations.find(c => c._id === activeConversation);
    if (currentConversation?.isTemporary) {
      setProposalData(null);
      proposalCacheRef.current.set(activeConversation, null);
      return;
    }
    
    const cached = proposalCacheRef.current.get(activeConversation);
    if (cached !== undefined) {
      setProposalData(cached);
      return;
    }
    let aborted = false;
    (async () => {
      try {
        const proposal = await boostingChatService.getAcceptedProposal(activeConversation);
        if (aborted) return;
        proposalCacheRef.current.set(activeConversation, proposal || null);
        setProposalData(proposal || null);
      } catch {
        if (!aborted) proposalCacheRef.current.set(activeConversation, null);
      }
    })();
    return () => { aborted = true; };
  }, [showSettingsModal, activeConversation, conversations]);

  
  useEffect(() => {
    const convoId = activeConversation;
    if (!convoId) return;
    if (proposalCacheRef.current.has(convoId)) return;
    
    
    const currentConversation = conversations.find(c => c._id === convoId);
    if (currentConversation?.isTemporary) {
      proposalCacheRef.current.set(convoId, null);
      return;
    }
    
    let aborted = false;
    (async () => {
      try {
        const proposal = await boostingChatService.getAcceptedProposal(convoId);
        if (!aborted) proposalCacheRef.current.set(convoId, proposal || null);
      } catch {
        if (!aborted) proposalCacheRef.current.set(convoId, null);
      }
    })();
    return () => { aborted = true; };
  }, [activeConversation, conversations]);


  const getLastMessageText = useCallback((conversation: any): string => {

    const cachedLastMessage = LastMessageLocalStorage.getLastMessage(conversation._id);
    if (cachedLastMessage?.text) {
      return cachedLastMessage.text;
    }
    

    return conversation.lastMessage?.content || conversation.lastMessageText || 'Nenhuma mensagem';
  }, [lastMessageUpdateTrigger]);

  const handleCloseModal = useCallback(() => {
    setShowSettingsModal(false);
    setActiveModalView('main');
    setProposalData(null);
    setReportData({ reason: '', description: '', evidence: '' });
    setSupportDescription('');
  }, []);

  const handleRetryMessage = useCallback(async (messageId: string) => {
    retryMessage(messageId);
  }, [retryMessage]);

  const handleViewProposal = useCallback(() => {
    setActiveModalView('proposal');
  }, []);

  const prefetchSettings = useCallback(() => {
    const convoId = activeConversation;
    if (!convoId) return;
    
    
    const currentConversation = conversations.find(c => c._id === convoId);
    if (currentConversation?.isTemporary) {
      proposalCacheRef.current.set(convoId, null);
      return;
    }
    
    
    if (!proposalCacheRef.current.has(convoId)) {
      (async () => {
        try {
          const proposal = await boostingChatService.getAcceptedProposal(convoId);
          proposalCacheRef.current.set(convoId, proposal || null);
        } catch {
          proposalCacheRef.current.set(convoId, null);
        }
      })();
    }
    
    
    const userId = user?.id || getUserIdFromToken();
    if (userId) {
      const cachedRole = userRoleDetectionService.getCachedUserRole(
        convoId,
        userId.toString()
      );
      
      if (!cachedRole) {
        
        userRoleDetectionService.detectUserRole(
          convoId,
          userId.toString()
        ).catch(() => {});
      }
    }
  }, [activeConversation, user?.id]);

  const handleReportService = useCallback(() => {
    setActiveModalView('report');
  }, []);

  const handleConfirmDelivery = useCallback(() => {
    setActiveModalView('confirm');
  }, []);

  const executeReportService = useCallback(async () => {
    if (!activeConversation || !reportData.reason.trim()) return;
    
    try {
      setIsLoadingAction(true);
      await boostingChatService.reportService(activeConversation, reportData);
      handleCloseModal();
    } catch (error: any) {

    } finally {
      setIsLoadingAction(false);
    }
  }, [activeConversation, reportData, handleCloseModal]);

  const executeOpenSupport = useCallback(async () => {
    try {
      if (!marketplaceInfo?.purchaseId) return;
      const currentStatus = (marketplaceInfo?.status || '').toLowerCase();
      const defaultIssue: 'service_not_delivered' | 'payment_issues' = currentStatus === 'shipped' ? 'service_not_delivered' : 'payment_issues';
      setIsOpeningSupport(true);
      const res = await supportService.openTicket(marketplaceInfo.purchaseId, {
        description: supportDescription || '',
        issueType: defaultIssue
      });
      if (res?.success) {
        addNotification({
          title: 'Suporte acionado',
          message: 'Abrimos um ticket com o suporte. Você será notificado sobre as atualizações.',
          type: 'info'
        });
        if (activeConversation) {
          setIsChatBlocked(true);
          saveBlockedStateToStorage(activeConversation, true, 'support_ticket');
        }
        try { window.dispatchEvent(new Event('support:open_tickets')); } catch {}
        try { await refreshConversations(); } catch {}
        handleCloseModal();
      } else {
        addNotification({
          title: 'Ticket já existe',
          message: res?.message || 'Já existe um ticket aberto para esta compra.',
          type: 'warning'
        });
        try { window.dispatchEvent(new Event('support:open_tickets')); } catch {}
      }
    } catch {}
    finally {
      setIsOpeningSupport(false);
    }
  }, [marketplaceInfo?.purchaseId, marketplaceInfo?.status, supportDescription, addNotification, activeConversation, refreshConversations, handleCloseModal]);


  const executeConfirmDelivery = useCallback(async () => {
    if (!activeConversation) return;
    

    if (isLoadingAction) {
      addNotification({
        title: 'Aviso',
        message: 'Confirmação já está sendo processada...',
        type: 'warning'
      });
      return;
    }
    
    try {
      setIsLoadingAction(true);
      const conv = conversations.find(c => c._id === activeConversation);
      if (isMarketplaceConversation(conv)) {
        const pid = getPurchaseId(conv);
        if (!pid) throw new Error('Compra não encontrada para esta conversa');
        const res = await purchaseService.confirm(pid);
        if (!res?.success) throw new Error(res?.message || 'Falha ao confirmar recebimento');

        setIsChatBlocked(true);
        try {
          const userId = (getUserIdFromToken() || user?.name || 'unknown') as string;
          const messagesArray = Array.from(messages.values()).flat();
          archivedChatsStorage.archiveChat(activeConversation, conv as any, messagesArray, userId);
        } catch {}

        
        setTimeout(() => { try { refreshConversations(); } catch {} }, 800);
        setActiveModalView('success');
      } else {
        const messagesArray = Array.from(messages.values()).flat();
        const result = await boostingChatService.confirmDelivery(
          activeConversation, 
          conv, 
          messagesArray
        );

        if (result.blocked) {
          setIsChatBlocked(true);
       
          try {
            const stored = localStorage.getItem('unified_chat_conversations');
            if (stored) {
              const convs = JSON.parse(stored);
              const updatedLS = (Array.isArray(convs) ? convs : []).map((c: any) => 
                c && c._id === activeConversation
                  ? { 
                      ...c, 
                      status: 'accepted',
                      boostingStatus: 'completed',
                      isTemporary: false, 
                      isActive: false,
                      isBlocked: true
                    }
                  : c
              );
              localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedLS));

              window.dispatchEvent(new CustomEvent('conversations:force-update', {
                detail: { conversations: updatedLS }
              }));
            }
          } catch (err) {
          
          }
          
          if (conv && user) {
            const userId = getUserIdFromToken() || user.name || 'unknown';
            archivedChatsStorage.archiveChat(
              activeConversation, 
              conv as any, 
              messagesArray, 
              userId
            );
          }
          
          setTimeout(() => { refreshConversations(); }, 1000);
          setActiveModalView('success');
        } else {
          addNotification({ title: 'Aviso', message: 'Entrega confirmada, mas chat não foi bloqueado', type: 'warning' });
          handleCloseModal();
        }
      }
    } catch (error: any) {

      addNotification({
        title: 'Erro',
        message: error.message || 'Erro ao confirmar entrega. Tente novamente.',
        type: 'error'
      });
    } finally {
      setIsLoadingAction(false);
    }
  }, [activeConversation, handleCloseModal, isLoadingAction, addNotification, conversations, messages, user]);

  const executeMarkShipped = useCallback(async () => {
    try {
      if (!activeConversation) return;
      const conv = conversations.find(c => c._id === activeConversation);
      const pid = getPurchaseId(conv);
      if (!isMarketplaceConversation(conv) || !pid) return;
      setIsLoadingAction(true);
      const res = await purchaseService.ship(pid);
      if (!res?.success) throw new Error(res?.message || 'Falha ao marcar envio');
      
    } catch (error: any) {
      addNotification({ title: 'Erro', message: error?.message || 'Erro ao marcar envio', type: 'error' });
    } finally {
      setIsLoadingAction(false);
    }
  }, [activeConversation, conversations, addNotification]);


  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: isSmallScreen ? 15 : 20,
      scale: isSmallScreen ? 0.95 : 0.98
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: isSmallScreen ? 120 : 100,
        damping: isSmallScreen ? 15 : 12,
        mass: 0.8
      }
    },
    exit: { 
      opacity: 0, 
      y: isSmallScreen ? -10 : -15,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isSmallScreen ? 10.00 : 0.05,
        delayChildren: 0.1
      }
    }
  };

  const buttonHoverVariants = {
    hover: { 
      scale: 1.05,
      transition: { type: "spring" as const, stiffness: 400, damping: 10 }
    },
    tap: { 
      scale: 0.95,
      transition: { type: "spring" as const, stiffness: 400, damping: 10 }
    }
  };

  
  const getOtherUserAvatar = useCallback((conversation: any): string | null => {
    try {
      const currentUserId = (user?.id || getUserIdFromToken() || '').toString();
      const conv = conversation as any;
      const isCurrentUser = (participant: any): boolean => {
        if (!participant || !currentUserId) return false;
        const mongoId = participant._id?.toString() || (participant._id?.$oid ? participant._id.$oid.toString() : null);
        if (mongoId && mongoId === currentUserId) return true;
        const userId = participant.userid?.toString() || (participant.userid?.$oid ? participant.userid.$oid.toString() : null);
        if (userId && userId === currentUserId) return true;
        return false;
      };
      
      if (conv?.client && conv?.booster) {
        if (isCurrentUser(conv.client)) {
          if (conv.booster.avatar && conv.booster.avatar !== 'Sem Avatar') {
            return conv.booster.avatar;
          }
          return null;
        }
        if (isCurrentUser(conv.booster)) {
          if (conv.client.avatar && conv.client.avatar !== 'Sem Avatar') {
            return conv.client.avatar;
          }
          return null;
        }
      }
      const meta = conv?.metadata || {};
      const cd = meta.clientData || meta.client || {};
      const bd = meta.boosterData || meta.booster || {};
      
      if (isCurrentUser(cd)) {
        if (bd?.avatar && bd.avatar !== 'Sem Avatar') {
          return bd.avatar;
        }
        return null;
      }
      if (isCurrentUser(bd)) {
        if (cd?.avatar && cd.avatar !== 'Sem Avatar') {
          return cd.avatar;
        }
        return null;
      }
      return null;
    } catch {}
    return null;
  }, [user?.id]);


  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start mb-2"
    >
      <div className="bg-gray-700 text-gray-100 max-w-xs px-4 py-2 rounded-lg">
        <div className="flex items-center space-x-1">
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <span className="text-xs opacity-70 ml-1">Digitando...</span>
      </div>
    </motion.div>
  );


  const currentConversation = conversations.find(c => c._id === activeConversation);
  const currentMessages = messages.get(activeConversation || '') || [];
  const isMarketplaceChat = !!(currentConversation && isMarketplaceConversation(currentConversation));
  const isBoostingChat = !!(currentConversation && !isMarketplaceChat && (
    (currentConversation as any).boostingStatus ||
    (currentConversation as any).metadata?.boostingId ||
    (currentConversation as any).metadata?.boostingRequestId
  ));
  const currentUserIdStr = (user?.id || getUserIdFromToken() || '').toString();
  const isBuyerUser = !!(marketplaceInfo?.buyerId && currentUserIdStr && String(marketplaceInfo.buyerId) === String(currentUserIdStr));
  const isSellerUser = !!(marketplaceInfo?.sellerId && currentUserIdStr && String(marketplaceInfo.sellerId) === String(currentUserIdStr));

  const boostingRole: 'client' | 'booster' | 'unknown' = useMemo(() => {
    try {
      if (!currentConversation || !currentUserIdStr) return 'unknown';
      const conv: any = currentConversation;
      const normalizeId = (id: any): string | null => {
        if (!id) return null;
        if (typeof id === 'string') return id.trim();
        if (typeof id === 'number') return String(id);
        if (typeof id === 'object') {
          if (id.$oid) return String(id.$oid).trim();
          if (id._id) return normalizeId(id._id);
          if (id.userid) return normalizeId(id.userid);
          if (id.id) return normalizeId(id.id);
        }
        return String(id).trim();
      };

      const me = normalizeId(currentUserIdStr);

      if (conv.client?.userid || conv.booster?.userid) {
        const clientId = normalizeId(conv.client?.userid || conv.client?._id);
        const boosterId = normalizeId(conv.booster?.userid || conv.booster?._id);
        if (me && clientId && me === clientId) return 'client';
        if (me && boosterId && me === boosterId) return 'booster';
      }

      const meta = conv.metadata || {};
      const cd = meta.clientData || meta.client || {};
      const bd = meta.boosterData || meta.booster || {};
      const clientIdMeta = normalizeId(cd.userid || cd._id);
      const boosterIdMeta = normalizeId(bd.userid || bd._id);
      if (me && clientIdMeta && me === clientIdMeta) return 'client';
      if (me && boosterIdMeta && me === boosterIdMeta) return 'booster';

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }, [currentConversation, currentUserIdStr]);

  
  const otherUserId = useMemo(() => {
    try {
      const conv: any = currentConversation;
      const toId = (v: any): string | undefined => {
        if (!v) return undefined; if (typeof v === 'string') return v;
        if (typeof v === 'object') { if (v.$oid) return String(v.$oid); if (v._id) return String(v._id); if (typeof v.toString === 'function') return v.toString(); }
        return undefined;
      };
      const isCurrentUser = (participant: any): boolean => {
        if (!participant || !currentUserIdStr) return false;
        const mongoId = toId(participant._id);
        if (mongoId && mongoId === currentUserIdStr) return true;
        const userId = toId(participant.userid);
        if (userId && userId === currentUserIdStr) return true;
        return false;
      };
      
      if (!conv) return undefined;
      
      if (conv.client && conv.booster) {
        if (isCurrentUser(conv.client)) {
          return toId(conv.booster._id) || toId(conv.booster.userid);
        }
        if (isCurrentUser(conv.booster)) {
          return toId(conv.client._id) || toId(conv.client.userid);
        }
      }
      
      if (Array.isArray(conv.participants)) {
        for (const p of conv.participants) {
          const u = (p as any).user || p;
          if (!isCurrentUser(u)) {
            return toId(u._id) || toId(u.id);
          }
        }
      }
      return undefined;
    } catch { return undefined; }
  }, [currentConversation, currentUserIdStr]);

  const handleNavigateToProfile = useCallback(() => {
    try {
      if (!currentConversation) return;
      const currentUserId = (user?.id || getUserIdFromToken() || '').toString();
      const conv = currentConversation as any;
      
      const isCurrentUser = (participant: any): boolean => {
        if (!participant || !currentUserId) return false;
        const mongoId = participant._id?.toString() || (participant._id?.$oid ? participant._id.$oid.toString() : null);
        if (mongoId && mongoId === currentUserId) return true;
        const userId = participant.userid?.toString() || (participant.userid?.$oid ? participant.userid.$oid.toString() : null);
        if (userId && userId === currentUserId) return true;
        return false;
      };
      
      const toId = (v: any): string | undefined => {
        if (!v) return undefined;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') {
          if (v.$oid) return String(v.$oid);
          if (v._id) return String(v._id);
          if (typeof v.toString === 'function') return v.toString();
        }
        return undefined;
      };
      
      let targetUserId: string | null = null;
      
      if (conv?.client && conv?.booster) {
        if (isCurrentUser(conv.client)) {
          targetUserId = toId(conv.booster._id) || toId(conv.booster.userid) || null;
        }
        else if (isCurrentUser(conv.booster)) {
          targetUserId = toId(conv.client._id) || toId(conv.client.userid) || null;
        }
      }
      if (!targetUserId) {
        const meta = conv?.metadata || {};
        const cd = meta.clientData || meta.client || {};
        const bd = meta.boosterData || meta.booster || {};
        
        if (isCurrentUser(cd)) {
          targetUserId = toId(bd._id) || toId(bd.userid) || null;
        }
        else if (isCurrentUser(bd)) {
          targetUserId = toId(cd._id) || toId(cd.userid) || null;
        }
      }
      
      if (targetUserId) {
        navigate(`/users/${targetUserId}`);
      }
    } catch (error) {

    }
  }, [currentConversation, user, navigate]);

  
  useEffect(() => {
    let mounted = true;
    if (!otherUserId) { setPresenceOther(null); return; }
    try {
      websocketService.subscribePresence([otherUserId]);
      websocketService.queryPresence([otherUserId]);
      const snapshot = websocketService.getPresence(otherUserId);
      if (mounted) setPresenceOther(snapshot || null);
    } catch {}

    const onOnline = (data: any) => {
      if (String(data?.userId) === String(otherUserId)) {
        setPresenceOther({ online: true, lastActiveAt: data?.onlineSince });
      }
    };
    const onOffline = (data: any) => {
      if (String(data?.userId) === String(otherUserId)) {
        setPresenceOther({ online: false, lastSeen: data?.lastSeen, lastActiveAt: data?.lastActiveAt });
      }
    };
    const onSnapshot = (payload: any) => {
      try {
        const statuses = payload?.statuses || payload?.data?.statuses || [];
        const s = statuses.find((s: any) => String(s?.userId) === String(otherUserId));
        if (s) setPresenceOther({ online: !!s.online, lastSeen: s.lastSeen, lastActiveAt: s.lastActiveAt });
      } catch {}
    };
    websocketService.on('presence:online', onOnline);
    websocketService.on('presence:offline', onOffline);
    websocketService.on('presence:snapshot', onSnapshot);

    return () => {
      mounted = false;
      try { websocketService.unsubscribePresence([otherUserId]); } catch {}
      try { websocketService.off('presence:online', onOnline); } catch {}
      try { websocketService.off('presence:offline', onOffline); } catch {}
      try { websocketService.off('presence:snapshot', onSnapshot); } catch {}
    };
  }, [otherUserId]);

  
  const peerStatusText = useMemo(() => {
    if (!currentConversation) return '';
    try {
      const conv: any = currentConversation;
      
      if (presenceOther?.online === true) return 'Online';
      if (presenceOther && presenceOther.online === false) {
        const seen = presenceOther.lastSeen || presenceOther.lastActiveAt;
        if (seen) return `Visto ${relativeTimeFrom(seen)}`;
      }
      
      if (conv.isOnline === true) return 'Online';

      
      const me = currentUserIdStr;
      const toId = (v: any): string | undefined => {
        if (!v) return undefined;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') {
          if (v.$oid) return String(v.$oid);
          if (v._id) return String(v._id);
          if (typeof v.toString === 'function') return v.toString();
        }
        return undefined;
      };
      let otherId: string | undefined;
      try {
        if (conv.client && conv.booster) {
          const clientUserId = toId(conv.client.userid) || toId(conv.client._id);
          const boosterUserId = toId(conv.booster.userid) || toId(conv.booster._id);
          if (clientUserId && boosterUserId) {
            otherId = me && clientUserId === me ? boosterUserId : clientUserId;
          }
        }
      } catch {}
      if (!otherId && Array.isArray((conv as any).participants)) {
        for (const p of (conv as any).participants) {
          const u = (p as any).user || p;
          const pid = toId(u._id) || toId(u.id);
          if (pid && pid !== me) { otherId = pid; break; }
        }
      }
      if (!otherId) return '';

      
      const list = currentMessages || [];
      let lastOther: string | null = null;
      for (const m of list) {
        const sid = (m as any).sender?._id || (m as any).sender;
        if (sid && String(sid) === String(otherId)) {
          const ts = (m as any).createdAt || (m as any).timestamp;
          if (ts && (!lastOther || new Date(ts).getTime() > new Date(lastOther).getTime())) {
            lastOther = ts;
          }
        }
      }
      if (lastOther) return `Visto ${relativeTimeFrom(lastOther)}`;
      return 'Offline';
    } catch {
      return '';
    }
  }, [currentConversation, currentMessages, currentUserIdStr, presenceOther]);

  const marketplaceOrderDetails = useMemo(() => {
    if (!isMarketplaceChat || !currentConversation) return null;
    try {
      const conv: any = currentConversation;
      const mp = conv.marketplace || {};
      const meta = conv.metadata || {};

      const toId = (v: any): string | undefined => {
        if (!v) return undefined; if (typeof v === 'string') return v;
        if (typeof v === 'object') {
          if (v.$oid) return String(v.$oid);
          if (v._id) return String(v._id);
          if (typeof v.toString === 'function') return v.toString();
        }
        return undefined;
      };

      const price: number | undefined = typeof mp.price === 'number' ? mp.price : (typeof meta.price === 'number' ? meta.price : undefined);
      const currency: string | undefined = mp.currency || meta.currency || 'BRL';
      const itemTitle: string | undefined = mp.itemTitle || meta.itemTitle || conv.itemTitle || undefined;
      const rawImg: string | undefined = mp.itemImage || meta.itemImage || conv.itemImage || undefined;
      const itemImageUrl: string | undefined = rawImg ? toAbsoluteImageUrl(String(rawImg)) : undefined;
      const purchaseDate: any = mp.purchaseDate || meta.purchaseDate || undefined;
      
      const status: string | undefined = ((marketplaceInfo?.status || mp.statusCompra || meta.statusCompra || '') as any).toString();
      const purchaseId: string | undefined = toId(mp.purchaseId) || toId(meta.purchaseId) || marketplaceInfo?.purchaseId || undefined;
      const deliveryMethod: string | undefined = marketplaceInfo?.deliveryMethod || mp.deliveryMethod || mp.item?.deliveryMethod || meta.deliveryMethod;

      
      const buyerName: string | undefined = mp.buyer?.name || conv.client?.name || meta.clientData?.name || undefined;
      const buyerAvatarRaw: string | undefined = mp.buyer?.avatar || conv.client?.avatar || meta.clientData?.avatar || undefined;
      const sellerName: string | undefined = mp.seller?.name || conv.booster?.name || meta.boosterData?.name || undefined;
      const sellerAvatarRaw: string | undefined = mp.seller?.avatar || conv.booster?.avatar || meta.boosterData?.avatar || undefined;

      const details = {
        purchaseId,
        status,
        price,
        currency,
        itemTitle,
        itemImageUrl,
        purchaseDate,
        buyer: { name: buyerName || 'Cliente', avatar: buyerAvatarRaw ? toAbsoluteImageUrl(String(buyerAvatarRaw)) : null },
        seller: { name: sellerName || 'Vendedor', avatar: sellerAvatarRaw ? toAbsoluteImageUrl(String(sellerAvatarRaw)) : null },
        deliveryMethod
      };
      return details;
    } catch { return null; }
  }, [isMarketplaceChat, currentConversation, marketplaceInfo]);

  useEffect(() => {
    if (!activeConversation) {
      setBoostingOrderDetails(null);
      return;
    }

    const convoId = activeConversation;
    const conv = conversations.find(c => c._id === convoId);
    if (!conv || isMarketplaceConversation(conv)) {
      setBoostingOrderDetails(null);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        const snapshot = await boostingChatService.getBoostingOrderByConversation(convoId);
        if (aborted || !snapshot) {
          if (!aborted) setBoostingOrderDetails(null);
          return;
        }

        const conversationStatus = conv?.status || conv?.boostingStatus;
        const finalStatus = conversationStatus === 'cancelled' ? 'cancelled' : snapshot.status;

        const agreementIdToUse = (snapshot as any).agreementObjectId || snapshot._id || snapshot.boostingRequestId || snapshot.orderNumber || convoId;
        console.log('[UnifiedChatComponent] Selecionando agreementId:', { 
          agreementObjectId: (snapshot as any).agreementObjectId,
          _id: snapshot._id,
          final: agreementIdToUse 
        });
        
        const fallbackBoostingRequestId = snapshot.boostingRequestId
          || (conv as any)?.metadata?.boostingRequestId
          || (conv as any)?.metadata?.boostingId
          || undefined;

        const details: BoostingOrderDetails = {
          agreementId: agreementIdToUse,
          boostingRequestId: fallbackBoostingRequestId,
          status: finalStatus,
          price: snapshot.price,
          currency: snapshot.currency || 'BRL',
          game: snapshot.serviceSnapshot?.game,
          category: snapshot.serviceSnapshot?.category,
          currentRank: snapshot.serviceSnapshot?.currentRank,
          desiredRank: snapshot.serviceSnapshot?.desiredRank,
          estimatedTime: snapshot.serviceSnapshot?.estimatedTime,
          acceptedAt: snapshot.acceptedAt || undefined,
          completedAt: snapshot.completedAt || undefined,
          client: {
            name: snapshot.clientData?.name || undefined,
            avatar: snapshot.clientData?.avatar || null
          },
          booster: {
            name: snapshot.boosterData?.name || undefined,
            avatar: snapshot.boosterData?.avatar || null,
            rating: snapshot.boosterData?.rating
          }
        };

        setBoostingOrderDetails(details);
      } catch {
        if (!aborted) setBoostingOrderDetails(null);
      }
    })();

    return () => { aborted = true; };
  }, [activeConversation, conversations]);

  
  const handleMarkAsShipped = useCallback(async () => {
    try {
      if (!marketplaceInfo?.purchaseId) return;
      setIsShipping(true);
      const res = await purchaseService.ship(marketplaceInfo.purchaseId);
      if (res?.success) {
        setMarketplaceInfo(prev => prev ? { ...prev, status: 'shipped' } : prev);
        addNotification({
          title: 'Envio confirmado',
          message: 'Você marcou o pedido como enviado. O comprador será notificado.',
          type: 'success'
        });
      }
    } catch {}
    finally { setIsShipping(false); }
  }, [marketplaceInfo?.purchaseId, addNotification]);

  const handleBuyerConfirmDelivery = useCallback(async () => {
    try {
      if (!marketplaceInfo?.purchaseId) return;
      setIsConfirmingDelivery(true);
      const res = await purchaseService.confirm(marketplaceInfo.purchaseId);
      if (res?.success) {
        
        setMarketplaceInfo(prev => prev ? { ...prev, status: 'completed' } : prev);
        
        addNotification({
          title: 'Entrega confirmada',
          message: 'O pedido foi marcado como concluído com sucesso!',
          type: 'success'
        });
        
        
        try {
          const convId = typeof activeConversation === 'string' ? activeConversation : (activeConversation as any)?._id;
          websocketService.emit('purchase:status_changed', {
            purchaseId: marketplaceInfo.purchaseId,
            status: 'completed',
            conversationId: convId
          });
        } catch (wsErr) {
 
        }
        
        
        setTimeout(async () => {
          try {
            const convId = typeof activeConversation === 'string' ? activeConversation : (activeConversation as any)?._id;
            if (convId) {
              
              const currentActive = convId;
              await refreshConversations();
              
              if (currentActive) {
                setActiveConversation(currentActive);
              }
            }
          } catch (refreshErr) {
        
          }
        }, 2000);
      }
    } catch (err) {
   
    }
    finally { setIsConfirmingDelivery(false); }
  }, [marketplaceInfo?.purchaseId, activeConversation, addNotification, refreshConversations, setActiveConversation]);

  const handleBoostingConfirmDelivery = useCallback(async () => {
    try {
      if (!activeConversation || !isBoostingChat) return;
      setIsConfirmingDelivery(true);
      await boostingChatService.confirmDeliveryByConversation(activeConversation);

      setBoostingOrderDetails((prev: BoostingOrderDetails | null) => prev ? { ...prev, status: 'completed' } : prev);

      const convoId = typeof activeConversation === 'string' ? activeConversation : (activeConversation as any)?._id;
      const conversationData = convoId ? conversations.find((c) => c._id === convoId) : null;

      const boostingRequestId = boostingOrderDetails?.boostingRequestId
        || (conversationData as any)?.metadata?.boostingRequestId
        || (conversationData as any)?.metadata?.boostingId
        || undefined;
      if (boostingRequestId) {
        try {
          await boostingService.completeBoostingRequest(boostingRequestId);
        } catch (err) {
          console.warn('[UnifiedChatComponent] Falha ao atualizar boosting no backend principal:', err);
          addNotification?.({
            title: 'Aviso',
            message: 'Entrega confirmada no chat, mas não conseguimos atualizar o backend principal automaticamente. Verifique o painel de solicitações.',
            type: 'warning'
          });
        }
      }

      try {
        addNotification({
          title: 'Boosting concluído',
          message: 'Obrigado por confirmar! O serviço de boosting foi finalizado com sucesso.',
          type: 'success'
        });
      } catch {}
    } catch {
    } finally {
      setIsConfirmingDelivery(false);
    }
  }, [activeConversation, conversations, isBoostingChat, boostingOrderDetails?.boostingRequestId, addNotification]);
  
  const handleBuyerNotReceived = useCallback(async () => {
    try {
      if (!marketplaceInfo?.purchaseId) return;
      setIsDisputingNotReceived(true);
      const res = await purchaseService.notReceived(marketplaceInfo.purchaseId);
      if (res?.success) {
        
        setMarketplaceInfo(prev => prev ? { ...prev, status: 'escrow_reserved' } : prev);
        
        addNotification({
          title: 'Pedido não recebido',
          message: 'O vendedor foi notificado e a liberação do pagamento foi pausada. Nossa equipe avaliará a disputa.',
          type: 'warning'
        });
        
        
        try {
          const convId = typeof activeConversation === 'string' ? activeConversation : (activeConversation as any)?._id;
          websocketService.emit('purchase:dispute_opened', {
            purchaseId: marketplaceInfo.purchaseId,
            status: 'escrow_reserved',
            conversationId: convId
          });
        } catch (wsErr) {
     
        }
        
        
        setTimeout(async () => {
          try {
            const convId = typeof activeConversation === 'string' ? activeConversation : (activeConversation as any)?._id;
            if (convId) {
              const currentActive = convId;
              await refreshConversations();
              if (currentActive) {
                setActiveConversation(currentActive);
              }
            }
          } catch (refreshErr) {
        
          }
        }, 2000);
      }
    } catch (err) {
   
    }
    finally { setIsDisputingNotReceived(false); }
  }, [marketplaceInfo?.purchaseId, activeConversation, addNotification, refreshConversations, setActiveConversation]);

  const handleOpenSupport = useCallback(() => {
    setActiveModalView('support');
  }, []);

  const handleRateMarketplace = useCallback(() => {
    try {
      if (!marketplaceInfo?.purchaseId) return;
      const ratingPageUrl = `/rate/marketplace/${marketplaceInfo.purchaseId}`;
      window.location.href = ratingPageUrl;
    } catch (err) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível abrir a página de avaliação.',
        type: 'error'
      });
    }
  }, [marketplaceInfo?.purchaseId, addNotification]);

  const handleRateBoosting = useCallback(() => {
    try {
      const boostingId = boostingOrderDetails?.boostingId || boostingOrderDetails?.agreementId;
      if (!boostingId) return;
      const boostingPageUrl = `/boostings/${boostingId}`;
      window.location.href = boostingPageUrl;
    } catch (err) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível abrir a página do boosting.',
        type: 'error'
      });
    }
  }, [boostingOrderDetails?.boostingId, boostingOrderDetails?.agreementId, addNotification]);

  const handleCheckAccountDelivery = useCallback(() => {
    try {
      window.location.href = '/account-deliveries';
    } catch (err) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível abrir a página de entregas.',
        type: 'error'
      });
    }
  }, [addNotification]);
  
  const normalizeText = useCallback((s?: string) => {
    try { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    catch { return (s || '').toString().toLowerCase(); }
  }, []);

  
  const conversationSearchCache = useMemo(() => {
    const cache = new Map<string, string>();
    conversations.forEach(conversation => {
      try {
        if (archivedChatsStorage.isChatArchived(conversation._id)) return;
        
        const fields: string[] = [];
        try { fields.push(getConversationDisplayName(conversation)); } catch {}
        try { fields.push(getLastMessageText(conversation)); } catch {}
        try { fields.push((conversation as any).name || ''); } catch {}
        
        const meta: any = (conversation as any).metadata || {};
        const cd = meta.clientData || meta.client || {};
        const bd = meta.boosterData || meta.booster || {};
        fields.push(cd.name || '');
        fields.push(bd.name || '');
        
        const conv: any = conversation;
        if (conv.client) fields.push(conv.client.name || conv.client.username || '');
        if (conv.booster) fields.push(conv.booster.name || conv.booster.username || '');
        
        cache.set(conversation._id, normalizeText(fields.join(' ')));
      } catch {}
    });
    return cache;
  }, [conversations, getConversationDisplayName, getLastMessageText, normalizeText]);

  const filteredConversations = useMemo(() => {
    const q = normalizeText(debouncedSearchQuery?.trim() || '');
    
    if (!q) {
      return conversations.filter(conv => !archivedChatsStorage.isChatArchived(conv._id));
    }
    
    return conversations.filter((conversation) => {
      try {
        if (archivedChatsStorage.isChatArchived(conversation._id)) return false;
        const cached = conversationSearchCache.get(conversation._id);
        return cached ? cached.includes(q) : false;
      } catch {
        return false;
      }
    });
  }, [conversations, debouncedSearchQuery, conversationSearchCache, normalizeText]);

  
  const visibleConversations = useMemo(() => {
    return filteredConversations.slice(0, visibleConversationsCount);
  }, [filteredConversations, visibleConversationsCount]);

  const hasMoreConversations = filteredConversations.length > visibleConversationsCount;
  
  const loadMoreConversations = useCallback(() => {
    setVisibleConversationsCount(prev => prev + 50);
  }, []);

  return (
    <div className="chat-fullscreen-container text-white">
      {}
      <div className={`mobile-overlay ${showMobileChat ? 'visible' : ''}`} onClick={() => setShowMobileChat(false)} />
      
      <div className="chat-content-wrapper">
      {}
      <AnimatePresence mode="wait">
        {showConnectionStatus && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
              isConnected 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}
          >
            <span className="text-sm">
              {isConnected ? `Conectado (${connectionMode})` : 'Desconectado'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

        {}
        <div className={`chat-sidebar ${showMobileChat ? 'mobile-hidden' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {}
        <div className="p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-lg sm:text-xl font-bold">Mensagens</h1>
            
            <div className="flex flex-wrap items-center gap-2">
              <StorageManager
                getStorageStats={getStorageStats}
                clearStoredMessages={clearStoredMessages}
                exportStoredMessages={exportStoredMessages}
                importStoredMessages={importStoredMessages}
                activeConversation={activeConversation || undefined}
              />
   
            </div>
          </div>
        </div>
        
        {}
        <div className="hidden md:block p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pesquisar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchQuery ? (
                <div>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa encontrada para "{searchQuery}"</p>
                </div>
              ) : (
                <div>
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa ainda</p>
                  <p className="text-sm mt-2">Suas conversas aparecerão aqui</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {visibleConversations.map((conversation) => {
                const unreadCount = (typeof (conversation as any).unreadCount === 'number') 
                  ? (conversation as any).unreadCount 
                  : (unreadCounts.get((conversation as any)._id) || 0);
                
                return (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    isActive={conversation._id === activeConversation}
                    displayName={getConversationDisplayName(conversation)}
                    lastMessageText={getLastMessageText(conversation)}
                    avatarUrl={getOtherUserAvatar(conversation)}
                    unreadCount={unreadCount}
                    isTemporary={isTemporaryConversation(conversation._id)}
                    temporaryStatus={getTemporaryStatus(conversation._id) || null}
                    expiresAt={getTemporaryExpiresAt(conversation._id)}
                    onClick={() => handleConversationSelect(conversation)}
                    getTimeRemaining={getTimeRemaining}
                    toAbsoluteImageUrl={toAbsoluteImageUrl}
                  />
                );
              })}
              
              {hasMoreConversations && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMoreConversations}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Carregar mais conversas ({filteredConversations.length - visibleConversationsCount} restantes)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>


      </div>

        {}
        <div className={`chat-main-area ${showMobileChat ? 'mobile-visible' : ''}`}>
        {currentConversation ? (
          <>
            {}
            <div className="chat-header px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-3 min-w-0 flex-1">
                  <motion.button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2.5 hover:bg-gray-700 rounded-xl transition-colors active:scale-95"
                    variants={buttonHoverVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <ArrowLeft className="w-6 h-6 md:w-5 md:h-5" />
                  </motion.button>
                  
                  {}
                  <motion.button
                    onClick={handleNavigateToProfile}
                    className="flex items-center space-x-3 hover:bg-gray-700/50 rounded-xl px-2 py-2 sm:px-2 sm:py-1 transition-colors group min-w-0 flex-1"
                    title="Ver perfil do usuário"
                    variants={buttonHoverVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <div className="relative flex-shrink-0">
                      {(() => {
                        const currentUserId = (user?.id || getUserIdFromToken() || '').toString();
                        let otherUserAvatar: string | null = null;

                        const conv = currentConversation as any;
                        if (conv?.client && conv?.booster) {
                          const clientUserId = typeof conv.client.userid === 'object' 
                            ? conv.client.userid.$oid || conv.client.userid.toString()
                            : conv.client.userid?.toString();
                          const boosterUserId = typeof conv.booster.userid === 'object'
                            ? conv.booster.userid.$oid || conv.booster.userid.toString()
                            : conv.booster.userid?.toString();
                          if (currentUserId === clientUserId && conv.booster.avatar && conv.booster.avatar !== 'Sem Avatar') {
                            otherUserAvatar = conv.booster.avatar;
                          } else if (currentUserId === boosterUserId && conv.client.avatar && conv.client.avatar !== 'Sem Avatar') {
                            otherUserAvatar = conv.client.avatar;
                          }
                        }
                        if (!otherUserAvatar) {
                          try {
                            const meta = conv?.metadata || {};
                            const cd = meta.clientData || meta.client || {};
                            const bd = meta.boosterData || meta.booster || {};
                            const cId = (typeof cd.userid === 'object' && cd.userid?.$oid) ? cd.userid.$oid : (cd.userid || cd._id);
                            const bId = (typeof bd.userid === 'object' && bd.userid?.$oid) ? bd.userid.$oid : (bd.userid || bd._id);
                            if (currentUserId && cId && currentUserId.toString() === cId.toString()) {
                              if (bd?.avatar && bd.avatar !== 'Sem Avatar') otherUserAvatar = bd.avatar;
                            } else if (currentUserId && bId && currentUserId.toString() === bId.toString()) {
                              if (cd?.avatar && cd.avatar !== 'Sem Avatar') otherUserAvatar = cd.avatar;
                            } else {
                              otherUserAvatar = (bd?.avatar && bd.avatar !== 'Sem Avatar') ? bd.avatar : (cd?.avatar && cd.avatar !== 'Sem Avatar') ? cd.avatar : null;
                            }
                          } catch {}
                        }

                        return otherUserAvatar ? (
                          <img
                            src={toAbsoluteImageUrl(otherUserAvatar)}
                            alt={getConversationDisplayName(currentConversation)}
                            className="w-10 h-10 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-purple-500 shadow-lg group-hover:border-purple-400 transition-all"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null;
                      })()}
                      <div className={`w-10 h-10 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg group-hover:from-purple-400 group-hover:to-pink-400 transition-all ${
                        (() => {
                          const currentUserId = (user?.id || getUserIdFromToken() || '').toString();
                          let hasAvatar = false;
                          const conv = currentConversation as any;
                          if (conv?.client && conv?.booster) {
                            const clientUserId = typeof conv.client.userid === 'object' 
                              ? conv.client.userid.$oid || conv.client.userid.toString()
                              : conv.client.userid?.toString();
                            const boosterUserId = typeof conv.booster.userid === 'object'
                              ? conv.booster.userid.$oid || conv.booster.userid.toString()
                              : conv.booster.userid?.toString();
                            if (currentUserId === clientUserId && conv.booster.avatar && conv.booster.avatar !== 'Sem Avatar') {
                              hasAvatar = true;
                            } else if (currentUserId === boosterUserId && conv.client.avatar && conv.client.avatar !== 'Sem Avatar') {
                              hasAvatar = true;
                            }
                          }
                          if (!hasAvatar) {
                            try {
                              const meta = conv?.metadata || {};
                              const cd = meta.clientData || meta.client || {};
                              const bd = meta.boosterData || meta.booster || {};
                              const cId = (typeof cd.userid === 'object' && cd.userid?.$oid) ? cd.userid.$oid : (cd.userid || cd._id);
                              const bId = (typeof bd.userid === 'object' && bd.userid?.$oid) ? bd.userid.$oid : (bd.userid || bd._id);
                              if (currentUserId && cId && currentUserId.toString() === cId.toString()) {
                                if (bd?.avatar && bd.avatar !== 'Sem Avatar') hasAvatar = true;
                              } else if (currentUserId && bId && currentUserId.toString() === bId.toString()) {
                                if (cd?.avatar && cd.avatar !== 'Sem Avatar') hasAvatar = true;
                              } else {
                                if ((bd?.avatar && bd.avatar !== 'Sem Avatar') || (cd?.avatar && cd.avatar !== 'Sem Avatar')) hasAvatar = true;
                              }
                            } catch {}
                          }
                          return hasAvatar ? 'hidden' : '';
                        })()
                      }`}>
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1 text-left">
                      <h2 className="font-semibold text-base sm:text-base truncate group-hover:text-purple-400 transition-colors leading-tight">{getConversationDisplayName(currentConversation)}</h2>
                      <p className="text-sm sm:text-sm text-gray-400 truncate leading-tight mt-0.5">
                        {peerStatusText || 'Offline'}
                      </p>
                    </div>
                  </motion.button>
                </div>
                
                {}
                <div className="flex items-center space-x-2 sm:space-x-2">
                  {}
                  <motion.button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title={isSidebarCollapsed ? 'Expandir conversas' : 'Recolher conversas'}
                    variants={buttonHoverVariants}
                    whileHover="hover"
                    whileTap="tap"
                    layout
                    transition={{
                      layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
                    }}
                  >
                    <motion.svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </motion.svg>
                  </motion.button>

                  {!isMarketplaceConversation(currentConversation) && (!isBoostingChat || !boostingOrderDetails) && (
                    <div className="md:hidden">
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                      >
                        <ProposalHeaderButton
                          isVisible={isProposalModalVisible}
                          hasProposal={!!modalProposalData}
                          onClick={() => setIsMobileProposalSheetOpen(true)}
                          className="p-2.5 hover:bg-gray-700"
                        />
                      </motion.div>
                    </div>
                  )}

                  {isMarketplaceConversation(currentConversation) && marketplaceOrderDetails && (
                    <div className="md:hidden">
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                      >
                        <MarketplaceHeaderButton
                          isVisible={!!marketplaceOrderDetails}
                          hasOrder={!!marketplaceOrderDetails.purchaseId}
                          onClick={() => setIsMobileMarketplaceSheetOpen(true)}
                          className="p-2.5 hover:bg-gray-700"
                        />
                      </motion.div>
                    </div>
                  )}

                  {isBoostingChat && boostingOrderDetails && (
                    <div className="md:hidden">
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                      >
                        <BoostingHeaderButton
                          isVisible={!!boostingOrderDetails}
                          hasOrder={!!boostingOrderDetails.agreementId}
                          onClick={() => setIsMobileBoostingSheetOpen(true)}
                          className="p-2.5 hover:bg-gray-700"
                        />
                      </motion.div>
                    </div>
                  )}

                  {}
                  <motion.button
                    onMouseEnter={prefetchSettings}
                    onFocus={prefetchSettings}
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2.5 hover:bg-gray-700 rounded-xl transition-colors active:scale-95"
                    title="Configurações do chat"
                    variants={buttonHoverVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Settings className="w-6 h-6 md:w-5 md:h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

      {}
      {imageViewer && createPortal(
        (
          <AnimatePresence mode="wait">
            <motion.div
              className="modal-backdrop flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImageViewer(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className="relative w-full max-w-5xl max-h-[90dvh] bg-gray-900/70 border border-gray-700/60 rounded-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  aria-label="Fechar visualização"
                  className="absolute top-2 right-2 p-2 rounded-lg bg-gray-800/70 hover:bg-gray-800/90 border border-gray-700/60 text-gray-200"
                  onClick={() => setImageViewer(null)}
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-full h-full grid place-items-center p-3 sm:p-4">
                  <img
                    src={imageViewer.url}
                    alt={imageViewer.alt || 'Imagem'}
                    className="max-w-full max-h-[80dvh] object-contain rounded-lg"
                    draggable={false}
                  />
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        ),
        document.body
      )}

            {}
            <div 
              ref={messagesContainerRef}
              className="chat-messages-container space-y-2 relative overflow-y-auto"
            >
              {}
              <AnimatePresence mode="wait">
                <div className="relative" key={`modal-${isMarketplaceChat ? 'marketplace' : isBoostingChat ? 'boosting' : 'proposal'}`}>
                  {isMarketplaceConversation(currentConversation) && marketplaceOrderDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MarketplaceOrderModal
                        isVisible={!!marketplaceOrderDetails}
                        details={marketplaceOrderDetails}
                        role={isBuyerUser ? 'buyer' : isSellerUser ? 'seller' : 'unknown'}
                        canShip={isSellerUser && (marketplaceOrderDetails?.status === 'escrow_reserved' || marketplaceOrderDetails?.status === 'initiated')}
                        onShip={handleMarkAsShipped}
                        shipLoading={isShipping}
                        canConfirm={isBuyerUser && marketplaceOrderDetails?.status === 'shipped'}
                        onConfirmDelivery={handleBuyerConfirmDelivery}
                        confirmLoading={isConfirmingDelivery}
                        canNotReceived={isBuyerUser && marketplaceOrderDetails?.status === 'shipped'}
                        onNotReceived={isBuyerUser ? handleBuyerNotReceived : undefined}
                        notReceivedLoading={isDisputingNotReceived}
                        canRate={isBuyerUser && marketplaceOrderDetails?.status === 'completed'}
                        onRate={handleRateMarketplace}
                        canCheckAccount={isBuyerUser && marketplaceOrderDetails?.status === 'shipped'}
                        onCheckAccount={handleCheckAccountDelivery}
                        purchaseType="marketplace"
                        onOpenMobileSheet={() => setIsMobileMarketplaceSheetOpen(true)}
                        isMobileSheetOpen={isMobileMarketplaceSheetOpen}
                        onCloseMobileSheet={() => setIsMobileMarketplaceSheetOpen(false)}
                        renderFabInline={true}
                        className="proposal-modal-fixed w-full"
                      />
                    </motion.div>
                  )}
                  {isBoostingChat && boostingOrderDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <BoostingOrderModal
                        isVisible={!!boostingOrderDetails}
                        details={boostingOrderDetails}
                        role={boostingRole}
                        canConfirm={boostingRole === 'client' && boostingOrderDetails.status === 'active'}
                        onConfirmDelivery={handleBoostingConfirmDelivery}
                        confirmLoading={isConfirmingDelivery}
                        canRate={boostingRole === 'client' && boostingOrderDetails.status === 'completed'}
                        onRate={handleRateBoosting}
                        className="proposal-modal-fixed w-full"
                        onOpenMobileSheet={() => setIsMobileBoostingSheetOpen(true)}
                        isMobileSheetOpen={isMobileBoostingSheetOpen}
                        onCloseMobileSheet={() => setIsMobileBoostingSheetOpen(false)}
                        renderFabInline={true}
                      />
                    </motion.div>
                  )}
                  {!isMarketplaceChat && (!isBoostingChat || !boostingOrderDetails) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ProposalModal
                        isVisible={isProposalModalVisible}
                        proposalData={modalProposalData}
                        userRole={proposalUserRole}
                        isLoading={isLoadingAction}
                        onAccept={() => {}}
                        onReject={() => {}}
                        className="proposal-modal-fixed w-full"
                        isMarketplace={isMarketplaceConversation(currentConversation)}
                        onOpenMobileSheet={() => setIsMobileProposalSheetOpen(true)}
                        isMobileSheetOpen={isMobileProposalSheetOpen}
                        onCloseMobileSheet={() => setIsMobileProposalSheetOpen(false)}
                        renderFabInline={true}
                      />
                    </motion.div>
                  )}
                </div>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {(() => {

                  const filteredMessages = currentMessages.filter(message => message && (message._id || message.tempId));
                  const uniqueMessages = new Map();
                  
                  filteredMessages.forEach((message, index) => {

                    const stableKey = message.tempId 
                      ? `msg-${message.tempId}`
                      : message._id 
                        ? `msg-${message._id}` 
                        : `fallback-${index}-${message.content?.substring(0, 10) || 'empty'}`;
                    

                    const existingKey = Array.from(uniqueMessages.keys()).find(key => {
                      const existing = uniqueMessages.get(key);
                      return (
                        key === stableKey ||
                        (message.tempId && existing.tempId === message.tempId) ||
                        (message._id && existing._id === message._id)
                      );
                    });
                    
                    if (!existingKey) {

                      uniqueMessages.set(stableKey, message);
                    } else {

                      const existing = uniqueMessages.get(existingKey);

                      if (!message.isTemporary && existing.isTemporary) {
                        uniqueMessages.set(existingKey, message);
                      } else if (!existing.isTemporary) {

                        return;
                      }
                    }
                  });
                  
                  const entries = Array.from(uniqueMessages.entries());
                  let lastDayLabel = '';

                  return (
                    <>
                      {entries.map(([key, message], idx) => {
                        const isOwn = isOwnMessage(message);
                        const senderId = typeof message.sender === 'string' ? message.sender : message.sender?._id;
                        const avatar = getUserAvatar(senderId, currentConversation);
                        const senderName = getUserName(senderId, currentConversation);
                        const msgDate = new Date(message.createdAt || Date.now());
                        const dayLabel = formatDayLabel(msgDate);
                        const showSeparator = !!dayLabel && dayLabel !== lastDayLabel;
                        if (showSeparator) lastDayLabel = dayLabel;
                        
                        return (
                          <React.Fragment key={`${key}-wrap`}>
                            {showSeparator && (
                              <div className="flex justify-center my-2">
                                <span className="px-3 py-1 text-xs rounded-full bg-gray-800 border border-gray-700 text-gray-300">{dayLabel}</span>
                              </div>
                            )}
                            <motion.div
                            key={key}
                            variants={messageVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                          >
                            <div className={`flex items-end space-x-2 max-w-xs sm:max-w-md lg:max-w-lg chat-message-container message-row ${
                              isOwn ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                            }`}>
                              {}
                              {!isOwn && (
                                <motion.div 
                                  className="flex-shrink-0 mb-1"
                                >
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt={senderName}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-600 shadow-md"
                                      onError={(e) => {

                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md ${
                                    avatar ? 'hidden' : ''
                                  }`}>
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                </motion.div>
                              )}
                              
                              {}
                              <motion.div
                                className={`bubble-base ${ (message.type === 'image' || (message as any).attachments?.length > 0)
                                  ? (isOwn ? 'bubble-image bubble-image-own' : 'bubble-image bubble-image-other')
                                  : (isOwn ? 'bubble-own rounded-br-md' : 'bubble-other rounded-bl-md') }`}
                              >
                                {}
                                {!isOwn && !(message.type === 'image' || (message as any).attachments?.length > 0) && (
                                  <p className="text-xs text-purple-300 font-medium mb-1">
                                    {senderName}
                                  </p>
                                )}
                                
                                { (message.type === 'image' || (message as any).attachments?.length > 0) ? (
                                  <div className="space-y-2">
                                    { (message as any).attachments?.[0] && (() => {
                                      const att: any = (message as any).attachments[0];
                                      const avifThumb = toAbsoluteImageUrl(att.thumbUrl || att.url);
                                      const jpegThumb = toAbsoluteImageUrl(att.thumbUrlJpeg || att.urlJpeg || '');
                                      const displaySrc = jpegThumb || avifThumb;
                                      const fullHref = toAbsoluteImageUrl(att.urlJpeg || att.url);
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => setImageViewer({ url: fullHref, alt: senderName + ' enviou uma imagem' })}
                                          className="image-card focus:outline-none max-w-[360px] sm:max-w-[480px] md:max-w-[560px]"
                                        >
                                          <picture>
                                            {avifThumb ? <source type="image/avif" srcSet={avifThumb} /> : null}
                                            {jpegThumb ? <source type="image/jpeg" srcSet={jpegThumb} /> : null}
                                            <img
                                              src={displaySrc}
                                              alt={senderName + ' enviou uma imagem'}
                                              className="w-full h-auto object-contain"
                                              loading="lazy"
                                              onError={(e) => {
                                                try {
                                                  if (jpegThumb && e.currentTarget.src !== jpegThumb) {
                                                    e.currentTarget.src = jpegThumb;
                                                  }
                                                } catch {}
                                              }}
                                            />
                                          </picture>
                                        </button>
                                      );
                                    })()}
                                    {message.content && (
                                      <p className="text-sm sm:text-base break-words leading-relaxed chat-message-content opacity-90">{message.content}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm sm:text-base break-words leading-relaxed chat-message-content">{message.content}</p>
                                )}
                                
                                <div className="message-meta">
                                  <span className="text-xs opacity-70">
                                    {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
                                  </span>
                                  {message.status === 'failed' && (
                                    <motion.button
                                      onClick={() => handleRetryMessage(message.tempId || message._id)}
                                      className="text-xs text-red-400 hover:text-red-300 ml-2 px-2 py-1 rounded transition-colors"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      Tentar novamente
                                    </motion.button>
                                  )}
                                </div>
                              </motion.div>
                              
                              {}
                              {isOwn && (
                                <motion.div 
                                  className="flex-shrink-0 mb-1"
                                >
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt="Você"
                                      className="w-8 h-8 rounded-full object-cover border-2 border-purple-500 shadow-md"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md ${
                                    avatar ? 'hidden' : ''
                                  }`}>
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                          </React.Fragment>
                        );
                      })}
                      
                      {}
                      <AnimatePresence mode="wait">
                        {showTypingIndicator && <TypingIndicator />}
                      </AnimatePresence>
                    </>
                  );
                })()}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-16 scroll-anchor" />

              <div className="chat-scroll-button-holder">
                <AnimatePresence>
                  {showScrollToBottom && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => scrollToBottom('smooth')}
                      className="chat-scroll-button pointer-events-auto p-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 active:scale-95"
                      aria-label="Ir para o final do chat"
                      title="Ir para o final do chat"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {}
            {isChatBlocked && activeConversation && (
              <ChatBlockedBanner
                reason={(() => {
                  const st = getBlockedStateFromStorage(activeConversation);
                  return st?.reason || currentConversation?.blockedReason || 'pedido_finalizado';
                })()}
                blockedAt={(() => {
                  const st = getBlockedStateFromStorage(activeConversation);
                  return st?.blockedAt || currentConversation?.blockedAt;
                })()}
              />
            )}

            {}
            {currentConversation?.isReported && (
              <div className="px-3 sm:px-4 py-2 bg-red-500/10 border-t border-red-500/30">
                <div className="flex items-center justify-center space-x-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Chat reportado - não será possível enviar mensagens neste chat</span>
                </div>
              </div>
            )}

            {}
            <AnimatePresence mode="wait">
              {showLengthError?.show && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="mx-3 sm:mx-4 mb-3 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center"
                      >
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-red-300 font-semibold text-sm">
                          Mensagem muito longa!
                        </h4>
                        <button
                          onClick={() => setShowLengthError(null)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-1 space-y-2">
                        <p className="text-red-200/80 text-sm">
                          Limite máximo: <span className="font-mono font-bold text-red-300">10.000 caracteres</span>
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-red-200/80 text-sm">
                            Sua mensagem: <span className="font-mono font-bold text-red-300">{showLengthError.messageLength.toLocaleString()} caracteres</span>
                          </p>
                          <span className="text-xs text-red-300/70 bg-red-500/20 px-2 py-1 rounded">
                            {((showLengthError.messageLength - 10000) / 1000).toFixed(1)}k a mais
                          </span>
                        </div>
                        <div className="w-full bg-red-900/30 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((showLengthError.messageLength / 10000) * 100, 200)}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full"
                          />
                        </div>
                        <p className="text-red-200/60 text-xs">
                          💡 Dica: Divida sua mensagem em partes menores ou resuma o conteúdo
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            {}
            {(() => {
              const currentUserId = getUserIdFromToken();
              const conversation = currentConversation as SafeConversation;
              
              if (!conversation || !isTemporaryConversation(conversation._id) || getTemporaryStatus(conversation._id) !== 'pending') {
                return null;
              }
              
              
              const normalizeId = (id: any): string | null => {
                if (!id) return null;
                if (typeof id === 'string') return id.trim();
                if (typeof id === 'number') return String(id);
                if (typeof id === 'object') {
                  if (id.$oid) return String(id.$oid).trim();
                  if (id._id) return normalizeId(id._id);
                  if (id.userid) return normalizeId(id.userid);
                  if (id.id) return normalizeId(id.id);
                }
                return String(id).trim();
              };

              let isClient = false;
              
              if (conversation?.client?.userid && conversation?.booster?.userid) {
                const clientUserId = normalizeId(conversation.client.userid);
                const boosterUserId = normalizeId(conversation.booster.userid);
                const normalizedCurrentUserId = normalizeId(currentUserId);
             
                isClient = clientUserId === normalizedCurrentUserId;
                
              } else {
                
                if (conversation.participants && conversation.participants.length >= 2) {
                  const participantIds = conversation.participants.map(p => normalizeId(p));
                  const normalizedCurrentUserId = normalizeId(currentUserId);
                  
                  
                  const clientParticipantId = participantIds[0];
                  const boosterParticipantId = participantIds[1];
                
                  
                  isClient = clientParticipantId === normalizedCurrentUserId;
                }
              }
              

              const shouldShowClientButton = isClient && isTemporaryConversation(conversation._id) && getTemporaryStatus(conversation._id) === 'pending';
              const shouldShowBoosterNotice = !isClient && isTemporaryConversation(conversation._id) && getTemporaryStatus(conversation._id) === 'pending';
              
              
              
              if (shouldShowClientButton) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="chat-cta-sticky mx-0 sm:mx-0 mb-3 p-4 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/10 to-violet-500/20 border border-purple-500/40 rounded-none sm:rounded-xl backdrop-blur-sm shadow-[0_8px_30px_rgba(139,92,246,0.15)]"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: [0, -6, 6, -6, 0] }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center"
                        >
                          <DollarSign className="w-5 h-5 text-purple-300" />
                        </motion.div>
                      </div>
                      <div className="flex-1 min-w-0">
                     
                        <div className="flex gap-3 flex-col sm:flex-row">
                          <motion.button
                            onClick={() => {
                              const metadata = (conversation as any).metadata;
                              const proposal = (conversation as any).proposal;
                              let boostingId = null;
                              
                              if (metadata?.boostingId) {
                                boostingId = metadata.boostingId;
                              } else if (proposal && typeof proposal === 'string') {
                                const parts = proposal.split('_');
                                boostingId = parts[0];
                              }
                              
                              if (boostingId) {
                                navigate(`/boosting/${boostingId}/proposals`);
                              }
                            }}
                            disabled={isLoadingAction}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ring-1 ring-blue-500/30 disabled:opacity-50"
                            whileHover={isLoadingAction ? {} : { scale: 1.02 }}
                            whileTap={isLoadingAction ? {} : { scale: 0.98 }}
                          >
                            <FileText className="w-4 h-4" />
                            Ver Proposta
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }
              
              
              if (shouldShowBoosterNotice) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="chat-cta-sticky mx-0 sm:mx-0 mb-3 p-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-blue-500/20 border border-blue-500/40 rounded-none sm:rounded-xl backdrop-blur-sm shadow-[0_8px_30px_rgba(59,130,246,0.15)]"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <motion.div
                          initial={{ scale: 1 }}
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center"
                        >
                          <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
                        </motion.div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold mb-1">⏳ Aguardando Resposta do Cliente</h4>
                        <p className="text-sm text-gray-300">Sua proposta foi enviada! O cliente tem até {(() => {
                          const expiresAt = getTemporaryExpiresAt(conversation._id);
                          return expiresAt ? getTimeRemaining(expiresAt) : '24h';
                        })()} para aceitar ou recusar.</p>
                      </div>
                    </div>
                  </motion.div>
                );
              }
              
              return null;
            })()}

            {}
            {currentConversation && getTemporaryStatus() === 'expired' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-red-500/20 to-gray-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-red-400 text-2xl">🚫</div>
                  <div>
                    <h4 className="text-red-400 font-medium">Chat Temporário Expirado</h4>
                    <p className="text-gray-300 text-sm mt-1">
                      Esta proposta de boosting expirou e não pode mais ser aceita. O chat foi bloqueado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {}
            <div className="chat-input-area">
              {}
              {previewImage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-2 p-2 sm:p-3 bg-gray-800/70 border border-gray-700/60 rounded-lg flex items-center gap-3"
                >
                  <img
                    src={previewImage.url}
                    alt="Pré-visualização"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover border border-gray-600/60 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-300 truncate">
                        {previewImage.file.name}
                      </p>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {Math.max(1, Math.round(previewImage.file.size / 1024))} KB
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={handleSendPreviewImage}
                        disabled={isSendingPreview || !isConnected || isChatBlocked || currentConversation?.isReported || getTemporaryStatus() === 'expired'}
                        className="btn-send px-3 py-1.5 text-sm disabled:opacity-60"
                        whileHover={(!isSendingPreview && isConnected && !isChatBlocked) ? { scale: 1.03 } : {}}
                        whileTap={(!isSendingPreview && isConnected && !isChatBlocked) ? { scale: 0.97 } : {}}
                      >
                        {isSendingPreview ? 'Enviando…' : 'Enviar imagem'}
                      </motion.button>
                      <button
                        type="button"
                        onClick={handleRemovePreview}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-600/60 bg-gray-800/60 text-gray-200 hover:bg-gray-700/60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {isMarketplaceChat && isBuyerUser && marketplaceOrderDetails?.status === 'shipped' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {marketplaceOrderDetails?.itemImageUrl ? (
                      <img src={marketplaceOrderDetails.itemImageUrl} className="w-8 h-8 rounded object-cover border border-gray-700 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">
                        Vendedor confirmou o envio. Confirme o recebimento quando estiver tudo certo.
                      </div>
                      <div className="text-xs text-gray-400 truncate">{marketplaceOrderDetails?.itemTitle || 'Produto'}</div>
                    </div>
                  </div>
                </motion.div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  ref={attachInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = URL.createObjectURL(file);
                      setPreviewImage({ file, url });
                    } finally {
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <motion.button
                  type="button"
                  title="Anexar imagem"
                  onClick={() => attachInputRef.current?.click()}
                  disabled={!isConnected || isChatBlocked || currentConversation?.isReported || getTemporaryStatus() === 'expired'}
                  className="btn-attach bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded-lg border border-gray-600/60"
                  whileHover={(!isChatBlocked && isConnected) ? { scale: 1.05 } : {}}
                  whileTap={(!isChatBlocked && isConnected) ? { scale: 0.98 } : {}}
                >
                  <ImageIcon className="w-5 h-5 text-gray-200" />
                </motion.button>
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder={
                    currentConversation?.isReported ? "Chat reportado - mensagens bloqueadas" : 
                    isChatBlocked ? "Chat bloqueado - Pedido finalizado" : 
                    getTemporaryStatus() === 'expired' ? "Chat expirado - não é possível enviar mensagens" :
                    "Digite sua mensagem..."
                  }
                  className={`chat-text-input flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ${
                    (currentConversation?.isReported || isChatBlocked || getTemporaryStatus() === 'expired')
                      ? 'bg-red-900/20 border-red-500/50 text-red-300 cursor-not-allowed' 
                      : (messageInput.length > 10000
                        ? 'bg-red-900/20 border-red-500 text-red-300'
                        : '')
                  }`}
                  disabled={!isConnected || isChatBlocked || currentConversation?.isReported || getTemporaryStatus() === 'expired'}
                />
                <motion.button
                  type="submit"
                  disabled={!messageInput.trim() || !isConnected || isChatBlocked || currentConversation?.isReported || getTemporaryStatus() === 'expired'}
                  className="btn-send bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 shadow-lg"
                  whileHover={messageInput.trim() && isConnected && !isChatBlocked && !currentConversation?.isReported && getTemporaryStatus() !== 'expired' ? { 
                    scale: 1.05, 
                    boxShadow: "0 8px 25px rgba(139, 92, 246, 0.3)",
                    transition: { type: "spring" as const, stiffness: 400, damping: 10 }
                  } : {}}
                  whileTap={messageInput.trim() && isConnected && !isChatBlocked && !currentConversation?.isReported && getTemporaryStatus() !== 'expired' ? { 
                    scale: 0.95,
                    transition: { type: "spring" as const, stiffness: 400, damping: 10 }
                  } : {}}
                >
                  <motion.div
                    animate={messageInput.trim() && isConnected && !isChatBlocked ? {
                      rotate: [0, -10, 10, 0],
                      transition: { duration: 0.3 }
                    } : {}}
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.div>
                </motion.button>
              </form>
            </div>
          </>
        ) : (
          
          <motion.div 
            className="flex-1 flex items-center justify-center text-gray-400"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </motion.div>
              <motion.h3 
                className="text-lg font-medium mb-2"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Selecione uma conversa
              </motion.h3>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Escolha uma conversa da lista para começar a conversar
              </motion.p>
            </div>
          </motion.div>
        )}
      </div>

      {}
      <AnimatePresence mode="wait">
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl max-w-lg w-full h-auto overflow-hidden"
              style={{ overflow: 'hidden' }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {activeModalView === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {}
                    <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                          <Settings className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Configurações do Chat</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="overflow-hidden">
                      {}
                      <div className="p-6 border-b border-gray-700/30">
                        <label className="block text-sm font-medium mb-3 text-gray-300">Papel Detectado:</label>
                        {isDetectingRole ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center p-4 bg-gray-700/50 rounded-xl border border-gray-600/50"
                          >
                            <RefreshCw className="w-4 h-4 animate-spin mr-3 text-purple-400" />
                            <span className="text-sm text-gray-300">Detectando papel...</span>
                          </motion.div>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className={`p-4 rounded-xl border transition-all duration-300 ${
                              (userRole?.role === 'client' || (marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.buyerId))
                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-200 shadow-blue-500/10 shadow-lg'
                                : (userRole?.role === 'booster' || (marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.sellerId))
                                ? 'bg-green-600/20 border-green-500/50 text-green-200 shadow-green-500/10 shadow-lg'
                                : 'bg-gray-700/50 border-gray-600/50 text-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {(userRole?.role === 'client' || (marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.buyerId)) && <User className="w-6 h-6 mr-3" />}
                              {(userRole?.role === 'booster' || (marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.sellerId)) && <DollarSign className="w-6 h-6 mr-3" />}
                              {userRole?.role === 'unknown' && <AlertTriangle className="w-6 h-6 mr-3" />}
                              <span className="font-medium text-lg">
                                {userRole?.role === 'client' && !marketplaceInfo && 'Cliente'}
                                {userRole?.role === 'booster' && !marketplaceInfo && 'Booster'}
                                {marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.buyerId && 'Comprador'}
                                {marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.sellerId && 'Vendedor'}
                                {userRole?.role === 'unknown' && 'Papel não identificado'}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {}
                      <div className="p-6 space-y-4">
                        {isLoadingAction && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center py-8"
                          >
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            <span className="ml-3 text-gray-400">Processando...</span>
                          </motion.div>
                        )}
                        
                        {!isLoadingAction && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, staggerChildren: 0.1 }}
                            className="space-y-3"
                          >
                       

                            {}
                            {!isMarketplaceConversation(currentConversation) && (
                              <motion.button
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleViewProposal}
                                disabled={!proposalData}
                                className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-blue-700/20 hover:from-blue-600/30 hover:to-blue-700/30 disabled:from-gray-800/50 disabled:to-gray-800/50 disabled:cursor-not-allowed rounded-xl border border-blue-500/30 transition-all duration-200 flex items-center space-x-4 group"
                              >
                                <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                  <FileText className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1 text-left">
                                  <span className="font-medium text-white">Ver Proposta</span>
                                  <p className="text-sm text-gray-400 mt-1">
                                    {isTemporaryConversation(currentConversation?._id) && getTemporaryStatus(currentConversation?._id) === 'pending'
                                      ? 'Aceite a proposta primeiro'
                                      : 'Cancelar o serviço em andamento'}
                                  </p>
                                </div>
                              </motion.button>
                            )}

                            {(isMarketplaceConversation(currentConversation) && marketplaceInfo && (user?.id || getUserIdFromToken()) === marketplaceInfo?.sellerId) ? (
                              <>
                                {}
                                {marketplaceInfo?.status === 'completed' && (
                                  <div className="w-full p-4 bg-gradient-to-r from-green-600/20 to-emerald-700/20 rounded-xl border border-green-500/40 flex items-start space-x-3">
                                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-green-300 block mb-1">Pedido Finalizado</span>
                                      <p className="text-sm text-green-200/80">O comprador confirmou o recebimento. Pagamento já foi liberado na sua carteira.</p>
                                    </div>
                                  </div>
                                )}
                                
                                {}
                                {marketplaceInfo?.status === 'shipped' && (
                                  <div className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-xl border border-blue-500/40 flex items-start space-x-3">
                                    <AlertTriangle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-blue-300 block mb-1">Aguardando Confirmação</span>
                                     
                                    </div>
                                  </div>
                                )}
                                
                                {(['initiated','escrow_reserved'].includes((marketplaceInfo?.status || '').toString())) && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02, x: 4 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={executeMarkShipped}
                                      className="w-full p-4 bg-gradient-to-r from-green-600/20 to-green-700/20 hover:from-green-600/30 hover:to-green-700/30 rounded-xl border border-green-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                    >
                                      <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <span className="font-medium text-white">Confirmar Envio</span>
                                        <p className="text-sm text-gray-400 mt-1">Notificar comprador e iniciar contagem</p>
                                      </div>
                                    </motion.button>
                                  </>
                                )} 
                                {}
                                <motion.button
                                  whileHover={{ scale: 1.02, x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleOpenSupport}
                                  disabled={isOpeningSupport || !marketplaceInfo?.purchaseId}
                                  className="w-full p-4 bg-gradient-to-r from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-purple-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                >
                                  <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                                    <AlertTriangle className="w-5 h-5 text-purple-400" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <span className="font-medium text-white">Chamar Suporte</span>
                                    <p className="text-sm text-gray-400 mt-1">Abrir ticket para esta compra</p>
                                  </div>
                                </motion.button>
                              </>
                            ) : (isMarketplaceConversation(currentConversation)) ? (
                              
                              <>
                                {}
                                {marketplaceInfo?.status === 'completed' && (
                                  <div className="w-full p-4 bg-gradient-to-r from-green-600/20 to-emerald-700/20 rounded-xl border border-green-500/40 flex items-start space-x-3">
                                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-green-300 block mb-1">Entrega Confirmada pelo Cliente</span>
                                      <p className="text-sm text-green-200/80">Você confirmou o recebimento do pedido. A transação foi finalizada com sucesso.</p>
                                    </div>
                                  </div>
                                )}
                                
                                {}
                                {(['initiated','escrow_reserved'].includes((marketplaceInfo?.status || '').toString())) && (
                                  <div className="w-full p-4 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 rounded-xl border border-yellow-500/40 flex items-start space-x-3">
                                    <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-yellow-300 block mb-1">Aguardando Envio</span>
                                  
                                    </div>
                                  </div>
                                )}
                                
                                {}
                                {!['completed', 'cancelled'].includes((marketplaceInfo?.status || '').toString()) && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02, x: 4 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={handleConfirmDelivery}
                                      disabled={isChatBlocked || marketplaceInfo?.status !== 'shipped'}
                                      className="w-full p-4 bg-gradient-to-r from-green-600/20 to-green-700/20 hover:from-green-600/30 hover:to-green-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-green-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                    >
                                      <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <span className="font-medium text-white">Confirmar Recebimento</span>
                                        <p className="text-sm text-gray-400 mt-1">
                                          {marketplaceInfo?.status === 'shipped' 
                                            ? 'Liberar pagamento ao vendedor' 
                                            : 'Aguarde o vendedor marcar como enviado'}
                                        </p>
                                      </div>
                                    </motion.button>
                                  </>
                                )}

                                {marketplaceOrderDetails?.status === 'shipped' && (
                                  <motion.button
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleBuyerNotReceived}
                                    disabled={isDisputingNotReceived}
                                    className="w-full p-4 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 hover:from-yellow-600/30 hover:to-yellow-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-yellow-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                  >
                                    <div className="p-2 bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500/30 transition-colors">
                                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-white">Pedido Não Recebido</span>
                                      <p className="text-sm text-gray-400 mt-1">Pausar liberação e abrir arbitragem</p>
                                    </div>
                                  </motion.button>
                                )}

                                {}
                                <motion.button
                                  whileHover={{ scale: 1.02, x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleOpenSupport}
                                  disabled={isOpeningSupport || !marketplaceInfo?.purchaseId}
                                  className="w-full p-4 bg-gradient-to-r from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-purple-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                >
                                  <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                                    <AlertTriangle className="w-5 h-5 text-purple-400" />
                                  </div
>
                                  <div className="flex-1 text-left">
                                    <span className="font-medium text-white">Chamar Suporte</span>
                                    <p className="text-sm text-gray-400 mt-1">Abrir ticket para esta compra</p>
                                  </div>
                                </motion.button>
                              </>
                            ) : (userRole?.role === 'booster') ? (
                              <>
                                {}
                                {currentConversation?.boostingStatus === 'completed' && (
                                  <div className="w-full p-4 bg-gradient-to-r from-green-600/20 to-emerald-700/20 rounded-xl border border-green-500/40 flex items-start space-x-3">
                                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-green-300 block mb-1">Serviço Finalizado</span>
                                    </div>
                                  </div>
                                )}
                                
                                {}
                                {currentConversation?.boostingStatus !== 'completed' && !isChatBlocked && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02, x: 4 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={handleReportService}
                                      className="w-full p-4 bg-gradient-to-r from-orange-600/20 to-orange-700/20 hover:from-orange-600/30 hover:to-orange-700/30 rounded-xl border border-orange-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                    >
                                      <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <span className="font-medium text-white">Denunciar Cliente</span>
                                        <p className="text-sm text-gray-400 mt-1">Reportar comportamento inadequado</p>
                                      </div>
                                    </motion.button>
                                  </>
                                )}
                              </>
                            ) : (userRole?.role === 'client') ? (
                              <>
                                {}
                                {currentConversation?.boostingStatus === 'completed' && (
                                  <div className="w-full p-4 bg-gradient-to-r from-green-600/20 to-emerald-700/20 rounded-xl border border-green-500/40 flex items-start space-x-3">
                                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-green-300 block mb-1">Serviço Finalizado</span>
                                 
                                    </div>
                                  </div>
                                )}
                                
                                {}
                                {isTemporaryConversation(currentConversation?._id) && getTemporaryStatus(currentConversation?._id) === 'pending' && (
                                  <div className="w-full p-4 bg-gradient-to-r from-yellow-600/20 to-orange-700/20 rounded-xl border border-yellow-500/40 flex items-start space-x-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-yellow-300 block mb-1">Proposta Pendente</span>
                                      <p className="text-sm text-yellow-200/80">Aceite a proposta acima para desbloquear as ações do serviço.</p>
                                    </div>
                                  </div>
                                )}

                                {}
                                {currentConversation?.boostingStatus !== 'completed' && !isChatBlocked && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02, x: 4 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={handleConfirmDelivery}
                                      disabled={
                                        isChatBlocked || (
                                          isTemporaryConversation(currentConversation?._id) &&
                                          getTemporaryStatus(currentConversation?._id) === 'pending'
                                        )
                                      }
                                      className="w-full p-4 bg-gradient-to-r from-green-600/20 to-green-700/20 hover:from-green-600/30 hover:to-green-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-green-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                    >
                                      <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <span className="font-medium text-white">{isMarketplaceConversation(currentConversation) ? 'Confirmar Recebimento' : 'Confirmar Entrega'}</span>
                                        <p className="text-sm text-gray-400 mt-1">
                                          {isTemporaryConversation(currentConversation?._id) && getTemporaryStatus(currentConversation?._id) === 'pending'
                                            ? '🔒 Aceite a proposta primeiro'
                                            : (isMarketplaceConversation(currentConversation) ? 'Liberar pagamento ao vendedor' : 'Marcar serviço como concluído')}
                                        </p>
                                      </div>
                                    </motion.button>
                                  </>
                                )}

                                {}
                                {isMarketplaceConversation(currentConversation) && (marketplaceOrderDetails?.status === 'shipped') && (
                                  <motion.button
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleBuyerNotReceived}
                                    disabled={isDisputingNotReceived}
                                    className="w-full p-4 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 hover:from-yellow-600/30 hover:to-yellow-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-yellow-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                  >
                                    <div className="p-2 bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500/30 transition-colors">
                                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <span className="font-medium text-white">Pedido Não Recebido</span>
                                      <p className="text-sm text-gray-400 mt-1">Pausar liberação e abrir arbitragem</p>
                                    </div>
                                  </motion.button>
                                )}

                                {}
                                <motion.button
                                  whileHover={{ scale: 1.02, x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleOpenSupport}
                                  disabled={isOpeningSupport || !marketplaceInfo?.purchaseId}
                                  className="w-full p-4 bg-gradient-to-r from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 disabled:from-gray-600/20 disabled:to-gray-600/20 disabled:cursor-not-allowed rounded-xl border border-purple-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                >
                                  <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                                    <AlertTriangle className="w-5 h-5 text-purple-400" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <span className="font-medium text-white">Chamar Suporte</span>
                                    <p className="text-sm text-gray-400 mt-1">Abrir ticket para esta compra</p>
                                  </div>
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.02, x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleReportService}
                                  className="w-full p-4 bg-gradient-to-r from-orange-600/20 to-orange-700/20 hover:from-orange-600/30 hover:to-orange-700/30 rounded-xl border border-orange-500/30 transition-all duration-200 flex items-center space-x-4 group"
                                >
                                  <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <span className="font-medium text-white">{isMarketplaceConversation(currentConversation) ? 'Denunciar Vendedor' : 'Denunciar Booster'}</span>
                                    <p className="text-sm text-gray-400 mt-1">Reportar comportamento inadequado</p>
                                  </div>
                                </motion.button>
                              </>
                            ) : (
                              <>
                                <div className="text-center py-8 px-4">
                                  <p className="text-gray-400 text-sm">Detectando papel do usuário...</p>
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {}
                      {proposalData && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="p-6 border-t border-gray-700/30 bg-gray-800/30"
                        >
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                              <span className="text-gray-400 block">Valor</span>
                              <span className="text-green-400 font-semibold text-lg">R$ {proposalData.price?.toFixed(2)}</span>
                            </div>
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                              <span className="text-gray-400 block">Tempo</span>
                              <span className="text-blue-400 font-semibold">{proposalData.estimatedTime}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {}
                {activeModalView === 'proposal' && proposalData && (
                  <motion.div
                    key="proposal"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActiveModalView('main')}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </motion.button>
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Detalhes da Proposta</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="p-6 space-y-6 overflow-hidden">
                      {}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Jogo</h4>
                          <p className="text-white font-semibold text-lg">{proposalData.game}</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Categoria</h4>
                          <p className="text-white font-semibold text-lg">{proposalData.category}</p>
                        </div>
                      </div>

                      {}
                      {(proposalData.currentRank || proposalData.desiredRank) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {proposalData.currentRank && (
                            <div className="p-4 bg-orange-600/10 rounded-xl border border-orange-500/30">
                              <h4 className="text-sm font-medium text-orange-400 mb-2">Rank Atual</h4>
                              <p className="text-white font-semibold">{proposalData.currentRank}</p>
                            </div>
                          )}
                          {proposalData.desiredRank && (
                            <div className="p-4 bg-green-600/10 rounded-xl border border-green-500/30">
                              <h4 className="text-sm font-medium text-green-400 mb-2">Rank Desejado</h4>
                              <p className="text-white font-semibold">{proposalData.desiredRank}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-xl border border-green-500/30">
                          <h4 className="text-sm font-medium text-green-400 mb-2">💰 Valor</h4>
                          <p className="text-white font-bold text-2xl">R$ {proposalData.price?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-xl border border-blue-500/30">
                          <h4 className="text-sm font-medium text-blue-400 mb-2">⏱️ Tempo Estimado</h4>
                          <p className="text-white font-bold text-xl">{proposalData.estimatedTime}</p>
                        </div>
                      </div>

                      {}
                      {proposalData.description && (
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                          <h4 className="text-sm font-medium text-gray-400 mb-3">📝 Descrição</h4>
                          <p className="text-gray-200 leading-relaxed">{proposalData.description}</p>
                        </div>
                      )}

                      {}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
                          <h4 className="text-sm font-medium text-blue-400 mb-3">👤 Cliente</h4>
                          <p className="text-white font-semibold text-lg">{proposalData.client.name}</p>
                        </div>
                        <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                          <h4 className="text-sm font-medium text-purple-400 mb-3">🚀 Booster</h4>
                          <p className="text-white font-semibold text-lg mb-2">{proposalData.booster.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-300">
                            <span className="flex items-center">
                              ⭐ {proposalData.booster.rating}/5
                            </span>
                            <span className="flex items-center">
                              📊 {proposalData.booster.totalBoosts} boosts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {}
                {activeModalView === 'report' && (
                  <motion.div
                    key="report"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActiveModalView('main')}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </motion.button>
                        <div className="p-2 bg-orange-600/20 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">
                          {userRole?.role === 'booster' ? 'Denunciar Cliente' : 'Denunciar Booster'}
                        </h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="p-6 space-y-6 overflow-hidden">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            Motivo da denúncia *
                          </label>
                          <select
                            value={reportData.reason}
                            onChange={(e) => setReportData(prev => ({ ...prev, reason: e.target.value }))}
                            className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                          >
                            <option value="">Selecione o motivo</option>
                            <option value="comportamento_inadequado">Comportamento inadequado</option>
                            <option value="linguagem_ofensiva">Linguagem ofensiva</option>
                            <option value="nao_cumprimento">Não cumprimento do acordado</option>
                            <option value="fraude">Suspeita de fraude</option>
                            <option value="spam">Spam</option>
                            <option value="outros">Outros</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            Descrição detalhada *
                          </label>
                          <textarea
                            value={reportData.description}
                            onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descreva detalhadamente o que aconteceu..."
                            className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 resize-none"
                            rows={4}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            Evidências (opcional)
                          </label>
                          <textarea
                            value={reportData.evidence}
                            onChange={(e) => setReportData(prev => ({ ...prev, evidence: e.target.value }))}
                            placeholder="Cole links de screenshots, mensagens ou outras evidências..."
                            className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 resize-none"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-orange-600/10 rounded-xl border border-orange-500/30">
                        <div className="flex items-center space-x-3 mb-2">
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                          <span className="font-medium text-orange-200">Importante</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Denúncias falsas podem resultar em penalidades. Nossa equipe analisará o caso e tomará as medidas necessárias.
                        </p>
                      </div>

                      <div className="flex space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveModalView('main')}
                          className="flex-1 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl border border-gray-600/50 transition-colors text-gray-300"
                        >
                          Voltar
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={executeReportService}
                          disabled={!reportData.reason.trim() || !reportData.description.trim() || isLoadingAction}
                          className="flex-1 p-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl transition-all text-white font-medium"
                        >
                          {isLoadingAction ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Enviando...
                            </div>
                          ) : (
                            'Enviar Denúncia'
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {}
                {activeModalView === 'support' && (
                  <motion.div
                    key="support"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActiveModalView('main')}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </motion.button>
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Chamar Suporte</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="p-6 space-y-6 overflow-hidden">
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                          <div className="flex items-center space-x-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-purple-400" />
                            <span className="font-medium text-purple-200">Abrir ticket de suporte</span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            Descreva o problema para nossa equipe de suporte (opcional). Um ticket será aberto para esta compra e você poderá acompanhar pelas abas de Tickets.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            Descrição (opcional)
                          </label>
                          <textarea
                            value={supportDescription}
                            onChange={(e) => setSupportDescription(e.target.value)}
                            placeholder="Descreva o problema para o suporte (opcional)..."
                            className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
                            rows={4}
                          />
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveModalView('main')}
                          className="flex-1 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl border border-gray-600/50 transition-colors text-gray-300"
                        >
                          Voltar
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={executeOpenSupport}
                          disabled={isOpeningSupport}
                          className="flex-1 p-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl transition-all text-white font-medium"
                        >
                          {isOpeningSupport ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Enviando...
                            </div>
                          ) : (
                            'Abrir Ticket'
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {}
                {activeModalView === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActiveModalView('main')}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </motion.button>
                        <div className="p-2 bg-green-600/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Confirmar Entrega</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="text-center space-y-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
                          className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto"
                        >
                          <CheckCircle className="w-10 h-10 text-green-400" />
                        </motion.div>
                        
                        <div>
                          <h4 className="text-xl font-semibold text-white mb-2">
                            Confirmar conclusão do serviço?
                          </h4>
                          <p className="text-gray-400">
                            Ao confirmar, o serviço será marcado como concluído
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-green-600/10 rounded-xl border border-green-500/30">
                          <div className="flex items-center space-x-3 mb-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="font-medium text-green-200">O que acontece ao confirmar:</span>
                          </div>
                          <ul className="space-y-2 text-gray-300 text-sm">
                            <li className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>O booster receberá o pagamento</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>O chat será bloqueado instantaneamente</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>Você poderá avaliar o booster</span>
                            </li>
                          </ul>
                        </div>

                        <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
                          <div className="flex items-center space-x-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-blue-400" />
                            <span className="font-medium text-blue-200">Importante</span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            Confirme apenas se o serviço foi realmente entregue conforme acordado. Esta ação não pode ser desfeita.
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveModalView('main')}
                          className="flex-1 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl border border-gray-600/50 transition-colors text-gray-300"
                        >
                          Cancelar
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={executeConfirmDelivery}
                          disabled={isLoadingAction}
                          className="flex-1 p-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl transition-all text-white font-medium"
                        >
                          {isLoadingAction ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Confirmando...
                            </div>
                          ) : (
                            'Confirmar Entrega'
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {}
                {activeModalView === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-600/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">
                          Pedido Finalizado!
                        </h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="text-center space-y-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
                          className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto"
                        >
                          <CheckCircle className="w-10 h-10 text-green-400" />
                        </motion.div>
                        
                        <div>
                          <h4 className="text-2xl font-bold text-white mb-2">
                            🎉 Pedido Finalizado com Sucesso!
                          </h4>
                          <p className="text-gray-400 text-lg">
                            O chat foi bloqueado automaticamente
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-green-600/10 rounded-xl border border-green-500/30">
                          <div className="flex items-center space-x-3 mb-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="font-medium text-green-200">O que aconteceu:</span>
                          </div>
                          <ul className="space-y-2 text-gray-300 text-sm">
                            <li className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>Pedido marcado como concluído</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>Chat bloqueado para novas mensagens</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>Processo de pagamento iniciado</span>
                            </li>
                          </ul>
                        </div>

                        <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
                          <div className="flex items-center space-x-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-blue-400" />
                            <span className="font-medium text-blue-200">Para novos pedidos</span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            Para iniciar uma nova conversa, faça um novo pedido. Cada pedido terá seu próprio chat independente.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCloseModal}
                          className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl transition-all text-white font-medium"
                        >
                          Entendi
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      </div>
    </div>
  );
};

export default UnifiedChatComponent;
