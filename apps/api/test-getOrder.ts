import { getOrder } from './src/modules/seat-orders/seat-orders.controller.js';
import { prisma } from './src/prisma.js';

async function run() {
  const o = await prisma.seatOrder.findFirst();
  const req = { params: { id: o?.id }, query: {} } as any;
  const res = { 
    status: (s: number) => ({ json: (data: any) => console.log('STATUS', s, data) }),
    json: (data: any) => console.log('JSON', data)
  } as any;
  await getOrder(req, res);
}
run();
