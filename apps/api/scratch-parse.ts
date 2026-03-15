import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const p = path.resolve(process.cwd(), "prisma/import-data/Bus Allocation&Status-Seats.xls");
console.log("Reading:", p);

const buffer = fs.readFileSync(p);
const wb = XLSX.read(buffer, { type: "buffer" });
console.log("Sheets:", wb.SheetNames);

for (const sheet of wb.SheetNames) {
  const ws = wb.Sheets[sheet];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n--- Sheet: ${sheet} ---`);
  console.log("Row Count:", json.length);
  if (json.length > 0) {
    console.log("R1:", json[0]);
    console.log("R2:", json[1] || []);
    console.log("R3:", json[2] || []);
  }
}
