import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Eye, Loader2, Package, Filter, Heart } from 'lucide-react';
import { useFavorites } from '../contexts/FavoritesContext';
import FavoritesWidget from './favorites/FavoritesWidget';
import { useNotifications } from '../contexts/NotificationContext';
import { marketplaceService } from '../services';
import { getReceivedReviews } from '../services/reviewService';
import type { Variants } from 'framer-motion';
import FilterModal from './filters/FilterModal';
import ImagePlaceholder from './ImagePlaceholder';
import translateCategoryLabel from '../utils/categoryTranslations';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const Marketplace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { addNotification } = useNotifications();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [sellerRatings, setSellerRatings] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState('recent');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    pages: 0
  });
  const hasAnimatedRef = useRef(false);


  const fetchItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await marketplaceService.getAllItems();

      if (response?.success && response?.data) {
        const data = response.data as { items?: any[]; total?: number };
        const itemsArr = Array.isArray(data.items) ? data.items : [];
        const totalCount = typeof data.total === 'number' ? data.total : itemsArr.length;

        setItems(itemsArr);
        setPagination((prev) => ({
          ...prev,
          total: totalCount,
          page: 1,
          pages: Math.ceil((totalCount) / prev.limit) || 1
        }));
      } else {
        setError(response.message || 'Erro ao carregar itens');
        setItems([]);
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const gameFromUrl = searchParams.get('game');
    if (gameFromUrl) {
      setSelectedGame(gameFromUrl);
    } else {
      setSelectedGame('all');
    }
    fetchItems();

  }, [searchParams]);


  useEffect(() => {
    if (!items.length) {
      setSellerRatings({});
      return;
    }

    let cancelled = false;
    const uniqueSellerEmails = new Map<string, string | undefined>();

    items.forEach((item: any) => {
      const sellerId = item.sellerId?._id || item.sellerId?.userid || item.sellerId;
      if (sellerId && typeof sellerId === 'string' && !uniqueSellerEmails.has(sellerId)) {
        uniqueSellerEmails.set(sellerId, item.sellerId?.email);
      }
    });

    if (!uniqueSellerEmails.size) {
      setSellerRatings({});
      return;
    }

    const fetchSellerRatings = async () => {
      const ratingsMap: Record<string, number> = {};
      const entries = Array.from(uniqueSellerEmails.entries());
      const BATCH_SIZE = 6;

      for (let i = 0; i < entries.length && !cancelled; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async ([sellerId, email]) => {
            const data = await getReceivedReviews(sellerId, 1, 1, { email });
            const avg = Number((data as any)?.stats?.average ?? 0);
            return { sellerId, avg };
          })
        );

        if (cancelled) return;

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { sellerId, avg } = result.value;
            if (!isNaN(avg) && avg > 0) {
              ratingsMap[sellerId] = avg;
            }
          }
        });
      }

      if (!cancelled) {
        setSellerRatings(ratingsMap);
      }
    };

    fetchSellerRatings();

    return () => {
      cancelled = true;
    };
  }, [items]);


  useEffect(() => {
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
    }
  }, []);


  


  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it: any) => {
      if (it.category) set.add(it.category);
    });
    return ['all', ...Array.from(set)];
  }, [items]);


  const games = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it: any) => {
      if (it.game) set.add(it.game);
      if (it.gameId) set.add(it.gameId);
    });
    return ['all', ...Array.from(set)];
  }, [items]);


  const filteredAndSorted = useMemo(() => {
    let list = items.slice();
    if (activeCategory !== 'all') {
      list = list.filter((it: any) => it.category === activeCategory);
    }
    if (selectedGame !== 'all') {
      list = list.filter((it: any) => (it.gameId === selectedGame || it.game === selectedGame));
    }
    
    list = list.filter((it: any) => {
      try {
        const status = String(it.status || 'active').toLowerCase();
        if (status === 'sold') return false;
        if (status === 'reserved') {
          
          return false;
        }
        if (typeof it.stockLeft === 'number' && it.stockLeft <= 0) return false;
        return true;
      } catch { return true; }
    });
    

    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'popular':
        list.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
        break;
      case 'recent':
      default:
        list.sort((a, b) => new Date(b.createdAt?.$date || b.createdAt || 0).getTime() - new Date(a.createdAt?.$date || a.createdAt || 0).getTime());
    }
    

    list.sort((a, b) => {
      const aDetached = a.detached || false;
      const bDetached = b.detached || false;
      
      if (aDetached && !bDetached) return -1;
      if (!aDetached && bDetached) return 1;
      return 0;
    });
    
    return list;
  }, [items, activeCategory, selectedGame, sortBy]);


  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredAndSorted.length,
      pages: Math.ceil(filteredAndSorted.length / prev.limit) || 1,
      page: 1
    }));
  }, [filteredAndSorted]);

  
  useEffect(() => {
    
    if (!hasAnimatedRef.current) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [activeCategory, selectedGame, sortBy, pagination.page]);

  const pagedItems = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredAndSorted.slice(start, end);
  }, [filteredAndSorted, pagination.page, pagination.limit]);


  
  const handleItemClick = useCallback((item: any) => {
    const status = String(item?.status || 'active').toLowerCase();
    const unavailable = status === 'sold' || status === 'reserved' || (typeof item?.stockLeft === 'number' && item.stockLeft <= 0);
    if (unavailable) return;
    navigate(`/marketplace/${item._id}`);
  }, [navigate]);

  // Função para lidar com o toggle de favoritos
  const handleToggleFavorite = useCallback((e: React.MouseEvent, item: any) => {
    e.stopPropagation(); // Impede a navegação para a página do item
    
    if (isFavorite(item._id)) {
      removeFavorite(item._id);
      addNotification({
        title: 'Removido dos favoritos',
        message: `${item.title} foi removido dos seus favoritos`,
        type: 'info'
      });
    } else {
      // Adiciona apenas as propriedades que existem no tipo FavoriteItem
      addFavorite({
        _id: item._id,
        title: item.title,
        price: item.price,
        image: item.images && item.images[0] ? item.images[0] : '',
        addedAt: new Date().toISOString()
      });
      addNotification({
        title: 'Adicionado aos favoritos',
        message: `${item.title} foi adicionado aos seus favoritos`,
        type: 'success'
      });
    }
  }, [isFavorite, removeFavorite, addNotification, addFavorite]);
  


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

  const totalLabel = `${filteredAndSorted.length} ${filteredAndSorted.length === 1 ? 'item encontrado' : 'itens encontrados'}`;

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
                  marketplace
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <ShoppingCart className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white">
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-purple-50 to-blue-200">
                        Marketplace
                      </span>
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-white/70">
                      Seu hub para descobrir itens lendários, serviços exclusivos e drops limitados da comunidade gamer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 text-sm text-white/80 w-full max-w-xs">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Disponíveis agora</p>
                  <p className="text-lg font-semibold text-white">{totalLabel}</p>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                  <Package className="w-4 h-4" />
                  Descubra novidades selecionadas diariamente
                </div>
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsFavoritesOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-sm font-medium">Favoritos</span>
                  </motion.button>
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
      
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="ml-2 text-white">Carregando itens...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12">
          <h3 className="text-xl font-bold text-white mb-2">Erro ao carregar itens</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => fetchItems()} 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-bold text-white mb-2">Nenhum item encontrado</h3>
          <p className="text-gray-400">
            Tente ajustar os filtros ou buscar por outros termos
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {}
        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          initial={{ category: activeCategory, game: selectedGame, sortBy: sortBy as any }}
          categories={categories}
          games={games}
          onApply={(values) => {
            setActiveCategory(values.category ?? 'all');
            setSelectedGame(values.game ?? 'all');
            setSortBy((values.sortBy as string | undefined) ?? 'recent');
            setPagination((prev) => ({ ...prev, page: 1 }));
            setIsFilterOpen(false);
          }}
        />
        

        {}
        <LayoutGroup>
          <AnimatePresence mode="wait">
            <motion.div
              key={`grid-${activeCategory}-${selectedGame}-${sortBy}-${pagination.page}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                variants={gridVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {pagedItems.map((item: any) => (
                    <motion.div
                      key={item._id}
                      layout
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      whileHover={{ y: -8, scale: 1.03 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                      className={`group relative bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 backdrop-blur-sm h-[500px] flex flex-col ${ (String(item.status||'active').toLowerCase() === 'sold' || String(item.status||'active').toLowerCase() === 'reserved' || (typeof item.stockLeft === 'number' && item.stockLeft <= 0)) ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-purple-500/20 hover:shadow-2xl hover:border-purple-500/30 cursor-pointer'}`}
                      onClick={() => handleItemClick(item)}
                    >
                  <div className="relative h-52 bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden">
                    {}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent z-10 pointer-events-none" />
                    
                    {item.images && item.images.length > 0 ? (
                      <motion.img
                        src={item.images[0]}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    ) : null}
                    <ImagePlaceholder className="absolute inset-0" style={{ display: item.images && item.images.length > 0 ? 'none' : 'flex' }} />

                    {}
                    { (String(item.status||'active').toLowerCase() === 'sold' || String(item.status||'active').toLowerCase() === 'reserved' || (typeof item.stockLeft === 'number' && item.stockLeft <= 0)) && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30">
                        <motion.span 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl shadow-red-500/50 border border-red-400/50"
                        >
                          Produto Esgotado
                        </motion.span>
                      </div>
                    )}

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
                    {item.detached && (
                      <motion.div 
                        className="absolute bottom-3 left-3 z-20"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                      >
                        <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-yellow-500/50 border border-yellow-300/50 animate-pulse">
                          <Star className="w-3.5 h-3.5 fill-current" /> Patrocinado
                        </span>
                      </motion.div>
                    )}
                  </div>

                {}
                <motion.div className="p-5 flex flex-col h-[320px]" layout>
                  <h3 className="text-white font-bold text-lg mb-2 truncate group-hover:text-purple-300 transition-colors duration-300">
                    {item.title}
                  </h3>
                  
                  <div className="h-14 mb-4"> {/* Altura fixa para conter a descrição */}
                    <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                      {item.description ? (item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description) : "Sem descrição disponível"}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 font-medium mb-1">Preço</span>
                      <div className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 font-bold text-2xl">
                        {currencyFormatter.format(Number(item.price) || 0)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-gray-700/30">
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300 text-sm font-medium">
                        {item.views || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-700/50">
                    {}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center ring-2 ring-purple-500/30 group-hover:ring-purple-400/50 transition-all duration-300">
                        {(item.sellerId?.avatar || item.sellerId?.profilePicture) ? (
                          <img
                            src={item.sellerId.avatar || item.sellerId.profilePicture}
                            alt={item.sellerId.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.classList.add('bg-gradient-to-br', 'from-blue-500/30', 'to-purple-500/30');
                                const fallback = document.createElement('span');
                                fallback.className = 'text-xs font-bold text-white';
                                fallback.textContent = (item.sellerId?.name || 'A').charAt(0).toUpperCase();
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-purple-500/30">
                            <span className="text-xs font-bold text-white select-none">
                              {(item.sellerId?.name || 'A').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {item.sellerId?.name || 'Anônimo'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                            <span className="text-gray-400 text-xs font-medium">
                              {(() => {
                                const sellerId = item.sellerId?._id || item.sellerId?.userid || item.sellerId;
                                const chatRating = sellerId && sellerRatings[sellerId];
                                if (chatRating && chatRating > 0) {
                                  return chatRating.toFixed(1);
                                }
                                return '0.0';
                              })()}
                            </span>
                          </div>
                          <span className="text-gray-600 text-xs">•</span>
                          <span className="text-gray-500 text-xs truncate">
                            {item.sellerId?.userid || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Área de botões */}
                    <div className="flex gap-2 mt-3">
                      {/* Botão de favoritos */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleToggleFavorite(e, item)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium
                          transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
                          text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 focus:ring-white/50"
                        title={isFavorite(item._id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite(item._id) ? 'fill-white' : ''}`} />
                      </motion.button>

                      {/* Botão de compra */}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Comprar Agora</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
            </AnimatePresence>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>

          {}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Anterior
              </motion.button>
              
              <span className="text-white">
                Página {pagination.page} de {pagination.pages}
              </span>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Próxima
              </motion.button>
            </div>
          )}
        </>
      )}
      <FavoritesWidget isOpen={isFavoritesOpen} onClose={() => setIsFavoritesOpen(false)} />
    </motion.div>
  );
};

export default Marketplace;