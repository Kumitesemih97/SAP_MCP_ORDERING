/**
 * MCP tool: check_material_stock
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const checkMaterialStockTool: Tool;
export declare function handleCheckMaterialStock(args: Record<string, unknown>): {
    id: string;
    name: string;
    category: string;
    unit: string;
    stockLevel: number;
    stockStatus: string;
    minOrderQuantity: number;
    maxOrderQuantity: string | number;
    pricePerUnit: number;
    priceFormatted: string;
    error?: undefined;
} | {
    error: string;
    id?: undefined;
    name?: undefined;
    category?: undefined;
    unit?: undefined;
    stockLevel?: undefined;
    stockStatus?: undefined;
    minOrderQuantity?: undefined;
    maxOrderQuantity?: undefined;
    pricePerUnit?: undefined;
    priceFormatted?: undefined;
};
//# sourceMappingURL=check-material-stock.d.ts.map