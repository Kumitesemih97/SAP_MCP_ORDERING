/**
 * MCP tool: get_order_status
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const getOrderStatusTool: Tool;
export declare function handleGetOrderStatus(args: Record<string, unknown>): {
    error: string;
    tip: string;
    orderNumber?: undefined;
    status?: undefined;
    material?: undefined;
    quantity?: undefined;
    unit?: undefined;
    vendor?: undefined;
    totalPrice?: undefined;
    deliveryDate?: undefined;
    priority?: undefined;
    requestedBy?: undefined;
    createdAt?: undefined;
} | {
    orderNumber: string;
    status: "Draft" | "Created" | "Updated" | "Submitted" | "Approved" | "Pending Approval" | "Shipped" | "Delivered" | "Invoiced" | "Cancelled";
    material: string;
    quantity: number;
    unit: string;
    vendor: string;
    totalPrice: string;
    deliveryDate: string;
    priority: import("../types.js").Priority;
    requestedBy: string;
    createdAt: string | undefined;
    error?: undefined;
    tip?: undefined;
};
//# sourceMappingURL=get-order-status.d.ts.map