import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Send, Zap, User, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import chatApi from '../services/chatApi';

interface BoostingInfo {
  _id: string;
  agreementId: string;
  game: string;
  currentRank?: string;
  desiredRank?: string;
  description: string;
  price: number;
  booster: {
    _id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
}

const RateBoostingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [boosting, setBoosting] = useState<BoostingInfo | null>(null);
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
    
    fetchBoostingInfo();
  }, [id, user]);

  const fetchBoostingInfo = async () => {
    if (!id) return;
    
    console.log('[RateBoostingPage] ID da URL:', id);
    setLoading(true);
    setError(null);
    
    try {
      // Primeiro, tenta buscar como agreementId (AGR_...)
      let response = await chatApi.get(`/api/agreements/${id}`).catch(() => null);
      console.log('[RateBoostingPage] Resposta de /api/agreements/', { success: response?.data?.success, _id: response?.data?.data?._id });
      
      // Se não encontrou, tenta buscar como orderNumber (BO_...) e depois obtém o agreement
      if (!response?.data?.success) {
        try {
          const orderResponse = await chatApi.get(`/api/boosting-orders/${id}`);
          if (orderResponse.data?.success && orderResponse.data?.data?.agreementId) {
            // Agora busca o agreement usando o agreementId do BoostingOrder
            response = await chatApi.get(`/api/agreements/${orderResponse.data.data.agreementId}`);
          }
        } catch (err) {
          console.error('Erro ao buscar BoostingOrder:', err);
        }
      }
      
      if (response?.data?.success && response.data.data) {
        const agreement = response.data.data;
        console.log('[RateBoostingPage] Agreement completo:', agreement);
        console.log('[RateBoostingPage] Booster data:', agreement.parties?.booster);
        
        if (agreement.parties?.client?.userid !== user?._id && agreement.parties?.client?.userid !== user?.id) {
          setError('Apenas o cliente pode avaliar este serviço');
          return;
        }

        // Extrai dados do booster com múltiplos fallbacks
        const boosterData = agreement.parties?.booster || {};
        const boosterId = boosterData.userid || boosterData._id || boosterData.id || '';
        const boosterName = boosterData.name || 'Booster';
        const boosterAvatar = boosterData.avatar || '';
        const boosterRating = boosterData.rating !== undefined ? boosterData.rating : undefined;

        console.log('[RateBoostingPage] Dados extraídos do booster:', { boosterId, boosterName, boosterAvatar, boosterRating });

        setBoosting({
          _id: agreement._id,
          agreementId: agreement.agreementId,
          game: agreement.proposalSnapshot?.game || '',
          currentRank: agreement.proposalSnapshot?.currentRank,
          desiredRank: agreement.proposalSnapshot?.desiredRank,
          description: agreement.proposalSnapshot?.description || '',
          price: agreement.proposalSnapshot?.price || agreement.price || 0,
          booster: {
            _id: boosterId,
            name: boosterName,
            avatar: boosterAvatar,
            rating: boosterRating
          }
        });
      } else {
        setError('Erro ao carregar informações do boosting');
      }
    } catch (err: any) {
      console.error('Erro ao buscar boosting:', err);
      setError(err?.response?.data?.message || 'Erro ao carregar boosting');
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

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 0 && trimmedComment.length < 5) {
      addNotification({
        type: 'warning',
        message: 'Comentário deve ter pelo menos 5 caracteres',
        title: 'Comentário Inválido'
      });
      return;
    }

    setSubmitting(true);

    try {
      console.log('Enviando avaliação para:', { id, rating, comment: trimmedComment });
      const response = await chatApi.post(`/api/ratings/boosting/${id}`, {
        rating,
        comment: trimmedComment
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

  if (error || !boosting) {
    return (
      <div className="bg-gray-900 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Erro</h3>
          <p className="text-gray-400 mb-6">{error || 'Boosting não encontrado'}</p>
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
            Avaliar Serviço de Boosting
          </h1>
          <p className="text-gray-400">Conte-nos sobre sua experiência</p>
        </div>

        {/* Layout em duas colunas para desktop, uma coluna para mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Coluna esquerda: Informações (1 coluna em desktop) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informações do Boosting */}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60 hover:border-purple-500/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-7 h-7 text-purple-400" />
                </div>
                
                <div className="flex-grow min-w-0">
                  <h3 className="text-base sm:text-lg font-bold mb-2">Boosting {boosting.game}</h3>
                  
                  {boosting.currentRank && boosting.desiredRank && boosting.currentRank !== 'N/A' && boosting.desiredRank !== 'N/A' ? (
                    <p className="text-gray-400 text-sm mb-3 font-medium">
                      <span className="text-purple-400">{boosting.currentRank}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-400">{boosting.desiredRank}</span>
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{boosting.description}</p>
                  )}
                  
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Valor:</span>
                      <span className="text-purple-400 font-bold">R$ {boosting.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ID:</span>
                      <span className="text-gray-300 font-mono text-xs">{boosting.agreementId.slice(-8)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do Booster */}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60 hover:border-purple-500/50 transition-colors">
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                Seu Booster
              </h3>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {boosting.booster.avatar && boosting.booster.avatar.trim() !== '' ? (
                    <img 
                      src={boosting.booster.avatar} 
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
                  <p className="font-semibold text-base truncate">{boosting.booster.name}</p>
                  {boosting.booster.rating !== undefined && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span className="font-medium">{boosting.booster.rating.toFixed(1)}</span>
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
                placeholder="Conte-nos sobre sua experiência com este booster..."
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all resize-none text-sm sm:text-base"
                rows={6}
                maxLength={500}
              />
              <div className="flex justify-end items-center mt-2">
                <p className={`text-xs sm:text-sm ${comment.length > 450 ? 'text-yellow-500' : 'text-gray-500'}`}>
                  {comment.length}/500
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

export default RateBoostingPage;
