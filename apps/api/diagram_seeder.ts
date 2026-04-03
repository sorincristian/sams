import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uploadDir = path.join(process.cwd(), 'uploads', 'seat-inserts');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Read previously inventoried files
const invPath = path.join(process.cwd(), 'inventory.json');
const inv: any[] = JSON.parse(fs.readFileSync(invPath, 'utf8'));

async function main() {
    // 1. Deduplication using sha256 hash or exact normalized name+size
    const uniqueFiles = new Map<string, any>();
    let skippedCounter = 0;

    for (const item of inv) {
        if (item.name.toLowerCase().endsWith('.png')) continue; // Skip previews
        
        let normName = item.name.replace(/\s\(\d+\)/g, ''); // Remove browser dup suffix (1)
        const dupKey = normName + '_' + item.size;

        if (!uniqueFiles.has(dupKey)) {
            uniqueFiles.set(dupKey, item);
        } else {
            skippedCounter++;
        }
    }

    console.log(`Deduplicated ${skippedCounter} exact files. Remaining: ${uniqueFiles.size}`);

    let itemsCreated = 0;
    let attachmentsAttached = 0;

    // 2. Loop and map deterministic rules
    for (const item of uniqueFiles.values()) {
        const fName = item.name;
        const fPath = item.path;

        let manuf = 'Unknown';
        let modelFull = 'Unknown';
        let fleetRangeLabel = 'Unknown';

        // Manufacturer lookup
        if (fPath.includes('Orion_Buses') || fName.includes('1336') || fName.includes('1358')) manuf = 'Orion';
        else if (fName.includes('NOVA')) manuf = 'Nova Bus';
        else if (fName.includes('New Flyer')) manuf = 'New Flyer';
        else if (fName.includes('Proterra')) manuf = 'Proterra';
        else if (fName.includes('BYD')) manuf = 'BYD';
        
        // Fleet range and model tokenization
        let cleanName = fName.replace(/\s\(\d+\)/g, '').replace('.pdf', '').trim();
        // Typically formatted 'MFG Model - Bus #RANGE'
        if (cleanName.includes('- Bus #')) {
            const parts = cleanName.split('- Bus #');
            modelFull = parts[0].trim();
            fleetRangeLabel = parts[1].trim();

            if (modelFull.toLowerCase().startsWith('nova')) modelFull = modelFull.substring(4).trim();
            if (modelFull.toLowerCase().startsWith('new flyer')) modelFull = modelFull.substring(9).trim();
            if (modelFull.toLowerCase().startsWith('proterra')) modelFull = modelFull.substring(9).trim();
            if (modelFull.toLowerCase().startsWith('byd')) modelFull = modelFull.substring(4).trim();
        } else {
            modelFull = cleanName;
        }

        // Generating a deterministic Part Number logic
        const manufPrefix = manuf !== 'Unknown' ? manuf.substring(0, 4).toUpperCase().trim() : 'UNKN';
        const modelSuffix = modelFull.replace(/[^A-Za-z0-9]/g, '').substring(0, 8);
        const partNumber = `SI-${manufPrefix}-${modelSuffix}`.toUpperCase();

        // Safe File Copy
        const cleanFinalName = cleanName.replace(/[^a-zA-Z0-9.\-]/g, '_') + '.pdf';
        const finalDest = path.join(uploadDir, cleanFinalName);
        fs.copyFileSync(fPath, finalDest);
        const webUrl = `/uploads/seat-inserts/${cleanFinalName}`;

        // Upsert SeatInsertType
        let seatType = await prisma.seatInsertType.findUnique({ where: { partNumber } });
        if (!seatType) {
            seatType = await prisma.seatInsertType.create({
                data: {
                    partNumber: partNumber,
                    description: `${manuf} ${modelFull} Default Seat Config`,
                    vendor: manuf,
                    manufacturerPartNumber: `OEM-${modelSuffix}`,
                    componentType: 'ASSEMBLY',
                    active: true,
                    minStockLevel: 5,
                    reorderPoint: 10,
                    unitCost: 100.00
                }
            });
            itemsCreated++;
        }

        // Upsert CatalogAttachment to SeatInsertType
        const existingAtt = await prisma.catalogAttachment.findFirst({
            where: {
                seatInsertTypeId: seatType.id,
                fileName: cleanFinalName
            }
        });

        if (!existingAtt) {
            await prisma.catalogAttachment.create({
                data: {
                    seatInsertTypeId: seatType.id,
                    fileName: cleanFinalName,
                    fileType: 'application/pdf',
                    attachmentType: 'DIAGRAM',
                    urlOrPath: webUrl,
                    fleetRangeLabel: fleetRangeLabel,
                    notes: `Imported from legacy diagrams source archive.`
                }
            });
            attachmentsAttached++;
        }
    }

    console.log(`=== Import Complete ===`);
    console.log(`SeatInsertType created: ${itemsCreated}`);
    console.log(`CatalogAttachments created: ${attachmentsAttached}`);
}

main().catch(err => {
    fs.writeFileSync('c:\\SIMS\\sams-render\\apps\\api\\err_node.txt', err.stack || err.toString());
}).finally(() => prisma.$disconnect());
