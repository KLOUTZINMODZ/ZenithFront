import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Target,
  Trophy,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AchievementCard from '../components/AchievementCard';
import { useAchievements } from '../hooks/useAchievements';
import { useAchievementsSync } from '../hooks/useAchievementsSync';
import walletService from '../services/walletService';
import purchaseService from '../services/purchaseService';
import { getReceivedReviews } from '../services/reviewService';

const AchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<number>(0);
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [totalPurchasesCount, setTotalPurchasesCount] = useState<number | null>(null);
  const [totalSalesCount, setTotalSalesCount] = useState<number | null>(null);
  
  
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  
  useEffect(() => {
    let active = true;
    
    const fetchUserData = async () => {
      if (!user) return;

      try {
        
        const idCandidate = (user as any)?.userid || (user as any)?._id || '';
        if (idCandidate || user.email) {
          const reviewsData = await getReceivedReviews(String(idCandidate || 'alias'), 1, 1, { email: user.email });
          if (active) {
            const avg = Number((reviewsData as any)?.stats?.average ?? 0);
            if (!Number.isNaN(avg) && avg >= 0) {
              setUserRating(Number(avg.toFixed(1)));
            }
          }
        }

        
        const [wallet, purchases, sales] = await Promise.all([
          walletService.getWallet(1, 1),
          purchaseService.list({ type: 'purchases', page: 1, limit: 1 }),
          purchaseService.list({ type: 'sales', page: 1, limit: 1 })
        ]);
        
        if (!active) return;
        
        const bal = Number(wallet?.data?.balance ?? 0);
        const pCount = Number(purchases?.data?.pagination?.total ?? 0);
        const sCount = Number(sales?.data?.pagination?.total ?? 0);
        
        setRealBalance(bal);
        setTotalPurchasesCount(pCount);
        setTotalSalesCount(sCount);
      } catch (error) {
              }
    };

    fetchUserData();
    return () => { active = false; };
  }, [user]);

  
  const safeUser: any = user || {};
  const balanceValue = typeof realBalance === 'number'
    ? realBalance
    : Number(safeUser.balance ?? safeUser.walletBalance ?? 0);
  const purchasesCount = typeof totalPurchasesCount === 'number'
    ? totalPurchasesCount
    : Number(safeUser.totalPurchases ?? 0);
  const salesCount = typeof totalSalesCount === 'number'
    ? totalSalesCount
    : Number(safeUser.totalSales ?? 0);

  
  const userStats = {
    salesCount,
    purchasesCount,
    rating: userRating,
    balance: balanceValue,
    joinDate: user?.joinDate || new Date().toISOString()
  };

  
  const {
    backendAchievements,
  } = useAchievementsSync(salesCount, purchasesCount, userRating, balanceValue);

  
  const achievements = useAchievements(userStats);
  
  
  const achievementsWithBackend = achievements.map(achievement => {
    const isUnlockedInBackend = backendAchievements?.unlocked?.some(
      u => u.achievementId === achievement.id
    );
    return {
      ...achievement,
      unlocked: achievement.unlocked || isUnlockedInBackend || false
    };
  });

  
  const unlockedCount = achievementsWithBackend.filter(a => a.unlocked).length;
  const totalCount = achievementsWithBackend.length;
  const percentage = Math.round((unlockedCount / totalCount) * 100);
  
  const achievementStatsByRarity = {
    comum: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'comum').length,
    raro: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'raro').length,
    epico: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'epico').length,
    lendario: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'lendario').length
  };

  
  const filteredAchievements = achievementsWithBackend.filter(achievement => {
    
    if (categoryFilter !== 'all' && achievement.category !== categoryFilter) {
      return false;
    }

    
    if (rarityFilter !== 'all' && achievement.rarity !== rarityFilter) {
      return false;
    }

    
    if (statusFilter === 'unlocked' && !achievement.unlocked) {
      return false;
    }
    if (statusFilter === 'locked' && achievement.unlocked) {
      return false;
    }

    return true;
  });

  
  const unlockedAchievements = filteredAchievements.filter(a => a.unlocked);
  const lockedAchievements = filteredAchievements.filter(a => !a.unlocked)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0));

  
  const categories = [
    { value: 'all', label: 'Todas' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'compras', label: 'Compras' },
    { value: 'avaliacao', label: 'Avaliação' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'especial', label: 'Especial' }
  ];

  const rarities = [
    { value: 'all', label: 'Todas' },
    { value: 'comum', label: 'Comum' },
    { value: 'raro', label: 'Raro' },
    { value: 'epico', label: 'Épico' },
    { value: 'lendario', label: 'Lendário' }
  ];

  const statuses = [
    { value: 'all', label: 'Todas' },
    { value: 'unlocked', label: 'Desbloqueadas' },
    { value: 'locked', label: 'Bloqueadas' }
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 lg:space-y-8 pb-8">
      {/* Hero Header com gradiente */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Background com gradiente animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-amber-600/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.3),transparent_50%)]" />
        </div>
        
        {/* Padrão de pontos decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full" />
          <div className="absolute top-20 right-20 w-3 h-3 bg-yellow-400 rounded-full" />
          <div className="absolute bottom-10 left-1/3 w-2 h-2 bg-orange-400 rounded-full" />
          <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-amber-400 rounded-full" />
        </div>

        {/* Conteúdo */}
        <div className="relative backdrop-blur-xl bg-gray-900/40 border border-gray-700/50 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 via-orange-600 to-amber-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-500 via-orange-500 to-amber-500 rounded-full flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                  <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-2">
                Conquistas
              </h1>
              <p className="text-sm sm:text-base text-gray-300">
                Desbloqueie conquistas e mostre seu progresso na plataforma
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Card de Progresso com Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative group"
      >
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
        
        <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 lg:p-8 overflow-hidden">
          {/* Padrão decorativo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-500/5 to-transparent rounded-tr-full" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Círculo de progresso */}
            <div className="flex items-center gap-4">
              <div className="relative group/circle">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-xl opacity-30 group-hover/circle:opacity-50 transition-opacity duration-500" />
                
                <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700/50 shadow-xl flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-gray-700/30"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                      className="transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                      {percentage}%
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      Completo
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-3xl lg:text-4xl font-bold text-yellow-400">
                  {unlockedCount}
                </p>
                <p className="text-sm text-gray-400 font-medium mt-1">de {totalCount} conquistas</p>
              </div>
            </div>

            {/* Cards de raridade */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 flex-1 w-full md:w-auto">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/50 rounded-xl p-3 lg:p-4 text-center backdrop-blur-sm"
              >
                <p className="text-xl lg:text-2xl font-bold text-gray-300">{achievementStatsByRarity.comum}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Comuns</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/50 rounded-xl p-3 lg:p-4 text-center backdrop-blur-sm"
              >
                <p className="text-xl lg:text-2xl font-bold text-blue-400">{achievementStatsByRarity.raro}</p>
                <p className="text-xs text-blue-500 font-medium mt-1">Raras</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/50 rounded-xl p-3 lg:p-4 text-center backdrop-blur-sm"
              >
                <p className="text-xl lg:text-2xl font-bold text-purple-400">{achievementStatsByRarity.epico}</p>
                <p className="text-xs text-purple-500 font-medium mt-1">Épicas</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/50 rounded-xl p-3 lg:p-4 text-center backdrop-blur-sm"
              >
                <p className="text-xl lg:text-2xl font-bold text-yellow-400">{achievementStatsByRarity.lendario}</p>
                <p className="text-xs text-yellow-500 font-medium mt-1">Lendárias</p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Botão de Filtros Melhorado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800/90 to-gray-900/90 hover:from-gray-700/90 hover:to-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-xl text-white transition-all duration-300 shadow-lg w-full md:w-auto"
        >
          <Filter className="w-5 h-5 text-purple-400" />
          <span className="font-semibold">Filtros</span>
          <ChevronDown className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                  {/* Categoria */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Categoria
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Raridade */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Raridade
                    </label>
                    <select
                      value={rarityFilter}
                      onChange={(e) => setRarityFilter(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      {rarities.map(rar => (
                        <option key={rar.value} value={rar.value}>{rar.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      {statuses.map(stat => (
                        <option key={stat.value} value={stat.value}>{stat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Conquistas Desbloqueadas */}
      {unlockedAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-green-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 lg:p-8 overflow-hidden">
            {/* Padrão decorativo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full" />
            
            <div className="relative z-10">
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-900/20 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-400" />
                </div>
                Conquistas Desbloqueadas ({unlockedAchievements.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unlockedAchievements.map((achievement, index) => (
                  <AchievementCard
                    key={achievement.id}
                    name={achievement.name}
                    description={achievement.description}
                    icon={achievement.icon}
                    color={achievement.color}
                    rarity={achievement.rarity}
                    unlocked={true}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Próximas Conquistas */}
      {lockedAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative group"
        >
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 lg:p-8 overflow-hidden">
            {/* Padrão decorativo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            
            <div className="relative z-10">
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
                Próximas Conquistas ({lockedAchievements.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lockedAchievements.map((achievement, index) => (
                  <AchievementCard
                    key={achievement.id}
                    name={achievement.name}
                    description={achievement.description}
                    icon={achievement.icon}
                    color={achievement.color}
                    rarity={achievement.rarity}
                    unlocked={false}
                    progress={achievement.progress}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Estado Vazio */}
      {filteredAchievements.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12 text-center overflow-hidden">
            {/* Padrão decorativo */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-gray-500/5 to-transparent rounded-bl-full" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-gray-400 mb-3">
                Nenhuma conquista encontrada
              </h3>
              <p className="text-gray-500 text-sm lg:text-base">
                Tente ajustar os filtros para ver mais conquistas
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AchievementsPage;
