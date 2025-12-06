import axios from 'axios';
import chatApi from './chatApi';

const rawChatApiBase = ((import.meta as any).env?.VITE_CHAT_API_URL as string | undefined) || 'https://zenith.enrelyugi.com.br';

const CHAT_API_BASE_URL = (() => {
  const noTrailing = rawChatApiBase.replace(/\/$/, '');
  let base = noTrailing.endsWith('/api') ? noTrailing : `${noTrailing}/api`;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://')) {
    base = base.replace('http://', 'https://');
  }
  return base;
})();

export interface BoostingOrderSnapshot {
  _id?: string;
  orderNumber: string;
  status: string;
  price: number;
  currency?: string;
  serviceSnapshot?: {
    game?: string;
    category?: string;
    currentRank?: string;
    desiredRank?: string;
    description?: string;
    estimatedTime?: string;
  };
  clientId?: string;
  boosterId?: string;
  clientData?: { name?: string; avatar?: string; userid?: string };
  boosterData?: { name?: string; avatar?: string; rating?: number; userid?: string };
  conversationId?: string;
  acceptedAt?: string;
  completedAt?: string;
  boostingRequestId?: string;
}

class BoostingOrderService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
  }

  private getUserId(): string | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user._id || user.id || null;
    } catch {
      return null;
    }
  }

  async getBoostingOrderByConversation(conversationId: string): Promise<BoostingOrderSnapshot | null> {
    if (!conversationId) return null;
    try {
      const response = await chatApi.get(`/api/boosting-orders/conversation/${conversationId}`);
      if (response.data?.success && response.data?.data) {
        const order = response.data.data as any;
        console.log('[BoostingChatService] Resposta do backend:', { _id: order._id, agreementObjectId: order.agreementObjectId, agreementId: order.agreementId });
        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          price: order.price,
          currency: order.currency || 'BRL',
          serviceSnapshot: order.serviceSnapshot,
          clientId: order.clientId,
          boosterId: order.boosterId,
          clientData: order.clientData,
          boosterData: order.boosterData,
          conversationId: order.conversationId,
          acceptedAt: order.createdAt,
          completedAt: order.completedAt,
          boostingRequestId: order.boostingRequestId,
          agreementObjectId: order.agreementObjectId
        } as any;
      }
      return null;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw new Error(error?.response?.data?.message || 'Erro ao carregar pedido de boosting');
    }
  }

  async getBoostingOrder(orderNumber: string): Promise<BoostingOrderSnapshot | null> {
    try {
      const response = await axios.get(`${CHAT_API_BASE_URL}/boosting-orders/${orderNumber}`, { headers: this.getAuthHeaders() });
      if (response.data?.success && response.data?.data) {
        const order = response.data.data as any;
        return {
          orderNumber: order.orderNumber,
          status: order.status,
          price: order.price,
          currency: order.currency || 'BRL',
          serviceSnapshot: order.serviceSnapshot,
          clientId: order.clientId,
          boosterId: order.boosterId,
          clientData: order.clientData,
          boosterData: order.boosterData,
          conversationId: order.conversationId,
          acceptedAt: order.createdAt,
          completedAt: order.completedAt,
          boostingRequestId: order.boostingRequestId
        };
      }
      return null;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Erro ao carregar pedido de boosting');
    }
  }

  async cancelBoostingOrder(orderNumber: string, reason: string): Promise<void> {
    try {
      const response = await axios.post(
        `${CHAT_API_BASE_URL}/boosting-orders/${orderNumber}/cancel`,
        { reason },
        { headers: this.getAuthHeaders() }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao cancelar pedido de boosting');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao cancelar pedido de boosting');
    }
  }

  async confirmDelivery(orderNumber: string): Promise<void> {
    try {
      const response = await axios.post(
        `${CHAT_API_BASE_URL}/boosting-orders/${orderNumber}/confirm-delivery`,
        {},
        { headers: this.getAuthHeaders() }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao confirmar entrega');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao confirmar entrega');
    }
  }

  async reportBoostingOrder(orderNumber: string, data: { reason: string; description?: string; evidence?: string }): Promise<void> {
    try {
      const response = await axios.post(
        `${CHAT_API_BASE_URL}/boosting-orders/${orderNumber}/report`,
        data,
        { headers: this.getAuthHeaders() }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao registrar denúncia');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao registrar denúncia');
    }
  }

  async getBoostingOrderStatus(orderNumber: string): Promise<any> {
    try {
      const response = await axios.get(`${CHAT_API_BASE_URL}/boosting-orders/${orderNumber}/status`, { headers: this.getAuthHeaders() });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao obter status do pedido de boosting');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao obter status do pedido de boosting');
    }
  }

  async ensureOrderNumber(conversationId: string): Promise<string> {
    const order = await this.getBoostingOrderByConversation(conversationId);
    if (!order?.orderNumber) {
      throw new Error('Pedido de boosting não encontrado para esta conversa');
    }
    return order.orderNumber;
  }

  async confirmDeliveryByConversation(conversationId: string): Promise<void> {
    const orderNumber = await this.ensureOrderNumber(conversationId);
    await this.confirmDelivery(orderNumber);
  }

  async reportByConversation(conversationId: string, data: { reason: string; description?: string; evidence?: string }): Promise<void> {
    const orderNumber = await this.ensureOrderNumber(conversationId);
    await this.reportBoostingOrder(orderNumber, data);
  }
}

export default new BoostingOrderService();
