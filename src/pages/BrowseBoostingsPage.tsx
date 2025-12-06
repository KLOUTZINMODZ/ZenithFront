import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { boostingService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Target, Gamepad2, Clock, AlertCircle, CheckCircle, Pause, MessageSquare, Search, Plus, Settings, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterModal, { type FilterModalValues } from '../components/filters/FilterModal';
import ImagePlaceholder from '../components/ImagePlaceholder';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

interface BoostingRequest {
  _id: string;
  currentRank: string;
  desiredRank: string;
  minPrice: number;
  game: string;
  accountImage: string;
  description: string;
  boostingCategory?: string;
  estimatedTime?: string;
  gameMode?: string;
  additionalInfo?: string;
  detached?: boolean;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  views: number;
  proposalsCount: number;
  hasUserProposal: boolean;
  isOwnRequest: boolean;
  expirationDate: string;
  client: {
    userid: number;
    name: string;
    avatar: string;
    isVerified: boolean;
    joinDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const BrowseBoostingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [allBoostings, setAllBoostings] = useState<BoostingRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 12, pages: 0 });
  const [status, setStatus] = useState<'open' | 'in_progress' | 'completed' | 'cancelled' | 'all'>('open');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  const fetchAllBoostings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      
      const res = await boostingService.getBoostingRequests({ page: 1, limit: 50 });
      if (res.success && res.data) {
        if (res.data.requests.length > 0) {
        }
        setAllBoostings(res.data.requests);
      } else {
        setError(res.message || 'Não foi possível carregar os boostings');
      }
    } catch (e) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAllBoostings();
    
    
    return () => {
      setAllBoostings([]);
    };
  }, [user, navigate, fetchAllBoostings]);


  const availableGames = useMemo(() => {
    const gameSet = new Set<string>();
    allBoostings.forEach((boosting: BoostingRequest) => {
      if (boosting.game) {
        gameSet.add(boosting.game);
      }
    });
    return ['all', ...Array.from(gameSet)];
  }, [allBoostings]);

  const filteredBoostings = useMemo(() => {
    let filtered = allBoostings;

    if (status !== 'all') {
      filtered = filtered.filter((boosting: BoostingRequest) => boosting.status === status);
    }

    if (gameFilter !== 'all') {
      filtered = filtered.filter((boosting: BoostingRequest) => boosting.game === gameFilter);
    }

    return filtered;
  }, [allBoostings, status, gameFilter]);

  const paginatedBoostings = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredBoostings.slice(startIndex, endIndex);
  }, [filteredBoostings, pagination.page, pagination.limit]);

  useEffect(() => {
    setPagination((prev: Pagination) => ({
      ...prev,
      total: filteredBoostings.length,
      pages: Math.ceil(filteredBoostings.length / prev.limit),
      page: 1
    }));
  }, [filteredBoostings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-400 bg-green-900/20 border-green-700/30';
      case 'in_progress': return 'text-blue-400 bg-blue-900/20 border-blue-700/30';
      case 'completed': return 'text-purple-400 bg-purple-900/20 border-purple-700/30';
      case 'cancelled': return 'text-red-400 bg-red-900/20 border-red-700/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Target className="w-3 h-3" />;
      case 'in_progress': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <AlertCircle className="w-3 h-3" />;
      default: return <Pause className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto';
      case 'in_progress': return 'Em Progresso';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const formatPrice = useCallback((price: number) => {
    return currencyFormatter.format(price);
  }, []);

  const getTimeRemaining = (expirationDate: string) => {
    const now = new Date();
    const expiration = new Date(expirationDate);
    const diffMs = expiration.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { text: 'Expirado', color: 'text-red-400', isExpired: true };
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      const color = days <= 2 ? 'text-orange-400' : 'text-green-400';
      return { 
        text: `${days}d ${hours}h restantes`, 
        color, 
        isExpired: false 
      };
    } else if (hours > 0) {
      const color = hours <= 6 ? 'text-red-400' : 'text-orange-400';
      return { 
        text: `${hours}h restantes`, 
        color, 
        isExpired: false 
      };
    } else {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return { 
        text: `${minutes}min restantes`, 
        color: 'text-red-400', 
        isExpired: false 
      };
    }
  };

  const handleViewDetails = useCallback((boostingId: string) => {
    navigate(`/boosting/${boostingId}/proposals`);
  }, [navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Seja Um Booster
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Encontre pedidos de boosting disponíveis para contratação
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                onClick={() => navigate('/notifications/preferences')}
                className="flex items-center px-4 py-2 bg-gray-800/60 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-700 focus:ring-2 focus:ring-purple-500/30 border border-gray-700/50 shadow"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Preferências
              </motion.button>
              <motion.button
                onClick={() => navigate('/post-boosting')}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500/50 shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Postar Boosting
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-400">{filteredBoostings.length} resultados</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsFilterOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </motion.button>
          </div>

          <FilterModal
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            initial={{ game: gameFilter, status }}
            games={availableGames}
            statuses={['all', 'open', 'in_progress', 'completed', 'cancelled']}
            showGame={true}
            showStatus={true}
            showCategory={false}
            showSort={false}
            onApply={(values: FilterModalValues) => {
              setGameFilter(values.game ?? 'all');
              setStatus((values.status as any) ?? 'all');
              setPagination((prev: Pagination) => ({ ...prev, page: 1 }));
              setIsFilterOpen(false);
            }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-gray-300">Carregando boostings disponíveis...</span>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-400 mb-2">Erro ao carregar</h3>
              <p className="text-gray-400 mb-3 text-sm">{error}</p>
              <motion.button
                onClick={() => fetchAllBoostings()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tentar novamente
              </motion.button>
            </motion.div>
          ) : allBoostings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Nenhum boosting encontrado</h3>
              <p className="text-gray-500 mb-4 text-sm">
                {status === 'all' 
                  ? 'Não há pedidos de boosting disponíveis no momento.'
                  : `Não há boostings com status "${getStatusText(status)}".`
                }
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {paginatedBoostings.map((boosting: BoostingRequest) => {
                const timeRemaining = (boosting.status === 'open' && boosting.expirationDate)
                  ? getTimeRemaining(boosting.expirationDate)
                  : null;

                return (
                  <motion.div
                    key={boosting._id}
                    variants={itemVariants}
                    layout
                    className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden hover:shadow-purple-500/20 hover:shadow-2xl hover:border-purple-500/30 transition-all duration-300 group flex flex-col h-full cursor-pointer"
                    whileHover={{ 
                      y: -8,
                      scale: 1.03
                    }}
                    onClick={() => handleViewDetails(boosting._id)}
                  >
                    <div className="relative">
                      <div className="aspect-[4/3] bg-gradient-to-br from-gray-700 to-gray-800 relative overflow-hidden">
                        {boosting.accountImage ? (
                          <img
                            src={boosting.accountImage}
                            alt="Conta"
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <ImagePlaceholder className="absolute inset-0" style={{ display: boosting.accountImage ? 'none' : 'flex' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                      
                      <div className={`absolute top-2 right-2 flex items-center px-2 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm ${getStatusColor(boosting.status)}`}>
                        {getStatusIcon(boosting.status)}
                        <span className="ml-1">{getStatusText(boosting.status)}</span>
                      </div>

                      <div className="absolute top-2 left-2 flex items-center px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-gray-600/30">
                        <Gamepad2 className="w-3 h-3 mr-1" />
                        {boosting.game}
                      </div>

                      {boosting.detached && (
                        <div className="absolute top-10 left-2 flex items-center px-2 py-0.5 bg-yellow-500/20 backdrop-blur-sm rounded-full text-[10px] font-semibold text-yellow-300 border border-yellow-500/30 shadow-sm">
                          <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1"></span>
                          Patrocinado
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      {timeRemaining && (
                        <div className="flex items-center justify-center mb-3">
                          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                            timeRemaining.isExpired 
                              ? 'bg-red-900/20 border-red-700/30 text-red-400'
                              : timeRemaining.color === 'text-red-400'
                              ? 'bg-red-900/20 border-red-700/30 text-red-400'
                              : timeRemaining.color === 'text-orange-400'
                              ? 'bg-orange-900/20 border-orange-700/30 text-orange-400'
                              : 'bg-green-900/20 border-green-700/30 text-green-400'
                          }`}>
                            <Clock className="w-3 h-3 mr-1" />
                            <span className={timeRemaining.color}>
                              {timeRemaining.text}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden mr-2">
                          {boosting.client.avatar ? (
                            <img
                              src={boosting.client.avatar}
                              alt={boosting.client.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
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
                          <span className={`avatar-fallback text-white font-semibold text-xs ${boosting.client.avatar ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                            {boosting.client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-300 truncate">{boosting.client.name}</span>
                        {boosting.client.isVerified && (
                          <CheckCircle className="w-3 h-3 text-blue-400 ml-1" />
                        )}
                      </div>

                      <div className="mb-3">
                        {boosting.currentRank && boosting.desiredRank ? (
                          <div className="flex items-center justify-center">
                            <div className="flex items-center space-x-3">
                              <div className="text-center">
                                <p className="text-xs text-gray-400 mb-0.5">De</p>
                                <p className="text-xs font-medium text-white group-hover:text-purple-300 transition-colors duration-300">{boosting.currentRank}</p>
                              </div>
                              <div className="flex items-center justify-center">
                                <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-blue-500"></div>
                                <Target className="w-4 h-4 text-purple-400 mx-2" />
                                <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-blue-500"></div>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-400 mb-0.5">Para</p>
                                <p className="text-xs font-medium text-white group-hover:text-purple-300 transition-colors duration-300">{boosting.desiredRank}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">Categoria</p>
                            <div className="flex items-center justify-center">
                              <Target className="w-4 h-4 text-purple-400 mr-2" />
                              <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors duration-300">{boosting.boostingCategory || 'Serviço Personalizado'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-base font-bold text-green-400">
                            {formatPrice(boosting.minPrice)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">mín.</span>
                        </div>
                      </div>

                      <div className="flex-1 mb-3">
                        <p className="text-gray-300 text-xs line-clamp-1 h-5 overflow-hidden">
                          {boosting.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {boosting.proposalsCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mt-6"
        >
          <div className="flex items-center space-x-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <motion.button
                key={page}
                onClick={() => setPagination((prev: Pagination) => ({ ...prev, page }))}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
                  pagination.page === page
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {page}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BrowseBoostingsPage;
