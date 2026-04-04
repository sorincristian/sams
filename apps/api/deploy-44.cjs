const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rawCatalog = [
  { partNumber: '70446', desc: 'BACK RED SLIM Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'RED | SLIM', bus: 'NOVA_3000', tags: ['BACK','RED','SLIM','NOVA_3000'] },
  { partNumber: '70449', desc: 'CUSHION RED SLIM Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'RED | SLIM', bus: 'NOVA_3000', tags: ['CUSHION','RED','SLIM','NOVA_3000'] },
  { partNumber: '70452', desc: 'BACK BLUE T2C Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'BLUE | T2C', bus: 'NOVA_3000', tags: ['BACK','BLUE','T2C','NOVA_3000'] },
  { partNumber: '70730', desc: 'CUSHION BLUE T2C Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'BLUE | T2C', bus: 'NOVA_3000', tags: ['CUSHION','BLUE','T2C','NOVA_3000'] },
  { partNumber: '71213', desc: 'BACK RED SLIM Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'RED | SLIM', bus: 'NOVA_3000', tags: ['BACK','RED','SLIM','NOVA_3000'] },
  { partNumber: '71062', desc: 'CUSHION RED SLIM Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'RED | SLIM', bus: 'NOVA_3000', tags: ['CUSHION','RED','SLIM','NOVA_3000'] },
  { partNumber: '71065', desc: 'BACK BLUE T2C Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'BLUE | T2C', bus: 'NOVA_3000', tags: ['BACK','BLUE','T2C','NOVA_3000'] },
  { partNumber: '71068', desc: 'CUSHION BLUE T2C Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'BLUE | T2C', bus: 'NOVA_3000', tags: ['CUSHION','BLUE','T2C','NOVA_3000'] },
  { partNumber: '63109', desc: 'BACK RED HIGH_BACK Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'RED | HIGH_BACK', bus: 'NOVA_3000', tags: ['BACK','RED','HIGH_BACK','NOVA_3000'] },
  { partNumber: '63110', desc: 'CUSHION RED HIGH_BACK Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'RED | HIGH_BACK', bus: 'NOVA_3000', tags: ['CUSHION','RED','HIGH_BACK','NOVA_3000'] },
  { partNumber: '63112', desc: 'BACK BLUE HIGH_BACK Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'BLUE | HIGH_BACK', bus: 'NOVA_3000', tags: ['BACK','BLUE','HIGH_BACK','NOVA_3000'] },
  { partNumber: '63113', desc: 'CUSHION BLUE HIGH_BACK Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'BLUE | HIGH_BACK', bus: 'NOVA_3000', tags: ['CUSHION','BLUE','HIGH_BACK','NOVA_3000'] },
  { partNumber: '63044', desc: 'BACK RED GEMINI Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'RED | GEMINI', bus: 'NOVA_3000', tags: ['BACK','RED','GEMINI','NOVA_3000'] },
  { partNumber: '63045', desc: 'CUSHION RED GEMINI Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'RED | GEMINI', bus: 'NOVA_3000', tags: ['CUSHION','RED','GEMINI','NOVA_3000'] },
  { partNumber: '63056', desc: 'BACK BLUE GEMINI Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'BLUE | GEMINI', bus: 'NOVA_3000', tags: ['BACK','BLUE','GEMINI','NOVA_3000'] },
  { partNumber: '63057', desc: 'CUSHION BLUE GEMINI Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'BLUE | GEMINI', bus: 'NOVA_3000', tags: ['CUSHION','BLUE','GEMINI','NOVA_3000'] },
  { partNumber: '63050', desc: 'BACK RED SLIM Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'RED | SLIM', bus: 'NOVA_3000', tags: ['BACK','RED','SLIM','NOVA_3000'] },
  { partNumber: '63051', desc: 'CUSHION RED SLIM Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'RED | SLIM', bus: 'NOVA_3000', tags: ['CUSHION','RED','SLIM','NOVA_3000'] },
  { partNumber: '63015', desc: 'BACK BLUE T2C Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'BLUE | T2C', bus: 'NOVA_3000', tags: ['BACK','BLUE','T2C','NOVA_3000'] },
  { partNumber: '63016', desc: 'CUSHION BLUE T2C Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'BLUE | T2C', bus: 'NOVA_3000', tags: ['CUSHION','BLUE','T2C','NOVA_3000'] },
  { partNumber: '63052', desc: 'BACK RED HIGH_BACK Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'RED | HIGH_BACK', bus: 'NOVA_3000', tags: ['BACK','RED','HIGH_BACK','NOVA_3000'] },
  { partNumber: '63053', desc: 'CUSHION RED HIGH_BACK Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'RED | HIGH_BACK', bus: 'NOVA_3000', tags: ['CUSHION','RED','HIGH_BACK','NOVA_3000'] },
  { partNumber: '63047', desc: 'BACK BLUE GEMINI Seat Insert - NOVA_3000', pos: 'BACK', trimSpec: 'BLUE | GEMINI', bus: 'NOVA_3000', tags: ['BACK','BLUE','GEMINI','NOVA_3000'] },
  { partNumber: '63048', desc: 'CUSHION BLUE GEMINI Seat Insert - NOVA_3000', pos: 'CUSHION', trimSpec: 'BLUE | GEMINI', bus: 'NOVA_3000', tags: ['CUSHION','BLUE','GEMINI','NOVA_3000'] },
  { partNumber: '22636', desc: 'BACK RED GEMINI Seat Insert - NOVA_8000_9000 & ORION_7', pos: 'BACK', trimSpec: 'RED | GEMINI', bus: 'NOVA_8000_9000 & ORION_7', tags: ['BACK','RED','GEMINI','NOVA_8000_9000 & ORION_7'] },
  { partNumber: '22909', desc: 'CUSHION RED GEMINI Seat Insert - NOVA_8000_9000 & ORION_7', pos: 'CUSHION', trimSpec: 'RED | GEMINI', bus: 'NOVA_8000_9000 & ORION_7', tags: ['CUSHION','RED','GEMINI','NOVA_8000_9000 & ORION_7'] },
  { partNumber: '63115', desc: 'BACK BLUE SLIM Seat Insert - NOVA_8000_9000 & ORION_7', pos: 'BACK', trimSpec: 'BLUE | SLIM', bus: 'NOVA_8000_9000 & ORION_7', tags: ['BACK','BLUE','SLIM','NOVA_8000_9000 & ORION_7'] },
  { partNumber: '63116', desc: 'CUSHION BLUE SLIM Seat Insert - NOVA_8000_9000 & ORION_7', pos: 'CUSHION', trimSpec: 'BLUE | SLIM', bus: 'NOVA_8000_9000 & ORION_7', tags: ['CUSHION','BLUE','SLIM','NOVA_8000_9000 & ORION_7'] },
  { partNumber: '63142', desc: 'BACK RED T2C Seat Insert - NOVA_8000_9000 & ORION_7', pos: 'BACK', trimSpec: 'RED | T2C', bus: 'NOVA_8000_9000 & ORION_7', tags: ['BACK','RED','T2C','NOVA_8000_9000 & ORION_7'] },
  { partNumber: '63143', desc: 'CUSHION RED T2C Seat Insert - NOVA_8000_9000 & ORION_7', pos: 'CUSHION', trimSpec: 'RED | T2C', bus: 'NOVA_8000_9000 & ORION_7', tags: ['CUSHION','RED','T2C','NOVA_8000_9000 & ORION_7'] },
  { partNumber: '79283', desc: 'BACK BLUE HIGH_BACK Seat Insert - PROTERRA', pos: 'BACK', trimSpec: 'BLUE | HIGH_BACK', bus: 'PROTERRA', tags: ['BACK','BLUE','HIGH_BACK','PROTERRA'] },
  { partNumber: '79287', desc: 'CUSHION BLUE HIGH_BACK Seat Insert - PROTERRA', pos: 'CUSHION', trimSpec: 'BLUE | HIGH_BACK', bus: 'PROTERRA', tags: ['CUSHION','BLUE','HIGH_BACK','PROTERRA'] },
  { partNumber: '79211', desc: 'BACK RED SLIM Seat Insert - PROTERRA', pos: 'BACK', trimSpec: 'RED | SLIM', bus: 'PROTERRA', tags: ['BACK','RED','SLIM','PROTERRA'] },
  { partNumber: '79206', desc: 'CUSHION RED SLIM Seat Insert - PROTERRA', pos: 'CUSHION', trimSpec: 'RED | SLIM', bus: 'PROTERRA', tags: ['CUSHION','RED','SLIM','PROTERRA'] },
  { partNumber: '79208', desc: 'BACK BLUE T2C Seat Insert - PROTERRA', pos: 'BACK', trimSpec: 'BLUE | T2C', bus: 'PROTERRA', tags: ['BACK','BLUE','T2C','PROTERRA'] },
  { partNumber: '79212', desc: 'CUSHION BLUE T2C Seat Insert - PROTERRA', pos: 'CUSHION', trimSpec: 'BLUE | T2C', bus: 'PROTERRA', tags: ['CUSHION','BLUE','T2C','PROTERRA'] },
  { partNumber: '42886', desc: 'BACK RED GEMINI Seat Insert - PROTERRA', pos: 'BACK', trimSpec: 'RED | GEMINI', bus: 'PROTERRA', tags: ['BACK','RED','GEMINI','PROTERRA'] },
  { partNumber: '42885', desc: 'CUSHION RED GEMINI Seat Insert - PROTERRA', pos: 'CUSHION', trimSpec: 'RED | GEMINI', bus: 'PROTERRA', tags: ['CUSHION','RED','GEMINI','PROTERRA'] },
  { partNumber: '79629', desc: 'BACK BLUE STANDARD Seat Insert [BUY] - BYD_EBUS', pos: 'BACK', trimSpec: 'BLUE | STANDARD', bus: 'BYD_EBUS', tags: ['BACK','BLUE','STANDARD','BYD_EBUS','BUY'] },
  { partNumber: '79628', desc: 'CUSHION BLUE STANDARD Seat Insert [BUY] - BYD_EBUS', pos: 'CUSHION', trimSpec: 'BLUE | STANDARD', bus: 'BYD_EBUS', tags: ['CUSHION','BLUE','STANDARD','BYD_EBUS','BUY'] },
  { partNumber: '79627', desc: 'BACK RED STANDARD Seat Insert [CORE] - BYD_EBUS', pos: 'BACK', trimSpec: 'RED | STANDARD', bus: 'BYD_EBUS', tags: ['BACK','RED','STANDARD','BYD_EBUS','CORE'] },
  { partNumber: '79626', desc: 'CUSHION RED STANDARD Seat Insert [CORE] - BYD_EBUS', pos: 'CUSHION', trimSpec: 'RED | STANDARD', bus: 'BYD_EBUS', tags: ['CUSHION','RED','STANDARD','BYD_EBUS','CORE'] },
  { partNumber: '79632', desc: 'BACK BLUE STANDARD Seat Insert [REBUILT] - BYD_EBUS', pos: 'BACK', trimSpec: 'BLUE | STANDARD', bus: 'BYD_EBUS', tags: ['BACK','BLUE','STANDARD','BYD_EBUS','REBUILT'] },
  { partNumber: '79625', desc: 'CUSHION BLUE STANDARD Seat Insert [REBUILT] - BYD_EBUS', pos: 'CUSHION', trimSpec: 'BLUE | STANDARD', bus: 'BYD_EBUS', tags: ['CUSHION','BLUE','STANDARD','BYD_EBUS','REBUILT'] }
];

async function deploy() {
  console.log('Deploying 44 enriched SKUs to SeatInsertType...');
  for (const item of rawCatalog) {
    const data = {
      partNumber: item.partNumber,
      description: item.desc,
      vendor: 'TTC',
      active: true,
      componentType: item.pos,
      trimSpec: item.trimSpec,
      compatibleBusModels: [item.bus],
      alternatePartNumbers: item.tags
    };
    await prisma.seatInsertType.upsert({
      where: { partNumber: item.partNumber },
      update: data,
      create: data
    });
    console.log(`Upserted ${item.partNumber}`);
  }
}

deploy().catch(console.error).finally(() => prisma.$disconnect());
