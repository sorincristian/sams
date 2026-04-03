const xlsx = require('xlsx');
const wb = xlsx.readFile('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data\\Bus Allocation&Status-Seats.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const headers = xlsx.utils.sheet_to_json(ws, {header: 1})[0];
console.log("Headers:", headers);
const rows = xlsx.utils.sheet_to_json(ws);
console.log("Row 1:", rows[0]);
console.log("Total rows:", rows.length);
