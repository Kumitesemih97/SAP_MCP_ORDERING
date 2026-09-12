/**
 * SAP MCP Ordering System - Main Application Logic
 * TypeScript implementation with full type safety
 */
import { OrderData, MessageType } from './types.js';
/**
 * Main SAP Ordering System Class
 */
export declare class SAPOrderingSystem {
    private isProcessing;
    private currentOrder;
    private messageHistory;
    private domElements;
    private eventHandlers;
    constructor();
    /**
     * Initialize DOM elements with proper type checking
     */
    private initializeDOMElements;
    /**
     * Validate that all required DOM elements exist
     */
    private validateDOMElements;
    /**
     * Initialize the application
     */
    private init;
    /**
     * Setup event listeners with proper typing
     */
    private setupEventListeners;
    /**
     * Auto-resize textarea based on content
     */
    private autoResizeTextarea;
    /**
     * Update character counter display
     */
    private updateCharCounter;
    /**
     * Update send button state
     */
    private updateSendButton;
    /**
     * Setup menu interactions for SAP transactions
     */
    private setupMenuInteractions;
    /**
     * Initialize chat with welcome messages
     */
    private initializeChat;
    /**
     * Add a new message to the chat
     */
    addMessage(content: string, type?: MessageType): void;
    /**
     * Add message to history with limit
     */
    private addMessageToHistory;
    /**
     * Render message in the chat interface
     */
    private renderMessage;
    /**
     * Show typing indicator
     */
    private showTypingIndicator;
    /**
     * Remove typing indicator
     */
    private removeTypingIndicator;
    /**
     * Send message and process order
     */
    sendMessage(): Promise<void>;
    /**
     * Process order with local Qwen model
     */
    private processOrderWithQwen;
    /**
     * Handle successful order processing
     */
    private handleSuccessfulOrder;
    /**
     * Automatically submit order
     */
    private automaticOrderSubmission;
    /**
     * Show Qwen connection error
     */
    private showQwenError;
    /**
     * Display order details in the UI
     */
    private displayOrderDetails;
    /**
     * Create order form HTML
     */
    private createOrderForm;
    /**
     * Handle SAP transaction selection
     */
    private handleTransactionSelection;
    /**
     * Handle ME21N - Create Purchase Order
     */
    private handleME21N;
    /**
     * Handle ME22N - Change Purchase Order
     */
    private handleME22N;
    /**
     * Handle ME23N - Display Purchase Order
     */
    private handleME23N;
    /**
     * Handle MIGO - Goods Receipt
     */
    private handleMIGO;
    /**
     * Handle MM03 - Display Material
     */
    private handleMM03;
    /**
     * Clear chat history
     */
    clearChatHistory(): void;
    /**
     * Confirm order manually
     */
    confirmOrder(): void;
    /**
     * Start new order
     */
    startNewOrder(): void;
    /**
     * Reset the system state
     */
    reset(): void;
    /**
     * Utility method to create delays
     */
    private delay;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
    /**
     * Event system for extensibility
     */
    private emit;
    /**
     * Add event listener
     */
    on(event: string, handler: Function): void;
    /**
     * Remove event listener
     */
    off(event: string, handler: Function): void;
    /**
     * Get current system state
     */
    getState(): {
        isProcessing: boolean;
        currentOrder: OrderData | null;
        messageCount: number;
        hasActiveOrder: boolean;
    };
}
export default SAPOrderingSystem;
//# sourceMappingURL=app.d.ts.map