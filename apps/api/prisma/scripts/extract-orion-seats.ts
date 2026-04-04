import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

// Existing SKUs
const existingSkus = new Set([
  "6476096", "6476097", "6476098", "6476099", 
  "6476101", "6498984", "6477979", "6499298"
]);

const FILES = [
  "C:/SIMS/sams-render/SIMS/Seats2/1336AB - Bus #8100 - 8219.pdf",
  "C:/SIMS/sams-render/SIMS/Seats2/1358AB-1359AB - Bus #8300-8396.pdf"
];

const MATCHERS = [
  "insert back", "insert cushion", "backrest", "seat bottom", "bottom cushion"
];

const SKIPPERS = [
  "assembly", "barrier", "harness", "usb", "bolt", "nut", "screw", "washer", "frame", "frame back", "frame cushion"
];

function isMatch(desc: string) {
  const d = desc.toLowerCase();
  
  // Exclude skippers
  for (const s of SKIPPERS) {
    if (d.includes(s)) return false;
  }
  
  // Include matchers
  for (const m of MATCHERS) {
    if (d.includes(m)) return true;
  }
  return false;
}

function determineCategory(desc: string) {
  const d = desc.toLowerCase();
  if (d.includes("back") || d.includes("backrest") || d.includes("insert back")) return "BACK";
  if (d.includes("cushion") || d.includes("bottom")) return "CUSHION";
  return "UNKNOWN";
}

async function run() {
  const newCushions = new Map(); // map partNumber -> desc
  const newBacks = new Map();
  const reused = new Map(); // map partNumber -> details
  const qtys = new Map();

  for (const file of FILES) {
    const fn = path.basename(file);
    const data = await pdf(fs.readFileSync(file));
    const lines = data.text.split("\n");

    let expectedQty = false;
    let qtyContext = 0;

    // Pattern to grab "1 BS-1234 DESCRIPTION 4"
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      
      // Look for a typical BOM part row pattern
      // Often looks like: [Ref/Index] [Part No] [Desc] [Qty]
      // Or just line by line if text is jagged. Let's do a broad catch.
      // But these manuals might be different. Let's assume there's a part number like 64XXXXX or BS-XXXX or numbers.
      // Easiest is to search for keywords in the line.
      if (isMatch(line)) {
        // Now try to extract the part number (usually a contiguous alphanumeric string with dashes near the start or end).
        // Let's identify the number 64XXXXX or similar.
        const matches = line.match(/\b([A-Z0-9-]{6,15})\b/g);
        if (matches) {
           for (const potentialPart of matches) {
              if (potentialPart.match(/^[0-9]+$/) && potentialPart.length < 5) continue; // skip pure qtys
              if (potentialPart.match(/^[A-Z]+$/)) continue; // skip pure text words masquerading

              // Often numbers like 6477979 or BS-1234
              const part = potentialPart;
              const cat = determineCategory(line);

              let qty = "Unknown";
              // Try to find a standalone number at end of string or nearby.
              const qtyMatch = line.match(/\s+(\d+)\s*$/);
              if (qtyMatch) qty = qtyMatch[1];
              else {
                // look next line
                if (lines[i+1]?.match(/^\d+$/)) qty = lines[i+1].trim();
                else if (line.match(/^\d+\s+/)) qty = line.match(/^(\d+)\s+/)?.[1] || qty;
              }

              if (existingSkus.has(part)) {
                 reused.set(part, { desc: line.substring(0, 50), qty, file: fn });
                 qtys.set(`${part}-${fn}`, qty);
              } else {
                 if (cat === "CUSHION") newCushions.set(part, { desc: line, qty, file: fn });
                 if (cat === "BACK") newBacks.set(part, { desc: line, qty, file: fn });
              }
           }
        } else {
           // Maybe part number is on the previous line or next line
           const prev = lines[i-1]?.trim() || "";
           const next = lines[i+1]?.trim() || "";
           const maybePart = prev.match(/\b([A-Z0-9-]{6,15})\b/)?.[1] || next.match(/\b([A-Z0-9-]{6,15})\b/)?.[1];
           if (maybePart) {
              const part = maybePart;
              const cat = determineCategory(line);
              let qty = "Unknown";
              if (lines[i-2]?.trim().match(/^\d+$/)) qty = lines[i-2].trim();
              else if (lines[i+2]?.trim().match(/^\d+$/)) qty = lines[i+2].trim();

              if (existingSkus.has(part)) {
                 reused.set(part, { desc: line.substring(0, 50), qty, file: fn });
              } else {
                 if (cat === "CUSHION") newCushions.set(part, { desc: line, qty, file: fn });
                 if (cat === "BACK") newBacks.set(part, { desc: line, qty, file: fn });
              }
           }
        }
      }
    }
  }

  console.log("=== EXTRACTION RESULTS ===");
  console.log("------------------------");
  console.log(`NEW UNIQUE CUSHION SKUS (${newCushions.size}):`);
  newCushions.forEach((val, key) => console.log(` - ${key}: [QTY: ${val.qty}] ${val.desc.substring(0, 60)}`));

  console.log("\n------------------------");
  console.log(`NEW UNIQUE BACK SKUS (${newBacks.size}):`);
  newBacks.forEach((val, key) => console.log(` - ${key}: [QTY: ${val.qty}] ${val.desc.substring(0, 60)}`));

  console.log("\n------------------------");
  console.log(`ALREADY-KNOWN REUSED SKUS (${reused.size}):`);
  reused.forEach((val, key) => console.log(` - ${key}: [QTY: ${val.qty}] ${val.desc.substring(0, 60)}`));
}

run().catch(console.error);
