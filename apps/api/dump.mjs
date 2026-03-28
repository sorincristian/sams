import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const attachments = await prisma.catalogAttachment.findMany();
  console.log("URLS:", attachments.map(a => a.urlOrPath));
}
main().finally(() => prisma.$disconnect());
