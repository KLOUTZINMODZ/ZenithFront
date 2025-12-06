import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingBag, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Copy,
  Check,
  MessageCircle
} from 'lucide-react';
import { orderService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface OrderDetail {
  order: {
    _id: string;
    orderNumber: string;
    buyerId: string;
    sellerId: string;
    itemId: string;
    status: string;
    price: number;
    fee: number;
    sellerReceives: number;
    notes?: string;
    createdAt: string;
    deliveryStatus: string;
    deliveryDetails: any;
  };
  item: {
    _id: string;
    title: string;
    game: string;
    price: number;
    image: string;
    category: string;
    description: string;
  };
  buyer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  seller: {
    _id: string;
    name: string;
    avatar?: string;
  };
  transaction: {
    _id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  };
  actions: {
    canCancel: boolean;
    canConfirmDelivery: boolean;
    canDispute: boolean;
  };
}

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!id) return;
    
    fetchOrderDetails();
  }, [id, user]);
  
  const fetchOrderDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await orderService.getOrderById(id);
      
      if (response.success && response.data) {
        setOrderDetail(response.data);
      } else {
        setError(response.message || 'Erro ao carregar detalhes do pedido');
      }
    } catch (err) {
            setError('Erro de conexão ao carregar detalhes do pedido');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (action: 'confirm_delivery' | 'cancel' | 'dispute') => {
    if (!id || !orderDetail) return;
    
    setProcessing(true);
    
    try {
      const response = await orderService.updateOrderStatus(id, action);
      
      if (response.success) {
        addNotification({
          id: Date.now().toString(),
          title: 'Status atualizado',
          message: action === 'confirm_delivery' 
            ? 'Entrega confirmada com sucesso!' 
            : action === 'cancel' 
              ? 'Pedido cancelado com sucesso!' 
              : 'Disputa aberta com sucesso!',
          type: 'success',
          read: false,
          createdAt: new Date().toISOString()
        });
        

        fetchOrderDetails();
      } else {
        addNotification({
          id: Date.now().toString(),
          title: 'Erro ao atualizar status',
          message: response.message || 'Não foi possível atualizar o status do pedido',
          type: 'error',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
            addNotification({
        id: Date.now().toString(),
        title: 'Erro ao atualizar status',
        message: 'Ocorreu um erro ao processar sua solicitação',
        type: 'error',
        read: false,
        createdAt: new Date().toISOString()
      });
    } finally {
      setProcessing(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/20 text-yellow-400 text-sm rounded-full">
            <Clock className="w-4 h-4" />
            Pendente
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-900/20 text-blue-400 text-sm rounded-full">
            <Clock className="w-4 h-4" />
            Em Processamento
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 text-sm rounded-full">
            <CheckCircle className="w-4 h-4" />
            Concluído
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-900/20 text-red-400 text-sm rounded-full">
            <XCircle className="w-4 h-4" />
            Cancelado
          </span>
        );
      case 'disputed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-orange-900/20 text-orange-400 text-sm rounded-full">
            <AlertTriangle className="w-4 h-4" />
            Em Disputa
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-gray-900/20 text-gray-400 text-sm rounded-full">
            {status}
          </span>
        );
    }
  };
  
  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_seller':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/20 text-yellow-400 text-sm rounded-full">
            <Clock className="w-4 h-4" />
            Aguardando Vendedor
          </span>
        );
      case 'delivered_by_seller':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-900/20 text-blue-400 text-sm rounded-full">
            <Clock className="w-4 h-4" />
            Entregue pelo Vendedor
          </span>
        );
      case 'confirmed_by_buyer':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 text-sm rounded-full">
            <CheckCircle className="w-4 h-4" />
            Confirmado pelo Comprador
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-gray-900/20 text-gray-400 text-sm rounded-full">
            {status}
          </span>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }
  
  if (error || !orderDetail) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-white mb-2">Erro ao carregar pedido</h3>
        <p className="text-gray-400 mb-4">{error || 'Pedido não encontrado'}</p>
        <button 
          onClick={() => navigate('/purchases')} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Voltar para Compras
        </button>
      </div>
    );
  }
  
  const { order, item, buyer, seller, transaction, actions } = orderDetail;
  const isBuyer = user?._id === order.buyerId;
  const feeDisplay = typeof order.fee === 'number' ? order.fee : Math.round(order.price * 0.05 * 100) / 100;
  const sellerNetDisplay = typeof order.sellerReceives === 'number' ? order.sellerReceives : Math.round((order.price - feeDisplay) * 100) / 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      {}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/purchases')} 
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Compras
        </button>
      </div>
      
      {}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">Pedido {order.orderNumber}</h1>
              <button 
                onClick={() => copyToClipboard(order.orderNumber)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Copiar número do pedido"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-gray-400">Realizado em {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(order.status)}
            {getDeliveryStatusBadge(order.deliveryStatus)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {}
        <div className="lg:col-span-2 space-y-6">
          {}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Detalhes do Item</h2>
              <div className="flex gap-6">
                <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <ShoppingBag className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-gray-400 mb-2">
                    {item.game} • {item.category}
                  </p>
                  <p className="text-white font-bold">R$ {order.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Descrição</h3>
              <p className="text-gray-300 whitespace-pre-line">{item.description}</p>
            </div>
          </div>
          
          {}
          {order.deliveryDetails && Object.keys(order.deliveryDetails).length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Detalhes da Entrega</h2>
              
              {order.deliveryDetails.code && (
                <div className="mb-4">
                  <p className="text-gray-400 mb-1">Código de Ativação:</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-700 p-3 rounded-lg text-white font-mono font-medium">
                      {order.deliveryDetails.code}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(order.deliveryDetails.code)}
                      className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Copiar código"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              
              {order.deliveryDetails.instructions && (
                <div>
                  <p className="text-gray-400 mb-1">Instruções:</p>
                  <div className="bg-gray-700 p-4 rounded-lg text-white">
                    {order.deliveryDetails.instructions}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {}
          {(actions.canCancel || actions.canConfirmDelivery || actions.canDispute) && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Ações</h2>
              <div className="flex flex-wrap gap-4">
                {actions.canConfirmDelivery && (
                  <button
                    onClick={() => handleUpdateStatus('confirm_delivery')}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Confirmar Recebimento
                  </button>
                )}
                
                {actions.canCancel && (
                  <button
                    onClick={() => handleUpdateStatus('cancel')}
                    disabled={processing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Cancelar Pedido
                  </button>
                )}
                
                {actions.canDispute && (
                  <button
                    onClick={() => handleUpdateStatus('dispute')}
                    disabled={processing}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Abrir Disputa
                  </button>
                )}
              </div>
            </div>
          )}
          
          {}
          {order.notes && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Observações</h2>
              <p className="text-gray-300">{order.notes}</p>
            </div>
          )}
        </div>
        
        {}
        <div className="space-y-6">
          {}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Resumo do Pedido</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white">R$ {order.price.toFixed(2)}</span>
              </div>
              {!isBuyer && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa da plataforma (5%):</span>
                    <span className="text-white">R$ {feeDisplay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor líquido do vendedor:</span>
                    <span className="text-white">R$ {sellerNetDisplay.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-gray-700 my-2 pt-2 flex justify-between font-bold">
                <span className="text-gray-400">Total:</span>
                <span className="text-white">R$ {order.price.toFixed(2)}</span>
              </div>
              {isBuyer && transaction && (
                <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Transação:</p>
                  <p className="text-white">
                    {transaction.type === 'purchase' ? 'Compra' : 'Venda'} • 
                    {transaction.status === 'completed' ? 'Concluída' : 'Pendente'}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Participantes</h2>
            
            {}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Comprador:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                  {buyer?.profilePicture ? (
                    <img 
                      src={buyer.profilePicture} 
                      alt={buyer.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{buyer.name}</p>
                  {isBuyer && <p className="text-purple-400 text-xs">Você</p>}
                </div>
              </div>
            </div>
            
            {}
            <div>
              <p className="text-gray-400 text-sm mb-2">Vendedor:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                  {seller?.profilePicture ? (
                    <img 
                      src={seller.profilePicture} 
                      alt={seller.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{seller.name}</p>
                  {!isBuyer && <p className="text-purple-400 text-xs">Você</p>}
                </div>
              </div>
            </div>
            
            {}
            <button 
              onClick={() => navigate(`/messages?user=${isBuyer ? seller._id : buyer._id}`)}
              className="w-full mt-4 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Mensagem
            </button>
          </div>
          
          {}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">Precisa de ajuda?</h2>
            <p className="text-gray-400 text-sm mb-4">
              Se você tiver algum problema com este pedido, entre em contato com o suporte.
            </p>
            <button 
              onClick={() => navigate('/support')}
              className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Contatar Suporte
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderDetailPage;