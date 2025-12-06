import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseChatRealtimeSimpleOptions {
  userId: string;
  onNewMessage?: (message: any) => void;
  onConnectionChange?: (status: { connected: boolean }) => void;
}


export function useChatRealtimeSimple(options: UseChatRealtimeSimpleOptions) {
  const { userId, onNewMessage, onConnectionChange } = options;


  const { isConnected, sendMessage } = useWebSocket();


  useEffect(() => {
    onConnectionChange?.({ connected: isConnected });

  }, [isConnected]);


  useEffect(() => {
    if (!onNewMessage) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      if (!detail) return;
      const { message, conversationId } = detail;
      onNewMessage({
        ...message,
        conversation: message?.conversation || conversationId,
        sender: message?.sender?._id || message?.sender || userId,
        type: message?.type || 'message',
      });
    };
    window.addEventListener('new-message' as any, handler as EventListener);
    return () => window.removeEventListener('new-message' as any, handler as EventListener);
  }, [onNewMessage, userId]);


  const sendRealtimeMessage = (conversationId: string, payload: { content: string; sender?: string }) => {
    if (!conversationId || !payload?.content) return false;
    try {
      sendMessage(conversationId, payload.content, 'text');
      return true;
    } catch {
      return false;
    }
  };

  return {
    isConnected,
    sendRealtimeMessage,
  };
}
