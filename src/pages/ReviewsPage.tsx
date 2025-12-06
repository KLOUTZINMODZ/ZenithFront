import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  TrendingUp, 
  Filter, 
  Search,
  UserCircle2,
  Calendar,
  CheckCircle2,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Review, homeService } from '../services/homeService';

const ITEMS_PER_PAGE = 9; 

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await homeService.getHomeData();
      if (data?.reviews) {
        setReviews(data.reviews);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews
    .filter(review => {
      const matchesRating = filterRating === null || review.rating === filterRating;
      const matchesSearch = searchTerm === '' || 
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewer.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return b.rating - a.rating;
      }
    });

  
  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

  
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRating, searchTerm, sortBy]);

  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div>
      {}
      <div className="relative overflow-hidden border-b border-purple-500/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="w-8 h-8 text-yellow-400" />
              <h1 className="text-3xl md:text-5xl font-bold text-white">
                Avaliações dos Usuários
              </h1>
            </div>
            <p className="text-gray-400 text-lg md:text-xl mb-8">
              Veja o que nossos clientes estão dizendo sobre suas experiências na Zenith
            </p>

            {}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                  <span className="text-4xl font-bold text-white">{averageRating}</span>
                </div>
                <p className="text-gray-400 text-sm">Avaliação Média</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserCircle2 className="w-8 h-8 text-blue-400" />
                  <span className="text-4xl font-bold text-white">{reviews.length}</span>
                </div>
                <p className="text-gray-400 text-sm">Total de Avaliações</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  <span className="text-4xl font-bold text-white">
                    {Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)}%
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Satisfação</p>
              </motion.div>
            </div>

            {}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 text-left">Distribuição de Avaliações</h3>
              <div className="space-y-2">
                {ratingDistribution.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-white text-sm font-medium">{rating}</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-12 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar avaliações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating')}
                className="appearance-none bg-gray-900/50 border border-gray-700 rounded-lg px-4 pr-10 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
              >
                <option value="recent">Mais Recentes</option>
                <option value="rating">Melhor Avaliação</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>

            {}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>

          {}
          <AnimatePresence>
            {(showFilters || window.innerWidth >= 768) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700/50"
              >
                <button
                  onClick={() => setFilterRating(null)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    filterRating === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Todas
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFilterRating(rating)}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      filterRating === rating
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <span>{rating}</span>
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            {filteredReviews.length === reviews.length
              ? `${reviews.length} avaliações`
              : `${filteredReviews.length} de ${reviews.length} avaliações`}
          </p>
          {(searchTerm || filterRating !== null) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRating(null);
              }}
              className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : paginatedReviews.length === 0 ? (
          <div className="text-center py-20">
            <UserCircle2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma avaliação encontrada</h3>
            <p className="text-gray-400">
              Tente ajustar seus filtros ou buscar por outros termos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReviews.map((review, index) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/40 transition-all group"
              >
                {}
                <div className="flex items-start gap-3 mb-4">
                  {review.reviewer.avatar ? (
                    <img
                      src={review.reviewer.avatar}
                      alt={review.reviewer.name}
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {review.reviewer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {review.reviewer.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-yellow-400 text-sm font-medium">
                        {review.rating}.0
                      </span>
                    </div>
                  </div>
                </div>

                {}
                {review.title && (
                  <h3 className="text-white font-semibold mb-2 line-clamp-1">
                    {review.title}
                  </h3>
                )}

                {}
                <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-4">
                  {review.comment}
                </p>

                {}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                  <div className="flex items-center gap-2 text-purple-400 text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="truncate">{review.target.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {}
        {!loading && paginatedReviews.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">
                Página <span className="text-white font-semibold">{currentPage}</span> de{' '}
                <span className="text-white font-semibold">{totalPages}</span>
              </span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
