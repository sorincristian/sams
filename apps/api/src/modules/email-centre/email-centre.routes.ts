import { Router } from "express";
import { 
  getProfiles, createProfile, updateProfile,
  getTemplates, updateTemplate,
  getLogs, retryLog, webhook
} from "./email-centre.controller.js";
import { requireAuth } from "../../auth.js";

const router = Router();

// Public webhook
router.post("/webhook", webhook);

// Protect all email centre routes
router.use(requireAuth);

// ─── Sender Profiles ─────────────────────────────────────────────────────────
router.get("/profiles", getProfiles);
router.post("/profiles", createProfile);
router.patch("/profiles/:id", updateProfile);

// ─── Templates ───────────────────────────────────────────────────────────────
router.get("/templates", getTemplates);
router.patch("/templates/:id", updateTemplate);

// ─── Logs & Auditing ─────────────────────────────────────────────────────────
router.get("/logs", getLogs);
router.post("/logs/:id/retry", retryLog);

export default router;
