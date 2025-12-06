/**
 * Page: Account Deliveries
 * Página segura para o comprador acessar credenciais criptografadas
 * Rota: /account-deliveries
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Loader,
  Package,
  Calendar,
  Gamepad2,
  CheckCircle,
  Clock,
  Shield,
  KeyRound,
  RefreshCw,
  DownloadCloud
} from 'lucide-react';
import AccountDeliveryService from '../services/accountDeliveryService';
import purchaseService from '../services/purchaseService';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';

interface Credentials {
  accountName: string;
  email: string;
  password: string;
  loginPlatform: string;
}

interface DeliveryDetail {
  _id: string;
  orderId: string;
  itemId: any;
  buyerId: string;
  sellerId: any;
  status: string;
  pricePaid: number;
  discountApplied: number;
  loginPlatform: string;
  deliveredAt: string;
  confirmedAt?: string;
  accessCount: number;
  accessToken: string;
  accessTokenExpiresAt: string;
  createdAt: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

const listVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25 }
  })
};

const glassPanel = 'bg-gradient-to-br from-gray-900/70 via-gray-900/30 to-gray-900/10 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/30 rounded-2xl';

const AccountDeliveriesPage: React.FC = () => {
  const { deliveryId } = useParams<{ deliveryId?: string }>();

  const [deliveries, setDeliveries] = useState<DeliveryDetail[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryDetail | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  useEffect(() => {
    if (deliveryId && deliveries.length > 0) {
      const delivery = deliveries.find((d: any) => d._id === deliveryId);
      if (delivery) {
        setSelectedDelivery(delivery);
      }
    }
  }, [deliveryId, deliveries]);

  const loadDeliveries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await AccountDeliveryService.getBuyerDeliveries();
      setDeliveries(data.deliveries || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar entregas');
      console.error('Erro ao carregar entregas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptCredentials = async (delivery: DeliveryDetail) => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await AccountDeliveryService.getDecryptedCredentials(
        delivery._id,
        delivery.accessToken
      );

      setCredentials(data.credentials);
      setSelectedDelivery(delivery);
    } catch (err: any) {
      setError(err.message || 'Erro ao descriptografar credenciais');
      console.error('Erro ao descriptografar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedDelivery) return;

    try {
      if (!selectedDelivery.orderId) {
        throw new Error('Compra não encontrada para esta entrega.');
      }

      setIsConfirming(true);
      const response = await purchaseService.confirm(selectedDelivery.orderId);

      if (!response.success) {
        throw new Error(response.message || 'Não foi possível confirmar o recebimento.');
      }

      setSelectedDelivery({
        ...selectedDelivery,
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });

      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery._id === selectedDelivery._id
            ? { ...delivery, status: 'confirmed', confirmedAt: new Date().toISOString() }
            : delivery
        )
      );

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar entrega');
    } finally {
      setIsConfirming(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading && deliveries.length === 0) {
    return <LoadingState text="Carregando suas entregas..." />;
  }

  return (
    <div>
      <PageHeader
        title="Minhas Contas"
        subtitle="Acesse suas credenciais criptografadas com segurança"
        icon={Lock}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${glassPanel} p-4 flex flex-wrap items-center gap-4`}
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-white font-semibold text-lg">Entrega Automática</p>
              <p className="text-sm text-gray-400">Credenciais ficam disponíveis instantaneamente após a compra.</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadDeliveries}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar lista
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${glassPanel} border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3`}
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}

        {deliveries.length === 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <EmptyState
              icon={Package}
              title="Nenhuma conta entregue"
              description="Você ainda não tem contas entregues automaticamente"
            />
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Lista de Entregas */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Entregas ({deliveries.length})
              </h2>

              <div className="space-y-3">
                <AnimatePresence>
                  {deliveries.map((delivery, index) => (
                    <motion.button
                      key={delivery._id}
                      onClick={() => handleDecryptCredentials(delivery)}
                      custom={index}
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ x: 6, scale: 1.01 }}
                      className={`w-full text-left p-4 rounded-2xl transition-all ${
                        selectedDelivery?._id === delivery._id
                          ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-400/40 shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 border border-white/5 hover:border-purple-400/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate flex items-center gap-2 text-base">
                            <Gamepad2 className="w-4 h-4 text-purple-300 flex-shrink-0" />
                            {delivery.loginPlatform}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(delivery.deliveredAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {delivery.status === 'confirmed' && (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Detalhes da Entrega */}
            <div className="lg:col-span-2">
              {selectedDelivery && credentials ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-6"
                >
                  {/* Header */}
                  <div className="border-b border-gray-700 pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                          <Shield className="w-6 h-6 text-purple-400" />
                          {credentials.loginPlatform}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">Credenciais criptografadas</p>
                      </div>
                      {selectedDelivery.status === 'confirmed' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-medium text-green-400">Confirmada</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">Data de Entrega</p>
                        <p className="text-white font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          {new Date(selectedDelivery.deliveredAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Acessos</p>
                        <p className="text-white font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-400" />
                          {selectedDelivery.accessCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Credenciais */}
                  <div className="space-y-4">
                    {/* Nome da Conta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nome/ID da Conta
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={credentials.accountName}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.accountName, 'accountName')}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {copiedField === 'accountName' ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        E-mail
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showEmail ? 'text' : 'password'}
                          value={credentials.email}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                        />
                        <button
                          onClick={() => setShowEmail(!showEmail)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {showEmail ? (
                            <EyeOff className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Eye className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(credentials.email, 'email')}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {copiedField === 'email' ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Senha */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Senha
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Eye className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(credentials.password, 'password')}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {copiedField === 'password' ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  {selectedDelivery.status !== 'confirmed' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirmDelivery}
                      disabled={isConfirming}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isConfirming ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Confirmar Recebimento
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  className={`${glassPanel} p-12 text-center`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Selecione uma entrega para visualizar as credenciais</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AccountDeliveriesPage;
