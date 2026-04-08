const id = process.env.ORDER_ID;
const token = process.env.TOKEN;

async function run() {
  const getOrd = await fetch(`http://localhost:4000/api/seat-orders/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`CURL Proof 1 (GET /api/seat-orders/${id}): HTTP ${getOrd.status}`);
  if (getOrd.ok) console.log(await getOrd.json());

  const getLogs = await fetch(`http://localhost:4000/api/seat-orders/${id}/logs?take=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`CURL Proof 2 (GET /api/seat-orders/${id}/logs?take=100): HTTP ${getLogs.status}`);
  if (getLogs.ok) console.log(await getLogs.json());
}
run();
