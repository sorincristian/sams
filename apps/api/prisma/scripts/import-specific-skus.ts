import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG_ITEMS = [
  // BACKS
  { partNumber: '6476096', description: 'Insert Back, VR50 Camira DCM347 Fabric', category: 'BACK' },
  { partNumber: '6476098', description: 'Insert Back, VR50 Camira BCP351 Fabric', category: 'BACK' },
  { partNumber: '6498984', description: 'Insert Back, VR50 Camira BCP351 Fabric', category: 'BACK' },
  { partNumber: '6477979', description: 'Insert Back, Flip-Up 980 Gray Plastic with 989 Blue Insert', category: 'BACK' },
  
  // CUSHIONS
  { partNumber: '6476097', description: 'Insert Cushion, Low Smoke Foam Camira DCM347 Fabric', category: 'CUSHION' },
  { partNumber: '6476099', description: 'Insert Cushion, Low Smoke Foam Camira DCM351 Fabric', category: 'CUSHION' },
  { partNumber: '6476101', description: 'Insert Cushion, Low Smoke Foam Camira DCM351 Fabric', category: 'CUSHION' },
  { partNumber: '6499298', description: 'Insert Cushion, Flip-Up 980 Gray Plastic with 989 Blue Insert', category: 'CUSHION' },
];

async function main() {
  console.log('Starting explicit SKU import into SeatInsertType...');
  let inserted = 0;
  let updated = 0;
  let skippedDuplicates = 0;
  let finalCushions = 0;
  let finalBacks = 0;

  for (const item of CATALOG_ITEMS) {
    // Check if the part already exists to categorize it as inserted vs updated
    const existing = await prisma.seatInsertType.findUnique({
      where: { partNumber: item.partNumber }
    });

    const upserted = await prisma.seatInsertType.upsert({
      where: { partNumber: item.partNumber },
      update: {
        description: item.description,
        category: item.category as any,
        componentType: item.category,
        vendor: 'Camira / Amaya' // Generic vendor to satisfy required field
      },
      create: {
        partNumber: item.partNumber,
        description: item.description,
        category: item.category as any,
        componentType: item.category,
        vendor: 'Camira / Amaya',
        active: true
      }
    });

    if (existing) {
       // Since the script runs an upsert that replaces values, it's either an update or skip.
       // We'll increment update count to represent the dictionary refresh strategy.
       updated++;
    } else {
       inserted++;
    }

    if (upserted.category === 'CUSHION') finalCushions++;
    if (upserted.category === 'BACK') finalBacks++;
  }

  console.log('\n--- Final Import Results ---');
  console.log(`Inserted Rows: ${inserted}`);
  console.log(`Updated Rows: ${updated}`);
  console.log(`Skipped Duplicates: Defined uniquely via Prisma UPSERT strategy (de-duped implicitly by unique Part Number key).`);
  console.log(`Final Total Discovered SKUs: ${finalCushions + finalBacks}`);
  console.log(` - Cushions: ${finalCushions}`);
  console.log(` - Backs: ${finalBacks}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
