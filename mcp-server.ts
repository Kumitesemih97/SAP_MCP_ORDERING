/**
 * SAP MCP Server — official @modelcontextprotocol/sdk implementation.
 * Tools are split into src/tools/. This file wires them up and runs the server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath, pathToFileURL } from 'url';

import { createPurchaseOrderTool, handleCreatePurchaseOrder } from './src/tools/create-purchase-order.js';
import { searchMaterialsTool, handleSearchMaterials } from './src/tools/search-materials.js';
import { searchVendorsTool, handleSearchVendors } from './src/tools/search-vendors.js';
import { checkMaterialStockTool, handleCheckMaterialStock } from './src/tools/check-material-stock.js';
import { getOrderStatusTool, handleGetOrderStatus } from './src/tools/get-order-status.js';
import { postGoodsReceiptTool, handlePostGoodsReceipt } from './src/tools/post-goods-receipt.js';
import { updatePurchaseOrderTool, handleUpdatePurchaseOrder } from './src/tools/update-purchase-order.js';

const TOOLS = [
  createPurchaseOrderTool,
  searchMaterialsTool,
  searchVendorsTool,
  checkMaterialStockTool,
  getOrderStatusTool,
  postGoodsReceiptTool,
  updatePurchaseOrderTool,
];

const HANDLERS: Record<string, (args: Record<string, unknown>) => unknown> = {
  create_purchase_order: handleCreatePurchaseOrder,
  search_materials:     handleSearchMaterials,
  search_vendors:       handleSearchVendors,
  check_material_stock: handleCheckMaterialStock,
  get_order_status:     handleGetOrderStatus,
  post_goods_receipt:   handlePostGoodsReceipt,
  update_purchase_order: handleUpdatePurchaseOrder,
};

const server = new Server(
  { name: 'sap-mcp-ordering', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = HANDLERS[name];

  if (!handler) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }

  try {
    const result = handler((args ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: msg }) }],
      isError: true,
    };
  }
});

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export { server, TOOLS };
