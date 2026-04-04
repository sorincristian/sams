const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const raw = `NOVA 3000 SERIES BUS USSC INSERTS
70446
70449
70452
70730
71213
71062
71065
71068
63109
63110
63112
63113
63044
63045
63056
63057
63050
63051
63015
63016
63052
63053
63047
63048

NOVA 8000-9000 SERIES & ORION 7
22636
22909
63115
63116
63142
63143

PROTERRA
79283
79287
79211
79206
79208
79212
42886
42885

BYD Ebus
79629
79628
79627
79626
79632
79625`;

async function run() {
  const existingParts = await prisma.seatInsertType.findMany({ select: { partNumber: true } });
  const existingSet = new Set(existingParts.map(p => p.partNumber));
  
  const missing = [];
  let currentGroup = 'UNKNOWN';
  
  for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line.match(/^[A-Za-z]/)) {
      currentGroup = line;
      continue;
    }
    
    const pieces = line.split('/');
    for (let p of pieces) {
      let pTrim = p.trim();
      if (!pTrim) continue;
      
      // Normalize leading zeros etc
      pTrim = parseInt(pTrim, 10).toString();
      
      if (!existingSet.has(pTrim)) {
        missing.push({ partNumber: pTrim, group: currentGroup });
      }
    }
  }
  
  console.dir(missing, { maxArrayLength: null });
}

run().catch(console.error).finally(() => prisma.$disconnect());
