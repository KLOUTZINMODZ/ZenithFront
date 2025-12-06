import { 
  Award, 
  ShoppingBag, 
  TrendingUp, 
  Star, 
  Trophy, 
  Target, 
  Crown, 
  Zap, 
  Heart,
  Shield,
  DollarSign,
  Users,
  Gem
} from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  category: 'vendas' | 'compras' | 'avaliacao' | 'financeiro' | 'social' | 'especial';
  requirement: {
    type: 'sales' | 'purchases' | 'rating' | 'balance' | 'reviews' | 'combined';
    value: number;
    condition?: string; 
  };
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
}

export const ACHIEVEMENTS: Achievement[] = [
  
  {
    id: 'first_sale',
    name: 'Primeira Venda',
    description: 'Realize sua primeira venda',
    icon: TrendingUp,
    color: 'text-green-400',
    category: 'vendas',
    requirement: { type: 'sales', value: 1 },
    rarity: 'comum'
  },
  {
    id: 'seller_5',
    name: 'Vendedor Iniciante',
    description: 'Complete 5 vendas',
    icon: ShoppingBag,
    color: 'text-blue-400',
    category: 'vendas',
    requirement: { type: 'sales', value: 5 },
    rarity: 'comum'
  },
  {
    id: 'seller_10',
    name: 'Vendedor Experiente',
    description: 'Complete 10 vendas',
    icon: Award,
    color: 'text-purple-400',
    category: 'vendas',
    requirement: { type: 'sales', value: 10 },
    rarity: 'raro'
  },
  {
    id: 'seller_25',
    name: 'Vendedor Profissional',
    description: 'Complete 25 vendas',
    icon: Trophy,
    color: 'text-yellow-400',
    category: 'vendas',
    requirement: { type: 'sales', value: 25 },
    rarity: 'raro'
  },
  {
    id: 'seller_50',
    name: 'Mestre das Vendas',
    description: 'Complete 50 vendas',
    icon: Crown,
    color: 'text-yellow-500',
    category: 'vendas',
    requirement: { type: 'sales', value: 50 },
    rarity: 'epico'
  },
  {
    id: 'seller_100',
    name: 'Lenda das Vendas',
    description: 'Complete 100 vendas',
    icon: Zap,
    color: 'text-orange-400',
    category: 'vendas',
    requirement: { type: 'sales', value: 100 },
    rarity: 'lendario'
  },

  
  {
    id: 'first_purchase',
    name: 'Primeira Compra',
    description: 'Realize sua primeira compra',
    icon: ShoppingBag,
    color: 'text-cyan-400',
    category: 'compras',
    requirement: { type: 'purchases', value: 1 },
    rarity: 'comum'
  },
  {
    id: 'buyer_5',
    name: 'Comprador Frequente',
    description: 'Complete 5 compras',
    icon: Heart,
    color: 'text-pink-400',
    category: 'compras',
    requirement: { type: 'purchases', value: 5 },
    rarity: 'comum'
  },
  {
    id: 'buyer_10',
    name: 'Entusiasta',
    description: 'Complete 10 compras',
    icon: Target,
    color: 'text-indigo-400',
    category: 'compras',
    requirement: { type: 'purchases', value: 10 },
    rarity: 'raro'
  },
  {
    id: 'buyer_25',
    name: 'Colecionador',
    description: 'Complete 25 compras',
    icon: Gem,
    color: 'text-purple-500',
    category: 'compras',
    requirement: { type: 'purchases', value: 25 },
    rarity: 'raro'
  },
  {
    id: 'buyer_50',
    name: 'Grande Colecionador',
    description: 'Complete 50 compras',
    icon: Crown,
    color: 'text-violet-400',
    category: 'compras',
    requirement: { type: 'purchases', value: 50 },
    rarity: 'epico'
  },
  {
    id: 'buyer_100',
    name: 'Colecionador Supremo',
    description: 'Complete 100 compras',
    icon: Trophy,
    color: 'text-fuchsia-400',
    category: 'compras',
    requirement: { type: 'purchases', value: 100 },
    rarity: 'lendario'
  },

  
  {
    id: 'rating_3',
    name: 'Bem Avaliado',
    description: 'Mantenha avaliação acima de 3.0 estrelas',
    icon: Star,
    color: 'text-yellow-400',
    category: 'avaliacao',
    requirement: { type: 'rating', value: 3.0 },
    rarity: 'comum'
  },
  {
    id: 'rating_4',
    name: 'Vendedor Confiável',
    description: 'Mantenha avaliação acima de 4.0 estrelas',
    icon: Shield,
    color: 'text-blue-400',
    category: 'avaliacao',
    requirement: { type: 'rating', value: 4.0 },
    rarity: 'raro'
  },
  {
    id: 'rating_4_5',
    name: 'Vendedor Premium',
    description: 'Mantenha avaliação acima de 4.5 estrelas',
    icon: Crown,
    color: 'text-purple-400',
    category: 'avaliacao',
    requirement: { type: 'rating', value: 4.5 },
    rarity: 'epico'
  },
  {
    id: 'rating_5',
    name: 'Perfeição Absoluta',
    description: 'Alcance avaliação 5.0 estrelas',
    icon: Trophy,
    color: 'text-yellow-500',
    category: 'avaliacao',
    requirement: { type: 'rating', value: 5.0 },
    rarity: 'lendario'
  },

  
  {
    id: 'balance_100',
    name: 'Primeiro Capital',
    description: 'Acumule R$ 100,00 em saldo',
    icon: DollarSign,
    color: 'text-green-400',
    category: 'financeiro',
    requirement: { type: 'balance', value: 100 },
    rarity: 'comum'
  },
  {
    id: 'balance_500',
    name: 'Investidor',
    description: 'Acumule R$ 500,00 em saldo',
    icon: TrendingUp,
    color: 'text-emerald-400',
    category: 'financeiro',
    requirement: { type: 'balance', value: 500 },
    rarity: 'raro'
  },
  {
    id: 'balance_1000',
    name: 'Capitalista',
    description: 'Acumule R$ 1.000,00 em saldo',
    icon: Gem,
    color: 'text-green-500',
    category: 'financeiro',
    requirement: { type: 'balance', value: 1000 },
    rarity: 'epico'
  },
  {
    id: 'balance_5000',
    name: 'Magnata',
    description: 'Acumule R$ 5.000,00 em saldo',
    icon: Crown,
    color: 'text-yellow-500',
    category: 'financeiro',
    requirement: { type: 'balance', value: 5000 },
    rarity: 'lendario'
  },

  
  {
    id: 'first_week',
    name: 'Boas-Vindas',
    description: 'Complete sua primeira semana na plataforma',
    icon: Heart,
    color: 'text-pink-400',
    category: 'especial',
    requirement: { type: 'combined', value: 0, condition: 'joinDate_7days' },
    rarity: 'comum'
  },
  {
    id: 'jack_of_trades',
    name: 'Versátil',
    description: 'Realize pelo menos 5 compras E 5 vendas',
    icon: Users,
    color: 'text-purple-400',
    category: 'especial',
    requirement: { type: 'combined', value: 0, condition: 'sales_5_purchases_5' },
    rarity: 'raro'
  },
  {
    id: 'balanced_trader',
    name: 'Equilibrado',
    description: 'Realize 10 compras E 10 vendas',
    icon: Award,
    color: 'text-indigo-400',
    category: 'especial',
    requirement: { type: 'combined', value: 0, condition: 'sales_10_purchases_10' },
    rarity: 'epico'
  },
  {
    id: 'perfect_start',
    name: 'Início Perfeito',
    description: 'Complete 10 transações com avaliação 5.0',
    icon: Zap,
    color: 'text-orange-400',
    category: 'especial',
    requirement: { type: 'combined', value: 0, condition: 'perfect_rating_10_transactions' },
    rarity: 'lendario'
  }
];


export const getRarityColor = (rarity: string) => {
  const colors = {
    comum: 'border-gray-500',
    raro: 'border-blue-500',
    epico: 'border-purple-500',
    lendario: 'border-yellow-500'
  };
  return colors[rarity as keyof typeof colors] || colors.comum;
};

export const getRarityBg = (rarity: string) => {
  const colors = {
    comum: 'bg-gray-500/10',
    raro: 'bg-blue-500/10',
    epico: 'bg-purple-500/10',
    lendario: 'bg-yellow-500/10'
  };
  return colors[rarity as keyof typeof colors] || colors.comum;
};
