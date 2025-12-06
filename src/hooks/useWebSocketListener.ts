/**
 * Hook: useWebSocketListener
 * 
 * Hook customizado para escutar eventos WebSocket com:
 * - Validação automática de dados
 * - Limpeza automática de listeners
 * - Tratamento de erros
 * - Logs de debug
 * - Proteção contra memory leaks
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  WebSocketEventType,
  WebSocketEvent,
  WebSocketEventHandler,
  WebSocketListenerConfig
} from '../types/websocket.types';
import { createEventValidator } from '../utils/websocket.validators';
import websocketService from '../services/websocketService';

// ============================================================================
// TYPES
// ============================================================================

interface UseWebSocketListenerOptions extends WebSocketListenerConfig {
  /** Se deve validar dados recebidos */
  validateData?: boolean;
  /** Callback de erro */
  onError?: (error: Error, eventType: WebSocketEventType) => void;
  /** Se deve logar eventos (sobrescreve config.debug) */
  debug?: boolean;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook para escutar um evento WebSocket específico
 * 
 * @example
 * ```tsx
 * useWebSocketListener('conversation:updated', (event) => {
 *   const { conversationId, status } = event.data;
 *   // Atualizar estado local
 * }, { validateData: true, debug: true });
 * ```
 */
export const useWebSocketListener = <T extends WebSocketEvent>(
  eventType: WebSocketEventType,
  handler: WebSocketEventHandler<T>,
  options: UseWebSocketListenerOptions = {}
) => {
  const {
    validateData = true,
    onError,
    debug = false
  } = options;

  // Refs para manter referências estáveis
  const handlerRef = useRef(handler);
  const errorHandlerRef = useRef(onError);
  const validatorRef = useRef(validateData ? createEventValidator(eventType) : null);

  // Atualizar refs quando props mudam (sem causar re-render)
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    errorHandlerRef.current = onError;
  }, [onError]);

  // Wrapper do handler com validação e error handling
  const wrappedHandler = useCallback((event: T) => {
    try {
      // Log de debug
      if (debug) {
        console.log(`[WebSocket] Evento recebido: ${eventType}`, event);
      }

      // Validar dados se configurado
      if (validatorRef.current && event.data) {
        const validation = validatorRef.current.validate(event.data);
        
        if (!validation.valid) {
          const error = new Error(
            `Validação falhou para ${eventType}: ${validation.errors?.join(', ')}`
          );
          
          if (debug) {
            console.error(`[WebSocket] ${error.message}`, {
              event,
              validation
            });
          }
          
          if (errorHandlerRef.current) {
            errorHandlerRef.current(error, eventType);
          }
          
          return; // Não executar handler se validação falhar
        }

        // Usar dados validados
        event.data = validation.data;
      }

      // Executar handler
      handlerRef.current(event);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (debug) {
        console.error(`[WebSocket] Erro ao processar ${eventType}:`, err);
      }
      
      if (errorHandlerRef.current) {
        errorHandlerRef.current(err, eventType);
      }
    }
  }, [eventType, debug]);

  // Registrar e limpar listener
  useEffect(() => {
    if (!websocketService) {
      if (debug) {
        console.warn('[WebSocket] websocketService não disponível');
      }
      return;
    }

    // Registrar listener
    websocketService.on(eventType, wrappedHandler);

    if (debug) {
      console.log(`[WebSocket] Listener registrado: ${eventType}`);
    }

    // Cleanup: remover listener
    return () => {
      websocketService.off(eventType, wrappedHandler);
      
      if (debug) {
        console.log(`[WebSocket] Listener removido: ${eventType}`);
      }
    };
  }, [eventType, wrappedHandler, debug]);
};

// ============================================================================
// HOOK PARA MÚLTIPLOS LISTENERS
// ============================================================================

/**
 * Hook para escutar múltiplos eventos WebSocket
 * 
 * @example
 * ```tsx
 * useWebSocketListeners({
 *   'conversation:updated': handleConversationUpdate,
 *   'service:cancelled': handleServiceCancelled,
 *   'wallet:balance_updated': handleBalanceUpdate
 * }, { validateData: true });
 * ```
 */
export const useWebSocketListeners = (
  handlers: Partial<Record<WebSocketEventType, WebSocketEventHandler>>,
  options: UseWebSocketListenerOptions = {}
) => {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!websocketService) {
      if (options.debug) {
        console.warn('[WebSocket] websocketService não disponível');
      }
      return;
    }

    // Registrar todos os listeners
    const cleanups: Array<() => void> = [];
    
    Object.entries(handlersRef.current).forEach(([eventType, handler]) => {
      if (handler) {
        const wrappedHandler = (event: any) => {
          try {
            handler(event);
          } catch (error) {
            if (options.debug) {
              console.error(`[WebSocket] Erro em ${eventType}:`, error);
            }
            if (options.onError) {
              const err = error instanceof Error ? error : new Error(String(error));
              options.onError(err, eventType as WebSocketEventType);
            }
          }
        };

        websocketService.on(eventType as WebSocketEventType, wrappedHandler);
        
        cleanups.push(() => {
          websocketService.off(eventType as WebSocketEventType, wrappedHandler);
        });
      }
    });

    if (options.debug) {
      console.log(`[WebSocket] ${cleanups.length} listeners registrados`);
    }

    // Cleanup: remover todos os listeners
    return () => {
      cleanups.forEach(cleanup => cleanup());
      
      if (options.debug) {
        console.log(`[WebSocket] ${cleanups.length} listeners removidos`);
      }
    };
  }, [options]);
};

// ============================================================================
// HOOK PARA ESTADO DE CONEXÃO
// ============================================================================

/**
 * Hook para monitorar estado de conexão WebSocket
 * 
 * @example
 * ```tsx
 * const { isConnected, isConnecting, lastError } = useWebSocketConnection();
 * 
 * if (!isConnected) {
 *   return <div>Conectando...</div>;
 * }
 * ```
 */
export const useWebSocketConnection = () => {
  const [state, setState] = useState<{
    isConnected: boolean;
    isConnecting: boolean;
    lastError: string | undefined;
  }>({
    isConnected: false,
    isConnecting: false,
    lastError: undefined
  });

  useEffect(() => {
    if (!websocketService) return;

    const handleConnected = () => {
      setState({ isConnected: true, isConnecting: false, lastError: undefined });
    };

    const handleDisconnected = () => {
      setState((prev) => ({ ...prev, isConnected: false, isConnecting: false }));
    };

    const handleError = (event: any) => {
      setState((prev) => ({ 
        ...prev, 
        lastError: event.error || 'Erro de conexão',
        isConnecting: false
      }));
    };

    websocketService.on('connection', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);

    return () => {
      websocketService.off('connection', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
    };
  }, []);

  return state;
};

export default useWebSocketListener;
