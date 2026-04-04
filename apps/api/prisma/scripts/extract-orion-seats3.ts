import fs from "fs";
import path from "path";

async function loadPdfLib() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  } catch (e) {
    try {
      return require("pdfjs-dist/legacy/build/pdf.js");
    } catch(e2) {
      return require("pdfjs-dist");
    }
  }
}

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
  for (const s of SKIPPERS) {
    if (d.includes(s)) return false;
  }
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

async function extractTextFromPdf(pdfPath: string): Promise<string[]> {
  const pdfjsLib: any = await loadPdfLib();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableFontFace: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const allLines: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group items by approximate Y coordinate to form rows
    const rowMap = new Map<number, any[]>();
    for (const item of textContent.items) {
      if (!item.str || item.str.trim() === '') continue;
      // Truncate decimals for looser Y clustering
      const y = Math.round(item.transform[5]);
      
      let foundY = y;
      // fuzzy merge rows within 2 pixels
      for (const key of rowMap.keys()) {
         if (Math.abs(key - y) <= 2) {
             foundY = key;
             break;
         }
      }
      
      if (!rowMap.has(foundY)) rowMap.set(foundY, []);
      rowMap.get(foundY)!.push({ text: item.str, x: item.transform[4] });
    }

    const sortedYs = Array.from(rowMap.keys()).sort((a, b) => b - a); // Top to bottom
    for (const y of sortedYs) {
      const items = rowMap.get(y)!;
      items.sort((a, b) => a.x - b.x); // Left to right
      allLines.push(items.map(it => it.text.trim()).join('  '));
    }
  }
  return allLines;
}

async function run() {
  const newCushions = new Map();
  const newBacks = new Map();
  const reused = new Map();

  for (const file of FILES) {
    console.log(`Extracting: ${path.basename(file)}`);
    const fn = path.basename(file);
    const lines = await extractTextFromPdf(file);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      
      if (isMatch(line)) {
        // Part numbers are usually like 64XXXXX or 81XXXX or with dashes
        const matches = line.match(/\b([A-Z0-9-]{6,15})\b/g);
        if (matches) {
           for (const potentialPart of matches) {
              if (potentialPart.match(/^[0-9]+$/) && potentialPart.length < 5) continue; 
              if (potentialPart.match(/^[A-Z]+$/)) continue; 

              const part = potentialPart;
              const cat = determineCategory(line);

              let qty = "Unknown";
              const qtyMatch = line.match(/\bQTY[^\d]*(\d+)/i) || line.match(/(\d+)\s*$/);
              if (qtyMatch) {
                  qty = qtyMatch[1];
              } else {
                  // Fallback: looking for standalone small number
                  const looseQty = line.match(/\b(\d{1,2})\b/);
                  if (looseQty) qty = looseQty[1];
              }
              
              const cleanDesc = line.replace(/\b([A-Z0-9-]{6,15})\b/g, '').replace(/^\d+/, '').replace(/\b\d\b/, '').replace(/\s+/g, ' ').trim();

              if (existingSkus.has(part)) {
                 reused.set(part, { desc: cleanDesc, qty, file: fn });
              } else {
                 if (cat === "CUSHION") newCushions.set(part, { desc: cleanDesc, qty, file: fn });
                 if (cat === "BACK") newBacks.set(part, { desc: cleanDesc, qty, file: fn });
              }
           }
        }
      }
    }
  }

  console.log("\n=== EXTRACTION RESULTS ===");
  console.log("------------------------");
  console.log(`NEW UNIQUE CUSHION SKUS (${newCushions.size}):`);
  newCushions.forEach((val, key) => console.log(` - ${key}: [QTY: ${val.qty}] ${val.desc}`));

  console.log("\n------------------------");
  console.log(`NEW UNIQUE BACK SKUS (${newBacks.size}):`);
  newBacks.forEach((val, key) => console.log(` - ${key}: [QTY: ${val.qty}] ${val.desc}`));

  console.log("\n------------------------");
  console.log(`ALREADY-KNOWN REUSED SKUS (${reused.size}):`);
  reused.forEach((val, key) => console.log(` - ${key}: [QTY: ${val.qty}] ${val.desc}`));
}

run().catch(console.error);
