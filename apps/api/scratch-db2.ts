import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 
async function main() { 
  const types = await prisma.seatInsertType.findMany({ select: { partNumber: true, description: true } });
  console.log('SeatInsertTypes:', JSON.stringify(types, null, 2));
} 
main();
