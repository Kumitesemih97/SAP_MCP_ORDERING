/**
 * MCP tool: update_purchase_order — ME22N
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  MATERIALS,
  VENDORS,
  generateOrderNumber,
  calculateDeliveryDate,
  findMaterialByKeyword,
  findVendorByName,
  getVendorsByCategory,
  formatCurrency,
} from '../data.js';
import type { Priority, OrderStatus } from '../types.js';
import { orderStore } from './order-store.js';

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
  const orderNumber = String(args.order_number ?? '');
  if (!orderNumber) return { error: 'order_number is required' };

  const existingOrder = orderStore.get(orderNumber);
  if (!existingOrder) {
    return { error: `Purchase Order ${orderNumber} not found in the system` };
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
    if (!newMaterial) return { error: `Material "${materialName}" not found` };
    material = newMaterial;
  }

  if (args.quantity !== undefined) {
    const newQuantity = Number(args.quantity);
    if (newQuantity <= 0) return { error: 'quantity must be > 0' };

    // Validate stock and quantities for the material (could be the updated one)
    const stock = material.stockLevel ?? Infinity;
    if (newQuantity > stock) {
      return { error: `Insufficient stock for ${material.name}. Requested: ${newQuantity}, Available: ${stock} ${material.unit}` };
    }
    const min = material.minOrderQuantity ?? 1;
    const max = material.maxOrderQuantity ?? Infinity;
    if (newQuantity < min) return { error: `Minimum order quantity for ${material.name} is ${min} ${material.unit}` };
    if (newQuantity > max) return { error: `Maximum order quantity for ${material.name} is ${max} ${material.unit}` };

    quantity = newQuantity;
  }

  if (args.vendor_name) {
    const vendorName = String(args.vendor_name);
    const newVendor = findVendorByName(vendorName);
    if (!newVendor) return { error: `Vendor "${vendorName}" not found` };
    vendor = newVendor;
  }

  if (args.priority) {
    priority = args.priority as Priority;
  }

  if (args.notes) {
    notes = String(args.notes);
  }

  const deliveryDays = priority === 'Urgent' ? 2 : priority === 'High' ? 4 : 7;
  const totalPrice = quantity * material.price;

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
    status: 'Created' as OrderStatus,
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
    status: 'Created',
    notes,
  };
}
