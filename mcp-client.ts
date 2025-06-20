/**
 * SAP MCP Client - Model Context Protocol Integration
 * TypeScript implementation for connecting to external AI services
 */

import { EventEmitter } from 'events';
import { 
  APIResponse, 
  SystemHealth, 
  OrderData,
  ChatRequest,
  ChatResponse 
} from './src/types.js';

/**
 * MCP Connection Configuration
 */
interface MCPConfig {
  endpoint: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableFallback: boolean;
}

/**
 * MCP Message Types
 */
interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
  timestamp: Date;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Client States
 */
type MCPConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

/**
 * Main MCP Client Class
 */
export class MCPClient extends EventEmitter {
  private config: MCPConfig;
  private connectionState: MCPConnectionState = 'disconnected';
  private messageId: number = 0;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval?: NodeJS.Timeout;
  private websocket?: WebSocket;

  constructor(config: Partial<MCPConfig> = {}) {
    super();
    
    this.config = {
      endpoint: process.env.MCP_ENDPOINT || 'ws://localhost:8080/mcp',
      apiKey: process.env.MCP_API_KEY,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableFallback: true,
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.on('connectionStateChange', (state: MCPConnectionState) => {
      console.log(`🔗 MCP Connection state changed: ${state}`);
    });

    this.on('error', (error: Error) => {
      console.error('❌ MCP Client error:', error);
    });

    this.on('message', (message: MCPMessage) => {
      this.handleIncomingMessage(message);
    });
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<boolean> {
    try {
      this.setConnectionState('connecting');
      console.log(`🔗 Connecting to MCP server: ${this.config.endpoint}`);

      // Check if WebSocket is supported
      if (typeof WebSocket === 'undefined') {
        throw new Error('WebSocket not supported in this environment');
      }

      return new Promise((resolve, reject) => {
        try {
          this.websocket = new WebSocket(this.config.endpoint);
          
          // Connection timeout
          const connectionTimeout = setTimeout(() => {
            if (this.websocket) {
              this.websocket.close();
            }
            reject(new Error('MCP connection timeout'));
          }, this.config.timeout);

          this.websocket.onopen = () => {
            clearTimeout(connectionTimeout);
            this.setConnectionState('connected');
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            console.log('✅ MCP connection established');
            resolve(true);
          };

          this.websocket.onmessage = (event) => {
            try {
              const message: MCPMessage = JSON.parse(event.data);
              this.emit('message', message);
            } catch (error) {
              console.error('Failed to parse MCP message:', error);
            }
          };

          this.websocket.onclose = (event) => {
            clearTimeout(connectionTimeout);
            this.setConnectionState('disconnected');
            this.stopHeartbeat();
            
            if (event.code !== 1000) { // Not a normal closure
              console.warn(`🔗 MCP connection closed: ${event.code} - ${event.reason}`);
              this.handleReconnection();
            }
          };

          this.websocket.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('🔗 MCP WebSocket error:', error);
            this.setConnectionState('error');
            this.emit('error', new Error('WebSocket connection failed'));
            reject(error);
          };

        } catch (error) {
          this.setConnectionState('error');
          reject(error);
        }
      });

    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      this.setConnectionState('error');
      return false;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    console.log('🔗 Disconnecting from MCP server...');
    
    this.stopHeartbeat();
    
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = undefined;
    }
    
    // Clear pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
    
    this.setConnectionState('disconnected');
    console.log('✅ MCP disconnected');
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && 
           this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): MCPConnectionState {
    return this.connectionState;
  }

  /**
   * Send chat message for AI processing
   */
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    const message: MCPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      method: 'chat.completion',
      params: {
        message: request.message,
        context: request.context,
        options: request.options || {}
      },
      timestamp: new Date()
    };

    return this.sendMessage(message);
  }

  /**
   * Get system health from MCP server
   */
  async getSystemHealth(): Promise<SystemHealth> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    const message: MCPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      method: 'system.health',
      params: {},
      timestamp: new Date()
    };

    return this.sendMessage(message);
  }

  /**
   * Send generic message and wait for response
   */
  private async sendMessage(message: MCPMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected() || !this.websocket) {
        reject(new Error('MCP client not connected'));
        return;
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`MCP request timeout: ${message.method}`));
      }, this.config.timeout);

      // Store pending request
      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout
      });

      // Send message
      try {
        this.websocket.send(JSON.stringify(message));
        console.log(`📤 MCP message sent: ${message.method} (${message.id})`);
      } catch (error) {
        this.pendingRequests.delete(message.id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(message: MCPMessage): void {
    console.log(`📥 MCP message received: ${message.type} (${message.id})`);

    if (message.type === 'response' && message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(`MCP Error: ${message.error.message}`));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.type === 'notification') {
      this.handleNotification(message);
    }
  }

  /**
   * Handle server notifications
   */
  private handleNotification(message: MCPMessage): void {
    switch (message.method) {
      case 'server.shutdown':
        console.log('🔗 MCP server is shutting down');
        this.disconnect();
        break;
        
      case 'system.health':
        this.emit('healthUpdate', message.params);
        break;
        
      case 'ai.model.changed':
        console.log(`🤖 AI model changed: ${message.params?.model}`);
        this.emit('modelChanged', message.params);
        break;
        
      default:
        console.log(`📢 MCP notification: ${message.method}`, message.params);
        this.emit('notification', message);
    }
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Maximum MCP reconnection attempts reached');
      this.setConnectionState('error');
      return;
    }

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;
    
    const delay = this.config.retryDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Attempting MCP reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('MCP reconnection failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ping();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Send ping to keep connection alive
   */
  private async ping(): Promise<void> {
    try {
      const message: MCPMessage = {
        id: this.generateMessageId(),
        type: 'request',
        method: 'system.ping',
        params: { timestamp: Date.now() },
        timestamp: new Date()
      };

      await this.sendMessage(message);
    } catch (error) {
      console.warn('MCP ping failed:', error);
    }
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: MCPConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChange', state);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `mcp_${Date.now()}_${++this.messageId}`;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    state: MCPConnectionState;
    reconnectAttempts: number;
    pendingRequests: number;
    isConnected: boolean;
  } {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      pendingRequests: this.pendingRequests.size,
      isConnected: this.isConnected()
    };
  }
}

/**
 * MCP Client Factory
 */
export class MCPClientFactory {
  private static instance: MCPClient | null = null;

  /**
   * Get singleton MCP client instance
   */
  static getInstance(config?: Partial<MCPConfig>): MCPClient {
    if (!this.instance) {
      this.instance = new MCPClient(config);
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
    }
  }
}

/**
 * Helper function to create and connect MCP client
 */
export async function createMCPClient(config?: Partial<MCPConfig>): Promise<MCPClient> {
  const client = new MCPClient(config);
  
  try {
    await client.connect();
    return client;
  } catch (error) {
    console.warn('Failed to connect MCP client, continuing without MCP support:', error);
    return client; // Return disconnected client for graceful degradation
  }
}

/**
 * Default export
 */
export default MCPClient;
