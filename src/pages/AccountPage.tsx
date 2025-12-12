import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Star, 
  Shield, 
  Edit3,
  Camera,
  Wallet,
  TrendingUp,
  Award,
  ShoppingBag,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/ui/Modal';
import { formatCurrency } from '../utils/currency';
import { initiateGoogleLogin } from '../services/googleAuthService';
import ProfilePhotoUpload from '../components/ProfilePhotoUpload';
import EditProfileForm from '../components/EditProfileForm';
import walletService from '../services/walletService';
import purchaseService from '../services/purchaseService';
import { getReceivedReviews } from '../services/reviewService';
import { useAchievements } from '../hooks/useAchievements';
import { useAchievementsSync } from '../hooks/useAchievementsSync';
import AchievementCard from '../components/AchievementCard';

const AccountPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [totalPurchasesCount, setTotalPurchasesCount] = useState<number | null>(null);
  const [totalSalesCount, setTotalSalesCount] = useState<number | null>(null);
  
  // Estados para vincular Google (similar ao AuthModal)
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  useEffect(() => {
  }, [user]);

  
  useEffect(() => {
    let active = true;
    const loadRating = async () => {
      if (!user) return;

      
      let initial = 0;
      if (typeof user.rating === 'number') initial = Number(user.rating) || 0;
      else if (typeof (user as any).rating === 'object' && (user as any).rating && 'average' in (user as any).rating) initial = Number((user as any).rating.average) || 0;
      if (active) setUserRating(initial);

      
      try {
        const idCandidate = (user as any)?.userid || (user as any)?._id || '';
        if (!idCandidate && !user.email) return;
        const data = await getReceivedReviews(String(idCandidate || 'alias'), 1, 1, { email: user.email });
        if (!active) return;
        const avg = Number((data as any)?.stats?.average ?? 0);
        if (!Number.isNaN(avg) && avg >= 0) setUserRating(Number(avg.toFixed(1)));
      } catch (_) {  }
    };
    loadRating();
    return () => { active = false; };
  }, [user]);

  
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
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
      } catch (_) {
        
      }
    };
    if (user) loadStats();
    return () => { active = false; };
  }, [user]);

  // Função para vincular conta Google
  const handleLinkGoogle = async () => {
    if (!user?.email) {
      setLinkError('Email não encontrado');
      setTimeout(() => setLinkError(''), 3000);
      return;
    }

    setIsLinkingGoogle(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const response = await initiateGoogleLogin();
      
      if (response.success && response.user) {
        // O callback do OAuth já vinculou a conta automaticamente!
        const googleEmail = response.user.email || response.email;
        const googleId = response.user.googleId;
        
        if (!googleId) {
          setLinkError('Erro ao obter dados do Google');
          setTimeout(() => setLinkError(''), 5000);
          setIsLinkingGoogle(false);
          return;
        }
        
        if (googleEmail?.toLowerCase() !== user.email.toLowerCase()) {
          setLinkError('Email do Google deve ser o mesmo');
          setTimeout(() => setLinkError(''), 5000);
          setIsLinkingGoogle(false);
          return;
        }

        setLinkSuccess('Conta vinculada com sucesso!');
        
        if (response.user && googleId) {
          updateUser(response.user);
        }
        
        // Aguarda um pouco para mostrar a mensagem de sucesso e depois limpa estados
        setTimeout(() => {
          setLinkSuccess('');
          setIsLinkingGoogle(false);
        }, 2000);
      } else if (response.needsAdditionalInfo) {
        setLinkError('Conta Google já existe');
        setTimeout(() => setLinkError(''), 5000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao vincular conta';
      setLinkError(errorMsg);
      setTimeout(() => setLinkError(''), 5000);
      setIsLinkingGoogle(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Acesso negado</h2>
          <p className="text-gray-400">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

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

  const stats = [
    {
      label: 'Saldo Atual',
      value: formatCurrency(balanceValue, true),
      icon: Wallet,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20'
    },
    {
      label: 'Total de Compras',
      value: purchasesCount.toString(),
      icon: ShoppingBag,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20'
    },
    {
      label: 'Total de Vendas',
      value: salesCount.toString(),
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20'
    },
    {
      label: 'Avaliação',
      value: userRating > 0 ? userRating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20'
    }
  ];

  
  const userStats = {
    salesCount,
    purchasesCount,
    rating: userRating,
    balance: balanceValue,
    joinDate: user.joinDate || new Date().toISOString()
  };

  
  const {
    backendAchievements
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

  
  const unlockedAchievements = achievementsWithBackend.filter(a => a.unlocked);
  const achievementStats = {
    unlocked: unlockedAchievements.length,
    total: achievementsWithBackend.length,
    percentage: Math.round((unlockedAchievements.length / achievementsWithBackend.length) * 100),
    byRarity: {
      comum: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'comum').length,
      raro: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'raro').length,
      epico: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'epico').length,
      lendario: achievementsWithBackend.filter(a => a.unlocked && a.rarity === 'lendario').length
    }
  };

  
  const lockedAchievements = achievementsWithBackend.filter(a => !a.unlocked);
  const nextToUnlock = lockedAchievements
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))
    .slice(0, 6);


  return (
    <div className="space-y-6 lg:space-y-8 pb-8">
      {/* Modals */}
      <Modal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)}>
        <ProfilePhotoUpload onClose={() => setIsPhotoModalOpen(false)} />
      </Modal>
      
      <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)}>
        <EditProfileForm onClose={() => setIsEditProfileModalOpen(false)} />
      </Modal>

      {/* Hero Profile Section - Design Único */}
      <div className="electric-border rounded-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[22px]"
        >
          {/* Background com gradiente animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.3),transparent_50%)]" />
          </div>
          
          {/* Padrão de pontos decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full" />
            <div className="absolute top-20 right-20 w-3 h-3 bg-purple-400 rounded-full" />
            <div className="absolute bottom-10 left-1/3 w-2 h-2 bg-blue-400 rounded-full" />
            <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-pink-400 rounded-full" />
          </div>

          {/* Conteúdo */}
          <div className="relative backdrop-blur-xl bg-gray-900/45 border border-gray-800/60 rounded-[18px] p-6 sm:p-8 lg:p-10 shadow-[0_10px_60px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
            {/* Avatar com efeito glassmorphism */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
              
              {/* Avatar principal */}
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 rounded-full flex items-center justify-center p-1">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    {(user.profilePicture || user.avatar) ? (
                      <img
                        src={user.profilePicture || user.avatar!}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-14 h-14 sm:w-16 sm:h-16 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* Botão de camera com animação */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute bottom-1 right-1 w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-900 hover:shadow-purple-500/50 transition-all duration-300"
                  aria-label="Alterar foto de perfil"
                >
                  <Camera className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </motion.div>
            
            {/* Info do usuário */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 text-center lg:text-left w-full"
            >
              {/* Nome e badge */}
              <div className="flex flex-col lg:flex-row items-center lg:items-center gap-3 mb-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  {user.name}
                </h1>
                {user.isVerified && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-full backdrop-blur-sm"
                  >
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-semibold">Verificado</span>
                  </motion.div>
                )}
              </div>
              
              {/* Detalhes em cards mini */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-full">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-full">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">
                    Desde {new Date(user.joinDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              
              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-semibold text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar Perfil
                </motion.button>

                {/* Botão Vincular Google OU Badge de vinculado */}
                {(user as any)?.googleId ? (
                  // Badge quando já está vinculado
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-green-400 font-semibold text-sm">
                      Conta vinculada ao Google
                    </span>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </motion.div>
                ) : (
                  // Botão quando não está vinculado
                  <motion.button
                    whileHover={{ scale: (isLinkingGoogle || linkError || linkSuccess) ? 1 : 1.02 }}
                    whileTap={{ scale: (isLinkingGoogle || linkError || linkSuccess) ? 1 : 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={handleLinkGoogle}
                    disabled={isLinkingGoogle || !!linkError || !!linkSuccess}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition-colors duration-200 disabled:cursor-not-allowed ${
                      linkError
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : linkSuccess
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-white text-gray-900 hover:bg-gray-100 hover:shadow-xl'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {isLinkingGoogle ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Vinculando...</span>
                        </motion.div>
                      ) : linkError ? (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>{linkError}</span>
                        </motion.div>
                      ) : linkSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{linkSuccess}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <span>Vincular ao Google</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
      </div>

      {/* Stats Grid - Cards Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative"
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              
              {/* Card principal */}
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 lg:p-6 overflow-hidden">
                {/* Padrão decorativo */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
                
                <div className="relative z-10">
                  {/* Ícone com animação */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${stat.bgColor} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  
                  {/* Label */}
                  <p className="text-gray-400 text-sm font-medium mb-2">{stat.label}</p>
                  
                  {/* Valor */}
                  <p className={`text-3xl lg:text-4xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Se\u00e7\u00e3o de Conquistas - Design Moderno */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative group"
      >
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
        
        {/* Card principal com glassmorphism */}
        <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 lg:p-8 overflow-hidden">
          {/* Padr\u00e3o decorativo de fundo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-tr-full" />
          
          <div className="relative z-10">
            {/* Cabe\u00e7alho da se\u00e7\u00e3o */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-900/20 rounded-xl group-hover:scale-105 transition-transform duration-300">
                  <Award className="w-7 h-7 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-1">
                    Conquistas
                  </h3>
                  <p className="text-sm text-gray-400 font-medium">Acompanhe seu progresso e desbloqueie recompensas</p>
                </div>
              </div>
              {/* Stats de progresso */}
              <div className="flex items-center gap-6">
                <div className="text-center lg:text-right">
                  <p className="text-4xl font-bold text-yellow-400">
                    {achievementStats.unlocked}
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-1">de {achievementStats.total} conquistas</p>
                </div>
                
                {/* C\u00edrculo de progresso animado */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                  
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700/50 shadow-xl flex items-center justify-center">
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
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - achievementStats.percentage / 100)}`}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    <div className="relative z-10 flex flex-col items-center">
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {achievementStats.percentage}%
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                        Completo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de raridade */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/50 rounded-xl p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-gray-300">{achievementStats.byRarity.comum}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Comuns</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/50 rounded-xl p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-blue-400">{achievementStats.byRarity.raro}</p>
                <p className="text-xs text-blue-500 font-medium mt-1">Raras</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/50 rounded-xl p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-purple-400">{achievementStats.byRarity.epico}</p>
                <p className="text-xs text-purple-500 font-medium mt-1">Epicas</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/50 rounded-xl p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-yellow-400">{achievementStats.byRarity.lendario}</p>
                <p className="text-xs text-yellow-500 font-medium mt-1">Lendarias</p>
              </motion.div>
            </div>

            {/* Lista de conquistas */}
            {unlockedAchievements.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Conquistas Desbloqueadas ({unlockedAchievements.length})
                  </h4>
                  <a
                    href="/achievements"
                    className="text-purple-400 hover:text-purple-300 text-sm font-semibold flex items-center gap-1 transition-colors"
                  >
                    Ver todas
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unlockedAchievements.slice(0, 6).map((achievement, index) => (
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
                {unlockedAchievements.length > 6 && (
                  <p className="text-sm text-gray-400 mt-4 text-center font-medium">
                    + {unlockedAchievements.length - 6} conquistas desbloqueadas
                  </p>
                )}
              </div>
            ) : (
              nextToUnlock.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-400" />
                      Próximas Conquistas
                    </h4>
                    <a
                      href="/achievements"
                      className="text-purple-400 hover:text-purple-300 text-sm font-semibold flex items-center gap-1 transition-colors"
                    >
                      Ver todas
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nextToUnlock.slice(0, 6).map((achievement, index) => (
                      <AchievementCard
                        key={achievement.id}
                        name={achievement.name}
                        description={achievement.description}
                        icon={achievement.icon}
                        color={achievement.color}
                        rarity={achievement.rarity}
                        unlocked={false}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountPage;