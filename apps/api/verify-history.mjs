import https from 'https';

const API_BASE = "https://sams-api-emwb.onrender.com/api";

async function verify() {
  console.log("Fetching a bus from production...");
  
  const busesReq = await fetch(`${API_BASE}/buses?pageSize=1`);
  const busesData = await busesReq.json();
  const bus = busesData.items && busesData.items.length > 0 ? busesData.items[0] : null;

  if (!bus) {
    console.log("No buses found in production DB.");
    return;
  }

  console.log(`\nTarget Bus Selected: ${bus.fleetNumber} (ID: ${bus.id})`);
  console.log("Fetching Maintenance History...");

  const historyReq = await fetch(`${API_BASE}/buses/${bus.id}/history`);
  if (!historyReq.ok) {
     console.error("HISTORY API FAILED:", historyReq.status, await historyReq.text());
     return;
  }

  const historyData = await historyReq.json();
  console.log("\nHistory returned successfully!");
  console.log(JSON.stringify(historyData, null, 2));
}

verify().catch(console.error);
