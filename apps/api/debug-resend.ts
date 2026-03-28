import { PrismaClient } from "@prisma/client";
import { processOutboundEmails } from "./src/modules/email-centre/email-worker.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating mock OutboundEmail in QUEUED state...");
  const garage = await prisma.garage.findFirst();
  if (!garage) throw new Error("No garage found");

  const mockEmail = await prisma.outboundEmail.create({
    data: {
      garageId: garage.id,
      to: "test@example.com, backup@example.com",
      subject: "Test Resend Hook",
      bodyHtml: "<p>Hello Harvey Shop</p>",
      status: "QUEUED",
      templateCode: "MOCK_TEST",
      attempts: 0
    }
  });

  console.log(`Created Mock Email: ${mockEmail.id}`);
  
  // Set missing environment key for first pass to test graceful failure
  const realKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  console.log("Tick 1: Forcing worker with missing API KEY...");
  await processOutboundEmails();

  const verify1 = await prisma.outboundEmail.findUnique({ where: { id: mockEmail.id } });
  console.log(`State after tick 1: [${verify1?.status}] | Attempts: ${verify1?.attempts} | Error: ${verify1?.errorMessage?.substring(0,50)}...`);

  // Restore API key
  process.env.RESEND_API_KEY = "re_mockedapikey123";

  // Pretend 1 minute passed (reset lock and backoff)
  await prisma.outboundEmail.update({
    where: { id: mockEmail.id },
    data: { lockedUntil: null }
  });

  console.log("\nTick 2: Forcing worker with mocked API KEY...");
  // Will fail auth with Resend since mocked key is fake, but proves payload formatting works
  await processOutboundEmails();

  const verify2 = await prisma.outboundEmail.findUnique({ where: { id: mockEmail.id } });
  console.log(`State after tick 2: [${verify2?.status}] | Attempts: ${verify2?.attempts} | Error: ${verify2?.errorMessage?.substring(0,50)}...`);

  await prisma.outboundEmail.delete({ where: { id: mockEmail.id } });
  await prisma.emailAuditEvent.deleteMany({ where: { emailId: mockEmail.id } });
  
  console.log("Cleanup complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
