console.log("[Phase 1] Bootstrapping SAMS API environment...");
import app from "./app.js";

const port = Number(process.env.PORT || 4000);

console.log("[Phase 2] Successfully loaded Express modules. Starting server...");

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[Phase 3] SAMS API listening explicitly on 0.0.0.0:${port}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
