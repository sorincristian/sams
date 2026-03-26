import fs from 'fs';
import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\samss\\Downloads\\Bus Allocation march 24.xls';
const fileBuffer = fs.readFileSync(filePath);
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

console.log("RAW HEADERS:");
rawHeaders.forEach(h => {
    console.log(`[${h}] -> length: ${h.length}, charCodes: ${h.split('').map(c => c.charCodeAt(0)).join(', ')}`);
});

const aliases = ['fleet number', 'vehicle', 'unit number'];
console.log("\\nTesting normalize:");
const normalizeHeader = (h) => h.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\\s+/g, ' ').trim();

rawHeaders.forEach(h => {
    const norm = normalizeHeader(h);
    console.log(`[${h}] -> normalize -> [${norm}]`);
    aliases.forEach(alias => {
        if (norm === normalizeHeader(alias)) {
            console.log(`  MATCHED ALIAS: ${alias}`);
        }
    });
});
