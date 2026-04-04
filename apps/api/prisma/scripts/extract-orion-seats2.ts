import PDFParser from "pdf2json";
import fs from "fs";
import path from "path";

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

async function extractFile(file: string) {
  return new Promise<string>((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", (errData) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
       resolve(pdfParser.getRawTextContent());
    });
    pdfParser.loadPDF(file);
  });
}

async function run() {
  const newCushions = new Map();
  const newBacks = new Map();
  const reused = new Map();

  for (const file of FILES) {
    const fn = path.basename(file);
    const text = await extractFile(file);
    // pdf2json separates lines by "\r\n"
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/\r/g, '').trim();
      if (!line) continue;
      
      if (isMatch(line)) {
        const matches = line.match(/\b([A-Z0-9-]{6,15})\b/g);
        if (matches) {
           for (const potentialPart of matches) {
              if (potentialPart.match(/^[0-9]+$/) && potentialPart.length < 5) continue; 
              if (potentialPart.match(/^[A-Z]+$/)) continue; 

              const part = potentialPart;
              const cat = determineCategory(line);

              let qty = "Unknown";
              const qtyMatch = line.match(/\bQTY[^\d]*(\d+)/i) || line.match(/(\d+)\s*$/);
              if (qtyMatch) qty = qtyMatch[1];
              
              if (existingSkus.has(part)) {
                 reused.set(part, { desc: line.substring(0, 70), qty, file: fn });
              } else {
                 if (cat === "CUSHION") newCushions.set(part, { desc: line.substring(0, 70), qty, file: fn });
                 if (cat === "BACK") newBacks.set(part, { desc: line.substring(0, 70), qty, file: fn });
              }
           }
        } else {
            // Also attempt to check next line for the part number (pdf2json sometimes breaks rows weirdly)
            const prev = lines[i-1]?.replace(/\r/g, '').trim() || "";
            const next = lines[i+1]?.replace(/\r/g, '').trim() || "";
            const maybePart = prev.match(/\b([A-Z0-9-]{6,15})\b/)?.[1] || next.match(/\b([A-Z0-9-]{6,15})\b/)?.[1];
            if (maybePart) {
                const part = maybePart;
                const cat = determineCategory(line);
                let qty = "Unknown";
                if (existingSkus.has(part)) {
                   reused.set(part, { desc: line.substring(0, 70), qty, file: fn });
                } else {
                   if (cat === "CUSHION") newCushions.set(part, { desc: line.substring(0, 70), qty, file: fn });
                   if (cat === "BACK") newBacks.set(part, { desc: line.substring(0, 70), qty, file: fn });
                }
            }
        }
      }
    }
  }

  console.log("=== EXTRACTION RESULTS ===");
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
