import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.bus.count().then(c => console.log('TOTAL_BUSES=' + c)).finally(() => p.$disconnect());
