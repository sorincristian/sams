const fs = require('fs');
const inv = require('./inventory.json');
const duplicates = new Map();
const uniqueFiles = [];

for (const item of inv) {
    if (item.name.toLowerCase().endsWith('.png')) continue; // Skip previews for now
    
    // Normalize name to deduplicate " (1)" things
    let normName = item.name.replace(/\s\(\d+\)/g, '');
    if (!duplicates.has(normName)) {
         duplicates.set(normName, item);
         uniqueFiles.push(item);
    }
}

const parsed = [];
for (const f of uniqueFiles) {
    let manuf = 'Unknown';
    let model = 'Unknown';
    
    // Determine manufacturer from folder or filename
    if (f.path.includes('Orion_Buses')) manuf = 'Orion';
    else if (f.name.includes('NOVA')) manuf = 'Nova Bus';
    else if (f.name.includes('New Flyer')) manuf = 'New Flyer';
    else if (f.name.includes('Proterra')) manuf = 'Proterra';
    else if (f.name.includes('BYD')) manuf = 'BYD';
    else manuf = 'Unknown';

    // Model extraction
    let cleanName = f.name.replace(/\s\(\d+\)/g, '').replace('.pdf', '').trim();
    if (cleanName.includes('- Bus #')) {
        model = cleanName.split('- Bus #')[0].trim();
        // remove manuf from model string if duplicated
        if (model.toLowerCase().startsWith('nova')) model = model.substring(4).trim();
        if (model.toLowerCase().startsWith('new flyer')) model = model.substring(9).trim();
    } else {
        model = cleanName; 
    }

    // fallback
    if (manuf === 'Unknown' && f.path.includes('Seat_Inserts')) manuf = 'Unknown_Seat';

    parsed.push({
        orig: f.name,
        manuf,
        model,
        partNumber: `SI-${manuf.substring(0,4).toUpperCase()}-${model.replace(/[^A-Za-z0-9]/g, '').substring(0,8)}`.toUpperCase()
    });
}

fs.writeFileSync('c:\\SIMS\\sams-render\\apps\\api\\dry_run_out.json', JSON.stringify({count: parsed.length, parsed}, null, 2));
