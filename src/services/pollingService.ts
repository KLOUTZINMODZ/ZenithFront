import chatApi from './chatApi'; 
import { safeApiArray, ensureValidConversations } from '../utils/arraySafety';


interface PollingConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

const DEFAULT_CONFIG: PollingConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  circuitBreakerThreshold: 3,
  circuitBreakerTimeout: 60000
};


interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}


interface RetryState {
  attempts: number;
  lastAttempt: number;
  delay: number;
}

interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  content: string;
  createdAt: string;
  readBy: string[];
  deliveredTo: string[];
}

interface Conversation {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role: string;
  }>;
  lastMessage?: Message;
  unreadCount?: number;
  updatedAt: string;
}

class PollingService {
  private messagePollers: Map<string, { abort: AbortController; promise: Promise<any> }> = new Map();
  private conversationPoller: { abort: AbortController; promise: Promise<any> } | null = null;
  private typingPollers: Map<string, NodeJS.Timeout> = new Map();
  private messageCallbacks: Map<string, (messages: Message[]) => void> = new Map();
  private conversationCallbacks: Set<(conversations: Conversation[]) => void> = new Set();
  private typingCallbacks: Map<string, Set<(users: string[]) => void>> = new Map();
  private lastConversationCheck: number = Date.now();
  

  private config: PollingConfig = DEFAULT_CONFIG;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryStates: Map<string, RetryState> = new Map();


  private getCircuitBreakerKey(type: string, id?: string): string {
    return `${type}${id ? `-${id}` : ''}`;
  }

  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;
    
    if (state.isOpen) {
      const timeSinceLastFailure = Date.now() - state.lastFailure;
      if (timeSinceLastFailure > this.config.circuitBreakerTimeout) {

        state.isOpen = false;
        state.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private recordFailure(key: string): void {
    const state = this.circuitBreakers.get(key) || { failures: 0, lastFailure: 0, isOpen: false };
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.isOpen = true;
    }
    
    this.circuitBreakers.set(key, state);
  }

  private recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state) {
      state.failures = 0;
      state.isOpen = false;
    }
  }

  private getRetryDelay(key: string): number {
    const state = this.retryStates.get(key) || { attempts: 0, lastAttempt: 0, delay: this.config.baseDelay };
    
    if (state.attempts === 0) {
      state.delay = this.config.baseDelay;
    } else {

      state.delay = Math.min(
        state.delay * 2 + Math.random() * 1000,
        this.config.maxDelay
      );
    }
    
    state.attempts++;
    state.lastAttempt = Date.now();
    this.retryStates.set(key, state);
    
    return state.delay;
  }

  private resetRetryState(key: string): void {
    this.retryStates.delete(key);
  }


  startMessagePolling(conversationId: string, lastMessageId: string | null, callback: (messages: Message[]) => void) {

    this.stopMessagePolling(conversationId);

    this.messageCallbacks.set(conversationId, callback);
    const circuitKey = this.getCircuitBreakerKey('messages', conversationId);
    const retryKey = `messages-${conversationId}`;

    const poll = async () => {
      const abortController = new AbortController();
      

      if (this.isCircuitBreakerOpen(circuitKey)) {

        setTimeout(() => {
          if (this.messageCallbacks.has(conversationId)) {
            const promise = poll();
            this.messagePollers.set(conversationId, { abort: abortController, promise });
          }
        }, this.config.circuitBreakerTimeout);
        return;
      }
      
      try {
        const params = new URLSearchParams({
          conversationId,
          ...(lastMessageId && { lastMessageId })
        });

        const response = await chatApi.get(`/api/polling/messages?${params}`, {
          signal: abortController.signal,
          timeout: 35000
        });


        this.recordSuccess(circuitKey);
        this.resetRetryState(retryKey);

        if (response.data && response.data.messages) {

          const messages = Array.isArray(response.data.messages) 
            ? response.data.messages 
            : [];
          
          if (messages.length > 0) {
            callback(messages);
            

            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage._id) {
              lastMessageId = lastMessage._id;
            }
          }
        }


        if (!abortController.signal.aborted) {
          const promise = poll();
          this.messagePollers.set(conversationId, { abort: abortController, promise });
        }
      } catch (error: any) {
        if (error.name !== 'CanceledError' && !abortController.signal.aborted) {
          

          this.recordFailure(circuitKey);
          

          const retryState = this.retryStates.get(retryKey);
          if (!retryState || retryState.attempts < this.config.maxRetries) {
            const delay = this.getRetryDelay(retryKey);
            
            setTimeout(() => {
              if (this.messageCallbacks.has(conversationId)) {
                const promise = poll();
                this.messagePollers.set(conversationId, { abort: abortController, promise });
              }
            }, delay);
          } else {
            this.stopMessagePolling(conversationId);
          }
        }
      }
    };

    const abortController = new AbortController();
    const promise = poll();
    this.messagePollers.set(conversationId, { abort: abortController, promise });
  }


  stopMessagePolling(conversationId: string) {
    const poller = this.messagePollers.get(conversationId);
    if (poller) {
      poller.abort.abort();
      this.messagePollers.delete(conversationId);
      this.messageCallbacks.delete(conversationId);
    }
  }


  startConversationPolling(callback: (conversations: Conversation[]) => void) {

    this.stopConversationPolling();

    this.conversationCallbacks.add(callback);
    const circuitKey = this.getCircuitBreakerKey('conversations');
    const retryKey = 'conversations';

    const poll = async () => {
      const abortController = new AbortController();
      

      if (this.isCircuitBreakerOpen(circuitKey)) {

        const state = this.circuitBreakers.get(circuitKey);
        if (state && state.failures % 10 === 0) {
        }

        setTimeout(() => {
          if (this.conversationCallbacks.size > 0) {
            const promise = poll();
            this.conversationPoller = { abort: abortController, promise };
          }
        }, this.config.circuitBreakerTimeout);
        return;
      }
      
      try {
        const params = new URLSearchParams({
          lastCheck: this.lastConversationCheck.toString()
        });

        const response = await chatApi.get(`/api/messages/conversations?${params}`, {
          signal: abortController.signal,
          timeout: 35000
        });


        this.recordSuccess(circuitKey);
        this.resetRetryState(retryKey);

        if (response.data && response.data.data && response.data.data.conversations) {

          let conversations = Array.isArray(response.data.data.conversations) 
            ? response.data.data.conversations 
            : [];
          

          if (conversations.length === 0) {
            conversations = safeApiArray<Conversation>(response.data, 'conversations');
          }
          
          if (conversations.length === 0) {
            conversations = safeApiArray<Conversation>(response.data, 'data');
          }
          

          const validConversations = ensureValidConversations(conversations);
          
          

          this.conversationCallbacks.forEach(cb => cb(validConversations));
          

          this.lastConversationCheck = response.data.timestamp || Date.now();
        } else if (response.data && Array.isArray(response.data.conversations)) {

          this.conversationCallbacks.forEach(cb => cb(response.data.conversations));
        } else if (response.data && Array.isArray(response.data)) {

          this.conversationCallbacks.forEach(cb => cb(response.data));
        } else {

          this.conversationCallbacks.forEach(cb => cb([]));
        }


        if (!abortController.signal.aborted) {
          const promise = poll();
          this.conversationPoller = { abort: abortController, promise };
        }
      } catch (error: any) {
        if (error.name !== 'CanceledError' && !abortController.signal.aborted) {
          

          this.recordFailure(circuitKey);
          

          const retryState = this.retryStates.get(retryKey);
          if (!retryState || retryState.attempts < this.config.maxRetries) {
            const delay = this.getRetryDelay(retryKey);
            
            setTimeout(() => {
              if (this.conversationCallbacks.size > 0) {
                const promise = poll();
                this.conversationPoller = { abort: abortController, promise };
              }
            }, delay);
          } else {
            this.stopConversationPolling();
          }
        }
      }
    };

    const abortController = new AbortController();
    const promise = poll();
    this.conversationPoller = { abort: abortController, promise };
  }


  stopConversationPolling() {
    if (this.conversationPoller) {
      this.conversationPoller.abort.abort();
      this.conversationPoller = null;
    }
    this.conversationCallbacks.clear();
  }


  async sendMessage(conversationId: string, content: string): Promise<Message> {
    try {
      const response = await chatApi.post('/api/messages/send', {
        conversationId,
        content
      });
      
      return response.data.data;
    } catch (error: any) {

      if (error.response?.status === 403 && error.response?.data?.blocked) {
        throw {
          ...error,
          isBlocked: true,
          blockedReason: error.response.data.blockedReason,
          blockedAt: error.response.data.blockedAt
        };
      }
      throw error;
    }
  }


  
  async markAsRead(conversationId: string, messageIds: string[] = []): Promise<void> {
    try {
      await chatApi.put(`/api/messages/conversations/${conversationId}/read`, { messageIds });
    } catch (error) {
            throw error;
    }
  }


  async setTypingStatus(conversationId: string, isTyping: boolean): Promise<void> {
    await chatApi.post(`/api/polling/typing/${conversationId}`, { isTyping });
  }


  startTypingPolling(conversationId: string, callback: (users: string[]) => void) {

    this.stopTypingPolling(conversationId);

    if (!this.typingCallbacks.has(conversationId)) {
      this.typingCallbacks.set(conversationId, new Set());
    }
    this.typingCallbacks.get(conversationId)!.add(callback);

    const circuitKey = this.getCircuitBreakerKey('typing', conversationId);
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    const poll = async () => {

      if (this.isCircuitBreakerOpen(circuitKey)) {
        return;
      }

      try {
        const response = await chatApi.get(`/api/polling/typing/${conversationId}`, {
          timeout: 10000
        });
        

        this.recordSuccess(circuitKey);
        consecutiveFailures = 0;
        
        if (response.data.typingUsers) {
          const callbacks = this.typingCallbacks.get(conversationId);
          if (callbacks) {
            callbacks.forEach(cb => cb(response.data.typingUsers));
          }
        }
      } catch (error) {
        

        this.recordFailure(circuitKey);
        consecutiveFailures++;
        

        if (consecutiveFailures >= maxConsecutiveFailures) {
          this.stopTypingPolling(conversationId);
          return;
        }
      }
    };


    const interval = setInterval(poll, 3000);
    this.typingPollers.set(conversationId, interval);
    

    setTimeout(poll, 1000);
  }


  stopTypingPolling(conversationId: string) {
    const interval = this.typingPollers.get(conversationId);
    if (interval) {
      clearInterval(interval);
      this.typingPollers.delete(conversationId);
    }
    this.typingCallbacks.delete(conversationId);
  }


  async createConversation(participantId: string, boostingRequestId?: string): Promise<Conversation> {
    const response = await chatApi.post('/api/messages/conversations', {
      participantId,
      boostingRequestId
    });
    return response.data.conversation;
  }


  async getConversationByBoostingRequest(boostingRequestId: string): Promise<Conversation | null> {
    try {
      const response = await chatApi.get(`/api/messages/conversations/boosting/${boostingRequestId}`);
      return response.data.conversation;
    } catch (error) {
      return null;
    }
  }


  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await chatApi.get('/api/messages/conversations');
      

      let conversations = safeApiArray<Conversation>(response.data, 'data.conversations');
      

      if (conversations.length === 0) {
        conversations = safeApiArray<Conversation>(response.data, 'conversations');
      }
      
      if (conversations.length === 0) {
        conversations = safeApiArray<Conversation>(response.data, 'data');
      }
      

      const validConversations = ensureValidConversations(conversations);
      
      
      return validConversations;
    } catch (error) {
      return [];
    }
  }


  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await chatApi.get(`/api/messages/conversations/${conversationId}/messages`);

      if (response.data && Array.isArray(response.data.messages)) {
        return response.data.messages;
      }

      if (response.data && response.data.data && Array.isArray(response.data.data.messages)) {
        return response.data.data.messages;
      }
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      return [];
    }
  }


  cleanup() {

    this.messagePollers.forEach((_, conversationId) => {
      this.stopMessagePolling(conversationId);
    });


    this.stopConversationPolling();


    this.typingPollers.forEach((_, conversationId) => {
      this.stopTypingPolling(conversationId);
    });


    this.circuitBreakers.clear();
    this.retryStates.clear();
  }


  configureErrorHandling(config: Partial<PollingConfig>) {
    this.config = { ...this.config, ...config };
  }


  getErrorStates() {
    return {
      circuitBreakers: Array.from(this.circuitBreakers.entries()),
      retryStates: Array.from(this.retryStates.entries())
    };
  }


  resetErrorStates() {
    this.circuitBreakers.clear();
    this.retryStates.clear();
  }
}


export default new PollingService();
