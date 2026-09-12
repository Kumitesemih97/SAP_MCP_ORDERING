/**
 * Purchase Order Service
 * Encapsulates all SAP business rules and domain logic for procurement.
 */
import { VENDORS, COST_CENTER_BUDGETS, PO_CONFIG, getVendorsByCategory, findVendorByName, formatCurrency } from '../data.js';
export class POService {
    /**
     * Validates if the requested quantity is available and within material constraints.
     * @throws Error if validation fails.
     */
    validateMaterialStock(material, quantity) {
        const stock = material.stockLevel ?? Infinity;
        if (quantity > stock) {
            throw new Error(`Insufficient stock for ${material.name}. Requested: ${quantity}, Available: ${stock} ${material.unit}`);
        }
        const min = material.minOrderQuantity ?? 1;
        const max = material.maxOrderQuantity ?? Infinity;
        if (quantity < min) {
            throw new Error(`Minimum order quantity for ${material.name} is ${min} ${material.unit}`);
        }
        if (quantity > max) {
            throw new Error(`Maximum order quantity for ${material.name} is ${max} ${material.unit}`);
        }
    }
    /**
     * Resolves the best vendor for a material.
     * @throws Error if no vendor is found.
     */
    resolveVendor(material, preferredName) {
        let vendor = null;
        if (preferredName) {
            vendor = findVendorByName(preferredName);
            if (!vendor) {
                throw new Error(`Vendor "${preferredName}" not found`);
            }
        }
        else {
            const byCategory = getVendorsByCategory(material.category);
            vendor = (byCategory[0] ?? VENDORS[0]);
        }
        if (!vendor) {
            throw new Error('No suitable vendor found for this material');
        }
        return vendor;
    }
    /**
     * Verifies if the cost center has enough budget for the transaction.
     * @throws Error if budget is exceeded.
     */
    verifyBudget(costCenter, amount) {
        const budget = COST_CENTER_BUDGETS[costCenter] ?? 0;
        if (amount > budget) {
            throw new Error(`Budget exceeded for cost center ${costCenter}. Available: ${formatCurrency(budget)}, Requested: ${formatCurrency(amount)}`);
        }
    }
    /**
     * Determines the initial order status based on total price.
     */
    determineStatus(totalPrice) {
        return totalPrice > PO_CONFIG.APPROVAL_THRESHOLD
            ? 'Pending Approval'
            : 'Created';
    }
    /**
     * Validates if an order can be approved and returns the new status.
     * @throws Error if order is not in a state that can be approved.
     */
    validateAndApprove(currentStatus) {
        if (currentStatus !== 'Pending Approval') {
            throw new Error(`Order is in status ${currentStatus} and cannot be approved. It must be in Pending Approval status.`);
        }
        return 'Approved';
    }
    /**
     * Validates if an order can be invoiced and returns the new status.
     * @throws Error if order is not in a state that can be invoiced.
     */
    validateAndInvoice(currentStatus) {
        const validStatuses = ['Approved', 'Delivered'];
        if (!validStatuses.includes(currentStatus)) {
            throw new Error(`Order is in status ${currentStatus} and cannot be invoiced. It must be Approved or Delivered.`);
        }
        return 'Invoiced';
    }
    /**
     * Maps priority to delivery lead time.
     */
    calculateDeliveryDays(priority) {
        return PO_CONFIG.DELIVERY_DAYS[priority] ?? PO_CONFIG.DELIVERY_DAYS['Normal'] ?? 7;
    }
}
export const poService = new POService();
//# sourceMappingURL=po-service.js.map