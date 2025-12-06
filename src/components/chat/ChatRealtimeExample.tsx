import React, { useState, useEffect } from 'react';
import { useChatRealtime } from '../../hooks/useChatRealtime';
import { Send, Circle, CheckCircle, XCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  isOwn: boolean;
}

interface Conversation {
  id: string;
  participantName: string;
  lastMessage?: string;
  unreadCount: number;
}

const ChatRealtimeExample: React.FC = () => {
  const userId = 'current-user-id';
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const {
    connectionStatus,
    sendMessage,
    error
  } = useChatRealtime({
    userId,
    conversationId: selectedConversation || undefined,
    onNewMessage: (message) => {
            

      const newMessage: Message = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName || 'Unknown',
        createdAt: message.createdAt,
        isOwn: message.senderId === userId
      };
      
      setMessages(prev => [...prev, newMessage]);
    },
    onConversationCreated: (conversation) => {
            

      const newConversation: Conversation = {
        id: conversation.id,
        participantName: conversation.participantName || 'Unknown User',
        lastMessage: conversation.lastMessage,
        unreadCount: 0
      };
      
      setConversations(prev => [...prev, newConversation]);
    }
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !selectedConversation) return;
    
    try {
      await sendMessage(selectedConversation, messageInput.trim());
      setMessageInput('');
    } catch (err) {
          }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4" />;
      case 'connecting':
        return <Circle className="w-4 h-4 animate-pulse" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {}
      <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Conversations</h2>
          <div className={`flex items-center gap-2 mt-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm capitalize">{connectionStatus}</span>
          </div>
        </div>
        
        <div className="p-2">
          {conversations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No conversations yet</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation === conv.id
                    ? 'bg-purple-600/20 border border-purple-500'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-white">{conv.participantName}</h3>
                  {conv.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-sm text-gray-400 mt-1 truncate">{conv.lastMessage}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-center">No messages yet. Start a conversation!</p>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.isOwn
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {!msg.isOwn && (
                        <p className="text-xs text-gray-300 mb-1">{msg.senderName}</p>
                      )}
                      <p>{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {}
            {error && (
              <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  disabled={connectionStatus !== 'connected'}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || connectionStatus !== 'connected'}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    messageInput.trim() && connectionStatus === 'connected'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-xl mb-2">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRealtimeExample;
