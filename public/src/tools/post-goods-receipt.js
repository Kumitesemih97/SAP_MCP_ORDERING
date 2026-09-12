import { MATERIALS } from '../data.js';
import { orderStore } from './order-store.js';
export const postGoodsReceiptTool = {
    name: 'post_goods_receipt',
    description: 'Post a goods receipt for a delivered order (MIGO). Marks the order as Delivered and updates stock levels.',
    inputSchema: {
        type: 'object',
        properties: {
            order_number: {
                type: 'string',
                description: 'Purchase order number',
            },
            quantity_received: {
                type: 'number',
                description: 'Quantity actually received',
            },
        },
        required: ['order_number', 'quantity_received'],
    },
};
export function handlePostGoodsReceipt(args) {
    const orderNumber = String(args.order_number ?? '').toUpperCase();
    const quantityReceived = Number(args.quantity_received ?? 0);
    const order = orderStore.get(orderNumber);
    if (!order)
        return { error: `Order "${orderNumber}" not found` };
    if (order.status === 'Delivered') {
        return { error: `Goods receipt already posted for ${orderNumber}` };
    }
    if (quantityReceived <= 0)
        return { error: 'quantity_received must be > 0' };
    order.status = 'Delivered';
    order.updatedAt = new Date();
    const mat = MATERIALS.find(m => m.id === order.material.id);
    if (mat && mat.stockLevel !== undefined) {
        mat.stockLevel += quantityReceived;
    }
    return {
        success: true,
        transaction: 'MIGO',
        orderNumber,
        material: order.material.name,
        quantityReceived,
        unit: order.material.unit,
        newStatus: 'Delivered',
        postedAt: new Date().toISOString(),
        message: `Goods receipt posted for PO ${orderNumber}. ${quantityReceived} ${order.material.unit} of ${order.material.name} received.`,
    };
}
//# sourceMappingURL=post-goods-receipt.js.map