/**
 * MCP tool: approve_purchase_order
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { OrderStatus } from '../types.js';
export declare const approvePurchaseOrderTool: Tool;
export declare function handleApprovePurchaseOrder(args: Record<string, unknown>): {
    success: boolean;
    orderNumber: string;
    previousStatus: "Draft" | "Created" | "Updated" | "Submitted" | "Approved" | "Pending Approval" | "Shipped" | "Delivered" | "Invoiced" | "Cancelled";
    newStatus: OrderStatus;
    message: string;
    error?: undefined;
} | {
    error: string;
    success?: undefined;
    orderNumber?: undefined;
    previousStatus?: undefined;
    newStatus?: undefined;
    message?: undefined;
};
//# sourceMappingURL=approve-purchase-order.d.ts.map