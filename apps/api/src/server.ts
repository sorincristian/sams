console.log("[Phase 1] Bootstrapping SAMS API environment...");
import app from "./app.js";
import { processOutboundEmails } from "./modules/email-centre/email-worker.js";

const port = Number(process.env.PORT || 4000);

console.log("[Phase 2] Successfully loaded Express modules. Starting server...");

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
