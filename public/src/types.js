/**
 * SAP MCP Ordering System - Type Definitions
 * Complete TypeScript interfaces for the ordering system
 */
// Error Types
export class OrderSystemError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'OrderSystemError';
    }
}
export class OllamaConnectionError extends Error {
    retryable;
    constructor(message, retryable = true) {
        super(message);
        this.retryable = retryable;
        this.name = 'OllamaConnectionError';
    }
}
//# sourceMappingURL=types.js.map