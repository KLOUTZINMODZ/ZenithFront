import { useMemo } from 'react';

interface ConversationDataCache {
  displayName: string;
  lastMessageText: string;
  avatarUrl: string | null;
}

export function useConversationData(
  conversation: any,
  getConversationDisplayName: (conv: any) => string,
  getLastMessageText: (conv: any) => string,
  getOtherUserAvatar: (conv: any) => string | null
): ConversationDataCache {
  return useMemo(() => {
    try {
      return {
        displayName: getConversationDisplayName(conversation),
        lastMessageText: getLastMessageText(conversation),
        avatarUrl: getOtherUserAvatar(conversation)
      };
    } catch (error) {
            return {
        displayName: 'Conversa',
        lastMessageText: 'Erro ao carregar',
        avatarUrl: null
      };
    }
  }, [
    conversation._id,
    conversation.lastMessage,
    conversation.updatedAt,
    getConversationDisplayName,
    getLastMessageText,
    getOtherUserAvatar
  ]);
}
