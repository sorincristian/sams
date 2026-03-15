const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.bus.count().then(c => {
  console.log('Total Buses:', c);
  p.$disconnect();
});
