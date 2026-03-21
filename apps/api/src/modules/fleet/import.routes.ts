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

// ── Unified alias table (single source of truth) ──
const FIELD_ALIASES: Record<string, string[]> = {
  fleetNumber: ['fleet number', 'fleetnumber', 'fleet no', 'fleet no.', 'fleet #', 'fleet#', 'bus number', 'bus no', 'bus #', 'bus#', 'vehicle number', 'vehicle no', 'vehicle #'],
  model: ['model', 'bus model', 'vehicle model'],
  manufacturer: ['manufacturer', 'make', 'brand', 'oem', 'mfg'],
  garage: ['garage', 'garage name', 'garage / depot', 'depot', 'yard', 'facility', 'location', 'base'],
  status: ['status', 'bus status', 'vehicle status']
};

const REQUIRED_FIELDS = ['fleetNumber', 'model', 'manufacturer'];

/** Normalize a header for alias matching: lowercase, trim, strip symbols */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Resolve the column map: for each system field find the best matching raw header.
 * Manual mapping overrides alias detection.
 */
function resolveColumnMap(
  rawHeaders: string[],
  manualMapping: Record<string, string | null>
): Record<string, string | null> {
  const resolved: Record<string, string | null> = {};
  const usedHeaders = new Set<string>();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    // 1. Manual mapping takes priority
    const manual = manualMapping[field];
    if (manual) {
      // Verify the manual mapping actually exists in the raw headers (case-insensitive)
      const match = rawHeaders.find(h => h.trim().toLowerCase() === manual.trim().toLowerCase());
      if (match) {
        resolved[field] = match;
        usedHeaders.add(match);
        continue;
      }
    }

    // 2. Alias detection with normalized matching
    let bestMatch: string | null = null;
    for (const rawHeader of rawHeaders) {
      if (usedHeaders.has(rawHeader)) continue; // don't double-map
      const normalized = normalizeHeader(rawHeader);
      if (aliases.some(a => normalizeHeader(a) === normalized)) {
        bestMatch = rawHeader;
        break; // first match wins (deterministic)
      }
    }
    resolved[field] = bestMatch;
    if (bestMatch) usedHeaders.add(bestMatch);
  }

  return resolved;
}

router.get("/import/template", requireAuth, (req, res) => {
  const csvContent = "fleetNumber,model,manufacturer,garage,status\n,,,,,";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sams_fleet_import_template.csv"');
  res.send(csvContent);
});

router.post("/import/preview", requireAuth, handleUpload, async (req: any, res: any) => {
  const startTime = Date.now();
  try {
    const mode = req.body.mode || 'UPSERT';
    // Accept optional manual column mapping from the wizard (JSON string)
    let manualMapping: Record<string, string | null> = {};
    try {
      if (req.body.columnMapping) {
        manualMapping = typeof req.body.columnMapping === 'string'
          ? JSON.parse(req.body.columnMapping)
          : req.body.columnMapping;
      }
    } catch (e) { /* ignore bad JSON */ }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

    // ── Resolve column mapping ONCE before processing rows ──
    const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const columnMap = resolveColumnMap(rawHeaders, manualMapping);

    // ── Early fail if required fields are not mapped ──
    const missingMappings = REQUIRED_FIELDS.filter(f => !columnMap[f]);
    if (missingMappings.length > 0) {
      const filename = req.file?.originalname || 'unknown';
      console.log(JSON.stringify({
        event: 'IMPORT_PREVIEW', actor: req.user?.userId, filename,
        fileSize: req.file?.size, totalRows: rawRows.length,
        mappedColumns: columnMap, missingMappings, outcome: 'blocked'
      }));
      return res.status(422).json({
        error: 'Missing required column mappings',
        missingFields: missingMappings,
        detectedHeaders: rawHeaders,
        mappedHeaders: columnMap
      });
    }

    const garages = await prisma.garage.findMany();
    const existingBuses = await prisma.bus.findMany({ select: { fleetNumber: true } });
    const existingFleetSet = new Set(existingBuses.map(b => b.fleetNumber));

    const results = [];
    let validCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const fileSeenFleetNumbers = new Set<string>();

    /** Extract a field value from a row using the resolved column map */
    const getField = (row: any, systemField: string): string => {
      const col = columnMap[systemField];
      if (!col) return '';
      const val = row[col];
      return val !== undefined && val !== null ? String(val).trim() : '';
    };

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        const fleetNum = getField(row, 'fleetNumber');
        const model = getField(row, 'model');
        const mfg = getField(row, 'manufacturer');
        const garageInput = getField(row, 'garage').toUpperCase();
        let status = getField(row, 'status').toUpperCase() || 'ACTIVE';
        
        // Structured errors: field → reason
        const errors: Record<string, string> = {};
        
        if (!fleetNum) errors.fleetNumber = 'Missing';
        if (!model) errors.model = 'Missing';
        if (!mfg) errors.manufacturer = 'Missing';

        if (!['ACTIVE', 'MAINTENANCE', 'RETIRED'].includes(status)) {
            status = 'ACTIVE';
        }

        let garageId = null;
        let matchedGarageName = 'Unknown';
        if (garageInput) {
            const match = garages.find(g => g.code.toUpperCase() === garageInput || g.name.toUpperCase() === garageInput);
            if (match) {
                garageId = match.id;
                matchedGarageName = match.name;
            } else {
                errors.garage = `Not found: '${garageInput}'`;
            }
        } else {
            errors.garage = 'Missing';
        }

        // Intra-file duplicate check
        if (fleetNum && fileSeenFleetNumbers.has(fleetNum)) {
            errors.fleetNumber = 'Duplicate within file';
            duplicateCount++;
        }
        if (fleetNum) {
            fileSeenFleetNumbers.add(fleetNum);
        }

        const isExisting = existingFleetSet.has(fleetNum);
        const errorKeys = Object.keys(errors);
        
        let action = 'ERROR';
        if (errorKeys.length === 0) {
            if (isExisting) {
                if (mode === 'CREATE_ONLY') {
                    action = 'SKIP';
                    errors._mode = 'Bus already exists (Create Only mode)';
                } else {
                    action = 'UPDATE';
                }
            } else {
                if (mode === 'UPDATE_ONLY') {
                    action = 'SKIP';
                    errors._mode = 'Bus not found in database (Update Only mode)';
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
            rowNumber: i + 2,
            action,
            data: { fleetNumber: fleetNum, model, manufacturer: mfg, status, garageId, garageName: matchedGarageName },
            errors,
            isValid
        });
    }

    const durationMs = Date.now() - startTime;
    const filename = req.file?.originalname || 'unknown';
    const totalRows = rawRows.length;
    const successRate = totalRows > 0 ? Math.round((validCount / totalRows) * 100) : 0;

    // Structured log
    console.log(JSON.stringify({
      event: 'IMPORT_PREVIEW', actor: req.user?.userId, filename,
      fileSize: req.file?.size, totalRows,
      validRows: validCount, errorRows: errorCount,
      duplicateRows: duplicateCount, successRate,
      mappedColumns: columnMap, missingMappings: [],
      durationMs, outcome: 'previewed'
    }));

    // Audit log (non-blocking)
    prisma.auditLog.create({
      data: {
        action: 'IMPORT_PREVIEW', entity: 'fleet', entityId: 'bulk',
        userId: req.user?.userId ?? 'system',
        after: { filename, totalRows, validRows: validCount, errorRows: errorCount, duplicateRows: duplicateCount, mappedColumns: columnMap }
      }
    }).catch(() => {});

    res.json({
        totalRows,
        validRows: validCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        successRate,
        skippedRows: totalRows - validCount - errorCount,
        createRows: results.filter(r => r.action === 'CREATE').length,
        updateRows: results.filter(r => r.action === 'UPDATE').length,
        detectedHeaders: rawHeaders,
        mappedHeaders: columnMap,
        missingMappings: [],
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
