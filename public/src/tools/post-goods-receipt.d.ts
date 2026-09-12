/**
 * MCP tool: post_goods_receipt — MIGO
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const postGoodsReceiptTool: Tool;
export declare function handlePostGoodsReceipt(args: Record<string, unknown>): {
    error: string;
    success?: undefined;
    transaction?: undefined;
    orderNumber?: undefined;
    material?: undefined;
    quantityReceived?: undefined;
    unit?: undefined;
    newStatus?: undefined;
    postedAt?: undefined;
    message?: undefined;
} | {
    success: boolean;
    transaction: string;
    orderNumber: string;
    material: string;
    quantityReceived: number;
    unit: string;
    newStatus: string;
    postedAt: string;
    message: string;
    error?: undefined;
};
//# sourceMappingURL=post-goods-receipt.d.ts.map