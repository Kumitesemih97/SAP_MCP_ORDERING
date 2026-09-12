/**
 * MCP tool: search_materials
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const searchMaterialsTool: Tool;
export declare function handleSearchMaterials(args: Record<string, unknown>): {
    found: number;
    message: string;
    materials: never[];
} | {
    found: number;
    materials: {
        id: string;
        name: string;
        description: string;
        category: string;
        unit: string;
        price: number;
        priceFormatted: string;
        stockLevel: string | number;
        minOrderQty: number;
        maxOrderQty: string | number;
    }[];
    message?: undefined;
};
//# sourceMappingURL=search-materials.d.ts.map