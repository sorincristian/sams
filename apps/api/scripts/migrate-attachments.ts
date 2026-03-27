import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const attachments = await prisma.catalogAttachment.findMany();
  let updated = 0;
  for (const a of attachments) {
    if (!a.urlOrPath) continue;
    let newUrl = a.urlOrPath;
    
    // Normalize absolute disk paths or /diagrams paths
    if (newUrl.includes("/diagrams/")) {
      newUrl = newUrl.replace(/.*\/diagrams\//g, "/uploads/");
    } else if (newUrl.includes("api/diagrams/")) {
      newUrl = newUrl.replace(/.*api\/diagrams\//g, "/uploads/");
    }

    if (newUrl !== a.urlOrPath) {
      await prisma.catalogAttachment.update({ 
        where: { id: a.id }, 
        data: { urlOrPath: newUrl } 
      });
      updated++;
    }
  }
  
  console.log("UPDATED_DB_RECORDS=" + updated);
  process.exit(0);
}
run();
