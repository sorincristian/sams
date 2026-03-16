import { Router } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

export const IMPORT_COLUMNS = {
  FLEET_NUMBER: "Fleet Number",
  MODEL: "Model",
  MANUFACTURER: "Manufacturer",
  GARAGE: "Garage",
  STATUS: "Status"
};

router.post("/import/preview", requireAuth, upload.single('file'), async (req: any, res: any) => {
  try {
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

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        // Normalize incoming header keys to lower-case, trimmed
        const normalizedRow: Record<string, any> = {};
        for (const key of Object.keys(row)) {
            normalizedRow[key.trim().toLowerCase()] = row[key];
        }

        const getField = (aliases: string[]) => {
            for (const alias of aliases) {
                if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== null) {
                    return String(normalizedRow[alias]).trim();
                }
            }
            return '';
        };

        const fleetNum = getField(["fleet #", "fleet number", "fleetnumber"]);
        const model = getField(["model", "bus model"]);
        const mfg = getField(["manufacturer", "make"]);
        const garageInput = getField(["garage", "garage name"]).toUpperCase();
        let status = getField(["status"]).toUpperCase() || 'ACTIVE';
        
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

        const isUpdate = existingFleetSet.has(fleetNum);

        if (errors.length > 0) {
            errorCount++;
        } else {
            validCount++;
        }

        results.push({
            rowNumber: i + 2, // Accounting for 0-index + Header row
            action: isUpdate ? 'UPDATE' : 'CREATE',
            data: { fleetNumber: fleetNum, model, manufacturer: mfg, status, garageId, garageName: matchedGarageName },
            errors,
            isValid: errors.length === 0
        });
    }

    res.json({
        total: rawRows.length,
        valid: validCount,
        errors: errorCount,
        rows: results
    });

  } catch (error) {
    console.error("XLS Preview Error:", error);
    res.status(500).json({ error: "Failed to process excel file" });
  }
});

router.post("/import/commit", requireAuth, async (req, res) => {
    try {
        const { rows } = req.body; // Expects the array of valid rows from preview
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Invalid payload format" });

        const validRows = rows.filter((r: any) => r.isValid);
        if (validRows.length === 0) return res.status(400).json({ error: "No valid rows to import" });

        let created = 0;
        let updated = 0;

        await prisma.$transaction(async (tx) => {
            for (const row of validRows) {
                const { fleetNumber, model, manufacturer, status, garageId } = row.data;
                const existing = await tx.bus.findUnique({ where: { fleetNumber } });
                
                if (existing) {
                    await tx.bus.update({ 
                        where: { id: existing.id },
                        data: { model, manufacturer, status, garageId }
                    });
                    updated++;
                } else {
                    await tx.bus.create({
                        data: { fleetNumber, model, manufacturer, status, garageId }
                    });
                    created++;
                }
            }
        });

        res.json({ success: true, created, updated });
    } catch (error) {
        console.error("XLS Commit Error:", error);
        res.status(500).json({ error: "Import transaction failed" });
    }
});

export default router;
