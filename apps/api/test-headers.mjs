import fs from 'fs';
import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\samss\\Downloads\\Bus Allocation march 24.xls';
const fileBuffer = fs.readFileSync(filePath);
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

const output = rawHeaders.map(h => ({
    header: h,
    hex: h.split('').map(c => c.charCodeAt(0).toString(16)).join(' ')
}));

fs.writeFileSync('headers.json', JSON.stringify(output, null, 2));
console.log("Wrote headers.json!");
