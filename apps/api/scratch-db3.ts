import { PrismaClient } from '@prisma/client'; 
import fs from 'fs';
const prisma = new PrismaClient(); 
async function main() { 
  const types = await prisma.seatInsertType.findMany({ select: { partNumber: true, description: true } });
  fs.writeFileSync('out2.json', JSON.stringify(types, null, 2), 'utf-8');
} 
main();
