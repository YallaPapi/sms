interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  type: 'android' | 'ios';
  connection: 'wifi';
}

interface MessageHandler {
  [key: string]: (data: any) => void;
}

export class NetworkService {
  private socket: WebSocket | null = null;
  private serverUrl: string = '';
  private deviceInfo: DeviceInfo | null = null;
  private messageHandlers: MessageHandler = {};
  private isConnected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async connect(serverUrl: string, deviceInfo: DeviceInfo): Promise<void> {
    this.serverUrl = serverUrl;
    this.deviceInfo = deviceInfo;
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        this.socket = new WebSocket(`${wsUrl}/ws`);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          
          // Register device with server
          this.send('register-device', this.deviceInfo);
          
          // Start heartbeat
          this.startHeartbeat();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.stopHeartbeat();
          this.scheduleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
  }

  send(type: string, data: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
        deviceId: this.deviceInfo?.deviceId
      };

      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers[type] = handler;
  }

  isConnected_(): boolean {
    return this.isConnected;
  }

  private handleMessage(message: any): void {
    const { type, data } = message;
    
    if (type === 'heartbeat') {
      // Respond to server heartbeat
      this.send('heartbeat-response', { status: 'ok' });
      return;
    }

    const handler = this.messageHandlers[type];
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error handling message type '${type}':`, error);
        
        // Send error response to server
        this.send('error', {
          originalType: type,
          error: error.toString(),
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.warn(`No handler for message type: ${type}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { status: 'ok' });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    console.log('Scheduling reconnect in 5 seconds...');
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.attemptReconnect();
    }, 5000);
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isConnected || !this.serverUrl || !this.deviceInfo) {
      return;
    }

    try {
      console.log('Attempting to reconnect...');
      await this.connect(this.serverUrl, this.deviceInfo);
      console.log('Reconnected successfully');
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.scheduleReconnect();
    }
  }

  // HTTP fallback methods for when WebSocket is not available
  async sendHTTPRequest(endpoint: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          deviceId: this.deviceInfo?.deviceId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HTTP request failed:', error);
      throw error;
    }
  }

  async registerDeviceHTTP(): Promise<void> {
    if (!this.deviceInfo) {
      throw new Error('Device info not set');
    }

    await this.sendHTTPRequest('/api/devices/register', this.deviceInfo);
  }

  async sendSMSResultHTTP(messageId: string, result: any): Promise<void> {
    await this.sendHTTPRequest('/api/sms/result', {
      messageId,
      result
    });
  }

  async getMessageQueueHTTP(): Promise<any[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/devices/${this.deviceInfo?.deviceId}/queue`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to get message queue:', error);
      return [];
    }
  }
}