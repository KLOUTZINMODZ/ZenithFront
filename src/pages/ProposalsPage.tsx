import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  MessageSquare,
  Star,
  Trophy,
  CheckCircle,
  Loader2,
  AlertCircle,
  Target,
  Gamepad2,
  Plus,
  FileText,
  Image,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Tag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useProposal } from '../contexts/ProposalContext';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { useDevice } from '../hooks/useDevice';
import { boostingService, userService } from '../services';
import ProposalModal from '../components/ProposalModal';
import ImagePlaceholder from '../components/ImagePlaceholder';
import proposalWebSocketService from '../services/proposalWebSocketService';

interface Proposal {
  _id: string;
  boosterId: string;
  booster: {
    userid: number;
    name: string;
    avatar: string;
    rating: number;
    totalBoosts?: number;
    completedBoosts?: number;
    statistics?: {
      totalBoosts?: number;
      completedBoosts?: number;
      boostsCompleted?: number;
      totalOrders?: number;
      successfulOrders?: number;
      deliveredOrders?: number;
    };
  };
  proposedPrice: number;
  estimatedTime: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface DetailItem {
  label: string;
  value: string;
  icon: LucideIcon;
  emphasize?: boolean;
}

interface QuickStat {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  accentClass: string;
}

const normalizeImageUrl = (imagePath?: string | null): string | null => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const baseUrl = ((import.meta as any).env?.VITE_CHAT_API_URL || 'https://zenith.enrelyugi.com.br').replace(/\/$/, '');
  const formattedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${baseUrl}${formattedPath}`;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

const truncateText = (value?: string | null, maxChars = 25) => {
  if (!value) return '';
  return value.length > maxChars ? `${value.substring(0, maxChars).trim()}…` : value;
};

const formatMemberSince = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return `Desde ${new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric'
  }).format(date)}`;
};

const formatMemberDuration = (joinDate?: string) => {
  if (!joinDate) return null;
  const joinDateDate = new Date(joinDate);
  if (Number.isNaN(joinDateDate.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - joinDateDate.getFullYear()) * 12 + (now.getMonth() - joinDateDate.getMonth());
  if (months <= 0) return 'Menos de 1 mês';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
};

const getProposalBoosterIdentifier = (proposal: Proposal): string | null => {
  if (proposal.boosterId) return proposal.boosterId;
  if (proposal.booster?.userid) return String(proposal.booster.userid);
  return null;
};

const getBoosterCompletedBoostsFromProposal = (booster?: Proposal['booster']): number => {
  if (!booster) return 0;
  const candidates = [
    booster.totalBoosts,
    booster.completedBoosts,
    booster.statistics?.completedBoosts,
    booster.statistics?.boostsCompleted,
    booster.statistics?.totalBoosts,
    booster.statistics?.successfulOrders,
    booster.statistics?.deliveredOrders,
    booster.statistics?.totalOrders
  ];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return 0;
};

const extractBoosterIdentifier = (proposal: Proposal): string | null => {
  return getProposalBoosterIdentifier(proposal);
};

interface BoostingRequest {
  _id: string;
  clientId?: string;
  currentRank?: string;
  desiredRank?: string;
  minPrice: number;
  game: string;
  boostingCategory?: string;
  estimatedTime?: string;
  gameMode?: string;
  additionalInfo?: string;
  description?: string;
  accountImage?: string;
  tags?: string[];
  priority?: string;
  views?: number;
  rating?: {
    average: number;
    count: number;
  };
  detached?: boolean;
  acceptedProposal?: {
    proposedPrice: number;
    estimatedTime: string;
  };
  expirationDate?: string;
  createdAt?: string;
  updatedAt?: string;
  client: {
    name: string;
    avatar: string;
    isVerified?: boolean;
    joinDate?: string;
    achievementsCount?: number;
    statistics?: {
      totalSales?: number;
      totalPurchases?: number;
      totalTransactions?: number;
    };
  };
  status: string;
  isActive: boolean;
}

const ProposalsPage: React.FC = () => {
  const { boostingId } = useParams<{ boostingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { acceptProposal, acceptingProposal, acceptedProposals } = useProposal();
  const { openChat } = useChatNavigation();
  const { isMobile } = useDevice();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [boostingRequest, setBoostingRequest] = useState<BoostingRequest | null>(null);
  const [boosterStats, setBoosterStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  

  const [showProposalModal, setShowProposalModal] = useState(false);
  

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState('');
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [acceptedProposalId, setAcceptedProposalId] = useState<string | null>(null);
  const accountImageUrl = useMemo(() => normalizeImageUrl(boostingRequest?.accountImage), [boostingRequest?.accountImage]);
  const clientProfileUrl = boostingRequest?.clientId ? `https://zenithgg.com.br/users/${boostingRequest.clientId}` : null;
  const memberSinceText = useMemo(() => formatMemberSince(boostingRequest?.client?.joinDate), [boostingRequest?.client?.joinDate]);
  const memberDurationText = useMemo(() => formatMemberDuration(boostingRequest?.client?.joinDate), [boostingRequest?.client?.joinDate]);
  const clientAchievements = boostingRequest?.client?.achievementsCount ?? boostingRequest?.client?.statistics?.totalTransactions ?? 0;
  const openClientProfile = useCallback(() => {
    if (clientProfileUrl) {
      window.open(clientProfileUrl, '_blank', 'noopener,noreferrer');
    }
  }, [clientProfileUrl]);
  const quickStats = useMemo<QuickStat[]>(() => {
    if (!boostingRequest) return [];
    const stats: QuickStat[] = [];

    stats.push({
      label: 'Status',
      value: boostingRequest.isActive ? 'Ativo' : 'Encerrado',
      icon: CheckCircle,
      iconClass: boostingRequest.isActive ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-200',
      accentClass: boostingRequest.isActive ? 'text-green-200' : 'text-yellow-100'
    });

    stats.push({
      label: 'Propostas',
      value: `${proposals?.length || 0}`,
      icon: MessageSquare,
      iconClass: 'bg-blue-500/10 text-blue-200',
      accentClass: 'text-blue-100'
    });

    stats.push({
      label: 'Preço mínimo',
      value: formatPrice(boostingRequest.minPrice),
      icon: DollarSign,
      iconClass: 'bg-purple-500/10 text-purple-200',
      accentClass: 'text-purple-100'
    });

    stats.push({
      label: 'Expira em',
      value: boostingRequest.expirationDate
        ? new Date(boostingRequest.expirationDate).toLocaleDateString('pt-BR')
        : '—',
      icon: Clock,
      iconClass: 'bg-orange-500/10 text-orange-200',
      accentClass: 'text-orange-100'
    });

    if (boostingRequest.tags?.length) {
      stats.push({
        label: 'Tags',
        value: truncateText(boostingRequest.tags.join(', '), 35),
        icon: Tag,
        iconClass: 'bg-purple-500/10 text-purple-300',
        accentClass: 'text-purple-200'
      });
    }

    return stats;
  }, [boostingRequest, proposals?.length]);

  const baseInfoItems = useMemo<DetailItem[]>(() => {
    if (!boostingRequest) return [];
    const items: DetailItem[] = [
      {
        label: 'Categoria',
        value: truncateText(boostingRequest.boostingCategory || 'Serviço Personalizado'),
        icon: Star
      }
    ];

    if (boostingRequest.estimatedTime) {
      items.push({ label: 'Tempo estimado', value: truncateText(boostingRequest.estimatedTime), icon: Clock });
    }

    if (boostingRequest.gameMode) {
      items.push({ label: 'Modo de jogo', value: truncateText(boostingRequest.gameMode), icon: Gamepad2 });
    }

    return items;
  }, [boostingRequest]);

  const handleBoostingCancelled = useCallback((data: any) => {
    if (!boostingId || data.boostingId !== boostingId) return;


    setProposals([]);
    setShowProposalModal(false);
    setShowCancelModal(false);

    localStorage.removeItem(`boosting_${boostingId}`);
    localStorage.removeItem(`proposals_${boostingId}`);
    if (data.conversationId) {
      localStorage.removeItem(`conversation_${data.conversationId}`);
    }

    addNotification({
      title: 'Pedido cancelado',
      message: data.reason || 'Este pedido de boosting foi cancelado pelo administrador',
      type: 'warning'
    });

    setTimeout(() => {
      navigate('/browse-boostings');
    }, 2000);
  }, [boostingId, addNotification, navigate]);

  const handleBoostingBroken = useCallback((data: any) => {
    if (!boostingId || data.boostingId !== boostingId) return;


    setProposals([]);
    setShowProposalModal(false);
    setShowCancelModal(false);

    localStorage.removeItem(`boosting_${boostingId}`);
    localStorage.removeItem(`proposals_${boostingId}`);
    if (data.conversationId) {
      localStorage.removeItem(`conversation_${data.conversationId}`);
    }

    addNotification({
      title: 'Solicitação cancelada',
      message: data.reason || 'Você cancelou esta solicitação antes de aceitar uma proposta',
      type: 'info'
    });

    setTimeout(() => {
      navigate('/browse-boostings');
    }, 2000);
  }, [boostingId, addNotification, navigate]);

  // ✅ Monitorar mudanças de propostas aceitas em tempo real
  useEffect(() => {
    if (acceptedProposalId) {
      // Fechar modais automaticamente quando uma proposta é aceita
      setShowProposalModal(false);
      setShowCancelModal(false);
      
      // Resetar após 2 segundos
      const timer = setTimeout(() => {
        setAcceptedProposalId(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [acceptedProposalId]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!boostingId) {
      navigate('/browse-boostings');
      return;
    }

    fetchProposals();
  }, [boostingId, user, navigate]);

  
  useEffect(() => {
    if (!boostingId) return;

    
    const connectWebSocket = async () => {
      try {
        if (!proposalWebSocketService.isConnected()) {
          await proposalWebSocketService.connect();
        }
        
        proposalWebSocketService.subscribeToBoostingProposals(boostingId);
      } catch (error) {
      }
    };

    connectWebSocket();

    
    const handleNewProposal = (data: any) => {
      if (data.boostingId !== boostingId) return;
      
      
      setProposals((prev: Proposal[]) => {
        
        const exists = prev.some((p: Proposal) => p._id === data.proposal._id);
        if (exists) {
          return prev.map((p: Proposal) => p._id === data.proposal._id ? data.proposal : p);
        }
        return [data.proposal, ...prev];
      });
    };

    
    const handleProposalUpdated = (data: any) => {
      if (data.boostingId !== boostingId) return;
      
      
      setProposals((prev: Proposal[]) => prev.map((p: Proposal) => 
        p._id === data.proposal._id ? data.proposal : p
      ));
    };

    
    const handleProposalAccepted = (data: any) => {
      if (data.boostingId !== boostingId) return;
      
      
      // ✅ REMOVER proposta aceita da lista (não apenas mudar status)
      setProposals(prev => prev.filter(p => p._id !== data.proposalId));

      // ✅ Fechar modais automaticamente para ambos os usuários
      setShowProposalModal(false);
      setShowCancelModal(false);
      
      addNotification({
        title: 'Proposta Aceita',
        message: 'Uma proposta foi aceita!',
        type: 'success'
      });

      
      fetchProposals();
    };

    
    const handleProposalRejected = (data: any) => {
      if (data.boostingId !== boostingId) return;
      
      
      // ✅ REMOVER proposta rejeitada da lista (não apenas mudar status)
      setProposals((prev: Proposal[]) => prev.filter((p: Proposal) => p._id !== data.proposalId));
    };

    
    const handleProposalCancelled = (data: any) => {
      if (data.boostingId !== boostingId) return;
      
      
      setProposals((prev: Proposal[]) => prev.filter((p: Proposal) => p._id !== data.proposalId));
    };

    // ✅ NOVO: Handler para proposta removida (aceita por outro usuário)
    const handleProposalRemoved = (data: any) => {
      if (data.boostingId !== boostingId) return;
      
      
      setProposals((prev: Proposal[]) => prev.filter((p: Proposal) => p._id !== data.proposalId));
    };

    
    
    proposalWebSocketService.on('proposal:new', handleNewProposal);
    proposalWebSocketService.on('proposal:updated', handleProposalUpdated);
    proposalWebSocketService.on('proposal:accepted', handleProposalAccepted);
    proposalWebSocketService.on('proposal:rejected', handleProposalRejected);
    proposalWebSocketService.on('proposal:cancelled', handleProposalCancelled);
    proposalWebSocketService.on('proposal:removed', handleProposalRemoved);
    proposalWebSocketService.on('boosting:cancelled', handleBoostingCancelled);
    proposalWebSocketService.on('boosting:broken', handleBoostingBroken);

    
    return () => {
      proposalWebSocketService.off('proposal:new', handleNewProposal);
      proposalWebSocketService.off('proposal:updated', handleProposalUpdated);
      proposalWebSocketService.off('proposal:accepted', handleProposalAccepted);
      proposalWebSocketService.off('proposal:rejected', handleProposalRejected);
      proposalWebSocketService.off('proposal:cancelled', handleProposalCancelled);
      proposalWebSocketService.off('proposal:removed', handleProposalRemoved);
      proposalWebSocketService.off('boosting:cancelled', handleBoostingCancelled);
      proposalWebSocketService.off('boosting:broken', handleBoostingBroken);
      
      
      proposalWebSocketService.unsubscribeFromBoostingProposals(boostingId);
    };
  }, [boostingId, addNotification, navigate, handleBoostingCancelled, handleBoostingBroken]);

  
  useEffect(() => {
    const onAccepted = (e: Event) => {
      const custom = e as CustomEvent<{ boostingId?: string | null; proposalId?: string | null; conversationId: string }>;

      if (custom.detail?.boostingId && boostingId && custom.detail.boostingId !== boostingId) return;

      fetchProposals();

      if (custom.detail?.proposalId) {
        setProposals(prev => prev.map(p => ({
          ...p,
          status: p._id === custom.detail!.proposalId ? 'accepted' : p.status
        })));
      }
    };

    const onCancelled = () => {
      fetchProposals();
    };

    window.addEventListener('boosting:proposal-accepted', onAccepted as EventListener);
    window.addEventListener('boosting:proposal-cancelled', onCancelled as EventListener);
    return () => {
      window.removeEventListener('boosting:proposal-accepted', onAccepted as EventListener);
      window.removeEventListener('boosting:proposal-cancelled', onCancelled as EventListener);
    };
  }, [boostingId]);

  const fetchBoosterStats = useCallback(async (list: Proposal[]) => {
    if (!Array.isArray(list) || list.length === 0) return;

    const idsToFetch = Array.from(
      new Set(
        list
          .map(extractBoosterIdentifier)
          .filter((id): id is string => Boolean(id) && boosterStats[id as string] === undefined)
      )
    );

    if (!idsToFetch.length) return;

    try {
      const results = await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const data = await userService.getUserById(id);
            const completed = typeof data.totalSales === 'number' && Number.isFinite(data.totalSales) && data.totalSales >= 0
              ? data.totalSales
              : undefined;
            return { id, completed };
          } catch (error) {
            return { id, completed: undefined };
          }
        })
      );

      setBoosterStats((prev) => {
        let mutated = false;
        const next = { ...prev };
        results.forEach(({ id, completed }) => {
          if (completed !== undefined && next[id] !== completed) {
            next[id] = completed;
            mutated = true;
          }
        });
        return mutated ? next : prev;
      });
    } catch (error) {
      // Silently ignore fetch errors to avoid blocking UI
    }
  }, [boosterStats]);

  useEffect(() => {
    if (proposals.length) {
      fetchBoosterStats(proposals);
    }
  }, [proposals, fetchBoosterStats]);

  const resolveBoosterCompletedBoosts = useCallback((proposal: Proposal): number => {
    const id = extractBoosterIdentifier(proposal);
    if (id && boosterStats[id] !== undefined) {
      return boosterStats[id];
    }
    return getBoosterCompletedBoostsFromProposal(proposal.booster);
  }, [boosterStats]);

  const fetchProposals = async () => {
    if (!boostingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await boostingService.getProposals(boostingId);
      
      if (response.success && response.data) {
        
        const fetchedProposals = response.data.proposals || [];
        setProposals(fetchedProposals);
        setBoostingRequest(response.data.boostingRequest);
        fetchBoosterStats(fetchedProposals);
        
      } else {
        setError(response.message || 'Erro ao carregar propostas');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBoosterProfile = useCallback((proposal?: Proposal) => {
    if (!proposal) return;
    const boosterId = proposal.boosterId || (proposal.booster?.userid ? String(proposal.booster.userid) : null);
    if (!boosterId) return;
    navigate(`/users/${boosterId}`);
  }, [navigate]);

  const handleAcceptProposal = async (proposalId: string) => {
    if (!boostingId || !user) return;

    if (boostingRequest?.client.name !== user.name) {
      addNotification({
        title: 'Erro',
        message: 'Você não tem permissão para aceitar propostas neste pedido',
        type: 'error'
      });
      return;
    }

    // ✅ Marcar proposta como aceita IMEDIATAMENTE para feedback visual
    setAcceptedProposalId(proposalId);

    try {
      await acceptProposal(proposalId, async () => {
        // Usar a mesma lógica do UnifiedChatComponent para garantir sincronização
        const envChatApi = (import.meta as any).env?.VITE_CHAT_API_URL || 'https://zenith.enrelyugi.com.br';
        let chatApiUrl = envChatApi.replace(/\/$/, '');
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && chatApiUrl.startsWith('http://')) {
          chatApiUrl = chatApiUrl.replace('http://', 'https://');
        }

        // Buscar a proposta aceita para pegar dados do booster
        const proposal = proposals.find(p => p._id === proposalId);
        if (!proposal) {
          throw new Error('Proposta não encontrada');
        }

        // 🔍 Buscar conversationId do localStorage (obrigatório para aceitar)
        let conversationId: string | null = null;
        try {
          const conversationsData = localStorage.getItem('unified_chat_conversations');
          if (conversationsData) {
            const conversations = JSON.parse(conversationsData);
            const matchingConv = conversations.find((conv: any) => 
              conv.metadata?.proposalId === proposalId || 
              conv.metadata?.boostingId === boostingId ||
              conv.proposal === proposalId ||
              conv.proposal?.includes(proposalId)
            );
            if (matchingConv) {
              conversationId = matchingConv._id;
            }
          }
        } catch (e) {
        }

        if (!conversationId) {
          addNotification({
            title: 'Erro ao aceitar proposta',
            message: 'Não foi possível localizar o chat desta proposta. Recarregue a página de mensagens e tente novamente.',
            type: 'error'
          });
          throw new Error('conversationId não encontrado para esta proposta');
        }

        const response = await fetch(`${chatApiUrl}/api/proposals/${proposalId}/accept`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            conversationId: conversationId,
            boostingId: boostingId,
            boosterId: proposal.booster.userid,
            clientId: user.id,
            // ✅ ADICIONADO: Incluir dados completos da proposta para o backend
            proposalData: {
              price: proposal.proposedPrice,
              estimatedTime: proposal.estimatedTime,
              message: proposal.message,
              game: boostingRequest?.game,
              category: boostingRequest?.boostingCategory,
              currentRank: boostingRequest?.currentRank,
              desiredRank: boostingRequest?.desiredRank,
              description: boostingRequest?.description
            },
            metadata: {
              boostingId: boostingId,
              proposalId: proposalId,
              conversationId: conversationId,  // Também no metadata como fallback
              proposalData: {
                price: proposal.proposedPrice,
                estimatedTime: proposal.estimatedTime,
                message: proposal.message,
                game: boostingRequest?.game,
                category: boostingRequest?.boostingCategory,
                currentRank: boostingRequest?.currentRank,
                desiredRank: boostingRequest?.desiredRank,
                description: boostingRequest?.description
              }
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        // Atualiza conversationId com o retornado pelo servidor (se não tiver encontrado antes)
        if (!conversationId) {
          conversationId = responseData.data?.conversationId || responseData.conversationId;
        }
        const acceptedProposal = responseData.acceptedProposal || responseData.data;

        // ✅ Atualizar lista de propostas em tempo real (ANTES de disparar eventos)
        setProposals((prev: Proposal[]) => prev.filter((p: Proposal) => p._id !== proposalId));

        // Disparar eventos CustomEvent para sincronizar com chat
        if (conversationId) {
          const websocketEvent = {
            event: 'proposal:accepted',
            data: {
              conversationId: conversationId,
              proposalId: proposalId,
              boostingId: boostingId,
              acceptedProposal: acceptedProposal,
              proposalData: {
                status: 'accepted',
                boosterId: proposal.booster.userid,
                clientId: user.id,
                // ✅ ADICIONADO: Incluir dados completos da proposta para o backend
                price: proposal.proposedPrice,
                estimatedTime: proposal.estimatedTime,
                message: proposal.message,
                game: boostingRequest?.game,
                category: boostingRequest?.boostingCategory,
                currentRank: boostingRequest?.currentRank,
                desiredRank: boostingRequest?.desiredRank,
                description: boostingRequest?.description
              },
              clientData: {
                userid: user.id,
                name: user.name,
                avatar: user.avatar
              },
              boosterData: {
                userid: proposal.booster.userid,
                name: proposal.booster.name,
                avatar: proposal.booster.avatar
              },
              timestamp: new Date().toISOString()
            }
          };

          // Disparar evento para o chat atualizar
          window.dispatchEvent(new CustomEvent('boosting:proposal-accepted', {
            detail: websocketEvent.data
          }));

          // Atualizar localStorage de conversas
          const conversationsData = localStorage.getItem('unified_chat_conversations');
          if (conversationsData) {
            const conversations = JSON.parse(conversationsData);
            const updatedConversations = conversations.map((conv: any) => {
              if (conv._id === conversationId || conv.metadata?.proposalId === proposalId) {
                return {
                  ...conv,
                  status: 'accepted',
                  isTemporary: false,
                  boostingStatus: 'active',
                  metadata: {
                    ...conv.metadata,
                    proposalData: {
                      ...conv.metadata?.proposalData,
                      status: 'accepted'
                    }
                  }
                };
              }
              return conv;
            });
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedConversations));

            // Força atualização das conversas
            window.dispatchEvent(new CustomEvent('conversations:force-update', {
              detail: { conversations: updatedConversations }
            }));
          }

          // ✅ Aguardar confirmação do WebSocket ANTES de abrir chat
          // Isso garante que a conversa foi atualizada em tempo real para ambos os usuários
          await new Promise(resolve => {
            const timeout = setTimeout(() => {
              resolve(null);
            }, 2000);

            const handleWebSocketConfirmation = () => {
              clearTimeout(timeout);
              window.removeEventListener('boosting:proposal-accepted', handleWebSocketConfirmation);
              resolve(null);
            };

            window.addEventListener('boosting:proposal-accepted', handleWebSocketConfirmation);
          });

          // ✅ Atualizar lista de propostas para sincronizar com backend
          await fetchProposals();

          // ✅ Abrir chat APÓS confirmação do WebSocket
          openChat(conversationId);
        } else {
          // Se não houver conversationId, apenas atualizar propostas
          await fetchProposals();
        }

        addNotification({
          title: 'Sucesso',
          message: 'Proposta aceita com sucesso!',
          type: 'success'
        });

        return responseData;
      });
    } catch (err: any) {
      // ✅ Resetar estado de aceitação em caso de erro
      setAcceptedProposalId(null);
      
      // Extrair mensagem de erro simples se for erro de saldo
      let errorMessage = err.message || 'Erro interno do servidor';
      
      // Se contém "Saldo insuficiente", exibir apenas isso
      if (errorMessage.includes('Saldo insuficiente')) {
        errorMessage = 'Saldo insuficiente.';
      }
      
      
      addNotification({
        title: 'Erro',
        message: errorMessage,
        type: 'error'
      });
    }
  };

  const handleProposalCreated = async () => {
    setShowProposalModal(false);

    await fetchProposals();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (value: number) => {
    const rounded = Math.round(Number(value || 0));
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={
              'w-4 h-4 transition-all ' + (i + 1 <= rounded ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]' : 'text-gray-600')
            }
          />
        ))}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400 bg-green-900/20 border-green-700/30';
      case 'rejected': return 'text-red-400 bg-red-900/20 border-red-700/30';
      case 'pending': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Aceita';
      case 'rejected': return 'Rejeitada';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const isOwner = user && boostingRequest && boostingRequest.client.name === user.name;
  const canAcceptProposals = isOwner && boostingRequest?.isActive && boostingRequest?.status === 'open';
  

  const userHasProposal = user && proposals && Array.isArray(proposals) && proposals.some(proposal => 
    proposal.booster?.name === user.name || 
    proposal.boosterId === user.id
  );
  

  const canCreateProposal = user && !isOwner && boostingRequest?.isActive && 
                           boostingRequest?.status === 'open' && !userHasProposal;


  const openImageViewer = (imageSrc?: string | null) => {
    if (!imageSrc) return;
    setImageViewerSrc(imageSrc);
    setShowImageViewer(true);
    setImageZoom(1);
    setImageRotation(0);
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
    setImageViewerSrc('');
    setImageZoom(1);
    setImageRotation(0);
  };

  const zoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotateImage = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleCancelRequest = async () => {
    if (!boostingId || !user) return;

    if (!isOwner) {
      addNotification({
        title: 'Erro',
        message: 'Você não tem permissão para cancelar esta solicitação',
        type: 'error'
      });
      return;
    }

    setCancelling(true);
    try {
      const response = await boostingService.breakBoostingRequest(boostingId);

      if (response.success) {
        addNotification({
          title: 'Solicitação cancelada',
          message: 'Estamos removendo sua solicitação e notificando os boosters em tempo real.',
          type: 'success'
        });

        handleBoostingBroken({
          boostingId,
          reason: response.message || 'Solicitação cancelada pelo cliente'
        });
      } else {
        throw new Error(response.message || 'Erro ao cancelar solicitação');
      }
    } catch (err: any) {
      addNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err.message || 'Erro ao cancelar solicitação',
        type: 'error'
      });
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br via-gray-800 text-white">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Propostas do Pedido
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Visualize e gerencie as propostas recebidas
              </p>
            </div>
            
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
              {isOwner && boostingRequest?.status === 'open' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCancelModal(true)}
                  className={`flex items-center gap-2 ${
                    isMobile ? 'px-3 py-1.5' : 'px-4 py-2'
                  } bg-gray-700 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25`}
                >
                  <X className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  <span className="hidden sm:inline">Cancelar solicitação</span>
                  <span className="sm:hidden">Cancelar</span>
                </motion.button>
              )}
              
              {canCreateProposal && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowProposalModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Fazer Proposta</span>
                  <span className="sm:hidden">Proposta</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-gray-300">Carregando propostas...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">Erro ao carregar</h3>
            <p className="text-gray-400 mb-3 text-sm">{error}</p>
            <button
              onClick={fetchProposals}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors text-sm"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && boostingRequest && (
          <>
            {}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-gray-800/60 rounded-2xl p-6 mb-6 border border-gray-700/80 shadow-2xl shadow-black/20"
            >
              <button
                type="button"
                onClick={openClientProfile}
                disabled={!clientProfileUrl}
                className={`flex items-center gap-4 mb-6 text-left ${clientProfileUrl ? 'hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500' : ''}`}
                aria-label={clientProfileUrl ? `Ver perfil de ${boostingRequest.client.name}` : undefined}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden shadow-lg shadow-purple-500/20">
                  {boostingRequest.client.avatar ? (
                    <img
                      src={boostingRequest.client.avatar}
                      alt={boostingRequest.client.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const parent = target.parentElement;
                        if (parent) {
                          target.style.display = 'none';
                          const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }
                      }}
                    />
                  ) : null}
                  <span className={`avatar-fallback text-white font-semibold text-lg ${boostingRequest.client.avatar ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                    {boostingRequest.client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide">Pedido de {boostingRequest.game}</p>
                  <h3 className="font-semibold text-white text-2xl leading-tight">{boostingRequest.client.name}</h3>
                  <p className="text-sm text-gray-500">Publicado com prioridade para boosters confiáveis</p>
                </div>
              </button>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] items-start">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {baseInfoItems.map((item: DetailItem) => (
                      <div key={item.label} className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 shadow-inner">
                        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        <p className={`mt-2 text-base font-semibold break-words ${item.emphasize ? 'text-green-400 text-lg' : 'text-white line-clamp-2'}`} title={item.value}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {quickStats.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      {quickStats.map((stat) => (
                        <div
                          key={`stat-${stat.label}`}
                          className="bg-gray-900/30 border border-gray-800 rounded-2xl p-3 flex items-center gap-3 shadow-inner"
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.iconClass}`}>
                            <stat.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">{stat.label}</p>
                            <p className={`text-sm font-semibold ${stat.accentClass}`}>{stat.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(boostingRequest.currentRank || boostingRequest.desiredRank) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {boostingRequest.currentRank && (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
                            <Target className="w-4 h-4" />
                            Rank atual
                          </div>
                          <p className="mt-2 text-white font-semibold break-words line-clamp-2" title={boostingRequest.currentRank || ''}>
                            {truncateText(boostingRequest.currentRank)}
                          </p>
                        </div>
                      )}
                      {boostingRequest.desiredRank && (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
                            <Trophy className="w-4 h-4" />
                            Rank desejado
                          </div>
                          <p className="mt-2 text-white font-semibold break-words line-clamp-2" title={boostingRequest.desiredRank || ''}>
                            {truncateText(boostingRequest.desiredRank)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(boostingRequest.additionalInfo || boostingRequest.description || boostingRequest.client) && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {boostingRequest.additionalInfo && (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Informações complementares</p>
                          <p
                            className="text-gray-300 text-sm leading-relaxed break-words"
                            title={boostingRequest.additionalInfo}
                          >
                            {truncateText(boostingRequest.additionalInfo, 25)}
                          </p>
                        </div>
                      )}
                      {boostingRequest.description && (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 flex flex-col sm:col-span-2 xl:col-span-2">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                            <FileText className="w-4 h-4" />
                            Descrição do pedido
                          </div>
                          <p className={`text-gray-300 text-sm leading-relaxed flex-1 break-words ${
                            !isDescriptionExpanded && boostingRequest.description.length > 200
                              ? 'line-clamp-3'
                              : ''
                          }`}>
                            {isDescriptionExpanded
                              ? boostingRequest.description
                              : boostingRequest.description.length > 200
                                ? `${boostingRequest.description.substring(0, 200)}...`
                                : boostingRequest.description}
                          </p>
                          {boostingRequest.description.length > 200 && (
                            <button
                              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                              className="mt-2 text-purple-300 hover:text-purple-100 text-sm font-medium self-start"
                            >
                              {isDescriptionExpanded ? 'Ler menos' : 'Ler mais'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4 lg:sticky lg:top-6">
                  <div className="bg-gray-900/60 rounded-2xl border border-gray-800/80 overflow-hidden shadow-lg flex flex-col h-full">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                      <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                        <Image className="w-4 h-4" />
                        Imagem do Pedido
                      </div>
                      {accountImageUrl && (
                        <button
                          onClick={() => openImageViewer(accountImageUrl)}
                          className="text-xs text-purple-300 hover:text-purple-100 transition-colors"
                        >
                          Ver maior
                        </button>
                      )}
                    </div>
                    <div className="p-4 pb-3 flex-1 flex flex-col gap-2 justify-between">
                      <div className={`relative rounded-xl flex-1 min-h-[340px] ${accountImageUrl ? 'border border-gray-800/80' : 'border-2 border-dashed border-gray-700/70 flex items-center justify-center h-48'}`}>
                        {accountImageUrl ? (
                          <div
                            className="relative h-full w-full bg-gray-800 rounded-xl overflow-hidden cursor-pointer group"
                            onClick={() => openImageViewer(accountImageUrl)}
                          >
                            <img
                              src={accountImageUrl}
                              alt="Imagem da conta do cliente"
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const placeholder = (e.currentTarget.nextElementSibling as HTMLElement) || null;
                                if (placeholder) placeholder.style.display = 'none';
                              }}
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                            />
                            <ImagePlaceholder className="absolute inset-0 flex items-center justify-center" style={{ display: 'flex' }} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-sm rounded-full p-2">
                                <ZoomIn className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-2 px-6">
                            <ImagePlaceholder className="mx-auto w-12 h-12" />
                            <p className="text-sm text-gray-400 font-medium">Cliente não anexou imagem</p>
                            <p className="text-xs text-gray-500">Quando houver upload, ele aparecerá automaticamente aqui.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {}
            {!proposals || proposals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center py-12"
              >
                <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Nenhuma proposta ainda</h3>
                <p className="text-gray-500 text-sm">
                  Este pedido ainda não recebeu propostas.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    Propostas ({proposals?.length || 0})
                  </h2>
                  {!canAcceptProposals && boostingRequest.status !== 'open' && (
                    <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                      Pedido não está mais ativo
                    </span>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {proposals && proposals.map((proposal, index) => {
                    const boosterCompletedBoosts = resolveBoosterCompletedBoosts(proposal);
                    return (
                    <motion.div
                      key={proposal._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`bg-gray-800/50 rounded-xl p-6 border transition-all duration-200 ${
                        proposal.status === 'accepted' 
                          ? 'border-green-500/50 bg-green-900/10' 
                          : proposal.status === 'rejected'
                          ? 'border-red-500/50 bg-red-900/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <button
                          type="button"
                          onClick={() => handleOpenBoosterProfile(proposal)}
                          className="flex items-center gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-full/None"
                          aria-label={`Ver perfil de ${proposal.booster.name}`}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                            {proposal.booster.avatar ? (
                              <img
                                src={proposal.booster.avatar}
                                alt={proposal.booster.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const parent = target.parentElement;
                                  if (parent) {
                                    target.style.display = 'none';
                                    const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = 'flex';
                                    }
                                  }
                                }}
                              />
                            ) : null}
                            <span className={`avatar-fallback text-white font-semibold text-lg ${proposal.booster.avatar ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                              {proposal.booster.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-white text-lg">{proposal.booster.name}</h3>
                            <div className="flex flex-col gap-2 mt-1">
                              <div className="flex items-center gap-2">
                                {renderStars(proposal.booster.rating || 0)}
                                <span className="text-sm text-yellow-400 font-semibold">
                                  {proposal.booster.rating > 0 ? proposal.booster.rating.toFixed(1) : '—'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-400">
                                <Trophy className="w-4 h-4 text-purple-400" />
                                <span>{boosterCompletedBoosts} boosts concluídos</span>
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                            {getStatusText(proposal.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm">Preço Proposto</span>
                          </div>
                          <p className="text-green-400 font-bold text-lg">{formatPrice(proposal.proposedPrice)}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Tempo Estimado</span>
                          </div>
                          <p className="text-white font-semibold">{proposal.estimatedTime}</p>
                        </div>
                      </div>

                      {proposal.message && (
                        <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm">Mensagem</span>
                          </div>
                          <p className="text-gray-300">{proposal.message}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <span className="text-sm text-gray-400">
                          Enviada em {formatDate(proposal.createdAt)}
                        </span>

                        {canAcceptProposals && proposal.status === 'pending' && !acceptedProposals.has(proposal._id) && (
                          <button
                            onClick={() => handleAcceptProposal(proposal._id)}
                            disabled={acceptingProposal === proposal._id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {acceptingProposal === proposal._id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Aceitando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Aceitar Proposta
                              </>
                            )}
                          </button>
                        )}
                        {acceptedProposals.has(proposal._id) && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Proposta Aceita
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );})}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>

      {}
      {boostingRequest && (
        <ProposalModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          boostingRequest={{
            _id: boostingRequest._id,
            currentRank: boostingRequest.currentRank || '',
            desiredRank: boostingRequest.desiredRank || '',
            minPrice: boostingRequest.minPrice,
            game: boostingRequest.game,
            client: boostingRequest.client
          }}
          onProposalCreated={handleProposalCreated}
        />
      )}

      {}
      <AnimatePresence>
        {showImageViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeImageViewer}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-2xl lg:max-w-3xl max-h-[85vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Imagem da Conta</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={zoomOut}
                      className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                      title="Diminuir zoom"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-white text-sm px-2">
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                      title="Aumentar zoom"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={rotateImage}
                      className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                      title="Rotacionar"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={closeImageViewer}
                      className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {}
              <div className="relative overflow-auto max-h-[60vh] lg:max-h-[65vh] flex items-center justify-center p-4 pt-16">
                {imageViewerSrc ? (
                  <img
                    src={imageViewerSrc}
                    alt="Imagem da conta em tela cheia"
                    className="max-w-none transition-transform duration-200"
                    style={{
                      transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                      maxHeight: imageZoom <= 1 ? '50vh' : 'none',
                      maxWidth: imageZoom <= 1 ? '100%' : 'none'
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <ImagePlaceholder className="w-64 h-64" />
                )}
              </div>

              {}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-gray-300 text-sm text-center">
                  Use os controles acima para zoom e rotação. Clique fora da imagem para fechar.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !cancelling && setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Cancelar Solicitação</h3>
                  <p className="text-sm text-gray-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              {}
              <div className="mb-6">
                <p className="text-gray-300 mb-3">
                  Tem certeza que deseja cancelar esta solicitação de boosting?
                </p>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start gap-2 text-sm text-gray-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mb-2">
                        <strong className="text-red-400">Atenção:</strong> Ao cancelar:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Todas as propostas recebidas serão perdidas</li>
                        <li>Chats temporários com boosters serão deletados</li>
                        <li>Você não poderá reativar esta solicitação</li>
                        <li>Será necessário criar uma nova solicitação</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Manter Solicitação
                </button>
                <button
                  onClick={handleCancelRequest}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Sim, Cancelar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposalsPage;
