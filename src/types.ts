/**
 * SAP MCP Ordering System - Type Definitions
 * Complete TypeScript interfaces for the ordering system
 */

export interface Material {
  id: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  category: string;
  stockLevel?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
}

export interface Vendor {
  id: string;
  name: string;
  location: string;
  contact: string;
  email: string;
  phone: string;
  rating: number;
  paymentTerms: string;
  deliveryTerms?: string;
  isActive?: boolean;
}

export interface OrderData {
  orderNumber: string;
  quantity: number;
  material: Material;
  vendor: Vendor;
  totalPrice: number;
  deliveryDate: string;
  deliveryDays: number;
  requestedBy: string;
  costCenter: string;
  priority: Priority;
  notes: string;
  status?: OrderStatus;
  processedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  isLoading?: boolean;
  orderData?: OrderData;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  orderData?: OrderData;
  requiresLocal?: boolean;
  localOnly?: boolean;
}

export interface OllamaResponse {
  success: boolean;
  response?: string;
  model?: string;
  created_at?: string;
  done?: boolean;
  error?: string;
  localOnly?: boolean;
}

export interface ChatContext {
  user?: UserData;
  materials?: Material[];
  vendors?: Vendor[];
  localOnly?: boolean;
  autoSubmit?: boolean;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  department: string;
  costCenter: string;
  role: UserRole;
  permissions: Permission[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    ollama: 'connected' | 'disconnected' | 'error';
    mcp: 'connected' | 'disconnected' | 'error';
    database?: 'connected' | 'disconnected' | 'error';
  };
  uptime: number;
  version: string;
  timestamp: string;
}

export interface OrderAnalysis {
  quantity: number;
  materialName: string;
  category: string;
  vendorPreference: string | null;
  priority: Priority;
  notes: string;
  confidence: number;
  originalMessage: string;
  processedBy: string;
}

export interface TransactionData {
  code: SAPTransactionCode;
  name: string;
  description: string;
  isActive: boolean;
  icon: string;
  category: TransactionCategory;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  isRead: boolean;
  autoHide?: boolean;
  duration?: number;
}

// Enums and Union Types
export type MessageType = 'user' | 'ai' | 'system';
export type Priority = 'Normal' | 'High' | 'Urgent';
export type OrderStatus = 'Draft' | 'Created' | 'Submitted' | 'Approved' | 'Shipped' | 'Delivered' | 'Cancelled';
export type UserRole = 'User' | 'Approver' | 'Administrator' | 'Purchasing';
export type Permission = 'CREATE_ORDER' | 'APPROVE_ORDER' | 'VIEW_ALL_ORDERS' | 'MODIFY_SYSTEM' | 'ACCESS_ANALYTICS';
export type SAPTransactionCode = 'ME21N' | 'ME22N' | 'ME23N' | 'MIGO' | 'MM03' | 'ME51N' | 'ME52N' | 'ME53N';
export type TransactionCategory = 'Purchasing' | 'Inventory' | 'Requisition' | 'Analytics';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Event Types
export interface OrderEvent {
  type: 'ORDER_CREATED' | 'ORDER_SUBMITTED' | 'ORDER_APPROVED' | 'ORDER_CANCELLED';
  orderData: OrderData;
  timestamp: Date;
  userId: string;
}

export interface SystemEvent {
  type: 'SYSTEM_STARTED' | 'SYSTEM_ERROR' | 'CONNECTION_LOST' | 'CONNECTION_RESTORED';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Configuration Types
export interface AppConfig {
  ollama: {
    baseUrl: string;
    model: string;
    timeout: number;
    temperature: number;
    maxTokens: number;
  };
  server: {
    port: number;
    host: string;
    cors: boolean;
  };
  features: {
    autoSubmit: boolean;
    localOnly: boolean;
    debugMode: boolean;
  };
}

// DOM Element Types
export interface DOMElements {
  chatMessages: HTMLElement;
  messageInput: HTMLTextAreaElement;
  sendBtn: HTMLButtonElement;
  loadingScreen?: HTMLElement;
  mainContainer?: HTMLElement;
  orderDetails?: HTMLElement;
  defaultCard?: HTMLElement;
}

// Error Types
export class OrderSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OrderSystemError';
  }
}

export class QwenConnectionError extends Error {
  constructor(message: string, public retryable: boolean = true) {
    super(message);
    this.name = 'QwenConnectionError';
  }
}

// Utility Types
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Function Types
export type MessageHandler = (message: ChatMessage) => void;
export type OrderSubmissionHandler = (orderData: OrderData) => Promise<boolean>;
export type ErrorHandler = (error: Error) => void;
export type EventListener<T> = (event: T) => void;

// API Types
export interface ChatRequest {
  message: string;
  context?: ChatContext;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

export interface HealthCheckResponse extends APIResponse<SystemHealth> {}
export interface ChatResponse extends APIResponse<OrderData> {}
export interface OrderSubmissionResponse extends APIResponse<{orderId: string}> {}