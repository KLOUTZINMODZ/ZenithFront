import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { safeNavigate } from '../utils/navigationHelper';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Copy, 
  QrCode,
  CreditCard,
  Shield,
  Star,
  Package
} from 'lucide-react';
import api from '../services/api';

interface CheckoutSession {
  sessionId: string;
  total_amount: number;
  items_count: number;
  expires_at: string;
  status: string;
  created_at: string;
}

interface PaymentData {
  session: CheckoutSession;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  items: Array<{
    id: string;
    title: string;
    price: number;
  }>;
  total_amount: number;
  items_count: number;
  expires_at: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [qrCodeVisible, setQrCodeVisible] = useState(true);
  const [copying, setCopying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const loadCheckoutData = useCallback(() => {
    try {
      const savedData = localStorage.getItem('hacklote_checkout_session');
      if (savedData) {
        const parsed = JSON.parse(savedData);

        if (parsed.session?.sessionId && parsed.qr_code) {
          setPaymentData(parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.error('[Checkout] Load data error:', error);
    }
    
    
    if (!isNavigating) {
      setIsNavigating(true);
      safeNavigate(navigate, '/my-posts');
    }
    return null;
  }, [navigate, isNavigating]);


  const saveCheckoutData = useCallback((data: PaymentData) => {
    try {
      localStorage.setItem('hacklote_checkout_session', JSON.stringify({
        session: data.session,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        ticket_url: data.ticket_url,
        items: data.items,
        total_amount: data.total_amount,
        expires_at: data.expires_at,
        saved_at: new Date().toISOString()
      }));
    } catch (error) {
    }
  }, []);


  useEffect(() => {
    if (!paymentData) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(paymentData.expires_at).getTime();
      const remaining = Math.max(0, expires - now);
      setTimeLeft(remaining);

      if (remaining === 0) {
        setStatus('rejected');
      }
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [paymentData]);


  const checkPaymentStatus = useCallback(async () => {
    if (!paymentData?.session.sessionId || polling || isNavigating) return;

    setPolling(true);
    try {
      const response = await api.get(`/marketplace-highlights-payment/status/${paymentData.session.sessionId}`);
      
      if (response.data.success) {
        const newStatus = response.data.data.status;
        setStatus(newStatus);

        if (newStatus === 'approved') {
          
          localStorage.removeItem('hacklote_checkout_session');
          
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          
          
          setIsNavigating(true);
          navigationTimeoutRef.current = setTimeout(() => {
            safeNavigate(navigate, '/my-posts?payment=success');
          }, 2000);
        } else if (newStatus === 'rejected') {
          localStorage.removeItem('hacklote_checkout_session');
        }
      }
    } catch (error) {
      console.error('[Checkout] Status check error:', error);
    } finally {
      setPolling(false);
    }
  }, [paymentData?.session.sessionId, polling, navigate, isNavigating]);


  useEffect(() => {
    if (status !== 'pending' || !paymentData || isNavigating) return;

    pollingIntervalRef.current = setInterval(checkPaymentStatus, 5000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [status, paymentData, checkPaymentStatus, isNavigating]);


  useEffect(() => {
    const data = location.state?.paymentData || loadCheckoutData();
    if (data) {
      setPaymentData(data);
      saveCheckoutData(data);
      setStatus(data.session.status || 'pending');
    }
  }, [location.state, loadCheckoutData, saveCheckoutData]);


  const copyPixCode = async () => {
    if (!paymentData?.qr_code || copying) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(paymentData.qr_code);
    } catch (error) {
      console.error('[Checkout] Copy error:', error);
    } finally {
      setTimeout(() => setCopying(false), 300);
    }
  };
  
  
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    };
  }, []);


  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-900 flex items-center justify-center">
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
            <p className="text-gray-300 font-medium">Carregando checkout...</p>
            <div className="mt-2 flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-900">
      {}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/my-posts')}
              className="flex items-center text-gray-300 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Voltar</span>
            </button>
            
            <div className="flex items-center space-x-3 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">Pagamento Seguro</span>
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
                    {status === 'approved' ? 'Pagamento Aprovado!' : 
                     status === 'rejected' ? 'Pagamento Expirado' : 'Aguardando Pagamento'}
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
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="relative mb-6"
                    >
                      <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
                 
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-3">Pagamento Confirmado!</h2>
                    <p className="text-gray-300 text-lg">Seus itens já estão destacados no marketplace.</p>
                    <div className="mt-6 flex items-center justify-center space-x-2 text-green-400">
                      <Star className="w-5 h-5 fill-current" />
                      <span className="font-medium">Destaque ativo por 14 dias</span>
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
                    <h2 className="text-3xl font-bold text-white mb-3">Pagamento Expirado</h2>
                    <p className="text-gray-300 text-lg mb-6">O tempo limite para pagamento foi atingido.</p>
                    <button
                      onClick={() => navigate('/my-posts')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
                    >
                      Tentar Novamente
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
                        transition={{ delay: 0.3 }}
                        className="inline-block p-6 bg-white border-2 border-gray-300 rounded-2xl shadow-lg"
                      >
                        {qrCodeVisible && paymentData.qr_code_base64 ? (
                          <img 
                            src={`data:image/png;base64,${paymentData.qr_code_base64}`}
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
                        <p className="text-gray-300 font-medium">
                          Escaneie o QR Code com o app do seu banco
                        </p>
                      </div>
                    </div>

                    {}
                    <div className="space-y-4">
                     
                      <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600/50">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 p-4 bg-gray-900/50 border border-gray-600/50 rounded-lg font-mono text-sm text-gray-200 break-all overflow-hidden">
                            {paymentData.qr_code}
                          </div>
                          <button
                            onClick={copyPixCode}
                            disabled={copying}
                            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2 font-medium"
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
            {}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6"
            >
              <h2 className="text-lg font-bold text-white mb-6 flex items-center">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mr-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                Resumo do Pedido
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Itens para destacar:</span>
                  <span className="font-bold text-white text-lg">{paymentData.session.items_count}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Valor por item:</span>
                  <span className="font-medium text-white">R$ 10,00</span>
                </div>

                <div className="border-t border-gray-600/50 pt-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                    <span className="text-xl font-bold text-white">Total:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      R$ {paymentData.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {}
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

            {}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6"
            >
              <h3 className="font-bold text-white mb-4 flex items-center">
                <div className="p-2 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg mr-3">
                  <Package className="w-5 h-5" />
                </div>
                Itens Selecionados
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                {paymentData.items.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-gray-200 font-medium truncate max-w-48">
                        {item.title}
                      </span>
                    </div>
                    <span className="font-bold text-yellow-400 whitespace-nowrap">R$ 10,00</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
