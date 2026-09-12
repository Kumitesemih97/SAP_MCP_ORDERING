import { VENDORS, VENDOR_SPECIALIZATIONS, getVendorsByCategory } from '../data.js';
export const searchVendorsTool = {
    name: 'search_vendors',
    description: 'Search vendors by name or category specialization.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Vendor name to search for',
            },
            category: {
                type: 'string',
                description: 'Filter vendors that specialize in this material category',
            },
        },
    },
};
export function handleSearchVendors(args) {
    const name = args.name ? String(args.name).toLowerCase() : undefined;
    const category = args.category ? String(args.category) : undefined;
    let results = VENDORS.filter(v => v.isActive !== false);
    if (name) {
        results = results.filter(v => v.name.toLowerCase().includes(name) || v.contact.toLowerCase().includes(name));
    }
    if (category) {
        const byCat = getVendorsByCategory(category);
        const catIds = new Set(byCat.map(v => v.id));
        results = results.filter(v => catIds.has(v.id));
    }
    if (results.length === 0) {
        return { found: 0, message: 'No vendors found matching criteria', vendors: [] };
    }
    return {
        found: results.length,
        vendors: results.map(v => ({
            id: v.id,
            name: v.name,
            location: v.location,
            contact: v.contact,
            email: v.email,
            rating: v.rating,
            paymentTerms: v.paymentTerms,
            deliveryTerms: v.deliveryTerms ?? 'Standard',
            specializations: VENDOR_SPECIALIZATIONS[v.id] ?? [],
        })),
    };
}
//# sourceMappingURL=search-vendors.js.map