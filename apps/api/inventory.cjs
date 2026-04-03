const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Prepare extraction directory
const extractDir = 'c:\\SIMS\\sams-render\\apps\\api\\uploads\\diagrams_inventory';
if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

const zips = [
  'c:\\SIMS\\sams-render\\SIMS\\Seats\\Seat Inserts.zip',
  'c:\\SIMS\\sams-render\\SIMS\\Seats2\\FW_ Info Request_ Seat + Hardware Requirements - All Bus Types - Orion Buses.zip',
  'c:\\SIMS\\sams-render\\SIMS\\Seats2\\FW__Info_Request__Seat_+_Hardware_Requirements_-_All_Bus_Types_-_NOVA_Buses.zip'
];

try {
  for (const z of zips) {
     if (fs.existsSync(z)) {
         console.log(`Extracting ${path.basename(z)}...`);
         // Extract via powershell Expand-Archive
         const dest = path.join(extractDir, path.basename(z, '.zip').replace(/[^a-z0-9]/gi, '_'));
         if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
         try {
             execSync(`powershell -Command "Expand-Archive -Force -Path '${z}' -DestinationPath '${dest}'"`);
         } catch (e) {
             console.error("Extraction failed for", z, e.message);
         }
     }
  }
} catch (e) { console.error("Powershell error", e) }

// Inventory
const results = [];
function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            scan(fullPath);
        } else {
            const ext = path.extname(item.name).toLowerCase();
            if (ext === '.pdf' || ext === '.jpg' || ext === '.png' || ext === '.jpeg') {
                const stat = fs.statSync(fullPath);
                results.push({
                   path: fullPath,
                   name: item.name,
                   size: stat.size
                });
            }
        }
    }
}

scan(extractDir);
scan('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data');

fs.writeFileSync('c:\\SIMS\\sams-render\\apps\\api\\inventory.json', JSON.stringify(results, null, 2));
console.log(`Total diagram files found: ${results.length}`);
