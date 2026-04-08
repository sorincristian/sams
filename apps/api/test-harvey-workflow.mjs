async function run() {
  const BASE_URL = 'http://127.0.0.1:4000/api/seat-inserts';
  const r = async (endpoint, options = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`FAILED: ${endpoint}`, text);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const json = await res.json();
    return json.success ? json.data : json;
  };

  try {
    console.log("=== 1. API VERIFICATION ===");
    const vendors = await r('/vendors');
    console.log("GET /vendors =>", JSON.stringify(vendors.slice(0, 1)));
    const harvey = vendors.find(v => v.name === "Harvey Shop");
    if (!harvey) throw new Error("Harvey Shop missing!");

    const batches = await r('/reupholstery/batches');
    console.log("GET /reupholstery/batches =>", batches.length);

    const vendorOrders = await r('/vendor-orders');
    console.log("GET /vendor-orders =>", vendorOrders.length);

    console.log("\n=== PREP DATA ===");
    // Get Prisma to seed a dummy garage and 5 new SeatInserts so we can safely test
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    let garage = await prisma.garage.findFirst();
    if (!garage) {
      garage = await prisma.garage.create({ data: { name: 'Test Garage ' + Date.now(), locationCode: 'TG1', type: 'MAINTENANCE_HUB' } });
    }
    let type = await prisma.seatInsertType.findFirst();
    if (!type) {
      type = await prisma.seatInsertType.create({ data: { name: 'Mock Type', partNumber: 'M001', color: 'Blue' } });
    }

    // Ensure system user exists for the API unauthenticated fallback
    let sysUser = await prisma.user.findUnique({ where: { id: 'system' } });
    if (!sysUser) {
      await prisma.user.create({ data: { id: 'system', name: 'System', email: 'system@sams.local', passwordHash: 'none', role: 'SYSTEM' } });
    }

    // Insert 2 mock NEW inserts using proper schema enums
    const insert1 = await prisma.seatInsert.create({ data: { stockClass: 'REPLACEMENT_AVAILABLE', conditionSource: 'NEW', seatType: 'M001', color: 'Blue', hardwareCode: 'H1', fleetType: 'F1', locationId: garage.id } });
    const insert2 = await prisma.seatInsert.create({ data: { stockClass: 'REPLACEMENT_AVAILABLE', conditionSource: 'NEW', seatType: 'M001', color: 'Blue', hardwareCode: 'H1', fleetType: 'F1', locationId: garage.id } });

    console.log(`\n=== 2. REUPHOLSTERY WORKFLOW ===`);
    console.log("Marking insert DIRTY...");
    await r(`/${insert1.id}/mark-dirty`, { method: 'POST' });

    console.log("Sending to Harvey...");
    const sendRes = await r(`/batches/send-to-vendor`, {
      method: 'POST',
      body: JSON.stringify({
        garageId: garage.id, vendorId: harvey.id,
        insertIds: [insert1.id], expectedReturnDate: new Date(Date.now() + 86400000).toISOString()
      })
    });
    console.log("Batch Created:", sendRes.batchNumber, "Status:", sendRes.status);
    const batchId = sendRes.id;

    console.log("Advancing batch...");
    await r(`/batches/${batchId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'SHIPPED' }) });
    let b = await prisma.reupholsteryBatch.findUnique({ where: { id: batchId } });
    console.log("Batch Status ->", b.status);

    await r(`/batches/${batchId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RECEIVED_BY_VENDOR' }) });
    await r(`/batches/${batchId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'IN_REUPHOLSTERY' }) });
    
    b = await prisma.reupholsteryBatch.findUnique({ where: { id: batchId }, include: { inserts: true } });
    console.log("Batch Status ->", b.status, "| Insert Status:", b.inserts[0].status);

    console.log("Returning batch...");
    await r(`/batches/${batchId}/receive`, { method: 'POST', body: JSON.stringify({ notes: 'E2E test receive' }) });
    
    b = await prisma.reupholsteryBatch.findUnique({ where: { id: batchId }, include: { inserts: true } });
    console.log("Batch Status ->", b.status, " | Insert Status:", b.inserts[0].status);
    if (b.inserts[0].status !== 'NEW') throw new Error("Insert did not return to NEW usable stock!");

    console.log("\n=== 3. VENDOR ORDER WORKFLOW ===");
    const orderRes = await r(`/vendor-orders`, {
      method: 'POST',
      body: JSON.stringify({
        garageId: garage.id, vendorId: harvey.id,
        expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ seatInsertTypeId: type.id, quantity: 5 }]
      })
    });
    console.log("Order Created:", orderRes.orderNumber, "Status:", orderRes.status);
    
    const fullOrder = await prisma.vendorOrder.findUnique({ where: { id: orderRes.id }, include: { lines: true } });
    const lineId = fullOrder.lines[0].id;
    console.log("Receiving partial order (2 of 5)...");
    const rec1 = await r(`/vendor-orders/${orderRes.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ lines: [{ lineId, receiveQuantity: 2 }], notes: "First shipment" })
    });
    let updatedOrder = await prisma.vendorOrder.findUnique({ where: { id: orderRes.id }, include: { lines: true } });
    console.log("Order Status ->", updatedOrder.status, "| Line 1 Received:", updatedOrder.lines[0].quantityReceived, "/ 5");

    try {
      console.log("Attempting to over-receive (6 more)...");
       await r(`/vendor-orders/${orderRes.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines: [{ lineId, receiveQuantity: 6 }], notes: "Over-receive" })
      });
      throw new Error("Over-receive succeeded when it should have failed!");
    } catch (e) {
      console.log("Blocked over-receive successfully:", e.message);
    }

    console.log("Receiving remaining order (3 of 5)...");
    const rec2 = await r(`/vendor-orders/${orderRes.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ lines: [{ lineId, receiveQuantity: 3 }], notes: "Final shipment" })
    });
    updatedOrder = await prisma.vendorOrder.findUnique({ where: { id: orderRes.id }, include: { lines: true } });
    console.log("Order Status ->", updatedOrder.status, "| Line 1 Received:", updatedOrder.lines[0].quantityReceived, "/ 5");

    console.log("\n=== 4. RULE ENGINE ===");
    console.log("Running Rules...");
    const rulesRes = await r(`/rules/run`, { method: 'POST' });
    console.log("Rules Output:", rulesRes.message);
    const alerts = await prisma.alert.findMany();
    console.log("Current active alerts in DB:", alerts.map(a => a.type));

    console.log("\n✅ E2E VERIFICATION COMPLETED SUCCESSFULLY!");
    process.exit(0);

  } catch(e) {
    console.error("❌ VERIFICATION FAILED:", e);
    process.exit(1);
  }
}

run();
