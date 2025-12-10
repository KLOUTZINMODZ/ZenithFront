import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { boostingService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Search, Plus, Eye, Trash2, Target, Clock, CheckCircle, AlertCircle, Pause, Gamepad2, Loader2, MessageSquare, Filter } from 'lucide-react';
import translateCategoryLabel from '../utils/categoryTranslations';
import { motion, AnimatePresence } from 'framer-motion';
import FilterModal from '../components/filters/FilterModal';
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
  estimatedTime?: string;
  gameMode?: string;
  additionalInfo?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  views: number;
  proposalsCount: number;
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

const MyBoostingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [allBoostings, setAllBoostings] = useState<BoostingRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [status, setStatus] = useState<'open' | 'in_progress' | 'completed' | 'cancelled' | 'all'>('all');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boostingToDelete, setBoostingToDelete] = useState<BoostingRequest | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


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

  const fetchAllMyBoostings = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {

      const res = await boostingService.getMyBoostingRequests({ page: 1, limit: 1000 });
      if (res.success && res.data) {
        setAllBoostings(res.data.requests);
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
    fetchAllMyBoostings();
  }, [user, navigate]);


  const canDeleteBoosting = (boosting: BoostingRequest): boolean => {


    if (boosting.status === 'in_progress' || boosting.status === 'completed') {
      return false;
    }
    

    if (boosting.status !== 'open') {
      return false;
    }
    
    return true;
  };


  const handleDeleteBoosting = async (boosting: BoostingRequest) => {
    if (!canDeleteBoosting(boosting)) {
      addNotification({
        title: 'Não é possível excluir',
        message: 'Este boosting não pode ser excluído pois possui proposta aceita ou está em andamento.',
        type: 'error'
      });
      return;
    }


    setBoostingToDelete(boosting);
    setShowDeleteModal(true);
  };


  const confirmDeleteBoosting = async () => {
    if (!boostingToDelete) return;

    setDeletingId(boostingToDelete._id);
    
    try {
      const response = await boostingService.deleteBoostingRequest(boostingToDelete._id);
      
      if (response.success) {

        

        setAllBoostings(prev => prev.filter(b => b._id !== boostingToDelete._id));
        

        setShowDeleteModal(false);
        setBoostingToDelete(null);
      } else {
        addNotification({
          title: 'Erro',
          message: response.message || 'Não foi possível excluir o boosting',
          type: 'error'
        });
      }
    } catch (error) {
            addNotification({
        title: 'Erro',
        message: 'Erro interno. Tente novamente.',
        type: 'error'
      });
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
      setBoostingToDelete(null);
    }
  };


  const availableGames = React.useMemo(() => {
    const gameSet = new Set<string>();
    allBoostings.forEach(boosting => {
      if (boosting.game) {
        gameSet.add(boosting.game);
      }
    });
    return ['all', ...Array.from(gameSet)];
  }, [allBoostings]);


  const filteredBoostings = React.useMemo(() => {
    let filtered = allBoostings;
    

    if (status !== 'all') {
      filtered = filtered.filter(boosting => boosting.status === status);
    }
    

    if (gameFilter !== 'all') {
      filtered = filtered.filter(boosting => boosting.game === gameFilter);
    }
    
    return filtered;
  }, [allBoostings, status, gameFilter]);


  const paginatedBoostings = React.useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredBoostings.slice(startIndex, endIndex);
  }, [filteredBoostings, pagination.page, pagination.limit]);


  useEffect(() => {
    setPagination(prev => ({
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
      case 'open': return <Target className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Pause className="w-4 h-4" />;
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const translateBoostingCategory = (value?: string | null) => translateCategoryLabel(value, 'Serviço Personalizado');

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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -top-16 -right-6 h-40 w-40 bg-purple-500/50 blur-[90px]" />
              <div className="absolute -bottom-12 -left-10 h-32 w-32 bg-blue-500/40 blur-[70px]" />
            </div>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/80">
                  <Target className="w-3.5 h-3.5 text-yellow-300" />
                  meus boostings
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Gamepad2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white">
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-purple-50 to-blue-200">
                        Meus Boostings
                      </span>
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-white/70">
                      Gerencie seus pedidos de boosting e acompanhe o progresso.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 text-sm text-white/80 w-full max-w-xs">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Boostings ativos</p>
                  <p className="text-lg font-semibold text-white">{filteredBoostings.length} resultados</p>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                  <Clock className="w-4 h-4" />
                  Acompanhe em tempo real
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/post-boosting"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Novo Boosting</span>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsFilterOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filtros</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {}
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
          onApply={(values) => {
            setGameFilter(values.game ?? 'all');
            setStatus((values.status as any) ?? 'all');
            setPagination((prev) => ({ ...prev, page: 1 }));
            setIsFilterOpen(false);
          }}
        />

        {}
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
              <p className="text-gray-400 mb-3 text-sm">{error}</p>
              <motion.button
                onClick={() => fetchAllMyBoostings()}
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
              className="text-center py-12"
            >
              <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Nenhum boosting encontrado</h3>
              <p className="text-gray-500 mb-4 text-sm">
                {status === 'all' 
                  ? 'Você ainda não criou nenhum pedido de boosting.'
                  : `Você não tem boostings com status "${getStatusText(status)}".`
                }
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/post-boosting"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all duration-200 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Boosting
                </Link>
              </motion.div>
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
              {paginatedBoostings.map((boosting) => (
                <motion.div
                  key={boosting._id}
                  variants={itemVariants}
                  layout
                  className="group relative bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden shadow-2xl hover:shadow-purple-500/20 hover:shadow-2xl hover:border-purple-500/30 transition-all duration-300"
                  whileHover={{ 
                    y: -8,
                    scale: 1.03
                  }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                >
                  {}
                  <div className="relative">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-700 to-gray-800 relative overflow-hidden">
                      {}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent z-10 pointer-events-none" />
                      
                      {boosting.accountImage ? (
                        <img
                          src={boosting.accountImage}
                          alt="Conta"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <ImagePlaceholder className="absolute inset-0" style={{ display: boosting.accountImage ? 'none' : 'flex' }} />
                    </div>
                    
                    {}
                    <motion.div 
                      className={`absolute top-3 right-3 z-20 flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md shadow-lg ${getStatusColor(boosting.status)}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {getStatusIcon(boosting.status)}
                      <span className="ml-1.5">{getStatusText(boosting.status)}</span>
                    </motion.div>

                    {}
                    <motion.div 
                      className="absolute top-3 left-3 z-20 flex items-center px-3 py-1.5 bg-gray-900/90 backdrop-blur-md rounded-full text-xs font-medium text-gray-200 border border-gray-700/50 shadow-lg"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />
                      {boosting.game}
                    </motion.div>
                  </div>

                  {}
                  <div className="p-5">
                    {}
                    <div className="mb-4">
                      {boosting.currentRank && boosting.desiredRank ? (

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-400 mb-0.5">De</p>
                              <p className="text-xs font-medium text-white group-hover:text-purple-300 transition-colors duration-300">{boosting.currentRank}</p>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
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
                            <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors duration-300">{translateBoostingCategory(boosting.boostingCategory)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium mb-1">Preço Mínimo</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                            {formatPrice(boosting.minPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {}
                    <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                      {boosting.description}
                    </p>

                    {}
                    <div className="flex items-center justify-between text-xs mb-4">
                      <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-gray-700/30">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-gray-300 font-medium">{boosting.proposalsCount || 0} propostas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></div>
                        <span className="text-xs">{formatDate(boosting.createdAt).split(',')[0]}</span>
                      </div>
                    </div>

                    {}
                    <div className="flex items-center gap-2">
                      <motion.button
                        className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-lg text-white text-sm font-semibold transition-all duration-300 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigate(`/boosting/${boosting._id}/proposals`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </motion.button>
                      

                      <motion.button
                        className={`p-2.5 border rounded-lg transition-all duration-300 shadow-lg ${
                          !canDeleteBoosting(boosting) || deletingId === boosting._id
                            ? 'bg-gray-600/20 border-gray-500/30 text-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 border-red-500/30 text-white cursor-pointer shadow-red-500/50 hover:shadow-red-500/70'
                        }`}
                        whileHover={canDeleteBoosting(boosting) && deletingId !== boosting._id ? { scale: 1.1 } : {}}
                        whileTap={canDeleteBoosting(boosting) && deletingId !== boosting._id ? { scale: 0.95 } : {}}
                        onClick={() => handleDeleteBoosting(boosting)}
                        disabled={!canDeleteBoosting(boosting) || deletingId === boosting._id}
                        title={
                          deletingId === boosting._id
                            ? 'Excluindo...'
                            : !canDeleteBoosting(boosting) 
                            ? 'Não é possível excluir boosting com proposta aceita ou em andamento'
                            : 'Excluir boosting'
                        }
                      >
                        {deletingId === boosting._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {}
        {pagination.pages > 1 && (
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
                  onClick={() => setPagination(prev => ({ ...prev, page }))}
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
        )}

        {}
        <AnimatePresence mode="wait">
          {showDeleteModal && boostingToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ 
                  type: "spring", 
                  damping: 25, 
                  stiffness: 300,
                  duration: 0.3 
                }}
                className="bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                
                <h3 className="text-xl font-semibold text-white text-center mb-2">
                  Confirmar Exclusão
                </h3>
                
                <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  Tem certeza que deseja excluir o boosting de{' '}
                  <span className="font-semibold text-white">{boostingToDelete.game}</span>{' '}
                  {boostingToDelete.currentRank && boostingToDelete.desiredRank ? (
                    <>de <span className="font-semibold text-purple-400">{boostingToDelete.currentRank}</span>{' '}
                    para <span className="font-semibold text-purple-400">{boostingToDelete.desiredRank}</span></>
                  ) : boostingToDelete.boostingCategory ? (
                    <>categoria <span className="font-semibold text-purple-400">{translateBoostingCategory(boostingToDelete.boostingCategory)}</span></>
                  ) : null}?
                  <br />
                  <span className="text-sm text-gray-400 mt-2 block">
                    Esta ação não pode ser desfeita.
                  </span>
                </p>

                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 text-gray-300 rounded-xl font-medium transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancelar
                  </motion.button>
                  
                  <motion.button
                    onClick={() => confirmDeleteBoosting()}
                    disabled={deletingId === boostingToDelete?._id}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed"
                    whileHover={{ scale: deletingId === boostingToDelete?._id ? 1 : 1.02 }}
                    whileTap={{ scale: deletingId === boostingToDelete?._id ? 1 : 0.98 }}
                  >
                    {deletingId === boostingToDelete?._id ? 'Excluindo...' : 'Confirmar'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyBoostingsPage;
