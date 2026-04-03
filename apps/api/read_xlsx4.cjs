const xlsx = require('xlsx');
const fs = require('fs');
const wb = xlsx.readFile('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data\\Bus Allocation&Status-Seats.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = xlsx.utils.sheet_to_json(ws, {header: 1});
fs.writeFileSync('c:\\SIMS\\sams-render\\apps\\api\\headers.txt', JSON.stringify(raw.slice(0, 15), null, 2));
