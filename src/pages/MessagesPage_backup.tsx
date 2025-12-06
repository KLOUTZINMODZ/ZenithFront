import React from 'react';
import UnifiedChatComponent from '../components/chat/UnifiedChatComponent';


const MessagesPage: React.FC = () => {
  return (
    <div className="h-screen">
      <UnifiedChatComponent />
    </div>
  );
};

export default MessagesPage;
                          isSending: message.isSending
                        }
                      });


                      return (
                        <motion.div
                          key={message._id || message.tempId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="w-full mb-2"
                          style={{

                            display: 'flex',
                            width: '100%',
                            justifyContent: isOwn ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-start',
                            flexDirection: 'row' as const,

                            textAlign: isOwn ? 'right' : 'left',
                            direction: isOwn ? 'rtl' : 'ltr'
                          } as React.CSSProperties}
                        >
                          {}
                          <div
                            className={`
                              px-4 py-2 rounded-2xl
                              ${isOwn 
                                ? 'bg-purple-600 text-white rounded-br-md border-4 border-green-400' 
                                : 'bg-gray-700 text-white rounded-bl-md border-4 border-red-400'
                              }
                            `}
                            style={{

                              marginLeft: isOwn ? 'auto' : '0',
                              marginRight: isOwn ? '0' : 'auto',
                              alignSelf: isOwn ? 'flex-end' : 'flex-start',
                              float: isOwn ? 'right' : 'left',
                              clear: 'both',
                              maxWidth: '70%',
                              position: 'relative',
                              wordWrap: 'break-word',

                              transform: isOwn ? 'translateX(0)' : 'translateX(0)',
                              width: 'fit-content'
                            }}
                            data-is-own={isOwn}
                            data-temp-id={message.tempId}
                            data-sender-id={senderId}
                          >
                            {}
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                            
                            {}
                            <div className={`
                              flex items-center justify-end space-x-1 mt-1 text-xs
                              ${isOwn ? 'text-purple-200' : 'text-gray-400'}
                            `}>
                              <span>
                                {(() => {

                                  try {
                                    const date = message.createdAt ? new Date(message.createdAt) : new Date();
                                    if (isNaN(date.getTime())) {
                                                                            return new Date().toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      });
                                    }
                                    return date.toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    });
                                  } catch (error) {
                                                                        return new Date().toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    });
                                  }
                                })()}
                              </span>
                              {isOwn && (
                                <span className="flex-shrink-0">
                                  {message.isRead 
                                    ? <CheckCheck className="w-4 h-4 text-blue-300" />
                                    : <Check className="w-4 h-4 opacity-70" />
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                )}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </div>

            {}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700/50">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-400" />
                </button>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                
                <button
                  type="button"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>
                
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className={`p-2 rounded-lg transition-all ${
                    messageInput.trim()
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                      : 'bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
            <p className="text-center px-8">
              Choose a conversation from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
