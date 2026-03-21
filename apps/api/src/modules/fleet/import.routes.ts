import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { prisma } from "../../prisma.js";
import { requireAuth, AuthRequest } from "../../auth.js";

const router = Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// Multer error handler – returns 413 for oversized files
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large; max 5 MB' });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

export const IMPORT_COLUMNS = {
  FLEET_NUMBER: "Fleet Number",
  MODEL: "Model",
  MANUFACTURER: "Manufacturer",
  GARAGE: "Garage",
  STATUS: "Status"
};

router.get("/import/template", requireAuth, (req, res) => {
  const csvContent = "fleetNumber,model,manufacturer,garage,status\n,,,,,";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sams_fleet_import_template.csv"');
  res.send(csvContent);
});

router.post("/import/preview", requireAuth, handleUpload, async (req: any, res: any) => {
  const startTime = Date.now();
  try {
    const mode = req.body.mode || 'UPSERT'; // UPSERT, CREATE_ONLY, UPDATE_ONLY
    // Accept optional manual column mapping from the wizard (JSON string)
    let columnMapping: Record<string, string | null> = {};
    try {
      if (req.body.columnMapping) {
        columnMapping = typeof req.body.columnMapping === 'string'
          ? JSON.parse(req.body.columnMapping)
          : req.body.columnMapping;
      }
    } catch (e) { /* ignore bad JSON */ }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

    const garages = await prisma.garage.findMany();
    const existingBuses = await prisma.bus.findMany({ select: { fleetNumber: true } });
    const existingFleetSet = new Set(existingBuses.map(b => b.fleetNumber));

    const results = [];
    let validCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    
    // Intra-file duplicate tracker
    const fileSeenFleetNumbers = new Set<string>();

    // Default alias lookup tables
    const DEFAULT_ALIASES: Record<string, string[]> = {
      fleetNumber: ["fleet #", "fleet number", "fleetnumber"],
      model: ["model", "bus model"],
      manufacturer: ["manufacturer", "make"],
      garage: ["garage", "garage name", "garage / depot", "depot"],
      status: ["status"]
    };

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        // Build a lookup that tries manual mapping first, then alias detection
        const getField = (systemField: string): string => {
            // 1. If manual mapping provides a column name for this field, use it directly
            const manualCol = columnMapping[systemField];
            if (manualCol) {
                // Try exact match first, then case-insensitive
                if (row[manualCol] !== undefined && row[manualCol] !== null) {
                    return String(row[manualCol]).trim();
                }
                // Case-insensitive fallback on raw keys
                for (const key of Object.keys(row)) {
                    if (key.trim().toLowerCase() === manualCol.trim().toLowerCase()) {
                        return String(row[key]).trim();
                    }
                }
            }

            // 2. Fall back to alias detection (original behavior)
            const aliases = DEFAULT_ALIASES[systemField] || [];
            for (const alias of aliases) {
                for (const key of Object.keys(row)) {
                    if (key.trim().toLowerCase() === alias) {
                        return String(row[key]).trim();
                    }
                }
            }
            return '';
        };

        const fleetNum = getField("fleetNumber");
        const model = getField("model");
        const mfg = getField("manufacturer");
        const garageInput = getField("garage").toUpperCase();
        let status = getField("status").toUpperCase() || 'ACTIVE';
        
        const errors = [];
        
        if (!fleetNum) errors.push("Missing Fleet Number");
        if (!model) errors.push("Missing Model");
        if (!mfg) errors.push("Missing Manufacturer");

        if (!['ACTIVE', 'MAINTENANCE', 'RETIRED'].includes(status)) {
            status = 'ACTIVE';
        }

        let garageId = null;
        let matchedGarageName = "Unknown";
        if (garageInput) {
            const match = garages.find(g => g.code.toUpperCase() === garageInput || g.name.toUpperCase() === garageInput);
            if (match) {
                garageId = match.id;
                matchedGarageName = match.name;
            } else {
                errors.push(`Garage '${garageInput}' not found`);
            }
        } else {
            errors.push("Missing Garage");
        }

        // Intra-file duplicate check
        if (fleetNum && fileSeenFleetNumbers.has(fleetNum)) {
            errors.push("Duplicate fleet number within the same file");
            duplicateCount++;
        }
        if (fleetNum) {
            fileSeenFleetNumbers.add(fleetNum);
        }

        const isExisting = existingFleetSet.has(fleetNum);
        
        let action = 'ERROR';
        if (errors.length === 0) {
            if (isExisting) {
                if (mode === 'CREATE_ONLY') {
                    action = 'SKIP';
                    errors.push("Bus already exists (Create Only mode)");
                } else {
                    action = 'UPDATE';
                }
            } else {
                if (mode === 'UPDATE_ONLY') {
                    action = 'SKIP';
                    errors.push("Bus not found in database (Update Only mode)");
                } else {
                    action = 'CREATE';
                }
            }
        }

        const isValid = action === 'CREATE' || action === 'UPDATE';

        if (!isValid && action !== 'SKIP') {
            errorCount++;
        } else if (isValid) {
            validCount++;
        }

        results.push({
            rowNumber: i + 2, // Accounting for 0-index + Header row
            action,
            data: { fleetNumber: fleetNum, model, manufacturer: mfg, status, garageId, garageName: matchedGarageName },
            errors,
            isValid
        });
    }

    // Build header mapping info for the wizard
    const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const HEADER_ALIASES: Record<string, string[]> = {
      fleetNumber: ["fleet #", "fleet number", "fleetnumber"],
      model: ["model", "bus model"],
      manufacturer: ["manufacturer", "make"],
      garage: ["garage", "garage name", "garage / depot", "depot"],
      status: ["status"]
    };

    const mappedHeaders: Record<string, string | null> = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      const match = rawHeaders.find(h => aliases.includes(h.trim().toLowerCase()));
      mappedHeaders[field] = match || null;
    }

    const durationMs = Date.now() - startTime;
    const filename = req.file?.originalname || 'unknown';

    // Structured log
    console.log(JSON.stringify({
      event: 'IMPORT_PREVIEW', actor: req.user?.userId, filename,
      fileSize: req.file?.size, totalRows: rawRows.length,
      validRows: validCount, errorRows: errorCount,
      duplicateRows: duplicateCount, durationMs, outcome: 'previewed'
    }));

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        action: 'IMPORT_PREVIEW', entity: 'fleet', entityId: 'bulk',
        userId: req.user?.userId ?? 'system',
        after: { filename, totalRows: rawRows.length, validRows: validCount, errorRows: errorCount, duplicateRows: duplicateCount }
      }
    }).catch(() => {});

    res.json({
        totalRows: rawRows.length,
        validRows: validCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        skippedRows: rawRows.length - validCount - errorCount,
        createRows: results.filter(r => r.action === 'CREATE').length,
        updateRows: results.filter(r => r.action === 'UPDATE').length,
        detectedHeaders: rawHeaders,
        mappedHeaders,
        rows: results
    });

  } catch (error: any) {
    console.error(JSON.stringify({
      event: 'IMPORT_PREVIEW', actor: req.user?.userId,
      filename: req.file?.originalname, outcome: 'failed',
      error: error.message, durationMs: Date.now() - startTime
    }));
    res.status(500).json({ error: "Failed to process excel file" });
  }
});

router.post("/import/commit", requireAuth, async (req: any, res: any) => {
    const startTime = Date.now();
    try {
        const { rows, filename } = req.body; // Expects the array of valid rows from preview
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Invalid payload format" });

        const validRows = rows.filter((r: any) => r.isValid);
        if (validRows.length === 0) return res.status(400).json({ error: "No valid rows to import" });

        let created = 0;
        let updated = 0;
        let skipped = rows.length - validRows.length;
        let failed = 0;

        const toCreate: any[] = [];
        const toUpdate: any[] = [];

        for (const row of validRows) {
            if (row.action === 'CREATE') toCreate.push(row.data);
            if (row.action === 'UPDATE') toUpdate.push(row.data);
        }

        try {
            await prisma.$transaction(async (tx) => {
                // Bulk Insert for newly identified buses
                if (toCreate.length > 0) {
                    const createResult = await tx.bus.createMany({
                        data: toCreate.map(bus => ({
                            fleetNumber: bus.fleetNumber,
                            model: bus.model,
                            manufacturer: bus.manufacturer,
                            status: bus.status,
                            garageId: bus.garageId
                        })),
                        skipDuplicates: true
                    });
                    created += createResult.count;
                }

                // Batch updates using Promise.all
                if (toUpdate.length > 0) {
                    const updatePromises = toUpdate.map(bus => 
                        tx.bus.update({
                            where: { fleetNumber: bus.fleetNumber },
                            data: {
                                model: bus.model,
                                manufacturer: bus.manufacturer,
                                status: bus.status,
                                garageId: bus.garageId
                            }
                        })
                    );
                    await Promise.all(updatePromises);
                    updated += toUpdate.length;
                }

                // Audit log (inside transaction for consistency)
                await tx.auditLog.create({
                  data: {
                    action: 'IMPORT_COMMIT', entity: 'fleet', entityId: 'bulk',
                    userId: req.user?.userId ?? 'system',
                    after: {
                      filename: filename || 'unknown',
                      totalRows: rows.length, created, updated, skipped, failed,
                      status: 'SUCCESS'
                    }
                  }
                });
            });

            const durationMs = Date.now() - startTime;
            console.log(JSON.stringify({
              event: 'IMPORT_COMMIT', actor: req.user?.userId,
              filename: filename || 'unknown', totalRows: rows.length,
              created, updated, skipped, failed, durationMs, outcome: 'success'
            }));

            res.json({ success: true, created, updated, skipped, failed });
        } catch (txError: any) {
            const durationMs = Date.now() - startTime;
            console.error(JSON.stringify({
              event: 'IMPORT_COMMIT', actor: req.user?.userId,
              filename: filename || 'unknown', totalRows: rows.length,
              durationMs, outcome: 'failed', error: txError.message
            }));

            // Audit the failure (non-blocking, outside failed transaction)
            prisma.auditLog.create({
              data: {
                action: 'IMPORT_COMMIT', entity: 'fleet', entityId: 'bulk',
                userId: req.user?.userId ?? 'system',
                after: { filename: filename || 'unknown', status: 'FAILED', error: txError.message }
              }
            }).catch(() => {});

            res.status(500).json({ error: "Import transaction failed" });
        }
    } catch (error: any) {
        console.error(JSON.stringify({
          event: 'IMPORT_COMMIT', actor: req.user?.userId,
          outcome: 'failed', error: error.message,
          durationMs: Date.now() - startTime
        }));
        res.status(500).json({ error: "Import transaction failed" });
    }
});

export default router;
