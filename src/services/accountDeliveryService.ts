/**
 * Service: Account Delivery
 * Integração com API de entrega automática de contas
 */

import axios from 'axios';

// Usar a API correta para account delivery (HackLoteAPI)
const RAW_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://zenithggapi.vercel.app/api';
const NORMALIZED_BASE = RAW_BASE_URL.replace(/\/+$/, '');
const HAS_VERSION_SUFFIX = /\/v\d+$/i.test(NORMALIZED_BASE);
const ACCOUNT_DELIVERY_BASE_URL = HAS_VERSION_SUFFIX
  ? NORMALIZED_BASE
  : `${NORMALIZED_BASE}/v1`;

const accountDeliveryApi = axios.create({
  baseURL: ACCOUNT_DELIVERY_BASE_URL
});

// Adicionar token de autenticação
accountDeliveryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

interface CreateCredentialsPayload {
  itemId: string;
  loginPlatform: string;
  accountName: string;
  email: string;
  password: string;
  vendorNotes?: string;
}

interface DecryptCredentialsPayload {
  deliveryId: string;
  accessToken: string;
}

interface DecryptedCredentials {
  accountName: string;
  email: string;
  password: string;
  loginPlatform: string;
}

interface Delivery {
  _id: string;
  orderId: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'processing' | 'delivered' | 'confirmed' | 'cancelled' | 'refunded';
  pricePaid: number;
  discountApplied: number;
  loginPlatform: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  deliveredAt?: string;
  confirmedAt?: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

class AccountDeliveryService {
  /**
   * Criar credenciais criptografadas para um item
   */
  static async createCredentials(payload: CreateCredentialsPayload) {
    try {
      const response = await accountDeliveryApi.post('/account-delivery/credentials', payload);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar credenciais:', error);
      throw new Error(error.response?.data?.message || 'Erro ao criar credenciais');
    }
  }

  /**
   * Obter credenciais descriptografadas
   * Requer token de acesso válido
   */
  static async getDecryptedCredentials(
    deliveryId: string,
    accessToken: string
  ): Promise<{ credentials: DecryptedCredentials; item: any; delivery: any }> {
    try {
      const response = await accountDeliveryApi.post('/account-delivery/decrypt', {
        deliveryId,
        accessToken
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao obter credenciais descriptografadas:', error);
      throw new Error(error.response?.data?.message || 'Erro ao obter credenciais');
    }
  }

  /**
   * Listar entregas automáticas do comprador
   */
  static async getBuyerDeliveries(status?: string, page: number = 1, limit: number = 10) {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await accountDeliveryApi.get(`/account-delivery/buyer?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar entregas do comprador:', error);
      throw new Error(error.response?.data?.message || 'Erro ao listar entregas');
    }
  }

  /**
   * Listar entregas automáticas do vendedor
   */
  static async getSellerDeliveries(status?: string, page: number = 1, limit: number = 10) {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await accountDeliveryApi.get(`/account-delivery/seller?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar entregas do vendedor:', error);
      throw new Error(error.response?.data?.message || 'Erro ao listar entregas');
    }
  }

  /**
   * Obter detalhes de uma entrega
   */
  static async getDeliveryDetails(deliveryId: string): Promise<Delivery> {
    try {
      const response = await accountDeliveryApi.get(`/account-delivery/${deliveryId}`);
      return response.data.data.delivery;
    } catch (error: any) {
      console.error('Erro ao obter detalhes da entrega:', error);
      throw new Error(error.response?.data?.message || 'Erro ao obter detalhes');
    }
  }

  /**
   * Confirmar recebimento das credenciais
   */
  static async confirmDelivery(deliveryId: string) {
    try {
      const response = await accountDeliveryApi.post(`/account-delivery/${deliveryId}/confirm`, {});
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao confirmar entrega:', error);
      throw new Error(error.response?.data?.message || 'Erro ao confirmar entrega');
    }
  }
}

export default AccountDeliveryService;
