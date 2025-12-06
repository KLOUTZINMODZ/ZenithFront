
import { useCallback, useRef } from 'react';
import { useWebSocketListener } from './useWebSocketListener';
import {
  ServiceCancelledEvent,
  BoostingProposalAcceptedEvent
} from '../types/websocket.types';


interface UseBoostingEventsOptions {
  onServiceCancelled?: (data: ServiceCancelledEvent['data']) => void;
  onProposalAccepted?: (data: BoostingProposalAcceptedEvent['data']) => void;
  debug?: boolean;
}

interface BoostingEventHandlers {
  handleServiceCancellation: (conversationId: string, reason: string, cancelledBy: string) => void;
  handleProposalAcceptance: (conversationId: string, proposalId: string) => void;
}

export const useBoostingEvents = (
  options: UseBoostingEventsOptions = {}
): BoostingEventHandlers => {
  const {
    onServiceCancelled,
    onProposalAccepted,
    debug = false
  } = options;

  const onServiceCancelledRef = useRef(onServiceCancelled);
  const onProposalAcceptedRef = useRef(onProposalAccepted);
  useCallback(() => {
    onServiceCancelledRef.current = onServiceCancelled;
    onProposalAcceptedRef.current = onProposalAccepted;
  }, [onServiceCancelled, onProposalAccepted])();


  const handleServiceCancellation = useCallback(
    (conversationId: string, reason: string, cancelledBy: string) => {

      if (onServiceCancelledRef.current) {
        onServiceCancelledRef.current({
          conversationId,
          reason,
          cancelledBy,
          boostingStatus: 'cancelled',
          isActive: false,
          timestamp: new Date().toISOString()
        });
      }
    },
    [debug]
  );

  const handleProposalAcceptance = useCallback(
    (conversationId: string, proposalId: string) => {
    },
    [debug]
  );

  useWebSocketListener<ServiceCancelledEvent>(
    'service:cancelled',
    (event) => {
      const { data } = event;

      if (!data.conversationId) {
        return;
      }

      if (onServiceCancelledRef.current) {
        onServiceCancelledRef.current(data);
      }

      handleServiceCancellation(
        data.conversationId,
        data.reason || 'Não especificado',
        data.cancelledBy
      );
    },
    {
      validateData: true,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener<BoostingProposalAcceptedEvent>(
    'boosting:proposal-accepted',
    (event) => {
      const { data } = event;

      if (!data.conversationId || !data.proposalId) {
        return;
      }

      if (onProposalAcceptedRef.current) {
        onProposalAcceptedRef.current(data);
      }

      handleProposalAcceptance(data.conversationId, data.proposalId);
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );


  return {
    handleServiceCancellation,
    handleProposalAcceptance
  };
};


export default useBoostingEvents;
