import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface MarketplaceItem {
  _id: string;
  title: string;
  price: number;
  image: string | null;
  game: string;
  description: string;
  featured: boolean;
  seller: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export interface BoostingRequest {
  _id: string;
  game: string;
  title: string;
  currentRank?: string;
  desiredRank?: string;
  minPrice: number;
  price: number;
  description: string;
  boostingCategory?: string;
  client: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export interface Review {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  reviewer: {
    name: string;
    avatar?: string;
  };
  target: {
    name: string;
  };
}

export interface PlatformStats {
  totalUsers: number;
  totalMarketItems: number;
  totalBoostings: number;
  totalReviews: number;
}

export interface HeroBanner {
  _id: string;
  order: number;
  title: string;
  highlightText?: string;
  description: string;
  backgroundImage: string;
  badge?: {
    text: string;
    color: 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'orange';
  };
  primaryButton: {
    text: string;
    link: string;
  };
  secondaryButton?: {
    text: string;
    link: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomeData {
  canAccessDynamic: boolean;
  isBanned: boolean;
  heroBanners: HeroBanner[];
  marketplace: MarketplaceItem[];
  boosting: BoostingRequest[];
  reviews: Review[];
  stats: PlatformStats;
}

class HomeService {
  async getHomeData(): Promise<HomeData> {
    try {
      const response = await api.get('/api/home/data');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao carregar dados da homepage');
    }
  }

  async getFeaturedItems(): Promise<MarketplaceItem[]> {
    try {
      const response = await api.get('/api/home/featured');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao carregar items em destaque');
    }
  }
}

export const homeService = new HomeService();
