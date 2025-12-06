export interface User {
  id: string;
  _id?: string; 
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  
  phone?: string;
  phoneNumber?: string;
  whatsapp?: string;
  mobile?: string;
  phoneNormalized?: string;
  cpf?: string; 
  birthDate?: string; 
  cpfCnpj?: string; 
  legalName?: string; 
  joinDate: string;
  totalPurchases: number;
  totalSales: number;
  rating: number;
  balance: number;
  isVerified: boolean;
}

export interface Game {
  id: string;
  name: string;
  image: string;
  players: string;
  category: string;
}

export interface MarketItem {
  id: number;
  title: string;
  game: string;
  price: string;
  image: string;
  rating: number;
  seller: string;
  views: number;
  category: string;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'transaction'
  | 'qa:new_question'
  | 'qa:answered';

export interface Notification {
  id: string;
  _id?: string;  // ID do backend
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  timestamp?: string;
  createdAt?: string;  // Data da API
  updatedAt?: string;
  link?: string;
  image?: string;
  meta?: Record<string, any>;
  relatedId?: string;
  relatedType?: string;
}


export interface QAQuestion {
  _id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  question: string;
  answer?: string | null;
  status: 'pending' | 'answered';
  createdAt: string;
  answeredAt?: string | null;
  buyerSnapshot?: { _id: string; name: string; avatar?: string | null } | null;
  sellerSnapshot?: { _id: string; name: string; avatar?: string | null } | null;
}