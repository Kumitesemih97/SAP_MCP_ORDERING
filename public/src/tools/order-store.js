/**
 * Persistent order store for the MCP server.
 * Saves and loads orders from a JSON file.
 */
import fs from 'node:fs';
import path from 'node:path';
const STORAGE_FILE = path.join(process.cwd(), 'orders.json');
class OrderStore {
    orders;
    constructor() {
        this.orders = new Map();
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(STORAGE_FILE)) {
                const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
                const parsed = JSON.parse(data);
                // Convert the plain object back into a Map
                Object.entries(parsed).forEach(([k, v]) => {
                    this.orders.set(k, v);
                });
            }
        }
        catch (err) {
            console.error('Error loading orders from disk:', err);
        }
    }
    save() {
        try {
            const data = JSON.stringify(Object.fromEntries(this.orders), null, 2);
            fs.writeFileSync(STORAGE_FILE, data, 'utf-8');
        }
        catch (err) {
            console.error('Error saving orders to disk:', err);
        }
    }
    get(key) {
        return this.orders.get(key);
    }
    set(key, value) {
        this.orders.set(key, value);
        this.save();
    }
    delete(key) {
        this.orders.delete(key);
        this.save();
    }
    getAll() {
        return Array.from(this.orders.values());
    }
    update(key, updates) {
        const existing = this.orders.get(key);
        if (existing) {
            const updated = { ...existing, ...updates };
            this.set(key, updated);
            return updated;
        }
        return null;
    }
}
export const orderStore = new OrderStore();
//# sourceMappingURL=order-store.js.map