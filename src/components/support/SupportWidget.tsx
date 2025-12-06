import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';
import { X, ShieldAlert, Bot, ArrowLeft, RefreshCcw, Home, MessageSquareText, Maximize2, Minimize2, Phone, Instagram, Mail } from 'lucide-react';
// useLocation removido (não utilizado)
import supportService, { IssueType } from '../../services/supportService';
import websocketService from '../../services/websocketService';
import aiSupportService from '../../services/aiSupportService';
import { getDeviceFingerprint, generateDeviceFingerprint } from '../../utils/deviceFingerprint';
import purchaseService from '../../services/purchaseService';
import walletService from '../../services/walletService';
import { useAuth } from '../../contexts/AuthContext';
import { computeSmartSuggestions } from '../../ai/supportBrain';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';

type TabKey = 'assistant' | 'contact' | 'tickets';

type Ticket = {
  _id: string;
  conversationId?: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

const formatDate = (iso?: string) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
};

const translateStatus = (status?: string) => {
  const map: Record<string, string> = {
    pending: 'Pendente',
    under_review: 'Em análise',
    in_review: 'Em análise',
    in_progress: 'Em andamento',
    open: 'Aberto',
    resolved: 'Resolvido',
    closed: 'Fechado',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
    failed: 'Falhou'
  };
  if (!status) return 'Desconhecido';
  return map[status] || status;
};

const translateReason = (reason?: string) => {
  const map: Record<string, string> = {
    support_ticket_opened: 'Ticket de Suporte Aberto',
    qa_comment: 'Comentário da Qualidade',
    user_comment: 'Comentário do Usuário',
    system_update: 'Atualização do Sistema',
    payment_issue_reported: 'Problema de Pagamento Reportado',
  };
  if (!reason) return 'Evento';
  return map[reason] || humanizeFallback(reason, 'Evento');
};

const translateType = (type?: string) => {
  const map: Record<string, string> = {
    payment_issues: 'Problemas de Pagamento',
    service_not_delivered: 'Serviço não entregue',
    not_received: 'Pedido não recebido',
    refund: 'Reembolso',
    dispute: 'Disputa',
    cancel_order: 'Cancelar pedido',
    track_order: 'Acompanhar pedido',
    other: 'Outro',
    general: 'Geral',
    support: 'Suporte'
  };
  if (!type) return 'Outro';
  return map[type] || humanizeFallback(type, 'Outro');
};

const humanizeFallback = (s: string, def: string) => {
  try {
    const cleaned = String(s || '').replace(/_/g, ' ').trim();
    if (!cleaned) return def;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch { return def; }
};


const sanitizeInput = (text: string, maxLength: number = 500): string => {
  try {
    return String(text || '')
      .slice(0, maxLength)
      .replace(/[<>]/g, '') 
      .trim();
  } catch { return ''; }
};

const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11 && /^\d{11}$/.test(digits) && digits !== '00000000000';
};

const validateCNPJ = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  return digits.length === 14 && /^\d{14}$/.test(digits) && digits !== '00000000000000';
};

const validateAmount = (amount: number): boolean => {
  return typeof amount === 'number' && amount > 0 && amount <= 100000 && Number.isFinite(amount);
};

const maskPIXKey = (key: string, type: string): string => {
  try {
    const digits = key.replace(/\D/g, '');
    if (type.toUpperCase() === 'CPF' && digits.length === 11) {
      return `***.${ digits.slice(3, 6)}.***-**`;
    }
    if (type.toUpperCase() === 'CNPJ' && digits.length === 14) {
      return `**.***.${ digits.slice(5, 8)}/**$$-**`;
    }
    return '***';
  } catch { return '***'; }
};

const chip = 'px-3 py-1.5 rounded-full border border-purple-500/30 text-xs font-medium text-purple-200 bg-gradient-to-r from-purple-600/20 to-purple-500/10 hover:from-purple-600/30 hover:to-purple-500/20 hover:border-purple-400/50 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm hover:shadow-purple-500/20';

const SupportWidget: React.FC = () => {
  const { user } = useAuth();
  const isMobileDevice = useIsMobileDevice();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('assistant');

  
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ from: 'bot' | 'me'; text: string }>>([
    { from: 'bot', text: 'Olá! Sou sua Central de Suporte. Você é comprador ou vendedor?' }
  ]);
  const [busy, setBusy] = useState(false);

  
  const prefersReducedMotion = useReducedMotion();

  
  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      if (activeTab !== 'assistant') return;
      const sc = contentRef.current;
      if (!sc) return;
      sc.scrollTop = sc.scrollHeight;
    } catch {}
  }, [assistantMessages, activeTab]);

  
  const [sizeMode, setSizeMode] = useState<'compact' | 'comfortable' | 'expanded'>(() => {
    try { return (localStorage.getItem('support.sizeMode') as any) || 'comfortable'; } catch { return 'comfortable'; }
  });
  const drawerWidthClasses = () => {
    if (isMobileDevice) return 'w-full';
    switch (sizeMode) {
      case 'compact':
        return 'w-[380px]';
      case 'expanded':
        return 'w-[560px]';
      default:
        return 'w-[460px]';
    }
  };

  
  useEffect(() => {
    const openHandler = () => setOpen(true);
    const openTicketsHandler = () => { setOpen(true); setActiveTab('tickets'); };
    try {
      window.addEventListener('support:open' as any, openHandler as any);
      window.addEventListener('support:open_tickets' as any, openTicketsHandler as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener('support:open' as any, openHandler as any);
        window.removeEventListener('support:open_tickets' as any, openTicketsHandler as any);
      } catch {}
    };
  }, []);

  
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const fp = await getDeviceFingerprint().catch(generateDeviceFingerprint);
        if (!mounted) return;
        fingerprintRef.current = { fingerprint: fp?.fingerprint, components: fp?.components };
      } catch {}
    })();
    return () => { mounted = false; };
  }, [open]);

  
  useEffect(() => {
    const handler = (_: any) => {
      try {
        if (!open) return; 
        loadTickets();
        sendBot('Um novo ticket foi registrado e está disponível na aba Tickets.');
      } catch {}
    };
    try { websocketService.on('support:ticket_created', handler); } catch {}
    return () => {
      try { websocketService.off('support:ticket_created', handler); } catch {}
    };
  }, [open]);

  useEffect(() => {
    try { localStorage.setItem('support.sizeMode', sizeMode); } catch {}
  }, [sizeMode]);

  
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: prefersReducedMotion ? 0 : 0.25 } },
    exit: { opacity: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2 } }
  };

  const drawerEnter: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 400, damping: 35, mass: 0.8 };
  const drawerExit: Transition = { duration: prefersReducedMotion ? 0 : 0.25, ease: [0.32, 0.72, 0, 1] as any };

  
  const drawerVariants: Variants = {
    hidden: isMobileDevice ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
    visible: isMobileDevice ? { y: 0, opacity: 1, transition: drawerEnter } : { x: 0, opacity: 1, transition: drawerEnter },
    exit: isMobileDevice ? { y: '100%', opacity: 0, transition: drawerExit } : { x: '100%', opacity: 0, transition: drawerExit }
  };

  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<{ report: any; messages: any[] } | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);

  
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [mySales, setMySales] = useState<any[]>([]);

  
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pixInfo, setPixInfo] = useState<{ type: 'PHONE' | 'CPF' | 'CNPJ' | null; keyMasked: string | null; locked: boolean } | null>(null);

  
  const fingerprintRef = useRef<{ fingerprint?: string; components?: any } | null>(null);

  
  const [aiActions, setAiActions] = useState<Array<{ type: string; label?: string; payload?: any }>>([]);

  


  
  const [pendingAction, setPendingAction] = useState<
    | { type: 'openTicket'; issueType: IssueType; purchaseId?: string; description?: string; confirmRequired?: boolean }
    | { type: 'trackOrder'; purchaseId?: string; orderNumber?: string }
    | { type: 'withdraw'; amount?: number; pixKeyType?: 'cpf' | 'cnpj'; pixKey?: string; confirmRequired?: boolean }
    | { type: 'bindPixKey'; pixKeyType?: 'cpf' | 'cnpj'; pixKey?: string }
    | { type: 'shipOrder'; purchaseId?: string; orderNumber?: string }
    | { type: 'confirmDelivery'; purchaseId?: string; orderNumber?: string }
    | { type: 'cancelOrder'; purchaseId?: string; orderNumber?: string }
    | null
  >(null);

  
  const normalizeText = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/\s+/g, ' ') 
      .trim();

  const extractEntities = (text: string) => {
    const norm = normalizeText(text);
    const idMatch = norm.match(/\b([a-f0-9]{24})\b/); 
    const orderNumberMatch = norm.match(/(?:pedido|venda|order|#)\s*#?(\d{3,})/);
    
    const amountMatch = norm.match(/(?:r\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:,[0-9]{2})?)/);
    const parseAmount = (s?: string): number | undefined => {
      if (!s) return undefined;
      try {
        const clean = s.replace(/\./g, '').replace(',', '.');
        const n = Number(clean);
        return Number.isFinite(n) ? n : undefined;
      } catch {
        return undefined;
      }
    };
    
    const cpfDigits = norm.replace(/[^0-9]/g, '').length === 11 ? norm.replace(/\D/g, '') : undefined;
    const cnpjDigits = norm.replace(/[^0-9]/g, '').length === 14 ? norm.replace(/\D/g, '') : undefined;
    let pixKeyType: 'cpf' | 'cnpj' | undefined = undefined;
    let pixKey: string | undefined = undefined;
    if (/\bc\s*n\s*p\s*j\b|\bcnpj\b/.test(norm) || (!!cnpjDigits && !cpfDigits)) {
      pixKeyType = 'cnpj';
      pixKey = cnpjDigits;
    } else if (/\bc\s*p\s*f\b|\bcpf\b/.test(norm) || (!!cpfDigits && !cnpjDigits)) {
      pixKeyType = 'cpf';
      pixKey = cpfDigits;
    }
    const amount = parseAmount(amountMatch ? amountMatch[1] : undefined);
    return {
      purchaseId: idMatch ? idMatch[1] : undefined,
      orderNumber: orderNumberMatch ? orderNumberMatch[1] : undefined,
      amount,
      pixKeyType,
      pixKey
    } as { purchaseId?: string; orderNumber?: string; amount?: number; pixKeyType?: 'cpf' | 'cnpj'; pixKey?: string };
  };

  const intentFrom = (text: string):
    | 'role_buyer'
    | 'role_seller'
    | 'tickets'
    | 'track_order'
    | 'not_received'
    | 'payment_issues'
    | 'refund'
    | 'dispute'
    | 'cancel_order'
    | 'wallet_balance'
    | 'withdraw'
    | 'bind_pix'
    | 'pix_key'
    | 'ship_order'
    | 'confirm_delivery'
    | 'navigate_wallet'
    | 'navigate_open_orders'
    | 'navigate_purchases'
    | 'navigate_sales'
    | 'navigate_messages'
    | 'navigate_marketplace'
    | 'navigate_home'
    | 'contact'
    | 'unknown' => {
    const t = normalizeText(text);
    if (/(sou\s+)?comprador|\bbuyer\b/.test(t)) return 'role_buyer';
    if (/(sou\s+)?vendedor|\bseller\b/.test(t)) return 'role_seller';
    if (/(meus\s+tickets|abrir\s+tickets|^tickets$)/.test(t)) return 'tickets';
    if (/(acompanhar|status|ver).*(pedido|venda|order|#\d+)/.test(t)) return 'track_order';
    if (/(nao\s*recebi|nao\s*recebido|nao\s*chegou|pedido\s*nao\s*recebido)/.test(t)) return 'not_received';
    if (/(pagamento|paguei|recusado|falha|cartao|pix|boleto)/.test(t)) return 'payment_issues';
    if (/(reembolso|refund|devolucao)/.test(t)) return 'refund';
    if (/(disputa|contestacao|chargeback)/.test(t)) return 'dispute';
    if (/(cancelar|cancelei|quero\s+cancelar).*(pedido|compra|venda)?/.test(t)) return 'cancel_order';
    if (/(saldo|carteira|quanto\s+tenho|balance)/.test(t)) return 'wallet_balance';
    if (/(sacar|saque|retirar|withdraw)/.test(t)) return 'withdraw';
    if (/(vincular|cadastrar).*(chave\s+)?pix|\bbind\s+pix\b/.test(t)) return 'bind_pix';
    if (/(minha|qual).*(chave\s+)?pix/.test(t)) return 'pix_key';
    if (/(enviar|postar|marcar).*(pedido|venda).*envio|\bship\b/.test(t)) return 'ship_order';
    if (/(confirmar|confirmei).*(recebimento|entrega)|\bconfirm\s+delivery\b/.test(t)) return 'confirm_delivery';
    if (/(ir|abrir|acessar).*(carteira|wallet)/.test(t)) return 'navigate_wallet';
    if (/(ir|abrir|acessar).*(pedidos\s*em\s*aberto|open\s*orders)/.test(t)) return 'navigate_open_orders';
    if (/(ir|abrir|acessar).*(compras|purchases)/.test(t)) return 'navigate_purchases';
    if (/(ir|abrir|acessar).*(vendas|sales)/.test(t)) return 'navigate_sales';
    if (/(ir|abrir|acessar).*(mensagens|conversas|messages|chat)/.test(t)) return 'navigate_messages';
    if (/(ir|abrir|acessar).*(marketplace|loja)/.test(t)) return 'navigate_marketplace';
    if (/(ir|abrir|acessar).*(inicio|início|home|pagina\s*inicial|página\s*inicial)/.test(t)) return 'navigate_home';
    if (/(contato|contacto|falar\s+com|entrar\s+em\s+contato)/.test(t)) return 'contact';
    return 'unknown';
  };

  
  const formatCurrency = (n: number) => {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n); } catch { return `R$ ${n.toFixed(2)}`; }
  };

  const isAffirmative = (text: string) => /^(sim|s|ok|pode|claro|confirmo|confirmar|vai)$/i.test(normalizeText(text));
  const isNegative = (text: string) => /^(nao|n|negativo|cancelar|cancela|deixa|melhor nao)$/i.test(normalizeText(text));

  const loadTickets = async () => {
    try {
      setTicketsLoading(true);
      const res = await supportService.listTickets({ page: 1, limit: 20 });
      if (res?.success && res.data?.tickets) setTickets(res.data.tickets as Ticket[]);
    } finally { setTicketsLoading(false); }
  };

  const prefetchOrders = async () => {
    try {
      const [p1, p2] = await Promise.all([
        purchaseService.list({ type: 'purchases', page: 1, limit: 5 }),
        purchaseService.list({ type: 'sales', page: 1, limit: 5 })
      ]);
      setMyPurchases(p1?.data?.orders || []);
      setMySales(p2?.data?.orders || []);
    } catch {}
  };

  const prefetchWallet = async () => {
    try {
      const [w, k] = await Promise.all([
        walletService.getWallet(1, 1),
        walletService.getPixKey()
      ]);
      setWalletBalance(typeof w?.data?.balance === 'number' ? w.data.balance : null);
      setPixInfo(k?.data || null);
    } catch {}
  };

  const handleDragEnd = (_: any, info: any) => {
    try {
      
      
      if (isMobileDevice && info?.offset?.y > 120) {
        setOpen(false);
      } else if (!isMobileDevice && info?.offset?.x > 100) {
        setOpen(false);
      }
    } catch {}
  };

  
  const panelRef = useRef<HTMLDivElement>(null);
  const ticketRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const selectedIdRef = useRef<string | null>(null);
  const detailCacheRef = useRef(new Map<string, { report: any; messages: any[] }>());
  const generalDescRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => panelRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      
      loadTickets();
      prefetchOrders();
      prefetchWallet();
      
      
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      
      document.body.style.overflow = 'hidden';
      if (isMobileDevice) {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
      };
    }
  }, [open, isMobileDevice]);

  
  useEffect(() => {
    if (pendingAction?.type === 'openTicket') {
      const id = setTimeout(() => generalDescRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [pendingAction]);

  useEffect(() => {
    if (!open) {
      
      setSelectedTicketId(null);
      setTicketDetail(null);
      setActiveTab('assistant');
    }
  }, [open]);

  const sendQuick = (text: string) => {
    setAssistantMessages(prev => [...prev, { from: 'me', text }]);
    handleAssistantInput(text);

    
    (async () => {
      try {
        setBusy(true);
        const context = {
          role,
          walletBalance,
          pixInfo,
          purchasesCount: (myPurchases || []).length,
          salesCount: (mySales || []).length
        };
        const resp = await aiSupportService.analyzeSupport({ text, context, locale: 'pt-BR' });
        if (resp?.success) {
          setAiActions(resp.suggestedActions || []);
          if (resp.answer) {
            const ans = String(resp.answer);
            setAssistantMessages(prev => [...prev, { from: 'bot', text: ans }]);
          }
          if ((resp.citations || []).length > 0) {
            const citeLines = (resp.citations || []).map((c) => `• ${c.title || c.url || 'Referência'}${c.url ? `: ${c.url}` : ''}`).join('\n');
            setAssistantMessages(prev => [...prev, { from: 'bot', text: `Fontes:\n${citeLines}` }]);
          }
        }
      } catch {}
      finally { setBusy(false); }
    })();
  };

  
  const sendBot = (text: string) => setAssistantMessages(prev => [...prev, { from: 'bot', text }]);

  const handleAssistantInput = async (raw: string) => {
    const lower = raw.trim().toLowerCase();
    const entities = extractEntities(raw);

    const reply = async (t: string) => setAssistantMessages(prev => [...prev, { from: 'bot', text: t }]);

    
    if (!role) {
      if (lower.includes('comprador')) {
        setRole('buyer');
        const openCount = tickets.filter(t => t.status === 'pending' || t.status === 'under_review').length;
        const recentOrders = myPurchases.slice(0, 3).map(o => `• #${o.orderNumber} — ${o.item?.title || 'Pedido'} (${o.status})`).join('\n');
        await reply(`Perfeito! Como comprador, posso te ajudar com:\n• Pedido não recebido\n• Problemas de pagamento\n• Suporte geral\n\nVocê possui ${openCount} ticket(s) em aberto.\nPedidos recentes:\n${recentOrders || '• Sem pedidos recentes'}`);
        return;
      }
      if (lower.includes('vendedor')) {
        setRole('seller');
        const openCount = tickets.filter(t => t.status === 'pending' || t.status === 'under_review').length;
        const recentSales = mySales.slice(0, 3).map(o => `• #${o.orderNumber} — ${o.item?.title || 'Venda'} (${o.status})`).join('\n');
        await reply(`Ótimo! Como vendedor, posso te ajudar com:\n• Disputas de pedido\n• Suporte geral\n• Dúvidas técnicas\n\nVocê possui ${openCount} ticket(s) em aberto.\nVendas recentes:\n${recentSales || '• Sem vendas recentes'}`);
        return;
      }
      await reply('Por favor, informe se você é "comprador" ou "vendedor".');
      return;
    }

    
    if (pendingAction) {
      if (pendingAction.type === 'openTicket') {
        const pid = entities.purchaseId || pendingAction.purchaseId;
        if (pendingAction.confirmRequired && pid) {
          if (isAffirmative(raw)) {
            
          } else if (isNegative(raw)) {
            await reply('Ok! Não abrirei o ticket.');
            setPendingAction(null);
            return;
          } else {
            await reply('Para continuar, responda "sim" para confirmar ou "não" para cancelar.');
            return;
          }
        }
        if (!pid) {
          await reply('Certo! Informe o ID da compra (24 caracteres) para abrir o ticket.');
          setPendingAction({ ...pendingAction });
          return;
        }
        try {
          setBusy(true);
          const description = pendingAction.description || raw;
          const res = await supportService.openTicket(
            pid,
            { description, issueType: pendingAction.issueType },
            { fingerprint: fingerprintRef.current?.fingerprint, components: fingerprintRef.current?.components }
          );
          if (res?.success) {
            await reply('Ticket criado com sucesso! Você pode acompanhá-lo na aba Tickets.');
            setActiveTab('tickets');
            loadTickets();
            setPendingAction(null);
          } else {
            await reply(res?.message || 'Não consegui abrir o ticket. Verifique o ID e tente novamente.');
          }
        } finally {
          setBusy(false);
        }
        return;
      }
      
      if (pendingAction.type === 'withdraw') {
        try {
          setBusy(true);
          
          let amt = pendingAction.amount ?? entities.amount;
          if (!amt || !(amt > 0)) {
            await reply('Qual valor você deseja sacar? Ex: R$ 50,00');
            setPendingAction({ ...pendingAction });
            return;
          }
          
          let keyType = pendingAction.pixKeyType || entities.pixKeyType;
          let key = pendingAction.pixKey || entities.pixKey;
          if (!keyType || !key) {
            
            try {
              const k = await walletService.getPixKey();
              const d = k?.data;
              if (d && d.type && !d.locked) {
                keyType = (String(d.type).toUpperCase() === 'CNPJ') ? 'cnpj' : 'cpf';
              }
            } catch {}
          }
          if (!keyType || !key) {
            await reply('Preciso da sua chave PIX (CPF ou CNPJ). Envie algo como: "PIX CPF 12345678901".');
            setPendingAction({ type: 'withdraw', amount: amt });
            return;
          }
          const resp = await walletService.withdraw(amt, { pixKeyType: keyType, pixKey: key }, { idempotencyKey: `wd_${Date.now()}` });
          if (resp?.success) {
            await reply(`Saque solicitado com sucesso de ${formatCurrency(amt)}. Tempo estimado: ${resp?.data?.estimatedProcessingTime || 'instante a 24h úteis'}.`);
            setPendingAction(null);
            try { const w = await walletService.getWallet(1,1); setWalletBalance(w?.data?.balance ?? null); } catch {}
          } else {
            await reply(resp?.message || 'Não consegui solicitar o saque.');
            setPendingAction(null);
          }
        } finally {
          setBusy(false);
        }
        return;
      }
      if (pendingAction.type === 'bindPixKey') {
        const t = pendingAction.pixKeyType || entities.pixKeyType;
        const k = pendingAction.pixKey || entities.pixKey;
        if (!t || !k) {
          await reply('Envie sua chave como: "PIX CPF 12345678901" ou "PIX CNPJ 12345678000190".');
          setPendingAction({ ...pendingAction });
          return;
        }
        try {
          setBusy(true);
          const r = await walletService.bindPixKey(k, t);
          if (r?.success) {
            await reply('Chave PIX vinculada com sucesso!');
            setPixInfo(r?.data || null);
            setPendingAction(null);
          } else {
            await reply(r?.message || 'Não foi possível vincular a chave PIX.');
          }
        } finally {
          setBusy(false);
        }
        return;
      }
      if (pendingAction.type === 'shipOrder' || pendingAction.type === 'confirmDelivery' || pendingAction.type === 'cancelOrder') {
        const ordNum = entities.orderNumber || pendingAction.orderNumber;
        let pid = entities.purchaseId || pendingAction.purchaseId;
        
        if (!pid && ordNum) {
          const pool = pendingAction.type === 'shipOrder' ? mySales : myPurchases;
          const found = pool.find(o => String(o.orderNumber) === String(ordNum));
          if (found) pid = found._id;
        }
        if (!pid) {
          await reply('Informe o número do pedido (ex: #12345) ou o ID da compra para continuar.');
          setPendingAction({ ...pendingAction });
          return;
        }
        try {
          setBusy(true);
          if (pendingAction.type === 'shipOrder') {
            const r = await purchaseService.ship(pid);
            await reply(r?.message || (r?.success ? 'Envio marcado com sucesso.' : 'Não foi possível marcar envio.'));
          } else if (pendingAction.type === 'confirmDelivery') {
            const r = await purchaseService.confirm(pid);
            await reply(r?.message || (r?.success ? 'Recebimento confirmado.' : 'Não foi possível confirmar o recebimento.'));
          } else {
            const r = await purchaseService.cancel(pid);
            await reply(r?.message || (r?.success ? 'Pedido cancelado.' : 'Não foi possível cancelar o pedido.'));
          }
        } finally {
          setBusy(false);
          setPendingAction(null);
        }
        return;
      }
    }

    
    if (role === 'buyer' && (lower.includes('pedido não recebido') || lower.includes('nao recebido') || lower.includes('não recebido') || normalizeText(lower).includes('pedido nao recebido'))) {
      
      if (entities.purchaseId) {
        setPendingAction({ type: 'openTicket', issueType: 'service_not_delivered', purchaseId: entities.purchaseId, description: raw, confirmRequired: true });
        await reply('Posso abrir um ticket de "pedido não recebido" para essa compra. Confirmo? Envie "sim" para prosseguir.');
      } else {
        setPendingAction({ type: 'openTicket', issueType: 'service_not_delivered' });
        await reply('Para prosseguir, me envie o ID da compra (24 caracteres).');
      }
      return;
    }

    if (role === 'buyer' && lower.match(/^[a-f0-9]{16,}$/)) {
      
      const purchaseId = raw.trim();
      await reply('Deseja incluir uma breve descrição do problema? Se sim, digite agora. Caso contrário, envie em branco.');
      
      (window as any).__sw_candidate = { purchaseId };
      return;
    }

    if ((window as any).__sw_candidate && typeof (window as any).__sw_candidate.purchaseId === 'string') {
      
      try {
        setBusy(true);
        const { purchaseId } = (window as any).__sw_candidate;
        const description = raw.trim();
        const issueType: IssueType = 'service_not_delivered';
        const res = await supportService.openTicket(
          purchaseId,
          { description, issueType },
          { fingerprint: fingerprintRef.current?.fingerprint, components: fingerprintRef.current?.components }
        );
        if (res?.success) {
          await reply('Ticket criado com sucesso! Você pode acompanhá-lo na aba Tickets.');
          setActiveTab('tickets');
          loadTickets();
        } else {
          await reply(res?.message || 'Não foi possível abrir o ticket. Verifique o ID da compra e tente novamente.');
        }
      } finally {
        (window as any).__sw_candidate = null;
        setBusy(false);
      }
      return;
    }

    
    if (lower.includes('meus tickets') || lower === 'tickets' || lower.includes('abrir tickets')) {
      setActiveTab('tickets');
      await reply('Abrindo seus tickets...');
      return;
    }

    
    const matchOrder = lower.match(/(acompanhar|ver|status).*?(pedido|venda)\s*#?(\d+)/);
    if (matchOrder) {
      await reply('Abrindo pedidos em aberto para acompanhamento...');
      try {
        const glb: any = window as any;
        if (typeof glb.__appNavigate === 'function') {
          glb.__appNavigate('/open-orders');
        } else {
          window.location.assign('/open-orders');
        }
      } catch {
        try { window.location.assign('/open-orders'); } catch {}
      }
      return;
    }

    
    const intent = intentFrom(raw);

    if (intent === 'tickets') {
      setActiveTab('tickets');
      await reply('Abrindo seus tickets...');
      return;
    }

    
    const navigateTo = async (path: string, message: string) => {
      try {
        await reply(message);
        
        const glb: any = window as any;
        if (typeof glb.__appNavigate === 'function') {
          glb.__appNavigate(path);
        } else {
          window.location.assign(path);
        }
      } catch {
        try { window.location.assign(path); } catch {}
      }
    };
    if (intent === 'navigate_wallet') { await navigateTo('/wallet', 'Abrindo sua carteira...'); return; }
    if (intent === 'navigate_open_orders') { await navigateTo('/open-orders', 'Abrindo pedidos em aberto...'); return; }
    if (intent === 'navigate_purchases') { await navigateTo('/purchases', 'Abrindo suas compras...'); return; }
    if (intent === 'navigate_sales') { await navigateTo('/sales', 'Abrindo suas vendas...'); return; }
    if (intent === 'navigate_messages') { await navigateTo('/messages', 'Abrindo suas mensagens...'); return; }
    if (intent === 'navigate_marketplace') { await navigateTo('/marketplace', 'Abrindo o marketplace...'); return; }
    if (intent === 'navigate_home') { await navigateTo('/', 'Indo para a página inicial...'); return; }

    if (intent === 'wallet_balance') {
      try {
        setBusy(true);
        const w = await walletService.getWallet(1, 1);
        const bal = Number(w?.data?.balance ?? 0);
        setWalletBalance(bal);
        await reply(`Seu saldo atual é ${formatCurrency(bal)}.`);
      } finally { setBusy(false); }
      return;
    }

    if (intent === 'pix_key') {
      try {
        setBusy(true);
        const k = await walletService.getPixKey();
        if (k?.success && k?.data) {
          const t = k.data.type || 'CPF';
          const masked = k.data.keyMasked || '(não vinculada)';
          const lock = k.data.locked ? ' (bloqueada)' : '';
          setPixInfo(k.data);
          await reply(`Chave PIX: ${String(t)} ${masked}${lock}.`);
        } else {
          await reply('Nenhuma chave PIX vinculada. Posso vincular uma agora. Envie: "PIX CPF 12345678901".');
          setPendingAction({ type: 'bindPixKey' });
        }
      } finally { setBusy(false); }
      return;
    }

    if (intent === 'bind_pix') {
      
      if (pixInfo?.type) {
        await reply(`Você já possui uma chave PIX vinculada (${pixInfo.type} ${pixInfo.keyMasked || ''}${pixInfo.locked ? ' - bloqueada' : ''}).`);
        return;
      }
      const t = entities.pixKeyType;
      const k = entities.pixKey;
      if (!t || !k) {
        setPendingAction({ type: 'bindPixKey' });
        await reply('Para vincular, envie: "PIX CPF 12345678901" ou "PIX CNPJ 12345678000190".');
        return;
      }
      try {
        setBusy(true);
        const r = await walletService.bindPixKey(k, t);
        if (r?.success) {
          setPixInfo(r?.data || null);
          await reply('Chave PIX vinculada com sucesso!');
        } else {
          await reply(r?.message || 'Não foi possível vincular a chave PIX.');
        }
      } finally { setBusy(false); }
      return;
    }

    if (intent === 'withdraw') {
      const amt = entities.amount;
      if (!amt || !(amt > 0)) {
        setPendingAction({ type: 'withdraw' });
        await reply('Qual valor você deseja sacar? Ex: R$ 50,00');
        return;
      }
      
      let useKeyType: 'cpf' | 'cnpj' | undefined = entities.pixKeyType;
      let useKey: string | undefined = entities.pixKey;
      
      if (pixInfo?.type) {
        useKeyType = (String(pixInfo.type).toUpperCase() === 'CNPJ') ? 'cnpj' : 'cpf';
        useKey = undefined; 
      }
      if (!useKeyType && !pixInfo?.type) {
        setPendingAction({ type: 'withdraw', amount: amt });
        await reply('Para sacar, preciso da sua chave PIX. Envie algo como: "PIX CPF 12345678901".');
        return;
      }
      try {
        setBusy(true);
        const resp = await walletService.withdraw(amt, { pixKeyType: (useKeyType as any), pixKey: useKey }, { idempotencyKey: `wd_${Date.now()}` });
        if (resp?.success) {
          await reply(`Saque solicitado de ${formatCurrency(amt)}. ${resp?.message || ''}`.trim());
          try { const w = await walletService.getWallet(1,1); setWalletBalance(w?.data?.balance ?? null); } catch {}
        } else {
          await reply(resp?.message || 'Não foi possível solicitar o saque.');
        }
      } finally { setBusy(false); }
      return;
    }

    if (intent === 'ship_order') {
      setPendingAction({ type: 'shipOrder', orderNumber: entities.orderNumber, purchaseId: entities.purchaseId });
      await reply('Ok! Me informe o número do pedido (ex: #12345) ou o ID da compra para marcar como enviado.');
      return;
    }

    if (intent === 'confirm_delivery') {
      setPendingAction({ type: 'confirmDelivery', orderNumber: entities.orderNumber, purchaseId: entities.purchaseId });
      await reply('Certo! Envie o número do pedido (ex: #12345) ou o ID da compra para confirmar o recebimento.');
      return;
    }

    if (intent === 'track_order') {
      await reply('Abrindo pedidos em aberto para acompanhamento...');
      try {
        const glb: any = window as any;
        if (typeof glb.__appNavigate === 'function') {
          glb.__appNavigate('/open-orders');
        } else {
          window.location.assign('/open-orders');
        }
      } catch {
        try { window.location.assign('/open-orders'); } catch {}
      }
      return;
    }

    if (intent === 'not_received') {
      setPendingAction({ type: 'openTicket', issueType: 'service_not_delivered', purchaseId: entities.purchaseId, description: raw, confirmRequired: !!entities.purchaseId });
      await reply(entities.purchaseId ? 'Ok! Posso abrir o ticket com esse ID. Confirma?' : 'Certo, para abrir o ticket me envie o ID da compra.');
      return;
    }

    if (intent === 'payment_issues') {
      setPendingAction({ type: 'openTicket', issueType: 'payment_issues', purchaseId: entities.purchaseId, description: raw });
      await reply('Entendi um possível problema de pagamento. Me envie o ID da compra para verificar e abrir um ticket se necessário.');
      return;
    }

    if (intent === 'refund') {
      setPendingAction({ type: 'openTicket', issueType: 'other', purchaseId: entities.purchaseId, description: raw });
      await reply('Posso registrar uma solicitação de reembolso. Envie o ID da compra e um breve motivo.');
      return;
    }

    if (intent === 'dispute') {
      setPendingAction({ type: 'openTicket', issueType: 'other', purchaseId: entities.purchaseId, description: raw });
      await reply('Certo! Para abrir uma disputa, me envie o ID da compra e um breve resumo.');
      return;
    }

    if (intent === 'cancel_order') {
      setPendingAction({ type: 'cancelOrder', orderNumber: entities.orderNumber, purchaseId: entities.purchaseId });
      await reply('Para cancelar, me informe o número do pedido (ex: #12345) ou o ID da compra.');
      return;
    }

    if (lower.includes('suporte geral') || lower.includes('dúvidas') || lower.includes('duvidas') || lower.includes('ajuda')) {
      const tip = role === 'buyer' ? 'Se seu pedido não chegou, posso abrir um ticket e notificar o vendedor.' : 'Se houve disputa em uma venda, posso orientar os próximos passos.';
      
      setPendingAction({ type: 'openTicket', issueType: 'other' });
      await reply(`Claro! Descreva seu problema com alguns detalhes e nossa equipe irá orientar ou abrir um ticket conforme necessário. ${tip}`);
      return;
    }

    if (role === 'seller' && (lower.includes('disputa') || lower.includes('ticket'))) {
      await reply('Para registrar um ticket relacionado a uma venda, informe o ID da compra e uma breve descrição do problema.');
      return;
    }

    
    const hint = tickets.length > 0 ? `Você possui ${tickets.length} ticket(s).` : 'Você ainda não possui tickets.';
    await reply(`Obrigado pela mensagem! Estou aqui para ajudar. ${hint} Você também pode alternar para a aba Tickets para acompanhar seus atendimentos.`);
  };

  

  const openTicketDetail = async (id: string) => {
    
    if (selectedTicketId === id) {
      setSelectedTicketId(null);
      setTicketDetail(null);
      return;
    }
    try {
      setSelectedTicketId(id);
      selectedIdRef.current = id;
      setTicketDetailLoading(true);
      
      const cached = detailCacheRef.current.get(id);
      if (cached) setTicketDetail(cached);
      
      requestAnimationFrame(() => {
        const el = ticketRowRefs.current[id];
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      const res = await supportService.getTicket(id);
      if (res?.success && res.data) {
        
        detailCacheRef.current.set(id, res.data);
        if (selectedIdRef.current === id) setTicketDetail(res.data);
      }
    } finally {
      setTicketDetailLoading(false);
    }
  };

  
  const lastMsg = assistantMessages[assistantMessages.length - 1] || null;
  const pa = pendingAction
    ? ({
        type: pendingAction.type as any,
        confirmRequired: (pendingAction as any).confirmRequired,
        orderNumber: (pendingAction as any).orderNumber,
        purchaseId: (pendingAction as any).purchaseId,
        amount: (pendingAction as any).amount
      } as any)
    : null;
  const suggestions = computeSmartSuggestions({
    role,
    myPurchases,
    mySales,
    walletBalance,
    pixInfo,
    lastFrom: lastMsg?.from,
    lastText: lastMsg?.text,
    activeTab,
    pendingAction: pa
  });

  
  const aiSuggestedChips = Array.from(new Set((aiActions || []).map(a => a.label).filter(Boolean) as string[]));
  const mergedChips = Array.from(new Set([...(suggestions || []), ...aiSuggestedChips])).slice(0, 10);

  return (
    <>
      {/* Trigger invisível para QuickActionMenu */}
      <button
        data-support-widget-trigger="true"
        onClick={() => setOpen(true)}
        className="hidden"
        aria-hidden="true"
      />

      {}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed inset-0 z-[9999] flex ${isMobileDevice ? 'items-end' : 'items-stretch justify-end'}`}
          >
            {}
            <motion.div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {}
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={isMobileDevice ? "y" : false}
              dragElastic={0.15}
              dragConstraints={isMobileDevice ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="supportWidgetTitle"
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              className={`
                relative flex flex-col overflow-hidden
                ${isMobileDevice 
                  ? 'w-full h-[95vh] rounded-t-3xl border-t' 
                  : `${drawerWidthClasses()} h-full border-l rounded-none`
                }
                bg-gray-900/98 backdrop-blur-xl border-white/10
                ${isMobileDevice ? 'shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)]' : 'shadow-[-20px_0_60px_-10px_rgba(0,0,0,0.6)]'}
              `}
            >
              {}
              {isMobileDevice && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-12 h-1.5 rounded-full bg-gray-500/60" />
                </div>
              )}

              {}
              <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-gray-800/60 bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-400/20 flex-shrink-0">
                    <Bot className="w-5 h-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 id="supportWidgetTitle" className="text-white font-bold text-sm sm:text-base truncate">Central de Suporte</h3>
                    <p className="text-[10px] sm:text-xs text-purple-200/60 truncate">Estamos aqui para ajudar</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isMobileDevice && (
                    <button
                      onClick={() => setSizeMode(prev => prev === 'expanded' ? 'comfortable' : prev === 'comfortable' ? 'compact' : 'expanded')}
                      className="p-2 rounded-lg hover:bg-gray-700/60 text-gray-300 transition-colors"
                      title={sizeMode === 'expanded' ? 'Reduzir' : 'Expandir'}
                    >
                      {sizeMode === 'expanded' ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-700/60 text-gray-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {}
              <div className="flex-1 flex flex-col min-h-0">
                {}
                <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ overflowAnchor: 'none' as any }}>
                  {}
                  <div className="mb-3 p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-transparent border border-purple-400/20 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {(user?.name || 'V')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-purple-200 font-medium">Olá, {user?.name || 'Visitante'}! 👋</div>
                        <div className="text-lg font-bold text-white -mt-0.5">Como podemos ajudar?</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-300 space-y-1.5 bg-black/20 rounded-lg p-2 border border-white/5">
                      {walletBalance != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Saldo:</span>
                          <span className="font-semibold text-green-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(walletBalance)}</span>
                        </div>
                      )}
                      {pixInfo && pixInfo.type && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">PIX:</span>
                          <span className="font-mono text-purple-300">{pixInfo.type} {maskPIXKey(pixInfo.keyMasked || '', pixInfo.type)}{pixInfo.locked ? ' 🔒' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeTab === 'assistant' && (
                    <div className="space-y-3">
                      {}
                      <div className="space-y-2" style={{ overflowAnchor: 'none' as any }}>
                        <AnimatePresence initial={false}>
                          {assistantMessages.map((m, i) => (
                            <motion.div
                              key={`${m.from}-${i}-${m.text.slice(0,8)}`}
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] as any }}
                              className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`${
                                m.from === 'me' 
                                  ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-900/30' 
                                  : 'bg-gray-800/90 text-gray-100 border border-gray-700/50 shadow-md'
                              } px-4 py-2.5 rounded-2xl max-w-[85%] whitespace-pre-line backdrop-blur-sm`}>
                                {sanitizeInput(m.text, 1000)}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {activeTab === 'contact' && (
                    <div className="space-y-3">
                      {}
                      <a
                        href="https://wa.me/5511921122881"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Phone className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-base">WhatsApp</h3>
                          <p className="text-gray-400 text-sm mt-0.5">Via WhatsApp</p>
                        </div>
                      </a>

                      {}
                      <a
                        href="https://www.instagram.com/zenithgg.suporte"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:from-purple-500/15 hover:to-pink-500/15 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Instagram className="w-6 h-6 text-pink-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-base">Instagram</h3>
                          <p className="text-gray-400 text-sm mt-0.5">Siga nossa página no Instagram</p>
                        </div>
                      </a>

                      {}
                      <a
                        href="mailto:contato.zenithgg@gmail.com"
                        className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mail className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-base">Email</h3>
                          <p className="text-gray-400 text-sm mt-0.5">contato.zenithgg@gmail.com</p>
                        </div>
                      </a>

                      {}
                      <div className="pt-2 text-center">
                        <p className="text-gray-400 text-xs">Responderemos o mais breve possível</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'tickets' && (
                    <div className="space-y-3">
                      {ticketsLoading && (
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-3 rounded-lg bg-gray-800/80 border border-gray-700 animate-pulse">
                              <div className="h-4 w-40 bg-gray-700/70 rounded" />
                              <div className="mt-2 h-3 w-24 bg-gray-700/70 rounded" />
                            </div>
                          ))}
                        </div>
                      )}

                      {!ticketsLoading && tickets.length === 0 && (
                        <div className="text-sm text-gray-400">Nenhum ticket encontrado.</div>
                      )}

                      {!ticketsLoading && tickets.length > 0 && (
                        <motion.div layout className="space-y-2">
                          {tickets.map(t => (
                            <motion.div
                              key={t._id}
                              layout
                              ref={(el) => { ticketRowRefs.current[t._id] = el; }}
                              className="rounded-lg border border-gray-700 overflow-hidden bg-gray-800/90"
                            >
                              <motion.button
                                layout
                                whileHover={{ y: -2 }}
                                onClick={() => openTicketDetail(t._id)}
                                className="w-full text-left p-3 hover:bg-gray-700/70 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm text-gray-200">{translateReason(t.reason)}</span>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'resolved' ? 'bg-green-600/30 text-green-300' : t.status === 'under_review' || t.status === 'in_review' ? 'bg-yellow-600/30 text-yellow-200' : 'bg-gray-600/30 text-gray-200'}`}>{translateStatus(t.status)}</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-400">{translateType(t.type)} • {formatDate(t.createdAt)}</div>
                              </motion.button>

                              <AnimatePresence initial={false}>
                                {selectedTicketId === t._id && (
                                  <motion.div
                                    key={`${t._id}-detail`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] as any }}
                                    className="border-t border-gray-700 bg-gray-900/80"
                                  >
                                    <div className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <ArrowLeft className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => { setSelectedTicketId(null); setTicketDetail(null); }} />
                                          <h4 className="text-white text-sm font-semibold">Ticket</h4>
                                        </div>
                                        {ticketDetailLoading && <span className="text-xs text-gray-400">Carregando...</span>}
                                      </div>
                                      {ticketDetailLoading && (
                                        <div className="space-y-2 animate-pulse">
                                          <div className="h-4 w-48 bg-gray-800 rounded" />
                                          <div className="h-3 w-72 bg-gray-800 rounded" />
                                          <div className="h-24 w-full bg-gray-800 rounded" />
                                        </div>
                                      )}
                                      {ticketDetail && !ticketDetailLoading && (
                                        <div className="space-y-2">
                                          <div className="text-sm text-gray-200">{translateReason(ticketDetail.report?.reason)} <span className="text-xs text-gray-400">({translateStatus(ticketDetail.report?.status)})</span></div>
                                          <div className="text-xs text-gray-400">{ticketDetail.report?.description}</div>
                                          <div className="pt-2">
                                            <div className="text-xs text-gray-400 mb-1">Últimas mensagens:</div>
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                              {ticketDetail.messages.map((m) => (
                                                <div key={m._id} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-200">
                                                  <span className="text-gray-400">{formatDate(m.createdAt)} · </span>
                                                  <span>{m.content}</span>
                                                </div>
                                              ))}
                                              {ticketDetail.messages.length === 0 && (
                                                <div className="text-xs text-gray-500">Sem mensagens recentes nesta conversa.</div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {}
                {activeTab === 'assistant' && (
                  <div className="border-t border-gray-800/60 bg-gray-900/80 px-3 py-2 shrink-0">
                    {busy && (
                      <div className="text-xs text-gray-400 mb-1">Processando...</div>
                    )}
                    <div className="sr-only" aria-live="polite">{assistantMessages[assistantMessages.length - 1]?.text || ''}</div>
                    <div className="flex flex-wrap gap-2">
                      {mergedChips.map((s: string, idx: number) => (
                        <button key={idx} className={chip} onClick={() => sendQuick(s)}>{s}</button>
                      ))}
                    </div>
                    {pendingAction && (
                    <div className="mt-2 p-3 rounded-lg border border-gray-700 bg-gray-900/70 space-y-2 max-h-40 overflow-y-auto">
                        {}
                        {pendingAction.type === 'openTicket' && (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-200">Abrir Ticket de Suporte</div>
                            <div className="flex items-center gap-2">
                              <input
                                className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                placeholder="ID da compra (24 caracteres)"
                                maxLength={24}
                                pattern="[a-f0-9]{24}"
                                value={pendingAction.purchaseId || ''}
                                onChange={(e) => setPendingAction(prev => (prev && prev.type === 'openTicket') ? { ...prev, purchaseId: sanitizeInput(e.target.value.trim(), 24) } : prev)}
                              />
                              <button className={chip} onClick={() => sendQuick('Abrir Pedidos em Aberto')}>Abrir Pedidos em Aberto</button>
                            </div>
                            <textarea
                              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
                              rows={2}
                              maxLength={500}
                              placeholder="Descreva seu problema... (máx. 500 caracteres)"
                              ref={generalDescRef}
                              value={pendingAction.description || ''}
                              onChange={(e) => setPendingAction(prev => (prev && prev.type === 'openTicket') ? { ...prev, description: sanitizeInput(e.target.value, 500) } : prev)}
                            />
                            <div className="text-xs text-gray-500 text-right">{(pendingAction.description || '').length}/500</div>
                            <div className="flex items-center gap-2">
                              <button
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={busy || !pendingAction.purchaseId || pendingAction.purchaseId.length !== 24}
                                onClick={async () => {
                                  const pid = pendingAction.purchaseId?.trim();
                                  if (!pid || pid.length < 24) { sendBot('Informe o ID da compra (24 caracteres).'); return; }
                                  try {
                                    setBusy(true);
                                    const res = await supportService.openTicket(
                                      pid,
                                      { description: pendingAction.description || '', issueType: pendingAction.issueType },
                                      { fingerprint: fingerprintRef.current?.fingerprint, components: fingerprintRef.current?.components }
                                    );
                                    if (res?.success) {
                                      sendBot('Ticket criado com sucesso! Você pode acompanhá-lo na aba Tickets.');
                                      setActiveTab('tickets');
                                      loadTickets();
                                      setPendingAction(null);
                                    } else {
                                      sendBot(res?.message || 'Não foi possível abrir o ticket. Verifique os dados e tente novamente.');
                                    }
                                  } finally { setBusy(false); }
                                }}
                              >Abrir Ticket</button>
                              <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600 transition-all" onClick={() => setPendingAction(null)}>Cancelar</button>
                            </div>
                          </div>
                        )}
                        {}
                        {pendingAction.type === 'bindPixKey' && (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-200">Vincular chave PIX</div>
                            {pixInfo?.type ? (
                              <div className="space-y-2">
                                <div className="text-xs text-gray-300">Você já possui uma chave vinculada: {pixInfo.type} {pixInfo.keyMasked || ''}{pixInfo.locked ? ' (bloqueada)' : ''}.</div>
                                <div className="flex items-center gap-2">
                                  <button className="px-3 py-1 rounded bg-gray-700 text-gray-100 text-sm hover:bg-gray-600" onClick={() => setPendingAction(null)}>Fechar</button>
                                  <button className={chip} onClick={() => sendQuick('Abrir Carteira')}>Gerenciar na Carteira</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1"
                                  value={pendingAction.pixKeyType || ''}
                                  onChange={(e) => setPendingAction(prev => (prev && prev.type === 'bindPixKey') ? { ...prev, pixKeyType: (e.target.value as 'cpf'|'cnpj') } : prev)}
                                >
                                  <option value="">Tipo</option>
                                  <option value="cpf">CPF</option>
                                  <option value="cnpj">CNPJ</option>
                                </select>
                                <input
                                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                  placeholder={pendingAction.pixKeyType === 'cpf' ? '00000000000 (11 dígitos)' : pendingAction.pixKeyType === 'cnpj' ? '00000000000000 (14 dígitos)' : 'Dígitos da chave'}
                                  maxLength={pendingAction.pixKeyType === 'cpf' ? 11 : pendingAction.pixKeyType === 'cnpj' ? 14 : 14}
                                  value={pendingAction.pixKey || ''}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g,'');
                                    const isValid = pendingAction.pixKeyType === 'cpf' ? validateCPF(digits) || digits.length <= 11 : pendingAction.pixKeyType === 'cnpj' ? validateCNPJ(digits) || digits.length <= 14 : true;
                                    if (isValid) setPendingAction(prev => (prev && prev.type === 'bindPixKey') ? { ...prev, pixKey: digits } : prev);
                                  }}
                                />
                                <button
                                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={busy || !pendingAction.pixKeyType || !pendingAction.pixKey || 
                                    (pendingAction.pixKeyType === 'cpf' && !validateCPF(pendingAction.pixKey || '')) ||
                                    (pendingAction.pixKeyType === 'cnpj' && !validateCNPJ(pendingAction.pixKey || ''))}
                                  onClick={async () => {
                                    if (!pendingAction.pixKeyType || !pendingAction.pixKey) { sendBot('Informe tipo e dígitos da chave válidos.'); return; }
                                    if (pendingAction.pixKeyType === 'cpf' && !validateCPF(pendingAction.pixKey)) { sendBot('CPF inválido. Deve conter 11 dígitos.'); return; }
                                    if (pendingAction.pixKeyType === 'cnpj' && !validateCNPJ(pendingAction.pixKey)) { sendBot('CNPJ inválido. Deve conter 14 dígitos.'); return; }
                                    try {
                                      setBusy(true);
                                      const r = await walletService.bindPixKey(pendingAction.pixKey, pendingAction.pixKeyType);
                                      if (r?.success) {
                                        setPixInfo(r?.data || null);
                                        sendBot('Chave PIX vinculada com sucesso!');
                                        setPendingAction(null);
                                      } else {
                                        sendBot(r?.message || 'Não foi possível vincular a chave PIX.');
                                      }
                                    } finally { setBusy(false); }
                                  }}
                                >Vincular</button>
                                <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600 transition-all" onClick={() => setPendingAction(null)}>Cancelar</button>
                              </div>
                            )}
                          </div>
                        )}

                        {}
                        {pendingAction.type === 'withdraw' && (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-200">Solicitar saque</div>
                            <div className="flex flex-wrap gap-2">
                              {([25,50,100,200] as number[]).map((v) => (
                                <button key={v} className={chip} onClick={() => setPendingAction(prev => (prev && prev.type === 'withdraw') ? { ...prev, amount: v } : prev)}>R$ {v}</button>
                              ))}
                              {typeof walletBalance === 'number' && walletBalance > 0 && (
                                <button className={chip} onClick={() => setPendingAction(prev => (prev && prev.type === 'withdraw') ? { ...prev, amount: Math.floor(walletBalance) } : prev)}>Usar saldo ({new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(walletBalance)})</button>
                              )}
                            </div>
                            {pixInfo && pixInfo.type ? (
                              <div className="flex items-center gap-2 text-xs text-gray-300">
                                <span>Usando chave vinculada: {pixInfo.type} {pixInfo.keyMasked || ''}{pixInfo.locked ? ' (bloqueada)' : ''}</span>
                                <button className={chip} onClick={() => sendQuick('Abrir Carteira')}>Gerenciar na Carteira</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1"
                                  value={pendingAction.pixKeyType || ''}
                                  onChange={(e) => setPendingAction(prev => (prev && prev.type === 'withdraw') ? { ...prev, pixKeyType: (e.target.value as 'cpf'|'cnpj') } : prev)}
                                >
                                  <option value="">Tipo de chave</option>
                                  <option value="cpf">CPF</option>
                                  <option value="cnpj">CNPJ</option>
                                </select>
                                <input
                                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                  placeholder={pendingAction.pixKeyType === 'cpf' ? '00000000000 (11 dígitos)' : pendingAction.pixKeyType === 'cnpj' ? '00000000000000 (14 dígitos)' : 'Dígitos da chave PIX'}
                                  maxLength={pendingAction.pixKeyType === 'cpf' ? 11 : pendingAction.pixKeyType === 'cnpj' ? 14 : 14}
                                  value={pendingAction.pixKey || ''}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g,'');
                                    setPendingAction(prev => (prev && prev.type === 'withdraw') ? { ...prev, pixKey: digits } : prev);
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={busy || !pendingAction.amount || !validateAmount(pendingAction.amount) || 
                                  (!pixInfo?.type && (!pendingAction.pixKeyType || !pendingAction.pixKey))}
                                onClick={async () => {
                                  const amt = pendingAction.amount;
                                  const t = pendingAction.pixKeyType;
                                  const k = pixInfo?.type ? undefined : pendingAction.pixKey;
                                  if (!amt || !validateAmount(amt)) { sendBot('Valor inválido. Mínimo R$ 0,01, máximo R$ 100.000,00.'); return; }
                                  if (!pixInfo?.type && !t) { sendBot('Selecione o tipo de chave.'); return; }
                                  if (!pixInfo?.type && t === 'cpf' && !validateCPF(k || '')) { sendBot('CPF inválido.'); return; }
                                  if (!pixInfo?.type && t === 'cnpj' && !validateCNPJ(k || '')) { sendBot('CNPJ inválido.'); return; }
                                  try {
                                    setBusy(true);
                                    const resp = await walletService.withdraw(amt, { pixKeyType: (pixInfo?.type ? (String(pixInfo.type).toUpperCase()==='CNPJ'?'cnpj':'cpf') : t), pixKey: k || '' }, { idempotencyKey: `wd_${Date.now()}` });
                                    if (resp?.success) {
                                      sendBot(`Saque solicitado de ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amt)}.`);
                                      try { const w = await walletService.getWallet(1,1); setWalletBalance(w?.data?.balance ?? null); } catch {}
                                      setPendingAction(null);
                                    } else {
                                      sendBot(resp?.message || 'Não foi possível solicitar o saque.');
                                    }
                                  } finally { setBusy(false); }
                                }}
                              >Confirmar saque</button>
                              <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600 transition-all" onClick={() => setPendingAction(null)}>Cancelar</button>
                            </div>
                          </div>
                        )}

                        {}
                        {(pendingAction.type === 'shipOrder' || pendingAction.type === 'confirmDelivery' || pendingAction.type === 'cancelOrder') && (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-200">
                              {pendingAction.type === 'shipOrder' && 'Selecione a venda para marcar envio:'}
                              {pendingAction.type === 'confirmDelivery' && 'Selecione o pedido para confirmar recebimento:'}
                              {pendingAction.type === 'cancelOrder' && 'Selecione o pedido para cancelar:'}
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {(pendingAction.type === 'shipOrder' ? mySales : myPurchases).map((o: any) => (
                                <div key={o._id} className="flex items-center justify-between p-2 rounded bg-gray-800 border border-gray-700">
                                  <div className="text-xs text-gray-200">#{o.orderNumber} — {o.item?.title || 'Item'} <span className="text-gray-400">({o.status})</span></div>
                                  <div className="flex items-center gap-2">
                                    <button className={chip} onClick={async () => {
                                      try {
                                        setBusy(true);
                                        if (pendingAction.type === 'shipOrder') {
                                          const r = await purchaseService.ship(o._id);
                                          sendBot(r?.message || (r?.success ? 'Envio marcado com sucesso.' : 'Falha ao marcar envio.'));
                                        } else if (pendingAction.type === 'confirmDelivery') {
                                          const r = await purchaseService.confirm(o._id);
                                          sendBot(r?.message || (r?.success ? 'Recebimento confirmado.' : 'Falha ao confirmar.'));
                                        } else {
                                          const r = await purchaseService.cancel(o._id);
                                          sendBot(r?.message || (r?.success ? 'Pedido cancelado.' : 'Falha ao cancelar.'));
                                        }
                                      } finally {
                                        setBusy(false);
                                        setPendingAction(null);
                                      }
                                    }}>Selecionar</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-400">Se não encontrar o pedido, abra "Pedidos em Aberto" para ver todos.</div>
                            <div className="flex items-center gap-2">
                              <button className={chip} onClick={() => sendQuick('Abrir Pedidos em Aberto')}>Abrir Pedidos em Aberto</button>
                              <button className="px-3 py-1 rounded bg-gray-700 text-gray-100 text-sm hover:bg-gray-600" onClick={() => setPendingAction(null)}>Fechar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {}

              {}
              <div className="border-t border-gray-800/60 bg-gray-900/90 px-4 py-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    className={`flex flex-col items-center gap-1 py-1 rounded ${activeTab === 'assistant' ? 'text-purple-400' : 'text-gray-300 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('assistant')}
                  >
                    <Home className="w-4 h-4" />
                    Início
                  </button>
                  <button
                    className={`flex flex-col items-center gap-1 py-1 rounded ${activeTab === 'contact' ? 'text-purple-400' : 'text-gray-300 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('contact')}
                  >
                    <Phone className="w-4 h-4" />
                    Contato
                  </button>
                  <button
                    className={`flex flex-col items-center gap-1 py-1 rounded ${activeTab === 'tickets' ? 'text-purple-400' : 'text-gray-300 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('tickets')}
                  >
                    <MessageSquareText className="w-4 h-4" />
                    Ticket
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportWidget;
