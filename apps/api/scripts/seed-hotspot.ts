import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const attachment = await prisma.catalogAttachment.findUnique({ where: { id: "cmmpccj6e000lwtynbz2z17eu" } });
  if (!attachment) { console.log("NO_ATT"); return; }
  
  const hs = await prisma.diagramHotspot.create({
    data: {
      catalogAttachmentId: attachment.id,
      seatInsertTypeId: attachment.seatInsertTypeId,
      seatLabel: "F1",
      partNumber: "TEST-123",
      x: 0.5,
      y: 0.5,
      width: 0.1,
      height: 0.1
    }
  });

  console.log("SEEDED_HOTSPOT=" + hs.id);
  await prisma.$disconnect();
}

run();
