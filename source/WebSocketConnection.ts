import {
  DefaultConnectionConfig,
  WebSocketCloseCodes
} from './WebSocketConnection.data';
import {
  ConnectParams,
  ConnectionOptions,
  DisconnectOptions,
  WebSocketHandlers,
} from './WebSocketConnection.types';
import { calculateReconnectDelay, isConnectionClosed } from './WebSocketConnection.utils';

class WebSocketConnection {
  private options: ConnectionOptions = DefaultConnectionConfig;
  private handlers: Partial<WebSocketHandlers> = {};
  private instance: WebSocket | null = null;
  private origin: string;
  private executedReconnectAttempts: number = 0;
  private pingPongInterval: number | null = null;
  private shouldStopReconnect = false;
  private isManuallyClosed = false;

  constructor({ origin, handlers, options }: ConnectParams) {
    this.origin = origin;

    if (handlers) {
      this.handlers = { ...handlers };
    }

    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.initializeNetworkListeners();
  }

  public get readyState() {
    return this.instance?.readyState ?? WebSocket.CLOSED;
  }

  public async open(): Promise<Event> {
    return new Promise((resolve) => {
      if (this.readyState === WebSocket.OPEN) {
        return resolve(new Event('already_open'));
      }

      if (!this.instance || isConnectionClosed(this.instance) ) {
        this.instance = new WebSocket(this.origin, this.options.protocols);
        this.instance.binaryType = this.options.binaryType;

        this.initializeSocketEvents();  

        this.instance.onopen = (socketEvent) => {
          if (this.options.shouldPing) {
            this.initPingPong();
          }

          if (this.executedReconnectAttempts > 0) {
            this.handlers.onReconnect?.();
            this.executedReconnectAttempts = 0; 
          } else {
            this.handlers.onOpen?.(socketEvent);
          }

          resolve(socketEvent);
        };

        return;
      }

      this.instance = new WebSocket(this.origin, this.options.protocols);
      this.instance.binaryType = this.options.binaryType;

      this.initializeSocketEvents();  

      this.instance.onopen = (socketEvent) => {
        if (this.options.shouldPing) {
          this.initPingPong();
        }
        this.handlers.onOpen?.(socketEvent);
        resolve(socketEvent);
      };
    }
  );
}


  public async close(
    disconnectOptions?: Partial<DisconnectOptions>
  ): Promise<void> {
    return new Promise((resolve) => {
      const { closeCode, closeReason } = disconnectOptions ?? {};

      if (this.instance) {
        this.isManuallyClosed = true;
        this.shouldStopReconnect = true;

        if (!isConnectionClosed(this.instance)) {
          this.instance.addEventListener('close', () => resolve());
          this.instance.close(
            closeCode ?? WebSocketCloseCodes['Normal Closure'],
            closeReason ?? 'Client closed the connection.'
          );
        }

        // this.destroy();
      } else {
        resolve();
      }
    });
  }

  public async send(
    data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView
  ) {
    if (!this.instance || this.readyState !== WebSocket.OPEN) {
      await this.waitConnectionEstablishment();
    }
    this.instance?.send(data);
  }

  private initializeSocketEvents() {
    if (!this.instance) return;

    this.instance.onmessage = (socketEvent) => {
      this.handlers.onMessage?.(socketEvent.data, socketEvent);
    };

    this.instance.onerror = (error) => {
      this.handlers.onError?.(error);
    };

    this.instance.onclose = (socketEvent) => {
      if (!this.isManuallyClosed && this.options.shouldReconnect) {
        if (this.pingPongInterval) clearInterval(this.pingPongInterval);
        this.initReconnect();

        return;
      }

      if (this.pingPongInterval) clearInterval(this.pingPongInterval);
      this.handlers.onClose?.(socketEvent);
    };
  }

  private async waitConnectionEstablishment(): Promise<void> {
    const maxAttempts = 5;  
    let attempt = 0;  
    let delay = 100;  
    
    return new Promise((resolve, reject) => {
      const tryEstablishConnection = () => {
        console.log('here')
        if (this.readyState === WebSocket.OPEN) {
          resolve();
        } else if (attempt >= maxAttempts || !this.origin || isConnectionClosed(this.instance!)) {
          reject(new Error('Failed to establish connection after multiple attempts.'));
        } else {
          attempt++;
          delay = this.calculateNextDelay(attempt);
          setTimeout(tryEstablishConnection, delay);
        }
      };

      tryEstablishConnection();
    });
  }

  private calculateNextDelay(attempt: number): number {
    switch (attempt) {
      case 1:
        return 100;  
      case 2:
        return 500; 
      case 3:
        return 1000; 
      case 4:
        return 2000;  
      default:
        return 5000;  
    }
  }

  private initPingPong() {
    this.pingPongInterval = setInterval(() => {
      if (this.readyState === WebSocket.OPEN) {
        this.send(JSON.stringify(this.options.pingCommand));
        this.handlers.onPing?.()
      }
    }, this.options.pingTimeout * 1000);
  }

  private initReconnect() {
    this.executedReconnectAttempts += 1;

    if (this.shouldStopReconnect || this.executedReconnectAttempts > this.options.reconnectAttempts) {
      this.handlers.onReconnectFail?.();
      this.destroy();

      return;
    }

    const delay = calculateReconnectDelay(this.executedReconnectAttempts);
    setTimeout(() => this.open(), delay);
  }

  public cancelReconnect() {
    this.shouldStopReconnect = true;
  }

  /**
   * It is really should be inside this class? 
   * It will be better to move it on app layer
   */
  private initializeNetworkListeners() {
    window.addEventListener('online', () => {
      if (isConnectionClosed(this.instance!) && this.options.shouldReconnect) {
        this.open();
      }
    });

    window.addEventListener('offline', () => {
      if (!isConnectionClosed(this.instance!)) {

        this.close();
      }
    });
  }

  private destroy() {
    this.options = {} as ConnectionOptions;
    this.handlers = {} as Partial<WebSocketHandlers>;
    this.origin = '';
    this.instance = null;
    this.executedReconnectAttempts = 0;
    this.isManuallyClosed = false;
    this.shouldStopReconnect = false;
  }
}

export default WebSocketConnection;
