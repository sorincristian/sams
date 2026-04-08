console.log("[Phase 1] Bootstrapping SAMS API environment...");
import app from "./app.js";
import { processOutboundEmails } from "./modules/email-centre/email-worker.js";

const port = Number(process.env.PORT || 4000);

console.log("[Phase 2] Successfully loaded Express modules. Starting server...");

import { prisma } from "./prisma.js";
import bcrypt from "bcryptjs";

async function ensureAdminSeed() {
  try {
    const email = 'admin@sams-local.com';
    const existing = await prisma.user.findUnique({ where: { email } });
    
    if (!existing) {
       const hash = await bcrypt.hash('admin123', 10);
       await prisma.user.create({
         data: {
           email,
           passwordHash: hash,
           role: 'SYSTEM_ADMIN',
           name: 'System Admin',
           active: true
         } as any
       });
       console.log("[Seed] admin account restored");
    } else if (!existing.passwordHash || existing.role !== 'SYSTEM_ADMIN') {
       const hash = await bcrypt.hash('admin123', 10);
       await prisma.user.update({
         where: { email },
         data: { 
           passwordHash: existing.passwordHash ? undefined : hash, 
           role: 'SYSTEM_ADMIN',
           name: existing.name === 'admin' ? 'System Admin' : undefined
         }
       });
       console.log("[Seed] admin account restored");
    } else {
       console.log("[Seed] admin account already present");
    }
  } catch (e) {
    console.error("[Seed] Quiet seed failure: ", e);
  }
}

// Block server start until seed confirms naturally safely
await ensureAdminSeed();

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[Phase 3] SAMS API listening explicitly on 0.0.0.0:${port}`);
  
  // Start the email background worker
  console.log("[Phase 4] Starting Email Queue processor (60s tick)");
  setInterval(() => {
    processOutboundEmails().catch(err => {
      console.error("[EmailWorker] Unhandled interval error:", err);
    });
  }, 60000);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
