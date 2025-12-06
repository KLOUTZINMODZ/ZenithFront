import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boostingService, highlightService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Star, 
  Loader2, 
  Target, 
  Gamepad2, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  DollarSign,
  Calendar,
  ShoppingCart,
  ArrowLeft,
  Info,
  Crown,
  Eye,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImagePlaceholder from '../components/ImagePlaceholder';

interface BoostingRequest {
  _id: string;
  currentRank: string;
  desiredRank: string;
  minPrice: number;
  game: string;
  accountImage: string;
  description: string;
  boostingCategory?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  views: number;
  createdAt: string;
  detached?: boolean;
  highlightExpires?: string;
}

interface HighlightPurchase {
  boostingId: string;
  highlightDuration: number;
  price: number;
}

const AcquireHighlightPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [myBoostings, setMyBoostings] = useState<BoostingRequest[]>([]);
  const [selectedBoostings, setSelectedBoostings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const HIGHLIGHT_PRICE = 10.00;
  const HIGHLIGHT_DURATION_DAYS = 14;

  const fetchMyBoostings = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await boostingService.getMyBoostingRequests({ page: 1, limit: 1000 });
      if (res.success && res.data) {

        const publishedBoostings = res.data.requests.filter(
          (boosting: BoostingRequest) => 
            boosting.status === 'open' || 
            boosting.status === 'in_progress' || 
            boosting.status === 'completed'
        );
        setMyBoostings(publishedBoostings);
      } else {
        setError(res.message || 'Não foi possível carregar seus boostings');
      }
    } catch (e) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMyBoostings();
  }, [user, navigate]);

  const handleBoostingSelection = (boostingId: string) => {
    const newSelection = new Set(selectedBoostings);
    if (newSelection.has(boostingId)) {
      newSelection.delete(boostingId);
    } else {
      newSelection.add(boostingId);
    }
    setSelectedBoostings(newSelection);
  };

  const isBoostingHighlighted = (boosting: BoostingRequest): boolean => {


    if (boosting.detached !== true) return false;
    if (!boosting.highlightExpires) return true;
    return new Date(boosting.highlightExpires) > new Date();
  };

  const getHighlightTimeRemaining = (boosting: BoostingRequest): string => {
    if (!boosting.highlightExpires) return '';
    
    const now = new Date();
    const expires = new Date(boosting.highlightExpires);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h restantes`;
    } else {
      return `${hours}h restantes`;
    }
  };

  const calculateTotalPrice = (): number => {
    return selectedBoostings.size * HIGHLIGHT_PRICE;
  };

  const handlePurchaseHighlight = async () => {
    if (selectedBoostings.size === 0) {
      addNotification({
        title: 'Seleção vazia',
        message: 'Selecione pelo menos um boosting para destacar.',
        type: 'warning'
      });
      return;
    }

    setProcessing(true);
    try {
      const result = await highlightService.createHighlightPurchase({
        boostingIds: Array.from(selectedBoostings)
      });
      
      if (result.success) {

        if (result.data.paymentUrl) {
          window.location.href = result.data.paymentUrl;
        } else {
          addNotification({
            title: 'Compra criada com sucesso!',
            message: 'Você será redirecionado para a página de pagamento.',
            type: 'success'
          });
          setTimeout(() => {
            navigate('/my-boostings');
          }, 1500);
        }
      } else {
        addNotification({
          title: 'Erro ao processar compra',
          message: result.message || 'Erro ao processar compra',
          type: 'error'
        });
      }
      
    } catch (error) {
      addNotification({
        title: 'Erro ao processar compra',
        message: 'Erro ao processar compra',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              onClick={() => navigate('/my-boostings')}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Adquirir Destaque
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Promova seus boostings no topo do marketplace
              </p>
            </div>
          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-4"
            >
              <div className="flex items-center mb-2">
                <Crown className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="font-semibold text-yellow-400">Destaque Premium</h3>
              </div>
              <p className="text-sm text-gray-300">
                Seus boostings aparecerão no topo do marketplace por {HIGHLIGHT_DURATION_DAYS} dias
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg p-4"
            >
              <div className="flex items-center mb-2">
                <DollarSign className="w-5 h-5 text-green-400 mr-2" />
                <h3 className="font-semibold text-green-400">Preço Fixo</h3>
              </div>
              <p className="text-sm text-gray-300">
                Apenas {formatPrice(HIGHLIGHT_PRICE)} por boosting destacado
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4"
            >
              <div className="flex items-center mb-2">
                <Zap className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="font-semibold text-blue-400">Mais Visibilidade</h3>
              </div>
              <p className="text-sm text-gray-300">
                Aumente suas chances de receber propostas rapidamente
              </p>
            </motion.div>
          </div>

          {}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start">
              <Info className="w-5 h-5 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-orange-400 mb-1">Informações Importantes</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• O destaque dura exatamente {HIGHLIGHT_DURATION_DAYS} dias</li>
                  <li>• Após esse período, o item volta para a posição normal automaticamente</li>
                  <li>• Você pode renovar o destaque a qualquer momento</li>
                  <li>• O pagamento é processado de forma segura via Mercado Pago</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                <span className="text-gray-300">Carregando seus boostings...</span>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-400 mb-2">Erro ao carregar</h3>
              <p className="text-gray-400 mb-4 text-sm">{error}</p>
              <motion.button
                onClick={fetchMyBoostings}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tentar novamente
              </motion.button>
            </motion.div>
          ) : myBoostings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Nenhum boosting encontrado</h3>
              <p className="text-gray-500 mb-4 text-sm">
                Você precisa ter boostings publicados para poder destacá-los.
              </p>
              <motion.button
                onClick={() => navigate('/post-boosting')}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all duration-200 text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Criar Boosting
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {myBoostings.map((boosting) => {
                  const isHighlighted = isBoostingHighlighted(boosting);
                  const isSelected = selectedBoostings.has(boosting._id);
                  const canSelect = !isHighlighted;

                  return (
                    <motion.div
                      key={boosting._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative bg-gray-800/50 backdrop-blur-sm rounded-lg border overflow-hidden transition-all duration-300 h-full flex flex-col ${
                        isSelected 
                          ? 'border-yellow-500/60 shadow-lg shadow-yellow-500/20' 
                          : isHighlighted
                          ? 'border-green-500/60 shadow-lg shadow-green-500/20'
                          : 'border-gray-700/50 hover:border-gray-600/50'
                      }`}
                      whileHover={{ y: canSelect ? -2 : 0 }}
                    >
                      {}
                      <div className="aspect-[4/3] bg-gradient-to-br from-gray-700 to-gray-800 relative overflow-hidden">
                        {boosting.accountImage ? (
                          <img
                            src={boosting.accountImage}
                            alt="Conta"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <ImagePlaceholder className="absolute inset-0" style={{ display: boosting.accountImage ? 'none' : 'flex' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {}
                        <div className="absolute top-2 left-2 flex items-center px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-gray-600/30">
                          <Gamepad2 className="w-3 h-3 mr-1" />
                          {boosting.game}
                        </div>

                        {}
                        {isHighlighted && (
                          <div className="absolute top-10 left-2 flex items-center px-2 py-0.5 bg-yellow-500/20 backdrop-blur-sm rounded-full text-[10px] font-semibold text-yellow-300 border border-yellow-500/30 shadow-sm">
                            <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1"></span>
                            Destacado
                          </div>
                        )}
                      </div>

                      {}
                      <div className="p-4 flex flex-col flex-1">
                        {}
                        <div className="flex items-center mb-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden mr-2">
                            {user?.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const parent = target.parentElement;
                                  if (parent) {
                                    target.style.display = 'none';
                                    const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = 'flex';
                                    }
                                  }
                                }}
                              />
                            ) : null}
                            <span className={`avatar-fallback text-white font-semibold text-xs ${user?.avatar ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                              {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-300 truncate">{user?.name || 'Meu Boosting'}</span>
                        </div>

                        {}
                        <div className="mb-3">
                          {boosting.currentRank && boosting.desiredRank ? (
                            <div className="flex items-center justify-center">
                              <div className="flex items-center space-x-3">
                                <div className="text-center">
                                  <p className="text-xs text-gray-400 mb-0.5">De</p>
                                  <p className="text-xs font-medium text-white">{boosting.currentRank}</p>
                                </div>
                                <div className="flex items-center justify-center">
                                  <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-blue-500"></div>
                                  <Target className="w-4 h-4 text-purple-400 mx-2" />
                                  <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-blue-500"></div>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-400 mb-0.5">Para</p>
                                  <p className="text-xs font-medium text-white">{boosting.desiredRank}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-xs text-gray-400 mb-1">Categoria</p>
                              <div className="flex items-center justify-center">
                                <Target className="w-4 h-4 text-purple-400 mr-2" />
                                <p className="text-sm font-medium text-white">{boosting.boostingCategory || 'Serviço Personalizado'}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <span className="text-base font-bold text-green-400">
                              {formatPrice(boosting.minPrice)}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">mín.</span>
                          </div>
                        </div>

                        {}
                        <div className="flex-1 mb-3">
                          <p className="text-gray-300 text-xs line-clamp-1 h-5 overflow-hidden">
                            {boosting.description}
                          </p>
                        </div>

                        {}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {boosting.views}
                            </div>
                          </div>
                          <span>{formatDate(boosting.createdAt)}</span>
                        </div>

                        {}
                        {isHighlighted && getHighlightTimeRemaining(boosting) && (
                          <div className="flex items-center justify-center mb-3">
                            <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-green-900/20 border-green-700/30 text-green-400">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{getHighlightTimeRemaining(boosting)}</span>
                            </div>
                          </div>
                        )}

                        {}
                        <div className="flex items-center space-x-1.5 mt-auto">
                          {canSelect ? (
                            <motion.button
                              onClick={() => handleBoostingSelection(boosting._id)}
                              className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300'
                                  : 'bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 text-gray-300'
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Selecionado
                                </>
                              ) : (
                                <>
                                  <Star className="w-3 h-3 mr-1" />
                                  Selecionar
                                </>
                              )}
                            </motion.button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center px-2 py-1.5 bg-green-600/20 border border-green-500/30 rounded-md text-green-300 text-xs font-medium">
                              <Crown className="w-3 h-3 mr-1" />
                              Já destacado
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {}
              <AnimatePresence mode="wait">
                {selectedBoostings.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 100, y: 50 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 100, y: 50 }}
                    className="fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:bottom-6 md:right-6 max-h-[90vh] md:max-h-[80vh]"
                  >
                    <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-none mx-0 md:w-80 lg:w-96 flex flex-col max-h-full">
                      {}
                      <div className="p-3 md:p-4 flex-shrink-0 border-b border-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base md:text-lg font-semibold text-white">
                              Resumo do Destaque
                            </h3>
                            <p className="text-xs md:text-sm text-gray-400">
                              {selectedBoostings.size} item(s) selecionado(s)
                            </p>
                          </div>
                          <motion.button
                            onClick={() => setSelectedBoostings(new Set())}
                            className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </motion.button>
                        </div>
                      </div>

                      {}
                      <div className="flex-1 overflow-y-auto p-3 md:p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Itens:</span>
                            <span className="font-medium text-white">{selectedBoostings.size}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Preço/item:</span>
                            <span className="font-medium text-white">{formatPrice(HIGHLIGHT_PRICE)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Duração:</span>
                            <span className="font-medium text-white">{HIGHLIGHT_DURATION_DAYS} dias</span>
                          </div>
                          <div className="border-t border-gray-600/30 pt-2 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-white">Total:</span>
                              <span className="text-lg font-bold text-yellow-400">{formatPrice(calculateTotalPrice())}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {}
                      <div className="p-3 md:p-4 pt-2 flex-shrink-0 border-t border-gray-700/30">
                        <motion.button
                          onClick={handlePurchaseHighlight}
                          disabled={processing}
                          className="w-full flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed text-sm"
                          whileHover={{ scale: processing ? 1 : 1.02 }}
                          whileTap={{ scale: processing ? 1 : 0.98 }}
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Comprar ({formatPrice(calculateTotalPrice())})
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {}
              {selectedBoostings.size > 0 && (
                <div className="h-64 md:hidden" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AcquireHighlightPage;
