import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, X, Check, AlertCircle, 
  ChevronDown, Tag, GamepadIcon, Layers, FileText, Package, Image as ImageIcon, Lock
} from 'lucide-react';
import { marketplaceService } from '../services';
import { PRICE_LIMITS } from '../constants/priceLimits';
import imageUploadService from '../services/imageUploadService';
import chatApi from '../services/chatApi';
import Button from '../components/ui/Button';
import AutomaticDeliveryForm from '../components/AutomaticDeliveryForm';

const CATEGORIES = [
  { id: 'account', name: 'Conta' },
  { id: 'item', name: 'Item' },
  { id: 'skin', name: 'Skin' },
  { id: 'other', name: 'Outro' },
];


const GAMES = [
  'Albion Online', 'Apex Legends', 'Black Desert Online', 'Call of Duty',
  'Call of Duty Mobile', 'Clash of Clans', 'Clash Royale', 'Counter-Strike 2',
  'Diablo 4', 'Diablo Immortal', 'Dota 2', 'EA Sports FC', 'eFootball',
  'Elden Ring', 'Escape from Tarkov', 'Fallout 76', 'Final Fantasy XIV',
  'Fortnite', 'Garena Free Fire', 'Genshin Impact', 'Grand Theft Auto 5',
  'Honkai Impact 3rd', 'Honkai: Star Rail', 'League of Legends',
  'League of Legends: Wild Rift', 'Lost Ark', 'Minecraft', 'Mobile Legends',
  'Monster Hunter Now', 'New World', 'Old School RuneScape', 'Overwatch 2',
  'Path of Exile', 'PUBG', 'PUBG Mobile', 'Rainbow Six Siege X',
  'Raid: Shadow Legends', 'Roblox', 'Rocket League', 'Rust', 'Sea of Thieves',
  'The Finals', 'Tower of Fantasy', 'Valorant', 'Warframe', 'World of Warcraft',
  'WoW Classic', 'Wuthering Waves', 'Yu-Gi-Oh! Master Duel', 'Zenless Zone Zero'
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

const calculateDiscountSummary = (originalRaw?: string, finalRaw?: string) => {
  const original = parseFloat(originalRaw || '');
  const final = parseFloat(finalRaw || '');
  const validOriginal = !Number.isNaN(original) && original > 0;
  const validFinal = !Number.isNaN(final) && final > 0;

  if (!validOriginal || !validFinal || final >= original) {
    return {
      savings: 0,
      percent: 0,
      percentString: ''
    };
  }

  const rawSavings = original - final;
  const rawPercent = (rawSavings / original) * 100;
  const percent = Math.max(0, Math.min(95, Math.round(rawPercent)));

  return {
    savings: rawSavings,
    percent,
    percentString: percent > 0 ? percent.toString() : ''
  };
};

const MAX_TAGS = 5;
const splitTags = (raw: string) => raw
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean);

interface FormData {
  title: string;
  game: string;
  category: string;
  subcategory?: string;
  condition: string;
  originalPrice: string;
  price: string;
  discount: string;
  description: string;
  stock?: string; 
  deliveryMethod: 'manual' | 'automatic';
  deliveryInstructions: string;
  tags: string;
  attributes: {
    plataforma: string;
    entrega: string;
    idioma: string;
  };
  status: 'active' | 'draft' | 'archived';
  isFeatured: boolean;
  isHighlighted: boolean;
  detached: boolean;
  automaticDeliveryCredentials?: {
    loginPlatform: string;
    accountName: string;
    email: string;
    password: string;
    vendorNotes?: string;
  };
}

type AttributeField = 'attributes.plataforma' | 'attributes.entrega' | 'attributes.idioma';
type InputName = keyof FormData | AttributeField;
type FormErrors = Partial<Record<InputName | 'images' | 'submit' | 'deliveryMethod' | 'automaticDeliveryCredentials', string>>;

const ATTRIBUTE_FIELDS: AttributeField[] = ['attributes.plataforma', 'attributes.entrega', 'attributes.idioma'];
const ATTRIBUTE_FIELD_MAP: Record<AttributeField, keyof FormData['attributes']> = {
  'attributes.plataforma': 'plataforma',
  'attributes.entrega': 'entrega',
  'attributes.idioma': 'idioma'
};
const BOOLEAN_FIELDS: Array<'isFeatured' | 'isHighlighted' | 'detached'> = ['isFeatured', 'isHighlighted', 'detached'];

const SUBCATEGORIES = ['Padrão', 'Competitivo', 'Casual', 'Evento Especial'];
const CONDITIONS = [
  { id: 'new', label: 'Novo' },
  { id: 'used', label: 'Usado' }
];
const STATUSES: Array<FormData['status']> = ['active', 'draft', 'archived'];
const DELIVERY_OPTIONS: Array<{ id: FormData['deliveryMethod']; title: string; description: string }> = [
  {
    id: 'automatic',
    title: 'Entrega Automática',
    description: 'Credenciais criptografadas entregues automaticamente após compra (apenas para contas)'
  },
  {
    id: 'manual',
    title: 'Entrega manual',
    description: 'Você combina diretamente com o comprador como e quando entregar.'
  }
];

const DELIVERY_INSTRUCTION_DEFAULTS: Record<FormData['deliveryMethod'], string> = {
  automatic: 'Credenciais entregues automaticamente após confirmação da compra.',
  manual: 'Combine com o comprador data, horário e etapas da entrega manual. Compartilhe informações essenciais para concluir o envio com segurança.'
};

const getDefaultDeliveryInstructions = (method: FormData['deliveryMethod']) =>
  DELIVERY_INSTRUCTION_DEFAULTS[method] || '';

interface ClonedItemPrefill {
  title?: string;
  game?: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  price?: string;
  discount?: string;
  originalPrice?: string;
  description?: string;
}

interface LocationState {
  clonedItem?: ClonedItemPrefill;
}

const NewServicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation<LocationState>();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    game: '',
    category: '',
    subcategory: '',
    condition: '',
    originalPrice: '',
    price: '',
    discount: '',
    description: '',
    stock: '',
    deliveryMethod: 'automatic',
    deliveryInstructions: getDefaultDeliveryInstructions('automatic'),
    tags: '',
    attributes: {
      plataforma: '',
      entrega: '',
      idioma: ''
    },
    status: 'active',
    isFeatured: false,
    isHighlighted: false,
    detached: false
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [imageBase64Data, setImageBase64Data] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [filteredGames, setFilteredGames] = useState<string[]>(GAMES);
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [displayOriginalPrice, setDisplayOriginalPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [prefillApplied, setPrefillApplied] = useState(false);

  const applyPriceChanges = useCallback((updates: Partial<Pick<FormData, 'price' | 'originalPrice'>>) => {
    setFormData((prev: FormData) => {
      const next: FormData = { ...prev, ...updates };
      const summary = calculateDiscountSummary(next.originalPrice, next.price);
      const discountString = summary.percentString;
      if (
        next.price === prev.price &&
        next.originalPrice === prev.originalPrice &&
        (next.discount || '') === (discountString || '')
      ) {
        return prev;
      }
      next.discount = discountString;
      return next;
    });
  }, []);

  const handleCurrencyValueChange = useCallback(
    (rawValue: string, field: 'price' | 'originalPrice', setDisplay: (value: string) => void) => {
      const digits = rawValue.replace(/[^0-9]/g, '');
      if (!digits) {
        setDisplay('');
        applyPriceChanges({ [field]: '' } as Partial<FormData>);
      } else {
        const cents = parseInt(digits, 10);
        if (!Number.isNaN(cents)) {
          const reais = Math.min(cents / 100, 99999.99);
          setDisplay(formatCurrency(reais));
          applyPriceChanges({ [field]: reais.toString() } as Partial<FormData>);
        }
      }
      setErrors(prev => ({ ...prev, [field]: undefined }));
    },
    [applyPriceChanges]
  );

  const pricingSummary = useMemo(() => calculateDiscountSummary(formData.originalPrice, formData.price), [formData.originalPrice, formData.price]);
  const hasSavings = pricingSummary.savings > 0 && pricingSummary.percent > 0;

  useEffect(() => {
    if (prefillApplied) return;
    const clonedItem = location.state?.clonedItem;

    if (!clonedItem) return;

    const parsedPrice = clonedItem.price ? parseFloat(clonedItem.price) : NaN;
    const parsedOriginalFromClone = clonedItem.originalPrice ? parseFloat(clonedItem.originalPrice) : NaN;
    const parsedDiscount = clonedItem.discount ? parseFloat(clonedItem.discount) : NaN;

    setFormData((prev: FormData) => {
      const next: FormData = { ...prev };

      if (clonedItem.title) next.title = clonedItem.title;
      if (clonedItem.game) next.game = clonedItem.game;
      if (clonedItem.category) next.category = clonedItem.category;
      if (clonedItem.subcategory) next.subcategory = clonedItem.subcategory;
      if (clonedItem.condition) next.condition = clonedItem.condition;
      if (clonedItem.description) next.description = clonedItem.description;
      if (clonedItem.discount !== undefined) next.discount = clonedItem.discount;

      if (!Number.isNaN(parsedPrice)) {
        next.price = parsedPrice.toString();
      }

      if (!Number.isNaN(parsedOriginalFromClone)) {
        next.originalPrice = parsedOriginalFromClone.toString();
      } else if (!Number.isNaN(parsedPrice) && !Number.isNaN(parsedDiscount) && parsedDiscount > 0 && parsedDiscount < 100) {
        const reconstructedOriginal = parsedPrice / (1 - parsedDiscount / 100);
        if (!Number.isNaN(reconstructedOriginal) && reconstructedOriginal > 0) {
          next.originalPrice = reconstructedOriginal.toString();
        }
      } else if (!Number.isNaN(parsedPrice)) {
        next.originalPrice = parsedPrice.toString();
      }

      return next;
    });

    if (!Number.isNaN(parsedPrice)) {
      setDisplayPrice(formatCurrency(parsedPrice));
    }

    const displayOriginal = !Number.isNaN(parsedOriginalFromClone)
      ? parsedOriginalFromClone
      : !Number.isNaN(parsedPrice)
        ? (!Number.isNaN(parsedDiscount) && parsedDiscount > 0 && parsedDiscount < 100
            ? parsedPrice / (1 - parsedDiscount / 100)
            : parsedPrice)
        : NaN;

    if (!Number.isNaN(displayOriginal)) {
      setDisplayOriginalPrice(formatCurrency(displayOriginal));
    }

    setPrefillApplied(true);
  }, [location.state, prefillApplied, setFormData]);

  useEffect(() => {
    if (gameSearchTerm) {
      setFilteredGames(
        GAMES.filter(game => 
          game.toLowerCase().includes(gameSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredGames(GAMES);
    }
  }, [gameSearchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as { name: InputName; value: string };


    if (name === 'price') {
      handleCurrencyValueChange(value, 'price', setDisplayPrice);
    } else if (name === 'originalPrice') {
      handleCurrencyValueChange(value, 'originalPrice', setDisplayOriginalPrice);
    } else if (name === 'stock') {
      
      const numeric = value.replace(/[^0-9]/g, '');
      if (!numeric) {
        setFormData((prev: FormData) => ({ ...prev, stock: '' }));
      } else {
        const n = Math.min(9999, Math.max(0, parseInt(numeric, 10)));
        setFormData((prev: FormData) => ({ ...prev, stock: String(n) }));
      }
    } else if (ATTRIBUTE_FIELDS.includes(name as AttributeField)) {
      const key = ATTRIBUTE_FIELD_MAP[name as AttributeField];
      setFormData((prev: FormData) => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          [key]: value
        }
      }));
    } else if (name === 'tags') {
      const incomingTags = splitTags(value);
      if (incomingTags.length > MAX_TAGS) {
        setErrors((prev) => ({ ...prev, tags: `Você pode adicionar no máximo ${MAX_TAGS} tags` }));
        const limited = incomingTags.slice(0, MAX_TAGS).join(', ');
        setFormData((prev: FormData) => ({ ...prev, tags: limited }));
        return;
      }
      setFormData((prev: FormData) => ({ ...prev, tags: value }));
    } else if (BOOLEAN_FIELDS.includes(name as typeof BOOLEAN_FIELDS[number])) {
      setFormData((prev: FormData) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev: FormData) => ({ ...prev, [name]: value }));
    }
    

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleGameSelect = (game: string) => {
    setFormData((prev: FormData) => ({ ...prev, game }));
    setShowGameDropdown(false);
    setGameSearchTerm('');
    if (errors.game) {
      setErrors(prev => ({ ...prev, game: undefined }));
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      category: categoryId,
      subcategory: ''
    }));
    setShowCategoryDropdown(false);
    setErrors((prev) => ({ ...prev, category: undefined, subcategory: undefined }));
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setFormData((prev) => ({
      ...prev,
      subcategory
    }));
    setShowSubcategoryDropdown(false);
    setErrors((prev) => ({ ...prev, subcategory: undefined }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newImages = [...images, ...filesArray].slice(0, 5);
      setImages(newImages);
      

      const newImageUrls: string[] = [];
      const newBase64Data: string[] = [...imageBase64Data];
      
      filesArray.forEach((file, index) => {
        if (images.length + index < 5) {

          const previewUrl = URL.createObjectURL(file);
          newImageUrls.push(previewUrl);
          

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            newBase64Data[images.length + index] = base64String;
            setImageBase64Data([...newBase64Data]);
          };
          reader.readAsDataURL(file);
        }
      });
      
      setImagePreviewUrls([...imagePreviewUrls, ...newImageUrls]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    const newImageUrls = [...imagePreviewUrls];
    URL.revokeObjectURL(newImageUrls[index]);
    newImageUrls.splice(index, 1);
    setImagePreviewUrls(newImageUrls);
    
    const newBase64Data = [...imageBase64Data];
    newBase64Data.splice(index, 1);
    setImageBase64Data(newBase64Data);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
    if (!formData.game) newErrors.game = 'Selecione um jogo';
    if (!formData.category) newErrors.category = 'Selecione uma categoria';
    const originalNumeric = parseFloat(formData.originalPrice || '');
    if (!formData.originalPrice.trim()) {
      newErrors.originalPrice = 'Informe o preço original';
    } else if (Number.isNaN(originalNumeric) || originalNumeric <= 0) {
      newErrors.originalPrice = 'Preço original deve ser um valor positivo';
    } else if (originalNumeric < PRICE_LIMITS.MIN) {
      newErrors.originalPrice = `Valor original mínimo permitido é R$ ${PRICE_LIMITS.MIN.toFixed(2).replace('.', ',')}`;
    } else if (originalNumeric > PRICE_LIMITS.MAX) {
      newErrors.originalPrice = `Valor original máximo permitido é R$ ${PRICE_LIMITS.MAX.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (!formData.condition) newErrors.condition = 'Informe o estado do item';
    const trimmedDiscountPrice = formData.price.trim();
    const hasDiscountPrice = Boolean(trimmedDiscountPrice);
    const priceNumeric = hasDiscountPrice ? parseFloat(trimmedDiscountPrice) : NaN;
    if (hasDiscountPrice) {
      if (isNaN(priceNumeric) || priceNumeric <= 0) {
        newErrors.price = 'Preço com desconto deve ser um valor positivo';
      } else if (priceNumeric < PRICE_LIMITS.MIN) {
        newErrors.price = `Valor mínimo permitido é R$ ${PRICE_LIMITS.MIN.toFixed(2).replace('.', ',')}`;
      } else if (priceNumeric > PRICE_LIMITS.MAX) {
        newErrors.price = `Valor máximo permitido é R$ ${PRICE_LIMITS.MAX.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (!Number.isNaN(originalNumeric) && originalNumeric > 0 && priceNumeric > originalNumeric) {
        newErrors.price = 'Preço com desconto deve ser menor ou igual ao preço original';
      }
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres';
    }
    if (formData.deliveryMethod === 'manual') {
      if (!formData.deliveryInstructions.trim()) {
        newErrors.deliveryInstructions = 'Informe orientações de entrega';
      }
    } else if (formData.deliveryMethod === 'automatic') {
      // Entrega automática só é permitida para contas
      if (formData.category !== 'account') {
        newErrors.deliveryMethod = 'Entrega Automática é permitida apenas para a categoria "Conta"';
      }
      // Validar credenciais obrigatórias
      if (!formData.automaticDeliveryCredentials?.loginPlatform?.trim()) {
        newErrors.automaticDeliveryCredentials = 'Plataforma de login é obrigatória para entrega automática';
      }
      if (!formData.automaticDeliveryCredentials?.accountName?.trim()) {
        newErrors.automaticDeliveryCredentials = 'Nome/ID da conta é obrigatório para entrega automática';
      }
      if (!formData.automaticDeliveryCredentials?.email?.trim()) {
        newErrors.automaticDeliveryCredentials = 'E-mail é obrigatório para entrega automática';
      }
      if (!formData.automaticDeliveryCredentials?.password?.trim()) {
        newErrors.automaticDeliveryCredentials = 'Senha é obrigatória para entrega automática';
      }
    }
    const normalizedTags = splitTags(formData.tags);
    if (normalizedTags.length > MAX_TAGS) {
      newErrors.tags = `Você pode adicionar no máximo ${MAX_TAGS} tags`;
    }

    const isAccount = /^(account)$/i.test(formData.category || '');
    if (!isAccount) {
      const s = (formData.stock || '').trim();
      if (!s) {
        newErrors.stock = 'Estoque é obrigatório para itens que não sejam conta';
      } else {
        const n = parseInt(s, 10);
        if (!Number.isInteger(n) || n < 1) newErrors.stock = 'Estoque deve ser um inteiro positivo';
        if (n > 9999) newErrors.stock = 'Estoque máximo permitido é 9999';
      }
    } else {
      
      if ((formData.stock || '').trim()) {
        newErrors.stock = 'Contas não devem possuir estoque';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (images.length === 0) {
      setErrors(prev => ({ ...prev, images: 'Pelo menos uma imagem é obrigatória' }));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      
      const base = (chatApi.defaults.baseURL || '').replace(/\/$/, '');
      const uploadedUrls: string[] = [];
      for (const file of images) {
        
        imageUploadService.validateFile(file);
        const uploaded = await imageUploadService.uploadImageBase64('marketplace', file);
        const absoluteUrl = uploaded.url?.startsWith('http') ? uploaded.url : `${base}${uploaded.url}`;
        uploadedUrls.push(absoluteUrl);
      }

      const normalizedTags = splitTags(formData.tags).slice(0, MAX_TAGS);
      const parseNumericField = (value?: string) => {
        if (!value || !value.trim()) return undefined;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      };
      const originalPriceValue = parseNumericField(formData.originalPrice);
      const discountPriceValue = parseNumericField(formData.price);
      const finalPrice = discountPriceValue ?? originalPriceValue;
      if (typeof finalPrice !== 'number') {
        throw new Error('Preço final não pôde ser determinado');
      }

      const requestData = {
        title: formData.title,
        game: formData.game,
        gameId: formData.game,
        category: formData.category,
        ...(formData.subcategory?.trim() ? { subcategory: formData.subcategory.trim() } : {}),
        condition: formData.condition,
        price: finalPrice,
        ...(typeof originalPriceValue === 'number' ? { originalPrice: originalPriceValue } : {}),
        description: formData.description,
        deliveryMethod: formData.deliveryMethod,
        deliveryInstructions: formData.deliveryInstructions,
        images: uploadedUrls,
        status: formData.status,
        tags: normalizedTags,
        attributes: {
          plataforma: formData.attributes.plataforma,
          entrega: formData.attributes.entrega,
          idioma: formData.attributes.idioma
        },
        ...(formData.discount ? { discount: parseInt(formData.discount, 10) } : {}),
        isFeatured: formData.isFeatured,
        isHighlighted: formData.isHighlighted,
        detached: formData.detached,
        
        ...(formData.category !== 'account' && (formData.stock || '').trim()
          ? { stock: Math.min(9999, Math.max(1, parseInt(formData.stock!, 10))) }
          : {}),
        
        // Incluir credenciais se for entrega automática
        ...(formData.deliveryMethod === 'automatic' && formData.automaticDeliveryCredentials
          ? { automaticDeliveryCredentials: formData.automaticDeliveryCredentials }
          : {})
      };
      
      const response = await marketplaceService.createItem(requestData);
      
      if (response.success && response.data?.item) {

        navigate(`/marketplace/${response.data.item._id}`);
      } else {
        throw new Error(response.message || 'Erro ao criar serviço');
      }
    } catch (error: any) {
            

      let errorMessage = error.message || 'Ocorreu um erro ao criar o serviço. Tente novamente.';
      
      if (error.message && error.message.includes('Unavailable image format')) {
        errorMessage = 'Formato de imagem não suportado. Por favor, use apenas arquivos JPG, PNG ou GIF.';
      } else if (error.message && error.message.includes('upload')) {
        errorMessage = 'Erro no upload das imagens. Verifique se os arquivos são válidos e tente novamente.';
      }
      
      setErrors(prev => ({ 
        ...prev, 
        submit: errorMessage
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
        staggerChildren: 0.1,
        delayChildren: 0.2
      } 
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { 
      opacity: 1, 
      y: 0, 
      height: 'auto',
      transition: { type: 'spring', stiffness: 500, damping: 30 }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      height: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      className="py-6 sm:py-8 px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div variants={itemVariants} className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Postar Novo Serviço
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            Compartilhe seus serviços e itens com a comunidade
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden"
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <form onSubmit={handleSubmit}>
              {}
              <div className="mb-8">
                <div className="rounded-xl p-6 lg:p-8 border border-gray-700/30">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-400" />
                    Informações Básicas
                  </h2>
                  <div className="space-y-6">
                    {}
                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Título do Serviço *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Ex: Conta Valorant Imortal 3"
                        className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                          errors.title ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                        }`}
                      />
                      {errors.title && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                        >
                          <p className="text-red-400 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {errors.title}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>

                    {}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {}
                      <motion.div variants={itemVariants} className="relative">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Jogo *
                        </label>
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setShowGameDropdown(!showGameDropdown)}
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Categoria *
                        </label>
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                              errors.category ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                            }`}
                          >
                            <span className={`text-sm sm:text-base ${formData.category ? 'text-white font-medium' : 'text-gray-400'}`}>
                              {formData.category ? CATEGORIES.find(c => c.id === formData.category)?.name || formData.category : 'Selecione uma categoria'}
                            </span>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              showCategoryDropdown ? 'rotate-180' : ''
                            }`} />
                          </button>
                  
                          <AnimatePresence mode="wait">
                            {showCategoryDropdown && (
                              <motion.div
                                variants={dropdownVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                              >
                                <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                  {CATEGORIES.map((category) => (
                                    <button
                                      key={category.id}
                                      type="button"
                                      onClick={() => handleCategorySelect(category.id)}
                                      className="w-full px-4 py-3 text-left hover:bg-gray-700/80 text-white transition-colors duration-150 flex items-center group"
                                    >
                                      <Layers className="w-4 h-4 mr-3 text-gray-400 group-hover:text-purple-400 transition-colors" />
                                      <span className="group-hover:text-purple-100 transition-colors">{category.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {errors.category && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                          >
                            <p className="text-red-400 text-sm flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              {errors.category}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subcategoria (opcional)
                      </label>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setShowSubcategoryDropdown(!showSubcategoryDropdown)}
                          className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-left flex items-center justify-between transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                            errors.subcategory ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                          }`}
                        >
                          <span className={`text-sm sm:text-base ${formData.subcategory ? 'text-white font-medium' : 'text-gray-400'}`}>
                            {formData.subcategory || 'Selecione uma subcategoria'}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            showSubcategoryDropdown ? 'rotate-180' : ''
                          }`} />
                        </button>

                        <AnimatePresence mode="wait">
                          {showSubcategoryDropdown && (
                            <motion.div
                              variants={dropdownVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="absolute z-50 w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden"
                            >
                              <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                {SUBCATEGORIES.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleSubcategorySelect(option)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-700/80 text-white transition-colors duration-150 flex items-center group"
                                  >
                                    <Layers className="w-4 h-4 mr-3 text-gray-400 group-hover:text-purple-400 transition-colors" />
                                    <span className="group-hover:text-purple-100 transition-colors">{option}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {errors.subcategory && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                        >
                          <p className="text-red-400 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {errors.subcategory}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Condição do item *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {CONDITIONS.map((condition) => (
                          <label
                            key={condition.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                              formData.condition === condition.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-700 hover:border-purple-500/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="condition"
                              value={condition.id}
                              checked={formData.condition === condition.id}
                              onChange={handleInputChange}
                              className="text-purple-500 focus:ring-purple-500"
                            />
                            <span className="text-white text-sm font-medium">{condition.label}</span>
                          </label>
                        ))}
                      </div>
                      {errors.condition && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                        >
                          <p className="text-red-400 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {errors.condition}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>

                    {}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Preço original *
                        </label>
                        <input
                          type="text"
                          name="originalPrice"
                          value={displayOriginalPrice || formData.originalPrice}
                          onChange={handleInputChange}
                          placeholder="Preço original: valor sem desconto."
                          className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                            errors.originalPrice ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                          }`}
                        />
                        {errors.originalPrice && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                          >
                            <p className="text-red-400 text-sm flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              {errors.originalPrice}
                            </p>
                          </motion.div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Preço original: valor sem desconto.</p>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Preço com desconto (opcional)
                        </label>
                        <input
                          type="text"
                          name="price"
                          value={displayPrice || formData.price}
                          onChange={handleInputChange}
                          placeholder="Preço com desconto: valor final após a promoção."
                          className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                            errors.price ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                          }`}
                        />
                        {errors.price && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                          >
                            <p className="text-red-400 text-sm flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              {errors.price}
                            </p>
                          </motion.div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Deixe em branco para usar o preço original como valor final.</p>
                      </motion.div>

                      {formData.category && formData.category !== 'account' && (
                        <motion.div variants={itemVariants}>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Estoque (unidades) *
                          </label>
                          <input
                            type="text"
                            name="stock"
                            value={formData.stock || ''}
                            onChange={handleInputChange}
                            placeholder="Ex.: 5"
                            className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                              errors.stock ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                            }`}
                          />
                          {errors.stock && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                            >
                              <p className="text-red-400 text-sm flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {errors.stock}
                              </p>
                            </motion.div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Máximo: 9999 unidades</p>
                        </motion.div>
                      )}

                    </div>

                    {hasSavings && (
                      <motion.div
                        variants={itemVariants}
                        className="mt-4 p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-sm text-gray-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Economia total</p>
                            <p className="text-lg font-semibold text-green-300">
                              {formatCurrency(pricingSummary.savings)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Desconto aplicado</p>
                            <p className="text-lg font-semibold text-green-300">
                              {`${pricingSummary.percent}%`}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            Defina valores claros para destacar sua promoção automaticamente.
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {}
              <div className="mb-8">
                <div className="rounded-xl p-6 lg:p-8 border border-gray-700/30">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    Detalhes do Serviço
                  </h2>
                  <div className="space-y-6">
                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descrição do serviço *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={5}
                        placeholder="Explique o que está oferecendo, diferenciais, regras e tudo que o comprador precisa saber."
                        className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                          errors.description ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                        }`}
                      />
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
                      <p className="text-xs text-gray-500 mt-1">Use pelo menos 10 caracteres para transmitir confiança.</p>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tags (separe por vírgulas)
                      </label>
                      <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        placeholder="Ex.: evento-limitado, seguro, entrega-rápida"
                        className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Essas palavras ajudam compradores a encontrar seu anúncio (máx. {MAX_TAGS}).</p>
                    </motion.div>
                  </div>
                </div>
              </div>

              {}
              <div className="mb-8">
                <div className="rounded-xl p-6 lg:p-8 border border-gray-700/30">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    Entrega e Plataforma
                  </h2>
                  <div className="space-y-6">
                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Como deseja entregar?
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {DELIVERY_OPTIONS.map((option) => {
                          const isAutomaticDisabled = option.id === 'automatic' && formData.category !== 'account';
                          return (
                            <label
                              key={option.id}
                              className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                                isAutomaticDisabled 
                                  ? 'border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-50' 
                                  : formData.deliveryMethod === option.id 
                                    ? 'border-purple-500 bg-purple-500/10 cursor-pointer' 
                                    : 'border-gray-700 hover:border-purple-500/50 cursor-pointer'
                              }`}
                            >
                              <input
                                type="radio"
                                name="deliveryMethod"
                                value={option.id}
                                checked={formData.deliveryMethod === option.id}
                                onChange={handleInputChange}
                                disabled={isAutomaticDisabled}
                                className="mt-1 text-purple-500 focus:ring-purple-500 disabled:opacity-50"
                              />
                              <div>
                                <p className="text-white font-semibold text-sm">{option.title}</p>
                                <p className="text-gray-400 text-xs">{option.description}</p>
                                {isAutomaticDisabled && (
                                  <p className="text-yellow-400 text-xs mt-1">⚠️ Disponível apenas para contas</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Instruções de envio {formData.deliveryMethod === 'manual' ? '*' : '(opcional)'}
                      </label>
                      <textarea
                        name="deliveryInstructions"
                        value={formData.deliveryInstructions}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder={formData.deliveryMethod === 'manual' ? 'Descreva como será feita a entrega manual, horários disponíveis, dados necessários...' : 'Explique como o envio automático acontece (opcional).'}
                        className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
                          errors.deliveryInstructions ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-600 hover:shadow-lg hover:shadow-purple-500/10'
                        }`}
                      />
                      {errors.deliveryInstructions && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg"
                        >
                          <p className="text-red-400 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {errors.deliveryInstructions}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>

                    {formData.deliveryMethod === 'automatic' && (
                      <motion.div 
                        variants={itemVariants}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl"
                      >
                        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                          <Lock className="w-5 h-5 text-purple-400" />
                          Credenciais da Conta *
                        </h3>
                        <p className="text-sm text-gray-300 mb-4">
                          Preencha os dados da conta que será entregue automaticamente. Todas as informações serão criptografadas com segurança.
                        </p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Plataforma de Login *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex.: Steam, Epic Games, Origin"
                              value={formData.automaticDeliveryCredentials?.loginPlatform || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                automaticDeliveryCredentials: {
                                  ...prev.automaticDeliveryCredentials,
                                  loginPlatform: e.target.value
                                } as any
                              }))}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Nome/ID da Conta *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex.: usuario123"
                              value={formData.automaticDeliveryCredentials?.accountName || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                automaticDeliveryCredentials: {
                                  ...prev.automaticDeliveryCredentials,
                                  accountName: e.target.value
                                } as any
                              }))}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              E-mail *
                            </label>
                            <input
                              type="email"
                              placeholder="Ex.: usuario@email.com"
                              value={formData.automaticDeliveryCredentials?.email || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                automaticDeliveryCredentials: {
                                  ...prev.automaticDeliveryCredentials,
                                  email: e.target.value
                                } as any
                              }))}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Senha *
                            </label>
                            <input
                              type="password"
                              placeholder="Digite a senha da conta"
                              value={formData.automaticDeliveryCredentials?.password || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                automaticDeliveryCredentials: {
                                  ...prev.automaticDeliveryCredentials,
                                  password: e.target.value
                                } as any
                              }))}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Notas do Vendedor (opcional)
                            </label>
                            <textarea
                              placeholder="Ex.: Conta com battle pass ativo, skins raras..."
                              rows={2}
                              value={formData.automaticDeliveryCredentials?.vendorNotes || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                automaticDeliveryCredentials: {
                                  ...prev.automaticDeliveryCredentials,
                                  vendorNotes: e.target.value
                                } as any
                              }))}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                            />
                          </div>
                        </div>
                        {errors.automaticDeliveryCredentials && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg"
                          >
                            <p className="text-red-400 text-sm flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              {errors.automaticDeliveryCredentials}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Plataforma
                        </label>
                        <input
                          type="text"
                          name="attributes.plataforma"
                          value={formData.attributes.plataforma}
                          onChange={handleInputChange}
                          placeholder="Ex.: PC, PS5, Xbox"
                          className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Idioma
                        </label>
                        <input
                          type="text"
                          name="attributes.idioma"
                          value={formData.attributes.idioma}
                          onChange={handleInputChange}
                          placeholder="Ex.: pt-BR, en-US"
                          className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Servidor Da Conta
                        </label>
                        <input
                          type="text"
                          name="attributes.entrega"
                          value={formData.attributes.entrega}
                          onChange={handleInputChange}
                          placeholder="Ex.: America, Asia, Europa...etc"
                          className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className="mb-8">
                <div className="rounded-xl p-6 lg:p-8 border border-gray-700/30">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    Imagens do Serviço
                  </h2>
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Upload de Imagens * (máximo 5)
                    </label>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        {imagePreviewUrls.map((url, index) => (
                          <motion.div 
                            key={index} 
                            className="relative w-24 h-24 rounded-xl overflow-hidden group border-2 border-gray-600 hover:border-purple-500 transition-colors"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          >
                            <img 
                              src={url} 
                              alt={`Preview ${index}`} 
                              className="w-full h-full object-cover"
                            />
                            <div 
                              className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer"
                              onClick={() => removeImage(index)}
                            >
                              <div className="bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors">
                                <X className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        
                        {images.length < 5 && (
                          <label className="w-24 h-24 border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:bg-gray-700/30 group">
                            <Upload className="w-7 h-7 text-gray-400 group-hover:text-purple-400 transition-colors" />
                            <span className="text-xs text-gray-400 group-hover:text-purple-300 mt-1.5 font-medium">Adicionar</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleImageChange} 
                              className="hidden" 
                              multiple={images.length < 4}
                            />
                          </label>
                        )}
                      </div>
                      
                      {errors.images && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg"
                        >
                          <p className="text-red-400 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {errors.images}
                          </p>
                        </motion.div>
                      )}
                      
                      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                        <p className="text-blue-400 text-sm space-y-1">
                          <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            <strong>Formatos aceitos:</strong> JPG, PNG, AVIF
                          </span>
                          <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            <strong>Tamanho máximo:</strong> 8MB por imagem
                          </span>
                          <span className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <strong>Info:</strong> Imagens processadas e servidas com segurança
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>


              {}
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-xl"
                >
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                </motion.div>
              )}

              {}
              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-700/50"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 py-3.5 text-base font-semibold"
                  onClick={() => navigate('/marketplace')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 py-3.5 text-base font-semibold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar Serviço'}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default NewServicePage;