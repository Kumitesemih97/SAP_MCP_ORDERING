/**
 * MCP tool: check_material_stock
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MATERIALS, findMaterialByKeyword, formatCurrency } from '../data.js';

export const checkMaterialStockTool: Tool = {
  name: 'check_material_stock',
  description: 'Check current stock level for a specific material by ID or name.',
  inputSchema: {
    type: 'object',
    properties: {
      material_id: {
        type: 'string',
        description: 'Material ID (e.g. MAT001) or name keyword',
      },
    },
    required: ['material_id'],
  },
};

export function handleCheckMaterialStock(args: Record<string, unknown>) {
  const query = String(args.material_id ?? '').toLowerCase();

  const material =
    MATERIALS.find(m => m.id.toLowerCase() === query) ?? findMaterialByKeyword(query);

  if (!material) {
    return { error: `Material "${query}" not found`, availableIds: MATERIALS.map(m => m.id) };
  }

  const stock = material.stockLevel ?? 0;

  return {
    id: material.id,
    name: material.name,
    category: material.category,
    unit: material.unit,
    stockLevel: stock,
    stockStatus: stock === 0 ? 'out_of_stock' : stock < 50 ? 'low' : 'available',
    minOrderQuantity: material.minOrderQuantity ?? 1,
    maxOrderQuantity: material.maxOrderQuantity ?? 'unlimited',
    pricePerUnit: material.price,
    priceFormatted: formatCurrency(material.price),
  };
}
