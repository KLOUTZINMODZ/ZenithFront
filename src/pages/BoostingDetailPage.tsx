import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Zap, 
  User, 
  Clock, 
  CheckCircle, 
  MessageSquare,
  Star,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import chatApi from '../services/chatApi';

interface BoostingDetail {
  _id: string;
  agreementId: string;
  conversationId?: string; // Adicionado o campo conversationId
  status: string;
  price: number;
  createdAt: string;
  completedAt?: string;
  game: string;
  category?: string;
  currentRank?: string;
  desiredRank?: string;
  description: string;
  estimatedTime: string;
  client: {
    _id: string;
    name: string;
    avatar?: string;
  };
  booster: {
    _id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
}

const BoostingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openChat } = useChatNavigation();
  const { user } = useAuth();
  
  const [boosting, setBoosting] = useState<BoostingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!id) return;
    
    fetchBoostingDetails();
  }, [id, user]);

  const fetchBoostingDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Usar novo endpoint de BoostingOrder que tem dados persistidos
      const response = await chatApi.get(`/api/boosting-orders/${id}`);
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        
        // BoostingOrder tem serviceSnapshot, Agreement tem proposalSnapshot
        const snapshot = data.serviceSnapshot || data.proposalSnapshot || {};
        
        setBoosting({
          _id: data._id,
          agreementId: data.agreementId || data.orderNumber,
          conversationId: data.conversationId, // Extraindo o conversationId
          status: data.status,
          price: snapshot.price || data.price || 0,
          createdAt: data.createdAt,
          completedAt: data.completedAt,
          game: snapshot.game || '',
          category: snapshot.category,
          currentRank: snapshot.currentRank,
          desiredRank: snapshot.desiredRank,
          description: snapshot.description || '',
          estimatedTime: snapshot.estimatedTime || '',
          client: {
            // BoostingOrder: clientId + clientData, Agreement: parties.client
            _id: data.clientId || data.parties?.client?.userid || '',
            name: data.clientData?.name || data.parties?.client?.name || 'Cliente',
            avatar: data.clientData?.avatar || data.parties?.client?.avatar
          },
          booster: {
            // BoostingOrder: boosterId + boosterData, Agreement: parties.booster
            _id: data.boosterId || data.parties?.booster?.userid || '',
            name: data.boosterData?.name || data.parties?.booster?.name || 'Booster',
            avatar: data.boosterData?.avatar || data.parties?.booster?.avatar,
            rating: data.boosterData?.rating || data.parties?.booster?.rating
          }
        });
      } else {
        setError(response.data.message || 'Erro ao carregar detalhes do boosting');
      }
    } catch (err: any) {
      console.error('Erro ao buscar boosting:', err);
      setError(err?.response?.data?.message || 'Erro ao carregar boosting');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const normalizedStatus = String(status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
        return { label: 'Concluído', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle };
      case 'active':
        return { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock };
      case 'pending':
        return { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock };
      case 'cancelled':
        return { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Shield };
      case 'shipped':
        return { label: 'Enviado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: TrendingUp };
      case 'initiated':
      case 'escrow_reserved':
        return { label: 'Iniciado', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Clock };
      default:
        return { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock };
    }
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

  const isClient = user && boosting && user._id === boosting.client._id;

  if (loading) {
    return (
      <div className="bg-gray-900 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (error || !boosting) {
    return (
      <div className="bg-gray-900 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Erro ao carregar boosting</h3>
          <p className="text-gray-400 mb-6">{error || 'Boosting não encontrado'}</p>
          <button
            onClick={() => navigate('/purchases')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(boosting.status);
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-900 text-white"
    >
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Zap className="w-8 h-8 text-purple-500" />
                Boosting {boosting.game}
              </h1>
              <p className="text-gray-400">ID: {boosting.agreementId}</p>
            </div>
            
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${statusInfo.color}`}>
              <StatusIcon className="w-5 h-5" />
              {statusInfo.label}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Detalhes do Serviço
              </h2>
              
              <div className="space-y-4">
                {}
                {boosting.category && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Categoria</p>
                    <div className="px-3 py-2 bg-gray-700/50 rounded-lg inline-flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium">{boosting.category}</span>
                    </div>
                  </div>
                )}

                {}
                {boosting.currentRank && boosting.desiredRank && 
                 boosting.currentRank !== 'N/A' && boosting.desiredRank !== 'N/A' ? (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Progressão de Rank</p>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-gray-700 rounded-lg font-medium">{boosting.currentRank}</span>
                      <ArrowLeft className="w-5 h-5 text-purple-500 rotate-180" />
                      <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg font-medium text-purple-400">
                        {boosting.desiredRank}
                      </span>
                    </div>
                  </div>
                ) : null}
                
                {}
                {boosting.description && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">
                      {boosting.currentRank && boosting.desiredRank && 
                       boosting.currentRank !== 'N/A' && boosting.desiredRank !== 'N/A' 
                        ? 'Detalhes Adicionais' 
                        : 'Descrição do Serviço'}
                    </p>
                    <div className="px-4 py-3 bg-purple-600/10 border border-purple-500/20 rounded-lg">
                      <p className="text-white">{boosting.description}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Tempo Estimado</p>
                    <p className="text-white font-medium">{boosting.estimatedTime}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Valor</p>
                    <p className="text-white font-bold text-xl">R$ {boosting.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline do Boosting */}
            <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/60">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Timeline
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">Serviço Iniciado</p>
                    <p className="text-gray-400 text-sm">{formatDate(boosting.createdAt)}</p>
                  </div>
                </div>
                
                {boosting.completedAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Serviço Concluído</p>
                      <p className="text-gray-400 text-sm">{formatDate(boosting.completedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Informações do Participante e Ações */}
          <div className="space-y-6">
            {/* Card do Participante */}
            <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/60">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                {isClient ? 'Seu Booster' : 'Cliente'}
              </h2>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                  {(() => {
                    const avatarUrl = isClient ? boosting.booster.avatar : boosting.client.avatar;
                    return avatarUrl && avatarUrl.trim() !== '' ? (
                      <img 
                        src={avatarUrl} 
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-white"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                          }
                        }}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    );
                  })()}
                </div>
                <div>
                  <p className="font-medium">{isClient ? boosting.booster.name : boosting.client.name}</p>
                  {isClient && boosting.booster.rating !== undefined && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      {boosting.booster.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/users/${isClient ? boosting.booster._id : boosting.client._id}`)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Ver Perfil
              </button>
            </div>

            {}
            <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/60">
              <h2 className="text-xl font-bold mb-4">Ações</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('Conversation ID:', boosting?.conversationId);
                    // Usar conversationId se disponível, senão usar agreementId como fallback
                    if (boosting?.conversationId) {
                      openChat(boosting.conversationId);
                    } else if (boosting?.agreementId) {
                      openChat(boosting.agreementId);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Abrir Chat
                </button>
                
                {boosting.status === 'completed' && isClient && (
                  <button
                    onClick={() => navigate(`/rate/boosting/${boosting.agreementId || boosting._id}`)}
                    className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Star className="w-5 h-5" />
                    Avaliar Booster
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BoostingDetailPage;
