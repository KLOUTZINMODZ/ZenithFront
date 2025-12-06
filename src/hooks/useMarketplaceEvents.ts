
import { useCallback, useRef } from 'react';
import { useWebSocketListener } from './useWebSocketListener';
import {
  PurchaseStatusChangedEvent,
  PurchaseSupportTicketEvent
} from '../types/websocket.types';


type PurchaseStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'confirmed' | 'cancelled';

interface PurchaseStatusUpdate {
  conversationId: string;
  purchaseId: string;
  orderNumber?: string;
  status: PurchaseStatus;
  type?: 'marketplace' | 'boosting';
  buyerId?: string;
  sellerId?: string;
  shippedAt?: string;
  deliveredAt?: string;
  autoReleaseAt?: string;
  price?: number;
  currency?: string;
  [key: string]: any;
}

interface SupportTicketData {
  conversationId: string;
  purchaseId: string;
  ticketId: string;
  status: string;
}

interface UseMarketplaceEventsOptions {
  onStatusChanged?: (update: PurchaseStatusUpdate) => void;
  onShipped?: (update: PurchaseStatusUpdate) => void;
  onDelivered?: (update: PurchaseStatusUpdate) => void;
  onConfirmed?: (update: PurchaseStatusUpdate) => void;
  onSupportTicket?: (ticket: SupportTicketData) => void;
  debug?: boolean;
}

interface MarketplaceEventHandlers {
  handleStatusChange: (update: PurchaseStatusUpdate) => void;
  handleSupportTicket: (ticket: SupportTicketData) => void;
}

export const useMarketplaceEvents = (
  options: UseMarketplaceEventsOptions = {}
): MarketplaceEventHandlers => {
  const {
    onStatusChanged,
    onShipped,
    onDelivered,
    onConfirmed,
    onSupportTicket,
    debug = false
  } = options;

  const onStatusChangedRef = useRef(onStatusChanged);
  const onShippedRef = useRef(onShipped);
  const onDeliveredRef = useRef(onDelivered);
  const onConfirmedRef = useRef(onConfirmed);
  const onSupportTicketRef = useRef(onSupportTicket);
  useCallback(() => {
    onStatusChangedRef.current = onStatusChanged;
    onShippedRef.current = onShipped;
    onDeliveredRef.current = onDelivered;
    onConfirmedRef.current = onConfirmed;
    onSupportTicketRef.current = onSupportTicket;
  }, [onStatusChanged, onShipped, onDelivered, onConfirmed, onSupportTicket])();


  const normalizeUpdate = useCallback((update: PurchaseStatusUpdate): PurchaseStatusUpdate => {
    const purchaseId = update.purchaseId || update.orderNumber || update.boostingOrderId || '';
    return {
      ...update,
      purchaseId,
      type: update.type || (update.boostingOrderId ? 'boosting' : 'marketplace')
    };
  }, []);

  const handleStatusChange = useCallback(
    (rawUpdate: PurchaseStatusUpdate) => {
      const update = normalizeUpdate(rawUpdate);
      
      if (onStatusChangedRef.current) {
        onStatusChangedRef.current(update);
      }

      switch (update.status) {
        case 'shipped':
          if (onShippedRef.current) {
            onShippedRef.current(update);
          }
          break;

        case 'delivered':
          if (onDeliveredRef.current) {
            onDeliveredRef.current(update);
          }
          break;

        case 'confirmed':
          if (onConfirmedRef.current) {
            onConfirmedRef.current(update);
          }
          break;
      }
    },
    [debug]
  );

  const handleSupportTicket = useCallback(
    (ticket: SupportTicketData) => {

      if (onSupportTicketRef.current) {
        onSupportTicketRef.current(ticket);
      }
    },
    [debug]
  );

  useWebSocketListener<PurchaseStatusChangedEvent>(
    'purchase:status_changed',
    (event) => {
      const { data } = event;

      if (!data.conversationId || !data.purchaseId) {
        return;
      }

      handleStatusChange(data as any);
    },
    {
      validateData: true,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener(
    'purchase:shipped',
    (event: any) => {
      const { data } = event;

      if (!data.conversationId || !data.purchaseId) {
        return;
      }

      // Normalizar para formato PurchaseStatusUpdate
      const update: PurchaseStatusUpdate = {
        ...data,
        status: 'shipped'
      };

      handleStatusChange(update);
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener(
    'purchase:delivered',
    (event: any) => {
      const { data } = event;

      if (!data.conversationId || !data.purchaseId) {
        return;
      }

      const update: PurchaseStatusUpdate = {
        ...data,
        status: 'delivered'
      };

      handleStatusChange(update);
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener(
    'purchase:confirmed',
    (event: any) => {
      const { data } = event;

      if (!data.conversationId || !data.purchaseId) {
        return;
      }

      const update: PurchaseStatusUpdate = {
        ...data,
        status: 'confirmed'
      };

      handleStatusChange(update);
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener<PurchaseSupportTicketEvent>(
    'purchase:support_ticket',
    (event) => {
      const { data } = event;

      if (!data.conversationId || !data.purchaseId || !data.ticketId) {
        return;
      }

      handleSupportTicket(data);
    },
    {
      validateData: false,
      debug,
      onError: (error) => {}
    }
  );


  return {
    handleStatusChange,
    handleSupportTicket
  };
};


export default useMarketplaceEvents;
