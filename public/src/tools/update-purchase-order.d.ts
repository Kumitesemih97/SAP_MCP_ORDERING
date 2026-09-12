/**
 * MCP tool: update_purchase_order — ME22N
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Priority } from '../types.js';
export declare const updatePurchaseOrderTool: Tool;
export declare function handleUpdatePurchaseOrder(args: Record<string, unknown>): {
    success: boolean;
    orderNumber: string;
    transaction: string;
    material: string;
    quantity: number;
    unit: string;
    vendor: string;
    totalPrice: string;
    totalPriceNet: number;
    deliveryDate: string;
    deliveryDays: number;
    priority: Priority;
    status: import("../types.js").OrderStatus;
    notes: string;
    error?: undefined;
} | {
    error: string;
    success?: undefined;
    orderNumber?: undefined;
    transaction?: undefined;
    material?: undefined;
    quantity?: undefined;
    unit?: undefined;
    vendor?: undefined;
    totalPrice?: undefined;
    totalPriceNet?: undefined;
    deliveryDate?: undefined;
    deliveryDays?: undefined;
    priority?: undefined;
    status?: undefined;
    notes?: undefined;
};
//# sourceMappingURL=update-purchase-order.d.ts.map