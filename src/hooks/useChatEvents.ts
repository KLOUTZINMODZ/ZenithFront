
import { useConversationEvents } from './useConversationEvents';
import { useWalletEvents } from './useWalletEvents';
import { useMarketplaceEvents } from './useMarketplaceEvents';
import { Conversation } from '../types/websocket.types';


interface UseChatEventsOptions {

  userId?: string;

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

  onBalanceUpdated?: (balance: {
    balance: number;
    escrowBalance?: number;
    lastUpdated: string;
  }) => void;

  onPurchaseStatusChanged?: (update: {
    conversationId: string;
    purchaseId: string;
    status: string;
    buyerId: string;
    sellerId: string;
    [key: string]: any;
  }) => void;
  onPurchaseShipped?: (update: any) => void;
  onPurchaseDelivered?: (update: any) => void;
  onPurchaseConfirmed?: (update: any) => void;
  onSupportTicket?: (ticket: any) => void;

  debug?: boolean;
}

export const useChatEvents = (options: UseChatEventsOptions = {}) => {
  const {
    userId,
    onConversationUpdated,
    onConversationsUpdated,
    onServiceCancelled,
    onProposalCancelled,
    onBalanceUpdated,
    onPurchaseStatusChanged,
    onPurchaseShipped,
    onPurchaseDelivered,
    onPurchaseConfirmed,
    onSupportTicket,
    debug = false
  } = options;

  useConversationEvents({
    onConversationUpdated,
    onConversationsUpdated,
    onServiceCancelled,
    onProposalCancelled,
    debug
  });

  useWalletEvents({
    userId,
    onBalanceUpdated,
    debug
  });


  useMarketplaceEvents({
    onStatusChanged: onPurchaseStatusChanged,
    onShipped: onPurchaseShipped,
    onDelivered: onPurchaseDelivered,
    onConfirmed: onPurchaseConfirmed,
    onSupportTicket,
    debug
  });
};

export default useChatEvents;
