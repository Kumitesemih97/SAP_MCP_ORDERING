import { orderStore } from './order-store.js';
import { poService } from '../services/po-service.js';
export const verifyInvoiceTool = {
    name: 'verify_invoice',
    description: 'Post an invoice for a purchase order (MIRO). Transitions status to Invoiced. Order must be Approved or Delivered.',
    inputSchema: {
        type: 'object',
        properties: {
            order_number: {
                type: 'string',
                description: 'The PO number to verify (e.g. "PO123456")',
            },
        },
        required: ['order_number'],
    },
};
export function handleVerifyInvoice(args) {
    try {
        const orderNumber = String(args.order_number ?? '');
        if (!orderNumber)
            throw new Error('order_number is required');
        const order = orderStore.get(orderNumber);
        if (!order)
            throw new Error(`Order ${orderNumber} not found`);
        const newStatus = poService.validateAndInvoice(order.status ?? 'Draft');
        orderStore.update(orderNumber, { status: newStatus });
        return {
            success: true,
            orderNumber,
            previousStatus: order.status ?? 'Draft',
            newStatus,
            message: `Invoice for order ${orderNumber} has been verified and posted (MIRO).`,
        };
    }
    catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}
//# sourceMappingURL=verify-invoice.js.map