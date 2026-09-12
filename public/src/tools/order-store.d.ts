import type { OrderData, OrderStatus } from '../types.js';
declare class OrderStore {
    private orders;
    constructor();
    private load;
    private save;
    get(key: string): (OrderData & {
        status: OrderStatus;
    }) | undefined;
    set(key: string, value: OrderData & {
        status: OrderStatus;
    }): void;
    delete(key: string): void;
    getAll(): (OrderData & {
        status: OrderStatus;
    })[];
    update(key: string, updates: Partial<OrderData & {
        status: OrderStatus;
    }>): {
        orderNumber: string;
        quantity: number;
        material: import("../types.js").Material;
        vendor: import("../types.js").Vendor;
        totalPrice: number;
        deliveryDate: string;
        deliveryDays: number;
        requestedBy: string;
        costCenter: string;
        priority: import("../types.js").Priority;
        notes: string;
        status: "Draft" | "Created" | "Updated" | "Submitted" | "Approved" | "Pending Approval" | "Shipped" | "Delivered" | "Invoiced" | "Cancelled";
        processedBy?: string;
        createdAt?: Date;
        updatedAt?: Date;
    } | null;
}
export declare const orderStore: OrderStore;
export {};
//# sourceMappingURL=order-store.d.ts.map