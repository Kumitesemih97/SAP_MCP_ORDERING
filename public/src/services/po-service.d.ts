import type { Material, Vendor, Priority, OrderStatus } from '../types.js';
export declare class POService {
    /**
     * Validates if the requested quantity is available and within material constraints.
     * @throws Error if validation fails.
     */
    validateMaterialStock(material: Material, quantity: number): void;
    /**
     * Resolves the best vendor for a material.
     * @throws Error if no vendor is found.
     */
    resolveVendor(material: Material, preferredName?: string): Vendor;
    /**
     * Verifies if the cost center has enough budget for the transaction.
     * @throws Error if budget is exceeded.
     */
    verifyBudget(costCenter: string, amount: number): void;
    /**
     * Determines the initial order status based on total price.
     */
    determineStatus(totalPrice: number): OrderStatus;
    /**
     * Validates if an order can be approved and returns the new status.
     * @throws Error if order is not in a state that can be approved.
     */
    validateAndApprove(currentStatus: OrderStatus): OrderStatus;
    /**
     * Validates if an order can be invoiced and returns the new status.
     * @throws Error if order is not in a state that can be invoiced.
     */
    validateAndInvoice(currentStatus: OrderStatus): OrderStatus;
    /**
     * Maps priority to delivery lead time.
     */
    calculateDeliveryDays(priority: Priority): number;
}
export declare const poService: POService;
//# sourceMappingURL=po-service.d.ts.map