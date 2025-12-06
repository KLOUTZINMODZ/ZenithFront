import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, User, TrendingUp, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../services/marketplaceService';

interface MarketItemResponse {
  _id: string;
  title: string;
  game: string;
  gameId: string;
  price: number;
  image: string;
  images: string[];
  category: string;
  description: string;
  sellerId: any;
  rating: {
    average: number;
    count: number;
  };
  views: number;
  status: string;
  deliveryMethod: string;
  deliveryInstructions: string;
  createdAt: string;
  updatedAt: string;
}


const toAbsoluteImageUrl = (u?: string): string => {
  try {
    if (!u) return '';
    if (/^https?:\/\//.test(u)) return u;
    if (u.startsWith('//')) return `${window.location.protocol}${u}`;
    const base = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    if (base) return `${String(base).replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
    return `${window.location.origin}/${u.replace(/^\//, '')}`;
  } catch {
    return u || '';
  }
};

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  topOffset?: number;
}

interface SearchCache {
  items: MarketItemResponse[];
  users: any[];
  lastUpdate: number;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  onSubmit,
  topOffset
}) => {
  const [searchCache, setSearchCache] = useState<SearchCache>({
    items: [],
    users: [],
    lastUpdate: 0
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();


  const CACHE_TTL = 5 * 60 * 1000;


  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('searchCache');
      const cachedRecentSearches = localStorage.getItem('recentSearches');
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.lastUpdate < CACHE_TTL) {
          setSearchCache(parsed);
        }
      }
      
      if (cachedRecentSearches) {
        setRecentSearches(JSON.parse(cachedRecentSearches));
      }
    } catch (error) {
          }
  }, []);


  useEffect(() => {
    const loadInitialData = async () => {
      if (searchCache.items.length === 0 || Date.now() - searchCache.lastUpdate > CACHE_TTL) {
        setIsLoading(true);
        try {
          const response = await marketplaceService.getItems({ limit: 100, page: 1 });
          if (response.success && response.data) {
            const newCache = {
              items: response.data.items,
              users: [],
              lastUpdate: Date.now()
            };
            
            setSearchCache(newCache);
            localStorage.setItem('searchCache', JSON.stringify(newCache));
          }
        } catch (error) {
                  } finally {
          setIsLoading(false);
        }
      }
    };

    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);


  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  
  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024; 
      if (isOpen && isMobile) {
        const scrollY = window.scrollY || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        return () => {
          const top = document.body.style.top;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.width = '';
          const y = top ? parseInt(top || '0') : 0;
          window.scrollTo(0, Math.abs(y));
        };
      }
    } catch {}
  }, [isOpen]);


  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return { items: [], users: [] };

    const query = searchQuery.toLowerCase();
    
    const items = searchCache.items.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.game.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    ).slice(0, 8);

    const users = searchCache.users.filter(user =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    ).slice(0, 5);

    return { items, users };
  }, [searchQuery, searchCache]);


  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };


  const removeRecentSearch = (query: string) => {
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };


  const handleItemClick = (item: MarketItemResponse) => {
    saveRecentSearch(searchQuery);
    onClose();
    navigate(`/marketplace/${item._id}`);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRecentSearch(searchQuery);
    onSubmit(e);
    onClose();
  };


  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.15,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      }
    })
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {}
          <motion.div
            ref={dropdownRef}
            className="fixed inset-x-0 top-16 lg:absolute lg:inset-auto lg:top-full lg:left-0 lg:right-0 lg:w-full lg:mt-2 mt-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={typeof topOffset === 'number' ? { top: topOffset } : undefined}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="p-4 max-h-[70svh] lg:max-h-[50vh] overflow-y-auto">
              {}
              <div className="lg:hidden mb-4">
                <form onSubmit={handleSubmit} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Pesquisar jogos, skins, conta..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  <span className="ml-2 text-gray-400">Carregando...</span>
                </div>
              )}

              {}
              {!searchQuery.trim() && !isLoading && (
                <div>
                  {recentSearches.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Buscas Recentes
                      </h3>
                      {recentSearches.map((search, index) => (
                        <motion.button
                          key={`recent-search-${index}-${search}`}
                          custom={index}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          onClick={() => onSearchChange(search)}
                          className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-800 rounded-lg transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{search}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(search);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-300 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-center py-8 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Digite para pesquisar jogos, skins ou contas</p>
                  </div>
                </div>
              )}

              {}
              {searchQuery.trim() && !isLoading && (
                <div className="space-y-6">
                  {}
                  {filteredResults.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Items ({filteredResults.items.length})
                      </h3>
                      <div className="space-y-2">
                        {filteredResults.items.map((item, index) => (
                          <motion.button
                            key={item._id}
                            custom={index}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            onClick={() => handleItemClick(item)}
                            className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-800 rounded-lg transition-all duration-200 group"
                          >
                            <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                              {(item.image || (item.images && item.images[0])) ? (
                                <img
                                  src={toAbsoluteImageUrl(item.image || (item.images?.[0] || ''))}
                                  alt={item.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium truncate">{item.title}</h4>
                              <p className="text-sm text-gray-400 truncate">{item.game}</p>
                              <p className="text-sm text-purple-400 font-medium">R$ {item.price.toFixed(2)}</p>
                            </div>
                            
                            <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {}
                  {filteredResults.users.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Usuários ({filteredResults.users.length})
                      </h3>
                      <div className="space-y-2">
                        {filteredResults.users.map((user, index) => (
                          <motion.button
                            key={user._id}
                            custom={index + filteredResults.items.length}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium truncate">{user.name}</h4>
                              <p className="text-sm text-gray-400 truncate">{user.email}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {}
                  {filteredResults.items.length === 0 && filteredResults.users.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8"
                    >
                      <Search className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-300 mb-2">Nenhum resultado encontrado</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Tente pesquisar por outros termos ou categorias
                      </p>
                      <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Ver todos os resultados
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchDropdown;
