/**
 * MCP tool: create_purchase_order — ME21N
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  MATERIALS,
  VENDORS,
  MOCK_USER,
  generateOrderNumber,
  calculateDeliveryDate,
  findMaterialByKeyword,
  findVendorByName,
  getVendorsByCategory,
  formatCurrency,
} from '../data.js';
import type { Priority } from '../types.js';
import { orderStore } from './order-store.js';
import type { OrderStatus } from '../types.js';

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
  const materialName = String(args.material_name ?? '');
  const quantity = Number(args.quantity ?? 0);
  const vendorName = args.vendor_name ? String(args.vendor_name) : undefined;
  const priority = (args.priority as Priority) ?? 'Normal';
  const notes = args.notes ? String(args.notes) : '';

  if (!materialName) return { error: 'material_name is required' };
  if (quantity <= 0) return { error: 'quantity must be > 0' };

  const material = findMaterialByKeyword(materialName);
  if (!material) {
    return { error: `Material "${materialName}" not found. Available: ${MATERIALS.map(m => m.name).join(', ')}` };
  }

  const stock = material.stockLevel ?? Infinity;
  if (quantity > stock) {
    return { error: `Insufficient stock. Requested: ${quantity}, Available: ${stock} ${material.unit}` };
  }
  const min = material.minOrderQuantity ?? 1;
  const max = material.maxOrderQuantity ?? Infinity;
  if (quantity < min) return { error: `Minimum order quantity is ${min} ${material.unit}` };
  if (quantity > max) return { error: `Maximum order quantity is ${max} ${material.unit}` };

  let vendor = vendorName ? findVendorByName(vendorName) : null;
  if (vendorName && !vendor) return { error: `Vendor "${vendorName}" not found` };
  if (!vendor) {
    const byCategory = getVendorsByCategory(material.category);
    vendor = byCategory[0] ?? VENDORS[0]!;
  }

  const deliveryDays = priority === 'Urgent' ? 2 : priority === 'High' ? 4 : 7;
  const orderNumber = generateOrderNumber();
  const totalPrice = quantity * material.price;

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
    status: 'Created' as OrderStatus,
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
    status: 'Created',
    costCenter: MOCK_USER.costCenter,
    requestedBy: MOCK_USER.name,
    notes,
  };
}
