const xlsx = require('xlsx');
const fs = require('fs');
const wb = xlsx.readFile('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data\\Bus Allocation&Status-Seats.xls');
const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});

let currentGarage = null;
let currentModel = null;
const buses = [];

for(let i=0; i<raw.length; i++) {
  const r = raw[i];
  const rowVals = r.filter(x => x && String(x).trim() !== "");
  if (rowVals.length === 0) continue;
  
  const v0 = String(r[0] || '').trim();
  const v1 = String(r[1] || '').trim();

  // If column 0 has text ending in Garage or division
  if (v0.toLowerCase().includes('garage') || v0.toLowerCase().includes('division')) {
     currentGarage = v0;
  }
  // If column 1 has text indicating a bus model (like "Orion Hybrid Bus..."), it is often set there
  else if (v1.toLowerCase().includes('bus') && !v1.toLowerCase().includes('status')) {
     currentModel = v1;
  }
  // Otherwise, scan the row for 4-digit numbers (fleet numbers)
  else {
    for (let c of r) {
      if (c && String(c).match(/^[0-9]{4}$/)) {
        buses.push({ garage: currentGarage, model: currentModel, fleetNumber: String(c) });
      }
    }
  }
}
fs.writeFileSync('parsed.json', JSON.stringify({buses: buses.slice(0, 50), total: buses.length}, null, 2));
