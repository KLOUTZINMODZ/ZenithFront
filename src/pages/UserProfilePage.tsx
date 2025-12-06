import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Calendar, ShoppingBag, Loader2, MessageSquare, ChevronRight, Trophy } from 'lucide-react';
import { getUserById, User as UserType } from '../services/userService';
import { getReceivedReviews, markReviewHelpful, Review } from '../services/reviewService';
import ReviewCard from '../components/ReviewCard';
import AchievementCard from '../components/AchievementCard';
import { getUserAchievementsById, UnlockedAchievement } from '../services/achievementService';
import { useAchievements } from '../hooks/useAchievements';

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [achievementsPage, setAchievementsPage] = useState(1);
  

  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number> | null>(null);
  const [totalSales, setTotalSales] = useState<number>(0);
  const REVIEWS_PER_PAGE = 3;


  const userData = user;

  
  const resolvedChatTargetId = React.useMemo(() => {
    const hex24 = (v?: string | null) => !!v && /^[a-fA-F0-9]{24}$/.test(String(v));
    const chatId = userData?.userid;
    const routeId = id;
    const fallback = userData?._id;
    return (hex24(chatId) && chatId)
      || (hex24(routeId) && routeId)
      || (hex24(fallback) && fallback)
      || chatId || routeId || fallback || '';
  }, [userData?.userid, userData?._id, id]);

  useEffect(() => {


    if (id) {
      const fetchUser = async () => {
        setLoading(true);
        setError(null);
        try {
          const userData = await getUserById(id);
          setUser(userData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar usuário');
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }
  }, [id]);


  useEffect(() => {
    if (resolvedChatTargetId) {
      fetchReviews(resolvedChatTargetId);
      fetchAchievements();
    }
  }, [resolvedChatTargetId]);

  
  
  
  useEffect(() => {
        if (userData) {
      const sales = userData.totalSales || (userData as any).sales || 0;
            setTotalSales(sales);
    }
  }, [userData]);

  const fetchAchievements = async () => {
    if (!resolvedChatTargetId) {
            return;
    }
    
    setAchievementsLoading(true);
    try {
            const data = await getUserAchievementsById(resolvedChatTargetId);
            
      setAchievements(data.unlocked || []);
      
      
      if (data.stats) {
                if (data.stats.totalSales !== undefined && data.stats.totalSales >= 0) {
                    setTotalSales(data.stats.totalSales);
        }
        
        if (data.stats.averageRating !== undefined && data.stats.averageRating > 0) {
          setAverageRating(data.stats.averageRating);
        }
      }
    } catch (err) {
            
      
      setAchievements([]);
    } finally {
      setAchievementsLoading(false);
    }
  };

  const fetchReviews = async (targetId?: string) => {
    const hex24 = (v?: string | null) => !!v && /^[a-fA-F0-9]{24}$/.test(String(v));
    const candidates = [
      targetId,
      userData?.userid,
      id,
      userData?._id
    ].filter((v): v is string => !!v).filter(hex24);
    if (!candidates.length) return;

    setReviewsLoading(true);
    try {
      let fallbackData: any = null;
      let allLoadedReviews: Review[] = [];
      
      for (const cand of candidates) {
        try {
          
          const data = await getReceivedReviews(cand, 1, 100, { email: userData?.email });
          if (!fallbackData) fallbackData = data;
          const hasAny = (data?.pagination?.total || 0) > 0 || (data?.ratings?.length || 0) > 0;
          if (hasAny) {
            allLoadedReviews = data.ratings || [];
            setAllReviews(allLoadedReviews);
            setTotalReviews(data.pagination.total);
            setAverageRating(
              typeof (data as any).stats?.average === 'number' && !isNaN((data as any).stats.average)
                ? Number((data as any).stats.average)
                : null
            );
            setRatingDistribution(((data as any)?.stats?.distribution as any) || null);
            return;
          }
        } catch (e) {
          continue;
        }
      }

      if (fallbackData) {
        const data = fallbackData;
        setAllReviews(data.ratings || []);
        setTotalReviews(data.pagination.total);
        setAverageRating(
          typeof (data as any).stats?.average === 'number' && !isNaN((data as any).stats.average)
            ? Number((data as any).stats.average)
            : null
        );
        setRatingDistribution(((data as any)?.stats?.distribution as any) || null);
      }
    } catch (err) {
          } finally {
      setReviewsLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string, isHelpful: boolean) => {
    try {
      await markReviewHelpful(reviewId, isHelpful);

      fetchReviews();
    } catch (err) {
          }
  };

  

  const renderStars = React.useCallback((value: number) => {
    const rounded = Math.round(Number(value || 0));
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={
              'w-5 h-5 transition-all ' + (i + 1 <= rounded ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600')
            }
          />
        ))}
      </div>
    );
  }, []);

  const RatingBar: React.FC<{ stars: number; count: number; total: number }> = ({ stars, count, total }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div className="flex items-center gap-3">
        <div className="w-5 text-sm font-medium text-gray-300">{stars}</div>
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
        <div className="flex-1 h-3 rounded-full bg-gray-700 overflow-hidden shadow-inner">
          <div className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="w-12 text-right text-sm font-medium text-gray-300">{count}</div>
      </div>
    );
  };

  const dist = React.useMemo(() => {
    if (!ratingDistribution) return null as null | Record<number, number>;
    const coerce = (k: number) => Number((ratingDistribution as any)[k] ?? (ratingDistribution as any)[String(k)] ?? 0);
    return { 5: coerce(5), 4: coerce(4), 3: coerce(3), 2: coerce(2), 1: coerce(1) } as Record<number, number>;
  }, [ratingDistribution]);

  const distTotal = React.useMemo(() => {
    if (!dist) return 0;
    return Number(dist[5] + dist[4] + dist[3] + dist[2] + dist[1]) || 0;
  }, [dist]);

  
  const paginatedReviews = React.useMemo(() => {
    const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
    const endIndex = startIndex + REVIEWS_PER_PAGE;
    return allReviews.slice(startIndex, endIndex);
  }, [allReviews, currentPage]);

  const totalPages = React.useMemo(() => {
    return Math.ceil(allReviews.length / REVIEWS_PER_PAGE);
  }, [allReviews.length]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    
    const reviewsSection = document.getElementById('reviews-section');
    if (reviewsSection) {
      reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  
  const userStats = {
    salesCount: totalSales,
    purchasesCount: 0, 
    rating: averageRating || 0,
    balance: 0, 
    joinDate: userData?.joinDate || new Date().toISOString()
  };

  
  
  
  React.useEffect(() => {
    if (showAchievements) {
                }
  }, [showAchievements, userStats, achievements]);

  
  const allAchievements = useAchievements(userStats);

  
  React.useEffect(() => {
    if (showAchievements && allAchievements.length > 0) {
      const localUnlocked = allAchievements.filter(a => a.unlocked);
          }
  }, [showAchievements, allAchievements]);

  
  const achievementsWithStatus = allAchievements.map(achievement => {
    
    const isUnlockedInBackend = achievements.some(a => a.achievementId === achievement.id);
    
    
    
    return {
      ...achievement,
      unlocked: achievement.unlocked || isUnlockedInBackend
    };
  });

  
  React.useEffect(() => {
    if (showAchievements && achievementsWithStatus.length > 0) {
      const finalUnlocked = achievementsWithStatus.filter(a => a.unlocked);
          }
  }, [showAchievements, achievementsWithStatus]);

  
  const unlockedAchievements = achievementsWithStatus.filter(a => a.unlocked);
  const lockedAchievements = achievementsWithStatus.filter(a => !a.unlocked);

  
  const rarityOrder: Record<string, number> = {
    'lendario': 4,
    'epico': 3,
    'raro': 2,
    'comum': 1
  };

  
  const sortUnlocked = [...unlockedAchievements].sort((a, b) => {
    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
  });

  const sortLocked = [...lockedAchievements].sort((a, b) => {
    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
  });

  
  const sortedAchievements = [...sortUnlocked, ...sortLocked];

  
  const ACHIEVEMENTS_PER_PAGE = 10;
  const totalAchievementsPages = Math.ceil(sortedAchievements.length / ACHIEVEMENTS_PER_PAGE);

  
  const startIndex = (achievementsPage - 1) * ACHIEVEMENTS_PER_PAGE;
  const endIndex = startIndex + ACHIEVEMENTS_PER_PAGE;

  
  const paginatedAchievements = sortedAchievements.slice(startIndex, endIndex);

  
  const handleAchievementsPageChange = (newPage: number) => {
    setAchievementsPage(newPage);
    
    const achievementsSection = document.getElementById('achievements-section');
    if (achievementsSection) {
      achievementsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 overflow-x-hidden"
    >
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>

      {loading && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300">Carregando perfil do usuário...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-2xl p-8 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px,minmax(0,1fr)] gap-6 lg:gap-8">
          {}
          <aside className="space-y-6 lg:sticky lg:top-6 self-start">
            {}
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl border border-gray-700 ring-1 ring-white/10 p-8 overflow-hidden shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-1">
                    <div className="w-full h-full rounded-full bg-gray-700 overflow-hidden flex items-center justify-center relative">
                      {userData?.profilePicture || userData?.avatar ? (
                        <img 
                          src={userData.profilePicture || userData.avatar!} 
                          alt={userData?.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-purple-500/30';
                              fallback.innerHTML = `<span class="text-3xl font-bold text-white">${(userData?.name || 'U').charAt(0).toUpperCase()}</span>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-purple-500/30">
                          <span className="text-3xl font-bold text-white select-none">
                            {(userData?.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-800 flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="w-full">
                  <h1 className="text-2xl font-bold text-white mb-1 truncate">{userData?.name || 'Usuário'}</h1>
                  <p className="text-gray-400 text-sm mb-3 truncate">ID: {id}</p>
                  <div className="inline-flex items-center gap-2 text-gray-400 text-sm bg-gray-700/30 rounded-full px-4 py-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Membro desde {userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="text-gray-300 text-sm font-medium">Avaliação</span>
                    </div>
                    <div className="text-yellow-400 text-2xl font-bold">
                      {averageRating && averageRating > 0 ? Number(averageRating).toFixed(1) : '—'}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {renderStars(Number(averageRating || 0))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300 text-sm font-medium">Total de Vendas</span>
                    </div>
                    <div className="text-green-400 text-2xl font-bold">{totalSales}</div>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl border border-gray-700 ring-1 ring-white/10 p-6 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Resumo de avaliações</h3>
                <span className="text-sm text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full">{totalReviews} total</span>
              </div>
              {dist ? (
                <div className="space-y-2">
                  {[5,4,3,2,1].map((s) => (
                    <RatingBar key={s} stars={s} count={dist[s]} total={distTotal || totalReviews} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem avaliações suficientes</p>
              )}
            </div>
          </aside>

          {}
          <section className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl border border-gray-700 ring-1 ring-white/10 p-6 sm:p-8 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2 min-w-0 mb-6">
              <div className="flex items-center gap-3">
                {!showAchievements ? (
                  <>
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">Avaliações ({totalReviews})</h3>
                  </>
                ) : (
                  <>
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <h3 className="text-xl font-bold text-white">Conquistas ({unlockedAchievements.length})</h3>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!showAchievements && <span className="text-gray-400 text-xs">As avaliações são feitas na tela do pedido concluído.</span>}
                <button
                  onClick={() => setShowAchievements(!showAchievements)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all transform hover:scale-105"
                >
                  <span className="text-sm font-medium">{showAchievements ? 'Ver Avaliações' : 'Ver Conquistas'}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAchievements ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div id="reviews-section" className="space-y-4">
              {!showAchievements ? (
                
                reviewsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="ml-2 text-gray-300">Carregando avaliações...</span>
                  </div>
                ) : allReviews.length > 0 ? (
                <>
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="space-y-4"
                  >
                    {paginatedReviews.map((review, index) => (
                      <motion.div
                        key={review._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <ReviewCard review={review} onMarkHelpful={handleMarkHelpful} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {totalPages > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between pt-6 border-t border-gray-700"
                    >
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Anterior
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          Página <span className="text-white font-semibold">{currentPage}</span> de <span className="text-white font-semibold">{totalPages}</span>
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                          {allReviews.length} avaliações
                        </span>
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
                      >
                        Próxima
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </motion.div>
                  )}
                </>
                ) : (
                  <div className="bg-gray-900/40 border border-gray-700/60 rounded-xl p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-white mb-2">Nenhuma avaliação ainda</h4>
                    <p className="text-gray-400">Este usuário ainda não recebeu avaliações. Seja o primeiro a avaliar!</p>
                  </div>
                )
              ) : (
                
                achievementsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                    <span className="ml-2 text-gray-300">Carregando conquistas...</span>
                  </div>
                ) : achievementsWithStatus.length > 0 ? (
                  <div id="achievements-section" className="space-y-6">
                    {}
                    <motion.div
                      key={`achievements-${achievementsPage}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {paginatedAchievements.map((achievement, index) => (
                          <AchievementCard
                            key={achievement.id}
                            name={achievement.name}
                            description={achievement.description}
                            icon={achievement.icon}
                            color={achievement.color}
                            rarity={achievement.rarity}
                            unlocked={achievement.unlocked}
                            index={index}
                          />
                        ))}
                      </div>
                    </motion.div>

                    {}
                    {totalAchievementsPages > 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-between pt-6 border-t border-gray-700"
                      >
                        <button
                          onClick={() => handleAchievementsPageChange(achievementsPage - 1)}
                          disabled={achievementsPage === 1}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Anterior
                        </button>

                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <span className="text-sm text-gray-400">
                            Página <span className="text-white font-semibold">{achievementsPage}</span> de <span className="text-white font-semibold">{totalAchievementsPages}</span>
                          </span>
                          <span className="hidden sm:inline text-gray-500">•</span>
                          <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                            {startIndex + 1}-{Math.min(endIndex, sortedAchievements.length)} de {sortedAchievements.length}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAchievementsPageChange(achievementsPage + 1)}
                          disabled={achievementsPage === totalAchievementsPages}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                        >
                          Próxima
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-900/40 border border-gray-700/60 rounded-xl p-8 text-center">
                    <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-white mb-2">Nenhuma conquista ainda</h4>
                    <p className="text-gray-400">Este usuário ainda não desbloqueou nenhuma conquista.</p>
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      )}

      {}
    </motion.div>
  );
};

export default UserProfilePage;
