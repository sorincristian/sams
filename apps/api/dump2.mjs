import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const attachments = await prisma.catalogAttachment.findMany();
  console.log(JSON.stringify(attachments.map(a => a.urlOrPath), null, 2));
}
main().finally(() => prisma.$disconnect());
