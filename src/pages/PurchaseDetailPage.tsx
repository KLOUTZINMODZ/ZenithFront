import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  MessageCircle,
  Copy,
  Check,
  Star,
  Send,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
 
import { purchaseService, reviewService } from '../services';
import websocketService from '../services/websocketService';
import { marketplaceService } from '../services/marketplaceService';

interface PurchaseData {
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  itemId?: string;
  price: number;
  status: string;
  conversationId?: string;
  escrowReservedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  autoReleaseAt?: string;
  deliveryMethod?: string;
}

interface SellerSummary {
  id?: string;
  name?: string;
  avatar?: string;
  rating?: number;
  totalSales?: number;
  joinDate?: string;
}

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'initiated':
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-blue-900/20 text-blue-400 text-sm rounded-full">
          <Clock className="w-4 h-4" /> Iniciada
        </span>
      );
    case 'escrow_reserved':
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/20 text-yellow-400 text-sm rounded-full">
          <Clock className="w-4 h-4" /> Em Escrow
        </span>
      );
    case 'shipped':
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-indigo-900/20 text-indigo-400 text-sm rounded-full">
          <Package className="w-4 h-4" /> Enviada
        </span>
      );
    case 'completed':
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 text-sm rounded-full">
          <CheckCircle className="w-4 h-4" /> Concluída
        </span>
      );
    case 'cancelled':
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-red-900/20 text-red-400 text-sm rounded-full">
          <XCircle className="w-4 h-4" /> Cancelada
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-gray-900/20 text-gray-400 text-sm rounded-full">
          {status}
        </span>
      );
  }
};

const formatDateTime = (dt?: string) => {
  if (!dt) return '-';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatDateOnly = (dt?: string) => {
  if (!dt) return '-';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatDeliveryMethodLabel = (value?: string) => {
  if (!value) return '';
  const method = value.toLowerCase();
  if (method === 'manual') return 'Entrega manual';
  if (method === 'automatic') return 'Entrega automática';
  return value;
};

const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openChat } = useChatNavigation();
  const { user } = useAuth();
  

  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [item, setItem] = useState<{ title?: string; image?: string; game?: string; category?: string; description?: string } | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerSummary | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [eligible, setEligible] = useState<boolean>(false);
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const orderNumber = useMemo(() => (id ? String(id).slice(-8).toUpperCase() : ''), [id]);
  
  const openSellerProfile = (event?: React.MouseEvent) => {
    event?.preventDefault();
    const sellerId = sellerInfo?.id || purchase?.sellerId;
    if (!sellerId) return;
    navigate(`/users/${sellerId}`);
  };

  
  const loadPurchase = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseService.getById(id);
      if (res.success && res.data) {
        setPurchase(res.data as PurchaseData);
        setSellerInfo((prev) => prev ?? { id: res.data?.sellerId });
        if (res.data.itemId) {
          try {
            const itemRes = await marketplaceService.getItemById(String(res.data.itemId));
            if (itemRes.success && itemRes.data?.item) {
              const it = itemRes.data.item as any;
              setItem({ title: it.title, image: it.image || (it.images?.[0] ?? ''), game: it.game, category: it.category, description: it.description });
              if (it.seller) {
                setSellerInfo((prev) => ({
                  id: it.seller._id || it.seller.userid || prev?.id || res.data?.sellerId,
                  name: it.seller.name || prev?.name,
                  avatar: it.seller.avatar || it.seller.profilePicture || prev?.avatar,
                  rating: typeof it.seller.rating === 'number' ? it.seller.rating : prev?.rating,
                  totalSales: typeof it.seller.totalSales === 'number' ? it.seller.totalSales : prev?.totalSales,
                  joinDate: it.seller.joinDate || prev?.joinDate
                }));
              }
            }
          } catch {}
        }
      } else {
        setError(res.message || 'Não foi possível carregar o pedido');
      }
    } catch (e) {
      setError('Erro de conexão ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!id) return;
    loadPurchase();
    const onStatus = (data: any) => {
      try {
        if (data?.purchaseId && String(data.purchaseId) === String(id)) {
          setPurchase(prev => prev ? {
            ...prev,
            status: String(data.status || prev.status),
            shippedAt: data.shippedAt || prev.shippedAt,
            deliveredAt: data.deliveredAt || prev.deliveredAt,
            autoReleaseAt: data.autoReleaseAt || prev.autoReleaseAt
          } : prev);
        }
      } catch {}
    };
    websocketService.on('marketplace:status_changed', onStatus);
    return () => {
      websocketService.off('marketplace:status_changed', onStatus);
    };
  }, [id, user, navigate]);

  const loadReview = async (purchaseIdParam?: string) => {
    try {
      const pid = purchaseIdParam || purchase?.purchaseId || id;
      if (!pid) return;
      setReviewLoading(true);
      setReviewError(null);
      const r = await reviewService.getPurchaseReview(String(pid));
      setExistingReview(r.review || null);

      
      const uid = (user as any)?._id || (user as any)?.id || (user as any)?.userid;
      const localRole = purchase?.buyerId && uid && String(purchase.buyerId) === String(uid)
        ? 'buyer'
        : (purchase?.sellerId && uid && String(purchase.sellerId) === String(uid) ? 'seller' : null);
      const normalized = String(purchase?.status || '').toLowerCase().trim();
      const localEligible = !!(localRole === 'buyer' && normalized === 'completed' && !r.review);

      setEligible(Boolean(r.eligible) || localEligible);
      setRole(r.role || (localRole as any));
      if (!r.eligible && r.review) {
        setRating(Number(r.review.rating || 0));
      }
    } catch (err: any) {
      setReviewError(err?.message || 'Erro ao carregar feedback');
    } finally {
      setReviewLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (purchase?.purchaseId) {
      loadReview(purchase.purchaseId);
    }
    
  }, [purchase?.purchaseId]);

  
  useEffect(() => {
    if ((purchase?.status || '').toLowerCase() === 'completed') {
      loadReview(purchase?.purchaseId);
    }
    
  }, [purchase?.status]);

  
  const computedEligible = useMemo(() => {
    const uid = (user as any)?.id || (user as any)?._id || (user as any)?.userid;
    const isBuyerLocal = purchase?.buyerId && uid && String(purchase.buyerId) === String(uid);
    const normalized = String(purchase?.status || '').toLowerCase().trim();
    const isCompleted = normalized === 'completed';
    return !existingReview && !!isBuyerLocal && isCompleted;
  }, [user, purchase?.buyerId, purchase?.status, existingReview]);

  const isBuyer = useMemo(() => {
    const uid = (user as any)?.id || (user as any)?._id || (user as any)?.userid;
    return !!(purchase?.buyerId && uid && String(purchase.buyerId) === String(uid));
  }, [user, purchase?.buyerId]);

  const renderStars = (value: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHoveredRating(i + 1)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            onClick={() => interactive && setRating(i + 1)}
            className={interactive ? 'transition-colors' : 'cursor-default'}
          >
            <Star className={`w-5 h-5 ${i < (interactive ? (hoveredRating || value) : value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
          </button>
        ))}
      </div>
    );
  };

  const submitReview = async () => {
    if (!purchase?.purchaseId || rating <= 0) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const created = await reviewService.createPurchaseReview({ purchaseId: String(purchase.purchaseId), rating, comment: comment.trim() || undefined });
      setExistingReview(created);
      setEligible(false);
    } catch (err: any) {
      setReviewError(err?.message || 'Erro ao enviar avaliação');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }
  if (error || !purchase) {
    return (
      <div className="bg-gray-900 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Erro ao carregar pedido</h3>
          <p className="text-gray-400 mb-6">{error || 'Pedido não encontrado'}</p>
          <button onClick={() => navigate('/sales')} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
        </div>

        {}
        <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-700/60">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="w-8 h-8 text-purple-500" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Pedido {orderNumber}</h1>
              <button onClick={() => copyToClipboard(orderNumber)} className="p-1 text-gray-400 hover:text-white transition-colors" title="Copiar número do pedido">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
              <p className="text-gray-400">Valor: <span className="text-purple-400 font-bold">R$ {purchase.price.toFixed(2)}</span></p>
            </div>
            <div className="flex items-center gap-3">
              {statusBadge(purchase.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {}
            <div className="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700/60">
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  Detalhes do Item
                </h2>
                <div className="flex gap-4 sm:gap-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                  {item?.image ? (
                    <img src={item.image} alt={item?.title || 'Item'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <ShoppingBag className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">{item?.title || 'Item'}</h3>
                    {(item?.game || item?.category) && (
                      <p className="text-gray-400 mb-2 text-sm">{[item?.game, item?.category].filter(Boolean).join(' • ')}</p>
                    )}
                    <p className="text-purple-400 font-bold">R$ {purchase.price.toFixed(2)}</p>
                    {purchase.deliveryMethod && (
                      <span className={`inline-flex items-center gap-2 mt-3 text-xs font-medium px-3 py-1 rounded-full border ${purchase.deliveryMethod.toLowerCase() === 'automatic' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
                        <Package className="w-4 h-4" />
                        {formatDeliveryMethodLabel(purchase.deliveryMethod)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {item?.description && (
                <div className="border-t border-gray-700/60 p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3">Descrição</h3>
                  <p className="text-gray-300 whitespace-pre-line text-sm">{item.description}</p>
                </div>
              )}
            </div>

            {}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Linha do tempo
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Reserva em Escrow:</span><span className="text-white">{formatDateTime(purchase.escrowReservedAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Enviado pelo vendedor:</span><span className="text-white">{formatDateTime(purchase.shippedAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Confirmado/Concluído:</span><span className="text-white">{formatDateTime(purchase.deliveredAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Liberação automática:</span><span className="text-white">{formatDateTime(purchase.autoReleaseAt)}</span></div>
              </div>
            </div>
          </div>

          {}
          <div className="space-y-4 sm:space-y-6">
            {(sellerInfo || purchase.sellerId) && (
              <button
                type="button"
                onClick={(e) => openSellerProfile(e)}
                className="w-full text-left bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10 transition"
              >
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Vendedor
                </h2>
                <div className="flex items-center gap-4">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600/60">
                    {sellerInfo?.avatar ? (
                      <img src={sellerInfo.avatar} alt={sellerInfo?.name || 'Vendedor'} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-gray-400" />
                    )}
                  </span>
                  <div>
                    <p className="text-white font-semibold text-base">{sellerInfo?.name || 'Vendedor'}</p>
                    <p className="text-xs text-gray-400">ID: {sellerInfo?.id || purchase.sellerId}</p>
                    {sellerInfo?.joinDate && (
                      <p className="text-xs text-gray-500">Membro desde {formatDateOnly(sellerInfo.joinDate)}</p>
                    )}
                  </div>
                </div>
              </button>
            )}
            {}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Feedback
              </h2>
              {reviewLoading ? (
                <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin"/> Carregando feedback...</div>
              ) : existingReview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {renderStars(Number(existingReview.rating) || 0, false)}
                    <span className="text-xs text-gray-500">Compra verificada</span>
                  </div>
                  {existingReview.comment && (
                    <p className="text-gray-300 text-sm whitespace-pre-line">{existingReview.comment}</p>
                  )}
                  {role === 'seller' && (
                    <p className="text-gray-400 text-xs">O comprador avaliou este pedido.</p>
                  )}
                </div>
              ) : (eligible || computedEligible) ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-300 text-sm mb-2">Avalie sua experiência com o vendedor</p>
                    {renderStars(rating, true)}
                    {rating > 0 && (
                      <p className="text-gray-400 text-xs mt-1">{rating} de 5 estrelas</p>
                    )}
                  </div>
                  <div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Comentário"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    />
                  </div>
                  {reviewError && <div className="text-red-400 text-sm">{reviewError}</div>}
                  <button
                    onClick={submitReview}
                    disabled={submittingReview || rating === 0}
                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {submittingReview ? (<><Loader2 className="w-4 h-4 animate-spin"/> Enviando...</>) : (<><Send className="w-4 h-4"/> Enviar avaliação</>)}
                  </button>
                  <p className="text-gray-500 text-xs">Apenas o comprador pode avaliar este pedido.</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">{(role === 'seller' || !isBuyer) ? 'Aguardando avaliação do comprador.' : 'Você poderá avaliar quando o pedido estiver concluído.'}</p>
              )}
            </div>

            {}
            {purchase.conversationId && (
              <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  Conversa
                </h2>
                <p className="text-gray-400 text-sm mb-4">Acesse a conversa para trocar informações com o outro participante.</p>
                <button onClick={() => purchase.conversationId && openChat(purchase.conversationId)} className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Ir para o Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PurchaseDetailPage;
