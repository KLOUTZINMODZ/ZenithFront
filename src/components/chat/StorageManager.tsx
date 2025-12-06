import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, Database, Info, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface StorageManagerProps {
  getStorageStats: () => { totalConversations: number; totalMessages: number; storageSize: string };
  clearStoredMessages: (conversationId?: string) => void;
  exportStoredMessages: () => string;
  importStoredMessages: (jsonData: string) => boolean;
  activeConversation?: string;
}

export const StorageManager: React.FC<StorageManagerProps> = ({
  getStorageStats,
  clearStoredMessages,
  exportStoredMessages,
  importStoredMessages,
  activeConversation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(getStorageStats());
  const [showConfirmClear, setShowConfirmClear] = useState<'all' | 'current' | null>(null);

  const refreshStats = useCallback(() => {
    const newStats = getStorageStats();
    setStats(newStats);
  }, [getStorageStats]);


  useEffect(() => {
    const handleStorageChange = () => {
      if (isOpen) {
        refreshStats();
      }
    };


    window.addEventListener('storage', handleStorageChange);
    

    const interval = setInterval(() => {
      if (isOpen) {
        refreshStats();
      }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isOpen, refreshStats]);

  const handleExport = useCallback(() => {
    try {
      const data = exportStoredMessages();
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zenith-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
      }
    } catch (error) {
      alert('Erro ao exportar backup. Verifique o console para mais detalhes.');
    }
  }, [exportStoredMessages]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = importStoredMessages(jsonData);
        
        if (success) {
          alert('Backup importado com sucesso!');
          refreshStats();
        } else {
          alert('❌ Erro ao importar backup. Verifique se o arquivo está correto.');
        }
      } catch (error) {
        alert('❌ Erro ao importar backup. Verifique se o arquivo está correto.');
      }
    };
    reader.readAsText(file);
    

    event.target.value = '';
  }, [importStoredMessages, refreshStats]);

  const handleClearMessages = useCallback((type: 'all' | 'current') => {
    try {
      if (type === 'all') {
        clearStoredMessages();
      } else if (type === 'current' && activeConversation) {
        clearStoredMessages(activeConversation);
      }
      
      refreshStats();
      setShowConfirmClear(null);
    } catch (error) {
      alert('Erro ao limpar mensagens. Verifique o console para mais detalhes.');
    }
  }, [clearStoredMessages, activeConversation, refreshStats]);


  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const modalContent = isOpen ? (
    <AnimatePresence>
      {
          <motion.div
            key="storage-overlay"
            className="modal-backdrop flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              key="storage-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="storage-modal-title"
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl max-w-lg w-full p-6"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 id="storage-modal-title" className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-purple-300"><Database size={20} /></span>
                  Gerenciar Armazenamento
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white rounded-md p-1.5 hover:bg-white/5"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {}
              <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <span className="text-purple-300"><Info size={16} /></span>
                    Estatísticas
                  </h4>
                  <button
                    onClick={refreshStats}
                    className="text-purple-300 hover:text-purple-200"
                    title="Atualizar estatísticas"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Conversas:</span>
                    <span className="text-white font-medium">{stats.totalConversations}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Mensagens:</span>
                    <span className="text-white font-medium">{stats.totalMessages}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tamanho:</span>
                    <span className="text-white font-medium">{stats.storageSize}</span>
                  </div>
                </div>
              </div>

              {}
              <div className="space-y-3 mb-5">
                <h4 className="text-white font-medium">Backup & Restauração</h4>

                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Exportar
                  </button>

                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer">
                    <Upload size={16} />
                    Importar
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {}
              <div className="space-y-2">
      
                <button
                  onClick={() => setShowConfirmClear('all')}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Limpar todas as mensagens
                </button>
              </div>

              {}
              <AnimatePresence>
                {showConfirmClear && (
                  <motion.div
                    key="confirm-overlay"
                    className="fixed inset-0 bg-black/70 backdrop-filter backdrop-blur-sm flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowConfirmClear(null)}
                  >
                    <motion.div
                      key="confirm-modal"
                      className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h4 className="text-white font-semibold mb-3">Confirmar Limpeza</h4>
                      <p className="text-gray-300 mb-4">
                        {showConfirmClear === 'all' 
                          ? 'Tem certeza que deseja limpar TODAS as mensagens armazenadas? Esta ação não pode ser desfeita.'
                          : 'Tem certeza que deseja limpar as mensagens da conversa atual? Esta ação não pode ser desfeita.'
                        }
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowConfirmClear(null)}
                          className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleClearMessages(showConfirmClear)}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Confirmar
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
      }
    </AnimatePresence>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        title="Gerenciar armazenamento local"
      >
        <Database size={16} />
      </button>

      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
