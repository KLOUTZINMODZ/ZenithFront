import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Headphones, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Tag,
  FileText,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import supportService from '../services/supportService';

interface Ticket {
  _id: string;
  conversationId?: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  purchaseId?: { _id: string; title?: string };
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: string;
}

const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    avgResponseTime: '< 2h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadTickets();
    loadGlobalStats();
  }, []);

  const loadGlobalStats = async () => {
    try {
      
      const response = await supportService.listTickets({ page: 1, limit: 1000 });
      if (response.success && response.data) {
        const allTickets = response.data.tickets || [];
        
        
        const total = response.data.pagination?.total || allTickets.length;
        const open = allTickets.filter((t: Ticket) => 
          ['pending', 'open', 'under_review', 'in_review'].includes(t.status)
        ).length;
        const inProgress = allTickets.filter((t: Ticket) => t.status === 'in_progress').length;
        const resolved = allTickets.filter((t: Ticket) => 
          ['resolved', 'closed'].includes(t.status)
        ).length;

        setStats({
          total,
          open,
          inProgress,
          resolved,
          avgResponseTime: '< 2h'
        });
      }
    } catch (error) {
      console.error('Error loading global stats:', error);
    }
  };

  const loadTickets = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await supportService.listTickets({ page, limit: 4 });
      if (response.success && response.data) {
        const ticketsData = response.data.tickets || [];
        setTickets(ticketsData);
        
        
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setCurrentPage(response.data.pagination.page || 1);
        }
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateStatus = (status: string): string => {
    const map: Record<string, string> = {
      pending: 'Pendente',
      under_review: 'Em análise',
      in_review: 'Em análise',
      in_progress: 'Em andamento',
      open: 'Aberto',
      resolved: 'Resolvido',
      closed: 'Fechado',
      cancelled: 'Cancelado',
      canceled: 'Cancelado'
    };
    return map[status] || status;
  };

  const translateType = (type: string): string => {
    const map: Record<string, string> = {
      payment_issues: 'Problemas de Pagamento',
      service_not_delivered: 'Serviço não entregue',
      not_received: 'Pedido não recebido',
      refund: 'Reembolso',
      dispute: 'Disputa',
      cancel_order: 'Cancelar pedido',
      track_order: 'Acompanhar pedido',
      other: 'Outro',
      general: 'Geral',
      support: 'Suporte'
    };
    return map[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      in_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      open: 'bg-green-500/20 text-green-400 border-green-500/30',
      resolved: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      canceled: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      pending: <Clock className="w-4 h-4" />,
      under_review: <AlertCircle className="w-4 h-4" />,
      in_review: <AlertCircle className="w-4 h-4" />,
      in_progress: <TrendingUp className="w-4 h-4" />,
      open: <MessageSquare className="w-4 h-4" />,
      resolved: <CheckCircle className="w-4 h-4" />,
      closed: <XCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
      canceled: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <FileText className="w-4 h-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-400',
      medium: 'text-yellow-400',
      low: 'text-green-400',
      urgent: 'text-red-500'
    };
    return colors[priority] || 'text-gray-400';
  };

  const timeAgo = (date: string) => {
    const now = new Date().getTime();
    const ticketTime = new Date(date).getTime();
    const diff = Math.max(0, now - ticketTime);
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `há ${days}d`;
  };

  const handleCreateTicket = () => {
    
    const supportButton = document.querySelector('[data-support-widget-trigger]') as HTMLElement;
    if (supportButton) {
      supportButton.click();
    } else {
      
      navigate('/messages');
      setTimeout(() => {
        const btn = document.querySelector('[data-support-widget-trigger]') as HTMLElement;
        if (btn) btn.click();
      }, 500);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadTickets(nextPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      loadTickets(prevPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket._id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      ticket.status === filterStatus ||
      (filterStatus === 'active' && ['pending', 'open', 'under_review', 'in_review', 'in_progress'].includes(ticket.status));
    
    const matchesType = 
      filterType === 'all' || 
      ticket.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl"
    >
      {}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/30">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-white">
              Central de Suporte
            </h1>
            <p className="text-gray-400 mt-1">
              Gerencie seus tickets e obtenha ajuda da equipe ZenithGG
            </p>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-2xl font-black text-white">{stats.total}</span>
            </div>
            <p className="text-sm text-gray-400">Total de Tickets</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-2xl font-black text-white">{stats.open}</span>
            </div>
            <p className="text-sm text-gray-400">Tickets Ativos</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-2xl font-black text-white">{stats.inProgress}</span>
            </div>
            <p className="text-sm text-gray-400">Em Andamento</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/20 rounded-xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-2xl font-black text-white">{stats.resolved}</span>
            </div>
            <p className="text-sm text-gray-400">Resolvidos</p>
          </motion.div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Link
          to="/faq"
          className="group bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="p-2 bg-purple-500/20 rounded-lg inline-flex mb-3">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Perguntas Frequentes</h3>
              <p className="text-sm text-gray-400">
                Encontre respostas rápidas para dúvidas comuns
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
          </div>
        </Link>

        <Link
          to="/terms"
          className="group bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="p-2 bg-blue-500/20 rounded-lg inline-flex mb-3">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Políticas e Termos</h3>
              <p className="text-sm text-gray-400">
                Consulte nossas políticas e termos de uso
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
          </div>
        </Link>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Tempo Médio de Resposta</h3>
              <p className="text-2xl font-black text-green-400">{stats.avgResponseTime}</p>
              <p className="text-sm text-gray-400 mt-1">Nossa equipe responde rapidamente</p>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tickets por ID, descrição ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="pending">Pendentes</option>
              <option value="in_progress">Em Andamento</option>
              <option value="resolved">Resolvidos</option>
              <option value="closed">Fechados</option>
            </select>
          </div>
        </div>

        {}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-gray-700"
            >
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-400 mr-2">Filtrar por tipo:</span>
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-purple-600 text-white border-2 border-purple-400'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border-2 border-transparent'
                  }`}
                >
                  Todos
                </button>
                {['payment_issues', 'service_not_delivered', 'refund', 'dispute', 'other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filterType === type
                        ? 'bg-purple-600 text-white border-2 border-purple-400'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border-2 border-transparent'
                    }`}
                  >
                    {translateType(type)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum ticket encontrado</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Você ainda não tem tickets de suporte'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button 
                onClick={handleCreateTicket}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Criar Novo Ticket
              </button>
            )}
          </div>
        ) : (
          filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 rounded-xl p-6 transition-all cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        {getStatusIcon(ticket.status)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-500">#{ticket._id.slice(-8)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)} inline-flex items-center gap-1`}>
                          {getStatusIcon(ticket.status)}
                          {translateStatus(ticket.status)}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                          {translateType(ticket.type)}
                        </span>
                        {ticket.priority && (
                          <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            • {ticket.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium mb-2 line-clamp-2">
                        {ticket.description || 'Ticket de suporte'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {timeAgo(ticket.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {}
      {!loading && filteredTickets.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2
              ${currentPage === 1 
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          
          <div className="px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
            <span className="text-white font-medium">
              Página {currentPage} de {totalPages}
            </span>
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2
              ${currentPage === totalPages 
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
              }
            `}
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {}
      <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-8 text-center">
        <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-3">Precisa de Ajuda?</h3>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          Nossa equipe de suporte está disponível para ajudá-lo com qualquer dúvida ou problema.
          Crie um ticket e responderemos o mais rápido possível!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={handleCreateTicket}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Novo Ticket
          </button>
          <Link
            to="/faq"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Ver FAQ
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default SupportPage;
