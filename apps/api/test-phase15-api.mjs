import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:4000/api/seat-inserts';

const endpoints = [
  { method: 'GET', url: '/dashboard/summary' },
  { method: 'GET', url: '/inventory/by-location' },
  { method: 'GET', url: '/alerts' },
  { method: 'GET', url: '/replacements' },
  { method: 'GET', url: '/disposals' },
  { method: 'POST', url: '/rules/run' }
];

async function runTests() {
  console.log("Starting API Verification Sequence\\n");
  let allPassed = true;

  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}${ep.url}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      const duration = Date.now() - start;

      if (res.ok) {
        console.log(`✅ [PASS] ${ep.method} ${ep.url} (${duration}ms)`);
        console.log(`    Response Shape: ${Object.keys(data).join(', ').substring(0, 100)}${Object.keys(data).length > 5 ? '...' : ''}`);
      } else {
        console.error(`❌ [FAIL] ${ep.method} ${ep.url} - Status ${res.status}`);
        console.error(`    Error Payload:`, data);
        allPassed = false;
      }
    } catch (e) {
      console.error(`❌ [FAIL] ${ep.method} ${ep.url} - Network/Crash Error`);
      console.error(`    Message: ${e.message}`);
      allPassed = false;
    }
  }

  console.log("\\nAPI Verification Complete.");
  console.log("Final Status: " + (allPassed ? "READY FOR FRONTEND" : "BLOCKED"));
}

runTests();
