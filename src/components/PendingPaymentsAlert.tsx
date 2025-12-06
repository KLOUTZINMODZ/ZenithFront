import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePendingPayments } from '../hooks/usePendingPayments';
import { useAuth } from '../contexts/AuthContext';

const PendingPaymentsAlert: React.FC = () => {
  const { user } = useAuth();
  const { 
    pendingPayments, 
    isChecking, 
    activePolling, 
    checkAllPendingPayments, 
    removePayment 
  } = usePendingPayments(user?.id);


  if (pendingPayments.length === 0) return null;

  const pendingCount = pendingPayments.filter(p => p.status === 'pending').length;
  const approvedCount = pendingPayments.filter(p => p.status === 'approved').length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-xl p-4 max-w-sm"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-2 flex items-center">
              <span className="mr-2">💰</span>
              Pagamentos Salvos
            </h3>
            
            <div className="text-xs space-y-1 mb-3">
              {pendingCount > 0 && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                  <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
                </div>
              )}
              
              {approvedCount > 0 && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span>{approvedCount} aprovado{approvedCount > 1 ? 's' : ''}</span>
                </div>
              )}
              
              {activePolling > 0 && (
                <div className="flex items-center text-blue-200">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-spin"></div>
                  <span>Verificando {activePolling} pagamento{activePolling > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={checkAllPendingPayments}
                disabled={isChecking}
                className="bg-white/20 hover:bg-white/30 disabled:opacity-50 px-3 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center"
              >
                {isChecking ? (
                  <>
                    <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  'Verificar Status'
                )}
              </button>
              
              <div className="flex flex-wrap gap-1">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.sessionId}
                    className="bg-white/10 rounded px-2 py-1 text-xs flex items-center gap-1"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      payment.status === 'pending' ? 'bg-yellow-400 animate-pulse' :
                      payment.status === 'approved' ? 'bg-green-400' :
                      'bg-red-400'
                    }`}></div>
                    <span className="truncate max-w-20">
                      {payment.itemsCount} item{payment.itemsCount > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => removePayment(payment.sessionId)}
                      className="ml-1 hover:bg-white/20 rounded px-1 text-white/70 hover:text-white"
                      title="Remover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button
            className="text-white/70 hover:text-white ml-2 p-1"
            onClick={() => {

              const oneHour = 60 * 60 * 1000;
              localStorage.setItem('hidePaymentAlert', (Date.now() + oneHour).toString());
              window.location.reload();
            }}
          >
            ×
          </button>
        </div>
        
        <div className="mt-2 text-xs text-white/70">
          💡 Seus pagamentos são salvos automaticamente. Mesmo se fechar o navegador, continuaremos verificando quando voltar!
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PendingPaymentsAlert;
