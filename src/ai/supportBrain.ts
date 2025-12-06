


export type Role = 'buyer' | 'seller' | null;

export interface PixInfo {
  type: 'PHONE' | 'CPF' | 'CNPJ' | null;
  keyMasked: string | null;
  locked: boolean;
}

export interface SuggestionContext {
  role: Role;
  myPurchases: any[];
  mySales: any[];
  walletBalance: number | null;
  pixInfo: PixInfo | null;
  
  lastFrom?: 'bot' | 'me';
  lastText?: string;
  activeTab?: 'assistant' | 'contact' | 'tickets';
  pendingAction?: {
    type: 'openTicket' | 'trackOrder' | 'withdraw' | 'bindPixKey' | 'shipOrder' | 'confirmDelivery' | 'cancelOrder';
    confirmRequired?: boolean;
    orderNumber?: string;
    purchaseId?: string;
    amount?: number;
  } | null;
}

const currency = (v: number) => {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch { return `R$ ${v.toFixed(2)}`; }
};


export function computeSmartSuggestions(ctx: SuggestionContext): string[] {
  const suggestions: string[] = [];
  const { role, myPurchases, mySales, walletBalance, pixInfo, lastFrom, lastText, activeTab, pendingAction } = ctx || {} as SuggestionContext;

  const lc = (s?: string) => (s || '').toLowerCase();
  const last = lc(lastText);

  
  if (activeTab === 'tickets') {
    suggestions.push('Suporte geral');
    suggestions.push('Abrir Mensagens');
    suggestions.push('Abrir Pedidos em Aberto');
    suggestions.push('Abrir Carteira');
    
  }

  
  if (pendingAction && pendingAction.type) {
    const recentPurchase = (myPurchases || [])[0];
    const recentSale = (mySales || [])[0];
    switch (pendingAction.type) {
      case 'openTicket': {
        if (pendingAction.confirmRequired) {
          suggestions.push('Sim');
          suggestions.push('Não');
        } else {
          
          suggestions.push('Abrir Pedidos em Aberto');
        }
        break;
      }
      case 'trackOrder': {
        suggestions.push('Abrir Pedidos em Aberto');
        break;
      }
      case 'withdraw': {
        
        [25, 50, 100, 200].forEach(v => suggestions.push(`Sacar ${currency(v)}`));
        if (typeof walletBalance === 'number' && walletBalance > 0) {
          const amount = Math.max(25, Math.min(200, Math.floor(walletBalance)));
          suggestions.push(`Sacar ${currency(amount)}`);
        }
        suggestions.push('Abrir Carteira');
        break;
      }
      case 'bindPixKey': {
        suggestions.push('Vincular PIX');
        suggestions.push('Abrir Carteira');
        break;
      }
      case 'shipOrder': {
        if (recentSale?.orderNumber) suggestions.push(`Marcar envio da venda #${recentSale.orderNumber}`);
        suggestions.push('Abrir Pedidos em Aberto');
        break;
      }
      case 'confirmDelivery': {
        if (recentPurchase?.orderNumber) suggestions.push(`Confirmar recebimento do pedido #${recentPurchase.orderNumber}`);
        suggestions.push('Abrir Pedidos em Aberto');
        break;
      }
      case 'cancelOrder': {
        if (recentPurchase?.orderNumber) suggestions.push(`Cancelar pedido #${recentPurchase.orderNumber}`);
        suggestions.push('Abrir Pedidos em Aberto');
        break;
      }
      default: break;
    }
    
  }

  
  if (lastFrom === 'bot' && /confirma|confirmo|confirmar|deseja|posso\s+abrir/.test(last)) {
    suggestions.push('Sim');
    suggestions.push('Não');
  }

  
  if (lastFrom === 'bot' && /(n[úu]mero\s+do\s+pedido|#\d+|id\s+da\s+compra|id\s+da\s+venda)/.test(last)) {
    suggestions.push('Abrir Pedidos em Aberto');
  }

  
  if (role === 'buyer') {
    const recent = (myPurchases || [])[0];
    if (recent?.status && String(recent.status).includes('shipped')) {
      suggestions.push(`Confirmar recebimento do pedido #${recent.orderNumber}`);
      suggestions.push('Pedido não recebido');
    }
    
    suggestions.push('Consultar saldo');
    if (!pixInfo?.type) suggestions.push('Vincular PIX');
    if (typeof walletBalance === 'number' && walletBalance > 0) {
      const amount = Math.max(25, Math.min(200, Math.floor(walletBalance)));
      suggestions.push(`Sacar ${currency(amount)}`);
    }
    suggestions.push('Meus Tickets');
    suggestions.push('Suporte geral');
    
    suggestions.push('Abrir Carteira');
    suggestions.push('Abrir Pedidos em Aberto');
    suggestions.push('Abrir Mensagens');
  } else if (role === 'seller') {
    const recent = (mySales || [])[0];
    if (recent?.orderNumber) suggestions.push(`Marcar envio da venda #${recent.orderNumber}`);
    suggestions.push('Consultar saldo');
    if (!pixInfo?.type) suggestions.push('Vincular PIX');
    if (typeof walletBalance === 'number' && walletBalance > 0) {
      const amount = Math.max(25, Math.min(200, Math.floor(walletBalance)));
      suggestions.push(`Sacar ${currency(amount)}`);
    }
    suggestions.push('Meus Tickets');
    suggestions.push('Suporte geral');
    
    suggestions.push('Abrir Pedidos em Aberto');
    suggestions.push('Abrir Mensagens');
    suggestions.push('Ir para Marketplace');
  } else {
    
    suggestions.push('Sou comprador');
    suggestions.push('Sou vendedor');
    suggestions.push('Consultar saldo');
    if (!pixInfo?.type) suggestions.push('Vincular PIX');
    suggestions.push('Abrir Marketplace');
    suggestions.push('Abrir Carteira');
    suggestions.push('Abrir Mensagens');
  }

  
  const deduped = Array.from(new Set(suggestions)).slice(0, 10);
  return deduped;
}
