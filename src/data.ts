/**
 * SAP MCP Ordering System - Data Models and Mock Data
 * Centralized data management for the application
 */

import { 
  Material, 
  Vendor, 
  UserData, 
  TransactionData, 
  AppConfig,
  SAPTransactionCode,
  UserRole 
} from './types.js';

/**
 * Application Configuration
 */
export const APP_CONFIG: AppConfig = {
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: 'qwen:1.8b',
    timeout: 30000,
    temperature: 0.3,
    maxTokens: 800
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
    cors: true
  },
  features: {
    autoSubmit: true,
    localOnly: true,
    debugMode: process.env.NODE_ENV === 'development'
  }
};

/**
 * Mock Materials Database
 */
export const MATERIALS: Material[] = [
  {
    id: "MAT001",
    name: "Screws M6x20",
    description: "Hex screws DIN 933, galvanized steel",
    unit: "PCS",
    price: 0.15,
    category: "Fastening Technology",
    stockLevel: 5000,
    minOrderQuantity: 50,
    maxOrderQuantity: 10000
  },
  {
    id: "MAT002",
    name: "Nuts M6",
    description: "Hex nuts DIN 934, galvanized steel",
    unit: "PCS",
    price: 0.08,
    category: "Fastening Technology",
    stockLevel: 3000,
    minOrderQuantity: 100,
    maxOrderQuantity: 15000
  },
  {
    id: "MAT003",
    name: "Office Supply Set",
    description: "Complete set: pens, paper, stapler, clips",
    unit: "SET",
    price: 25.50,
    category: "Office Supplies",
    stockLevel: 150,
    minOrderQuantity: 1,
    maxOrderQuantity: 100
  },
  {
    id: "MAT004",
    name: "Printer Paper A4",
    description: "White copy paper 80gsm, 500 sheets per pack",
    unit: "PKG",
    price: 4.99,
    category: "Office Supplies",
    stockLevel: 500,
    minOrderQuantity: 5,
    maxOrderQuantity: 200
  },
  {
    id: "MAT005",
    name: "Laptop Stand",
    description: "Ergonomic adjustable laptop stand, aluminum",
    unit: "PCS",
    price: 89.99,
    category: "IT Accessories",
    stockLevel: 25,
    minOrderQuantity: 1,
    maxOrderQuantity: 50
  },
  {
    id: "MAT006",
    name: "Cable Channel",
    description: "Plastic cable management channel 2m length",
    unit: "PCS",
    price: 12.45,
    category: "Electrical",
    stockLevel: 200,
    minOrderQuantity: 10,
    maxOrderQuantity: 500
  },
  {
    id: "MAT007",
    name: "Industrial Cleaner",
    description: "Multi-purpose industrial cleaning solution",
    unit: "CAN",
    price: 35.80,
    category: "Operating Supplies",
    stockLevel: 80,
    minOrderQuantity: 1,
    maxOrderQuantity: 50
  },
  {
    id: "MAT008",
    name: "Safety Gloves",
    description: "Cut-resistant work gloves, size L",
    unit: "PAIR",
    price: 8.50,
    category: "Safety Equipment",
    stockLevel: 120,
    minOrderQuantity: 10,
    maxOrderQuantity: 200
  }
];

/**
 * Mock Vendors Database
 */
export const VENDORS: Vendor[] = [
  {
    id: "V001",
    name: "Müller Inc.",
    location: "Munich, Germany",
    contact: "Hans Müller",
    email: "orders@mueller-inc.com",
    phone: "+49 89 987654321",
    rating: 4.5,
    paymentTerms: "30 days net",
    deliveryTerms: "Standard shipping included",
    isActive: true
  },
  {
    id: "V002", 
    name: "Schmidt Corp.",
    location: "Hamburg, Germany",
    contact: "Anna Schmidt",
    email: "procurement@schmidt-corp.de",
    phone: "+49 40 123456789",
    rating: 4.2,
    paymentTerms: "14 days 2% discount",
    deliveryTerms: "Express delivery available",
    isActive: true
  },
  {
    id: "V003",
    name: "Weber & Co",
    location: "Berlin, Germany", 
    contact: "Michael Weber",
    email: "sales@weber-co.de",
    phone: "+49 30 555666777",
    rating: 4.7,
    paymentTerms: "Payment on delivery",
    deliveryTerms: "Same-day delivery in Berlin",
    isActive: true
  },
  {
    id: "V004",
    name: "Bauer Industries",
    location: "Stuttgart, Germany",
    contact: "Lisa Bauer",
    email: "orders@bauer-industries.com",
    phone: "+49 711 888999000",
    rating: 4.0,
    paymentTerms: "45 days net",
    deliveryTerms: "Bulk order discounts available",
    isActive: true
  },
  {
    id: "V005",
    name: "Fischer Tech Solutions",
    location: "Nuremberg, Germany",
    contact: "Thomas Fischer",
    email: "info@fischer-tech.de",
    phone: "+49 911 111222333",
    rating: 4.8,
    paymentTerms: "30 days net",
    deliveryTerms: "Technical support included",
    isActive: true
  }
];

/**
 * Mock User Data
 */
export const MOCK_USER: UserData = {
  id: "USER001",
  name: "John Doe",
  email: "john.doe@company.com",
  department: "Procurement",
  costCenter: "4200",
  role: "User" as UserRole,
  permissions: ["CREATE_ORDER", "VIEW_ALL_ORDERS"]
};

/**
 * SAP Transaction Configuration
 */
export const SAP_TRANSACTIONS: TransactionData[] = [
  {
    code: "ME21N" as SAPTransactionCode,
    name: "Create Purchase Order",
    description: "Create new purchase orders with AI assistance",
    isActive: true,
    icon: "🛒",
    category: "Purchasing"
  },
  {
    code: "ME22N" as SAPTransactionCode,
    name: "Change Purchase Order", 
    description: "Modify existing purchase orders",
    isActive: true,
    icon: "✏️",
    category: "Purchasing"
  },
  {
    code: "ME23N" as SAPTransactionCode,
    name: "Display Purchase Order",
    description: "View purchase order details and history", 
    isActive: true,
    icon: "👁️",
    category: "Purchasing"
  },
  {
    code: "MIGO" as SAPTransactionCode,
    name: "Goods Receipt",
    description: "Post goods receipts for delivered items",
    isActive: true,
    icon: "📦",
    category: "Inventory"
  },
  {
    code: "MM03" as SAPTransactionCode,
    name: "Display Material",
    description: "View material master data and stock levels",
    isActive: true,
    icon: "🏷️",
    category: "Inventory"
  }
];

/**
 * Priority Keywords for AI Analysis
 */
export const PRIORITY_KEYWORDS = {
  urgent: ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'rush'],
  high: ['important', 'priority', 'quick', 'fast', 'expedite', 'soon'],
  normal: ['normal', 'standard', 'regular', 'whenever', 'sometime']
};

/**
 * Material Category Mappings
 */
export const CATEGORY_MAPPINGS: Record<string, string[]> = {
  "Fastening Technology": ["screw", "bolt", "nut", "washer", "fastener", "anchor"],
  "Office Supplies": ["paper", "pen", "pencil", "stapler", "folder", "office"],
  "IT Accessories": ["laptop", "computer", "cable", "adapter", "stand", "tech"],
  "Electrical": ["wire", "cable", "connector", "outlet", "switch", "electrical"],
  "Operating Supplies": ["cleaner", "oil", "lubricant", "chemical", "supply"],
  "Safety Equipment": ["glove", "helmet", "safety", "protection", "guard"]
};

/**
 * Vendor Specializations
 */
export const VENDOR_SPECIALIZATIONS: Record<string, string[]> = {
  "V001": ["Fastening Technology", "Safety Equipment"],
  "V002": ["Office Supplies", "Operating Supplies"], 
  "V003": ["IT Accessories", "Electrical"],
  "V004": ["Office Supplies", "Operating Supplies"],
  "V005": ["IT Accessories", "Electrical", "Safety Equipment"]
};

/**
 * System Constants
 */
export const SYSTEM_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_CHAT_HISTORY: 100,
  DEFAULT_DELIVERY_DAYS: 5,
  VAT_RATE: 0.19,
  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',
  DATE_FORMAT: 'en-US',
  COMPANY_NAME: 'ACME Corporation',
  SYSTEM_VERSION: '2.1.0'
};

/**
 * UI Text Constants
 */
export const UI_TEXT = {
  WELCOME_MESSAGE: `Hello! I'm your SAP assistant with Ollama Qwen 3:1.7b integration. You can describe an order to me and I'll create it automatically for you.

**Examples:**
• "I need 50 screws M6x20 from Müller Inc."
• "Order 10 laptop stands for the IT department"  
• "Urgently need 100 sheets of A4 printer paper"

*Just speak naturally with me!*`,

  SYSTEM_READY: 'MCP connection to SAP established ✅',
  
  QWEN_ANALYZING: '🤖 AI analyzing your request',
  
  TRANSACTION_EXECUTING: '🔄 Executing SAP transaction ME21N...',
  
  ORDER_SUBMITTED: '🚀 Order automatically submitted!',
  
  READY_FOR_NEXT: '🆕 Ready for the next order!',
  
  CHAT_CLEARED: '🧹 Chat history cleared',
  
  NEW_ORDER_STARTED: '🆕 New order started'
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  QWEN_UNAVAILABLE: 'Local Qwen 3:1.7b model is required for SAP orders.',
  BROWSER_INCOMPATIBLE: 'Browser not compatible. Missing features: ',
  BACKEND_UNREACHABLE: 'Backend not reachable',
  INVALID_ORDER_DATA: 'Invalid order data received',
  NETWORK_ERROR: 'A network error occurred',
  SYSTEM_ERROR: 'An unexpected error occurred'
};

/**
 * Helper Functions
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `PO${timestamp}`;
}

export function calculateDeliveryDate(days: number = SYSTEM_CONSTANTS.DEFAULT_DELIVERY_DAYS): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString(SYSTEM_CONSTANTS.DATE_FORMAT);
}

export function findMaterialByKeyword(keyword: string): Material | null {
  const lowerKeyword = keyword.toLowerCase();
  
  return MATERIALS.find(material => 
    material.name.toLowerCase().includes(lowerKeyword) ||
    material.description.toLowerCase().includes(lowerKeyword) ||
    material.category.toLowerCase().includes(lowerKeyword)
  ) || null;
}

export function findVendorByName(name: string): Vendor | null {
  const lowerName = name.toLowerCase();
  
  return VENDORS.find(vendor =>
    vendor.name.toLowerCase().includes(lowerName) ||
    vendor.contact.toLowerCase().includes(lowerName)
  ) || null;
}

export function getVendorsByCategory(category: string): Vendor[] {
  return VENDORS.filter(vendor => {
    const vendorCategories = VENDOR_SPECIALIZATIONS[vendor.id] || [];
    return vendorCategories.includes(category);
  });
}

export function formatCurrency(amount: number): string {
  return `${SYSTEM_CONSTANTS.CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

export function calculateTotalWithTax(netAmount: number): number {
  return netAmount * (1 + SYSTEM_CONSTANTS.VAT_RATE);
}