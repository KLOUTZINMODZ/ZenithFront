


import websocketService from './websocketService';

interface ConversationData {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      profileImage?: string;
    };
    role?: string;
  }>;
  lastMessage?: {
    _id: string;
    sender: { 
      _id?: string;
      name: string;
      profileImage?: string;
    };
    content: string;
    createdAt: string;
    conversation?: string;
    readBy?: string[];
    deliveredTo?: string[];
  };
  unreadCount: number;
  hasUpdate: boolean;
  updatedAt: string;
}

interface ConversationResponse {
  conversations: ConversationData[];
  timestamp: number;
  hasUpdates?: boolean;
}

export class ConversationPollingService {
  private lastCheck: number | null = null;
  private isPollingActive: boolean = false;
  private updateCallbacks: Array<(data: ConversationResponse) => void> = [];
  private errorCallbacks: Array<(error: any) => void> = [];

  constructor() {
    this.setupWebSocketListeners();
  }

  


  private setupWebSocketListeners() {

    websocketService.on('conversations:update', (data: any) => {
      

      const formattedResponse: ConversationResponse = {
        conversations: data.conversations || [],
        timestamp: data.timestamp || Date.now(),
        hasUpdates: true
      };


      if (formattedResponse.timestamp) {
        this.lastCheck = formattedResponse.timestamp;
      }


      this.updateCallbacks.forEach(callback => {
        try {
          callback(formattedResponse);
        } catch (error) {
        }
      });
    });


    websocketService.on('conversations:list', (data: any) => {
      
      const formattedResponse: ConversationResponse = {
        conversations: data.conversations || [],
        timestamp: data.timestamp || Date.now(),
        hasUpdates: data.hasUpdates
      };


      if (formattedResponse.timestamp) {
        this.lastCheck = formattedResponse.timestamp;
      }


      if (formattedResponse.hasUpdates) {
        this.updateCallbacks.forEach(callback => {
          try {
            callback(formattedResponse);
          } catch (error) {
          }
        });
      }
    });


    websocketService.on('conversations:polling_started', (data: any) => {
      this.isPollingActive = true;
    });


    websocketService.on('conversations:polling_stopped', (data: any) => {
      this.isPollingActive = false;
    });


    websocketService.on('conversations:error', (error: any) => {
      
      this.errorCallbacks.forEach(callback => {
        try {
          callback(error);
        } catch (err) {
        }
      });
    });
  }

  


  public startPolling(lastCheck?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {

        const checkTimestamp = lastCheck || this.lastCheck;
        


        const isConnected = true;
        if (!isConnected) {
          

          const connectionTimeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          websocketService.on('connected', () => {
            clearTimeout(connectionTimeout);
            this.sendStartPollingEvent(checkTimestamp ?? undefined);
            resolve();
          });

          return;
        }


        this.sendStartPollingEvent(checkTimestamp ?? undefined);
        resolve();

      } catch (error) {
        reject(error);
      }
    });
  }

  


  public stopPolling(): void {
    if (!this.isPollingActive) {
      return;
    }


    websocketService.emit('conversations:stop_polling', {});
    this.isPollingActive = false;
  }

  


  public getConversations(lastCheck?: number): Promise<ConversationResponse> {
    return new Promise((resolve, reject) => {
      const checkTimestamp = lastCheck || this.lastCheck;
      


      const responseTimeout = setTimeout(() => {
        reject(new Error('Timeout waiting for conversation list'));
      }, 15000);


      const responseHandler = (data: any) => {
        clearTimeout(responseTimeout);
        websocketService.off('conversations:list', responseHandler);

        const response: ConversationResponse = {
          conversations: data.conversations || [],
          timestamp: data.timestamp || Date.now(),
          hasUpdates: data.hasUpdates
        };

        resolve(response);
      };

      websocketService.on('conversations:list', responseHandler);


      websocketService.emit('conversations:get_list', {
        lastCheck: checkTimestamp
      });
    });
  }

  


  public onUpdate(callback: (data: ConversationResponse) => void): () => void {
    this.updateCallbacks.push(callback);
    

    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  


  public onError(callback: (error: any) => void): () => void {
    this.errorCallbacks.push(callback);
    

    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  


  private sendStartPollingEvent(lastCheck?: number): void {
    websocketService.emit('conversations:start_polling', {
      lastCheck: lastCheck
    });
  }

  


  public isActive(): boolean {
    return this.isPollingActive;
  }

  


  public getLastCheck(): number | null {
    return this.lastCheck;
  }

  


  public setLastCheck(timestamp: number): void {
    this.lastCheck = timestamp;
  }

  


  public destroy(): void {
    this.stopPolling();
    this.updateCallbacks = [];
    this.errorCallbacks = [];
    this.lastCheck = null;
  }
}


export const conversationPollingService = new ConversationPollingService();
export default conversationPollingService;
