import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useMarketplaceHighlights } from '../hooks/useMarketplaceHighlights';
import { 
  Crown,
  Calendar,
  Eye,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Filter,
  Timer,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketplaceHighlight {
  _id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  description: string;
  detached: boolean;
  highlightExpires: string | null;
  views: number;
  status: string;
  createdAt: string;
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
    isExpired: boolean;
    formattedString: string;
  } | null;
  isHighlighted: boolean;
}


const MarketplaceHighlightsControlPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [filter, setFilter] = React.useState<'all' | 'active' | 'expired'>('all');
  const [refreshing, setRefreshing] = React.useState(false);
  
  const {
    highlights,
    loading,
    error,
    pagination,
    refreshHighlights,
    changePage,
    changeStatus,
  } = useMarketplaceHighlights({
    status: filter,
    autoRefresh: true,
    refreshInterval: 30000
  });


  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshHighlights();
    setRefreshing(false);
    
    addNotification({
      title: 'Lista atualizada',
      message: 'Dados dos destaques foram atualizados',
      type: 'success'
    });
  };


  const handleFilterChange = async (newFilter: 'all' | 'active' | 'expired') => {
    setFilter(newFilter);
    await changeStatus(newFilter);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };


  const getStatusText = (highlight: MarketplaceHighlight) => {
    if (!highlight.isHighlighted) return 'Expirado';
    if (highlight.timeRemaining?.isExpired) return 'Expirado';
    return 'Ativo';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (

            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              
              <button
                onClick={() => navigate('/acquire-marketplace-highlight')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Zap className="w-4 h-4 mr-2" />
                Comprar Destaques
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => handleFilterChange('active')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => handleFilterChange('expired')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === 'expired'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Expirados
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Total: {pagination.total} itens
            </div>
          </div>
        </div>

        {}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Carregando destaques...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </button>
          </div>
        ) : highlights.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum destaque encontrado</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'active' 
                ? 'Você não possui destaques ativos no momento.'
                : filter === 'expired'
                ? 'Nenhum destaque expirado encontrado.'
                : 'Você ainda não possui destaques do marketplace.'
              }
            </p>
            <button
              onClick={() => navigate('/acquire-marketplace-highlight')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Comprar Primeiro Destaque
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {highlights.map((highlight) => (
                <motion.div
                  key={highlight._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                          {highlight.image ? (
                            <img 
                              src={highlight.image} 
                              alt={highlight.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {highlight.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {highlight.category}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-1" />
                                {highlight.views} visualizações
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(highlight.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-2">
                            <div className="text-lg font-bold text-gray-900">
                              {formatPrice(highlight.price)}
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              highlight.isHighlighted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-1 ${
                                highlight.isHighlighted ? 'bg-green-400' : 'bg-red-400'
                              }`} />
                              {getStatusText(highlight)}
                            </div>
                          </div>
                        </div>

                        {}
                        {highlight.isHighlighted && highlight.timeRemaining && !highlight.timeRemaining.isExpired && (
                          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Timer className="w-5 h-5 text-orange-600 mr-2" />
                                <span className="text-sm font-medium text-orange-800">
                                  Tempo restante:
                                </span>
                              </div>
                              <div className="text-lg font-bold text-orange-900">
                                {highlight.timeRemaining.formattedString}
                              </div>
                            </div>
                            
                            {}
                            {highlight.highlightExpires && (
                              <div className="mt-2">
                                {(() => {
                                  const total = 14 * 24 * 60 * 60 * 1000;
                                  const remaining = new Date(highlight.highlightExpires).getTime() - new Date().getTime();
                                  const percentage = Math.max(0, (remaining / total) * 100);
                                  
                                  return (
                                    <div className="w-full bg-orange-200 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {}
                        {(!highlight.isHighlighted || (highlight.timeRemaining?.isExpired)) && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center">
                              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                              <span className="text-sm text-red-800">
                                Este destaque expirou e o item voltou ao status normal
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => changePage(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => changePage(Math.min(pagination.pages, pagination.page + 1))}
                    disabled={pagination.page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{((pagination.page - 1) * 10) + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(pagination.page * 10, pagination.total)}</span> de{' '}
                      <span className="font-medium">{pagination.total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => changePage(Math.max(1, pagination.page - 1))}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {}
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => changePage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === pageNum
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => changePage(Math.min(pagination.pages, pagination.page + 1))}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Próxima</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceHighlightsControlPage;
