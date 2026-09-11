/**
 * MCP tool: get_order_status
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { formatCurrency } from '../data.js';
import { orderStore } from './order-store.js';

export const getOrderStatusTool: Tool = {
  name: 'get_order_status',
  description: 'Retrieve the current status of a purchase order by order number.',
  inputSchema: {
    type: 'object',
    properties: {
      order_number: {
        type: 'string',
        description: 'Purchase order number (e.g. PO123456)',
      },
    },
    required: ['order_number'],
  },
};

export function handleGetOrderStatus(args: Record<string, unknown>) {
  const orderNumber = String(args.order_number ?? '').toUpperCase();
  const order = orderStore.get(orderNumber);

  if (!order) {
    return {
      error: `Order "${orderNumber}" not found`,
      tip: 'Use create_purchase_order to create a new order',
    };
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    material: order.material.name,
    quantity: order.quantity,
    unit: order.material.unit,
    vendor: order.vendor.name,
    totalPrice: formatCurrency(order.totalPrice),
    deliveryDate: order.deliveryDate,
    priority: order.priority,
    requestedBy: order.requestedBy,
    createdAt: order.createdAt?.toISOString(),
  };
}
