const xlsx = require('xlsx');
const fs = require('fs');
const wb = xlsx.readFile('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data\\Bus Allocation&Status-Seats.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const headers = xlsx.utils.sheet_to_json(ws, {header: 1})[0];
const rows = xlsx.utils.sheet_to_json(ws);
fs.writeFileSync('c:\\SIMS\\sams-render\\apps\\api\\headers.txt', JSON.stringify({headers, first: rows[0], total: rows.length}, null, 2));
