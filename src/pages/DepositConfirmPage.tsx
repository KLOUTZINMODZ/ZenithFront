import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, XCircle, Copy, QrCode, Shield } from 'lucide-react';
import { walletService } from '../services';
import notificationWebSocketService from '../services/notificationWebSocketService';

interface DepositData {
  transactionId: string;
  pixQrCode: string;
  pixCopyPaste: string;
  asaasPaymentId?: string;
  expirationDate?: string;
  breakdown?: {
    amountGross: number;
    feePercent: number;
    feeAmount: number;
    amountNet: number;
  };
}

const STORAGE_KEY = 'hacklote_wallet_deposit_session';

const DepositConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [deposit, setDeposit] = useState<DepositData | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [qrCodeVisible, setQrCodeVisible] = useState(true);
  const [copying, setCopying] = useState(false);
  const [copyingPaymentId, setCopyingPaymentId] = useState(false);
  const [polling, setPolling] = useState(false);
  const [finalized, setFinalized] = useState(false);

  const loadDeposit = useCallback(() => {

    const fromState: DepositData | undefined = location?.state?.depositData;
    if (fromState?.transactionId && fromState.pixQrCode) {
      setDeposit(fromState);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fromState)); } catch {}
      return fromState;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DepositData;
        if (parsed?.transactionId && parsed?.pixQrCode) {
          setDeposit(parsed);
          return parsed;
        }
      }
    } catch {}
    navigate('/wallet');
    return null;
  }, [location?.state, navigate]);

  useEffect(() => {
    loadDeposit();
  }, [loadDeposit]);


  useEffect(() => {
    const handler = (payload: any) => {
      try {
        const data = payload?.data || payload;
        const txId = data?.transactionId || data?.data?.transactionId;
        if (txId && deposit?.transactionId && String(txId) === String(deposit.transactionId)) {
          setStatus('approved');
          setFinalized(true);
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
        }
      } catch {}
    };
    notificationWebSocketService.on('wallet_balance_updated', handler);
    return () => {
      notificationWebSocketService.off('wallet_balance_updated', handler);
    };
  }, [deposit?.transactionId]);


  useEffect(() => {
    if (!deposit?.expirationDate) return;
    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(deposit.expirationDate as string).getTime();
      const remaining = Math.max(0, expires - now);
      setTimeLeft(remaining);

      if (remaining === 0 && !finalized && status !== 'approved') setStatus('rejected');
    };
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [deposit?.expirationDate, finalized, status]);


  const checkDepositStatus = useCallback(async () => {

    if (!deposit?.transactionId || polling || finalized || status === 'approved' || status === 'rejected') return;
    setPolling(true);
    try {
      const res = await walletService.getWallet(1, 10);
      const tx = res?.data?.transactions?.find(t => t._id === deposit.transactionId);
      if (tx) {

        if (tx.status === 'completed') {
          setStatus('approved');

          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          setFinalized(true);
        } else if (tx.status === 'failed' || tx.status === 'cancelled') {
          setStatus('rejected');
          setFinalized(true);
        } else {
          setStatus('pending');
        }
      }
    } catch {}
    finally { setPolling(false); }
  }, [deposit?.transactionId, polling, finalized, status]);

  useEffect(() => {
    if (!deposit) return;

    if (!finalized) setStatus('pending');
    const id = setInterval(checkDepositStatus, 5000);
    return () => clearInterval(id);
  }, [deposit, checkDepositStatus, finalized]);

  const copyPixCode = async () => {
    if (!deposit?.pixCopyPaste || copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(deposit.pixCopyPaste);
    } catch {}
    finally { setCopying(false); }
  };

  const copyPaymentId = async () => {
    if (!deposit?.asaasPaymentId || copyingPaymentId) return;
    setCopyingPaymentId(true);
    try {
      await navigator.clipboard.writeText(deposit.asaasPaymentId);
    } catch {}
    finally { setCopyingPaymentId(false); }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!deposit) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8"
          >
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping"></div>
            </div>
            <p className="text-gray-300 font-medium">Preparando confirmação do depósito...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/wallet')}
              className="flex items-center text-gray-300 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Voltar</span>
            </button>
            <div className="flex items-center space-x-3 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">Depósito Seguro</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {}
          <div className="lg:col-span-3 order-1 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 md:p-8"
            >
              {}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className={`relative w-4 h-4 rounded-full ${
                    status === 'approved' ? 'bg-green-500' : 
                    status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}>
                    {status === 'pending' && (
                      <div className="absolute inset-0 rounded-full bg-yellow-500 animate-pulse" />
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    {status === 'approved' ? 'Depósito Confirmado!' : 
                     status === 'rejected' ? 'Depósito Expirado' : 'Aguardando Pagamento'}
                  </h1>
                </div>
                {timeLeft > 0 && status === 'pending' && (
                  <div className="flex items-center space-x-2 bg-orange-500/10 px-4 py-2 rounded-lg border border-orange-500/20">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-orange-400">{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {status === 'approved' && (
                  <motion.div
                    key="approved"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="relative mb-6"
                    >
                      <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-3">Pagamento Confirmado!</h2>
                    <p className="text-gray-300 text-lg">Seu saldo será atualizado automaticamente.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => navigate('/wallet')}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                      >
                        Ir para Carteira
                      </button>
                    </div>
                  </motion.div>
                )}

                {status === 'rejected' && (
                  <motion.div
                    key="rejected"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-3">Depósito Expirado</h2>
                    <p className="text-gray-300 text-lg mb-6">O tempo limite para pagamento foi atingido.</p>
                    <button
                      onClick={() => navigate('/wallet')}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                    >
                      Voltar para Carteira
                    </button>
                  </motion.div>
                )}

                {status === 'pending' && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {}
                    <div className="text-center mb-8">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-block p-6 bg-white border-2 border-gray-300 rounded-2xl shadow-lg"
                      >
                        {qrCodeVisible && deposit.pixQrCode ? (
                          <img
                            src={deposit.pixQrCode}
                            alt="QR Code PIX"
                            className="w-72 h-72 md:w-80 md:h-80 mx-auto"
                            onError={() => setQrCodeVisible(false)}
                          />
                        ) : (
                          <div className="w-72 h-72 md:w-80 md:h-80 flex items-center justify-center bg-gray-100 rounded-xl">
                            <QrCode className="w-20 h-20 text-gray-400" />
                          </div>
                        )}
                      </motion.div>
                      <div className="mt-4 space-y-2">
                        <p className="text-gray-300 font-medium">Escaneie o QR Code com o app do seu banco</p>
                        {deposit.expirationDate && (
                          <p className="text-xs text-gray-400">Vence em: {new Date(deposit.expirationDate).toLocaleString('pt-BR')}</p>
                        )}
                      </div>
                    </div>

                    {}
                    <div className="space-y-4">
                      <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600/50">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 p-4 bg-gray-900/50 border border-gray-600/50 rounded-lg font-mono text-sm text-gray-200 break-all overflow-hidden">
                            {deposit.pixCopyPaste}
                          </div>
                          <button
                            onClick={copyPixCode}
                            disabled={copying}
                            className="px-6 py-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium"
                          >
                            <Copy className={`w-4 h-4 ${copying ? 'animate-pulse' : ''}`} />
                            <span>{copying ? 'Copiando...' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {}
          <div className="lg:col-span-2 order-2 lg:order-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6"
            >
              <h2 className="text-lg font-bold text-white mb-6 flex items-center">
                <div className="p-2 bg-gray-700 rounded-lg mr-3">
                  <Shield className="w-5 h-5" />
                </div>
                Resumo do Depósito
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">ID do Pagamento:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white truncate max-w-[180px]" title={deposit.asaasPaymentId || undefined}>
                      {deposit.asaasPaymentId || '—'}
                    </span>
                    {deposit.asaasPaymentId && (
                      <button
                        onClick={copyPaymentId}
                        disabled={copyingPaymentId}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-md transition-colors inline-flex items-center gap-1 text-xs"
                        title="Copiar ID"
                      >
                        <Copy className={`w-3 h-3 ${copyingPaymentId ? 'animate-pulse' : ''}`} />
                        Copiar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Valor bruto:</span>
                  <span className="font-medium text-white">R$ {(deposit.breakdown?.amountGross ?? 0).toFixed(2)}</span>
                </div>
                {(deposit.breakdown?.feeAmount ?? 0) > 0 && (
                  <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <span className="text-gray-300">Taxa ({deposit.breakdown?.feePercent ?? 0}%):</span>
                    <span className="font-medium text-white">R$ {(deposit.breakdown?.feeAmount ?? 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-600/50 pt-4">
                  <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-xl border border-gray-600/50">
                    <span className="text-xl font-bold text-white">Total creditado</span>
                    <span className="text-2xl font-bold text-white">
                      R$ {(deposit.breakdown?.amountNet ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-green-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-green-400 mb-3 text-lg">Pagamento Seguro</h3>
                  <ul className="text-sm text-green-300 space-y-2">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Dados protegidos por SSL</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>PIX instantâneo e seguro</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Sem armazenamento de dados bancários</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositConfirmPage;
