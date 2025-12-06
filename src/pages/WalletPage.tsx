import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowDown, ArrowUp, RefreshCw, DollarSign, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { walletService } from '../services';
import type { Transaction as WalletTx } from '../services/walletService';
import notificationWebSocketService from '../services/notificationWebSocketService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useWalletState } from '../hooks/useWalletEvents';


const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    balance,
    escrowBalance,
    updateBalance,
    setBalance: setWalletBalance,
    setEscrowBalance,
    availableBalance
  } = useWalletState(user?.id || '', {
    initialBalance: user?.balance || 0,
    initialEscrowBalance: user?.escrowBalance || 0
  });
  
  
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [pixKey, setPixKey] = useState<string>('');
  const [depositCpfCnpj, setDepositCpfCnpj] = useState<string>('');
  const [pixInstructions, setPixInstructions] = useState<{pixQrCode: string, pixCopyPaste: string} | null>(null);
  const [withdrawalPixKey, setWithdrawalPixKey] = useState<string>('');
  const [withdrawalPixKeyType, setWithdrawalPixKeyType] = useState<string>('cpf');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [totalsLoading, setTotalsLoading] = useState<boolean>(true);
  const [totalWithdrawn, setTotalWithdrawn] = useState<number>(0);
  const [recentTx, setRecentTx] = useState<WalletTx[]>([]);

  useEffect(() => {
    fetchWalletData();
  }, [refreshTrigger]);


  useEffect(() => {
    const handleWalletNotification = (payload: any) => {
      try {
        const n = payload?.notification || payload;
        const t = n?.type || n?.category;
        if (t === 'wallet_deposit' || t === 'wallet_withdraw' || t === 'wallet_withdrawal') {
          setRefreshTrigger(prev => prev + 1);
        }
      } catch {}
    };

    notificationWebSocketService.on('new_notification', handleWalletNotification);
    return () => {
      notificationWebSocketService.off('new_notification', handleWalletNotification);
    };
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await walletService.getWallet(1, 5);
      
      if (response.success && response.data) {
        updateBalance(response.data.balance);
        setRecentTx((response.data.transactions || []).slice(0, 3));
      } else {
        setError(response.message || 'Erro ao carregar dados da carteira');

        if (user) {
          setWalletBalance(user.balance || 0);
        }
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');

      if (user) {
        setWalletBalance(user.balance || 0);
      }
    } finally {
      setLoading(false);
    }
  };


  const fetchTotals = async () => {
    try {
      setTotalsLoading(true);
      
      
      const escrowRes = await walletService.getEscrowBalance();
      if (escrowRes.success && escrowRes.data) {
        setEscrowBalance(escrowRes.data.escrowBalance || 0);
      }
      
      
      let pageIdx = 1;
      const limit = 100;
      let pages = 1;
      let withdrawals = 0;
      const MAX_PAGES = 100;
      do {
        const res = await walletService.getWallet(pageIdx, limit);
        if (!res.success || !res.data) break;
        const txs = res.data.transactions || [];
        for (const t of txs) {
          if (t.status === 'completed') {
            if (t.type === 'withdrawal') withdrawals += Math.abs(t.amount || 0);
          }
        }
        pages = res.data.pagination?.pages ?? pageIdx;
        pageIdx++;
      } while (pageIdx <= pages && pageIdx <= MAX_PAGES);
      setTotalWithdrawn(withdrawals);
    } catch {

    } finally {
      setTotalsLoading(false);
    }
  };

  useEffect(() => {
    fetchTotals();
  }, [refreshTrigger]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Por favor, insira um valor válido');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const amount = parseFloat(depositAmount);
      const paymentDetails = { pixKey, cpfCnpj: depositCpfCnpj };

      const response = await walletService.deposit(amount, paymentMethod, paymentDetails);

      if (response.success && response.data) {

        const depositData = {
          transactionId: response.data.transaction._id,
          pixQrCode: response.data.paymentInstructions.pixQrCode,
          pixCopyPaste: response.data.paymentInstructions.pixCopyPaste,
          expirationDate: response.data.paymentInstructions.expirationDate,
          breakdown: response.data.breakdown
        } as any;

        try { localStorage.setItem('hacklote_wallet_deposit_session', JSON.stringify(depositData)); } catch {}


        setShowDepositModal(false);
        setPixInstructions(null);
        setDepositAmount('');
        setPixKey('');
        setDepositCpfCnpj('');

        navigate('/deposit/confirm', { state: { depositData } });

        setRefreshTrigger(prev => prev + 1);
      } else {
        setError(response.message || 'Erro ao processar depósito');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      if (pixInstructions?.pixCopyPaste) {
        await navigator.clipboard.writeText(pixInstructions.pixCopyPaste);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  const statusToPtBr = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pedding':
      case 'pending': return 'Pendente';
      case 'overdue': return 'Vencido';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Por favor, insira um valor válido');
      return;
    }

    if (parseFloat(withdrawAmount) > availableBalance) {
      setError('Saldo insuficiente');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const amount = parseFloat(withdrawAmount);
      const withdrawalDetails = {
        method: 'pix',
        pixKey: withdrawalPixKey,
        pixKeyType: withdrawalPixKeyType
      };

      const response = await walletService.withdraw(amount, withdrawalDetails);

      if (response.success && response.data) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawalPixKey('');

        setRefreshTrigger(prev => prev + 1);
      } else {
        setError(response.message || 'Erro ao processar saque');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Acesso negado</h2>
          <p className="text-gray-400">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Carteira</h1>
                <p className="text-sm text-gray-400">Gerencie seus fundos com segurança</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/deposit')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white transition-all text-sm font-medium shadow-lg shadow-purple-600/20"
              >
                <ArrowDown className="w-4 h-4" /> Depositar
              </button>
              <button
                onClick={() => navigate('/wallet/withdraw')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all text-sm font-medium"
              >
                <ArrowUp className="w-4 h-4" /> Sacar
              </button>
            </div>
          </div>
        </motion.div>

        {}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-700/10 border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-400">Saldo Atual</span>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(balance)}</p>
            <p className="text-xs text-gray-500 mt-1">Disponível para uso</p>
          </div>

          {}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-400">Saldo Bloqueado</span>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {totalsLoading ? (
                <span className="animate-pulse">—</span>
              ) : (
                formatCurrency(escrowBalance)
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor a receber</p>
          </div>

          {}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-400">Total Sacado</span>
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowUp className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {totalsLoading ? (
                <span className="animate-pulse">—</span>
              ) : (
                formatCurrency(totalWithdrawn)
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Saídas da carteira</p>
          </div>
        </motion.div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden p-6 bg-gray-800/60 border-gray-700/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold">Últimas transações</h2>
                <button onClick={() => navigate('/wallet/history')} className="text-sm text-purple-300 hover:text-white transition-colors">Ver tudo</button>
              </div>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : recentTx.length > 0 ? (
                <div className="space-y-3">
                  {recentTx.map((t) => {
                    const isWithdraw = t.type === 'withdrawal';
                    const s = (t.status || '').toLowerCase();
                    const isCompleted = s === 'completed';
                    const isFailed = s === 'failed';
                    const isPending = s === 'pending' || s === 'pedding';
                    const isCancelled = s === 'cancelled';

                    const containerTint = isCompleted
                      ? 'border-emerald-600/30'
                      : isFailed
                        ? 'border-red-600/30'
                        : isPending
                          ? 'border-yellow-600/30'
                          : isCancelled
                            ? 'border-gray-600/40'
                            : 'border-gray-600/40';

                    const iconWrap = isPending
                      ? 'bg-yellow-900/20 text-yellow-400'
                      : (t.type === 'deposit' || t.type === 'sale')
                        ? 'bg-emerald-900/20 text-emerald-400'
                        : 'bg-red-900/20 text-red-400';

                    const amountClass = isCompleted
                      ? (isWithdraw ? 'text-red-400' : 'text-emerald-400')
                      : isFailed
                        ? 'text-red-300 line-through opacity-70'
                        : isPending
                          ? (isWithdraw ? 'text-red-300' : 'text-emerald-300')
                          : (isWithdraw ? 'text-red-400' : 'text-emerald-400');

                    const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : isPending ? Clock : null;
                    const badgeClass = isCompleted
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : isFailed
                        ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                        : isPending
                          ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                          : isCancelled
                            ? 'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                            : 'bg-gray-500/10 text-gray-300 border border-gray-500/30';

                    return (
                      <motion.div key={t._id} whileHover={{ y: -2 }} className={`flex items-center justify-between p-4 bg-gray-700/40 rounded-xl border ${containerTint}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconWrap}`}>
                            {t.type === 'deposit' || t.type === 'sale' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium flex items-center gap-2">
                              {t.description}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                                {StatusIcon ? <StatusIcon className="w-3.5 h-3.5" /> : null}
                                {statusToPtBr(t.status)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('pt-BR')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${amountClass}`}>
                            {(t.type === 'deposit' || t.type === 'sale' ? '+' : '-')}
                            {formatCurrency(Math.abs(t.amount))}
                          </div>
                          {isFailed && (
                            <div className="text-[10px] text-red-300/80">Não debitado</div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">Nenhuma transação recente</div>
              )}
            </Card>
          </div>

          {}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Ações Rápidas</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/deposit')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white transition-all font-medium shadow-lg shadow-purple-600/20"
                >
                  <ArrowDown className="w-4 h-4" /> Depositar
                </button>
                <button
                  onClick={() => navigate('/wallet/withdraw')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all font-medium"
                >
                  <ArrowUp className="w-4 h-4" /> Sacar
                </button>
                
                <div className="border-t border-white/10 my-2"></div>
                
                <button 
                  onClick={() => navigate('/wallet/history')} 
                  className="text-sm text-purple-300 hover:text-white transition-colors text-left"
                >
                  Ver Histórico Completo
                </button>
                <button 
                  onClick={() => setRefreshTrigger((v) => v + 1)} 
                  className="text-sm inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Dados
                </button>
              </div>
            </div>
          </div>
        </div>

        {}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-900/20 border border-red-700/30 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400">Erro</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </motion.div>
        )}
      </div>

      {}
      <AnimatePresence>
      {showDepositModal && (
        <motion.div
          key="deposit-overlay"
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            key="deposit-modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden max-w-lg w-full rounded-2xl p-6 bg-purple-900/30 border border-purple-400/20 backdrop-blur-xl shadow-2xl"
          >
            {}
            <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-purple-600/30 via-fuchsia-500/25 to-indigo-500/20 blur-3xl"></div>
            <div className="pointer-events-none absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-violet-500/20 blur-3xl"></div>

            <h2 className="text-xl font-bold text-white mb-4">Depositar Fundos</h2>
            
            {pixInstructions ? (
              <div className="space-y-6">
                <div className="rounded-2xl p-5 bg-gradient-to-b from-purple-400/10 to-indigo-500/5 border border-purple-400/20 shadow-lg">
                  <h3 className="font-medium text-white mb-1">Instruções de Pagamento</h3>
                  <p className="text-gray-300/90 text-sm mb-5">Use as informações abaixo para completar seu depósito via PIX:</p>

                  <div className="space-y-5">
                    {}
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-gray-300/80 mb-2">QR Code PIX</p>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                        className="relative p-3 rounded-2xl bg-white/80 ring-1 ring-purple-500/10 shadow-2xl"
                      >
                        <img
                          src={pixInstructions.pixQrCode}
                          alt="QR Code PIX"
                          className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain"
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_10px_rgba(255,255,255,0.45)]"></div>
                      </motion.div>
                      <div className="flex gap-3 mt-3">
                        <a
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-white border border-purple-400/30 backdrop-blur transition"
                          href={pixInstructions.pixQrCode}
                          download="pix-qr.png"
                        >
                          Baixar QR
                        </a>
                      </div>
                    </div>

                    {}
                    <div>
                      <p className="text-sm text-gray-300/80 mb-2">Código PIX Copia e Cola</p>
                      <div className="relative">
                        <div className="bg-black/50 p-3 rounded-xl text-xs text-gray-200 break-all border border-purple-400/20">
                          {pixInstructions.pixCopyPaste}
                        </div>
                        <button
                          onClick={handleCopyPix}
                          className={`mt-2 text-xs px-3 py-1.5 rounded-md border transition backdrop-blur ${copied ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' : 'text-purple-300 border-purple-400/40 hover:bg-purple-500/10'}`}
                        >
                          {copied ? 'Copiado!' : 'Copiar código'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-gray-300/80 text-sm">
                  Após realizar o pagamento, o saldo será atualizado automaticamente.
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                      setShowDepositModal(false);
                      setPixInstructions(null);
                      setDepositAmount('');
                      setPixKey('');
                      setDepositCpfCnpj('');
                    }}
                    >
                      Fechar
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      variant="primary" 
                      onClick={() => {
                      setShowDepositModal(false);
                      setPixInstructions(null);
                      setDepositAmount('');
                      setPixKey('');
                      setDepositCpfCnpj('');
                      setRefreshTrigger(prev => prev + 1);
                    }}
                    >
                      Concluído
                    </Button>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor (R$)</label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="1"
                    step="0.01"
                  />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Método de Pagamento</label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="pix">PIX</option>
                  </select>
                </motion.div>
                
                {paymentMethod === 'pix' && (
                  <>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Sua Chave PIX (opcional)</label>
                      <Input
                        type="text"
                        placeholder="(11) 98765-4321"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Para identificação do pagamento</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">CPF/CNPJ (somente números)</label>
                      <Input
                        type="text"
                        placeholder="12345678909"
                        value={depositCpfCnpj}
                        onChange={(e) => setDepositCpfCnpj(e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Obrigatório em produção para emissão do PIX</p>
                    </motion.div>
                  </>
                )}
                
                <div className="flex justify-end gap-3 mt-4">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                      setShowDepositModal(false);
                      setDepositAmount('');
                      setPixKey('');
                      setDepositCpfCnpj('');
                    }}
                    >
                      Cancelar
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      variant="primary" 
                      onClick={handleDeposit}
                      disabled={isSubmitting || !depositAmount}
                    >
                      {isSubmitting ? 'Processando...' : 'Depositar'}
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-bold text-white mb-4">Sacar Fundos</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Valor (R$)</label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1"
                  max={balance.toString()}
                  step="0.01"
                />
                <p className="text-xs text-gray-400 mt-1">Saldo disponível: {formatCurrency(balance)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Chave PIX</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={withdrawalPixKeyType}
                  onChange={(e) => setWithdrawalPixKeyType(e.target.value)}
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sua Chave PIX</label>
                <Input
                  type="text"
                  placeholder={withdrawalPixKeyType === 'cpf' ? '123.456.789-00' : '00.000.000/0000-00'}
                  value={withdrawalPixKey}
                  onChange={(e) => setWithdrawalPixKey(e.target.value)}
                />
              </div>
              
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 text-sm text-yellow-300">
                <p>Os saques são processados em até 24 horas úteis.</p>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                    setWithdrawalPixKey('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleWithdraw}
                  disabled={isSubmitting || !withdrawAmount || !withdrawalPixKey || parseFloat(withdrawAmount) > balance}
                >
                  {isSubmitting ? 'Processando...' : 'Sacar'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;