/**
 * SAP MCP Ordering System - Application Entry Point
 * TypeScript implementation with comprehensive error handling
 */

import { SAPOrderingSystem } from './app.js';
import {
  SystemHealth,
  NotificationType,
  OrderSystemError,
  OllamaConnectionError,
  OrderData
} from './types.js';
import { APP_CONFIG, ERROR_MESSAGES } from './data.js';

/**
 * Notification system for user feedback
 */
class NotificationManager {
  private container: HTMLElement;

  constructor() {
    this.container = document.body;
  }

  public show(message: string, type: NotificationType = 'info', duration: number = 5000): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${this.getIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
    `;

    this.container.appendChild(notification);

    // Auto-remove after specified duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, duration);
  }

  private getIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  public success(message: string): void {
    this.show(message, 'success');
  }

  public error(message: string): void {
    this.show(message, 'error', 8000);
  }

  public warning(message: string): void {
    this.show(message, 'warning', 6000);
  }

  public info(message: string): void {
    this.show(message, 'info');
  }
}

/**
 * Application initialization and lifecycle management
 */
class AppInitializer {
  private loadingScreen: HTMLElement | null;
  private mainContainer: HTMLElement | null;
  private orderingSystem: SAPOrderingSystem | null = null;
  private notifications: NotificationManager;

  constructor() {
    this.loadingScreen = document.getElementById('loadingScreen');
    this.mainContainer = document.getElementById('mainContainer');
    this.notifications = new NotificationManager();
  }

  /**
   * Main initialization sequence
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting SAP MCP Ordering System...');
      
      this.showLoadingScreen();
      
      await this.checkBrowserCompatibility();
      await this.waitForDOM();
      await this.checkBackendConnection();
      await this.initializeOrderingSystem();
      
      this.setupGlobalEventListeners();
      this.setupKeyboardShortcuts();
      this.setupModalHandlers();
      this.setupHeaderActions();
      
      this.hideLoadingScreen();
      
      console.log('✅ SAP MCP Ordering System started successfully');
      this.notifications.success('System ready! You can now create orders.');
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.showInitializationError(error as Error);
    }
  }

  /**
   * Show loading screen
   */
  private showLoadingScreen(): void {
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'flex';
    }
    if (this.mainContainer) {
      this.mainContainer.style.display = 'none';
    }
  }

  /**
   * Hide loading screen with animation
   */
  private hideLoadingScreen(): void {
    setTimeout(() => {
      if (this.loadingScreen) {
        this.loadingScreen.style.display = 'none';
      }
      if (this.mainContainer) {
        this.mainContainer.style.display = 'grid';
        this.mainContainer.style.animation = 'slideIn 0.5s ease-out';
      }
    }, 1000);
  }

  /**
   * Check browser compatibility
   */
  private async checkBrowserCompatibility(): Promise<void> {
    const requiredFeatures = [
      'fetch',
      'Promise', 
      'WebSocket',
      'localStorage',
      'sessionStorage'
    ];

    const missingFeatures = requiredFeatures.filter(feature =>
      !(feature in window) || typeof (window as any)[feature] === 'undefined'
    );

    if (missingFeatures.length > 0) {
      throw new OrderSystemError(
        `${ERROR_MESSAGES.BROWSER_INCOMPATIBLE}${missingFeatures.join(', ')}`,
        'BROWSER_INCOMPATIBLE',
        { missingFeatures }
      );
    }

    // Check ES6+ support
    try {
      eval('const test = () => {}; class Test {}; const [a, b] = [1, 2];');
    } catch {
      throw new OrderSystemError(
        'Browser does not support modern JavaScript (ES6+)',
        'ES6_UNSUPPORTED'
      );
    }

    console.log('✅ Browser compatibility check passed');
  }

  /**
   * Wait for DOM to be ready
   */
  private async waitForDOM(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Check backend connection and health
   */
  private async checkBackendConnection(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`${ERROR_MESSAGES.BACKEND_UNREACHABLE}: ${response.status}`);
      }

      const healthData: SystemHealth = await response.json();
      console.log('🏥 Backend Health Check:', healthData);

      // Check Ollama auth status — shows signin banner if unauthorized
      if (healthData.services?.ollama !== 'connected') {
        console.warn('⚠️ Ollama not connected - AI features may be limited');
        this.notifications.warning('AI service not available. Basic functions remain available.');
      } else {
        await this.checkOllamaAuth();
      }

      // Check other services
      if (healthData.services?.mcp === 'disconnected') {
        console.warn('⚠️ MCP service disconnected');
      }

    } catch (error) {
      console.warn('⚠️ Backend Health Check failed:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        this.notifications.warning('Backend connection timeout. System may run slower.');
      } else {
        this.notifications.warning('Backend connection unstable. Using local mode...');
      }
    }
  }

  /**
   * Check Ollama cloud auth — shows signin banner + polls until authenticated
   */
  private async checkOllamaAuth(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/ollama/auth-status', { signal: controller.signal });
      clearTimeout(timeoutId);

      const data: { authenticated: boolean; reason?: string } = await res.json();

      if (data.authenticated) {
        console.log('✅ Gemma4 31B cloud model is ready');
        return;
      }

      if (data.reason === 'unauthorized') {
        await this.showOllamaSigninBanner();
      } else {
        console.warn('⚠️ Ollama cloud model unavailable:', data.reason);
        this.notifications.warning('AI model unavailable. Basic functions remain active.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⚠️ Ollama auth check timed out');
      } else {
        console.warn('⚠️ Could not check Ollama auth status', error);
      }
    }
  }

  /**
   * Show signin banner, get connect URL via SSE, open it, poll until authed
   */
  private async showOllamaSigninBanner(): Promise<void> {
    const banner = document.createElement('div');
    banner.id = 'ollama-signin-banner';
    banner.className = 'notification notification-warning ollama-signin-banner';
    banner.style.cssText = [
      'position:fixed', 'top:16px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9999', 'min-width:360px', 'max-width:600px', 'padding:16px 20px',
      'display:flex', 'align-items:center', 'gap:12px',
      'background:rgba(255,255,255,0.92)', 'backdrop-filter:blur(20px)',
      'border:1px solid rgba(0,112,242,0.25)', 'border-radius:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.12)'
    ].join(';');

    banner.innerHTML = `
      <span style="font-size:20px">🔐</span>
      <div style="flex:1">
        <div style="font-weight:600;color:#131E29">Ollama sign-in required</div>
        <div style="font-size:13px;color:#6B7280;margin-top:2px" id="ollama-signin-status">Fetching sign-in URL…</div>
      </div>
      <button id="ollama-signin-btn"
              style="display:none;padding:8px 16px;background:#0070F2;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
        Sign in
      </button>
      <div id="ollama-signin-spinner"
           style="width:18px;height:18px;border:2px solid #E5E7EB;border-top-color:#0070F2;border-radius:50%;animation:spin 0.8s linear infinite"></div>
    `;
    document.body.appendChild(banner);

    // Inject spin keyframes once
    if (!document.getElementById('spin-style')) {
      const style = document.createElement('style');
      style.id = 'spin-style';
      style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }

    const statusEl = document.getElementById('ollama-signin-status')!;
    const btnEl = document.getElementById('ollama-signin-btn') as HTMLButtonElement;
    const spinnerEl = document.getElementById('ollama-signin-spinner')!;

    // Get connect URL via SSE
    const sse = new EventSource('/api/ollama/signin');
    let connectUrl = '';

    sse.addEventListener('url', (e: MessageEvent) => {
      const { url } = JSON.parse(e.data) as { url: string };
      connectUrl = url;
      spinnerEl.style.display = 'none';
      btnEl.style.display = 'block';
      statusEl.textContent = 'Click to open Ollama sign-in in your browser';
      btnEl.addEventListener('click', () => window.open(connectUrl, '_blank'));
    });

    sse.addEventListener('done', (e: MessageEvent) => {
      const { success } = JSON.parse(e.data) as { success: boolean };
      sse.close();
      if (success) {
        statusEl.textContent = 'Signed in — verifying…';
      }
    });

    sse.onerror = () => {
      sse.close();
      statusEl.textContent = 'Could not launch sign-in. Run `ollama signin` manually.';
      spinnerEl.style.display = 'none';
    };

    // Poll auth status every 3 s until authenticated
    const pollInterval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('/api/ollama/auth-status', { signal: controller.signal });
        clearTimeout(timeoutId);

        const data: { authenticated: boolean } = await res.json();
        if (data.authenticated) {
          clearInterval(pollInterval);
          sse.close();
          banner.remove();
          this.notifications.success('Signed in to Ollama — Gemma4 31B cloud model ready!');
          console.log('✅ Ollama cloud auth confirmed');
        }
      } catch (error) {
        console.warn('Polling error:', error);
      }
    }, 3000);
  }

  /**
   * Initialize the main ordering system
   */
  private async initializeOrderingSystem(): Promise<void> {
    try {
      this.orderingSystem = new SAPOrderingSystem();
      
      // Make globally available for debugging and external access
      (window as any).orderSystem = this.orderingSystem;
      
      // Setup event listeners for system events
      this.orderingSystem.on('orderSubmitted', (orderData: OrderData) => {
        console.log('📋 Order submitted:', orderData);
        this.notifications.success(`Order ${orderData.orderNumber} submitted successfully!`);
      });

      this.orderingSystem.on('orderConfirmed', (orderData: OrderData) => {
        console.log('✅ Order confirmed:', orderData);
        this.notifications.success(`Order ${orderData.orderNumber} confirmed!`);
      });

      this.orderingSystem.on('chatCleared', () => {
        console.log('🧹 Chat history cleared');
        this.notifications.info('Chat history cleared');
      });

      this.orderingSystem.on('newOrderStarted', () => {
        console.log('🆕 New order started');
        this.notifications.info('New order started');
      });
      
      console.log('✅ Ordering System initialized');
      
    } catch (error) {
      console.error('Failed to initialize ordering system:', error);
      throw new OrderSystemError(
        'Error initializing the ordering system',
        'ORDERING_SYSTEM_INIT_FAILED',
        error
      );
    }
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalEventListeners(): void {
    // Online/Offline Status
    window.addEventListener('online', () => {
      this.notifications.success('Internet connection restored');
      this.checkBackendConnection();
    });

    window.addEventListener('offline', () => {
      this.notifications.warning('No internet connection. Offline mode activated.');
    });

    // Window resize handler
    window.addEventListener('resize', this.debounce(() => {
      this.handleWindowResize();
    }, 250));

    // Before unload warning for unsaved orders
    window.addEventListener('beforeunload', (event) => {
      if (this.orderingSystem?.getState().hasActiveOrder) {
        event.preventDefault();
        event.returnValue = 'You have an active order. Are you sure you want to leave?';
        return event.returnValue;
      }
    });

    console.log('✅ Global event listeners setup complete');
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Ctrl/Cmd + Enter for quick send
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
        if (messageInput && document.activeElement === messageInput) {
          event.preventDefault();
          this.orderingSystem?.sendMessage();
        }
      }

      // Escape to close modals
      if (event.key === 'Escape') {
        this.closeAllModals();
      }

      // Ctrl/Cmd + K to focus search/input
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
        if (messageInput) {
          messageInput.focus();
        }
      }

      // Ctrl/Cmd + Shift + C to clear chat
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.clearOrderHistory();
      }

      // Ctrl/Cmd + N for new order
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        this.startNewOrder();
      }
    });

    console.log('✅ Keyboard shortcuts configured');
  }

  /**
   * Setup modal handlers
   */
  private setupModalHandlers(): void {
    // Settings Modal
    const settingsBtn = document.getElementById('chatSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
      });
    }

    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
      });
    }

    // Modal overlay click to close
    if (settingsModal) {
      settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
          settingsModal.style.display = 'none';
        }
      });
    }

    // Temperature slider handler
    const temperatureSlider = document.getElementById('temperature') as HTMLInputElement;
    const temperatureValue = document.getElementById('temperatureValue');

    if (temperatureSlider && temperatureValue) {
      temperatureSlider.addEventListener('input', () => {
        temperatureValue.textContent = temperatureSlider.value;
      });
    }

    console.log('✅ Modal handlers setup complete');
  }

  /**
   * Setup header action buttons
   */
  private setupHeaderActions(): void {
    // Clear orders button
    const clearOrdersBtn = document.getElementById('clearOrdersBtn');
    if (clearOrdersBtn) {
      clearOrdersBtn.addEventListener('click', () => {
        this.clearOrderHistory();
      });
    }

    // New order button
    const newOrderBtn = document.getElementById('newOrderBtn');
    if (newOrderBtn) {
      newOrderBtn.addEventListener('click', () => {
        this.startNewOrder();
      });
    }

    console.log('✅ Header actions setup complete');
  }

  /**
   * Close all open modals
   */
  private closeAllModals(): void {
    const modals = document.querySelectorAll('.modal-overlay') as NodeListOf<HTMLElement>;
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }

  /**
   * Clear order history with confirmation
   */
  private clearOrderHistory(): void {
    if (this.orderingSystem) {
      this.orderingSystem.clearChatHistory();
    } else {
      // Fallback when ordering system not available
      if (confirm('Do you really want to delete the entire chat history?')) {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
          const systemMessages = chatMessages.querySelectorAll('.message.system');
          chatMessages.innerHTML = '';
          systemMessages.forEach(msg => chatMessages.appendChild(msg));
        }
        
        const orderDetails = document.getElementById('orderDetails');
        if (orderDetails) {
          orderDetails.style.display = 'none';
        }
        
        const defaultCard = document.getElementById('defaultCard');
        if (defaultCard) {
          defaultCard.style.display = 'block';
        }
        
        this.notifications.success('Chat history cleared');
      }
    }
  }

  /**
   * Start new order
   */
  private startNewOrder(): void {
    if (this.orderingSystem) {
      this.orderingSystem.startNewOrder();
    }

    // Focus message input
    const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.focus();
      messageInput.placeholder = 'Describe new order...';
    }
  }

  /**
   * Handle window resize events
   */
  private handleWindowResize(): void {
    // Responsive adjustments can be added here
    const width = window.innerWidth;
    
    if (width < 768) {
      // Mobile adjustments
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }

  /**
   * Show initialization error screen
   */
  private showInitializationError(error: Error): void {
    // Hide loading screen
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'none';
    }

    // Create error screen
    const errorScreen = document.createElement('div');
    errorScreen.className = 'error-screen';
    errorScreen.innerHTML = `
      <div class="error-content">
        <h1>❌ Initialization Error</h1>
        <p>The SAP MCP Ordering System could not be started.</p>
        <div class="error-details">
          <strong>Error:</strong> ${error.message}
        </div>
        <div class="error-actions">
          <button onclick="location.reload()" class="btn btn-primary">
            🔄 Reload
          </button>
          <button onclick="window.open('/api/health', '_blank')" class="btn btn-secondary">
            🏥 Check System Status
          </button>
        </div>
        <div class="error-help">
          <h3>Possible Solutions:</h3>
          <ul>
            <li>Check if the server is running</li>
            <li>Make sure Ollama is started with: <code>ollama serve</code></li>
            <li>Install Gemma4 model: <code>ollama pull gemma4:31b</code></li>
            <li>Check your internet connection</li>
            <li>Try a different browser</li>
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(errorScreen);
  }

  /**
   * Debounce utility function
   */
  private debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

/**
 * Global notification functions for external use
 */
const notificationManager = new NotificationManager();

export function showNotification(message: string, type: NotificationType = 'info'): void {
  notificationManager.show(message, type);
}

export function showSuccessNotification(message: string): void {
  notificationManager.success(message);
}

export function showErrorNotification(message: string): void {
  notificationManager.error(message);
}

export function showWarningNotification(message: string): void {
  notificationManager.warning(message);
}

export function showInfoNotification(message: string): void {
  notificationManager.info(message);
}

// Make notification functions globally available
(window as any).showSuccessNotification = showSuccessNotification;
(window as any).showErrorNotification = showErrorNotification;
(window as any).showWarningNotification = showWarningNotification;
(window as any).showInfoNotification = showInfoNotification;

/**
 * Application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
  const appInitializer = new AppInitializer();
  appInitializer.initialize().catch(error => {
    console.error('Critical initialization error:', error);
  });
});

// Error boundary for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showErrorNotification('An unexpected error occurred');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showErrorNotification('A network error occurred');
});

// Export main classes for potential external use
export { AppInitializer, NotificationManager };