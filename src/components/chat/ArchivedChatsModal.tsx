import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Clock, MessageSquare, X, Calendar } from 'lucide-react';
import archivedChatsStorage from '../../services/archivedChatsStorage';

interface ArchivedChat {
  conversationId: string;
  conversation: any;
  messages: any[];
  archivedAt: number;
  expiresAt: number;
  deliveryConfirmedBy: string;
}

interface ArchivedChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenArchivedChat: (conversationId: string, conversation: any, messages: any[]) => void;
}

const ArchivedChatsModal: React.FC<ArchivedChatsModalProps> = ({
  isOpen,
  onClose,
  onOpenArchivedChat
}) => {
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadArchivedChats();
      

      const cleanupCount = archivedChatsStorage.cleanupExpiredChats();
      if (cleanupCount > 0) {
              }
    }
  }, [isOpen]);

  const loadArchivedChats = () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      if (userId) {
        const chats = archivedChatsStorage.getArchivedConversations(userId);
        setArchivedChats(chats);
      }
    } catch (error) {
          } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = (): string | null => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user._id || user.id || null;
    } catch {
      return null;
    }
  };

  const formatTimeRemaining = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expirado';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h restantes`;
    }
    return `${hours}h restantes`;
  };

  const getConversationTitle = (conversation: any): string => {
    return conversation.name || 
           conversation.otherParticipant?.name || 
           conversation.participants?.[0]?.name || 
           'Chat Finalizado';
  };

  const handleOpenChat = (chat: ArchivedChat) => {
    onOpenArchivedChat(chat.conversationId, chat.conversation, chat.messages);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Chats Finalizados</h2>
              <p className="text-sm text-gray-400">
                Conversas de pedidos finalizados (disponíveis por 7 dias)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : archivedChats.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg mb-2">Nenhum chat finalizado</p>
              <p className="text-gray-500 text-sm">
                Chats finalizados aparecerão aqui por 7 dias
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedChats.map((chat) => (
                <motion.div
                  key={chat.conversationId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer group"
                  onClick={() => handleOpenChat(chat)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        <h3 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                          {getConversationTitle(chat.conversation)}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Finalizado em {new Date(chat.archivedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeRemaining(chat.expiresAt)}</span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          {chat.messages.length} mensagens • 
                          Clique para acessar mensagens
                        </p>
                      </div>
                    </div>

                    <div className="ml-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        chat.expiresAt - Date.now() <= 24 * 60 * 60 * 1000
                          ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                          : 'bg-green-900/50 text-green-300 border border-green-700/50'
                      }`}>
                        {chat.expiresAt - Date.now() <= 24 * 60 * 60 * 1000 ? 'Expira em breve' : 'Disponível'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {archivedChats.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{archivedChats.length} chat(s) arquivado(s)</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Chats expiram automaticamente após 7 dias</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ArchivedChatsModal;
