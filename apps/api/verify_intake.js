(async () => {
  try {
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@local', password: 'bypass' })
    });
    const loginResult = await loginRes.json();
    const token = loginResult.token;

    const garagesRes = await fetch('http://localhost:4000/api/garages', { headers: { Authorization: `Bearer ${token}` } });
    const garages = await garagesRes.json();
    const targetGarage = garages[0].id;

    const rangesRes = await fetch('http://localhost:4000/api/v1/catalog/bus-compat', { headers: { Authorization: `Bearer ${token}` } });
    const ranges = await rangesRes.json();
    const targetRange = ranges[0];

    // GET by-range proof
    const itemsRes = await fetch(`http://localhost:4000/api/inventory/seat-inserts/by-range?garageId=${targetGarage}&busCompatibilityId=${targetRange.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const items = await itemsRes.json();
    const targetItem = items[0];

    console.log('[PROOF] Items retrieved for range:', items.length);
    console.log(`[PROOF] BEFORE INTAKE | Qty: ${targetItem.currentQty}`);

    // POST intake proof
    const payload = {
      garageId: targetGarage,
      busCompatibilityId: targetRange.id,
      notes: 'Automated Verify',
      items: [ { seatInsertTypeId: targetItem.seatInsertTypeId, quantity: 15 } ]
    };

    const intakeRes = await fetch('http://localhost:4000/api/inventory/seat-inserts/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    
    if(!intakeRes.ok) {
       console.log('Error From Server:', await intakeRes.text());
       return;
    }
    const intakeResult = await intakeRes.json();
    console.log('[PROOF] INTAKE SUCCESS:', intakeResult);

    // Verify inventory result
    const itemsResAfter = await fetch(`http://localhost:4000/api/inventory/seat-inserts/by-range?garageId=${targetGarage}&busCompatibilityId=${targetRange.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const itemsAfter = await itemsResAfter.json();
    const targetItemAfter = itemsAfter.find(i => i.seatInsertTypeId === targetItem.seatInsertTypeId);
    
    console.log(`[PROOF] AFTER INTAKE | Qty: ${targetItemAfter.currentQty} (expected +15)`);
    
    // Verify ledger
    const transactionsRes = await fetch(`http://localhost:4000/api/inventory/transactions`, { headers: { Authorization: `Bearer ${token}` } });
    const transactions = await transactionsRes.json();
    const matchingTx = transactions.find(t => t.referenceId === targetRange.id && t.type === 'RECEIVE');
    console.log(`[PROOF] LEDGER RECEIVE TRANSACTION DEFINED:`, matchingTx.type, matchingTx.referenceId);
    
  } catch (e) {
    console.error('Test Failed:', e);
  }
})();
