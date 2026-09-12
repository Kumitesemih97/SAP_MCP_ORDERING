import { orderStore } from './order-store.js';
import { poService } from '../services/po-service.js';
export const approvePurchaseOrderTool = {
    name: 'approve_purchase_order',
    description: 'Approve a purchase order that is pending approval. Transitions status from Pending Approval to Approved.',
    inputSchema: {
        type: 'object',
        properties: {
            order_number: {
                type: 'string',
                description: 'The PO number to approve (e.g. "PO123456")',
            },
        },
        required: ['order_number'],
    },
};
export function handleApprovePurchaseOrder(args) {
    try {
        const orderNumber = String(args.order_number ?? '');
        if (!orderNumber)
            throw new Error('order_number is required');
        const order = orderStore.get(orderNumber);
        if (!order)
            throw new Error(`Order ${orderNumber} not found`);
        const newStatus = poService.validateAndApprove(order.status ?? 'Draft');
        orderStore.update(orderNumber, { status: newStatus });
        return {
            success: true,
            orderNumber,
            previousStatus: order.status ?? 'Draft',
            newStatus,
            message: `Purchase order ${orderNumber} has been successfully approved.`,
        };
    }
    catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}
//# sourceMappingURL=approve-purchase-order.js.map