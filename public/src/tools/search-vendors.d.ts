/**
 * MCP tool: search_vendors
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const searchVendorsTool: Tool;
export declare function handleSearchVendors(args: Record<string, unknown>): {
    found: number;
    message: string;
    vendors: never[];
} | {
    found: number;
    vendors: {
        id: string;
        name: string;
        location: string;
        contact: string;
        email: string;
        rating: number;
        paymentTerms: string;
        deliveryTerms: string;
        specializations: string[];
    }[];
    message?: undefined;
};
//# sourceMappingURL=search-vendors.d.ts.map