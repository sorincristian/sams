import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 
async function main() { 
  const c = await prisma.seatInsertType.findFirst({ where: { partNumber: { contains: 'SK3324' } } }); 
  console.log('SeatInsertType:', c); 
  const a = await prisma.catalogAttachment.findFirst({ where: { fileName: { contains: 'PDF' } } }); 
  console.log('Attachment:', a); 
  const types = await prisma.seatInsertType.findMany();
  console.log('Total SeatInsertTypes:', types.length);
} 
main();
