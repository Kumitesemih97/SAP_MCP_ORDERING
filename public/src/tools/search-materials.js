import { MATERIALS, formatCurrency } from '../data.js';
export const searchMaterialsTool = {
    name: 'search_materials',
    description: 'Search the material catalog by keyword or category. Returns matching materials with stock levels and prices.',
    inputSchema: {
        type: 'object',
        properties: {
            keyword: {
                type: 'string',
                description: 'Search term (name, description, or category keyword)',
            },
            category: {
                type: 'string',
                description: 'Filter by category (e.g. "Office Supplies", "IT Accessories")',
            },
        },
        required: ['keyword'],
    },
};
export function handleSearchMaterials(args) {
    const keyword = String(args.keyword ?? '').toLowerCase();
    const category = args.category ? String(args.category).toLowerCase() : undefined;
    let results = MATERIALS.filter(m => m.name.toLowerCase().includes(keyword) ||
        m.description.toLowerCase().includes(keyword) ||
        m.category.toLowerCase().includes(keyword));
    if (category) {
        results = results.filter(m => m.category.toLowerCase().includes(category));
    }
    if (results.length === 0) {
        return { found: 0, message: `No materials found for "${keyword}"`, materials: [] };
    }
    return {
        found: results.length,
        materials: results.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            category: m.category,
            unit: m.unit,
            price: m.price,
            priceFormatted: formatCurrency(m.price),
            stockLevel: m.stockLevel ?? 'N/A',
            minOrderQty: m.minOrderQuantity ?? 1,
            maxOrderQty: m.maxOrderQuantity ?? 'unlimited',
        })),
    };
}
//# sourceMappingURL=search-materials.js.map