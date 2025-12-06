import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, AlertCircle, ChevronDown, DollarSign, Target, GamepadIcon, Clock, FileText, Image, Tag } from 'lucide-react';
import { boostingService } from '../services';
import chatApi from '../services/chatApi';
import { 
  getGameBoostingConfigByName, 
  getDefaultCategory
} from '../config/boostingCategories';
import { useAuth } from '../contexts/AuthContext';
import { PRICE_LIMITS } from '../constants/priceLimits';


const selectStyles = `
  .estimated-time-select {
    max-height: 200px;
    overflow-y: auto;
  }
  .estimated-time-select::-webkit-scrollbar {
    width: 6px;
  }
  .estimated-time-select::-webkit-scrollbar-track {
    background: rgba(55, 65, 81, 0.3);
    border-radius: 3px;
  }
  .estimated-time-select::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.8);
    border-radius: 3px;
  }
  .estimated-time-select::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.8);
  }
  .backdrop-blur-xl form .lg\\:space-y-4 {
    height: 535px;
  }
`;


const GAMES = [
  'Albion Online', 'Apex Legends', 'Black Desert Online', 'Call of Duty',
  'Call of Duty Mobile', 'Clash of Clans', 'Clash Royale', 'Counter-Strike 2',
  'Diablo 4', 'Diablo Immortal', 'Dota 2', 'EA Sports FC', 'eFootball',
  'Elden Ring', 'Escape from Tarkov', 'Fallout 76', 'Final Fantasy XIV',
  'Fortnite', 'Garena Free Fire', 'Genshin Impact', 'Grand Theft Auto 5',
  'Honkai Impact 3rd', 'Honkai: Star Rail', 'League of Legends',
  'League of Legends: Wild Rift', 'Lost Ark', 'Minecraft', 'Mobile Legends',
  'Monster Hunter Now', 'New World', 'Old School RuneScape', 'Overwatch 2',
  'Path of Exile', 'PUBG', 'PUBG Mobile', 'Rainbow Six Siege',
  'Raid: Shadow Legends', 'Roblox', 'Rocket League', 'Rust', 'Sea of Thieves',
  'The Finals', 'Tower of Fantasy', 'Valorant', 'Warframe', 'World of Warcraft',
  'WoW Classic', 'Wuthering Waves', 'Yu-Gi-Oh! Master Duel', 'Zenless Zone Zero'
];


const RANKS_BY_GAME: { [key: string]: string[] } = {
  'Albion Online': ['Iniciante', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Cristal', 'Elite'],
  'Apex Legends': ['Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Prata IV', 'Prata III', 'Prata II', 'Prata I', 'Ouro IV', 'Ouro III', 'Ouro II', 'Ouro I', 'Platina IV', 'Platina III', 'Platina II', 'Platina I', 'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I', 'Mestre', 'Ápice Predador'],
  'Black Desert Online': ['Não Aplicável'],
  'Call of Duty': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Crimson', 'Iridescente', 'Top 250'],
  'Call of Duty Mobile': ['Rookie', 'Veterano', 'Elite', 'Pro', 'Mestre', 'Lendário'],
  'Clash of Clans': ['Liga Bronze', 'Liga Prata', 'Liga Ouro', 'Liga Cristal', 'Liga Mestre', 'Liga Campeão', 'Liga Titã', 'Liga Lenda'],
  'Clash Royale': ['Arena 1-15', 'Liga 1-10', 'Campeão Real', 'Campeão Definitivo'],
  'Counter-Strike 2': ['Prata I', 'Prata II', 'Prata III', 'Prata IV', 'Prata Elite', 'Prata Elite Mestre', 'Ouro Nova I', 'Ouro Nova II', 'Ouro Nova III', 'Ouro Nova Mestre', 'Mestre Guardião I', 'Mestre Guardião II', 'Mestre Guardião Elite', 'Xerife Distinto', 'Águia Lendária', 'Águia Lendária Mestre', 'Mestre Supremo de Primeira Classe', 'Elite Global'],
  'Diablo 4': ['Não Aplicável'],
  'Diablo Immortal': ['Não Aplicável'],
  'Dota 2': ['Arauto', 'Guardião', 'Cruzador', 'Arconte', 'Lenda', 'Anciã', 'Divino', 'Imortal'],
  'EA Sports FC': ['Divisão 10-1', 'Elite', 'Champions'],
  'eFootball': ['Não Aplicável'],
  'Elden Ring': ['Não Aplicável'],
  'Escape from Tarkov': ['Nível 1-10', 'Nível 11-20', 'Nível 21-30', 'Nível 31-40', 'Nível 41-50', 'Nível 50+'],
  'Fallout 76': ['Não Aplicável'],
  'Final Fantasy XIV': ['Não Aplicável'],
  'Fortnite': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Elite', 'Champion', 'Unreal'],
  'Garena Free Fire': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Heroico', 'Grão-Mestre'],
  'Genshin Impact': ['Não Aplicável'],
  'Grand Theft Auto 5': ['Não Aplicável'],
  'Honkai Impact 3rd': ['Não Aplicável'],
  'Honkai: Star Rail': ['Não Aplicável'],
  'League of Legends': ['Ferro IV', 'Ferro III', 'Ferro II', 'Ferro I', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Prata IV', 'Prata III', 'Prata II', 'Prata I', 'Ouro IV', 'Ouro III', 'Ouro II', 'Ouro I', 'Platina IV', 'Platina III', 'Platina II', 'Platina I', 'Esmeralda IV', 'Esmeralda III', 'Esmeralda II', 'Esmeralda I', 'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I', 'Mestre', 'Grão-Mestre', 'Desafiante'],
  'League of Legends: Wild Rift': ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Esmeralda', 'Diamante', 'Mestre', 'Grão-Mestre', 'Desafiante'],
  'Lost Ark': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Grão-Mestre'],
  'Minecraft': ['Não Aplicável'],
  'Mobile Legends': ['Guerreiro', 'Elite', 'Mestre', 'Grão-Mestre', 'Épico', 'Lenda', 'Mítico'],
  'Monster Hunter Now': ['Não Aplicável'],
  'New World': ['Não Aplicável'],
  'Old School RuneScape': ['Não Aplicável'],
  'Overwatch 2': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Grão-Mestre', 'Top 500'],
  'Path of Exile': ['Não Aplicável'],
  'PUBG': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Conqueror'],
  'PUBG Mobile': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Crown', 'Ace', 'Conqueror'],
  'Rainbow Six Siege': ['Cobre', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Champion'],
  'Raid: Shadow Legends': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'],
  'Roblox': ['Não Aplicável'],
  'Rocket League': ['Bronze I-III', 'Prata I-III', 'Ouro I-III', 'Platina I-III', 'Diamante I-III', 'Champion I-III', 'Grand Champion I-III', 'Supersonic Legend'],
  'Rust': ['Não Aplicável'],
  'Sea of Thieves': ['Não Aplicável'],
  'The Finals': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'],
  'Tower of Fantasy': ['Não Aplicável'],
  'Valorant': ['Ferro 1', 'Ferro 2', 'Ferro 3', 'Bronze 1', 'Bronze 2', 'Bronze 3', 'Prata 1', 'Prata 2', 'Prata 3', 'Ouro 1', 'Ouro 2', 'Ouro 3', 'Platina 1', 'Platina 2', 'Platina 3', 'Diamante 1', 'Diamante 2', 'Diamante 3', 'Ascendente 1', 'Ascendente 2', 'Ascendente 3', 'Imortal 1', 'Imortal 2', 'Imortal 3', 'Radiante'],
  'Warframe': ['Não Aplicável'],
  'World of Warcraft': ['Não Aplicável'],
  'WoW Classic': ['Não Aplicável'],
  'Wuthering Waves': ['Não Aplicável'],
  'Yu-Gi-Oh! Master Duel': ['Rookie', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'],
  'Zenless Zone Zero': ['Não Aplicável'],
  'Default': ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Grão-Mestre']
};


const TIME_OPTIONS = [
  '30 minutos',
  '1 hora',
  '2 horas',
  '3 horas',
  '6 horas',
  '12 horas',
  '1 dia',
  '3 dias',
  '7 dias',
  '14 dias',
  '30 dias'
];

interface FormData {
  currentRank: string;
  desiredRank: string;
  minPrice: string;
  game: string;
  boostingCategory: string;
  description: string;
  estimatedTime: string;
  gameMode: string;
  additionalInfo: string;
}

const PostBoostingPage: React.FC = () => {
  const navigate = useNavigate();
  const { } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    currentRank: '',
    desiredRank: '',
    minPrice: '',
    game: '',
    boostingCategory: '',
    description: '',
    estimatedTime: '',
    gameMode: '',
    additionalInfo: '',
  });

  const [errors, setErrors] = useState<Partial<FormData & { accountImage?: string; submit?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showCurrentRankDropdown, setShowCurrentRankDropdown] = useState(false);
  const [showDesiredRankDropdown, setShowDesiredRankDropdown] = useState(false);
  const [showBoostingCategoryDropdown, setShowBoostingCategoryDropdown] = useState(false);
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const closeAllDropdowns = useCallback((except?: string) => {
    if (except !== 'game') setShowGameDropdown(false);
    if (except !== 'currentRank') setShowCurrentRankDropdown(false);
    if (except !== 'desiredRank') setShowDesiredRankDropdown(false);
    if (except !== 'boostingCategory') setShowBoostingCategoryDropdown(false);
    if (except !== 'time') setIsTimeOpen(false);
  }, []);


  const toggleDropdown = useCallback((dropdownType: string) => {
    closeAllDropdowns(dropdownType);
    
    switch (dropdownType) {
      case 'game':
        setShowGameDropdown(prev => !prev);
        break;
      case 'currentRank':
        setShowCurrentRankDropdown(prev => !prev);
        break;
      case 'desiredRank':
        setShowDesiredRankDropdown(prev => !prev);
        break;
      case 'boostingCategory':
        setShowBoostingCategoryDropdown(prev => !prev);
        break;
      case 'time':
        setIsTimeOpen(prev => !prev);
        break;
    }
  }, [closeAllDropdowns]);
  

  const [boostingCategories, setBoostingCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showRankingFields, setShowRankingFields] = useState(true);
  

  const [accountImageFile, setAccountImageFile] = useState<File | null>(null);
  const [accountImagePreview, setAccountImagePreview] = useState<string>('');
  const [accountImageBase64, setAccountImageBase64] = useState<string>('');


  const filteredGames = useMemo(() => {
    if (!gameSearchTerm) return GAMES;
    return GAMES.filter(game =>
      game.toLowerCase().includes(gameSearchTerm.toLowerCase())
    );
  }, [gameSearchTerm]);


  const loadBoostingCategories = useCallback((gameName: string) => {
    const gameConfig = getGameBoostingConfigByName(gameName);
    
    if (!gameConfig) {

      setBoostingCategories([
        { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
        { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false, isDefault: true }
      ]);
      setSelectedCategoryId('rank-boost');
      setShowRankingFields(true);
      return;
    }

    setBoostingCategories(gameConfig.categories);
    

    const defaultCategory = getDefaultCategory(gameConfig.gameId);
    if (defaultCategory) {
      setSelectedCategoryId(defaultCategory.id);
      setFormData(prev => ({ ...prev, boostingCategory: defaultCategory.name }));
      setShowRankingFields(defaultCategory.requiresRanking);
    }
  }, []);


  useEffect(() => {
    if (formData.game) {
      loadBoostingCategories(formData.game);

      setFormData(prev => ({ ...prev, boostingCategory: '' }));
    } else {
      setBoostingCategories([]);
    }
  }, [formData.game]);


  const availableRanks = useMemo(() => {
    return formData.game ? (RANKS_BY_GAME[formData.game] || RANKS_BY_GAME['Default']) : RANKS_BY_GAME['Default'];
  }, [formData.game]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    

    if (name === 'minPrice') {

      const numericValue = value.replace(/[^0-9]/g, '');
      

      if (numericValue.length === 0) {
        setFormData(prev => ({ ...prev, minPrice: '' }));
      } else {

        const cents = parseInt(numericValue, 10);
        const reais = cents / 100;
        

        if (reais > 99999.99) {
          return;
        }
        
        const formattedValue = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(reais);
        setFormData(prev => ({ ...prev, minPrice: formattedValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    

    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleGameSelect = useCallback((game: string) => {
    setFormData(prev => ({ 
      ...prev, 
      game,
      currentRank: '',
      desiredRank: ''
    }));
    setShowGameDropdown(false);
    setGameSearchTerm('');
    if (errors.game) {
      setErrors(prev => ({ ...prev, game: undefined }));
    }
  }, [errors.game]);

  const handleCurrentRankSelect = useCallback((rank: string) => {
    setFormData(prev => ({ ...prev, currentRank: rank }));
    setShowCurrentRankDropdown(false);
    if (errors.currentRank) {
      setErrors(prev => ({ ...prev, currentRank: undefined }));
    }
  }, [errors.currentRank]);

  const handleDesiredRankSelect = useCallback((rank: string) => {
    setFormData(prev => ({ ...prev, desiredRank: rank }));
    setShowDesiredRankDropdown(false);
    if (errors.desiredRank) {
      setErrors(prev => ({ ...prev, desiredRank: undefined }));
    }
  }, [errors.desiredRank]);


  const compressImage = useCallback((file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      const img = new window.Image();
      
      img.onload = () => {

        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    });
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      

      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, accountImage: 'Por favor, selecione apenas arquivos de imagem' }));
        return;
      }
      

      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, accountImage: 'Imagem muito grande. Máximo 10MB' }));
        return;
      }
      
      setAccountImageFile(file);
      

      const previewUrl = URL.createObjectURL(file);
      setAccountImagePreview(previewUrl);
      
      try {

        const compressedBase64 = await compressImage(file);
        

        if (compressedBase64.length > 2.7 * 1024 * 1024) {

          const moreCompressed = await compressImage(file, 600, 450, 0.6);
          setAccountImageBase64(moreCompressed);
        } else {
          setAccountImageBase64(compressedBase64);
        }
        

        if (errors.accountImage) {
          setErrors(prev => ({ ...prev, accountImage: undefined }));
        }
      } catch (error) {
                setErrors(prev => ({ ...prev, accountImage: 'Erro ao processar imagem' }));
      }
    }
  };

  const removeImage = () => {
    setAccountImageFile(null);
    if (accountImagePreview) {
      URL.revokeObjectURL(accountImagePreview);
    }
    setAccountImagePreview('');
    setAccountImageBase64('');
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData & { accountImage?: string }> = {};
    

    if (showRankingFields) {
      if (!formData.currentRank) newErrors.currentRank = 'Patente atual é obrigatória';
      if (!formData.desiredRank) newErrors.desiredRank = 'Patente desejada é obrigatória';
    }
    
    if (!formData.game) newErrors.game = 'Selecione um jogo';
    if (!formData.boostingCategory) newErrors.boostingCategory = 'Categoria de boosting é obrigatória';
    if (!formData.minPrice.trim()) {
      newErrors.minPrice = 'Proposta mínima é obrigatória';
    } else {
      const priceString = formData.minPrice.replace(/[^\d,]/g, '').replace(',', '.');
      const price = parseFloat(priceString);
      if (isNaN(price) || price <= 0) {
        newErrors.minPrice = 'Proposta deve ser um valor positivo';
      } else if (price < PRICE_LIMITS.MIN) {
        newErrors.minPrice = `Valor mínimo permitido é R$ ${PRICE_LIMITS.MIN.toFixed(2).replace('.', ',')}`;
      } else if (price > PRICE_LIMITS.MAX) {
        newErrors.minPrice = `Valor máximo permitido é R$ ${PRICE_LIMITS.MAX.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    if (!accountImageBase64) {
      newErrors.accountImage = 'Foto do perfil da conta é obrigatória';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      
      const base = (chatApi.defaults.baseURL || '').replace(/\/$/, '');
      let uploadedUrl = '';
      if (accountImageBase64) {
        const res = await chatApi.post('/api/uploads/image-base64', {
          conversationId: 'boosting',
          dataUrl: accountImageBase64,
          name: accountImageFile?.name || 'account.jpg'
        });
        const relative = res?.data?.data?.url || '';
        uploadedUrl = relative?.startsWith('http') ? relative : `${base}${relative}`;
      }

      const requestData = {
        currentRank: formData.currentRank,
        desiredRank: formData.desiredRank,
        minPrice: formData.minPrice.replace(/[^\d,]/g, '').replace(',', '.'),
        game: formData.game,
        boostingCategory: formData.boostingCategory,
        accountImage: uploadedUrl,
        description: formData.description,
        estimatedTime: formData.estimatedTime,
        gameMode: formData.gameMode,
        additionalInfo: formData.additionalInfo,
      };
      
      const response = await boostingService.createBoostingRequest(requestData);
      
      if (response.success && response.data?.boosting) {

        navigate('/my-boostings');
      } else {
        throw new Error(response.message || 'Erro ao criar pedido de boosting');
      }
    } catch (error: any) {
            setErrors(prev => ({ 
        ...prev, 
        submit: error.message || 'Ocorreu um erro ao criar o pedido. Tente novamente.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
        delayChildren: 0.1,
        duration: 0.3,
        ease: 'easeOut' as const
      } 
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        duration: 0.2,
        ease: 'easeOut' as const
      }
    }
  };

  const dropdownVariants = {
    hidden: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring' as const,
        stiffness: 500,
        damping: 30,
        mass: 0.8
      }
    },
    exit: { 
      opacity: 0, 
      y: -5, 
      scale: 0.95,
      transition: { duration: 0.15 }
    }
  };

  return (
    <>
      <style>{selectStyles}</style>
      <motion.div
        className="py-6 sm:py-8 px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
      <div className="max-w-6xl mx-auto">
        <motion.div variants={itemVariants} className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
            <Target className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Postar Pedido de Boosting
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            Solicite um serviço de boosting preenchendo as informações abaixo
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden"
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <form onSubmit={handleSubmit}>
              {}
              <div className="mb-6 lg:mb-8">
                <div className="rounded-xl p-4 lg:p-6 border border-gray-700/30 mb-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <GamepadIcon className="w-5 h-5 text-purple-400" />
                    Informações do Jogo
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {}
                  <motion.div variants={itemVariants} className="relative">
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <GamepadIcon className="w-5 h-5 text-purple-400" />
                  Jogo *
                </label>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('game')}
                    className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                      errors.game ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                    }`}
                  >
                    <span className={`text-sm sm:text-base ${formData.game ? 'text-white font-medium' : 'text-gray-400'}`}>
                      {formData.game || 'Selecione um jogo'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      showGameDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  <AnimatePresence mode="wait">
                    {showGameDropdown && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                      >
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Buscar jogo..."
                            value={gameSearchTerm}
                            onChange={(e) => setGameSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-700/80 border border-gray-600/50 rounded-md text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                          {filteredGames.slice(0, 20).map((game) => (
                            <button
                              key={game}
                              type="button"
                              onClick={() => handleGameSelect(game)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-700/80 text-white transition-colors duration-150 flex items-center group"
                            >
                              <GamepadIcon className="w-4 h-4 mr-3 text-gray-400 group-hover:text-purple-400 transition-colors" />
                              <span className="group-hover:text-purple-100 transition-colors">{game}</span>
                            </button>
                          ))}
                          {filteredGames.length > 20 && (
                            <div className="px-4 py-2 text-center text-xs text-gray-400">
                              Exibindo 20 de {filteredGames.length} jogos. Continue digitando para refinar a busca.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {errors.game && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                  >
                    <p className="text-red-400 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.game}
                    </p>
                  </motion.div>
                )}
              </motion.div>

                  {}
                  <motion.div variants={itemVariants} className="relative">
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  Categoria de Boosting *
                </label>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('boostingCategory')}
                    className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                      errors.boostingCategory ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                    } ${!formData.game ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!formData.game}
                  >
                    <span className={`text-sm sm:text-base ${formData.boostingCategory ? 'text-white font-medium' : 'text-gray-400'}`}>
                      {formData.boostingCategory || (formData.game ? 'Selecione uma categoria' : 'Selecione um jogo primeiro')}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      showBoostingCategoryDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  <AnimatePresence mode="wait">
                    {showBoostingCategoryDropdown && boostingCategories.length > 0 && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                      >
                        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                          {boostingCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, boostingCategory: category.name }));
                                setSelectedCategoryId(category.id);
                                setShowRankingFields(category.requiresRanking);
                                setShowBoostingCategoryDropdown(false);
                                setErrors(prev => ({ ...prev, boostingCategory: '' }));
                                

                                if (!category.requiresRanking) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    currentRank: '', 
                                    desiredRank: '',
                                    boostingCategory: category.name
                                  }));
                                }
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-700/80 text-white transition-colors duration-150 flex items-center group ${
                                selectedCategoryId === category.id ? 'bg-purple-600/20 border-l-2 border-purple-500' : ''
                              }`}
                            >
                              <Tag className={`w-4 h-4 mr-3 transition-colors ${
                                selectedCategoryId === category.id 
                                  ? 'text-purple-400' 
                                  : 'text-gray-400 group-hover:text-purple-400'
                              }`} />
                              <span className={`transition-colors ${
                                selectedCategoryId === category.id 
                                  ? 'text-purple-100' 
                                  : 'group-hover:text-purple-100'
                              }`}>
                                {category.name}
                                {category.requiresRanking && (
                                  <span className="ml-2 text-xs text-gray-400">(requer ranking)</span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {errors.boostingCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                  >
                    <p className="text-red-400 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.boostingCategory}
                    </p>
                  </motion.div>
                )}
              </motion.div>

                  {}
                  {showRankingFields && (
                    <div className="space-y-4">
                      {}
                      <motion.div variants={itemVariants} className="relative">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                    <Target className="inline w-4 h-4 mr-2" />
                    Patente Atual *
                  </label>
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => toggleDropdown('currentRank')}
                      className={`w-full px-3 py-2.5 sm:py-3 bg-gray-700/80 backdrop-blur-sm border rounded-lg text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                        errors.currentRank ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600/70 hover:border-gray-500'
                      } ${!formData.game ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!formData.game}
                    >
                      <span className={`text-sm sm:text-base ${formData.currentRank ? 'text-white' : 'text-gray-400'}`}>
                        {formData.currentRank || (formData.game ? 'Selecione sua patente atual' : 'Selecione um jogo primeiro')}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        showCurrentRankDropdown ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    <AnimatePresence mode="wait">
                      {showCurrentRankDropdown && (
                        <motion.div
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                        >
                          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            {availableRanks.slice(0, 15).map((rank) => (
                              <button
                                key={rank}
                                type="button"
                                onClick={() => handleCurrentRankSelect(rank)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-700/80 text-white transition-colors duration-150 flex items-center group"
                              >
                                <Target className="w-4 h-4 mr-3 text-gray-400 group-hover:text-purple-400 transition-colors" />
                                <span className="group-hover:text-purple-100 transition-colors">{rank}</span>
                              </button>
                            ))}
                            {availableRanks.length > 15 && (
                              <div className="px-4 py-2 text-center text-xs text-gray-400">
                                Exibindo 15 primeiros ranks
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {errors.currentRank && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                    >
                      <p className="text-red-400 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {errors.currentRank}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
                  
                      {}
                      <motion.div variants={itemVariants} className="relative">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                    <Target className="inline w-4 h-4 mr-2" />
                    Patente Desejada *
                  </label>
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => toggleDropdown('desiredRank')}
                      className={`w-full px-3 py-2.5 sm:py-3 bg-gray-700/80 backdrop-blur-sm border rounded-lg text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                        errors.desiredRank ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600/70 hover:border-gray-500'
                      } ${!formData.game ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!formData.game}
                    >
                      <span className={`text-sm sm:text-base ${formData.desiredRank ? 'text-white' : 'text-gray-400'}`}>
                        {formData.desiredRank || (formData.game ? 'Selecione a patente desejada' : 'Selecione um jogo primeiro')}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        showDesiredRankDropdown ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    <AnimatePresence mode="wait">
                      {showDesiredRankDropdown && (
                        <motion.div
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                        >
                          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            {availableRanks.slice(0, 15).map((rank) => (
                              <button
                                key={rank}
                                type="button"
                                onClick={() => handleDesiredRankSelect(rank)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-700/80 text-white transition-colors duration-150 flex items-center group"
                              >
                                <Target className="w-4 h-4 mr-3 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                <span className="group-hover:text-purple-100 transition-colors">{rank}</span>
                              </button>
                            ))}
                            {availableRanks.length > 15 && (
                              <div className="px-4 py-2 text-center text-xs text-gray-400">
                                Exibindo 15 primeiros ranks
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {errors.desiredRank && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                    >
                      <p className="text-red-400 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {errors.desiredRank}
                      </p>
                    </motion.div>
                    )}
                  </motion.div>
                </div>
              )}
                  {}
                  <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  Valor Proposto (R$) *
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-400 pointer-events-none font-semibold">
                
                  </div>
                  <input
                    type="text"
                    name="minPrice"
                    value={formData.minPrice}
                    onChange={handleInputChange}
                    placeholder="0,00"
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 text-base font-medium transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                      errors.minPrice ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                    }`}
                  />
                </div>
                {errors.minPrice && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                  >
                    <p className="text-red-400 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.minPrice}
                    </p>
                  </motion.div>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  💡 Digite apenas números. Ex: 5000 = R$ 50,00 (Min: R$ {PRICE_LIMITS.MIN.toFixed(2).replace('.', ',')} - Máx: R$ {PRICE_LIMITS.MAX.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </p>
              </motion.div>

                  </div>
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {}
                <div className="space-y-5">
                  {}
                  <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-400" />
                  Foto do Perfil da Conta *
                </label>
                <div className="relative">
                  <div className="flex items-center justify-center w-full">
                    <label className={`relative flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 group overflow-hidden ${
                      errors.accountImage 
                        ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20' 
                        : accountImagePreview
                        ? 'border-purple-500/50 bg-purple-500/5'
                        : 'border-gray-600/70 bg-gray-700/50 hover:bg-gray-700/80 hover:border-purple-500/50'
                    }`}>
                      {accountImagePreview ? (
                        <motion.div 
                          className="absolute inset-0 flex items-center justify-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <img
                            src={accountImagePreview}
                            alt="Preview da conta"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                              <p className="text-white text-xs font-medium">Clique para alterar</p>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="p-3 rounded-full bg-gray-600/50 group-hover:bg-purple-500/20 transition-all duration-200 mb-3">
                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 group-hover:text-purple-400 transition-colors" />
                          </div>
                          <p className="text-sm sm:text-base text-gray-400 group-hover:text-gray-300 transition-colors text-center">
                            <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG ou JPEG (MAX. 5MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  
                  {accountImagePreview && (
                    <motion.button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all duration-200 shadow-lg z-10"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
                {errors.accountImage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                  >
                    <p className="text-red-400 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.accountImage}
                    </p>
                  </motion.div>
                )}
              </motion.div>

                  {}
                  <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Descrição *
                </label>
                <div className="relative group">
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Descreva detalhes sobre o boosting desejado, preferências, horários disponíveis, etc."
                    className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 resize-none transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-sm ${
                      errors.description ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                    }`}
                  />
                </div>
                {errors.description && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                  >
                    <p className="text-red-400 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.description}
                    </p>
                  </motion.div>
                )}
              </motion.div>

                </div>

                {}
                <div className="space-y-5">
                  {}
                  <div className="space-y-4">
                    {}
                    <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Tempo Estimado Desejado
                  </label>
                  <div
                    className="relative group"
                    tabIndex={0}
                    onBlur={() => setIsTimeOpen(false)}
                  >
                    <input type="hidden" name="estimatedTime" value={formData.estimatedTime} />
                    <button
                      type="button"
                      onClick={() => toggleDropdown('time')}
                      className={`w-full px-3 py-2.5 sm:py-3 bg-gray-700/80 backdrop-blur-sm border rounded-lg text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                        'border-gray-600/70 hover:border-gray-500'
                      }`}
                    >
                      <span className={`text-sm ${formData.estimatedTime ? 'text-white' : 'text-gray-400'}`}>
                        {formData.estimatedTime || 'Selecione o tempo estimado'}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isTimeOpen ? 'rotate-180' : ''
                      }`} />
                    </button>

                    <AnimatePresence mode="wait">
                      {isTimeOpen && (
                        <motion.div
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                        >
                          <div className="max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            {TIME_OPTIONS.map((opt) => (
                              <motion.button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, estimatedTime: opt }));
                                  setIsTimeOpen(false);
                                }}
                                className={`w-full px-4 h-12 text-left hover:bg-gray-700/80 text-white transition-all duration-150 flex items-center group ${
                                  formData.estimatedTime === opt ? 'bg-purple-600/20 border-l-2 border-purple-500' : ''
                                }`}
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <Clock className={`w-4 h-4 mr-3 transition-colors ${
                                  formData.estimatedTime === opt ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-400'
                                }`} />
                                <span className={`transition-colors ${
                                  formData.estimatedTime === opt ? 'text-purple-100' : 'group-hover:text-purple-100'
                                }`}>
                                  {opt}
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200" />
                  </div>
                </motion.div>

                    {}
                    <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <GamepadIcon className="w-4 h-4 text-gray-400" />
                    Modo de Jogo
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="gameMode"
                      value={formData.gameMode}
                      onChange={handleInputChange}
                      placeholder="Ex: Solo/Duo, Ranked, etc."
                      className="w-full px-3 py-2.5 sm:py-3 bg-gray-700/80 backdrop-blur-sm border border-gray-600/70 rounded-lg text-white placeholder-gray-400 text-sm transition-all duration-200 hover:bg-gray-700 hover:border-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200" />
                  </div>
                    </motion.div>
                  </div>

                  {}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      Informações Adicionais
                    </label>
                    <div className="relative group">
                      <textarea
                        name="additionalInfo"
                        value={formData.additionalInfo}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Qualquer informação adicional relevante para o boosting..."
                        className="w-full px-3 py-2.5 sm:py-3 bg-gray-700/80 backdrop-blur-sm border border-gray-600/70 rounded-lg text-white placeholder-gray-400 resize-none transition-all duration-200 hover:bg-gray-700 hover:border-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-sm"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200" />
                    </div>
                  </motion.div>
                </div>
              </div>

              {}
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-900/20 border border-red-700/30 rounded-xl backdrop-blur-sm mt-6"
                >
                  <p className="text-red-400 flex items-center text-sm sm:text-base">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {errors.submit}
                  </p>
                </motion.div>
              )}

              {}
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-gray-700/50"
              >
                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-sm sm:text-base font-semibold text-center uppercase tracking-wide">
                    ⚠️ Caso nenhum lance for aceito em até 3 dias o pedido de boosting vai ser excluído.
                  </p>
                </div>
              </motion.div>

              {}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 mt-4">
                <motion.button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-6 py-3.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded-xl text-white font-semibold transition-all duration-200 flex items-center justify-center text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancelar
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-semibold transition-all duration-200 flex items-center justify-center text-base shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Criando Pedido...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Criar Pedido de Boosting
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </div>
    </motion.div>
    </>
  );
};

export default PostBoostingPage;
