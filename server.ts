/**
 * SAP MCP Ordering System - Backend Server
 * TypeScript implementation with comprehensive error handling and type safety
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawn } from 'child_process';
import axios, { AxiosResponse } from 'axios';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  SystemHealth,
  ChatRequest,
  ChatResponse,
  HealthCheckResponse,
  OrderData,
  Material,
  Vendor,
  Priority,
  APIResponse,
  OllamaResponse
} from './src/types.js';
import {
  MATERIALS,
  VENDORS,
  MOCK_USER,
  APP_CONFIG,
  generateOrderNumber,
  calculateDeliveryDate,
  findMaterialByKeyword,
  findVendorByName,
  formatCurrency
} from './src/data.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server configuration
const PORT = APP_CONFIG.server.port;
const HOST = APP_CONFIG.server.host;
const OLLAMA_BASE_URL = APP_CONFIG.ollama.baseUrl;
const OLLAMA_MODEL = APP_CONFIG.ollama.model;
const FORCE_LOCAL_ONLY = APP_CONFIG.features.localOnly;

// ── MCPBridge — spawns mcp-server.ts via stdio, wraps the SDK Client ─────────

class MCPBridge {
  private client: Client | null = null;
  private connected = false;

  async connect(): Promise<boolean> {
    try {
      const serverPath = path.join(__dirname, 'mcp-server.ts');
      const transport = new StdioClientTransport({
        command: path.join(__dirname, 'node_modules', '.bin', 'tsx'),
        args: [serverPath],
      });

      this.client = new Client(
        { name: 'sap-express-server', version: '1.0.0' },
        { capabilities: {} }
      );

      await this.client.connect(transport);
      this.connected = true;
      console.log('✅ MCP server connected (stdio)');
      return true;
    } catch (err) {
      console.warn('⚠️  MCP server failed to connect:', err instanceof Error ? err.message : err);
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client || !this.connected) {
      throw new Error('MCP bridge not connected');
    }
    const result = await this.client.callTool({ name, arguments: args });
    // SDK returns { content: [{type:'text', text: '...'}] }
    const first = (result.content as Array<{ type: string; text?: string }>)[0];
    if (first?.type === 'text' && first.text) {
      try {
        return JSON.parse(first.text);
      } catch {
        return first.text;
      }
    }
    return result;
  }

  async listTools(): Promise<string[]> {
    if (!this.client || !this.connected) return [];
    const { tools } = await this.client.listTools();
    return tools.map(t => t.name);
  }
}

const mcpBridge = new MCPBridge();

/**
 * Express application setup
 */
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
if (APP_CONFIG.server.cors) {
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  next();
});

/**
 * Ollama client for local Qwen model interaction
 */
class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = OLLAMA_BASE_URL, timeout: number = APP_CONFIG.ollama.timeout) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Check if Ollama is available and responsive
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.status === 200) {
        console.log('✅ Ollama connection verified');
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Ollama connection failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Generate response using local Qwen model
   */
  async generateResponse(prompt: string, options: any = {}): Promise<OllamaResponse> {
    // Force only local Gemma4 model
    if (FORCE_LOCAL_ONLY) {
      console.log(`🤖 Gemma4 31B Local Request (forced local-only mode)`);
    }

    try {
      const requestData = {
        model: OLLAMA_MODEL, // Hardcoded to local Qwen
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || APP_CONFIG.ollama.temperature,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || APP_CONFIG.ollama.maxTokens,
          stop: options.stop || ['\n\n\n'], // Stop at excessive newlines
          ...options
        }
      };

      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/api/generate`, 
        requestData, 
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.response) {
        console.log(`✅ Gemma4 31B Response: ${response.data.response.substring(0, 100)}...`);
        return {
          success: true,
          response: response.data.response,
          model: OLLAMA_MODEL,
          created_at: response.data.created_at,
          done: response.data.done,
          localOnly: true
        };
      } else {
        throw new Error('Invalid response format from Gemma4');
      }
    } catch (error) {
      console.error('❌ Gemma4 31B generation failed:', error instanceof Error ? error.message : 'Unknown error');

      // NO fallback in local-only mode
      if (FORCE_LOCAL_ONLY) {
        return {
          success: false,
          error: `Local Gemma4 31B model not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
          localOnly: true
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build analysis prompt for order processing — includes MCP tool-call instructions.
   */
  buildAnalysisPrompt(userMessage: string, context?: any): string {
    const currentOrderInfo = context?.currentOrder
      ? `\nCURRENT ACTIVE ORDER: ${JSON.stringify(context.currentOrder)}\n(If the user wants to change/modify/update THIS order, you MUST use the update_purchase_order tool)`
      : '';

    return `You are a SAP procurement expert. Your job is to analyze user requests and call the right SAP tool.${currentOrderInfo}

USER REQUEST: "${userMessage}"

AVAILABLE SAP TOOLS (call one to perform the action):

1. create_purchase_order — Create a new purchase order (ME21N)
   Args: material_name (string), quantity (number), vendor_name? (string), priority? (Normal|High|Urgent), notes? (string)

2. update_purchase_order — Change an existing purchase order (ME22N)
   Args: order_number (string), material_name? (string), quantity? (number), vendor_name? (string), priority? (Normal|High|Urgent), notes? (string)

3. search_materials — Search the material catalog
   Args: keyword (string), category? (string)

4. search_vendors — Find vendors by name or category
   Args: name? (string), category? (string)

5. check_material_stock — Check stock level for a material
   Args: material_id (string — can be ID like MAT001 or a name keyword)

6. get_order_status — Look up a purchase order
   Args: order_number (string — e.g. PO123456)

7. post_goods_receipt — Post goods receipt for a delivered order (MIGO)
   Args: order_number (string), quantity_received (number)

DECISION RULES:
- If user wants to ORDER something NEW → call create_purchase_order
- If user wants to CHANGE, MODIFY, or UPDATE an existing order (especially if they say "change that", "update it", "modify the order", or reference the current PO) → call update_purchase_order
- If user asks about STOCK or MATERIALS → call check_material_stock or search_materials
- If user asks about VENDORS → call search_vendors
- If user asks about ORDER STATUS → call get_order_status
- If user confirms DELIVERY/RECEIPT → call post_goods_receipt

IMPORTANT: If a CURRENT ACTIVE ORDER is provided in the context and the user asks for a change to "that" or "the" order, you MUST use update_purchase_order with the order_number from the context.

Respond with ONLY this JSON (no other text):
{"tool_call": {"name": "<tool_name>", "args": {<arguments>}}}

Examples:
Request "Order 50 screws M6x20 urgently" →
{"tool_call": {"name": "create_purchase_order", "args": {"material_name": "Screws M6x20", "quantity": 50, "priority": "Urgent"}}}

Request "Change that order to 100 screws" (with PO123456 in context) →
{"tool_call": {"name": "update_purchase_order", "args": {"order_number": "PO123456", "quantity": 100}}}

Request "How many laptop stands do we have?" →
{"tool_call": {"name": "check_material_stock", "args": {"material_id": "laptop stand"}}}

Request "What is the status of PO987654?" →
{"tool_call": {"name": "get_order_status", "args": {"order_number": "PO987654"}}}

RESPOND WITH JSON ONLY. No markdown, no explanation.`;
  }

  /**
   * Extract structured order data from AI response
   */
  async extractOrderData(userMessage: string, aiResult: OllamaResponse): Promise<OrderData> {
    let parsedData: any = {};
    
    try {
      if (aiResult.success && aiResult.response && aiResult.localOnly) {
        console.log('🤖 Processing Gemma4 31B response locally...');
        
        // Clean up Qwen response
        let cleanResponse = aiResult.response.trim();
        
        // Extract JSON from response
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
          console.log('📝 Extracted JSON from Gemma4:', cleanResponse);
          
          try {
            parsedData = JSON.parse(cleanResponse);
            console.log('✅ Successfully parsed Gemma4 response:', parsedData);
          } catch (parseError) {
            console.warn('⚠️ JSON parse failed, using intelligent extraction');
            parsedData = this.intelligentExtraction(cleanResponse, userMessage);
          }
        } else {
          console.warn('⚠️ No JSON found in Qwen response, using fallback');
          parsedData = this.fallbackExtraction(userMessage);
        }
      } else if (!aiResult.success) {
        throw new Error('Local Gemma4 31B model is required');
      } else {
        parsedData = this.fallbackExtraction(userMessage);
      }
    } catch (error) {
      console.warn('Failed to parse Gemma4 response, using fallback analysis:', error instanceof Error ? error.message : 'Unknown error');
      parsedData = this.fallbackExtraction(userMessage);
    }
    
    // Find material and vendor
    const material = this.findBestMaterial(parsedData.material, userMessage);
    const vendor = this.findBestVendor(parsedData.vendor, material.category);
    
    // Calculate pricing and delivery
    const quantity = parsedData.quantity || this.extractQuantity(userMessage);
    const totalPrice = quantity * material.price;
    const deliveryDays = Math.floor(Math.random() * 7) + 3;
    
    return {
      orderNumber: generateOrderNumber(),
      quantity,
      material,
      vendor,
      totalPrice,
      deliveryDate: calculateDeliveryDate(deliveryDays),
      deliveryDays,
      requestedBy: MOCK_USER.name,
      costCenter: MOCK_USER.costCenter,
      priority: this.normalizePriority(parsedData.priority || this.determinePriority(userMessage)),
      notes: parsedData.notes || this.extractNotes(userMessage),
      processedBy: aiResult.localOnly ? 'Gemma4 31B (local)' : 'Fallback',
      createdAt: new Date(),
      status: 'Created'
    };
  }

  /**
   * Intelligent extraction from unstructured response
   */
  private intelligentExtraction(response: string, userMessage: string): any {
    const result: any = {};
    
    // Search for quantity
    const quantityMatch = response.match(/["']?quantity["']?\s*:\s*(\d+)/i) || 
                        response.match(/(\d+)\s*(pieces?|pcs)/i);
    result.quantity = quantityMatch ? parseInt(quantityMatch[1]) : null;
    
    // Search for material
    const materialMatch = response.match(/["']?material["']?\s*:\s*["']([^"']+)["']/i);
    result.material = materialMatch ? materialMatch[1] : null;
    
    // Search for category
    const categoryMatch = response.match(/["']?category["']?\s*:\s*["']([^"']+)["']/i);
    result.category = categoryMatch ? categoryMatch[1] : null;
    
    // Search for priority
    const priorityMatch = response.match(/["']?priority["']?\s*:\s*["']([^"']+)["']/i);
    result.priority = priorityMatch ? priorityMatch[1] : 'normal';
    
    console.log('🧠 Intelligent extraction result:', result);
    return result;
  }

  /**
   * Fallback extraction when AI fails
   */
  private fallbackExtraction(userMessage: string): any {
    return {
      quantity: this.extractQuantity(userMessage),
      material: "Screws M6x20", // Default fallback
      category: "Fastening Technology",
      vendor: null,
      priority: this.determinePriority(userMessage),
      notes: `Fallback analysis of: ${userMessage.substring(0, 100)}`,
      confidence: 0.3
    };
  }

  /**
   * Extract quantity from message
   */
  private extractQuantity(message: string): number {
    const patterns = [
      /(\d+)\s*(pieces?|pcs|units?|items?)/i,
      /(\d+)\s*x/i,
      /(\d+)\s+/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return Math.floor(Math.random() * 50) + 1; // Random fallback
  }

  /**
   * Determine priority from message
   */
  private determinePriority(message: string): Priority {
    const lowerMessage = message.toLowerCase();
    
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'rush'];
    const highWords = ['important', 'priority', 'quick', 'fast', 'expedite', 'soon'];
    
    if (urgentWords.some(word => lowerMessage.includes(word))) {
      return 'Urgent';
    } else if (highWords.some(word => lowerMessage.includes(word))) {
      return 'High';
    }
    return 'Normal';
  }

  /**
   * Normalize priority values
   */
  private normalizePriority(priority: string): Priority {
    const normalized = priority.toLowerCase();
    if (['urgent', 'critical', 'high priority'].includes(normalized)) return 'Urgent';
    if (['high', 'important', 'priority'].includes(normalized)) return 'High';
    return 'Normal';
  }

  /**
   * Extract notes from message
   */
  private extractNotes(message: string): string {
    if (message.length > 100) {
      return `Original request: ${message.substring(0, 100)}...`;
    }
    return '';
  }

  /**
   * Find best matching material
   */
  private findBestMaterial(materialName: string | null, userMessage: string): Material {
    if (materialName) {
      const material = findMaterialByKeyword(materialName);
      if (material) return material;
    }
    
    // Fallback: search in user message
    const material = findMaterialByKeyword(userMessage);
    return material || MATERIALS[0]; // Ultimate fallback
  }

  /**
   * Find best matching vendor
   */
  private findBestVendor(vendorName: string | null, category: string): Vendor {
    if (vendorName) {
      const vendor = findVendorByName(vendorName);
      if (vendor) return vendor;
    }
    
    // Default to first available vendor
    return VENDORS[0];
  }
}

/**
 * Initialize Ollama client
 */
const ollama = new OllamaClient();

/**
 * API Routes
 */

/**
 * Health check endpoint
 */
app.get('/api/health', async (req: Request, res: Response<HealthCheckResponse>) => {
  try {
    const startTime = process.hrtime();
    
    // Check Ollama connection
    const ollamaConnected = await ollama.checkConnection();
    
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;
    
    const health: SystemHealth = {
      status: ollamaConnected ? 'healthy' : 'degraded',
      services: {
        ollama: ollamaConnected ? 'connected' : 'disconnected',
        mcp: mcpBridge.isConnected() ? 'connected' : 'disconnected'
      },
      uptime: process.uptime(),
      version: '2.1.0',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: health,
      message: `Health check completed in ${responseTime.toFixed(2)}ms`
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        services: { ollama: 'error', mcp: 'error' },
        uptime: process.uptime(),
        version: '2.1.0',
        timestamp: new Date().toISOString()
      } as SystemHealth
    });
  }
});

/**
 * Chat endpoint — routes through MCP tools when possible, falls back to direct extraction.
 */
app.post('/api/chat', async (req: Request<{}, ChatResponse, ChatRequest>, res: Response<ChatResponse>) => {
  try {
    const { message, context, options } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    console.log(`💬 Processing chat request: "${message.substring(0, 50)}..."`);

    // Step 1 — ask model which MCP tool to call
    const toolPrompt = ollama.buildAnalysisPrompt(message, context);
    const toolDecision = await ollama.generateResponse(toolPrompt, options);

    if (!toolDecision.success) {
      return res.status(503).json({
        success: false,
        error: toolDecision.error || 'AI processing failed',
        requiresLocal: true
      });
    }

    const rawResponse = toolDecision.response ?? '';
    let orderData: OrderData | null = null;
    let mcpResult: unknown = null;

    // Step 2 — detect tool_call in model response and dispatch to MCP
    if (mcpBridge.isConnected()) {
      const jsonMatch = rawResponse.match(/\{[\s\S]*"tool_call"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as {
            tool_call: { name: string; args: Record<string, unknown> };
          };
          const { name: toolName, args: toolArgs } = parsed.tool_call;

          console.log(`🔧 MCP tool call: ${toolName}`, toolArgs);
          mcpResult = await mcpBridge.callTool(toolName, toolArgs);
          console.log(`✅ MCP tool result:`, JSON.stringify(mcpResult).substring(0, 200));

          // If it was create_purchase_order or update_purchase_order, extract orderData from the result
          if ((toolName === 'create_purchase_order' || toolName === 'update_purchase_order') && mcpResult && typeof mcpResult === 'object') {
            const r = mcpResult as Record<string, unknown>;
            if (!r.error) {
              const mat = findMaterialByKeyword(String(r.material ?? '')) ?? MATERIALS[0]!;
              const ven = findVendorByName(String(r.vendor ?? '')) ?? VENDORS[0]!;
              orderData = {
                orderNumber: String(r.orderNumber),
                quantity: Number(r.quantity),
                material: mat,
                vendor: ven,
                totalPrice: Number(r.totalPriceNet ?? 0),
                deliveryDate: String(r.deliveryDate),
                deliveryDays: Number(r.deliveryDays ?? 5),
                requestedBy: String(r.requestedBy ?? MOCK_USER.name),
                costCenter: String(r.costCenter ?? MOCK_USER.costCenter),
                priority: (r.priority as Priority) ?? 'Normal',
                notes: String(r.notes ?? ''),
                status: toolName === 'update_purchase_order' ? 'Updated' : 'Created',
                processedBy: toolName === 'update_purchase_order' ? 'MCP SAP Update Tool' : 'MCP SAP Tool',
                createdAt: new Date(),
              };
            }
          }

          // Step 3 — ask model for a human-readable summary of the tool result
          const summaryPrompt = `You are a SAP assistant. A SAP tool was just executed.

Tool: ${toolName}
Result: ${JSON.stringify(mcpResult)}

Write a short, friendly confirmation message (2-3 sentences) for the user. Be specific — include order number, material name, quantity, vendor, delivery date if present. No JSON. Plain text only.`;

          const summaryResult = await ollama.generateResponse(summaryPrompt, { temperature: 0.4 });
          const humanMessage = summaryResult.success
            ? (summaryResult.response ?? 'Action completed successfully.')
            : 'Action completed successfully.';

          return res.json({
            success: true,
            orderData: orderData ?? undefined,
            message: humanMessage,
          });
        } catch (mcpErr) {
          console.warn('⚠️  MCP tool dispatch failed:', mcpErr instanceof Error ? mcpErr.message : mcpErr);
          // Fall through to legacy extraction
        }
      }
    }

    // Step 4 — fallback: legacy direct extraction (no MCP)
    orderData = await ollama.extractOrderData(message, toolDecision);
    console.log(`✅ Order processed (fallback): ${orderData.orderNumber} - ${orderData.quantity}x ${orderData.material.name}`);

    res.json({
      success: true,
      orderData,
      message: 'Order processed successfully'
    });

  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get materials endpoint
 */
app.get('/api/materials', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: MATERIALS,
      message: `Retrieved ${MATERIALS.length} materials`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve materials'
    });
  }
});

/**
 * Get vendors endpoint
 */
app.get('/api/vendors', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: VENDORS,
      message: `Retrieved ${VENDORS.length} vendors`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vendors'
    });
  }
});

/**
 * Serve main application
 */
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Ollama signin — spawns `ollama signin`, returns the connect URL via SSE.
 * The client opens the URL in a new tab; Ollama handles the OAuth callback.
 */
app.get('/api/ollama/signin', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const proc = spawn('ollama', ['signin'], { shell: true });
  let sent = false;

  const send = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const handleData = (chunk: Buffer) => {
    const text = chunk.toString();
    // Ollama prints the URL on the line that contains /connect
    const match = text.match(/(https:\/\/ollama\.com\/connect\?[^\s]+)/);
    if (match && !sent) {
      sent = true;
      send('url', { url: match[1] });
    }
  };

  proc.stdout.on('data', handleData);
  proc.stderr.on('data', handleData);

  proc.on('close', (code) => {
    send('done', { success: code === 0 });
    res.end();
  });

  req.on('close', () => proc.kill());
});

/**
 * Auth status — checks whether the running Ollama instance can reach
 * the cloud model (i.e. whether the user is signed in).
 */
app.get('/api/ollama/auth-status', async (req: Request, res: Response) => {
  try {
    await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      { model: OLLAMA_MODEL, prompt: '', stream: false },
      { timeout: 6000 }
    );
    res.json({ authenticated: true });
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      res.json({ authenticated: false, reason: 'unauthorized' });
    } else if (status === 404) {
      res.json({ authenticated: false, reason: 'model_not_found' });
    } else {
      res.json({ authenticated: false, reason: 'ollama_unavailable' });
    }
  }
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.url} is not a valid API endpoint`
  });
});

/**
 * Global error handler
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: APP_CONFIG.features.debugMode ? error.message : 'Something went wrong'
  });
});

/**
 * Server startup with Qwen-only validation
 */
async function startServer(): Promise<void> {
  console.log('🚀 Starting SAP MCP Ordering System (Gemma4 31B Local Only)...');

  // Check exclusively local Gemma4 model
  console.log('🔍 Checking local Gemma4 31B model...');

  const ollamaConnected = await ollama.checkConnection();
  if (!ollamaConnected) {
    console.error('❌ CRITICAL: Local Ollama with Gemma4 31B is required!');
    console.error('   1. Install Ollama: curl -fsSL https://ollama.ai/install.sh | sh');
    console.error('   2. Start Ollama: ollama serve');
    console.error('   3. Install Gemma4: ollama pull gemma4:31b');
    console.error('   4. Restart this server');
    
    if (FORCE_LOCAL_ONLY) {
      console.warn('⚠️  Gemma4 31B unavailable — run: ollama pull gemma4:31b');
      console.warn('⚠️  Starting server in degraded mode (AI features disabled)');
    }
  } else {
    // Test Gemma4 model specifically
    try {
      const testResponse = await ollama.generateResponse('Test', { temperature: 0.1 });
      if (testResponse.success) {
        console.log('✅ Gemma4 31B model verified and working');
      } else {
        throw new Error('Gemma4 model test failed');
      }
    } catch (error) {
      console.error('❌ Gemma4 31B model not working:', error instanceof Error ? error.message : 'Unknown error');
      console.warn('   Install with: ollama pull gemma4:31b');
      console.warn('⚠️  Starting server in degraded mode (AI features disabled)');
    }
  }
  
  // Connect MCP server (stdio)
  console.log('🔌 Connecting MCP server...');
  await mcpBridge.connect();

  // Start Express server
  const server = app.listen(PORT, HOST, () => {
    console.log(`\n🌐 SAP MCP Ordering System (Gemma4 31B Local Only)`);
    console.log(`📋 Frontend: http://${HOST}:${PORT}`);
    console.log(`🤖 AI Model: Gemma4 31B / gemma4:31b (${ollamaConnected ? 'Connected' : 'Disconnected'})`);
    console.log(`🔗 Health Check: http://${HOST}:${PORT}/api/health`);

    if (ollamaConnected) {
      console.log(`✅ Ready for SAP orders with local Gemma4 31B AI!`);
    } else {
      console.log(`❌ Gemma4 not available - system will not work properly`);
    }
    
    console.log('\n📝 Test the system:');
    console.log('   "Order 10 screws M6x20 from Müller Inc."');
    console.log('   "I need 5 laptop stands urgently"\n');
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

// Start the server

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { app, ollama };
