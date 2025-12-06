import { useWebSocketListener } from './useWebSocketListener';
import { BoostingCancelledEvent, BoostingBrokenEvent } from '../types/websocket.types';

export interface UseBoostingCancelledListenerOptions {
  onCancelled?: (data: BoostingCancelledEvent['data']) => void;
  onBroken?: (data: BoostingBrokenEvent['data']) => void;
  debug?: boolean;
}

export function useBoostingCancelledListener(
  options: UseBoostingCancelledListenerOptions = {}
) {
  const { onCancelled, onBroken, debug = false } = options;

  // Escutar evento WebSocket de cancelamento de boosting
  useWebSocketListener<BoostingCancelledEvent>(
    'boosting:cancelled',
    (event) => {
      const { data } = event;

      if (debug) {
        console.log('[useBoostingCancelledListener] Boosting cancelado:', data);
      }

      if (!data.boostingId || !data.conversationId) {
        if (debug) {
          console.warn('[useBoostingCancelledListener] Dados incompletos:', data);
        }
        return;
      }

      // Chamar callback externo
      if (onCancelled) {
        onCancelled(data);
      }

      // Disparar evento customizado para compatibilidade com código existente
      window.dispatchEvent(
        new CustomEvent('boosting:cancelled', {
          detail: {
            boostingId: data.boostingId,
            conversationId: data.conversationId,
            message: data.message,
            reason: data.reason,
            timestamp: data.timestamp
          }
        })
      );

      if (debug) {
        console.log('[useBoostingCancelledListener] Evento customizado disparado');
      }
    },
    {
      validateData: false,
      debug,
      onError: (error) => {
        console.error('[useBoostingCancelledListener] Erro:', error);
      }
    }
  );

  useWebSocketListener<BoostingBrokenEvent>(
    'boosting:broken',
    (event) => {
      const { data } = event;

      if (debug) {
        console.log('[useBoostingCancelledListener] Boosting quebrado:', data);
      }

      if (!data.boostingId) {
        if (debug) {
          console.warn('[useBoostingCancelledListener] Dados incompletos (broken):', data);
        }
        return;
      }

      if (onBroken) {
        onBroken(data);
      }

      window.dispatchEvent(
        new CustomEvent('boosting:broken', {
          detail: {
            boostingId: data.boostingId,
            conversationId: data.conversationId,
            reason: data.reason,
            requestedBy: data.requestedBy,
            timestamp: data.timestamp
          }
        })
      );

      if (debug) {
        console.log('[useBoostingCancelledListener] Evento customizado (broken) disparado');
      }
    },
    {
      validateData: false,
      debug,
      onError: (error) => {
        console.error('[useBoostingCancelledListener] Erro (broken):', error);
      }
    }
  );
}
