import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  Star, 
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export interface OrderBase {
  _id: string;
  orderNumber: string;
  status: string;
  price: number;
  createdAt: string;
  type?: 'marketplace' | 'boosting';
  item: {
    _id: string;
    title: string;
    image: string;
  };
  deliveryMethod?: string;
}

export interface PurchaseOrder extends OrderBase {
  hasReview?: boolean;
  seller: {
    _id: string;
    name: string;
  };
  boostingRequest?: {
    _id: string;
    game: string;
    currentRank?: string;
    desiredRank?: string;
  };
}

export interface SaleOrder extends OrderBase {
  sellerReceives: number;
  hasRating?: boolean;
  rating?: number;
  buyer: {
    _id: string;
    name: string;
  };
  boostingRequest?: {
    _id: string;
    game: string;
    currentRank?: string;
    desiredRank?: string;
  };
}

interface OrderCardProps {
  order: PurchaseOrder | SaleOrder;
  isPurchase?: boolean;
  onRate?: (orderId: string, type?: string) => void;
  onClick?: (orderId: string, type?: string) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getStatusBadge = (status: string, isBoostingOrder: boolean = false) => {
  const s = (status || '').toLowerCase();
  
  // Status específicos para pedidos de boosting
  if (isBoostingOrder) {
    switch (s) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-indigo-900/30 text-indigo-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Em Andamento
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Em Progresso
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            Concluído
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
      case 'disputed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Em Disputa
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-900/30 text-gray-400 text-xs rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  }
  
  // Status para pedidos de marketplace (comportamento original)
  switch (s) {
    case 'initiated':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full">
          <Clock className="w-3 h-3" />
          Iniciada
        </span>
      );
    case 'escrow_reserved':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 text-amber-400 text-xs rounded-full">
          <Clock className="w-3 h-3" />
          Em Escrow
        </span>
      );
    case 'shipped':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-indigo-900/30 text-indigo-400 text-xs rounded-full">
          <Package className="w-3 h-3" />
          Enviada
        </span>
      );
    case 'delivered':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 text-emerald-400 text-xs rounded-full">
          <CheckCircle className="w-3 h-3" />
          Entregue
        </span>
      );
    case 'completed':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
          <CheckCircle className="w-3 h-3" />
          Concluída
        </span>
      );
    case 'cancelled':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full">
          <XCircle className="w-3 h-3" />
          Cancelada
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-gray-900/30 text-gray-400 text-xs rounded-full">
          <AlertTriangle className="w-3 h-3" />
          {status}
        </span>
      );
  }
};

const formatDeliveryMethodLabel = (value?: string) => {
  if (!value) return '';
  const method = value.toLowerCase();
  if (method === 'manual') return 'Entrega manual';
  if (method === 'automatic') return 'Entrega automática';
  return value;
};

const getDeliveryBadge = (method?: string) => {
  if (!method) return null;
  const label = formatDeliveryMethodLabel(method);
  if (!label) return null;
  const normalized = method.toLowerCase();
  const colorClasses = normalized === 'automatic'
    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
    : 'bg-amber-900/30 text-amber-400 border-amber-500/30';
  return (
    <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${colorClasses}`}>
      <Package className="w-3 h-3" />
      {label}
    </span>
  );
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, isPurchase = true, onRate, onClick }) => {
  const isSale = !isPurchase;
  const personName = isPurchase 
    ? (order as PurchaseOrder).seller?.name 
    : (order as SaleOrder).buyer?.name;
  
  const personType = isPurchase 
    ? (order.type === 'boosting' ? 'Booster' : 'Vendedor') 
    : (order.type === 'boosting' ? 'Cliente' : 'Comprador');

  const handleClick = () => {
    if (onClick) onClick(order._id, order.type);
  };

  const handleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRate) onRate(order._id, order.type);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
      className="bg-gray-800/90 hover:bg-gray-750 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer border border-gray-700/40 hover:border-purple-600/30 shadow-lg hover:shadow-purple-900/10"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5">
        {/* Imagem do produto */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 shadow-inner">
          {order.item.image ? (
            <img 
              src={order.item.image} 
              alt={order.item.title} 
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>
        
        {/* Informações do pedido */}
        <div className="flex-grow space-y-3 w-full sm:w-auto">
          {/* Título e tipo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-lg font-bold text-white">{order.item.title}</h3>
                {order.type === 'boosting' ? (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-md font-medium">
                    Boosting
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-md font-medium">
                    Marketplace
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">{personType}: {personName}</p>
              {order.boostingRequest && order.type === 'boosting' && (
                <p className="text-gray-500 text-xs mt-1">
                  {order.boostingRequest.game} {order.boostingRequest.currentRank && 
                  order.boostingRequest.desiredRank && 
                  order.boostingRequest.currentRank !== 'N/A' && 
                  order.boostingRequest.desiredRank !== 'N/A' && 
                  `• ${order.boostingRequest.currentRank} → ${order.boostingRequest.desiredRank}`}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              {/* Preço principal */}
              <p className="text-white font-bold">{formatCurrency(order.price, true)}</p>
              
              {/* Para vendas, mostrar quanto o vendedor recebe */}
              {isSale && 'sellerReceives' in order && (
                <p className="text-green-400 text-sm">
                  Você recebe: {formatCurrency(order.sellerReceives, true)}
                </p>
              )}
              
              {/* Data */}
              <p className="text-gray-400 text-sm">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          
          {/* Número do pedido, status e ações */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm">Pedido: {order.orderNumber}</span>
              {getDeliveryBadge(order.deliveryMethod)}
              {getStatusBadge(order.status, order.type === 'boosting')}
              
              {/* Se for uma compra completa, mostrar opção de avaliação */}
              {isPurchase && order.status === 'completed' && (
                ('hasReview' in order) ? (
                  order.hasReview ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full cursor-default">
                      <Star className="w-3 h-3 fill-current" />
                      Já avaliado
                    </span>
                  ) : (
                    <button
                      onClick={handleRate}
                      className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 text-xs rounded-full transition-all"
                    >
                      <Star className="w-3 h-3" />
                      Avaliar
                    </button>
                  )
                ) : null
              )}
              
              {/* Se for uma venda com avaliação */}
              {isSale && 'hasRating' in order && order.hasRating && order.rating && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  <span>{order.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderCard;
