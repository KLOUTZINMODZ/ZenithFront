import chatApi from './chatApi';

export interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  relatedItemId?: string;
  createdAt: string;
}

export interface WalletResponse {
  success: boolean;
  data?: {
    balance: number;
    transactions: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  message?: string;
  error?: string;
}

export interface DepositResponse {
  success: boolean;
  message?: string;
  data?: {
    transaction: Transaction;
    paymentInstructions: {
      pixQrCode: string;
      pixCopyPaste: string;
      expirationDate?: string;
      asaasPaymentId?: string;
    };
    breakdown?: {
      amountGross: number;
      feePercent: number;
      feeAmount: number;
      amountNet: number;
    };
  };
  error?: string;
}

export interface WithdrawResponse {
  success: boolean;
  message?: string;
  data?: {
    transaction: Transaction;
    estimatedProcessingTime: string;
  };
  error?: string;
}

export interface PixKeyInfoResponse {
  success: boolean;
  data?: {
    type: 'PHONE' | 'CPF' | 'CNPJ' | null;
    keyMasked: string | null;
    locked: boolean;
    linkedAt?: string | null;
    firstWithdrawAt?: string | null;
  };
  message?: string;
  error?: string;
}

const walletService = {

  getWallet: async (page = 1, limit = 10, type?: string): Promise<WalletResponse> => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        chatApi.get(`/api/wallet/balance`),
        chatApi.get(`/api/wallet/transactions`, { params: { page, limit } })
      ]);

      const balance: number = balanceRes.data?.data?.balance ?? 0;
      const items: any[] = txRes.data?.data?.items ?? [];
      const pagination = txRes.data?.data?.pagination ?? { total: 0, page, limit, pages: 1 };


      const mapped: Transaction[] = items
        .map((it) => {
          const isDeposit = it.type === 'deposit';
          const isWithdraw = it.type === 'withdraw' || it.type === 'withdrawal';

          const uiType: Transaction['type'] = isDeposit ? 'deposit' : (isWithdraw ? 'withdrawal' : 'purchase');


          const amount: number = isDeposit
            ? (Number(it.amountNet ?? it.amountGross ?? 0))
            : (Number(it.amountNet ?? it.amountGross ?? 0));


          const statusServer: string = it.status || 'pending';
          let statusUi: Transaction['status'] = 'pending';
          switch (statusServer) {
            case 'credited':
            case 'paid':
            case 'fee_transfer_completed':
            case 'withdraw_completed':
              statusUi = 'completed';
              break;
            case 'failed':
              statusUi = 'failed';
              break;
            case 'cancelled':
              statusUi = 'cancelled';
              break;
            default:
              statusUi = 'pending';
          }

          const description = isDeposit
            ? `Depósito ${statusUi === 'completed' ? 'aprovado' : 'pendente'}`
            : (isWithdraw ? `Saque ${statusUi === 'completed' ? 'concluído' : 'pendente'}` : 'Transação');

          return {
            _id: it._id,
            type: uiType,
            amount,
            description,
            status: statusUi,
            createdAt: it.createdAt || new Date().toISOString()
          } as Transaction;
        })
        .filter((t) => (type ? t.type === (type as any) : true));

      return {
        success: true,
        data: {
          balance,
          transactions: mapped,
          pagination: {
            total: pagination.total ?? mapped.length,
            page: pagination.page ?? page,
            limit: pagination.limit ?? limit,
            pages: pagination.pages ?? 1
          }
        }
      };
    } catch (error: any) {
      if (error?.response?.data) {
        return error.response.data as WalletResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },


  deposit: async (amount: number, _paymentMethod: string, _paymentDetails: any): Promise<DepositResponse> => {
    try {
      const cpfCnpj = _paymentDetails?.cpfCnpj;
      const res = await chatApi.post(`/api/wallet/deposits/initiate`, { amount, ...(cpfCnpj ? { cpfCnpj } : {}) });
      const data = res.data?.data || {};
      const txId = data.transactionId || 'pending';
      const asaasPaymentId: string | undefined = data.asaasPaymentId;
      const encodedImage: string = data.pix?.encodedImage || '';
      const payload: string = data.pix?.payload || '';
      const qrDataUrl = encodedImage
        ? (encodedImage.startsWith('data:') ? encodedImage : `data:image/png;base64,${encodedImage}`)
        : '';
      const expirationDate: string | undefined = data.pix?.expirationDate;
      const breakdown = data.breakdown ? {
        amountGross: Number(data.breakdown.amountGross ?? 0),
        feePercent: Number(data.breakdown.feePercent ?? 0),
        feeAmount: Number(data.breakdown.feeAmount ?? 0),
        amountNet: Number(data.breakdown.amountNet ?? 0)
      } : undefined;

      const mapped: DepositResponse = {
        success: true,
        message: res.data?.message || 'Depósito iniciado',
        data: {
          transaction: {
            _id: txId,
            type: 'deposit',
            amount: Number(amount),
            description: 'Depósito via PIX',
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          paymentInstructions: {

            pixQrCode: qrDataUrl,
            pixCopyPaste: payload,
            expirationDate,
            asaasPaymentId
          },
          breakdown
        }
      };
      return mapped;
    } catch (error: any) {
      if (error?.response?.data) {
        return error.response.data as DepositResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  
  initiateDeposit: async (params: { amount: number; cpfCnpj?: string; pixType?: string; pixKey?: string }): Promise<{
    success: boolean;
    message?: string;
    data?: {
      transactionId?: string;
      qrCode: string;
      qrCodeImage: string;
      asaasPaymentId?: string;
      expirationDate?: string;
      breakdown?: {
        amountGross: number;
        feePercent: number;
        feeAmount: number;
        amountNet: number;
      };
    };
    error?: string;
  }> => {
    try {
      const payload: any = { amount: params.amount };
      
      // Adiciona CPF/CNPJ se fornecido
      if (params.cpfCnpj) {
        payload.cpfCnpj = params.cpfCnpj;
      }
      
      // Adiciona chave PIX opcional
      if (params.pixKey && params.pixType) {
        const typeMap: Record<string, string> = {
          cpf: 'CPF',
          cnpj: 'CNPJ'
        };
        payload.pixKeyType = typeMap[params.pixType] || params.pixType;
        payload.pixKey = params.pixKey;
      }

      const res = await chatApi.post(`/api/wallet/deposits/initiate`, payload);
      const data = res.data?.data || {};
      
      const encodedImage: string = data.pix?.encodedImage || '';
      const payload_str: string = data.pix?.payload || '';
      const qrDataUrl = encodedImage
        ? (encodedImage.startsWith('data:') ? encodedImage : `data:image/png;base64,${encodedImage}`)
        : '';

      const breakdown = data.breakdown ? {
        amountGross: Number(data.breakdown.amountGross ?? 0),
        feePercent: Number(data.breakdown.feePercent ?? 0),
        feeAmount: Number(data.breakdown.feeAmount ?? 0),
        amountNet: Number(data.breakdown.amountNet ?? 0)
      } : undefined;

      return {
        success: true,
        message: res.data?.message || 'Depósito iniciado com sucesso',
        data: {
          transactionId: data.transactionId || data._id,
          qrCode: payload_str,
          qrCodeImage: qrDataUrl,
          asaasPaymentId: data.asaasPaymentId,
          expirationDate: data.pix?.expirationDate || data.expirationDate,
          breakdown
        }
      };
    } catch (error: any) {
      if (error?.response?.data) {
        return {
          success: false,
          message: error.response.data.message || 'Erro ao iniciar depósito',
          error: error.response.data.error
        };
      }
      return { 
        success: false, 
        message: 'Erro de conexão com o servidor',
        error: 'CONNECTION_ERROR'
      };
    }
  },

  withdraw: async (amount: number, withdrawalDetails: any, options?: { idempotencyKey?: string }): Promise<WithdrawResponse> => {
    try {
      const rawType: string | undefined = (withdrawalDetails?.pixKeyType || withdrawalDetails?.type);
      const typeMap: Record<string, string> = {
        cpf: 'CPF', CPF: 'CPF',
        cnpj: 'CNPJ', CNPJ: 'CNPJ'
      };
      const mappedType = rawType ? typeMap[rawType] : undefined;


      const payload: any = { amount };
      if (mappedType) {
        payload.pixKeyType = mappedType;
        if (withdrawalDetails?.pixKey) payload.pixKey = withdrawalDetails.pixKey;
      }
      if (options?.idempotencyKey) payload.idempotencyKey = options.idempotencyKey;
      const res = await chatApi.post(`/api/wallet/withdraw`, payload);
      const txId = res.data?.data?.transactionId || 'pending';
      const result: WithdrawResponse = {
        success: !!res.data?.success,
        message: res.data?.message || 'Saque solicitado',
        data: {
          transaction: {
            _id: txId,
            type: 'withdrawal',
            amount: Number(amount),
            description: 'Saque via PIX',
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          estimatedProcessingTime: 'instante (Pix) ou até 24h úteis'
        }
      };
      return result;
    } catch (error: any) {
      if (error?.response?.data) {
        return error.response.data as WithdrawResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  }
  ,
  getPixKey: async (): Promise<PixKeyInfoResponse> => {
    try {
      const res = await chatApi.get(`/api/wallet/pix-key`);
      return res.data as PixKeyInfoResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as PixKeyInfoResponse;
      return { success: false, message: 'Erro ao consultar chave PIX' } as any;
    }
  }
  ,
  bindPixKey: async (pixKey: string, pixKeyType: 'cpf' | 'cnpj'): Promise<PixKeyInfoResponse> => {
    try {
      const typeMap: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ' };
      const res = await chatApi.post(`/api/wallet/pix-key`, { pixKey, pixKeyType: typeMap[pixKeyType] });
      return res.data as PixKeyInfoResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as PixKeyInfoResponse;
      return { success: false, message: 'Erro ao vincular chave PIX' } as any;
    }
  },


  syncWithdraws: async (): Promise<{ success: boolean; data?: { pendingCount: number } }> => {
    try {
      const res = await chatApi.post(`/api/wallet/withdraw/sync`);
      return res.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      return { success: false } as any;
    }
  },

  
  getEscrowBalance: async (): Promise<{ success: boolean; data?: { escrowBalance: number; activeAgreements: number; currency: string }; message?: string }> => {
    try {
      const res = await chatApi.get(`/api/wallet/escrow`);
      return res.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      return { success: false, message: 'Erro ao obter saldo bloqueado' };
    }
  },

  
  checkWithdrawStatus: async (): Promise<{ success: boolean; data?: { blocked: boolean; remainingMinutes?: number; failedAttempts?: number }; message?: string }> => {
    try {
      const res = await chatApi.get(`/api/wallet/withdraw/status`);
      return res.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      return { success: false, message: 'Erro ao verificar status de saque' };
    }
  }
};

export default walletService;