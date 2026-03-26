import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Harvey Shop...");
  
  const vendor = await prisma.vendor.upsert({
    where: { name: "Harvey Shop" },
    update: {
      type: "REUPHOLSTERY_VENDOR",
      active: true,
    },
    create: {
      name: "Harvey Shop",
      type: "REUPHOLSTERY_VENDOR",
      active: true,
    },
  });

  console.log("Seeded successfully:", vendor);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
