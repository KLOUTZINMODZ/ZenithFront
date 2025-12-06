import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Send, ShoppingBag, User, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import chatApi from '../services/chatApi';

interface PurchaseInfo {
  _id: string;
  orderNumber: string;
  status: string;
  price: number;
  createdAt: string;
  item: {
    _id: string;
    title: string;
    image?: string;
  };
  seller: {
    _id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
}

const RateMarketplacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!id) return;
    
    fetchPurchaseInfo();
  }, [id, user]);

  const fetchPurchaseInfo = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatApi.get(`/api/purchases/${id}`);
      
      if (response.data.success && response.data.data) {
        const p = response.data.data;
        
        
        const userId = user?._id || user?.id;
        if (p.buyerId !== userId && p.buyerId !== String(userId)) {
          setError('Apenas o comprador pode avaliar esta compra');
          return;
        }

        
        if (p.status !== 'completed') {
          setError('A compra precisa estar concluída para avaliação');
          return;
        }

        setPurchase({
          _id: p._id || p.purchaseId,
          orderNumber: p.orderNumber,
          status: p.status,
          price: p.price,
          createdAt: p.createdAt,
          item: {
            _id: p.item._id,
            title: p.item.title,
            image: p.item.image
          },
          seller: {
            _id: p.seller._id,
            name: p.seller.name,
            avatar: p.seller.avatar,
            rating: p.seller.rating
          }
        });
      } else {
        setError(response.data.message || 'Erro ao carregar informações da compra');
      }
    } catch (err: any) {
      console.error('Erro ao buscar compra:', err);
      setError(err?.response?.data?.message || 'Erro ao carregar compra');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      addNotification({
        type: 'warning',
        message: 'Por favor, selecione uma avaliação',
        title: 'Avaliação Incompleta'
      });
      return;
    }


    setSubmitting(true);

    try {
      const response = await chatApi.post(`/api/ratings`, {
        purchaseId: id,
        rating,
        comment: comment.trim() || null
      });

      if (response.data.success) {
        addNotification({
          type: 'success',
          message: 'Avaliação enviada com sucesso!',
          title: 'Sucesso'
        });
        
        navigate('/purchases');
      } else {
        addNotification({
          type: 'error',
          message: response.data.message || 'Erro ao enviar avaliação',
          title: 'Erro'
        });
      }
    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err);
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Erro ao enviar avaliação',
        title: 'Erro'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return 'Muito Insatisfeito';
      case 2: return 'Insatisfeito';
      case 3: return 'Neutro';
      case 4: return 'Satisfeito';
      case 5: return 'Muito Satisfeito';
      default: return 'Selecione uma avaliação';
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
          <h3 className="text-xl font-bold text-white mb-2">Erro</h3>
          <p className="text-gray-400 mb-6">{error || 'Compra não encontrada'}</p>
          <button
            onClick={() => navigate('/purchases')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-900 text-white"
    >
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-yellow-500" />
            Avaliar Compra
          </h1>
          <p className="text-gray-400">Como foi sua experiência com esta compra?</p>
        </div>

        {/* Layout em duas colunas para desktop, uma coluna para mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Coluna esquerda: Informações (1 coluna em desktop) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informações do Produto */}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60 hover:border-purple-500/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                  {purchase.item.image ? (
                    <img 
                      src={purchase.item.image} 
                      alt={purchase.item.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <ShoppingBag className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                </div>
                
                <div className="flex-grow min-w-0">
                  <h3 className="text-base sm:text-lg font-bold mb-2 line-clamp-2">{purchase.item.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-3">{formatDate(purchase.createdAt)}</p>
                  
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Valor:</span>
                      <span className="text-green-400 font-bold">R$ {purchase.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Pedido:</span>
                      <span className="text-gray-300 font-mono text-xs">{purchase.orderNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do Vendedor */}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60 hover:border-purple-500/50 transition-colors">
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                Vendedor
              </h3>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {purchase.seller.avatar && purchase.seller.avatar.trim() !== '' ? (
                    <img 
                      src={purchase.seller.avatar} 
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-white"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                        }
                      }}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-base truncate">{purchase.seller.name}</p>
                  {purchase.seller.rating !== undefined && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span className="font-medium">{purchase.seller.rating.toFixed(1)}</span>
                      <span className="text-gray-500 text-xs">(avaliação)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna direita: Formulário de avaliação (2 colunas em desktop) */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-gray-800/60 rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-700/60 h-fit">
            {/* Seção de Estrelas */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-base sm:text-lg font-bold mb-4">
                Como foi sua experiência?
              </label>
              
              <div className="flex flex-col items-center gap-6">
                <div className="flex gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-all hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-500 fill-yellow-500 drop-shadow-lg'
                            : 'text-gray-600 hover:text-gray-500'
                        } transition-all`}
                      />
                    </button>
                  ))}
                </div>
                
                <div className="text-center">
                  <p className={`text-base sm:text-lg font-bold transition-colors ${
                    rating > 0 ? 'text-purple-400' : 'text-gray-500'
                  }`}>
                    {getRatingText(hoverRating || rating)}
                  </p>
                  {rating > 0 && (
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">
                      {rating === 5 && '🎉 Excelente! Que alegria!'}
                      {rating === 4 && '😊 Muito bom! Obrigado!'}
                      {rating === 3 && '😐 Esperávamos mais'}
                      {rating === 2 && '😞 Poderia melhorar'}
                      {rating === 1 && '😢 Desculpe ouvir isso'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção de Comentário */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="comment" className="block text-base sm:text-lg font-bold mb-3">
                Comentário
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Compartilhe os detalhes da sua experiência..."
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all resize-none text-sm sm:text-base"
                rows={6}
                maxLength={1500}
              />
              <div className="flex justify-end items-center mt-2">
                <p className={`text-xs sm:text-sm ${comment.length > 1350 ? 'text-yellow-500' : 'text-gray-500'}`}>
                  {comment.length}/1500
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700/50">
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Avaliação
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default RateMarketplacePage;
