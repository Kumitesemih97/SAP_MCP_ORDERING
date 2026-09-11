/**
 * Shared in-memory order store for the MCP server process.
 */
import type { OrderData, OrderStatus } from '../types.js';

export const orderStore: Map<string, OrderData & { status: OrderStatus }> = new Map();
