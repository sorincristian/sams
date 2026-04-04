import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const part = await prisma.seatInsertType.findFirst({
    where: { partNumber: 'SK3324-8030' },
    include: {
      busCompatibilities: {
        include: { attachments: true }
      },
      catalogAttachments: true,
      components: {
        include: {
          childComponent: true
        },
        orderBy: {
          childComponent: { partNumber: 'asc' }
        }
      }
    }
  });

  console.log(JSON.stringify(part, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
