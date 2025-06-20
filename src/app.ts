/**
 * SAP MCP Ordering System - Main Application Logic
 * TypeScript implementation with full type safety
 */

import {
  ChatMessage,
  OrderData,
  Material,
  Vendor,
  DOMElements,
  MessageType,
  Priority,
  SAPTransactionCode,
  APIResponse,
  OrderSystemError,
  QwenConnectionError,
  MessageHandler,
  OrderSubmissionHandler
} from './types.js';

import {
  MATERIALS,
  VENDORS,
  MOCK_USER,
  SAP_TRANSACTIONS,
  PRIORITY_KEYWORDS,
  SYSTEM_CONSTANTS,
  UI_TEXT,
  ERROR_MESSAGES,
  generateOrderNumber,
  calculateDeliveryDate,
  findMaterialByKeyword,
  findVendorByName,
  formatCurrency,
  calculateTotalWithTax
} from './data.js';

/**
 * Main SAP Ordering System Class
 */
export class SAPOrderingSystem {
  private isProcessing: boolean = false;
  private currentOrder: OrderData | null = null;
  private messageHistory: ChatMessage[] = [];
  private domElements: DOMElements;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor() {
    this.domElements = this.initializeDOMElements();
    this.validateDOMElements();
    this.init();
  }

  /**
   * Initialize DOM elements with proper type checking
   */
  private initializeDOMElements(): DOMElements {
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;

    if (!chatMessages || !messageInput || !sendBtn) {
      throw new OrderSystemError(
        'Required DOM elements not found',
        'DOM_MISSING',
        { chatMessages: !!chatMessages, messageInput: !!messageInput, sendBtn: !!sendBtn }
      );
    }

    return {
      chatMessages,
      messageInput,
      sendBtn,
      loadingScreen: document.getElementById('loadingScreen') || undefined,
      mainContainer: document.getElementById('mainContainer') || undefined,
      orderDetails: document.getElementById('orderDetails') || undefined,
      defaultCard: document.getElementById('defaultCard') || undefined
    };
  }

  /**
   * Validate that all required DOM elements exist
   */
  private validateDOMElements(): void {
    const required = ['chatMessages', 'messageInput', 'sendBtn'];
    const missing = required.filter(key => !this.domElements[key as keyof DOMElements]);
    
    if (missing.length > 0) {
      throw new OrderSystemError(
        `Missing required DOM elements: ${missing.join(', ')}`,
        'DOM_VALIDATION_FAILED',
        { missing }
      );
    }
  }

  /**
   * Initialize the application
   */
  private init(): void {
    this.setupEventListeners();
    this.setupMenuInteractions();
    this.initializeChat();
    console.log('✅ SAP Ordering System initialized successfully');
  }

  /**
   * Setup event listeners with proper typing
   */
  private setupEventListeners(): void {
    // Enter key for sending messages
    this.domElements.messageInput.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !this.isProcessing) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button click
    this.domElements.sendBtn.addEventListener('click', () => {
      if (!this.isProcessing) {
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.domElements.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
      this.updateCharCounter();
      this.updateSendButton();
    });
  }

  /**
   * Auto-resize textarea based on content
   */
  private autoResizeTextarea(): void {
    const input = this.domElements.messageInput;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  /**
   * Update character counter display
   */
  private updateCharCounter(): void {
    const charCounter = document.getElementById('charCounter');
    if (!charCounter) return;

    const current = this.domElements.messageInput.value.length;
    const max = parseInt(this.domElements.messageInput.getAttribute('maxlength') || '1000');
    charCounter.textContent = `${current}/${max}`;
    
    // Update color based on usage
    if (current > max * 0.9) {
      charCounter.style.color = '#ef4444';
    } else if (current > max * 0.7) {
      charCounter.style.color = '#f59e0b';
    } else {
      charCounter.style.color = '#6b7280';
    }
  }

  /**
   * Update send button state
   */
  private updateSendButton(): void {
    const hasText = this.domElements.messageInput.value.trim().length > 0;
    this.domElements.sendBtn.disabled = !hasText || this.isProcessing;
  }

  /**
   * Setup menu interactions for SAP transactions
   */
  private setupMenuInteractions(): void {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove active class from all items
        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const transaction = item.getAttribute('data-transaction') as SAPTransactionCode;
        if (transaction) {
          this.handleTransactionSelection(transaction);
        }
      });
    });
  }

  /**
   * Initialize chat with welcome messages
   */
  private initializeChat(): void {
    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: UI_TEXT.SYSTEM_READY,
      type: 'system',
      timestamp: new Date()
    };

    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: UI_TEXT.WELCOME_MESSAGE,
      type: 'ai',
      timestamp: new Date()
    };

    this.addMessageToHistory(systemMessage);
    this.addMessageToHistory(welcomeMessage);
    this.renderMessage(systemMessage);
    this.renderMessage(welcomeMessage);
  }

  /**
   * Add a new message to the chat
   */
  public addMessage(content: string, type: MessageType = 'ai'): void {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      content,
      type,
      timestamp: new Date()
    };

    this.addMessageToHistory(message);
    this.renderMessage(message);
  }

  /**
   * Add message to history with limit
   */
  private addMessageToHistory(message: ChatMessage): void {
    this.messageHistory.push(message);
    
    // Limit message history
    if (this.messageHistory.length > SYSTEM_CONSTANTS.MAX_CHAT_HISTORY) {
      this.messageHistory = this.messageHistory.slice(-50);
    }

    this.emit('messageAdded', message);
  }

  /**
   * Render message in the chat interface
   */
  private renderMessage(message: ChatMessage): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    messageDiv.innerHTML = message.content;
    messageDiv.setAttribute('data-message-id', message.id);
    messageDiv.setAttribute('title', message.timestamp.toLocaleString('en-US'));
    
    this.domElements.chatMessages.appendChild(messageDiv);
    this.domElements.chatMessages.scrollTop = this.domElements.chatMessages.scrollHeight;
  }

  /**
   * Show typing indicator
   */
  private showTypingIndicator(): void {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai loading';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <span>${UI_TEXT.QWEN_ANALYZING}</span>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    
    this.domElements.chatMessages.appendChild(typingDiv);
    this.domElements.chatMessages.scrollTop = this.domElements.chatMessages.scrollHeight;
  }

  /**
   * Remove typing indicator
   */
  private removeTypingIndicator(): void {
    const typing = document.getElementById('typing-indicator');
    if (typing) {
      typing.remove();
    }
  }

  /**
   * Send message and process order
   */
  public async sendMessage(): Promise<void> {
    const message = this.domElements.messageInput.value.trim();
    if (!message || this.isProcessing) return;

    this.isProcessing = true;
    this.domElements.sendBtn.disabled = true;
    
    try {
      // Add user message
      this.addMessage(message, 'user');
      this.domElements.messageInput.value = '';
      this.updateCharCounter();
      
      // Show typing indicator
      this.showTypingIndicator();
      
      // Process order with Qwen
      await this.processOrderWithQwen(message);
      
    } catch (error) {
      console.error('Error processing message:', error);
      this.removeTypingIndicator();
      
      if (error instanceof QwenConnectionError) {
        this.showQwenError(error);
      } else {
        this.addMessage(`❌ ${ERROR_MESSAGES.SYSTEM_ERROR}`, 'system');
      }
    } finally {
      this.isProcessing = false;
      this.updateSendButton();
    }
  }

  /**
   * Process order with local Qwen model
   */
  private async processOrderWithQwen(message: string): Promise<void> {
    try {
      console.log('🤖 Sending request to local Qwen 3:1.7b...');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: {
            user: MOCK_USER,
            materials: MATERIALS.slice(0, 10),
            vendors: VENDORS.slice(0, 5),
            localOnly: true,
            autoSubmit: true
          }
        })
      });

      this.removeTypingIndicator();

      if (!response.ok) {
        throw new QwenConnectionError(`Qwen Server Error: ${response.status}`);
      }

      const result: APIResponse<OrderData> = await response.json();
      
      if (result.success && result.orderData) {
        await this.handleSuccessfulOrder(result.orderData, message);
      } else if (result.error?.includes('Qwen')) {
        throw new QwenConnectionError(`Local Qwen 3:1.7b not available: ${result.error}`);
      } else {
        throw new OrderSystemError(
          result.error || 'Qwen processing failed',
          'QWEN_PROCESSING_FAILED'
        );
      }

    } catch (error) {
      console.error('❌ Local Qwen 3:1.7b failed:', error);
      
      if (error instanceof QwenConnectionError) {
        throw error;
      } else {
        throw new OrderSystemError(
          'Failed to process order with Qwen',
          'QWEN_REQUEST_FAILED',
          error
        );
      }
    }
  }

  /**
   * Handle successful order processing
   */
  private async handleSuccessfulOrder(orderData: OrderData, originalMessage: string): Promise<void> {
    this.currentOrder = orderData;
    
    const processingInfo = orderData.processedBy || 'Qwen 3:1.7b';
    
    this.addMessage(`
      🤖 <strong>Qwen 3:1.7b Analysis Complete</strong><br><br>
      Local AI model has analyzed your request:<br>
      • Material: ${orderData.material.name}<br>
      • Quantity: ${orderData.quantity} ${orderData.material.unit}<br>
      • Vendor: ${orderData.vendor.name}<br>
      • Total Price: ${formatCurrency(orderData.totalPrice)}<br>
      • Processed by: ${processingInfo}<br><br>
      🔄 <em>${UI_TEXT.TRANSACTION_EXECUTING}</em>
    `);
    
    await this.delay(1500);
    
    // Automatically submit order
    await this.automaticOrderSubmission(orderData);
  }

  /**
   * Automatically submit order
   */
  private async automaticOrderSubmission(orderData: OrderData): Promise<void> {
    this.addMessage(`
      ✅ <strong>SAP Transaction ME21N Successful</strong><br><br>
      Order has been automatically created and is now being submitted...
    `);
    
    await this.delay(2000);
    
    // Submit order automatically
    this.addMessage(`
      🚀 <strong>Order Automatically Submitted!</strong><br><br>
      📋 Order Number: <strong>${orderData.orderNumber}</strong><br>
      🏢 To: ${orderData.vendor.name} (${orderData.vendor.email})<br>
      💰 Total Value: ${formatCurrency(calculateTotalWithTax(orderData.totalPrice))} (gross)<br>
      🚚 Delivery Date: <strong>${orderData.deliveryDate}</strong><br>
      📧 Confirmation: Sent to ${orderData.requestedBy}<br><br>
      <em>✨ Powered by Ollama Qwen 3:1.7b - Order processed fully automatically!</em>
    `, 'system');
    
    // Display order details (read-only)
    this.displayOrderDetails(orderData, true);
    
    // Follow-up message
    setTimeout(() => {
      this.addMessage(UI_TEXT.READY_FOR_NEXT);
    }, 4000);

    this.emit('orderSubmitted', orderData);
  }

  /**
   * Show Qwen connection error
   */
  private showQwenError(error: QwenConnectionError): void {
    this.addMessage(`
      ❌ <strong>Local Qwen 3:1.7b Not Available</strong><br><br>
      ${error.message}<br><br>
      <strong>Solution:</strong><br>
      1. Start Ollama: <code>ollama serve</code><br>
      2. Install Qwen: <code>ollama pull qwen:1.8b</code><br>
      3. Reload this page<br><br>
      <em>${ERROR_MESSAGES.QWEN_UNAVAILABLE}</em>
    `, 'system');
  }

  /**
   * Display order details in the UI
   */
  private displayOrderDetails(orderData: OrderData, isSubmitted: boolean = false): void {
    if (!this.domElements.orderDetails) {
      console.warn('Order details container not found');
      return;
    }

    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
      orderForm.innerHTML = this.createOrderForm(orderData, isSubmitted);
    }
    
    this.domElements.orderDetails.style.display = 'block';
    this.domElements.orderDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Hide default card
    if (this.domElements.defaultCard) {
      this.domElements.defaultCard.style.display = 'none';
    }
  }

  /**
   * Create order form HTML
   */
  private createOrderForm(orderData: OrderData, isSubmitted: boolean = false): string {
    const statusBadge = isSubmitted 
      ? '<span class="status-badge status-submitted">✅ Submitted</span>'
      : '<span class="status-badge status-created">📋 Created</span>';
        
    const actionButtons = isSubmitted 
      ? `<div class="form-actions">
           <div class="success-message">
             <span>🎉 Order successfully submitted!</span>
           </div>
         </div>`
      : `<div class="form-actions">
           <button class="confirm-btn" onclick="window.orderSystem?.confirmOrder()">
             🚀 Submit Order
           </button>
         </div>`;

    const netAmount = formatCurrency(orderData.totalPrice);
    const taxAmount = formatCurrency(orderData.totalPrice * SYSTEM_CONSTANTS.VAT_RATE);
    const totalAmount = formatCurrency(calculateTotalWithTax(orderData.totalPrice));

    return `
      <div class="order-form">
        <div class="order-status-header">
          ${statusBadge}
          <span class="order-timestamp">${new Date().toLocaleString('en-US')}</span>
        </div>
        
        <div class="form-section">
          <h4>📋 Order Header</h4>
          <div class="form-row">
            <span class="form-label">Order Number:</span>
            <span class="form-value"><strong>${orderData.orderNumber}</strong></span>
          </div>
          <div class="form-row">
            <span class="form-label">Requested by:</span>
            <span class="form-value">${orderData.requestedBy}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Cost Center:</span>
            <span class="form-value">${orderData.costCenter}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Priority:</span>
            <span class="form-value">
              <span class="priority-badge priority-${orderData.priority.toLowerCase()}">${orderData.priority}</span>
            </span>
          </div>
        </div>
        
        <div class="form-section">
          <h4>🏢 Vendor</h4>
          <div class="form-row">
            <span class="form-label">Company:</span>
            <span class="form-value">${orderData.vendor.name} (${orderData.vendor.id})</span>
          </div>
          <div class="form-row">
            <span class="form-label">Contact:</span>
            <span class="form-value">${orderData.vendor.contact}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Email:</span>
            <span class="form-value">${orderData.vendor.email}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Location:</span>
            <span class="form-value">${orderData.vendor.location}</span>
          </div>
        </div>
        
        <div class="form-section">
          <h4>📦 Order Items</h4>
          <div class="form-row">
            <span class="form-label">Material:</span>
            <span class="form-value"><strong>${orderData.material.name}</strong></span>
          </div>
          <div class="form-row">
            <span class="form-label">Description:</span>
            <span class="form-value">${orderData.material.description}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Quantity:</span>
            <span class="form-value"><strong>${orderData.quantity} ${orderData.material.unit}</strong></span>
          </div>
          <div class="form-row">
            <span class="form-label">Unit Price:</span>
            <span class="form-value">${formatCurrency(orderData.material.price)}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Net Amount:</span>
            <span class="form-value">${netAmount}</span>
          </div>
          <div class="form-row">
            <span class="form-label">Tax (${Math.round(SYSTEM_CONSTANTS.VAT_RATE * 100)}%):</span>
            <span class="form-value">${taxAmount}</span>
          </div>
          <div class="form-row total-row">
            <span class="form-label"><strong>Total Price:</strong></span>
            <span class="form-value"><strong>${totalAmount}</strong></span>
          </div>
        </div>
        
        <div class="form-section">
          <h4>🚚 Delivery</h4>
          <div class="form-row">
            <span class="form-label">Delivery Date:</span>
            <span class="form-value"><strong>${orderData.deliveryDate}</strong></span>
          </div>
          <div class="form-row">
            <span class="form-label">Delivery Time:</span>
            <span class="form-value">approx. ${orderData.deliveryDays} business days</span>
          </div>
        </div>
        
        ${actionButtons}
      </div>
      
      <style>
        .order-status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .status-created { background: #fef3c7; color: #92400e; }
        .status-submitted { background: #d1fae5; color: #065f46; }
        
        .order-timestamp {
          font-size: 12px;
          color: #6b7280;
          font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .total-row {
          border-top: 2px solid #059669;
          margin-top: 10px;
          padding-top: 10px;
          background: #f0fdf4;
        }
        
        .total-row .form-value {
          color: #059669;
          font-size: 1.1em;
        }
        
        .success-message {
          background: #d1fae5;
          color: #065f46;
          padding: 15px 20px;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          border: 1px solid #a7f3d0;
        }
        
        .priority-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .priority-normal { background: #e5e7eb; color: #374151; }
        .priority-high { background: #fef3c7; color: #92400e; }
        .priority-urgent { background: #fee2e2; color: #991b1b; }
      </style>
    `;
  }

  /**
   * Handle SAP transaction selection
   */
  private handleTransactionSelection(transaction: SAPTransactionCode): void {
    this.addMessage(`📱 SAP transaction ${transaction} activated`, 'system');
    
    const handlers: Record<SAPTransactionCode, () => void> = {
      'ME21N': () => this.handleME21N(),
      'ME22N': () => this.handleME22N(),
      'ME23N': () => this.handleME23N(),
      'MIGO': () => this.handleMIGO(),
      'MM03': () => this.handleMM03(),
      'ME51N': () => this.addMessage(`Transaction ME51N is not yet implemented.`),
      'ME52N': () => this.addMessage(`Transaction ME52N is not yet implemented.`),
      'ME53N': () => this.addMessage(`Transaction ME53N is not yet implemented.`)
    };

    const handler = handlers[transaction];
    if (handler) {
      handler();
    } else {
      this.addMessage(`Transaction ${transaction} is not yet implemented.`);
    }
  }

  /**
   * Handle ME21N - Create Purchase Order
   */
  private handleME21N(): void {
    this.addMessage(`
      🔧 <strong>ME21N - Create Purchase Order</strong><br><br>
      This transaction is already active. Simply describe your order request:<br><br>
      <strong>Examples:</strong><br>
      • "Order 25 screws M8x30"<br>
      • "I need 5 laptop stands from Weber & Co"<br>
      • "Urgently need 100 sheets of A4 printer paper"
    `);
  }

  /**
   * Handle ME22N - Change Purchase Order
   */
  private handleME22N(): void {
    this.addMessage(`
      ✏️ <strong>ME22N - Change Purchase Order</strong><br><br>
      To change an order, provide the order number:<br><br>
      <strong>Examples:</strong><br>
      • "Change order PO123456 - increase quantity to 50"<br>
      • "Cancel order PO789012"<br>
      • "Postpone delivery date of order PO345678"
    `);
    
    // Simulate order search
    setTimeout(() => {
      this.addMessage(`
        📋 <strong>Available Orders:</strong><br><br>
        • ${generateOrderNumber()} - 10x Screws M6x20 (${new Date().toLocaleDateString('en-US')})<br>
        • ${generateOrderNumber()} - 5x Laptop Stands (${new Date(Date.now()-86400000).toLocaleDateString('en-US')})<br><br>
        Which order would you like to change?
      `);
    }, 1500);
  }

  /**
   * Handle ME23N - Display Purchase Order
   */
  private handleME23N(): void {
    this.addMessage(`
      👁️ <strong>ME23N - Display Purchase Order</strong><br><br>
      Enter an order number to display details:<br><br>
      <strong>Format:</strong> "Show order PO123456"
    `);
    
    // Simulate order history
    setTimeout(() => {
      const mockOrders = [
        { no: generateOrderNumber(), material: 'Screws M6x20', qty: 10, status: 'Shipped' },
        { no: generateOrderNumber(), material: 'Laptop Stands', qty: 5, status: 'Delivered' },
        { no: generateOrderNumber(), material: 'Printer Paper A4', qty: 50, status: 'In Progress' }
      ];
      
      let orderList = '<strong>📊 Recent Orders:</strong><br><br>';
      mockOrders.forEach(order => {
        const statusIcon = order.status === 'Delivered' ? '✅' : order.status === 'Shipped' ? '🚚' : '⏳';
        orderList += `${statusIcon} ${order.no} - ${order.qty}x ${order.material} (${order.status})<br>`;
      });
      
      this.addMessage(orderList);
    }, 1500);
  }

  /**
   * Handle MIGO - Goods Receipt
   */
  private handleMIGO(): void {
    this.addMessage(`
      📦 <strong>MIGO - Goods Receipt</strong><br><br>
      Post goods receipt for delivered orders:<br><br>
      <strong>Examples:</strong><br>
      • "Goods receipt for order PO123456"<br>
      • "Received 10 pieces from PO789012"<br>
      • "Partial delivery PO345678 - 5 of 10 pieces"
    `);
    
    // Simulate open orders
    setTimeout(() => {
      this.addMessage(`
        📋 <strong>Open Deliveries:</strong><br><br>
        🚚 ${generateOrderNumber()} - 10x Screws M6x20 (expected today)<br>
        📅 ${generateOrderNumber()} - 5x Laptop Stands (expected tomorrow)<br><br>
        For which order would you like to post goods receipt?
      `);
    }, 1500);
  }

  /**
   * Handle MM03 - Display Material
   */
  private handleMM03(): void {
    this.addMessage(`
      🏷️ <strong>MM03 - Display Material</strong><br><br>
      Display material master data:<br><br>
      <strong>Examples:</strong><br>
      • "Show material MAT001"<br>
      • "Material info screws M6x20"<br>
      • "Stock level laptop stands"
    `);
    
    // Simulate material search
    setTimeout(() => {
      let materialList = '<strong>📦 Available Materials:</strong><br><br>';
      MATERIALS.slice(0, 5).forEach(material => {
        materialList += `• ${material.id} - ${material.name} (Stock: ${material.stockLevel?.toLocaleString()} ${material.unit})<br>`;
      });
      materialList += '<br>Which material would you like to display?';
      
      this.addMessage(materialList);
    }, 1500);
  }

  /**
   * Clear chat history
   */
  public clearChatHistory(): void {
    if (confirm('Do you really want to delete the entire chat history?')) {
      // Delete all messages except system messages
      this.messageHistory = this.messageHistory.filter(msg => msg.type === 'system');
      
      // Clear chat container
      const systemMessages = this.domElements.chatMessages.querySelectorAll('.message.system');
      this.domElements.chatMessages.innerHTML = '';
      
      // Re-insert system messages
      systemMessages.forEach(msg => this.domElements.chatMessages.appendChild(msg));
      
      // Add cleared message
      setTimeout(() => {
        this.addMessage(`
          🧹 <strong>${UI_TEXT.CHAT_CLEARED}</strong><br><br>
          I'm ready for new orders! How can I help you?
        `, 'system');
      }, 500);
      
      // Hide current order details
      if (this.domElements.orderDetails) {
        this.domElements.orderDetails.style.display = 'none';
      }
      
      // Show default card again
      if (this.domElements.defaultCard) {
        this.domElements.defaultCard.style.display = 'block';
      }
      
      // Reset current order
      this.currentOrder = null;
      
      console.log('🧹 Chat history cleared');
      this.emit('chatCleared');
    }
  }

  /**
   * Confirm order manually
   */
  public confirmOrder(): void {
    if (!this.currentOrder) return;
    
    const totalWithTax = calculateTotalWithTax(this.currentOrder.totalPrice);
    
    this.addMessage(`
      🎉 <strong>Order manually confirmed!</strong><br><br>
      📋 Order Number: <strong>${this.currentOrder.orderNumber}</strong><br>
      🏢 Vendor: ${this.currentOrder.vendor.name}<br>
      💰 Total Value: ${formatCurrency(totalWithTax)} (gross)<br>
      🚚 Delivery: <strong>${this.currentOrder.deliveryDate}</strong>
    `, 'system');
    
    // Update UI to submitted state
    this.displayOrderDetails(this.currentOrder, true);
    
    setTimeout(() => {
      this.addMessage(UI_TEXT.READY_FOR_NEXT);
    }, 3000);

    this.emit('orderConfirmed', this.currentOrder);
  }

  /**
   * Start new order
   */
  public startNewOrder(): void {
    this.reset();
    this.addMessage(UI_TEXT.NEW_ORDER_STARTED);
    this.domElements.messageInput.focus();
    this.emit('newOrderStarted');
  }

  /**
   * Reset the system state
   */
  public reset(): void {
    this.currentOrder = null;
    this.messageHistory = [];
    
    if (this.domElements.orderDetails) {
      this.domElements.orderDetails.style.display = 'none';
    }
    
    if (this.domElements.defaultCard) {
      this.domElements.defaultCard.style.display = 'block';
    }
  }

  /**
   * Utility method to create delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event system for extensibility
   */
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Add event listener
   */
  public on(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
    }
  }

  /**
   * Get current system state
   */
  public getState() {
    return {
      isProcessing: this.isProcessing,
      currentOrder: this.currentOrder,
      messageCount: this.messageHistory.length,
      hasActiveOrder: !!this.currentOrder
    };
  }
}

// Export for use in other modules
export default SAPOrderingSystem;