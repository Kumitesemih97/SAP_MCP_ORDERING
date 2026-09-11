/**
 * MCP tool: create_purchase_order — ME21N
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  MATERIALS,
  MOCK_USER,
  generateOrderNumber,
  calculateDeliveryDate,
  findMaterialByKeyword,
  formatCurrency,
} from '../data.js';
import type { Priority } from '../types.js';
import { orderStore } from './order-store.js';
import { poService } from '../services/po-service.js';

export const createPurchaseOrderTool: Tool = {
  name: 'create_purchase_order',
  description:
    'Create a SAP purchase order (ME21N). Validates stock, selects the best vendor, generates a PO number, and records the order.',
  inputSchema: {
    type: 'object',
    properties: {
      material_name: {
        type: 'string',
        description: 'Material name or keyword (e.g. "screws M6x20", "laptop stand")',
      },
      quantity: {
        type: 'number',
        description: 'Order quantity',
      },
      vendor_name: {
        type: 'string',
        description: 'Preferred vendor name (optional — auto-selected if omitted)',
      },
      priority: {
        type: 'string',
        enum: ['Normal', 'High', 'Urgent'],
        description: 'Order priority (default: Normal)',
      },
      notes: {
        type: 'string',
        description: 'Additional notes for the order',
      },
    },
    required: ['material_name', 'quantity'],
  },
};

export function handleCreatePurchaseOrder(args: Record<string, unknown>) {
  try {
    const materialName = String(args.material_name ?? '');
    const quantity = Number(args.quantity ?? 0);
    const vendorName = args.vendor_name ? String(args.vendor_name) : undefined;
    const priority = (args.priority as Priority) ?? 'Normal';
    const notes = args.notes ? String(args.notes) : '';

    if (!materialName) throw new Error('material_name is required');
    if (quantity <= 0) throw new Error('quantity must be > 0');

    const material = findMaterialByKeyword(materialName);
    if (!material) {
      throw new Error(`Material "${materialName}" not found. Available: ${MATERIALS.map(m => m.name).join(', ')}`);
    }

    // Domain Validation via poService
    poService.validateMaterialStock(material, quantity);
    const vendor = poService.resolveVendor(material, vendorName);

    const totalPrice = quantity * material.price;
    poService.verifyBudget(MOCK_USER.costCenter, totalPrice);

    const deliveryDays = poService.calculateDeliveryDays(priority);
    const orderNumber = generateOrderNumber();
    const status = poService.determineStatus(totalPrice);

    orderStore.set(orderNumber, {
      orderNumber,
      quantity,
      material,
      vendor,
      totalPrice,
      deliveryDate: calculateDeliveryDate(deliveryDays),
      deliveryDays,
      requestedBy: MOCK_USER.name,
      costCenter: MOCK_USER.costCenter,
      priority,
      notes,
      status,
      processedBy: 'MCP SAP Tool',
      createdAt: new Date(),
    });

    return {
      success: true,
      orderNumber,
      transaction: 'ME21N',
      material: material.name,
      materialId: material.id,
      quantity,
      unit: material.unit,
      vendor: vendor.name,
      vendorId: vendor.id,
      totalPrice: formatCurrency(totalPrice),
      totalPriceNet: totalPrice,
      deliveryDate: calculateDeliveryDate(deliveryDays),
      deliveryDays,
      priority,
      status,
      costCenter: MOCK_USER.costCenter,
      requestedBy: MOCK_USER.name,
      notes,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
