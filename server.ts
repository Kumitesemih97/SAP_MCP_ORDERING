/**
 * SAP MCP Ordering System - Backend Server
 * TypeScript implementation with comprehensive error handling and type safety
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios, { AxiosResponse } from 'axios';
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
    // Force only local Qwen model
    if (FORCE_LOCAL_ONLY) {
      console.log(`🤖 Qwen 3:1.7b Local Request (forced local-only mode)`);
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
        console.log(`✅ Qwen Response: ${response.data.response.substring(0, 100)}...`);
        return {
          success: true,
          response: response.data.response,
          model: OLLAMA_MODEL,
          created_at: response.data.created_at,
          done: response.data.done,
          localOnly: true
        };
      } else {
        throw new Error('Invalid response format from Qwen');
      }
    } catch (error) {
      console.error('❌ Qwen 3:1.7b generation failed:', error instanceof Error ? error.message : 'Unknown error');
      
      // NO fallback in local-only mode
      if (FORCE_LOCAL_ONLY) {
        return {
          success: false,
          error: `Local Qwen 3:1.7b model not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Build analysis prompt for order processing
   */
  private buildAnalysisPrompt(userMessage: string, context?: any): string {
    return `You are a SAP expert analyzing order requests for a US company.

IMPORTANT: You are running as local Qwen 3:1.7b model and should create precise SAP orders.

USER REQUEST: "${userMessage}"

TASK:
Analyze the request and extract the following information:
- Desired quantity (number)
- Material name or description
- Preferred vendor (if mentioned)
- Priority (normal, high, urgent)
- Special notes

AVAILABLE MATERIALS:
- Screws M6x20 (Fastening Technology, $0.15/PCS)
- Nuts M6 (Fastening Technology, $0.08/PCS)
- Office Supply Set (Office Supplies, $25.50/SET)
- Printer Paper A4 (Office Supplies, $4.99/PKG)
- Laptop Stand (IT Accessories, $89.99/PCS)
- Cable Channel (Electrical, $12.45/PCS)
- Industrial Cleaner (Operating Supplies, $35.80/CAN)

AVAILABLE VENDORS:
- Müller Inc. (Munich) - Fastening Technology
- Schmidt Corp. (Hamburg) - Office Supplies
- Weber & Co (Berlin) - IT Accessories
- Bauer Industries (Stuttgart) - Office Supplies
- Fischer Tech Solutions (Nuremberg) - IT/Electrical

RESPONSE FORMAT (JSON ONLY, nothing else):
{
  "quantity": [number],
  "material": "[exact material name from list]",
  "category": "[category]",
  "vendor": "[vendor or null]",
  "priority": "[normal/high/urgent]",
  "notes": "[special notes or empty]",
  "confidence": [0.0-1.0]
}

IMPORTANT: Respond ONLY with the JSON object, no additional explanations or text!`;
  }

  /**
   * Extract structured order data from AI response
   */
  async extractOrderData(userMessage: string, aiResult: OllamaResponse): Promise<OrderData> {
    let parsedData: any = {};
    
    try {
      if (aiResult.success && aiResult.response && aiResult.localOnly) {
        console.log('🤖 Processing Qwen 3:1.7b response locally...');
        
        // Clean up Qwen response
        let cleanResponse = aiResult.response.trim();
        
        // Extract JSON from response
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
          console.log('📝 Extracted JSON from Qwen:', cleanResponse);
          
          try {
            parsedData = JSON.parse(cleanResponse);
            console.log('✅ Successfully parsed Qwen response:', parsedData);
          } catch (parseError) {
            console.warn('⚠️ JSON parse failed, using intelligent extraction');
            parsedData = this.intelligentExtraction(cleanResponse, userMessage);
          }
        } else {
          console.warn('⚠️ No JSON found in Qwen response, using fallback');
          parsedData = this.fallbackExtraction(userMessage);
        }
      } else if (!aiResult.success) {
        throw new Error('Local Qwen 3:1.7b model is required');
      } else {
        parsedData = this.fallbackExtraction(userMessage);
      }
    } catch (error) {
      console.warn('Failed to parse Qwen response, using fallback analysis:', error instanceof Error ? error.message : 'Unknown error');
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
      processedBy: aiResult.localOnly ? 'Qwen 3:1.7b (local)' : 'Fallback',
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
        mcp: 'connected' // Assume connected for now
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
 * Chat endpoint for order processing
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
    
    // Build analysis prompt
    const prompt = ollama['buildAnalysisPrompt'](message, context);
    
    // Get AI response
    const aiResult = await ollama.generateResponse(prompt, options);
    
    if (!aiResult.success) {
      return res.status(503).json({
        success: false,
        error: aiResult.error || 'AI processing failed',
        requiresLocal: true
      });
    }
    
    // Extract order data
    const orderData = await ollama.extractOrderData(message, aiResult);
    
    console.log(`✅ Order processed: ${orderData.orderNumber} - ${orderData.quantity}x ${orderData.material.name}`);
    
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
  console.log('🚀 Starting SAP MCP Ordering System (Qwen 3:1.7b Local Only)...');
  
  // Check exclusively local Qwen model
  console.log('🔍 Checking local Qwen 3:1.7b model...');
  
  const ollamaConnected = await ollama.checkConnection();
  if (!ollamaConnected) {
    console.error('❌ CRITICAL: Local Ollama with Qwen 3:1.7b is required!');
    console.error('   1. Install Ollama: curl -fsSL https://ollama.ai/install.sh | sh');
    console.error('   2. Start Ollama: ollama serve');
    console.error('   3. Install Qwen: ollama pull qwen:1.8b');
    console.error('   4. Restart this server');
    
    if (FORCE_LOCAL_ONLY) {
      console.error('   ⚠️ Server will NOT start - local Qwen is required');
      process.exit(1);
    }
  } else {
    // Test Qwen model specifically
    try {
      const testResponse = await ollama.generateResponse('Test', { temperature: 0.1 });
      if (testResponse.success) {
        console.log('✅ Qwen 3:1.7b model verified and working');
      } else {
        throw new Error('Qwen model test failed');
      }
    } catch (error) {
      console.error('❌ Qwen 3:1.7b model not working:', error instanceof Error ? error.message : 'Unknown error');
      console.error('   Install with: ollama pull qwen:1.8b');
      if (FORCE_LOCAL_ONLY) {
        process.exit(1);
      }
    }
  }
  
  // Start Express server
  const server = app.listen(PORT, HOST, () => {
    console.log(`\n🌐 SAP MCP Ordering System (Qwen Local Only)`);
    console.log(`📋 Frontend: http://${HOST}:${PORT}`);
    console.log(`🤖 AI Model: Qwen 3:1.7b (${ollamaConnected ? 'Connected' : 'Disconnected'})`);
    console.log(`🔗 Health Check: http://${HOST}:${PORT}/api/health`);
    
    if (ollamaConnected) {
      console.log(`✅ Ready for SAP orders with local Qwen AI!`);
    } else {
      console.log(`❌ Qwen not available - system will not work properly`);
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
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { app, ollama };
