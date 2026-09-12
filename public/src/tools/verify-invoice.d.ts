/**
 * MCP tool: verify_invoice — MIRO
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { OrderStatus } from '../types.js';
export declare const verifyInvoiceTool: Tool;
export declare function handleVerifyInvoice(args: Record<string, unknown>): {
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
//# sourceMappingURL=verify-invoice.d.ts.map