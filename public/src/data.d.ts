/**
 * SAP MCP Ordering System - Data Models and Mock Data
 * Centralized data management for the application
 */
import { Material, Vendor, UserData, TransactionData, AppConfig } from './types.js';
/**
 * Application Configuration
 */
export declare const APP_CONFIG: AppConfig;
/**
 * Mock Materials Database
 */
export declare const MATERIALS: Material[];
/**
 * Mock Cost Center Budgets
 */
export declare const COST_CENTER_BUDGETS: Record<string, number>;
/**
 * Mock Vendors Database
 */
export declare const VENDORS: Vendor[];
/**
 * Mock User Data
 */
export declare const MOCK_USER: UserData;
/**
 * SAP Transaction Configuration
 */
export declare const SAP_TRANSACTIONS: TransactionData[];
/**
 * Priority Keywords for AI Analysis
 */
export declare const PRIORITY_KEYWORDS: {
    urgent: string[];
    high: string[];
    normal: string[];
};
/**
 * Material Category Mappings
 */
export declare const CATEGORY_MAPPINGS: Record<string, string[]>;
/**
 * Vendor Specializations
 */
export declare const VENDOR_SPECIALIZATIONS: Record<string, string[]>;
/**
 * System Constants
 */
export declare const SYSTEM_CONSTANTS: {
    MAX_MESSAGE_LENGTH: number;
    MAX_CHAT_HISTORY: number;
    DEFAULT_DELIVERY_DAYS: number;
    VAT_RATE: number;
    CURRENCY: string;
    CURRENCY_SYMBOL: string;
    DATE_FORMAT: string;
    COMPANY_NAME: string;
    SYSTEM_VERSION: string;
};
/**
 * Purchase Order Business Configuration
 */
export declare const PO_CONFIG: {
    APPROVAL_THRESHOLD: number;
    DELIVERY_DAYS: Record<string, number>;
};
/**
 * UI Text Constants
 */
export declare const UI_TEXT: {
    WELCOME_MESSAGE: string;
    SYSTEM_READY: string;
    QWEN_ANALYZING: string;
    TRANSACTION_EXECUTING: string;
    ORDER_SUBMITTED: string;
    READY_FOR_NEXT: string;
    CHAT_CLEARED: string;
    NEW_ORDER_STARTED: string;
};
/**
 * Error Messages
 */
export declare const ERROR_MESSAGES: {
    QWEN_UNAVAILABLE: string;
    BROWSER_INCOMPATIBLE: string;
    BACKEND_UNREACHABLE: string;
    INVALID_ORDER_DATA: string;
    NETWORK_ERROR: string;
    SYSTEM_ERROR: string;
};
/**
 * Helper Functions
 */
export declare function generateOrderNumber(): string;
export declare function calculateDeliveryDate(days?: number): string;
export declare function findMaterialByKeyword(keyword: string): Material | null;
export declare function findVendorByName(name: string): Vendor | null;
export declare function getVendorsByCategory(category: string): Vendor[];
export declare function formatCurrency(amount: number): string;
export declare function calculateTotalWithTax(netAmount: number): number;
//# sourceMappingURL=data.d.ts.map