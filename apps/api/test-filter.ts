import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testFilter() {
  const garages = await prisma.garage.findMany();
  console.log("Garages:", garages.map(g => ({ id: g.id, name: g.name })));
  
  if (garages.length < 2) {
    console.log("Not enough garages to test.");
    return;
  }
  
  const targetGarage = garages[0];
  console.log(`\nTesting filter for garage: ${targetGarage.name} (${targetGarage.id})`);
  
  const where: any = {};
  where.garageId = targetGarage.id;
  
  const buses = await prisma.bus.findMany({
    where,
    include: { garage: true }
  });
  
  console.log(`Buses returned: ${buses.length}`);
  if (buses.length > 0) {
    console.log(`First bus garage: ${buses[0].garage.name} (${buses[0].garageId})`);
    
    const wrongBuses = buses.filter(b => b.garageId !== targetGarage.id);
    if (wrongBuses.length > 0) {
      console.log(`FOUND WRONG BUSES! ${wrongBuses.length} buses have the wrong garageId.`);
    } else {
      console.log("All returned buses have the correct garageId.");
    }
  }

  // Next let's test the endpoint logic
  const search = "";
  const safeSearch = search;
  const safeGarageId = targetGarage.id;

  const whereAPI: any = {};
  if (safeGarageId) whereAPI.garageId = String(safeGarageId);
  if (safeSearch) {
    whereAPI.OR = [
      { fleetNumber: { contains: String(safeSearch), mode: "insensitive" } },
      { model: { contains: String(safeSearch), mode: "insensitive" } },
      { manufacturer: { contains: String(safeSearch), mode: "insensitive" } },
    ];
  }

  const busesAPI = await prisma.bus.findMany({
    where: whereAPI,
    include: { garage: true }
  });

  console.log(`\nAPI simulated filter returned: ${busesAPI.length} buses.`);
  const wrongBusesAPI = busesAPI.filter(b => b.garageId !== targetGarage.id);
  if (wrongBusesAPI.length > 0) {
    console.log(`API TEST FAILED! ${wrongBusesAPI.length} buses have the wrong garageId.`);
  } else {
    console.log("API TEST PASSED! All returned buses have the correct garageId.");
  }
}

testFilter()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
