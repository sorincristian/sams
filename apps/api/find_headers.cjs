const xlsx = require('xlsx');
const fs = require('fs');
const wb = xlsx.readFile('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data\\Bus Allocation&Status-Seats.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = xlsx.utils.sheet_to_json(ws, {header: 1});
let found = false;
raw.forEach((r, i) => {
  const rowStr = JSON.stringify(r).toLowerCase();
  if (rowStr.includes('location') || rowStr.includes('bus type') || rowStr.includes('bus number') || rowStr.includes('model') || rowStr.includes('garage') || rowStr.includes('fleet')) {
    console.log(`Row ${i}:`, r.filter(x => x).join(' | '));
    found = true;
  }
});
if (!found) console.log("No standard headers found in the entire document. It is purely hierarchical.");
