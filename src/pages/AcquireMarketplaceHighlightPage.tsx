import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePendingPayments } from '../hooks/usePendingPayments';
import { highlightService } from '../services/highlightService';
import PendingPaymentsAlert from '../components/PendingPaymentsAlert';
import { marketplaceService } from '../services/marketplaceService';
import ImagePlaceholder from '../components/ImagePlaceholder';
import { 
  Star, 
  Loader2, 
  Gamepad2, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  DollarSign,
  ShoppingCart,
  ArrowLeft,
  Info,
  Crown,
  Eye,
  Zap,
  Package
} from 'lucide-react';


interface MarketItem {
  _id: string;
  title: string;
  game: string;
  price: string;
  image: string;
  category: string;
  description: string;
  views: number;
  status: string;
  createdAt: string;
  detached?: boolean;
  highlightExpires?: string;
}

const AcquireMarketplaceHighlightPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { pendingPayments, checkAllPendingPayments } = usePendingPayments(user?.id);

  const [myItems, setMyItems] = useState<MarketItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const HIGHLIGHT_PRICE = 10.00;
  const HIGHLIGHT_DURATION_DAYS = 14;

  const fetchMyItems = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceService.getMyItems({ page: 1, limit: 1000 });
      if (res.success && res.data) {

        const activeItems = res.data.items.filter(
          (item: any) => item.status === 'active'
        ).map((item: any) => ({
          _id: item._id,
          title: item.title,
          game: item.game,
          price: typeof item.price === 'number' ? item.price.toString() : item.price,
          image: item.image || (item.images && item.images[0]) || '',
          images: item.images || [],
          category: item.category,
          description: item.description,
          status: item.status,
          views: item.views || 0,
          createdAt: item.createdAt,
          detached: item.detached,
          highlightExpires: item.highlightExpires
        }));
        setMyItems(activeItems);
      } else {
        setError(res.message || 'Não foi possível carregar seus itens');
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
    fetchMyItems();
  }, [user, navigate]);

  const handleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const isItemHighlighted = (item: MarketItem): boolean => {


    if (item.detached !== true) return false;
    if (!item.highlightExpires) return true;
    return new Date(item.highlightExpires) > new Date();
  };

  const getHighlightTimeRemaining = (item: MarketItem): string => {
    if (!item.highlightExpires) return '';
    
    const now = new Date();
    const expires = new Date(item.highlightExpires);
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
    return selectedItems.size * HIGHLIGHT_PRICE;
  };

  const handlePurchaseHighlight = async () => {
    if (selectedItems.size === 0) {
      addNotification({
        title: 'Seleção vazia',
        message: 'Selecione pelo menos um item para destacar.',
        type: 'warning'
      });
      return;
    }

    const selectedItemIds = Array.from(selectedItems);
                

    const selectedItemDetails = myItems.filter(item => selectedItems.has(item._id));
    
    setProcessing(true);
    try {
      const result = await highlightService.createMarketplaceHighlightPurchase({
        marketplaceItemIds: selectedItemIds,
        durationDays: 14
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
            navigate('/my-posts');
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

  const formatItemPrice = (price: string) => {
    const numPrice = parseFloat(price || '0');
    return formatPrice(numPrice);
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
              onClick={() => navigate('/my-posts')}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Destacar Itens do Marketplace
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Promova seus itens no topo do marketplace
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
                Seus itens aparecerão no topo do marketplace por {HIGHLIGHT_DURATION_DAYS} dias
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
                Apenas {formatPrice(HIGHLIGHT_PRICE)} por item destacado
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
                <h3 className="font-semibold text-blue-400">Mais Vendas</h3>
              </div>
              <p className="text-sm text-gray-300">
                Aumente suas chances de vender mais rapidamente
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
                  <li>• Apenas itens ativos podem ser destacados</li>
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
                <span className="text-gray-300">Carregando seus itens...</span>
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
                onClick={fetchMyItems}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tentar novamente
              </motion.button>
            </motion.div>
          ) : myItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Nenhum item encontrado</h3>
              <p className="text-gray-500 mb-4 text-sm">
                Você precisa ter itens ativos publicados para poder destacá-los.
              </p>
              <motion.button
                onClick={() => navigate('/post-service')}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all duration-200 text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Criar Item
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
                {myItems.map((item) => {
                  const isHighlighted = isItemHighlighted(item);
                  const isSelected = selectedItems.has(item._id);
                  const canSelect = !isHighlighted;

                  return (
                    <motion.div
                      key={item._id}
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
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <ImagePlaceholder className="absolute inset-0" style={{ display: item.image ? 'none' : 'flex' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {}
                        <div className="absolute top-2 left-2 flex items-center px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-gray-600/30">
                          <Gamepad2 className="w-3 h-3 mr-1" />
                          {item.game}
                        </div>

                        {}
                        <div className="absolute top-2 right-2 flex items-center px-2 py-0.5 bg-purple-600/80 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-purple-500/30">
                          {item.category}
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
                        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                          {item.title}
                        </h3>

                        {}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <span className="text-base font-bold text-green-400">
                              {formatItemPrice(item.price)}
                            </span>
                          </div>
                        </div>

                        {}
                        <div className="flex-1 mb-3">
                          <p className="text-gray-300 text-xs line-clamp-1 h-5 overflow-hidden">
                            {item.description}
                          </p>
                        </div>

                        {}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {item.views}
                            </div>
                          </div>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>

                        {}
                        {isHighlighted && getHighlightTimeRemaining(item) && (
                          <div className="flex items-center justify-center mb-3">
                            <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-green-900/20 border-green-700/30 text-green-400">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{getHighlightTimeRemaining(item)}</span>
                            </div>
                          </div>
                        )}

                        {}
                        <div className="flex items-center space-x-1.5 mt-auto">
                          {canSelect ? (
                            <motion.button
                              onClick={() => handleItemSelection(item._id)}
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
                {selectedItems.size > 0 && (
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
                              {selectedItems.size} item(s) selecionado(s)
                            </p>
                          </div>
                          <motion.button
                            onClick={() => setSelectedItems(new Set())}
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
                            <span className="font-medium text-white">{selectedItems.size}</span>
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
              {selectedItems.size > 0 && (
                <div className="h-64 md:hidden" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {}
      <PendingPaymentsAlert />
    </div>
  );
};

export default AcquireMarketplaceHighlightPage;
