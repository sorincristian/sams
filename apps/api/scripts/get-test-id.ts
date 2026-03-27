import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const attachment = await prisma.catalogAttachment.findFirst({
    where: { attachmentType: "DIAGRAM" },
    include: { hotspots: true }
  });
  if (attachment) {
    console.log("ATTACHMENT_ID=" + attachment.id);
    if (attachment.hotspots.length > 0) {
      console.log("HOTSPOT_ID=" + attachment.hotspots[0].id);
      console.log("SEAT_LABEL=" + attachment.hotspots[0].seatLabel);
    }
  } else {
    console.log("NO_DIAGRAMS_FOUND");
  }
  await prisma.$disconnect();
}

run();
