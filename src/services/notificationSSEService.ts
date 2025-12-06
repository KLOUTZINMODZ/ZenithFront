import { Notification } from '../types';

interface SSEMessage {
  type: 'connected' | 'heartbeat' | 'unread_count' | 'new_notification' | 'notification_read';
  count?: number;
  notification?: Notification;
  notificationId?: string;
  message?: string;
  timestamp: string;
}

type SSEEventCallback = (data: SSEMessage) => void;

class NotificationSSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SSEEventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor() {

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        return;
      }

      if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;
      this.shouldReconnect = true;

      try {

        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://zenith.enrelyugi.com.br/api/v1';
        

        const baseUrl = apiBaseUrl.replace(/\/api\/v1$/, '');
        

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        

        const sseUrl = `${baseUrl}/api/notifications?token=${encodeURIComponent(token)}`;


        this.eventSource = new EventSource(sseUrl, {
          withCredentials: true
        });
        
        this.eventSource.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.emit('connected', { type: 'connected', timestamp: new Date().toISOString() });
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data: SSEMessage = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
          }
        };

        this.eventSource.onerror = (error) => {
          this.isConnecting = false;
          
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.handleError();
          }
          
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  private handleMessage(data: SSEMessage): void {
    this.emit(data.type, data);
  }

  private handleError(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', { 
        type: 'connected', 
        message: 'Max reconnection attempts reached',
        timestamp: new Date().toISOString() 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(() => {});
      }
    }, delay);
  }

  on(event: string, callback: SSEEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: SSEEventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: SSEMessage): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
        }
      });
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  getConnectionState(): number | null {
    return this.eventSource?.readyState || null;
  }
}


const notificationSSEService = new NotificationSSEService();
export default notificationSSEService;
