import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Loader2, Filter, Star, FileText, Shield, Plus, AlertCircle, Eye, Trash2, X, ShoppingCart, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import FilterModal from '../components/filters/FilterModal';
import ImagePlaceholder from '../components/ImagePlaceholder';
import translateCategoryLabel from '../utils/categoryTranslations';

interface MarketItem {
  _id: string;
  title: string;
  game: string;
  gameId?: string;
  price: string;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  subcategory?: string;
  condition?: string;
  discount?: number | string;
  description: string;
  status: 'active' | 'inactive' | 'sold';
  views: number;
  createdAt: string;
  updatedAt: string;
  detached?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const MyPostsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [itemsRaw, setItemsRaw] = useState<MarketItem[]>([]);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 12, pages: 0 });
  const [status, setStatus] = useState<'active' | 'inactive' | 'sold' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MarketItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);


  const handleHighlightItems = async () => {
    if (selectedItems.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Seleção necessária',
        message: 'Selecione pelo menos um item para destacar'
      });
      return;
    }


    const validItems = selectedItems.filter(itemId => {
      const item = items.find(i => i._id === itemId);
      return item && isItemEligibleForHighlight(item);
    });

    if (validItems.length === 0) {
      addNotification({
        type: 'error',
        title: 'Itens inválidos',
        message: 'Nenhum dos itens selecionados pode ser destacado'
      });
      return;
    }


    if (validItems.length !== selectedItems.length) {
      setSelectedItems(validItems);
      addNotification({
        type: 'warning',
        title: 'Seleção filtrada',
        message: `${validItems.length} de ${selectedItems.length} itens são elegíveis para destaque`
      });
    }

    setIsProcessing(true);
    try {
      const response = await marketplaceService.createMarketplaceHighlight(validItems);
      
      if (response.data.success) {

        navigate('/checkout', {
          state: {
            paymentData: response.data.data
          }
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Erro no pagamento',
          message: 'Não foi possível criar o pagamento'
        });
      }
    } catch (error) {
            addNotification({
        type: 'error',
        title: 'Erro no pagamento',
        message: 'Não foi possível criar o pagamento'
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const isItemEligibleForHighlight = (item: MarketItem) => {
    return item.status === 'active' && !item.detached;
  };


  const toggleItemSelection = (itemId: string) => {
    const item = items.find(i => i._id === itemId);
    if (!item) return;
    

    if (!isItemEligibleForHighlight(item)) {
      let reason = '';
      if (item.status === 'inactive') reason = 'Item inativo não pode ser destacado';
      else if (item.status === 'sold') reason = 'Item vendido não pode ser destacado';
      else if (item.detached) reason = 'Item já está destacado';
      
      addNotification({
        type: 'warning',
        title: 'Item não elegível',
        message: reason
      });
      return;
    }

    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };


  const selectAllEligibleItems = () => {
    const eligibleItemIds = items.filter(item => isItemEligibleForHighlight(item)).map(item => item._id);
    setSelectedItems(eligibleItemIds);
    
    if (eligibleItemIds.length === 0) {
      addNotification({
        type: 'info',
        title: 'Nenhum item elegível',
        message: 'Não há itens ativos disponíveis para destacar'
      });
    }
  };


  const clearSelection = () => {
    setSelectedItems([]);
  };

  const handleCopyItem = (item: MarketItem) => {
    navigate('/post-service', {
      state: {
        clonedItem: {
          title: item.title || '',
          game: item.game || '',
          category: item.category || '',
          subcategory: item.subcategory || '',
          condition: item.condition || '',
          price: item.price || '',
          discount: item.discount !== undefined && item.discount !== null ? String(item.discount) : '',
          description: item.description || ''
        }
      }
    });
  };

  const fetchMyItems = async (page = 1) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceService.getMyItems({ page, limit: pagination.limit, status });
      if (res.success && res.data) {
        const fetched = res.data.items as unknown as MarketItem[];
        setItemsRaw(fetched);

        const filtered = fetched.filter((it) => selectedCategory === 'all' || it.category === selectedCategory);
        setItems(filtered);
        setPagination(res.data.pagination as Pagination);
      } else {
        setError(res.message || 'Não foi possível carregar suas publicações');
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
    fetchMyItems(1);

  }, [user, status]);


  useEffect(() => {
    const filtered = itemsRaw.filter((it) => selectedCategory === 'all' || it.category === selectedCategory);
    setItems(filtered);
  }, [selectedCategory, itemsRaw]);


  const onDelete = async (item: MarketItem) => {

    setItemToDelete(item);
    setShowDeleteModal(true);
  };


  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    setDeletingId(itemToDelete._id);
    
    try {
      const res = await marketplaceService.deleteItem(itemToDelete._id);
      if (res.success) {
        addNotification({
          title: 'Item removido',
          message: 'Sua publicação foi removida com sucesso.',
          type: 'success'
        });
        fetchMyItems(pagination.page);
        

        setShowDeleteModal(false);
        setItemToDelete(null);
      } else {
        addNotification({
          title: 'Erro ao remover',
          message: res.message || 'Não foi possível remover o item',
          type: 'error'
        });
      }
    } catch (e) {
      addNotification({
        title: 'Erro ao remover',
        message: 'Falha na conexão com o servidor',
        type: 'error'
      });
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const statusBadge = (s: MarketItem['status']) => {
    const map: Record<MarketItem['status'], string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-yellow-500/20 text-yellow-400',
      sold: 'bg-gray-500/20 text-gray-300'
    };
    return map[s] || 'bg-gray-500/20 text-gray-300';
  };

  const totalLabel = useMemo(() => {
    if (!pagination.total) return '0 resultados';
    return `${pagination.total} resultado${pagination.total > 1 ? 's' : ''}`;
  }, [pagination.total]);


  const pageVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 }
  };

  const gridVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.06, delayChildren: 0.04 }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.6 }
    }
  };

  const hasAnimatedRef = useRef(false);
  useEffect(() => {

    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
    }
  }, []);

  return (
    <motion.div
      className="py-8"
      initial={hasAnimatedRef.current ? false : 'hidden'}
      animate="visible"
      variants={pageVariants}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -top-16 -right-6 h-40 w-40 bg-purple-500/50 blur-[90px]" />
              <div className="absolute -bottom-12 -left-10 h-32 w-32 bg-blue-500/40 blur-[70px]" />
            </div>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/80">
                  <Star className="w-3.5 h-3.5 text-yellow-300" />
                  minhas publicações
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white">
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-purple-50 to-blue-200">
                        Minhas Publicações
                      </span>
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-white/70">
                      Gerencie seus serviços publicados com segurança e controle total.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 text-sm text-white/80 w-full max-w-xs">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Total publicado</p>
                  <p className="text-lg font-semibold text-white">{totalLabel}</p>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                  <Shield className="w-4 h-4" />
                  Suas publicações estão protegidas
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/post-service"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Nova Publicação</span>
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
        </div>
      </div>

      {}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initial={{ category: selectedCategory, status }}
        categories={['all', ...Array.from(new Set(itemsRaw.map((i) => i.category).filter(Boolean)))]}
        statuses={['all', 'active', 'inactive', 'sold']}
        showCategory={true}
        showStatus={true}
        showGame={false}
        showSort={false}
        onApply={(values) => {
          setSelectedCategory(values.category ?? 'all');
          setStatus((values.status as any) ?? 'all');
          setPagination((prev) => ({ ...prev, page: 1 }));
          setIsFilterOpen(false);
        }}
      />

      {}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-400" />
          <p className="text-lg">Carregando suas publicações...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-300 border-gray-700/50 rounded-lg p-8 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma publicação ainda</h3>
          <p className="text-gray-400 mb-4">Comece criando sua primeira publicação e compartilhe seus serviços!</p>
          <Link
            to="/post-service"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Criar Primeira Publicação
          </Link>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          variants={gridVariants}
          initial={false}
          animate="visible"
        >
          <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item._id}
              layout="position"
              variants={cardVariants}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
              whileHover={{ y: -8, scale: 1.03 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
              className="group relative bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 backdrop-blur-sm hover:shadow-purple-500/20 hover:shadow-2xl hover:border-purple-500/30 cursor-pointer"
              onClick={() => navigate(`/marketplace/${item._id}`)}
            >
              <div className="relative h-52 bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden">
                {}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent z-10 pointer-events-none" />
                {item.image || (item.images && item.images[0]) ? (
                  <motion.img
                    layout
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    src={item.image || (item.images && item.images[0]) || ''}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                ) : null}
                <ImagePlaceholder className="absolute inset-0" style={{ display: item.image || (item.images && item.images[0]) ? 'none' : 'flex' }} />

                {}
                <motion.div 
                  className="absolute top-3 left-3 z-20"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border border-purple-400/30">
                    {translateCategoryLabel(item.category)}
                  </span>
                </motion.div>
                
                {}
                <motion.div 
                  className="absolute top-3 right-3 z-20"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <span className="inline-flex items-center gap-1 bg-gray-900/90 backdrop-blur-md text-gray-200 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg border border-gray-700/50">
                    {item.game}
                  </span>
                </motion.div>

                {}
                <motion.div 
                  className="absolute top-14 left-3 z-20"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm border ${statusBadge(item.status)}`}>
                    {item.status === 'active' ? '✓ Ativo' : item.status === 'inactive' ? 'Inativo' : 'Vendido'}
                  </span>
                </motion.div>

                {}
                {item.detached && (
                  <motion.div 
                    className="absolute bottom-3 left-3 z-20"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25, type: "spring" }}
                  >
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-yellow-500/50 border border-yellow-300/50 animate-pulse">
                      <Star className="w-3.5 h-3.5 fill-current" /> Patrocinado
                    </span>
                  </motion.div>
                )}
              </div>

              {}
              <motion.div className="p-5" layout>
                <h3 className="text-white font-bold text-lg mb-2 truncate group-hover:text-purple-300 transition-colors duration-300">
                  {item.title}
                </h3>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium mb-1">Preço</span>
                    <div className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 font-bold text-2xl">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(parseFloat(item.price || '0'))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-gray-700/30">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300 text-sm font-medium">
                      {item.views || 0}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <div className="w-2 h-2 rounded-full bg-purple-500/50"></div>
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: isItemEligibleForHighlight(item) ? 1.1 : 1 }}
                      whileTap={{ scale: isItemEligibleForHighlight(item) ? 0.95 : 1 }}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        toggleItemSelection(item._id);
                      }}
                      title={isItemEligibleForHighlight(item) ? (selectedItems.includes(item._id) ? "Remover destaque" : "Adicionar destaque") : "Item não elegível para destaque"}
                      disabled={!isItemEligibleForHighlight(item)}
                      className={`p-2 rounded-lg transition-all duration-200 shadow-lg ${
                        !isItemEligibleForHighlight(item)
                          ? 'bg-gray-600/50 text-gray-500 cursor-not-allowed opacity-50'
                          : selectedItems.includes(item._id)
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-yellow-500/50'
                          : 'bg-gray-700/80 hover:bg-gray-600 text-yellow-400 hover:text-yellow-300 hover:shadow-yellow-500/30'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${
                        selectedItems.includes(item._id) && isItemEligibleForHighlight(item)
                          ? 'fill-current'
                          : ''
                      }`} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleCopyItem(item);
                      }}
                      title="Copiar produto"
                      className="p-2 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-purple-300 hover:text-purple-200 transition-all duration-200 shadow-lg hover:shadow-purple-500/30"
                    >
                      <Copy className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                      title="Remover"
                      className="p-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white transition-all duration-200 shadow-lg shadow-red-500/50 hover:shadow-red-500/70"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      )}

      {}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchMyItems(pagination.page - 1)}
            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 disabled:opacity-50"
          >
            Anterior
          </button>
          <div className="text-gray-300 text-sm">
            Página {pagination.page} de {pagination.pages}
          </div>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchMyItems(pagination.page + 1)}
            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}

      {}
      <AnimatePresence mode="wait">
        {showDeleteModal && itemToDelete && (
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
                Tem certeza que deseja remover a publicação{' '}
                <span className="font-semibold text-white">"{itemToDelete.title}"</span>?
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
                  onClick={() => confirmDeleteItem()}
                  disabled={deletingId === itemToDelete?._id}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed"
                  whileHover={{ scale: deletingId === itemToDelete?._id ? 1 : 1.02 }}
                  whileTap={{ scale: deletingId === itemToDelete?._id ? 1 : 0.98 }}
                >
                  {deletingId === itemToDelete?._id ? 'Removendo...' : 'Confirmar'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence mode="wait">
        {selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 50 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                      {selectedItems.length} item{selectedItems.length > 1 ? '(s)' : ''} selecionado{selectedItems.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <motion.button
                    onClick={clearSelection}
                    className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Fechar"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </motion.button>
                </div>
              </div>

              {}
              <div className="flex-1 overflow-y-auto p-3 md:p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Itens:</span>
                    <span className="font-medium text-white">{selectedItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Preço/item:</span>
                    <span className="font-medium text-white">R$ 10,00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Duração:</span>
                    <span className="font-medium text-white">14 dias</span>
                  </div>
                  <div className="border-t border-gray-600/30 pt-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-white">Total:</span>
                      <span className="text-lg font-bold text-yellow-400">
                        R$ {(selectedItems.length * 10.00).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className="p-3 md:p-4 pt-2 flex-shrink-0 border-t border-gray-700/30">
                <motion.button
                  onClick={handleHighlightItems}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed text-sm"
                  whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                  whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Comprar (R$ {(selectedItems.length * 10.00).toFixed(2)})
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      {selectedItems.length > 0 && (
        <div className="h-64 md:hidden" />
      )}
    </motion.div>
  );
};

export default MyPostsPage;
