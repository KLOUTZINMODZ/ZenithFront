import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { usePolling } from '../contexts/PollingContext';

export const useChatNavigation = () => {
  const navigate = useNavigate();
  const { setActiveConversation, createConversation } = usePolling();

  const openChat = useCallback((conversationId: string) => {
    if (!conversationId) {
      console.error('Tentativa de abrir chat com conversationId vazio ou nulo');
      navigate('/messages');
      return;
    }

    console.log('Abrindo chat com conversationId:', conversationId);

    // Usar URLs semânticas para melhorar a experiência do usuário
    navigate(`/messages/${conversationId}`);
    
    // Também definir a conversa ativa no contexto com um timeout maior
    // para garantir que a navegação seja concluída antes
    setTimeout(() => {
      console.log('Definindo conversa ativa:', conversationId);
      setActiveConversation(conversationId);

      // Armazenar no localStorage para persistência
      try {
        localStorage.setItem('unified_chat_active_conversation', conversationId);
      } catch (err) {
        console.error('Erro ao salvar conversa ativa no localStorage:', err);
      }
    }, 300);
  }, [navigate, setActiveConversation]);

  const openChatWithUser = useCallback(async (userId: string, boostingRequestId?: string) => {
    try {

      const conversation = await createConversation(userId, boostingRequestId);
      

      openChat(conversation._id);
    } catch (error) {
          }
  }, [openChat, createConversation]);

  const openChatForBoostingRequest = useCallback(async (boostingRequestId: string) => {
    const { getConversationByBoostingRequest } = usePolling();
    
    try {

      const conversation = await getConversationByBoostingRequest(boostingRequestId);
      
      if (conversation) {
        openChat(conversation._id);
      } else {
              }
    } catch (error) {
          }
  }, [openChat]);

  return {
    openChat,
    openChatWithUser,
    openChatForBoostingRequest
  };
};
