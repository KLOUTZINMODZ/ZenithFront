import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  ArrowLeft,
  MessageCircle,
  User,
  Wifi,
  WifiOff,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useChatOptimized } from '../../hooks/useChatOptimized';

const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
};


interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showAvatar }) => {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex items-end space-x-1 sm:space-x-2 mb-1 px-1 sm:px-0 ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      {}
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0">
          {message.sender?.profileImage ? (
            <img 
              src={message.sender.profileImage} 
              alt=""
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
          )}
        </div>
      )}

      {}
      {!isOwn && !showAvatar && <div className="w-6 sm:w-8" />}

      {}
      <div
        className={`
          max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg
          px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl relative
          shadow-md backdrop-blur-sm
          ${
            isOwn
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-md shadow-purple-500/20'
              : 'bg-gray-700/90 text-white rounded-bl-md shadow-gray-900/30'
          } 
          ${message.status === 'failed' ? 'border border-red-400' : ''}
          transition-all duration-200 hover:shadow-lg
        `}
      >
        {}
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {}
        <div className={`flex items-center justify-end space-x-1 mt-1 ${
          isOwn ? 'text-white/70' : 'text-gray-400'
        }`}>
          <span className="text-xs">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && getStatusIcon()}
        </div>

        {}
        {message.status === 'failed' && (
          <div className="absolute -bottom-6 right-0 text-xs text-red-400 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Falha no envio</span>
            <span className="sm:hidden">Falha</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};


interface ConversationItemProps {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ 
  conversation, 
  isActive, 
  onClick,
  currentUserId 
}) => {

  const otherParticipant = conversation.participants?.find((p: any) => 
    (p.user?._id || p._id) !== currentUserId
  );

  const displayName = conversation.name || 
                     otherParticipant?.user?.name || 
                     'Chat';

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-3 sm:p-4 cursor-pointer transition-all duration-200
        border-b border-gray-700/30 hover:border-gray-600/50
        ${
          isActive 
            ? 'bg-purple-600/20 border-l-2 sm:border-l-4 border-purple-500 shadow-lg shadow-purple-500/10' 
            : 'hover:bg-gray-700/30'
        }
      `}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <div className="relative flex-shrink-0">
          {otherParticipant?.user?.profileImage || otherParticipant?.profileImage ? (
            <img 
              src={otherParticipant?.user?.profileImage || otherParticipant?.profileImage} 
              alt=""
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          {conversation.unreadCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs text-white font-bold px-1">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            </div>
          )}
          {conversation.isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-gray-800 shadow-sm"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-white truncate text-sm sm:text-base">
              {displayName}
            </h3>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {conversation.lastMessage?.createdAt && 
                formatDistanceToNow(new Date(conversation.lastMessage.createdAt))}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5 sm:mt-1 leading-relaxed">
            {conversation.lastMessage?.content || 'Nenhuma mensagem ainda'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};


const TypingIndicator: React.FC<{ users: string[] }> = ({ users }) => {
  if (users.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center space-x-1 sm:space-x-2 px-1 sm:px-4 py-2"
    >
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-700/80 backdrop-blur-sm flex items-center justify-center">
        <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
      </div>
      <div className="bg-gray-700/80 backdrop-blur-sm rounded-2xl px-3 sm:px-4 py-2 shadow-md">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </motion.div>
  );
};


const OptimizedMessagesPage: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    activeConversation,
    isConnected,
    isLoading,
    error,
    setActiveConversation,
    sendMessage,
    markAsRead,
    refreshConversations,
    typingUsers,
    setTyping,
    cacheStats
  } = useChatOptimized();

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showCacheStats, setShowCacheStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = user?.id || (user as any)?._id || '';


  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);


  useEffect(() => {
    if (activeConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConversation]);


  useEffect(() => {
    if (activeConversation && messages.length > 0) {
      const unreadMessageIds = messages
        .filter(msg => !msg.isOwn && !msg.readBy.includes(currentUserId))
        .map(msg => msg._id)
        .filter(Boolean);

      if (unreadMessageIds.length > 0) {
        markAsRead(unreadMessageIds);
      }
    }
  }, [activeConversation, messages, currentUserId, markAsRead]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!messageInput.trim() || !activeConversation) return;

    const content = messageInput.trim();
    setMessageInput('');
    
    try {
      await sendMessage(content);
    } catch (error) {
          }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    

    if (e.target.value.length > 0) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };


  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const otherParticipant = conv.participants?.find((p: any) => 
      (p.user?._id || p._id) !== currentUserId
    );
    
    const displayName = conv.name || 
                       otherParticipant?.user?.name || 
                       'Chat';
    
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
  });


  const groupedMessages = messages.map((message, index) => {
    const nextMessage = messages[index + 1];
    
    const showAvatar = !message.isOwn && (
      !nextMessage || 
      nextMessage.isOwn || 
      nextMessage.sender._id !== message.sender._id
    );
    
    return {
      ...message,
      showAvatar
    };
  });

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden fixed inset-0">
      {}
      <div className={`
        w-full sm:w-80 md:w-72 lg:w-80 xl:w-96 
        bg-gray-800 border-r border-gray-700 flex flex-col 
        transition-all duration-300 ease-in-out
        ${
          showMobileChat 
            ? 'hidden sm:flex' 
            : 'flex'
        }
      `}>
        {}
        <div className="p-2 sm:p-3 border-b border-gray-700 bg-gray-800/95 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-lg sm:text-xl font-bold">Mensagens</h1>
            <div className="flex items-center space-x-2">
              {}
              <div className={`flex items-center space-x-1 ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {}
              <button
                onClick={() => setShowCacheStats(!showCacheStats)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Cache
              </button>
            </div>
          </div>

          {}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {}
          {showCacheStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-2 bg-gray-700 rounded text-xs"
            >
              <div>Conversas: {cacheStats.conversations}</div>
              <div>Mensagens: {cacheStats.totalMessages}</div>
              <div>Tamanho: {cacheStats.cacheSize}</div>
              <div>Último sync: {cacheStats.lastSync}</div>
              <div>Status: {cacheStats.isValid ? 'Válido' : '❌ Inválido'}</div>
            </motion.div>
          )}
        </div>

        {}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {isLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <MessageCircle className="w-8 h-8 mb-2" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation._id}
                  conversation={conversation}
                  isActive={activeConversation?._id === conversation._id}
                  onClick={() => {
                    setActiveConversation(conversation._id);
                    setShowMobileChat(true);
                  }}
                  currentUserId={currentUserId}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {}
        <div className="p-2 sm:p-3 border-t border-gray-700 bg-gray-800/95">
          <button
            onClick={refreshConversations}
            disabled={isLoading}
            className="w-full py-2 sm:py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {}
      <div className={`
        flex-1 flex flex-col min-w-0 
        transition-all duration-300 ease-in-out
        ${
          !showMobileChat ? 'hidden sm:flex' : 'flex'
        }
      `}>
        {activeConversation ? (
          <>
            {}
            <div className="p-2 sm:p-3 border-b border-gray-700 bg-gray-800/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="sm:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-sm sm:text-base truncate">{activeConversation.name}</h2>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {activeConversation.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  <button className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {groupedMessages.map((message) => (
                  <MessageBubble
                    key={message._id || message.tempId}
                    message={message}
                    isOwn={message.isOwn}
                    showAvatar={message.showAvatar}
                  />
                ))}
              </AnimatePresence>

              {}
              <TypingIndicator users={typingUsers} />

              <div ref={messagesEndRef} />
            </div>

            {}
            <div className="p-2 sm:p-3 border-t border-gray-700 bg-gray-800/95 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2 sm:space-x-3">
                <button
                  type="button"
                  className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                
                <div className="flex-1 relative min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageInput}
                    onChange={handleInputChange}
                    placeholder="Digite uma mensagem..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!messageInput.trim() || !isConnected}
                  className="p-1.5 sm:p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex-shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="text-center text-gray-400 max-w-md mx-auto">
              <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Selecione uma conversa</h3>
              <p className="text-sm sm:text-base leading-relaxed">Escolha uma conversa da lista para começar a trocar mensagens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedMessagesPage;
