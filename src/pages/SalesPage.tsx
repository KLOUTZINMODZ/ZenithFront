import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, TrendingUp, Search, Filter, ArrowUpDown, DollarSign, ClipboardCheck, Users } from 'lucide-react';

// Serviços
import { purchaseService } from '../services';
import websocketService from '../services/websocketService';
import notificationWebSocketService from '../services/notificationWebSocketService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';

// Componentes
import { PageHeader } from '../components/ui/PageHeader';
import { OrderCard, SaleOrder } from '../components/ui/OrderCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState, ErrorState } from '../components/ui/LoadingState';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Pagination } from '../components/ui/Pagination';

// Tipo para ordenação
type SortOption = {
  field: 'createdAt' | 'price' | 'status';
  direction: 'asc' | 'desc';
};

// Interface para as estatísticas da página
interface SalesStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  netRevenue: number;
}


// Componente de resumo de estatísticas
const StatsSummary: React.FC<{ stats: SalesStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-gradient-to-r from-purple-900/30 to-purple-700/30 p-4 rounded-xl border border-purple-700/30 shadow-lg"
      >
        <h3 className="text-gray-400 text-sm mb-1">Total de vendas</h3>
        <p className="text-white text-2xl font-bold">{stats.totalOrders}</p>
      </motion.div>
      
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-gradient-to-r from-green-900/30 to-green-700/30 p-4 rounded-xl border border-green-700/30 shadow-lg"
      >
        <h3 className="text-gray-400 text-sm mb-1">Vendas concluídas</h3>
        <p className="text-white text-2xl font-bold">{stats.completedOrders}</p>
      </motion.div>
      
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-gradient-to-r from-blue-900/30 to-blue-700/30 p-4 rounded-xl border border-blue-700/30 shadow-lg"
      >
        <h3 className="text-gray-400 text-sm mb-1">Vendas em andamento</h3>
        <p className="text-white text-2xl font-bold">{stats.pendingOrders}</p>
      </motion.div>
      
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-gradient-to-r from-amber-900/30 to-amber-700/30 p-4 rounded-xl border border-amber-700/30 shadow-lg"
      >
        <h3 className="text-gray-400 text-sm mb-1">Receita líquida</h3>
        <p className="text-white text-2xl font-bold">{formatCurrency(stats.netRevenue, true)}</p>
      </motion.div>
    </div>
  );
};

const SalesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados principais
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de filtragem e paginação
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8, pages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'createdAt', direction: 'desc' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Estatísticas calculadas
  const [stats, setStats] = useState<SalesStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    netRevenue: 0
  });
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchOrders();
  }, [user, pagination.page, statusFilter, refreshTrigger]);
  
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: {
        page: number;
        limit: number;
        type: 'sales';
        status?: string;
        search?: string;
        sort?: string;
        order?: string;
      } = {
        page: pagination.page,
        limit: pagination.limit,
        type: 'sales'
      };
      
      // Adicionar filtros se estiverem definidos
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Adicionar ordenação
      params.sort = sortOption.field;
      params.order = sortOption.direction;
      
      const response = await purchaseService.list(params);
      
      if (response.success && response.data) {
        const orders = response.data.orders as SaleOrder[];
        setOrders(orders);
        
        // Atualizar paginação
        setPagination({
          total: response.data.pagination.total,
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          pages: response.data.pagination.pages
        });
        
        // Calcular estatísticas - buscar todas as ordens para isso
        const allOrdersResponse = await purchaseService.list({ 
          type: 'sales', 
          limit: 1000,
          page: 1 
        });
        
        if (allOrdersResponse.success && allOrdersResponse.data) {
          const allOrders = allOrdersResponse.data.orders as SaleOrder[];
          
          // Calcular estatísticas
          const salesStats: SalesStats = {
            totalOrders: allOrders.length,
            completedOrders: allOrders.filter(o => o.status === 'completed').length,
            pendingOrders: allOrders.filter(o => ['initiated', 'escrow_reserved', 'shipped'].includes(o.status)).length,
            cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
            totalRevenue: allOrders.reduce((sum, order) => sum + order.price, 0),
            netRevenue: allOrders.reduce((sum, order) => sum + order.sellerReceives, 0)
          };
          
          setStats(salesStats);
        }
      } else {
        setError(response.message || 'Erro ao carregar vendas');
      }
    } catch (err) {
      setError('Erro de conexão ao carregar vendas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  
  useEffect(() => {
    const onMpStatus = (data: any) => {
      try { setRefreshTrigger(v => v + 1); } catch {}
    };
    const onNotif = (payload: any) => {
      try {
        const t = payload?.notification?.type || payload?.type;
        if (t && ['purchase:new', 'purchase:completed', 'purchase:cancelled'].includes(String(t))) {
          setRefreshTrigger(v => v + 1);
        }
      } catch {}
    };
    websocketService.on('marketplace:status_changed', onMpStatus);
    notificationWebSocketService.on('new_notification', onNotif);
    return () => {
      websocketService.off('marketplace:status_changed', onMpStatus);
      notificationWebSocketService.off('new_notification', onNotif);
    };
  }, []);

  
  // Handler para atualização da página
  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handler para mudança de página
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handler para busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchOrders();
  };
  
  // Handler para mudança de filtro de status
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  // Handler para mudança de ordenação
  const handleSortChange = (field: SortOption['field']) => {
    setSortOption(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchOrders();
  };
  
  // Função para visualizar detalhes do pedido
  const handleViewOrder = (orderId: string, type?: string) => {
    if (type === 'boosting') {
      navigate(`/boostings/${orderId}`);
    } else {
      navigate(`/orders/${orderId}`);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl"
    >
      {/* Cabeçalho da página */}
      <PageHeader 
        title="Minhas Vendas" 
        description="Gerencie seus pedidos de venda e acompanhe seus ganhos"
        icon={TrendingUp}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />
      
      {/* Resumo de estatísticas */}
      <AnimatePresence>
        {!loading && !error && orders.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <StatsSummary stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Barra de filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <StatusFilter 
            value={statusFilter} 
            onChange={handleStatusFilterChange}
            type="all" 
          />
          
          <div className="text-sm text-gray-400">
            {pagination.total} {pagination.total === 1 ? 'item' : 'itens'} encontrados
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </form>
      </div>
      
      {/* Estado de carregamento */}
      {loading && (
        <div className="bg-gray-800/90 rounded-xl border border-gray-700/40 p-6">
          <LoadingState text="Carregando suas vendas..." />
        </div>
      )}
      
      {/* Estado de erro */}
      {error && !loading && (
        <div className="bg-gray-800/90 rounded-xl border border-gray-700/40 p-6">
          <ErrorState
            title="Erro ao carregar vendas"
            message={error}
            onRetry={fetchOrders}
          />
        </div>
      )}
      
      {/* Lista de vendas */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              isPurchase={false}
              onClick={handleViewOrder}
            />
          ))}
          
          {/* Paginação */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
      
      {/* Estado vazio */}
      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={DollarSign}
          title="Nenhuma venda encontrada"
          description="Você ainda não realizou nenhuma venda no marketplace."
          actionLabel="Criar um Anúncio"
          onAction={() => navigate('/marketplace/create')}
        />
      )}
    </motion.div>
  );
};

export default SalesPage;