
import { useCallback, useRef, useState } from 'react';
import { useWebSocketListener } from './useWebSocketListener';
import {
  Conversation,
  ConversationUpdatedEvent,
  ConversationsUpdateEvent
} from '../types/websocket.types';
import { normalizeConversationId } from '../utils/websocket.validators';
import { debounce } from '../utils/performance.utils';


interface UseConversationEventsOptions {
  onConversationUpdated?: (conversationId: string, updates: Partial<Conversation>) => void;
  onConversationsUpdated?: (conversations: Conversation[]) => void;
  onServiceCancelled?: (data: {
    conversationId: string;
    reason?: string;
    cancelledBy?: string;
    boostingStatus?: string;
    isActive?: boolean;
    timestamp?: string;
  }) => void;
  onProposalCancelled?: (data: {
    conversationId?: string;
    proposalId: string;
    boostingId?: string;
    timestamp?: string;
  }) => void;
  debug?: boolean;
  debounceTime?: number;
}

interface ConversationEventHandlers {
  handleConversationUpdate: (conversationId: string, updates: Partial<Conversation>) => void;
  handleBatchUpdate: (conversations: Conversation[]) => void;
}

export const useConversationEvents = (
  options: UseConversationEventsOptions = {}
): ConversationEventHandlers => {
  const {
    onConversationUpdated,
    onConversationsUpdated,
    onServiceCancelled,
    onProposalCancelled,
    debug = false,
    debounceTime = 100
  } = options;

  const onConversationUpdatedRef = useRef(onConversationUpdated);
  const onConversationsUpdatedRef = useRef(onConversationsUpdated);
  const onServiceCancelledRef = useRef(onServiceCancelled);
  const onProposalCancelledRef = useRef(onProposalCancelled);
  useCallback(() => {
    onConversationUpdatedRef.current = onConversationUpdated;
    onConversationsUpdatedRef.current = onConversationsUpdated;
    onServiceCancelledRef.current = onServiceCancelled;
    onProposalCancelledRef.current = onProposalCancelled;
  }, [onConversationUpdated, onConversationsUpdated, onServiceCancelled, onProposalCancelled])();

  const handleConversationUpdate = useCallback(
    (conversationId: string, updates: Partial<Conversation>) => {

      if (onConversationUpdatedRef.current) {
        onConversationUpdatedRef.current(conversationId, updates);
      }
    },
    [debug]
  );

  const handleBatchUpdate = useCallback(
    debounce((conversations: Conversation[]) => {

      if (onConversationsUpdatedRef.current) {
        onConversationsUpdatedRef.current(conversations);
      }
    }, debounceTime),
    [debug, debounceTime]
  );

  useWebSocketListener<ConversationUpdatedEvent>(
    'conversation:updated',
    (event) => {
      const { data } = event;
      const conversationId = normalizeConversationId(data);

      if (!conversationId) {
        return;
      }

      const updates: Partial<Conversation> = {};
      if (data.status !== undefined) updates.status = data.status as any;
      if (data.boostingStatus !== undefined) updates.boostingStatus = data.boostingStatus as any;
      if (data.isActive !== undefined) updates.isActive = data.isActive;
      if (data.isBlocked !== undefined) updates.isBlocked = data.isBlocked;
      if (data.blockedReason !== undefined) updates.blockedReason = data.blockedReason;
      if (data.updatedAt) updates.updatedAt = data.updatedAt;
      Object.keys(data).forEach(key => {
        if (!['conversationId', '_id'].includes(key) && !(key in updates)) {
          (updates as any)[key] = (data as any)[key];
        }
      });

      handleConversationUpdate(conversationId, updates);
    },
    {
      validateData: true,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener<ConversationsUpdateEvent>(
    'conversations:update',
    (event) => {
      const { data } = event;

      if (!data.conversations || !Array.isArray(data.conversations)) {
        return;
      }

      handleBatchUpdate(data.conversations);
    },
    {
      validateData: true,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener(
    'service:cancelled',
    (event: any) => {
      const { data } = event;


      if (onServiceCancelledRef.current && data?.conversationId) {
        onServiceCancelledRef.current({
          conversationId: data.conversationId,
          reason: data.reason,
          cancelledBy: data.cancelledBy,
          boostingStatus: data.boostingStatus,
          isActive: data.isActive,
          timestamp: data.timestamp
        });
      }
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener(
    'proposal:cancelled',
    (event: any) => {
      const { data, boostingId } = event;


      if (onProposalCancelledRef.current && data?.proposalId) {
        onProposalCancelledRef.current({
          conversationId: data.conversationId,
          proposalId: data.proposalId,
          boostingId: boostingId || data.boostingId,
          timestamp: data.timestamp
        });
      }
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );


  return {
    handleConversationUpdate,
    handleBatchUpdate
  };
};

export const useConversationState = (initialConversations: Conversation[] = []) => {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

  useConversationEvents({
    onConversationUpdated: useCallback((id: string, updates: Partial<Conversation>) => {
      setConversations(prev => prev.map(conv =>
        conv._id === id ? { ...conv, ...updates } : conv
      ));
    }, []),

    onConversationsUpdated: useCallback((newConversations: Conversation[]) => {
      setConversations(newConversations);
    }, [])
  });

  const updateConversation = useCallback(
    (conversationId: string, updates: Partial<Conversation>) => {
      setConversations(prev => prev.map(conv =>
        conv._id === conversationId ? { ...conv, ...updates } : conv
      ));
    },
    []
  );

  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => {
      if (prev.some(c => c._id === conversation._id)) {
        return prev;
      }
      return [conversation, ...prev];
    });
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c._id !== conversationId));
  }, []);

  const getConversation = useCallback(
    (conversationId: string) => {
      return conversations.find(c => c._id === conversationId);
    },
    [conversations]
  );

  return {
    conversations,
    setConversations,
    updateConversation,
    addConversation,
    removeConversation,
    getConversation
  };
};


export default useConversationEvents;
