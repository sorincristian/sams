import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("SMOKE TEST: Simulating API Backend Write Path...");
    
    const garageInfo = await prisma.garage.findFirst({ where: { name: 'Arrow Road' } });
    const partInfo = await prisma.seatInsertType.findFirst({ where: { partNumber: '1001' } });
    if (!garageInfo || !partInfo) throw new Error("Missing Master Data");

    const firstUser = await prisma.user.findFirst();
    const actorUserId = firstUser?.id;
    if (!actorUserId) throw new Error("No user to execute constraint with");

    const result = await prisma.$transaction(async (tx) => {
        let createdCount = 0;
        let addedQty = 0;

        await tx.inventoryItem.upsert({
            where: {
            garageId_seatInsertTypeId: {
                garageId: garageInfo.id,
                seatInsertTypeId: partInfo.id
            }
            },
            create: {
            garageId: garageInfo.id,
            seatInsertTypeId: partInfo.id,
            quantity: 20,
            quantityOnHand: 20
            },
            update: {
            quantity: { increment: 20 },
            quantityOnHand: { increment: 20 }
            }
        });

        await tx.inventoryTransaction.create({
            data: {
            seatInsertTypeId: partInfo.id,
            garageId: garageInfo.id,
            quantity: 20,
            type: "RECEIVE",
            notes: "Smoke test bulk",
            referenceType: "INTAKE_BULK",
            referenceId: undefined, // Simulates busCompatibilityId: null
            performedByUserId: actorUserId
            }
        });

        return { success: true };
    });

    console.log("Transaction successfully committed!");

    // VERIFY
    const inventoryLevel = await prisma.inventoryItem.findUnique({
        where: { garageId_seatInsertTypeId: { garageId: garageInfo.id, seatInsertTypeId: partInfo.id } }
    });

    console.log("\n--- INVENTORY VERIFICATION ---");
    console.log("Qty on Hand:", inventoryLevel?.quantityOnHand);

    const changes = await prisma.inventoryItem.findMany({
       where: { garageId: garageInfo.id },
       include: { garage: true, seatInsertType: true }
    });

    console.log("\n--- REPORT OUTPUT ---");
    const m = changes.map(item => ({
        part: item.seatInsertType.partNumber,
        changeType: item.createdAt.getTime() === item.updatedAt.getTime() ? 'created' : 'updated'
    }));
    console.log(`Total Changes: ${m.length}`);
    console.log(`Created: ${m.filter(x => x.changeType === 'created').length}`);
    console.log(`Updated: ${m.filter(x => x.changeType === 'updated').length}`);

}
main().catch(console.error).finally(()=>prisma.$disconnect());
