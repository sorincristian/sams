import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import * as xlsx from "xlsx";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large; max 5 MB' });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

function normalizeHeader(h: string): string {
  if (!h) return '';
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const FIELD_ALIASES: Record<string, string[]> = {
  partNumber: ['partnumber', 'part', 'partno', 'itemnumber', 'skunumber'],
  description: ['description', 'desc', 'name', 'itemdesc'],
  vendor: ['vendor', 'supplier', 'source'],
  manufacturerPartNumber: ['manufacturerpartnumber', 'mfgpartno', 'mfgpart'],
  category: ['category', 'type', 'itemtype', 'inserttype']
};

function resolveColumnMap(rawHeaders: string[]) {
  const mapping: Record<string, string | null> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    let bestMatch: string | null = null;
    let bestConfidence = 0;
    for (const rawHeader of rawHeaders) {
      const normalized = normalizeHeader(rawHeader);
      if (normalized === field.toLowerCase()) {
        bestMatch = rawHeader; break;
      }
      for (const alias of aliases) {
        if (normalized === normalizeHeader(alias)) {
          bestMatch = rawHeader; bestConfidence = 1; break;
        }
      }
      if (bestConfidence === 1) break;
    }
    mapping[field] = bestMatch;
  }
  return mapping;
}

function normalizeCategory(raw: string): "CUSHION" | "BACK" | null {
  const norm = String(raw || "").toLowerCase().replace(/[^a-z]/g, "");

  const cushionAliases = new Set([
    "cushion",
    "seatcushion",
    "cushioninsert",
  ]);

  const backAliases = new Set([
    "back",
    "seatback",
    "backinsert",
  ]);

  if (cushionAliases.has(norm)) return "CUSHION";
  if (backAliases.has(norm)) return "BACK";
  return null;
}

router.get("/import/template", requireAuth, (req, res) => {
  const csvContent = "partNumber,description,vendor,manufacturerPartNumber,category\n,,,,,";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sams_catalog_import_template.csv"');
  res.send(csvContent);
});

router.post("/import/preview", requireAuth, handleUpload, async (req: any, res: any) => {
  const requestId = crypto.randomUUID();
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded", requestId });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);
    const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

    const columnMap = resolveColumnMap(rawHeaders);
    
    // Ensure vital columns mapped
    if (!columnMap['partNumber'] || !columnMap['description'] || !columnMap['category']) {
       return res.status(422).json({
          error: "Missing required column mappings (partNumber, description, category)",
          detectedHeaders: rawHeaders,
          mappedHeaders: columnMap,
          requestId
       });
    }

    const results = [];
    let validCushionCount = 0;
    let validBackCount = 0;
    let skippedCount = 0;

    const getField = (row: any, systemField: string): string => {
      const col = columnMap[systemField];
      if (!col) return '';
      const val = row[col];
      return val !== undefined && val !== null ? String(val).trim() : '';
    };

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const partNumber = getField(row, 'partNumber');
        const description = getField(row, 'description');
        const vendor = getField(row, 'vendor') || 'Unknown';
        const manufacturerPartNumber = getField(row, 'manufacturerPartNumber');
        const rawCategory = getField(row, 'category');

        const category = normalizeCategory(rawCategory);

        if (!partNumber || !description) {
           results.push({ rowNumber: i + 2, action: 'ERROR', data: row, errors: 'Missing Part Number or Description', isValid: false });
           skippedCount++;
           continue;
        }

        if (!category) {
           results.push({
               rowNumber: i + 2,
               action: 'SKIPPED',
               data: { partNumber, description, vendor, rawCategory },
               errors: 'Skipped: unsupported item type (only cushion/back inserts allowed)',
               isValid: false
           });
           skippedCount++;
        } else {
           if (category === 'CUSHION') validCushionCount++;
           if (category === 'BACK') validBackCount++;
           
           results.push({
               rowNumber: i + 2,
               action: 'UPSERT',
               data: { partNumber, description, vendor, manufacturerPartNumber, category },
               isValid: true
           });
        }
    }

    // 6) Empty-valid-import guard
    if (validCushionCount === 0 && validBackCount === 0) {
        return res.status(422).json({
            error: "No valid seat cushion or seat back insert catalog rows found in file.",
            requestId
        });
    }

    res.json({
        requestId,
        totalRows: rawRows.length,
        validCushions: validCushionCount,
        validBacks: validBackCount,
        skippedRows: skippedCount,
        detectedHeaders: rawHeaders,
        mappedHeaders: columnMap,
        rows: results
    });

  } catch (error: any) {
    res.status(500).json({ error: "Failed to process file", requestId });
  }
});

router.post("/import/commit", requireAuth, async (req: any, res: any) => {
    const requestId = crypto.randomUUID();
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Invalid payload format", requestId });

        const validRows = rows.filter((r: any) => r.isValid);
        let insertedCushions = 0;
        let insertedBacks = 0;
        let updatedRows = 0;

        await prisma.$transaction(async (tx) => {
            for (const r of validRows) {
               const { partNumber, description, vendor, manufacturerPartNumber, category } = r.data;

               const existing = await tx.seatInsertType.findUnique({
                   where: { partNumber }
               });

               if (existing) {
                   await tx.seatInsertType.update({
                       where: { id: existing.id },
                       data: { description, vendor, manufacturerPartNumber, category }
                   });
                   updatedRows++;
               } else {
                   await tx.seatInsertType.create({
                       data: { partNumber, description, vendor, manufacturerPartNumber, category, active: true }
                   });
                   if (category === 'CUSHION') insertedCushions++;
                   if (category === 'BACK') insertedBacks++;
               }
            }
        });

        res.json({ 
            success: true, 
            requestId, 
            insertedCushions, 
            insertedBacks, 
            updatedRows, 
            skippedRows: rows.length - validRows.length 
        });

    } catch (error: any) {
        res.status(500).json({ error: "Import transaction failed", requestId });
    }
});

export default router;
