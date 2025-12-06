import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocketService';


function toNumberBR(value: any): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    const normalized = value
      .replace(/\u00A0/g, ' ')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

interface ProposalData {
  price: number;
  estimatedTime: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired' | 'active' | 'rejected' | 'delivered' | 'cancelled';
  isTemporary: boolean;
  expiresAt?: string;
  acceptedAt?: string;
  clientName?: string;
  boosterName?: string;
  proposalId?: string;
  conversationId?: string;
  userRole?: 'client' | 'booster';
  timestamp?: string;
}

interface ProposalModalState {
  isVisible: boolean;
  proposalData: ProposalData | null;
  isLoading: boolean;
  userRole: 'client' | 'booster' | 'unknown';
}

export const useProposalModal = (activeConversationId?: string | null) => {
  const { user } = useAuth();
  const [modalState, setModalState] = useState<ProposalModalState>({
    isVisible: false,
    proposalData: null,
    isLoading: false,
    userRole: 'unknown'
  });

  const eventListenersRef = useRef<Map<string, (event: CustomEvent) => void>>(new Map());


  const getUserIdFromToken = useCallback((): string | null => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (error) {
      return null;
    }
  }, []);


  const savePersistentState = useCallback((proposalData: ProposalData, userRole: 'client' | 'booster') => {
    if (!activeConversationId) return;
    
    const persistentStateKey = `proposal_state_${activeConversationId}`;
    const persistentProposal = {
      ...proposalData,
      userRole,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(persistentStateKey, JSON.stringify(persistentProposal));
  }, [activeConversationId]);

  const handleServiceCancelled = useCallback((data: any) => {
    if (!activeConversationId || data.conversationId !== activeConversationId) {
      return;
    }

    setModalState(prev => ({
      ...prev,
      isVisible: true,
      proposalData: prev.proposalData ? {
        ...prev.proposalData,
        status: 'cancelled',
        message: 'Atendimento Cancelado',
        isTemporary: false
      } : {
        price: 0,
        estimatedTime: '—',
        message: 'Atendimento Cancelado',
        status: 'cancelled',
        isTemporary: false,
        conversationId: data.conversationId,
        proposalId: data.proposalId
      },
      isLoading: false
    }));


    try {
      const persistentStateKey = `proposal_state_${data.conversationId}`;
      localStorage.removeItem(persistentStateKey);
    } catch {}


  }, [activeConversationId]);

  const handleDeliveryConfirmed = useCallback((data: any) => {
    if (!activeConversationId || data.conversationId !== activeConversationId) {
      return;
    }


    setModalState(prev => ({
      ...prev,
      isVisible: true,
      proposalData: prev.proposalData ? {
        ...prev.proposalData,
        price: (typeof data?.price === 'number' && !isNaN(data.price)) ? data.price : (prev.proposalData.price ?? 0),
        status: 'delivered',
        message: 'Pedido Entregue',
        isTemporary: false
      } : {
        price: (typeof data?.price === 'number' && !isNaN(data.price)) ? data.price : 0,
        estimatedTime: '—',
        message: 'Pedido Entregue',
        status: 'delivered',
        isTemporary: false,
        conversationId: data.conversationId,
        proposalId: data.proposalId
      },
      isLoading: false
    }));


    try {
      const key = `chat_blocked_${data.conversationId}`;
      localStorage.setItem(key, JSON.stringify({
        isBlocked: true,
        reason: 'pedido_finalizado',
        blockedAt: new Date().toISOString()
      }));
    } catch {}


    try {
      const persistentStateKey = `proposal_state_${data.conversationId}`;
      localStorage.removeItem(persistentStateKey);
    } catch {}


    try {
      const conversationsData = localStorage.getItem('unified_chat_conversations');
      if (conversationsData) {
        const conversations = JSON.parse(conversationsData);
        const updated = conversations.map((conv: any) => conv._id === data.conversationId
          ? { ...conv, boostingStatus: 'completed', isBlocked: true, blockedReason: 'pedido_finalizado' }
          : conv
        );
        localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('conversations:force-update', { detail: { conversations: updated } }));
      }
    } catch {}


    setTimeout(() => setModalState(prev => ({ ...prev, isVisible: false })), 2500);
  }, [activeConversationId]);

  const loadPersistentState = useCallback((): ProposalData | null => {
    if (!activeConversationId) return null;
    
    const persistentStateKey = `proposal_state_${activeConversationId}`;
    const persistentState = localStorage.getItem(persistentStateKey);
    
    if (persistentState) {
      try {
        const savedProposal = JSON.parse(persistentState);
        

        try {
          const conversationsData = localStorage.getItem('unified_chat_conversations');
          if (conversationsData) {
            const conversations = JSON.parse(conversationsData);
            const conv = conversations.find((c: any) => c._id === activeConversationId);
            const delivered = (
              conv?.boostingStatus === 'completed' ||
              conv?.isBlocked === true ||
              conv?.metadata?.status === 'delivery_confirmed' ||
              false
            );
            if (delivered) {
              return null;
            }
          }
        } catch {}

        const savedTime = new Date(savedProposal.timestamp || 0).getTime();
        const currentTime = new Date().getTime();
        const isRecent = (currentTime - savedTime) < 24 * 60 * 60 * 1000;
        
        if (isRecent && (savedProposal.status === 'accepted' || savedProposal.status === 'delivered')) {
          return savedProposal;
        }
      } catch (error) {
      
      }
    }
    
    return null;
  }, [activeConversationId]);


  useEffect(() => {
    const loadProposalData = async () => {
      if (!activeConversationId) {
        setModalState(prev => ({ ...prev, isVisible: false, isLoading: false }));
        return;
      }

      try {
        setModalState(prev => ({ ...prev, isLoading: true }));
        

        const persistentProposal = loadPersistentState();
        if (persistentProposal) {
          setModalState({
            isVisible: true,
            proposalData: persistentProposal,
            isLoading: false,
            userRole: persistentProposal.userRole || 'client'
          });
          return;
        }
        

        const conversationsData = localStorage.getItem('unified_chat_conversations');
        let conversationData = null;
        
        if (conversationsData) {
          const conversations = JSON.parse(conversationsData);
          conversationData = conversations.find((conv: any) => conv._id === activeConversationId);
        }
        
        if (conversationData) {

          const alreadyDelivered = (
            conversationData.boostingStatus === 'completed' ||
            conversationData.blockedReason === 'pedido_finalizado' ||
            conversationData.metadata?.status === 'delivery_confirmed'
          );
          const alreadyCancelled = (
            conversationData.boostingStatus === 'cancelled' ||
            conversationData.status === 'cancelled'
          );

          if (alreadyDelivered) {
            setModalState(prev => ({ ...prev, isVisible: false, isLoading: false }));
            return;
          }

          if (alreadyCancelled) {
            setModalState({
              isVisible: true,
              isLoading: false,
              userRole: 'client',
              proposalData: {
                price: 0,
                estimatedTime: '—',
                message: 'Atendimento Cancelado',
                status: 'cancelled',
                isTemporary: false,
                conversationId: activeConversationId
              }
            });
            return;
          }

          const clientData = conversationData.client;
          const boosterData = conversationData.booster;
          const proposalId = conversationData.proposal;
          

          

          let actualStatus = conversationData.status || 'pending';
          

          if (!conversationData.isTemporary && conversationData.boostingStatus === 'active') {
            actualStatus = 'accepted';
          }
          

          const shouldShowModal = conversationData.isTemporary || 
                                 actualStatus === 'accepted' || 
                                 actualStatus === 'pending' ||
                                 !!conversationData.metadata?.proposalData;
          

          
          if (shouldShowModal) {

            let proposalData = conversationData.metadata?.proposalData;
            
                        

            if (!proposalData && Object.keys(conversationData.metadata || {}).length === 0) {
                            
              try {
                const token = localStorage.getItem('token');
                if (token) {
                  const response = await fetch(`https://zenith.enrelyugi.com.br/api/messages/conversations`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                      'ngrok-skip-browser-warning': 'true'
                    }
                  });
                  
                  if (response.ok) {
                    const apiData = await response.json();
                    const apiConversation = apiData.data.conversations.find((conv: any) => conv._id === activeConversationId);
                    
                                                            
                    if (apiConversation?.metadata?.proposalData) {
                      proposalData = apiConversation.metadata.proposalData;
                                            

                      const conversations = JSON.parse(localStorage.getItem('unified_chat_conversations') || '[]');
                      const updatedConversations = conversations.map((conv: any) => {
                        if (conv._id === activeConversationId) {
                          return { ...conv, metadata: apiConversation.metadata };
                        }
                        return conv;
                      });
                      localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedConversations));
                                          }
                  } else {
                                      }
                }
              } catch (error: any) {
                              }
            }
            

            if (proposalData && (typeof proposalData.price === 'string')) {
              proposalData.price = toNumberBR(proposalData.price);
            }


            if (!proposalData || !proposalData.price) {
                            
              const systemMessage = conversationData.lastMessage?.content;
              const isEncrypted = systemMessage && /^[a-f0-9]{32}:[a-f0-9]{32}/.test(systemMessage);
              
              if (systemMessage && systemMessage.includes('💰 Proposta:') && !isEncrypted) {
                const normalizedMsg = systemMessage.replace(/\u00A0/g, ' ');
                const priceMatch = normalizedMsg.match(/💰\s*Proposta:\s*R\$\s*([\d\.,]+)/);
                const timeMatch = normalizedMsg.match(/⏱️\s*Tempo estimado:\s*([^\n]+)/);
                const messageMatch = normalizedMsg.match(/📝\s*Mensagem:\s*([^\n]+)/);
                
                proposalData = {
                  price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : 0,
                  estimatedTime: timeMatch ? timeMatch[1] : 'N/A',
                  message: messageMatch ? messageMatch[1] : 'Proposta de boosting',
                  description: messageMatch ? messageMatch[1] : 'Proposta de boosting'
                };
                
                              } else {
                                proposalData = {
                  price: 0,
                  estimatedTime: 'N/A',
                  message: 'Sem Mensagem',
                  description: 'Proposta pendente'
                };
              }
            } else {
                          }
            

            let finalMessage = proposalData?.message || proposalData?.description || '';
            

            if (!finalMessage || 
                finalMessage.length < 3 || 
                /^[a-z]+$/.test(finalMessage) ||
                /^[a-z]{6,}$/.test(finalMessage) ||
                finalMessage === 'undefined' ||
                finalMessage === 'null' ||
                finalMessage.toLowerCase() === 'nenhuma') {
              finalMessage = 'Sem Mensagem';
            }
            
            const modalProposalData: ProposalData = {
              price: toNumberBR(proposalData?.price) || 0,
              estimatedTime: proposalData?.estimatedTime || 'N/A',
              message: finalMessage,
              status: actualStatus,
              isTemporary: conversationData.isTemporary || false,
              expiresAt: conversationData.expiresAt,
              acceptedAt: conversationData.acceptedAt,
              clientName: clientData?.name || 'Cliente',
              boosterName: boosterData?.name || 'Booster',
              proposalId: proposalId || `temp-${activeConversationId}`,
              conversationId: activeConversationId
            };

            const currentUserId = localStorage.getItem('unified_chat_user_id');
            let userRole: 'client' | 'booster' = 'client';
            
            if (currentUserId === boosterData?.userid) {
              userRole = 'booster';
            } else if (currentUserId === clientData?.userid) {
              userRole = 'client';
            }

            if (actualStatus === 'accepted') {
              savePersistentState(modalProposalData, userRole);
            }

            setModalState({
              isVisible: true,
              proposalData: modalProposalData,
              isLoading: false,
              userRole: userRole
            });
            return;
          }
        }
        

        try {
          const { default: boostingChatService } = await import('../services/boostingChatService');
          const pendingProposal = await boostingChatService.getTemporaryProposalData(activeConversationId);
          
          if (pendingProposal) {
            const modalProposalData: ProposalData = {
              price: pendingProposal.price || 0,
              estimatedTime: pendingProposal.estimatedTime || 'Aguardando confirmação',
              message: pendingProposal.description || 'Proposta pendente',
              status: 'pending',
              isTemporary: true,
              expiresAt: pendingProposal.acceptedAt,
              clientName: pendingProposal.client?.name || 'Cliente',
              boosterName: pendingProposal.booster?.name || 'Booster',
              proposalId: pendingProposal.id || `temp-${activeConversationId}`,
              conversationId: activeConversationId
            };

            setModalState({
              isVisible: true,
              proposalData: modalProposalData,
              isLoading: false,
              userRole: 'client'
            });
            return;
          }
        } catch (apiError) {

        }
        

        setModalState(prev => ({ ...prev, isVisible: false, isLoading: false }));
        
      } catch (error) {
        setModalState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadProposalData();
  }, [activeConversationId, user?.id, loadPersistentState, savePersistentState]);


  const showTestModal = useCallback(() => {
    
    const testProposalData: ProposalData = {
      price: 150.00,
      estimatedTime: '2-3 dias',
      message: 'Proposta de teste para debug',
      status: 'pending',
      isTemporary: true,
      clientName: 'Cliente Teste',
      boosterName: 'Booster Teste',
      proposalId: 'test-proposal-123',
      conversationId: activeConversationId || 'test-conversation'
    };
    
    setModalState({
      isVisible: true,
      proposalData: testProposalData,
      isLoading: false,
      userRole: 'client'
    });
  }, [activeConversationId]);


  const handleProposalReceived = useCallback((data: any) => {
    if (!activeConversationId || data.conversationId !== activeConversationId) {
      return;
    }

    const proposalData: ProposalData = {
      price: toNumberBR(data.proposalData?.price ?? data.price ?? 0),
      estimatedTime: data.proposalData?.estimatedTime || data.estimatedTime || 'N/A',
      message: data.proposalData?.message || data.message,
      status: 'pending',
      isTemporary: true,
      expiresAt: data.expiresAt,
      clientName: data.clientData?.name || data.clientName,
      boosterName: data.boosterData?.name || data.boosterName,
      proposalId: data.proposalId,
      conversationId: data.conversationId
    };


    const currentUserId = user?.id || getUserIdFromToken();
    let userRole: 'client' | 'booster' | 'unknown' = 'unknown';
    
    if (currentUserId) {
      const clientId = data.clientData?.userid || data.clientId;
      const boosterId = data.boosterData?.userid || data.boosterId;
      
      if (currentUserId === clientId) {
        userRole = 'client';
      } else if (currentUserId === boosterId) {
        userRole = 'booster';
      }
    }

    setModalState(prev => ({
      ...prev,
      isVisible: true,
      proposalData,
      userRole
    }));
  }, [activeConversationId, user?.id, getUserIdFromToken]);

  const handleProposalAccepted = useCallback((data: any) => {
    if (!activeConversationId || data.conversationId !== activeConversationId) {
      return;
    }


    try {

      if (modalState.proposalData?.status === 'delivered') {
        return;
      }

      const key = `chat_blocked_${activeConversationId}`;
      const blocked = JSON.parse(localStorage.getItem(key) || 'null');
      if (blocked?.isBlocked && blocked?.reason === 'pedido_finalizado') {
        return;
      }

      const conversationsData = localStorage.getItem('unified_chat_conversations');
      if (conversationsData) {
        const conversations = JSON.parse(conversationsData);
        const conv = conversations.find((c: any) => c._id === activeConversationId);
        if (conv?.boostingStatus === 'completed' || conv?.isBlocked === true || conv?.blockedReason === 'pedido_finalizado' || conv?.metadata?.status === 'delivery_confirmed') {
          return;
        }
      }
    } catch {}


    const currentUserId = user?.id || getUserIdFromToken() || localStorage.getItem('unified_chat_user_id');
    const clientId = data.clientData?.userid || data.clientId;
    const boosterId = data.boosterData?.userid || data.boosterId;
    
    let userRole: 'client' | 'booster' = 'client';
    if (currentUserId === boosterId) {
      userRole = 'booster';
    } else if (currentUserId === clientId) {
      userRole = 'client';
    }
    

    // ✅ NOVO: Suportar dados completos do modal via WebSocket
    const updatedProposalData = prev => {
      // Se temos dados completos do WebSocket (com price, estimatedTime, etc)
      if (data.price !== undefined || data.estimatedTime !== undefined) {
        return prev.proposalData ? {
          ...prev.proposalData,
          price: toNumberBR(data.price ?? prev.proposalData.price ?? 0),
          estimatedTime: data.estimatedTime || prev.proposalData.estimatedTime || 'N/A',
          message: data.message || 'Proposta aceita com sucesso!',
          status: 'accepted' as const,
          isTemporary: false,
          clientName: data.clientName || prev.proposalData.clientName,
          boosterName: data.boosterName || prev.proposalData.boosterName,
          clientAvatar: data.clientAvatar || prev.proposalData.clientAvatar,
          boosterAvatar: data.boosterAvatar || prev.proposalData.boosterAvatar,
          game: data.game || prev.proposalData.game,
          category: data.category || prev.proposalData.category,
          acceptedAt: data.acceptedAt || new Date().toISOString(),
          userRole
        } : {
          price: toNumberBR(data.price ?? 0),
          estimatedTime: data.estimatedTime || 'N/A',
          message: data.message || 'Proposta aceita com sucesso!',
          status: 'accepted' as const,
          isTemporary: false,
          clientName: data.clientName || 'Cliente',
          boosterName: data.boosterName || 'Booster',
          clientAvatar: data.clientAvatar,
          boosterAvatar: data.boosterAvatar,
          game: data.game,
          category: data.category,
          proposalId: data.proposalId,
          conversationId: data.conversationId,
          acceptedAt: data.acceptedAt || new Date().toISOString(),
          userRole
        };
      }

      // Fallback: dados antigos
      return prev.proposalData ? {
        ...prev.proposalData,
        status: 'accepted' as const,
        message: 'Proposta aceita com sucesso!',
        acceptedAt: data.acceptedAt || new Date().toISOString(),
        isTemporary: false,
        userRole
      } : {
        price: toNumberBR(data.proposalData?.price ?? 0),
        estimatedTime: data.proposalData?.estimatedTime || 'N/A',
        message: 'Proposta aceita com sucesso!',
        status: 'accepted' as const,
        isTemporary: false,
        expiresAt: data.expiresAt,
        clientName: data.clientData?.name || 'Cliente',
        boosterName: data.boosterData?.name || 'Booster',
        proposalId: data.proposalId,
        conversationId: data.conversationId,
        acceptedAt: data.acceptedAt || new Date().toISOString(),
        userRole
      };
    };

    setModalState(prev => {
      const newProposalData = updatedProposalData(prev);
      
      // Salvar estado persistente
      savePersistentState(newProposalData, userRole);

      return {
        ...prev,
        isVisible: true, // ✅ Manter modal visível para mostrar atualização
        proposalData: newProposalData,
        userRole,
        isLoading: false
      };
    });


    const conversationsData = localStorage.getItem('unified_chat_conversations');
    if (conversationsData) {
      try {
        const conversations = JSON.parse(conversationsData);
        const updatedConversations = conversations.map((conv: any) => {
          if (conv._id === activeConversationId) {
            return {
              ...conv,
              status: 'accepted',
              isTemporary: false,
              boostingStatus: 'active',
              metadata: {
                ...conv.metadata,
                proposalData: {
                  ...conv.metadata?.proposalData,
                  status: 'accepted',
                  acceptedAt: new Date().toISOString()
                }
              }
            };
          }
          return conv;
        });
        localStorage.setItem('unified_chat_conversations', JSON.stringify(updatedConversations));
        

        window.dispatchEvent(new CustomEvent('conversations:force-update', {
          detail: { conversations: updatedConversations }
        }));
      } catch (error) {
              }
    }


    if (activeConversationId) {
      const persistentStateKey = `proposal_state_${activeConversationId}`;
      localStorage.removeItem(persistentStateKey);
    }
  }, [activeConversationId, savePersistentState, user?.id, getUserIdFromToken, modalState.proposalData?.status]);

  const handleProposalRejected = useCallback((data: any) => {
    if (!activeConversationId || data.conversationId !== activeConversationId) {
      return;
    }


    setModalState(prev => ({
      ...prev,
      isVisible: true,
      proposalData: prev.proposalData ? {
        ...prev.proposalData,
        status: 'rejected' as any,
        message: 'Proposta Recusada'
      } : {
        price: 0,
        estimatedTime: '—',
        message: 'Proposta Recusada',
        status: 'rejected' as any,
        isTemporary: true
      },
      isLoading: false
    }));

    setTimeout(() => {
      setModalState(prev => ({ ...prev, isVisible: false }));
    }, 2500);
  }, [activeConversationId]);

  const handleProposalExpired = useCallback((data: any) => {
    
    if (!activeConversationId || data.conversationId !== activeConversationId) {
      return;
    }

    setModalState(prev => ({
      ...prev,
      proposalData: prev.proposalData ? {
        ...prev.proposalData,
        status: 'expired'
      } : null,
      isLoading: false
    }));


    setTimeout(() => {
      setModalState(prev => ({
        ...prev,
        isVisible: false
      }));
    }, 2000);
  }, [activeConversationId]);


  useEffect(() => {

    websocketService.on('proposal:received', handleProposalReceived);
    websocketService.on('proposal:accepted', handleProposalAccepted);
    websocketService.on('proposal:rejected', handleProposalRejected);
    websocketService.on('proposal:expired', handleProposalExpired);
    websocketService.on('delivery_confirmed', handleDeliveryConfirmed);
    websocketService.on('service:cancelled', handleServiceCancelled);

    const handleConversationUpdated = (data: any) => {
      const convId = data?.conversationId || data?._id || data?.id;
      if (!activeConversationId || !convId || String(convId) !== String(activeConversationId)) return;
      if (data.deleted === true) {

        setModalState(prev => ({
          ...prev,
          isVisible: true,
          proposalData: prev.proposalData ? {
            ...prev.proposalData,
            status: 'expired',
            message: 'Pedido Não Foi Aceito'
          } : {
            price: 0,
            estimatedTime: '—',
            message: 'Pedido Não Foi Aceito',
            status: 'expired',
            isTemporary: true
          },
          isLoading: false
        }));
        setTimeout(() => setModalState(prev => ({ ...prev, isVisible: false })), 2500);
        return;
      }


      if (data.status === 'expired') {
        setModalState(prev => ({
          ...prev,
          isVisible: true,
          proposalData: prev.proposalData ? {
            ...prev.proposalData,
            status: 'rejected' as any,
            message: 'Proposta Recusada'
          } : {
            price: 0,
            estimatedTime: '—',
            message: 'Proposta Recusada',
            status: 'rejected' as any,
            isTemporary: true,
            conversationId: data.conversationId,
            proposalId: data.proposalId
          },
          isLoading: false
        }));


        try {
          const key = `chat_blocked_${data.conversationId}`;
          localStorage.setItem(key, JSON.stringify({
            isBlocked: true,
            reason: 'proposta_recusada',
            blockedAt: new Date().toISOString()
          }));
        } catch {}


        try {
          const conversationsData = localStorage.getItem('unified_chat_conversations');
          if (conversationsData) {
            const conversations = JSON.parse(conversationsData);
            const updated = conversations.map((conv: any) => conv._id === data.conversationId
              ? { ...conv, status: 'expired', isActive: false }
              : conv
            );
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('conversations:force-update', { detail: { conversations: updated } }));
          }
        } catch {}


        try {
          window.dispatchEvent(new CustomEvent('boosting:proposal-rejected', {
            detail: { conversationId: data.conversationId, proposalId: data.proposalId }
          }));
        } catch {}

        setTimeout(() => setModalState(prev => ({ ...prev, isVisible: false })), 2500);
      }
      
      // ✅ Novo: quando a conversa for marcada como "accepted" (ex: via fluxo unificado),
      // atualizar o status da proposta em tempo real para ambos os usuários
      if (data.status === 'accepted' || data.boostingStatus === 'active') {
        setModalState(prev => {
          if (!prev.proposalData) {
            return prev;
          }

          return {
            ...prev,
            isVisible: true,
            proposalData: {
              ...prev.proposalData,
              status: 'accepted',
              message: prev.proposalData.message || 'Proposta aceita com sucesso!',
              isTemporary: false,
              acceptedAt: prev.proposalData.acceptedAt || new Date().toISOString()
            },
            isLoading: false
          };
        });
      }
      
      if (data.status === 'cancelled') {
        setModalState(prev => ({
          ...prev,
          isVisible: true,
          proposalData: prev.proposalData ? {
            ...prev.proposalData,
            status: 'cancelled' as any,
            message: 'Atendimento Cancelado',
            isTemporary: false
          } : {
            price: 0,
            estimatedTime: '—',
            message: 'Atendimento Cancelado',
            status: 'cancelled' as any,
            isTemporary: false,
            conversationId: data.conversationId,
            proposalId: data.proposalId
          },
          isLoading: false
        }));


        try {
          const key = `chat_blocked_${data.conversationId}`;
          localStorage.setItem(key, JSON.stringify({
            isBlocked: true,
            reason: 'atendimento_cancelado',
            blockedAt: new Date().toISOString()
          }));
        } catch {}


        try {
          const conversationsData = localStorage.getItem('unified_chat_conversations');
          if (conversationsData) {
            const conversations = JSON.parse(conversationsData);
            const updated = conversations.map((conv: any) => conv._id === data.conversationId
              ? { ...conv, status: 'cancelled', boostingStatus: 'cancelled', isActive: false, isTemporary: false, isBlocked: true }
              : conv
            );
            localStorage.setItem('unified_chat_conversations', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('conversations:force-update', { detail: { conversations: updated } }));
          }
        } catch {}


      }
    };
    websocketService.on('conversation:updated', handleConversationUpdated);


    const proposalReceivedHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleProposalReceived(customEvent.detail);
    };
    const proposalAcceptedHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleProposalAccepted(customEvent.detail);
    };
    const proposalRejectedHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleProposalRejected(customEvent.detail);
    };
    const proposalExpiredHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleProposalExpired(customEvent.detail);
    };


    eventListenersRef.current.set('boosting:proposal-received', proposalReceivedHandler);
    eventListenersRef.current.set('boosting:proposal-accepted', proposalAcceptedHandler);
    eventListenersRef.current.set('boosting:proposal-rejected', proposalRejectedHandler);
    eventListenersRef.current.set('boosting:proposal-expired', proposalExpiredHandler);


    window.addEventListener('boosting:proposal-received', proposalReceivedHandler as EventListener);
    window.addEventListener('boosting:proposal-accepted', proposalAcceptedHandler as EventListener);
    window.addEventListener('boosting:proposal-rejected', proposalRejectedHandler as EventListener);
    window.addEventListener('boosting:proposal-expired', proposalExpiredHandler as EventListener);

    return () => {

      websocketService.off('proposal:received', handleProposalReceived);
      websocketService.off('proposal:accepted', handleProposalAccepted);
      websocketService.off('proposal:rejected', handleProposalRejected);
      websocketService.off('proposal:expired', handleProposalExpired);
      websocketService.off('delivery_confirmed', handleDeliveryConfirmed);
      websocketService.off('service:cancelled', handleServiceCancelled);
      websocketService.off('conversation:updated', handleConversationUpdated);


      eventListenersRef.current.forEach((handler, eventName) => {
        window.removeEventListener(eventName, handler as EventListener);
      });
      eventListenersRef.current.clear();
    };
  }, [handleProposalReceived, handleProposalAccepted, handleProposalRejected, handleProposalExpired]);


  const acceptProposal = useCallback(async () => {
    return;
  }, []);


  const rejectProposal = useCallback(async () => {
    return;
  }, []);


  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    isVisible: modalState.isVisible,
    proposalData: modalState.proposalData,
    userRole: modalState.userRole,
    isLoading: modalState.isLoading,
    acceptProposal,
    rejectProposal,
    hideModal,
    showTestModal
  };
};
