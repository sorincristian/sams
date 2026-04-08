import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const totalInventory = await prisma.inventoryItem.count();
    
    // Total Inventory with a valid Garage
    const items = await prisma.inventoryItem.findMany({ select: { garageId: true } });
    const garages = await prisma.garage.findMany({ select: { id: true, name: true, active: true } });
    const garageIds = garages.map(g => g.id);

    const linkedInventory = items.filter(i => i.garageId).length;
    const validGarageJoin = items.filter(i => i.garageId && garageIds.includes(i.garageId)).length;
    
    console.log({ totalInventory, linkedInventory, validGarageJoin });

    console.log("\\nCURRENT GARAGES:");
    garages.forEach(g => console.log(`- ${g.name} (${g.id}) | active: ${g.active}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
