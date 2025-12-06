import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingCart, Eye, ArrowLeft, User, Loader2, MessageCircle, Flag, Heart } from 'lucide-react';
import { marketplaceService, qaService, purchaseService } from '../services';
import { getReceivedReviews } from '../services/reviewService';
import { ensureDictionariesLoaded, checkProhibitedContent } from '../utils/contentFilter';
import notificationWebSocketService from '../services/notificationWebSocketService';
import type { QAQuestion as QAItem } from '../services/qaService';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useFavorites } from '../contexts/FavoritesContext';
import ImagePlaceholder from '../components/ImagePlaceholder';

interface MarketItemDetail {
  _id: string;
  title: string;
  game: string;
  price: number;
  discount?: number;
  image: string;
  images?: string[];
  category: string;
  subcategory?: string;
  condition?: string;
  description: string;
  tags?: string[];
  attributes?: Record<string, string>;
  seller: {
    _id: string;
    name: string;
    avatar?: string;
    joinDate: string;
    rating: number;
    totalSales: number;
  };

  rating: {
    average: number;
    count: number;
  };
  views: number;
  deliveryMethod: string;
  deliveryInstructions?: string;
  stock?: number;
  stockLeft?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
  detached?: boolean;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Novo',
  used: 'Usado'
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  plataforma: 'Plataforma',
  idioma: 'Idioma',
  entrega: 'Servidor Da Conta'
};

const formatConditionLabel = (value?: string) => {
  if (!value) return '';
  const key = value.toLowerCase();
  return CONDITION_LABELS[key] || value;
};

const formatDeliveryMethodLabel = (value?: string) => {
  if (!value) return '';
  const method = value.toLowerCase();
  if (method === 'manual') return 'Entrega manual';
  if (method === 'automatic') return 'Entrega automática';
  return value;
};

interface RelatedItem {
  _id: string;
  title: string;
  game: string;
  price: number;
  image: string;
  category?: string;
  seller?: {
    _id: string;
    name: string;
    rating: number;
  };
  rating?: {
    average: number;
    count: number;
  };
  views?: number;
  createdAt?: string;
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);

const MarketplaceItemPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  
  const [item, setItem] = useState<MarketItemDetail | null>(null);

  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerRating, setSellerRating] = useState<number>(0);
  const [sellerTotalSales, setSellerTotalSales] = useState<number>(0);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [purchasing, setPurchasing] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const [qa, setQa] = useState<QAItem[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [qaHasNew, setQaHasNew] = useState(false);
  const [reportInputs, setReportInputs] = useState<Record<string, { open: boolean; reason: string; description: string; submitting?: boolean }>>({});
  const [reportedUsers, setReportedUsers] = useState<Record<string, boolean>>({});


  const galleryImages = useMemo(() => {
    if (!item) return [] as string[];
    const list = [item.image, ...(item.images || [])].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [item?.image, item?.images]);

  const normalizedTags = useMemo(() => {
    if (!item) return [] as string[];
    const rawTags: any = (item as any).tags ?? item.tags;
    if (Array.isArray(rawTags)) {
      return rawTags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => Boolean(tag));
    }
    if (typeof rawTags === 'string') {
      return rawTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return [] as string[];
  }, [item]);

  const attributeEntries = useMemo(() => {
    if (!item || !item.attributes) return [] as Array<[string, string]>;
    return Object.entries(item.attributes)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key, value]) => [key, (value as string).trim()]);
  }, [item]);

  const pricingDetails = useMemo(() => {
    if (!item) return null;
    const price = Number(item.price) || 0;
    const discountRaw = typeof item.discount === 'number' ? item.discount : Number((item as any)?.discount || 0);
    let original = typeof (item as any)?.originalPrice === 'number' ? Number((item as any)?.originalPrice) : 0;

    if ((!original || original <= price) && discountRaw > 0 && discountRaw < 100 && price > 0) {
      const reconstructed = price / (1 - discountRaw / 100);
      if (!Number.isNaN(reconstructed) && reconstructed > price) {
        original = reconstructed;
      }
    }

    const hasValidOriginal = original > price && original > 0;
    const savings = hasValidOriginal ? original - price : 0;
    const percent = savings > 0 && original > 0 ? Math.min(95, Math.round((savings / original) * 100)) : 0;

    return {
      price,
      original: hasValidOriginal ? original : 0,
      savings,
      percent
    };
  }, [item]);

  const showSavingsHighlight = pricingDetails ? pricingDetails.percent > 0 && pricingDetails.savings > 0 : false;

  const detailRows = useMemo(() => {
    if (!item) return [] as { label: string; value: string }[];
    const rows: Array<{ label: string; value: string }> = [];
    if (item.subcategory) rows.push({ label: 'Subcategoria', value: item.subcategory });
    if (item.condition) rows.push({ label: 'Condição', value: formatConditionLabel(item.condition) });
    if (item.deliveryMethod) rows.push({ label: 'Entrega', value: formatDeliveryMethodLabel(item.deliveryMethod) });
    if (pricingDetails?.percent && pricingDetails.percent > 0) {
      rows.push({ label: 'Desconto aplicado', value: `${pricingDetails.percent}%` });
    }
    return rows;
  }, [item, pricingDetails?.percent]);

  const hasAdditionalInfo = detailRows.length > 0 || attributeEntries.length > 0 || normalizedTags.length > 0;

  
  const getTodayKey = () => {
    try {
      const uid = (user as any)?.id;
      if (!uid) return null;
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `qa_daily_count_${uid}_${yyyy}-${mm}-${dd}`;
    } catch { return null; }
  };

  const loadDailyCount = () => {
    try {
      const key = getTodayKey();
      if (!key) return 0;
      const raw = localStorage.getItem(key);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isNaN(n) ? 0 : n;
    } catch { return 0; }
  };

  const saveDailyCount = (n: number) => {
    try { const key = getTodayKey(); if (key) localStorage.setItem(key, String(n)); } catch {}
  };

  useEffect(() => {
    setDailyCount(loadDailyCount());
  }, [user]);

  useEffect(() => {
    const fetchItemDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await marketplaceService.getItemById(id);
        
        if (response.success && response.data?.items && response.data.items.length > 0) {

          const specificItem = response.data.items.find((item: any) => item._id === id);
          if (specificItem) {

            const sellerData = (specificItem as any).sellerId || (specificItem as any).seller || {};
                                    

            let sellerRating = 0;
            if (sellerData.rating) {
              if (typeof sellerData.rating === 'number') {
                sellerRating = sellerData.rating;
              } else if (typeof sellerData.rating === 'object' && sellerData.rating.average !== undefined) {
                sellerRating = Number(sellerData.rating.average) || 0;
              }
            }
            
            const itemDetail = {
              ...specificItem,
              seller: {
                _id: sellerData._id || '',
                name: sellerData.name || 'Vendedor',
                avatar: sellerData.avatar || (sellerData as any).profileImage || '',
                joinDate: sellerData.joinDate || new Date().toISOString(),
                rating: sellerRating,
                totalSales: Number(sellerData.totalSales) || 0
              }
            };
            
                        setItem(itemDetail);
            const firstImage = specificItem.image || (specificItem.images && specificItem.images[0]) || '';
            setSelectedImage(firstImage);
            setCurrentImageIndex(0);
            

            setRelatedItems(response.data.relatedItems || []);
          } else {
            setError('Item não encontrado');
          }
        } else if (response.success && response.data?.item) {

          const itemData = response.data.item as any;
          const sellerData: any = (itemData as any).sellerId || (itemData as any).seller || {};
          const itemDetail = {
            ...itemData,
            seller: {
              _id: sellerData._id || sellerData.userid?.toString() || '',
              name: sellerData.name || 'Vendedor',
              avatar: sellerData.avatar || sellerData.profileImage || '',
              joinDate: sellerData.joinDate || new Date().toISOString(),
              rating: sellerData.rating || 0,
              totalSales: sellerData.totalSales || 0
            }
          };
          setItem(itemDetail);
          const firstImage = itemData.image || (itemData.images && itemData.images[0]) || '';
          setSelectedImage(firstImage);
          setCurrentImageIndex(0);
          

          setRelatedItems(response.data.relatedItems || []);
        } else {
          setError(response.message || 'Erro ao carregar detalhes do item');
        }
      } catch (err) {
        setError('Erro de conexão ao carregar detalhes do item');
              } finally {
        setLoading(false);
      }
    };
    
    fetchItemDetails();
  }, [id]);


  useEffect(() => {
    if (!selectedImage && galleryImages.length > 0) {
      setSelectedImage(galleryImages[0]);
      setCurrentImageIndex(0);
    }
  }, [galleryImages, selectedImage]);

  
  useEffect(() => {
    if (galleryImages.length > 0 && galleryImages[currentImageIndex]) {
      setSelectedImage(galleryImages[currentImageIndex]);
    }
  }, [currentImageIndex, galleryImages]);

  
  useEffect(() => {
    const loadQA = async () => {
      try {
        if (!item?._id) return;
        setQaLoading(true);
        setQaError(null);
        const res = await qaService.listByItem(item._id);
        setQa(res.data?.questions || []);
        setQaHasNew(false);
      } catch (e) {
        setQaError('Erro ao carregar perguntas');
      } finally {
        setQaLoading(false);
      }
    };
    loadQA();
  }, [item?._id]);

  
  useEffect(() => {
    const fetchSellerStats = async () => {
      if (!item?.seller) return;
      
      const sellerId = (item.seller as any)?._id || (item.seller as any)?.userid || item.seller;
      const sellerEmail = (item.seller as any)?.email;
      
      try {
        
        const reviewData = await getReceivedReviews(String(sellerId), 1, 1, { email: sellerEmail });
        const avg = Number((reviewData as any)?.stats?.average ?? 0);
        if (!isNaN(avg) && avg > 0) {
          setSellerRating(avg);
        }

        
        const salesData = await purchaseService.list({ type: 'sales', page: 1, limit: 1 });
        const total = Number(salesData?.data?.pagination?.total ?? 0);
        setSellerTotalSales(total);
      } catch (err) {
              }
    };
    
    fetchSellerStats();
  }, [item?.seller]);

  
  const soldOut = useMemo(() => {
    try {
      if (!item) return false;
      const status = String((item as any)?.status || 'active').toLowerCase();
      if (status === 'sold') return true;
      if (status === 'reserved') {
        
        const stockLeft = (item as any)?.stockLeft;
        if (stockLeft == null) return true;
        if (typeof stockLeft === 'number' && stockLeft <= 0) return true;
      }
      const stockLeft = (item as any)?.stockLeft;
      if (typeof stockLeft === 'number' && stockLeft <= 0) return true;
      return false;
    } catch { return false; }
  }, [item]);

  
  const stockInfo = useMemo(() => {
    try {
      if (!item) return { show: false, left: 0, total: 0 } as { show: boolean; left: number; total?: number };
      const isAccount = String((item as any)?.category || '').toLowerCase() === 'account';
      if (isAccount) return { show: false, left: 0, total: 0 };
      const declaredRaw = (item as any)?.stock;
      const declared = Number.isFinite(Number(declaredRaw)) ? Math.max(0, Math.min(Number(declaredRaw), 9999)) : 0;
      const leftRaw = (item as any)?.stockLeft;
      let left = Number.isFinite(Number(leftRaw)) ? Number(leftRaw) : declared;
      if (declared > 0) left = Math.min(Math.max(0, left), declared);
      return { show: (declared > 0 || left > 0), left: Math.max(0, Number(left)), total: declared || undefined };
    } catch { return { show: false, left: 0, total: 0 }; }
  }, [item]);

  
  useEffect(() => {
    try {
      const uid = (user as any)?.id;
      if (!uid) return;
      const key = `qa_reported_users_${uid}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setReportedUsers(parsed);
      }
    } catch {}
  }, [user]);

  
  useEffect(() => {
    setImageLoadError(false);
  }, [selectedImage]);

  
  useEffect(() => {
    const onNewNotification = (data: any) => {
      try {
        const n = data?.notification;
        const type = String(n?.type || '');
        const meta = n?.meta || {};
        if ((type === 'qa:new_question' || type === 'qa:answered') && meta.itemId === item?._id) {
          setQaHasNew(true);
          qaService.listByItem(item!._id).then(r => setQa(r.data?.questions || [])).catch(() => {});
        }
      } catch {}
    };
    notificationWebSocketService.on('new_notification', onNewNotification);
    return () => {
      notificationWebSocketService.off('new_notification', onNewNotification);
    };
  }, [item?._id]);

  const isSellerOfItem = !!(user && item && String((user as any).id) === String((item.seller as any)?._id ?? (item.seller as any)?.userid));

  const handleSubmitQuestion = async () => {
    if (!user) {
      addNotification({ title: 'Login necessário', message: 'Você precisa estar logado para enviar perguntas', type: 'warning' });
      navigate('/login');
      return;
    }
    if (!item) return;
    if (isSellerOfItem) {
      addNotification({ title: 'Ação não permitida', message: 'Vendedores não podem perguntar em seus próprios itens', type: 'warning' });
      return;
    }
    
    if (dailyCount >= 5) {
      addNotification({ title: 'Limite diário atingido', message: 'Você já enviou 5 perguntas hoje. Tente novamente amanhã.', type: 'warning' });
      return;
    }
    const text = newQuestion.trim();
    if (!text) return;
    
    try {
      await ensureDictionariesLoaded();
      const check = checkProhibitedContent(text);
      if (!check.ok) {
        const codes = check.violations.map(v => v.code);
        let reason = 'Sua pergunta contém conteúdo não permitido.';
        if (codes.includes('profanity')) reason = 'Evite usar palavrões ou termos ofensivos.';
        else if (codes.includes('email')) reason = 'Não compartilhe e-mails nas perguntas.';
        else if (codes.includes('url')) reason = 'Não compartilhe links/URLs nas perguntas.';
        else if (codes.includes('cpf')) reason = 'Por segurança, não compartilhe CPF.';
        else if (codes.includes('phone') || codes.includes('too_many_digits')) reason = 'Não compartilhe números de telefone (ou sequência de dígitos).';
        addNotification({ title: 'Conteúdo bloqueado', message: reason, type: 'warning' });
        return;
      }
    } catch {}
    try {
      await qaService.createQuestion(item._id, text);
      setNewQuestion('');
      const res = await qaService.listByItem(item._id);
      setQa(res.data?.questions || []);
      setQaHasNew(false);
      
      const next = dailyCount + 1;
      setDailyCount(next);
      saveDailyCount(next);
      addNotification({ title: 'Pergunta enviada', message: 'Sua pergunta foi enviada ao vendedor.', type: 'success' });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 429) {
        setDailyCount(5);
        saveDailyCount(5);
        const msg = e?.response?.data?.message || 'Limite diário de perguntas atingido.';
        addNotification({ title: 'Limite diário', message: msg, type: 'warning' });
      } else {
        addNotification({ title: 'Erro', message: 'Não foi possível enviar sua pergunta. Tente novamente.', type: 'error' });
      }
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!user || !item) return;
    if (!isSellerOfItem) return;
    const ans = (answerInputs[questionId] || '').trim();
    if (!ans) return;
    try {
      await qaService.answerQuestion(questionId, ans);
      setAnswerInputs(prev => ({ ...prev, [questionId]: '' }));
      const res = await qaService.listByItem(item._id);
      setQa(res.data?.questions || []);
      setQaHasNew(false);
      addNotification({ title: 'Resposta enviada', message: 'O comprador será notificado.', type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erro', message: 'Não foi possível enviar a resposta. Tente novamente.', type: 'error' });
    }
  };

  const toggleReport = (questionId: string) => {
    setReportInputs(prev => ({
      ...prev,
      [questionId]: {
        open: !prev[questionId]?.open,
        reason: prev[questionId]?.reason || '',
        description: prev[questionId]?.description || '',
        submitting: false
      }
    }));
  };

  const handleSubmitReport = async (questionId: string) => {
    if (!user) {
      addNotification({ title: 'Login necessário', message: 'Faça login para denunciar um comentário.', type: 'warning' });
      navigate('/login');
      return;
    }
    const q = qa.find(x => x._id === questionId);
    if (!q) return;
    if (String((user as any).id) === String(q.buyerId)) {
      addNotification({ title: 'Ação não permitida', message: 'Você não pode denunciar a própria pergunta.', type: 'warning' });
      return;
    }
    const current = reportInputs[questionId] || { open: true, reason: '', description: '' };
    const reason = (current.reason || '').trim();
    const description = (current.description || '').trim();
    if (!reason || !description) {
      addNotification({ title: 'Campos obrigatórios', message: 'Informe o motivo e a descrição da denúncia.', type: 'warning' });
      return;
    }
    setReportInputs(prev => ({ ...prev, [questionId]: { ...current, submitting: true } }));
    try {
      await qaService.reportQuestion(questionId, { reason: reason.slice(0, 200), description: description.slice(0, 2000) });
      addNotification({ title: 'Denúncia enviada', message: 'Sua denúncia foi registrada e será analisada.', type: 'success' });
      
      markUserReported(String(q.buyerId));
      setReportInputs(prev => ({ ...prev, [questionId]: { open: false, reason: '', description: '', submitting: false } }));
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || 'Falha ao enviar a denúncia. Tente novamente.';
      addNotification({ title: status === 409 ? 'Já denunciado' : 'Erro', message: msg, type: status === 409 ? 'warning' : 'error' });
      if (status === 409) {
        
        markUserReported(String(q.buyerId));
        setReportInputs(prev => ({ ...prev, [questionId]: { open: false, reason: '', description: '', submitting: false } }));
      } else {
        setReportInputs(prev => ({ ...prev, [questionId]: { ...current, submitting: false } }));
      }
    }
  };

  const markUserReported = (reportedId: string) => {
    if (!user) return;
    setReportedUsers(prev => {
      const next = { ...prev, [String(reportedId)]: true };
      try {
        const key = `qa_reported_users_${(user as any).id}`;
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  
  // Handler para favoritar/desfavoritar
  const handleToggleFavorite = () => {
    if (!item) return;
    
    if (isFavorite(item._id)) {
      removeFavorite(item._id);
      addNotification({
        title: 'Removido dos favoritos',
        message: `${item.title} foi removido dos seus favoritos`,
        type: 'info'
      });
    } else {
      addFavorite({
        _id: item._id,
        title: item.title,
        price: item.price,
        image: item.images?.[0] || item.image,
        category: item.category,
        seller: {
          name: item.seller?.name || 'Vendedor',
          rating: item.seller?.rating
        },
        addedAt: new Date().toISOString()
      });
      addNotification({
        title: 'Adicionado aos favoritos',
        message: `${item.title} foi adicionado aos seus favoritos`,
        type: 'success'
      });
    }
  };
  
  const handlePurchase = async () => {
    if (!user) {
      addNotification({
        title: 'Login necessário',
        message: 'Você precisa estar logado para comprar itens',
        type: 'warning'
      });
      navigate('/login');
      return;
    }
    
    if (!item) return;
    
    setPurchasing(true);
    try {
      
      const wallet = await (await import('../services')).walletService.getWallet(1, 1);
      const balance = wallet?.data?.balance ?? 0;
      if (Number(balance) < Number(item.price)) {
        addNotification({
          title: 'Saldo insuficiente',
          message: 'Seu saldo é insuficiente para esta compra. Faça um depósito para continuar.',
          type: 'error'
        });
        return;
      }
      
      navigate(`/buyitem?item=${encodeURIComponent(item._id)}`, { state: { item } });
    } catch (e) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível verificar seu saldo. Tente novamente.',
        type: 'error'
      });
    } finally {
      setPurchasing(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }
  
  if (error || !item) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-white mb-2">Erro ao carregar item</h3>
        <p className="text-gray-400 mb-4">{error || 'Item não encontrado'}</p>
        <button 
          onClick={() => navigate('/marketplace')} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Voltar para o Marketplace
        </button>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col"
    >
      {}
      <div className="bg-gray-800 relative overflow-hidden border-b border-gray-700 lg:rounded-xl lg:overflow-hidden lg:border lg:border-gray-700 lg:m-0">
        <AnimatePresence mode="wait">
          {selectedImage && !imageLoadError ? (
            <motion.img
              key={selectedImage}
              src={selectedImage}
              alt={item.title}
              className="w-full h-[60vw] max-h-[50vh] sm:h-[50vw] sm:max-h-[60vh] md:h-[420px] lg:h-[520px] object-cover bg-gray-900"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.6 }}
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <div className="w-full h-[60vw] max-h-[50vh] sm:h-[50vw] sm:max-h-[60vh] md:h-[420px] lg:h-[520px] bg-gradient-to-br from-gray-700 to-gray-800">
              <ImagePlaceholder className="w-full h-full" />
            </div>
          )}
        </AnimatePresence>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold shadow">Produto já vendido</span>
          </div>
        )}
      </div>
      
      {}
      {galleryImages.length > 1 && (
        <div className="flex justify-center gap-2 py-3 lg:py-0 lg:mt-4 px-3 sm:px-4 md:px-6 lg:px-0">
          {galleryImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentImageIndex === index
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75 w-2'
              }`}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        {}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/marketplace')} 
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o Marketplace
          </button>
        </div>
      
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        {}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6 order-2 lg:order-1">
          {}
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 order-3 lg:order-none">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Descrição</h3>
            <div className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">
              {item.description}
            </div>
          </div>
          
          {}
          {item.deliveryInstructions && (
            <div className="bg-gray-800 rounded-xl p-6 order-3 lg:order-none">
              <h3 className="text-xl font-bold text-white mb-4">Instruções de Entrega</h3>
              <div className="p-4 bg-gray-700/50 rounded-lg text-gray-300 whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">
                {item.deliveryInstructions}
              </div>
            </div>
          )}

          {}
          {hasAdditionalInfo && (
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 space-y-4 order-3 lg:order-none">
              <h3 className="text-lg sm:text-xl font-bold text-white">Informações do Serviço</h3>

              {detailRows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detailRows.map(({ label, value }) => (
                    <div key={label} className="p-3 bg-gray-900/30 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm text-white font-semibold break-words">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {attributeEntries.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Atributos informados</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {attributeEntries.map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-700/40 rounded-lg border border-gray-700/60">
                        <p className="text-xs text-gray-400 mb-1">{ATTRIBUTE_LABELS[key] || key}</p>
                        <p className="text-sm text-white font-medium break-words">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {normalizedTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {normalizedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs bg-purple-500/15 text-purple-200 border border-purple-500/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {}
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 order-3 lg:order-none">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  {qaHasNew && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Perguntas e Respostas</h3>
                <span className="text-xs text-gray-400">({qa.length})</span>
              </div>
            </div>

            {}
            {!isSellerOfItem ? (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Faça uma pergunta ao vendedor</label>
                <div className="flex gap-2">
                  <input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Digite sua pergunta..."
                    maxLength={5000}
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSubmitQuestion}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60"
                    disabled={!user || newQuestion.trim().length === 0 || dailyCount >= 5}
                  >
                    Enviar
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-400 text-right">{newQuestion.length}/5000</div>
                <div className="mt-1 text-xs text-gray-400">
                  Perguntas hoje: {Math.min(dailyCount, 5)}/5 {dailyCount >= 5 && <span className="text-red-400">- limite diário atingido</span>}
                </div>
                {!user && (
                  <p className="text-xs text-gray-400 mt-2">Você precisa estar logado para enviar perguntas.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">Somente compradores podem enviar perguntas. Você é o vendedor deste item.</p>
            )}

            {}
            {qaLoading ? (
              <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Carregando perguntas...</div>
            ) : qaError ? (
              <div className="text-red-400 text-sm">{qaError}</div>
            ) : qa.length === 0 ? (
              <div className="text-gray-400 text-sm">Nenhuma pergunta ainda. {isSellerOfItem ? 'Aguarde perguntas de compradores.' : 'Seja o primeiro a perguntar!'}</div>
            ) : (
              <div className="space-y-4">
                {qa.map((q) => (
                  <div key={q._id} className="bg-gray-700/40 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                        {q.buyerSnapshot?.avatar ? (
                          <img src={q.buyerSnapshot.avatar} alt={q.buyerSnapshot?.name || 'Comprador'} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-300" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-white text-sm font-medium truncate max-w-[50%]">{q.buyerSnapshot?.name || 'Comprador'}</span>
                          <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.status === 'answered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{q.status === 'answered' ? 'Respondida' : 'Pendente'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-200 text-sm whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden mb-2">{q.question}</div>
                    {user && String((user as any).id) !== String(q.buyerId) && (
                      <div className="mb-2">
                        {reportedUsers[String(q.buyerId)] ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-red-500/15 text-red-300 border border-red-500/30">
                            <Flag className="w-3.5 h-3.5" /> Já denunciado
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleReport(q._id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border transition
                              ${reportInputs[q._id]?.open ? 'border-gray-500 text-gray-300 hover:bg-gray-700/60' : 'border-red-500/40 text-red-300 hover:bg-red-500/10 hover:border-red-400'}`}
                          >
                            <Flag className="w-3.5 h-3.5" />
                            {reportInputs[q._id]?.open ? 'Cancelar denúncia' : 'Denunciar'}
                          </button>
                        )}
                      </div>
                    )}
                    {reportInputs[q._id]?.open && (
                      <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="grid grid-cols-1 gap-2">
                          <input
                            value={reportInputs[q._id]?.reason || ''}
                            onChange={(e) => setReportInputs(prev => ({ ...prev, [q._id]: { ...prev[q._id], open: true, reason: e.target.value.slice(0, 200), description: prev[q._id]?.description || '', submitting: prev[q._id]?.submitting } }))}
                            placeholder="Motivo (ex.: spam, ofensivo, conteúdo impróprio)"
                            maxLength={200}
                            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                          <textarea
                            value={reportInputs[q._id]?.description || ''}
                            onChange={(e) => setReportInputs(prev => ({ ...prev, [q._id]: { ...prev[q._id], open: true, reason: prev[q._id]?.reason || '', description: e.target.value.slice(0, 2000), submitting: prev[q._id]?.submitting } }))}
                            placeholder="Descreva o problema..."
                            maxLength={2000}
                            rows={3}
                            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleReport(q._id)}
                              className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                              disabled={!!reportInputs[q._id]?.submitting}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSubmitReport(q._id)}
                              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                              disabled={!!reportInputs[q._id]?.submitting}
                            >
                              {reportInputs[q._id]?.submitting ? 'Enviando...' : 'Enviar denúncia'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {q.status === 'answered' ? (
                      <div className="mt-3 pl-3 border-l-2 border-purple-500/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                            {q.sellerSnapshot?.avatar ? (
                              <img src={q.sellerSnapshot.avatar} alt={q.sellerSnapshot?.name || 'Vendedor'} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-gray-300" />
                            )}
                          </span>
                          <span className="text-white text-sm font-medium">{q.sellerSnapshot?.name || 'Vendedor'}</span>
                          {q.answeredAt && <span className="text-xs text-gray-400">{formatDate(q.answeredAt)}</span>}
                        </div>
                        <div className="text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">{q.answer}</div>
                      </div>
                    ) : (
                      isSellerOfItem ? (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-300 mb-1">Responder como vendedor</label>
                          <div className="flex gap-2">
                            <input
                              value={answerInputs[q._id] || ''}
                              onChange={(e) => setAnswerInputs(prev => ({ ...prev, [q._id]: e.target.value }))}
                              placeholder="Digite sua resposta..."
                              maxLength={5000}
                              className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                              onClick={() => handleSubmitAnswer(q._id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                              disabled={(answerInputs[q._id] || '').trim().length === 0}
                            >
                              Responder
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">Aguardando resposta do vendedor</div>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6 lg:sticky lg:top-6 self-start order-1 lg:order-2">
          {}
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 order-2 lg:order-none">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="px-2 sm:px-3 py-1 bg-purple-600/20 text-purple-400 text-xs sm:text-sm rounded-full flex-shrink-0">
                {item.category}
              </span>
              <span className="px-2 sm:px-3 py-1 bg-blue-600/20 text-blue-400 text-xs sm:text-sm rounded-full flex-shrink-0">
                {item.game}
              </span>
            </div>
            {item.detached && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold shadow">
                  <Star className="w-3 h-3" /> Patrocinado
                </span>
              </div>
            )}
            
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 leading-tight">{item.title}</h1>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 text-sm sm:text-base">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-white">{(Number(item.rating.average) || 0).toFixed(1)}</span>
              </div>
              <span className="text-gray-400">({item.rating.count} avaliações)</span>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{item.views} visualizações</span>
              </div>
            </div>
            
            <div className="mb-4 sm:mb-6">
              {pricingDetails?.original ? (
                <div className="text-lg text-gray-400 line-through">
                  {formatCurrency(pricingDetails.original)}
                </div>
              ) : null}
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {formatCurrency(pricingDetails?.price || item.price)}
              </div>
              {showSavingsHighlight && (
                <div className="mt-2 inline-flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-3 py-1.5 bg-green-600/10 text-green-300 border border-green-600/30 rounded-lg text-xs sm:text-sm">
                  <span className="font-semibold">{pricingDetails.percent}% OFF</span>
                  <span className="text-gray-300">Economia de {formatCurrency(pricingDetails.savings)}</span>
                </div>
              )}
            </div>
            {stockInfo.show && stockInfo.left > 0 && (
              <div className="mb-3 sm:mb-4">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-600/15 text-green-300 text-xs sm:text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Estoque disponível:<span className="text-white font-semibold">{stockInfo.left}</span>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3">
              {/* Botão Favoritar */}
              <motion.button
                onClick={handleToggleFavorite}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 sm:py-4 rounded-lg font-medium
                  transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
                  text-sm sm:text-base
                  ${isFavorite(item?._id || '') 
                    ? 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white focus:ring-pink-500' 
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 focus:ring-white/50'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={isFavorite(item?._id || '') ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <Heart 
                  className={`w-5 h-5 ${isFavorite(item?._id || '') ? 'fill-white' : ''}`} 
                />
      
              </motion.button>

              {/* Botão Comprar */}
              <motion.button 
                onClick={handlePurchase}
                disabled={purchasing || soldOut}
                className="
                  flex-1 py-3 sm:py-4 px-4 bg-gradient-to-r from-purple-600 to-blue-600 
                  text-white rounded-lg font-medium flex items-center justify-center gap-2
                  hover:from-purple-700 hover:to-blue-700 
                  transition-all duration-200
                  focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                  disabled:opacity-70 disabled:cursor-not-allowed
                  text-sm sm:text-base
                "
                whileHover={purchasing ? {} : { scale: 1.02 }}
                whileTap={purchasing ? {} : { scale: 0.98 }}
              >
              {purchasing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : soldOut ? (
                <>
                  Produto já vendido
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Comprar Agora
                </>
              )}
              </motion.button>
            </div>
          </div>
          
          {}
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Informações do Vendedor</h3>
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              {(() => {
                const sellerId = (item.seller as any)?._id ?? (item.seller as any)?.userid?.toString?.();
                if (!sellerId) {
                  return (
                    <div className="flex items-center gap-4 opacity-80" aria-label="Perfil do vendedor indisponível">
                      <span className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.seller?.avatar ? (
                          <img src={item.seller.avatar} alt={item.seller?.name || 'Vendedor'} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </span>
                      <span className="text-left">
                        <h4 className="text-sm sm:text-base text-white font-medium truncate">{item.seller?.name || 'Vendedor'}</h4>
                        <p className="text-gray-400 text-xs sm:text-sm">Membro desde {item.seller?.joinDate ? formatDate(item.seller.joinDate) : 'Data não disponível'}</p>
                      </span>
                    </div>
                  );
                }
                return (
                  <Link
                    to={`/users/${sellerId}`}
                    state={{ 
                      seller: {
                        _id: sellerId,
                        name: item.seller?.name || 'Vendedor',
                        avatar: item.seller?.avatar,
                        profilePicture: item.seller?.avatar,
                        joinDate: item.seller?.joinDate,
                        rating: item.seller?.rating,
                        totalSales: item.seller?.totalSales,
                        totalRatings: item.seller?.totalSales || 0
                      }
                    }}
                    className="flex items-center gap-4 group hover:opacity-90 transition focus:outline-none cursor-pointer"
                    aria-label="Abrir perfil do vendedor"
                  >
                <span className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden ring-0 group-hover:ring-2 group-hover:ring-purple-500 transition">
                  {item.seller?.avatar ? (
                    <img 
                      src={item.seller.avatar} 
                      alt={item.seller?.name || 'Vendedor'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </span>
                <span className="text-left">
                  <h4 className="text-white font-medium group-hover:text-purple-400 transition-colors">{item.seller?.name || 'Vendedor'}</h4>
                  <p className="text-gray-400 text-sm">Membro desde {item.seller?.joinDate ? formatDate(item.seller.joinDate) : 'Data não disponível'}</p>
                </span>
                  </Link>
                );
              })()}
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="text-gray-400 text-xs sm:text-sm mb-1">Avaliação</div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm sm:text-base text-white font-medium">
                    {sellerRating > 0 ? sellerRating.toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="text-gray-400 text-xs sm:text-sm mb-1">Vendas</div>
                <div className="text-sm sm:text-base text-white font-medium">{sellerTotalSales}</div>
              </div>
            </div>
          </div>
          
          {}
          <div className="bg-gray-800 rounded-xl p-6 order-4 lg:order-none">
            <div className="text-gray-400 text-sm">
              Publicado em {formatDate(item.createdAt)}
              {item.updatedAt !== item.createdAt && (
                <> • Atualizado em {formatDate(item.updatedAt)}</>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
      
      {}
      {relatedItems.length > 0 && (
        <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 mt-12 order-5 lg:order-none">
          <h2 className="text-2xl font-bold text-white mb-6">Itens Relacionados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {relatedItems.map((relatedItem) => (
              <div
                key={relatedItem._id}
                onClick={() => navigate(`/marketplace/${relatedItem._id}`)}
                className="
                  group bg-gray-800 rounded-xl overflow-hidden
                  hover:transform hover:scale-[1.02] transition-all duration-300
                  hover:shadow-2xl hover:shadow-purple-500/20
                  cursor-pointer
                "
              >
                <div className="relative h-44 sm:h-48 overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                  {relatedItem.image ? (
                    <img
                      src={relatedItem.image}
                      alt={relatedItem.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <ImagePlaceholder 
                    className="absolute inset-0" 
                    style={{ display: relatedItem.image ? 'none' : 'flex' }} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                      {relatedItem.game}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-200">
                    {relatedItem.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-white">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(Number(relatedItem.price) || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MarketplaceItemPage;