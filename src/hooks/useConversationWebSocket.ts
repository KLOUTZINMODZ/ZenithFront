


import { useState, useEffect, useRef } from 'react';
import websocketService from '../services/websocketService';

interface ConversationData {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: {
    _id: string;
    sender: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    content: string;
    createdAt: string;
    conversation: string;
    readBy: string[];
    deliveredTo: string[];
  };
  unreadCount?: number;
  hasUpdate?: boolean;
  updatedAt: string;
}

export const useConversationWebSocket = () => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());
  const cleanupFunctions = useRef<Array<() => void>>([]);

  useEffect(() => {

    const handleConversationUpdate = (data: any) => {
            
      if (data.conversations && Array.isArray(data.conversations)) {

        const normalizedConversations = data.conversations.map((conv: any) => ({
          _id: conv._id,
          updatedAt: conv.updatedAt,
          unreadCount: conv.unreadCount || 0,
          hasUpdate: conv.hasUpdate || true,
          participants: (conv.participants || []).map((p: any) => ({
            user: {
              _id: p.user?._id || p._id,
              name: p.user?.name || p.name || 'Unknown',
              profileImage: p.user?.profileImage || p.profileImage
            },
            role: p.role || 'participant'
          })),
          lastMessage: conv.lastMessage ? {
            _id: conv.lastMessage._id,
            conversation: conv._id,
            sender: {
              _id: conv.lastMessage.sender?._id || 'unknown',
              name: conv.lastMessage.sender?.name || 'Unknown',
              profileImage: conv.lastMessage.sender?.profileImage
            },
            content: conv.lastMessage.content || '',
            createdAt: conv.lastMessage.createdAt,
            readBy: conv.lastMessage.readBy || [],
            deliveredTo: conv.lastMessage.deliveredTo || []
          } : undefined
        }));
        
        setConversations(normalizedConversations);
        setLastCheck(data.timestamp || Date.now());
      }
    };

    const handleConversationList = (data: any) => {
            handleConversationUpdate(data);
    };

    const handlePollingStarted = (data: any) => {
            setIsPollingActive(true);
    };

    const handlePollingStopped = (data: any) => {
            setIsPollingActive(false);
    };

    const handleError = (error: any) => {
            setIsPollingActive(false);
    };


    websocketService.on('conversations:update', handleConversationUpdate);
    websocketService.on('conversations:list', handleConversationList);
    websocketService.on('conversations:polling_started', handlePollingStarted);
    websocketService.on('conversations:polling_stopped', handlePollingStopped);
    websocketService.on('conversations:error', handleError);


    const cleanup = () => {
      websocketService.off('conversations:update', handleConversationUpdate);
      websocketService.off('conversations:list', handleConversationList);
      websocketService.off('conversations:polling_started', handlePollingStarted);
      websocketService.off('conversations:polling_stopped', handlePollingStopped);
      websocketService.off('conversations:error', handleError);
    };

    cleanupFunctions.current.push(cleanup);

    return cleanup;
  }, []);


  const startPolling = (initialLastCheck?: number) => {
    const checkTimestamp = initialLastCheck || lastCheck;
    
    websocketService.startConversationsPolling(checkTimestamp);
  };


  const stopPolling = () => {
    websocketService.stopConversationsPolling();
  };


  const getConversations = (checkTimestamp?: number) => {
    const timestampToUse = checkTimestamp || lastCheck;
        websocketService.getConversationsViaWS(timestampToUse);
  };


  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      stopPolling();
    };
  }, []);

  return {
    conversations,
    isPollingActive,
    lastCheck,
    startPolling,
    stopPolling,
    getConversations
  };
};
