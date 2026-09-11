import { poService } from '../src/services/po-service.js';
import { handleCreatePurchaseOrder } from '../src/tools/create-purchase-order.js';
import { handleUpdatePurchaseOrder } from '../src/tools/update-purchase-order.js';
import { handleApprovePurchaseOrder } from '../src/tools/approve-purchase-order.js';
import { handleVerifyInvoice } from '../src/tools/verify-invoice.js';
import { orderStore } from '../src/tools/order-store.js';
import { MATERIALS } from '../src/data.js';

async function runTests() {
  console.log('🚀 Starting Verification Tests...\n');

  const material = MATERIALS[0]; // Screws M6x20, price 0.15
  const expensiveMaterial = MATERIALS[MATERIALS.length - 1]; // Industrial Server, price 12500.00

  // 1. Budget Test
  console.log('Test 1: Budget Enforcement');
  try {
    // Mock user cost center 6000 has budget 5000
    // Order 1000 servers = 12,500,000 (way over 5000)
    // Note: handleCreatePurchaseOrder uses MOCK_USER.costCenter (4200 - budget 50000)
    // We need to test poService.verifyBudget directly or mock MOCK_USER.
    poService.verifyBudget('6000', 6000);
    console.error('❌ Budget check failed: should have thrown error for 6000 > 5000');
  } catch (e: any) {
    console.log('✅ Budget check passed: ' + e.message);
  }

  // 2. Approval Test
  console.log('\nTest 2: Approval Threshold');
  const lowPrice = 100;
  const highPrice = 1000;
  console.log(`- Low price (${lowPrice}): ${poService.determineStatus(lowPrice)}`);
  console.log(`- High price (${highPrice}): ${poService.determineStatus(highPrice)}`);
  if (poService.determineStatus(lowPrice) === 'Created' && poService.determineStatus(highPrice) === 'Pending Approval') {
    console.log('✅ Approval threshold passed');
  } else {
    console.error('❌ Approval threshold failed');
  }

  // 3. Create Order Regression
  console.log('\nTest 3: Create Purchase Order');
  const createRes = handleCreatePurchaseOrder({
    material_name: material.name,
    quantity: 100,
    priority: 'Normal'
  });
  if (createRes.success && createRes.orderNumber) {
    console.log(`✅ Order created: ${createRes.orderNumber}`);

    // 4. Persistence Test
    const stored = orderStore.get(createRes.orderNumber as string);
    if (stored) {
      console.log('✅ Persistence passed: Order found in store');
    } else {
      console.error('❌ Persistence failed: Order not found in store');
    }

    // 5. Update Order Regression
    console.log('\nTest 4: Update Purchase Order');
    const updateRes = handleUpdatePurchaseOrder({
      order_number: createRes.orderNumber,
      quantity: 200
    });
    if (updateRes.success && updateRes.quantity === 200) {
      console.log('✅ Update passed: Quantity updated to 200');
    } else {
      console.error('❌ Update failed:', updateRes);
    }

    // 6. Approve Order Regression
    console.log('\nTest 5: Approve Purchase Order');
    // To test approval, we need an order in 'Pending Approval'
    const highValueRes = handleCreatePurchaseOrder({
      material_name: expensiveMaterial.name,
      quantity: 1,
      priority: 'Normal'
    });
    if (highValueRes.success && highValueRes.status === 'Pending Approval') {
      console.log(`✅ High value order created: ${highValueRes.orderNumber} (Pending Approval)`);
      const approveRes = handleApprovePurchaseOrder({
        order_number: highValueRes.orderNumber
      });
      if (approveRes.success && approveRes.newStatus === 'Approved') {
        console.log('✅ Approval passed');
      } else {
        console.error('❌ Approval failed:', approveRes);
      }

      // 7. Invoice Order Regression
      console.log('\nTest 6: Verify Invoice (MIRO)');
      const invoiceRes = handleVerifyInvoice({
        order_number: highValueRes.orderNumber
      });
      if (invoiceRes.success && invoiceRes.newStatus === 'Invoiced') {
        console.log('✅ Invoice verification passed');
      } else {
        console.error('❌ Invoice verification failed:', invoiceRes);
      }
    } else {
      console.error('❌ Failed to create pending order for approval test');
    }

  } else {
    console.error('❌ Create order failed:', createRes);
  }

  console.log('\n✨ Verification complete!');
}

runTests().catch(console.error);
