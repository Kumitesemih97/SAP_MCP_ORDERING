/**
 * MCP tool: create_purchase_order — ME21N
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Priority } from '../types.js';
export declare const createPurchaseOrderTool: Tool;
export declare function handleCreatePurchaseOrder(args: Record<string, unknown>): {
    success: boolean;
    orderNumber: string;
    transaction: string;
    material: string;
    materialId: string;
    quantity: number;
    unit: string;
    vendor: string;
    vendorId: string;
    totalPrice: string;
    totalPriceNet: number;
    deliveryDate: string;
    deliveryDays: number;
    priority: Priority;
    status: import("../types.js").OrderStatus;
    costCenter: string;
    requestedBy: string;
    notes: string;
    error?: undefined;
} | {
    error: string;
    success?: undefined;
    orderNumber?: undefined;
    transaction?: undefined;
    material?: undefined;
    materialId?: undefined;
    quantity?: undefined;
    unit?: undefined;
    vendor?: undefined;
    vendorId?: undefined;
    totalPrice?: undefined;
    totalPriceNet?: undefined;
    deliveryDate?: undefined;
    deliveryDays?: undefined;
    priority?: undefined;
    status?: undefined;
    costCenter?: undefined;
    requestedBy?: undefined;
    notes?: undefined;
};
//# sourceMappingURL=create-purchase-order.d.ts.map