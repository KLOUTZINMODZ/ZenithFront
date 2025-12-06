import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Shield, Lock } from 'lucide-react';

interface ChatBlockedBannerProps {
  reason?: string;
  blockedAt?: string;
}

const ChatBlockedBanner: React.FC<ChatBlockedBannerProps> = ({
  reason = 'pedido_finalizado',
  blockedAt
}) => {
  const getConfig = () => {
    switch (reason) {
      case 'pedido_finalizado':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-400',
          bgGradient: 'from-green-600/20 to-emerald-700/20',
          borderColor: 'border-green-500/40',
          title: 'Pedido Finalizado',
          description: 'Este pedido foi concluído com sucesso. O chat foi bloqueado automaticamente.',
          actions: []
        };
      case 'pedido_cancelado':
        return {
          icon: XCircle,
          iconColor: 'text-red-400',
          bgGradient: 'from-red-600/20 to-red-700/20',
          borderColor: 'border-red-500/40',
          title: '❌ Pedido Cancelado',
          description: 'Este pedido foi cancelado. O chat foi bloqueado e não é possível enviar mensagens.',
          actions: []
        };
      case 'support_ticket':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
          bgGradient: 'from-yellow-600/20 to-orange-700/20',
          borderColor: 'border-yellow-500/40',
          title: '🎫 Suporte Acionado',
          description: 'Um ticket de suporte foi aberto. O chat está temporariamente bloqueado aguardando análise.',
          actions: []
        };
      case 'denunciado':
      case 'fraude':
        return {
          icon: Shield,
          iconColor: 'text-purple-400',
          bgGradient: 'from-purple-600/20 to-purple-700/20',
          borderColor: 'border-purple-500/40',
          title: '🛡️ Chat sob Investigação',
          description: 'Este chat foi reportado e está sob análise do suporte. Mensagens estão bloqueadas.',
          actions: []
        };
      case 'proposta_recusada':
        return {
          icon: XCircle,
          iconColor: 'text-orange-400',
          bgGradient: 'from-orange-600/20 to-orange-700/20',
          borderColor: 'border-orange-500/40',
          title: '🚫 Proposta Recusada',
          description: 'A proposta foi recusada. Para reativar o chat, envie uma nova proposta.',
          actions: []
        };
      case 'usuario_banido':
        return {
          icon: Shield,
          iconColor: 'text-red-400',
          bgGradient: 'from-red-600/20 to-red-900/20',
          borderColor: 'border-red-500/40',
          title: '🚫 Usuário Banido',
          description: 'Este usuário foi banido da plataforma. Não é possível enviar ou receber mensagens.',
          actions: []
        };
      default:
        return {
          icon: Lock,
          iconColor: 'text-gray-400',
          bgGradient: 'from-gray-600/20 to-gray-700/20',
          borderColor: 'border-gray-500/40',
          title: '🔒 Chat Bloqueado',
          description: 'Este chat está bloqueado e não é possível enviar mensagens.',
          actions: []
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 sm:p-6 bg-gradient-to-r ${config.bgGradient} border-t ${config.borderColor} backdrop-blur-sm`}
    >
      <div className="max-w-4xl mx-auto">
        {}
        <div className="flex items-start space-x-4 mb-4">
          <div className={`flex-shrink-0 p-3 bg-gray-800/50 rounded-xl ${config.iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">
              {config.title}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {config.description}
            </p>
            {blockedAt && (
              <p className="text-xs text-gray-400 mt-2">
                📅 Bloqueado em: {new Date(blockedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {}
        <div className="mt-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>Envio de mensagens desabilitado neste chat</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBlockedBanner;
