import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function run() {
  const o = await p.seatOrder.findFirst();
  console.log('Order:', o);
  try {
    const order = await p.seatOrder.findUnique({
      where: { id: o.id },
      include: {
        garage: { select: { name: true } },
        createdByUser: { select: { name: true } },
        lines: {
          include: { 
            seatInsertType: { select: { partNumber: true, description: true } }
          }
        },
        approvals: {
          include: { approvedByUser: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    console.log('Result:', order?.id);
  } catch(e) {
    console.log('Error in getOrder Prisma query:', e);
  }
}
run().finally(()=>p.$disconnect());
