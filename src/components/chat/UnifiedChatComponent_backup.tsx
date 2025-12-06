import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Search, 
  User, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft,
  Check,
  CheckCheck
} from 'lucide-react';
import { useUnifiedChat } from '../../hooks/useUnifiedChat';
import { StorageManager } from './StorageManager';
import { ConversationItem } from './ConversationItem';
import { MessageBubble } from './MessageBubble';
import { safeMap } from '../../utils/safeMap';

const UnifiedChatComponent: React.FC = () => {

  const {

    conversations,
    activeConversation,
    messages,
    isConnected,
    connectionMode,
    failedMessages,
    

    setActiveConversation,
    sendMessage,
    refreshConversations,
    retryMessage,
    validateAndRecoverMessages,
    forceSync,
    

    getStorageStats,
    exportStoredMessages,
    importStoredMessages,
    

    getUnreadCount,
    getCurrentUserId,
    getConversationTitle,
    getConversationSubtitle,
    isOwnMessage
  } = useUnifiedChat();


  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const [isTyping, setIsTyping] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isConnected !== undefined) {
      setShowConnectionStatus(true);
      const timer = setTimeout(() => setShowConnectionStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);


  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation) return;
    
    sendMessage(activeConversation, messageInput.trim());
    setMessageInput('');
  }, [messageInput, activeConversation, sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (e.target.value.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refreshConversations();
  }, [refreshConversations]);

  const handleConversationSelect = useCallback((conversation: any) => {
    setActiveConversation(conversation._id);
    setShowMobileChat(true);
  }, [setActiveConversation]);

  const handleRetryMessage = useCallback((messageId: string) => {
    retryMessage(messageId);
  }, [retryMessage]);


  const currentConversation = conversations.find(c => c._id === activeConversation);
  const currentMessages = messages.get(activeConversation || '') || [];
  
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true;
    const title = getConversationTitle(conversation).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {}
      <AnimatePresence mode="wait">
        {showConnectionStatus && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
              isConnected 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}
          >
            <span className="text-sm">
              {isConnected ? `Conectado (${connectionMode})` : 'Desconectado'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-gray-700/50`}>
        {}
        <div className="p-3 sm:p-4 border-b border-gray-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-lg sm:text-xl font-bold">Mensagens</h1>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Atualizar conversas"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <StorageManager
                getStorageStats={getStorageStats}
                clearStoredMessages={() => {}}
                exportStoredMessages={exportStoredMessages}
                importStoredMessages={importStoredMessages}
                activeConversation={activeConversation || undefined}
              />
            </div>
          </div>
        </div>
        
        {}
        <div className="p-3 sm:p-4 border-b border-gray-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchQuery ? (
                <div>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa encontrada para "{searchQuery}"</p>
                </div>
              ) : (
                <div>
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa ainda</p>
                  <p className="text-sm mt-2">Suas conversas aparecerão aqui</p>
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {safeMap(
                filteredConversations,
                (conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    isActive={conversation._id === activeConversation}
                    onClick={() => handleConversationSelect(conversation)}
                    unreadCount={getUnreadCount(conversation._id)}
                    currentUserId={getCurrentUserId()}
                  />
                ),
                (conversation) => !!(conversation && conversation._id)
              )}
            </AnimatePresence>
          )}
        </div>

        {}
        {failedMessages.length > 0 && (
          <div className="p-3 sm:p-4 bg-red-900/20 border-t border-red-700/50">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs sm:text-sm">
                {failedMessages.length} mensagem(ns) falharam
              </span>
            </div>
          </div>
        )}
      </div>

      {}
      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {currentConversation ? (
          <>
            {}
            <div className="p-3 sm:p-4 border-b border-gray-700/50 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-sm sm:text-base truncate">{getConversationTitle(currentConversation)}</h2>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">
                        {getConversationSubtitle(currentConversation._id)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              <AnimatePresence mode="wait">
                {(() => {

                  const filteredMessages = currentMessages.filter(message => message && (message._id || message.tempId));
                  const uniqueMessages = new Map();
                  
                  filteredMessages.forEach((message, index) => {

                    const stableKey = message.tempId 
                      ? `msg-${message.tempId}`
                      : message._id 
                        ? `msg-${message._id}` 
                        : `fallback-${index}-${message.content?.substring(0, 10) || 'empty'}`;
                    

                    const existingKey = Array.from(uniqueMessages.keys()).find(key => {
                      const existing = uniqueMessages.get(key);
                      return (
                        key === stableKey ||
                        (message.tempId && existing.tempId === message.tempId) ||
                        (message._id && existing._id === message._id)
                      );
                    });
                    
                    if (!existingKey) {

                      uniqueMessages.set(stableKey, message);
                    } else {

                      const existing = uniqueMessages.get(existingKey);

                      if (!message.isTemporary && existing.isTemporary) {
                        uniqueMessages.set(existingKey, message);
                      } else if (!existing.isTemporary) {

                        return;
                      }
                    }
                  });
                  

                  return Array.from(uniqueMessages.entries()).map(([key, message]) => (
                    <MessageBubble
                      key={key}
                      message={message}
                      isOwn={isOwnMessage(message)}
                      onRetry={handleRetryMessage}
                    />
                  ));
                })()}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {}
            <div className="p-3 sm:p-4 border-t border-gray-700/50">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none focus:border-purple-500"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || !isConnected}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 sm:px-4 py-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
              
             
            </div>
          </>
        ) : (
          
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
              <p>Escolha uma conversa da lista para começar a conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedChatComponent;
