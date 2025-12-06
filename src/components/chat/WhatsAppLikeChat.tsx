import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  User,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWhatsAppChat } from '../../hooks/useWhatsAppChat';


interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn
}) => {
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
        return <AlertCircle className="w-3 h-3 text-red-400 cursor-pointer" title="Clique para reenviar" />;
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        w-full flex mb-1
        ${isOwn ? 'justify-end' : 'justify-start'}
      `}
    >
      {}
      <div
        className={`
          relative max-w-xs lg:max-w-sm px-3 py-1.5 rounded-2xl
          ${isOwn 
            ? 'bg-purple-600 text-white rounded-br-md ml-auto' 
            : 'bg-gray-700 text-white rounded-bl-md mr-auto'
          }
        `}
        style={{

          alignSelf: isOwn ? 'flex-end' : 'flex-start',
          marginLeft: isOwn ? 'auto' : '0',
          marginRight: isOwn ? '0' : 'auto'
        }}
        data-is-own={isOwn}
        data-temp-id={message.tempId}
        data-sender-id={(message as any).senderId}
      >
        {}
        <div className="text-xs whitespace-pre-wrap break-words leading-tight">
          {message.content}
        </div>
        
        {}
        <div className={`
          flex items-center justify-end space-x-1 mt-0.5 text-xs opacity-70
          ${isOwn ? 'text-purple-200' : 'text-gray-400'}
        `}>
          <span>
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="flex-shrink-0">
              {getStatusIcon()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};


interface ConversationItemProps {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
  unreadCount: number;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ 
  conversation, 
  isActive, 
  onClick,
  unreadCount 
}) => {
  const { user } = useAuth();
  

  const otherParticipant = conversation.participants?.find(
    (p: any) => {
      const participantId = p?.user?._id || p?._id || p;
      const currentUserId = user?.id || (user as any)?._id;
      return participantId !== currentUserId;
    }
  );

  const participantName = otherParticipant?.user?.name || 
                         otherParticipant?.name || 
                         'Chat';

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

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all ${
        isActive ? 'bg-purple-600/20 border-l-4 border-purple-500' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-white truncate">
              {participantName}
            </h3>
            <span className="text-xs text-gray-400">
              {conversation.lastMessageDate && 
                formatDistanceToNow(new Date(conversation.lastMessageDate))}
            </span>
          </div>
          <p className="text-sm text-gray-400 truncate mt-1">
            {conversation.lastMessage || 'Nenhuma mensagem'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};


const WhatsAppLikeChat: React.FC = () => {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  const {
    conversations,
    messages,
    activeConversation,
    unreadCounts,
    isConnected,
    isLoading,
    typingUsers,
    setActiveConversation,
    sendMessage,
    markAsRead,
    setTyping,
    retryFailedMessage,
    refreshConversations
  } = useWhatsAppChat();


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  useEffect(() => {
    if (activeConversation && messages.length > 0) {
      const unreadMessages = messages.filter(
        msg => !msg.isOwn && !msg.readBy?.includes(user?.id || '')
      );
      if (unreadMessages.length > 0) {
        markAsRead(unreadMessages.map(msg => msg._id));
      }
    }
  }, [activeConversation, messages, user?.id, markAsRead]);


  useEffect(() => {
    if (messageInput.trim()) {
      setTyping(true);
      const timeout = setTimeout(() => setTyping(false), 1000);
      return () => clearTimeout(timeout);
    } else {
      setTyping(false);
    }
  }, [messageInput, setTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !activeConversation) return;
    
    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
      inputRef.current?.focus();
    } catch (error) {
          }
  };

  const handleRetryMessage = (messageId: string) => {
    retryFailedMessage(messageId);
  };

  const currentUserId = user?.id || (user as any)?._id || '';

  return (
    <div className="h-full flex bg-gray-900">
      {}
      <div className={`${
        showMobileChat ? 'hidden' : 'flex'
      } md:flex flex-col w-full md:w-80 border-r border-gray-700`}>
        
        {}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Conversas</h1>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              Carregando conversas...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation._id}
                  conversation={conversation}
                  isActive={activeConversation?._id === conversation._id}
                  onClick={() => {
                    setActiveConversation(conversation._id);
                    setShowMobileChat(true);
                  }}
                  unreadCount={unreadCounts[conversation._id] || 0}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {}
      <div className={`${
        showMobileChat ? 'flex' : 'hidden'
      } md:flex flex-col flex-1`}>
        
        {activeConversation ? (
          <>
            {}
            <div className="bg-gray-800 border-b border-gray-700 p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 hover:bg-gray-700 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                
                <div className="flex-1">
                  <h2 className="font-medium text-sm text-white">
                    {activeConversation.participants?.find(
                      (p: any) => {
                        const participantId = p?.user?._id || p?._id || p;
                        return participantId !== currentUserId;
                      }
                    )?.user?.name || 'Chat'}
                  </h2>
             
                </div>
              </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5" style={{maxHeight: 'calc(100vh - 200px)'}}>
              <AnimatePresence mode="wait">
                {messages.slice(-15).map((message) => {


                  const currentUserId = user?.id || (user as any)?._id;
                  
                  let isOwn = false;
                  

                  if (message.tempId) {
                    isOwn = true;
                  }

                  else if ((message as any).senderId && currentUserId) {
                    isOwn = (message as any).senderId === currentUserId;
                  }

                  else if (message.sender?._id && currentUserId) {
                    isOwn = message.sender._id === currentUserId;
                  }

                  else if (message.isOwn !== undefined) {
                    isOwn = message.isOwn;
                  }
                  

                                    
                  return (
                    <MessageBubble
                      key={message._id || message.tempId}
                      message={message}
                      isOwn={isOwn}
                    />
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {}
            <div className="p-3 border-t border-gray-700 bg-gray-800 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-gray-700 text-white rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || !isConnected}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-full p-2 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
              <p>Escolha uma conversa para começar a trocar mensagens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppLikeChat;
