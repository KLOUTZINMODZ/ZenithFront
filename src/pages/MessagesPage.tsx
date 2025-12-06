import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import UnifiedChatComponent from '../components/chat/UnifiedChatComponent';
import ChatErrorBoundary from '../components/chat/ChatErrorBoundary';
import { useRouteAwareCache } from '../services/routeAwareCacheService';
import { usePolling } from '../contexts/PollingContext';


const MessagesPage: React.FC = () => {
  const [isCacheRestored, setIsCacheRestored] = useState(false);
  const { setActiveConversation } = usePolling();
  const { restoreCache, isMessagesRoute, currentRoute } = useRouteAwareCache();
  const [searchParams] = useSearchParams();
  const { conversationId } = useParams<{ conversationId?: string }>();


  useEffect(() => {
    const initializeCache = async () => {
      if (isMessagesRoute && !isCacheRestored) {
        
        try {
          const restored = await restoreCache({ clearOldData: true });
          setIsCacheRestored(restored);
          
          if (restored) {     
          } else {
          }
        } catch (error) {
        
        }
      }
    };

    initializeCache();
  }, [isMessagesRoute, restoreCache, isCacheRestored]);

  
  useEffect(() => {
    
    try {
      // Primeiro verificar o parâmetro na URL
      if (conversationId) {
        setActiveConversation(conversationId);
        try {
          localStorage.setItem('active_conversation_after_nav', conversationId);
          localStorage.setItem('unified_chat_active_conversation', conversationId);
        } catch {}
        return;
      }

      // Depois verificar o query parameter
      const qpId = searchParams.get('conversationId');
      if (qpId && qpId.trim().length > 0) {
        setActiveConversation(qpId);
        
        try {
          localStorage.setItem('active_conversation_after_nav', qpId);
          localStorage.setItem('unified_chat_active_conversation', qpId);
        } catch {}
        return; 
      }
    } catch {}

    
    try {
      const cid = localStorage.getItem('active_conversation_after_nav');
      if (cid) {
        setActiveConversation(cid);
        localStorage.removeItem('active_conversation_after_nav');
      }
    } catch {}
  }, [setActiveConversation, searchParams, conversationId]);


  useEffect(() => {
   
  }, [currentRoute, isMessagesRoute]);

  return (
    <div className="h-screen">
      <ChatErrorBoundary>
        <UnifiedChatComponent initialConversationId={conversationId || searchParams.get('conversationId') || undefined} />
      </ChatErrorBoundary>
    </div>
  );
};

export default MessagesPage;
