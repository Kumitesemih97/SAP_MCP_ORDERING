/**
 * SAP MCP Ordering System - Application Entry Point
 * TypeScript implementation with comprehensive error handling
 */
import { NotificationType } from './types.js';
/**
 * Notification system for user feedback
 */
declare class NotificationManager {
    private container;
    constructor();
    show(message: string, type?: NotificationType, duration?: number): void;
    private getIcon;
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    info(message: string): void;
}
/**
 * Application initialization and lifecycle management
 */
declare class AppInitializer {
    private loadingScreen;
    private mainContainer;
    private orderingSystem;
    private notifications;
    constructor();
    /**
     * Main initialization sequence
     */
    initialize(): Promise<void>;
    /**
     * Show loading screen
     */
    private showLoadingScreen;
    /**
     * Hide loading screen with animation
     */
    private hideLoadingScreen;
    /**
     * Check browser compatibility
     */
    private checkBrowserCompatibility;
    /**
     * Wait for DOM to be ready
     */
    private waitForDOM;
    /**
     * Check backend connection and health
     */
    private checkBackendConnection;
    /**
     * Check Ollama cloud auth — shows signin banner + polls until authenticated
     */
    private checkOllamaAuth;
    /**
     * Show signin banner, get connect URL via SSE, open it, poll until authed
     */
    private showOllamaSigninBanner;
    /**
     * Initialize the main ordering system
     */
    private initializeOrderingSystem;
    /**
     * Setup global event listeners
     */
    private setupGlobalEventListeners;
    /**
     * Setup keyboard shortcuts
     */
    private setupKeyboardShortcuts;
    /**
     * Setup modal handlers
     */
    private setupModalHandlers;
    /**
     * Setup header action buttons
     */
    private setupHeaderActions;
    /**
     * Close all open modals
     */
    private closeAllModals;
    /**
     * Clear order history with confirmation
     */
    private clearOrderHistory;
    /**
     * Start new order
     */
    private startNewOrder;
    /**
     * Handle window resize events
     */
    private handleWindowResize;
    /**
     * Show initialization error screen
     */
    private showInitializationError;
    /**
     * Debounce utility function
     */
    private debounce;
}
export declare function showNotification(message: string, type?: NotificationType): void;
export declare function showSuccessNotification(message: string): void;
export declare function showErrorNotification(message: string): void;
export declare function showWarningNotification(message: string): void;
export declare function showInfoNotification(message: string): void;
export { AppInitializer, NotificationManager };
//# sourceMappingURL=main.d.ts.map