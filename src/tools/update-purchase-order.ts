/**
 * MCP tool: update_purchase_order — ME22N
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

export const updatePurchaseOrderTool: Tool = {
  name: 'update_purchase_order',
  description:
    'Update an existing SAP purchase order (ME22N). Can change quantity, material, vendor, or priority.',
  inputSchema: {
    type: 'object',
    properties: {
      order_number: {
        type: 'string',
        description: 'The PO number to update',
      },
      material_name: {
        type: 'string',
        description: 'New material name or keyword (optional)',
      },
      quantity: {
        type: 'number',
        description: 'New order quantity (optional)',
      },
      vendor_name: {
        type: 'string',
        description: 'New preferred vendor name (optional)',
      },
      priority: {
        type: 'string',
        enum: ['Normal', 'High', 'Urgent'],
        description: 'New order priority (optional)',
      },
      notes: {
        type: 'string',
        description: 'Updated notes (optional)',
      },
    },
    required: ['order_number'],
  },
};

export function handleUpdatePurchaseOrder(args: Record<string, unknown>) {
  try {
    const orderNumber = String(args.order_number ?? '');
    if (!orderNumber) throw new Error('order_number is required');

    const existingOrder = orderStore.get(orderNumber);
    if (!existingOrder) {
      throw new Error(`Purchase Order ${orderNumber} not found in the system`);
    }

    // Default values from existing order
    let material = existingOrder.material;
    let quantity = existingOrder.quantity;
    let vendor = existingOrder.vendor;
    let priority = existingOrder.priority;
    let notes = existingOrder.notes;

    // Apply updates
    if (args.material_name) {
      const materialName = String(args.material_name);
      const newMaterial = findMaterialByKeyword(materialName);
      if (!newMaterial) throw new Error(`Material "${materialName}" not found`);
      material = newMaterial;
    }

    if (args.quantity !== undefined) {
      const newQuantity = Number(args.quantity);
      if (newQuantity <= 0) throw new Error('quantity must be > 0');
      quantity = newQuantity;
    }

    if (args.vendor_name) {
      const vendorName = String(args.vendor_name);
      // Use service to resolve vendor based on material category or name
      vendor = poService.resolveVendor(material, vendorName);
    }

    if (args.priority) {
      priority = args.priority as Priority;
    }

    if (args.notes) {
      notes = String(args.notes);
    }

    // Domain Validation via poService
    poService.validateMaterialStock(material, quantity);

    const totalPrice = quantity * material.price;
    poService.verifyBudget(MOCK_USER.costCenter, totalPrice);

    const deliveryDays = poService.calculateDeliveryDays(priority);
    const status = poService.determineStatus(totalPrice);

    const updatedOrder = {
      ...existingOrder,
      quantity,
      material,
      vendor,
      totalPrice,
      deliveryDate: calculateDeliveryDate(deliveryDays),
      deliveryDays,
      priority,
      notes,
      status,
      updatedAt: new Date(),
    };

    orderStore.set(orderNumber, updatedOrder);

    return {
      success: true,
      orderNumber,
      transaction: 'ME22N',
      material: material.name,
      quantity,
      unit: material.unit,
      vendor: vendor.name,
      totalPrice: formatCurrency(totalPrice),
      totalPriceNet: totalPrice,
      deliveryDate: calculateDeliveryDate(deliveryDays),
      deliveryDays,
      priority,
      status: updatedOrder.status,
      notes,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
