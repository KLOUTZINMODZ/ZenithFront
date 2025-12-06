import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Package, Gamepad2, User, AlertCircle, ShoppingCart, TrendingUp, DollarSign, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatNavigation } from '../hooks/useChatNavigation';
import purchaseService from '../services/purchaseService';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface compatível com PurchasesPage e SalesPage
interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  price: number;
  createdAt: string;
  type?: 'marketplace' | 'boosting';
  hasReview?: boolean;
  conversationId?: string; // Adicionado campo para ID da conversa 
  item: {
    _id: string;
    title: string;
    image: string;
    category?: string;
  };
  seller: {
    _id: string;
    name: string;
  };
  buyer?: {
    _id: string;
    name: string;
  };
  boostingRequest?: {
    _id: string;
    game: string;
    category?: string;
    currentRank?: string;
    desiredRank?: string;
  };
}

// Interface estendida para funcionalidades específicas de "Pedidos em Aberto"
interface OpenOrder extends Order {
  role?: 'client' | 'booster' | 'buyer' | 'seller';
  awaitingAction?: string;
  progress?: {
    startedAt: string;
    estimatedCompletion: string;
  };
}

interface Stats {
  totalOpen: number;
  boosting: number;
  marketplace: number;
  asClient: number;
  asBooster: number;
  asBuyer: number;
  asSeller: number;
  pendingAction: number;
}

const OpenOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { openChat } = useChatNavigation();
  const [allOrders, setAllOrders] = useState<OpenOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 4;
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchOpenOrders();
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [allOrders, filter, page]);

  const fetchOpenOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar compras e vendas usando o mesmo endpoint das outras páginas
      const [purchasesRes, salesRes] = await Promise.all([
        purchaseService.list({ type: 'purchases', page: 1, limit: 100 }),
        purchaseService.list({ type: 'sales', page: 1, limit: 100 })
      ]);

      const purchases = purchasesRes.success ? purchasesRes.data?.orders || [] : [];
      const sales = salesRes.success ? salesRes.data?.orders || [] : [];

      // Filtrar apenas pedidos em aberto (não concluídos nem cancelados)
      const openStatuses = [
        'initiated', 'escrow_reserved', 'shipped', 'pending', 'active', 'in_progress',
        'open', 'processing', 'accepted', 'started', 'awaiting_delivery'
      ];
      
      const filteredPurchases = purchases.filter(order => openStatuses.includes(order.status));
      const filteredSales = sales.filter(order => openStatuses.includes(order.status));
      
      const openOrders: OpenOrder[] = [
        ...filteredPurchases.map(order => ({
          ...order,
          role: 'buyer' as const,
          awaitingAction: getAwaitingAction(order, 'buyer')
        })),
        ...filteredSales.map(order => ({
          ...order,
          role: order.type === 'boosting' ? ('booster' as const) : ('seller' as const),
          awaitingAction: getAwaitingAction(order, order.type === 'boosting' ? 'booster' : 'seller')
        }))
      ];

      // Remover duplicatas (caso um pedido apareça tanto em compras quanto vendas)
      const uniqueOrders = openOrders.filter((order, index, self) => 
        index === self.findIndex(o => o._id === order._id)
      );

      // Ordenar por data de criação (mais recente primeiro)
      uniqueOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const counts = {
        totalOpen: uniqueOrders.length,
        boosting: uniqueOrders.filter(o => o.type === 'boosting').length,
        marketplace: uniqueOrders.filter(o => o.type === 'marketplace').length,
        asClient: uniqueOrders.filter(o => o.role === 'client').length,
        asBooster: uniqueOrders.filter(o => o.role === 'booster').length,
        asBuyer: uniqueOrders.filter(o => o.role === 'buyer').length,
        asSeller: uniqueOrders.filter(o => o.role === 'seller').length,
        pendingAction: uniqueOrders.filter(o => !!o.awaitingAction).length
      } as Stats;

      setAllOrders(uniqueOrders);
      setStats(counts);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para determinar ação pendente
  const getAwaitingAction = (order: Order, role: 'buyer' | 'seller' | 'booster' | 'client'): string | undefined => {
    const status = order.status.toLowerCase();
    
    if (order.type === 'marketplace') {
      if (status === 'escrow_reserved' && role === 'seller') return 'Enviar item';
      if (status === 'shipped' && role === 'buyer') return 'Confirmar recebimento';
    } else if (order.type === 'boosting') {
      if (status === 'pending' && role === 'booster') return 'Aceitar proposta';
      if (status === 'active' && role === 'booster') return 'Executar boosting';
      if (status === 'shipped' && role === 'client') return 'Confirmar recebimento';
    }
    
    return undefined;
  };

  const applyFilter = () => {
    let filtered = [...allOrders];


    if (filter !== 'all') {
      if (filter === 'boosting') {
        filtered = filtered.filter(order => order.type === 'boosting');
      } else if (filter === 'marketplace') {
        filtered = filtered.filter(order => order.type === 'marketplace');
      } else if (filter === 'buyer') {
        filtered = filtered.filter(order => order.role === 'buyer');
      } else if (filter === 'seller') {
        filtered = filtered.filter(order => order.role === 'seller');
      }
    }


    const totalItems = filtered.length;
    const pages = Math.ceil(totalItems / itemsPerPage);
    setTotalPages(pages);


    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filtered.slice(startIndex, endIndex);

    setFilteredOrders(paginatedOrders);
  };

  const getStatusBadge = (order: OpenOrder) => {
    const statusColors: Record<string, string> = {
      'open': 'bg-blue-600 border-blue-500/30',
      'in_progress': 'bg-yellow-600 border-yellow-500/30',
      'pending': 'bg-orange-600 border-orange-500/30',
      'processing': 'bg-purple-600 border-purple-500/30',
      'completed': 'bg-green-600 border-green-500/30',
      'cancelled': 'bg-red-600 border-red-500/30',
      'initiated': 'bg-blue-600 border-blue-500/30',
      'escrow_reserved': 'bg-indigo-600 border-indigo-500/30',
      'shipped': 'bg-yellow-600 border-yellow-500/30',
      'active': 'bg-emerald-600 border-emerald-500/30',
      'started': 'bg-amber-600 border-amber-500/30',
      'awaiting_delivery': 'bg-orange-600 border-orange-500/30'
    };

    const statusLabels: Record<string, string> = {
      'open': 'Aberto',
      'in_progress': 'Em Progresso',
      'pending': 'Pendente',
      'processing': 'Processando',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'initiated': 'Iniciado',
      'escrow_reserved': 'Caução Reservada',
      'shipped': 'Enviado',
      'active': 'Ativo',
      'started': 'Iniciado',
      'awaiting_delivery': 'Aguardando Entrega'
    };

    // Extrair o código de pedido boosting (formato #BO_XXXXXX_YYY)
    const orderNumMatch = order.orderNumber?.match(/#BO_(\d+)_(\w+)/i);
    
    // Determinar o rótulo de status correto com base no tipo e status do pedido
    let statusLabel;
    
    if (order.status === 'shipped') {
      // Para pedidos de marketplace reais, manter 'Enviado'
      // Para pedidos de boosting, usar 'Em Progresso'
      statusLabel = order.type === 'boosting' ? 'Em Progresso' : 'Enviado';
    } else {
      // Para outros status, usar o mapeamento padrão
      statusLabel = statusLabels[order.status] || order.status;
    }
    
    // Se temos um número de pedido boosting e um jogo no formato #BO_XXXXXX_YYY, adicionar o jogo ao status
    if (orderNumMatch && orderNumMatch[2]) {
      statusLabel = `${statusLabel}`;
    }

    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white border ${statusColors[order.status] || 'bg-gray-600 border-gray-500/30'}`}>
        {statusLabel}
      </span>
    );
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const roleColors: Record<string, string> = {
      'client': 'bg-indigo-600 border-indigo-500/30',
      'booster': 'bg-green-600 border-green-500/30',
      'buyer': 'bg-blue-600 border-blue-500/30',
      'seller': 'bg-purple-600 border-purple-500/30'
    };

    const roleLabels: Record<string, string> = {
      'client': 'Cliente',
      'booster': 'Booster',
      'buyer': 'Comprador',
      'seller': 'Vendedor'
    };

    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white border ${roleColors[role] || 'bg-gray-600 border-gray-500/30'}`}>
        {roleLabels[role] || role}
      </span>
    );
  };


  const handleOrderClick = (order: OpenOrder) => {
    if (order.type === 'boosting') {
      // Para boostings, usar o _id do order (que é o ID do BoostingOrder)
      navigate(`/boostings/${order._id}`);
    } else {
      // Para marketplace, usar o _id do order (que é o ID da Purchase)
      navigate(`/orders/${order._id}`);
    }
  };

  const handleMessageClick = (e: React.MouseEvent, order: OpenOrder) => {
    e.stopPropagation();
    // Usar conversationId se disponível, caso contrário usar o _id como fallback
    console.log('Order data:', order);
    if (order.conversationId) {
      console.log('Using conversationId:', order.conversationId);
      openChat(order.conversationId);
    } else {
      console.log('Fallback to order._id:', order._id);
      openChat(order._id); // Fallback para o ID do pedido se não houver conversationId
    }
  };

  // Função para verificar se deve mostrar ranks ou categoria
  const shouldShowRanks = (order: OpenOrder): boolean => {
    const { currentRank, desiredRank } = order.boostingRequest || {};
    
    // Se não existe boostingRequest ou algum dos ranks, mostrar categoria
    if (!order.boostingRequest || !currentRank || !desiredRank) {
      return false;
    }
    
    // Verificar se ambos os ranks existem e não são 'N/A'
    return currentRank !== 'N/A' && desiredRank !== 'N/A';
  };

  const filterButtons = [
    { value: 'all', label: 'Todos', icon: Package, count: stats?.totalOpen || 0 },
    { value: 'boosting', label: 'Boosting', icon: Gamepad2, count: stats?.boosting || 0 },
    { value: 'marketplace', label: 'Marketplace', icon: ShoppingCart, count: stats?.marketplace || 0 },
    { value: 'buyer', label: 'Compras', icon: TrendingUp, count: stats?.asBuyer || 0 },
    { value: 'seller', label: 'Vendas', icon: DollarSign, count: stats?.asSeller || 0 }
  ];

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Pedidos em Aberto</h1>
              <p className="text-sm text-gray-400">Acompanhe todos os seus pedidos ativos</p>
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-all text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mensagens</span>
            </button>
          </div>
        </motion.div>

        {}
        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-1">
                <Package className="w-5 h-5 text-gray-400" />
                <div className="text-2xl sm:text-3xl font-bold text-white">{stats.totalOpen}</div>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Total Aberto</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-1">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
                <div className="text-2xl sm:text-3xl font-bold text-purple-400">{stats.boosting}</div>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Boosting</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-1">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                <div className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.marketplace}</div>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Marketplace</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/20 hover:border-yellow-500/40 transition-all">
              <div className="flex items-center justify-between mb-1">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.pendingAction}</div>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Ação Pendente</div>
            </div>
          </motion.div>
        )}

        {}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-5"
        >
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => {
                setFilter(btn.value);
                setPage(1);
              }}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all ${
                filter === btn.value
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <btn.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">{btn.label}</span>
              {btn.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === btn.value ? 'bg-white/20' : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {btn.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Carregando pedidos...</p>
            </div>
          </div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </motion.div>
        ) : filteredOrders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 px-4"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">Você não possui pedidos {filter !== 'all' ? 'nesta categoria' : 'em aberto'} no momento</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleOrderClick(order)}
                  className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/10 cursor-pointer hover:border-purple-500/30 hover:bg-white/10 transition-all"
                >
                  {}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {order.type === 'boosting' ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-purple-300 transition-colors">{order.item.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {order.orderNumber && (
                            <span className="text-xs text-gray-500 font-mono">
                              {/* Extrair o código de pedido boosting e o jogo */}
                              {(() => {
                                const orderNumMatch = order.orderNumber?.match(/#BO_(\d+)_([A-Za-z0-9]+)(.*)/i);
                                if (orderNumMatch) {
                                  const [, number, , gameName] = orderNumMatch; // Pulando a variável code não utilizada
                                  return (
                                    <>
                                      #{number}
                                      {gameName && <span className="ml-1 text-purple-400">{gameName.trim()}</span>}
                                    </>
                                  );
                                }
                                return `#${order.orderNumber}`;
                              })()}
                            </span>
                          )}
                          {order.boostingRequest?.game && !order.orderNumber?.includes(order.boostingRequest.game) && (
                            <span className="text-xs text-gray-400">{order.boostingRequest.game}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-2 flex-shrink-0 w-full sm:w-auto">
                      {getStatusBadge(order)}
                      {getRoleBadge(order.role)}
                    </div>
                  </div>

                  {}
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-3">
                    {}
                    <div className="col-span-1">
                      <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Valor
                      </p>
                      <p className="text-base sm:text-lg font-bold text-green-400">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(order.price)}
                      </p>
                    </div>

                    {}
                    <div className="col-span-1">
                      <p className="text-xs text-gray-500 mb-0.5">Criado</p>
                      <p className="flex items-center gap-1 text-sm text-gray-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {formatDistanceToNow(new Date(order.createdAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </p>
                    </div>

                    {}
                    {order.awaitingAction && (
                      <div className="col-span-1 sm:col-span-1">
                        <p className="text-xs text-gray-500 mb-0.5">Status</p>
                        <div className="flex items-center gap-1.5 text-yellow-400">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{order.awaitingAction}</span>
                        </div>
                      </div>
                    )}

                    {}
                    {(order.boostingRequest || order.item?.category) && (
                      <div className="col-span-1 sm:col-span-1">
                        {shouldShowRanks(order) ? (
                          <>
                            <p className="text-xs text-gray-500 mb-0.5">Rank</p>
                            <div className="flex items-center gap-1.5 text-blue-400">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {order.boostingRequest?.currentRank || ''} → {order.boostingRequest?.desiredRank || ''}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 mb-0.5">Categoria</p>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <Package className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {order.item?.category === 'N/A' ? 
                                  (order.boostingRequest?.category || order.boostingRequest?.game || 'Não Especificado') :
                                  (order.item?.category || order.boostingRequest?.category || order.boostingRequest?.game || 'Não Especificado')}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>


                  {}
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
       
                    <span className="text-xs text-gray-500">Clique para ver detalhes</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {}
        {totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-6 pb-4"
          >
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all font-medium text-sm"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                      page === pageNum
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/20'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all font-medium text-sm"
            >
              Próxima
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OpenOrdersPage;
