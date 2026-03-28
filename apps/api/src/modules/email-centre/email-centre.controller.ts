import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient() as any;

// ─── Validation Schemas ──────────────────────────────────────────────────────
const CreateProfileSchema = z.object({
  garageId: z.string().cuid(),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  replyToEmail: z.string().email(),
  harveyToEmail: z.string().email(),
  signatureHtml: z.string().optional(),
  defaultCc: z.string().optional(),
  defaultBcc: z.string().optional(),
  providerType: z.enum(["SMTP", "RESEND", "SES"]).default("SMTP"),
  active: z.boolean().default(true),
});

const UpdateProfileSchema = CreateProfileSchema.partial().omit({ garageId: true });

const UpdateTemplateSchema = z.object({
  subjectTemplate: z.string().min(1),
  bodyHtmlTemplate: z.string().min(1),
  name: z.string().optional()
});

// ─── SENDER PROFILES ─────────────────────────────────────────────────────────

export async function getProfiles(req: Request, res: Response) {
  try {
    const profiles = await prisma.garageEmailProfile.findMany({
      include: {
        garage: {
          select: { name: true, code: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(profiles);
  } catch (error) {
    console.error("Failed to fetch email profiles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProfile(req: Request, res: Response) {
  try {
    const data = CreateProfileSchema.parse(req.body);
    
    // Check if garage already has a profile
    const existing = await prisma.garageEmailProfile.findUnique({
      where: { garageId: data.garageId }
    });
    
    if (existing) {
      return res.status(400).json({ error: "Profile already exists for this garage." });
    }

    const profile = await prisma.garageEmailProfile.create({
      data,
      include: { garage: { select: { name: true } } }
    });

    res.status(201).json(profile);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    console.error("Failed to create email profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const data = UpdateProfileSchema.parse(req.body);

    const profile = await prisma.garageEmailProfile.update({
      where: { id },
      data: data as any,
      include: { garage: { select: { name: true } } }
    });

    res.json(profile);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    if (error.code === 'P2025') return res.status(404).json({ error: "Profile not found" });
    
    console.error("Failed to update email profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

export async function getTemplates(req: Request, res: Response) {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateTemplate(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const data = UpdateTemplateSchema.parse(req.body);

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: data as any,
    });

    res.json(template);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    if (error.code === 'P2025') return res.status(404).json({ error: "Template not found" });

    console.error("Failed to update template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── LOGS & AUDITING ─────────────────────────────────────────────────────────

export async function getLogs(req: Request, res: Response) {
  try {
    const skip = Number(req.query.skip) || 0;
    const take = Number(req.query.take) || 50;
    const rawStatus = req.query.status;
    const status = Array.isArray(rawStatus) ? String(rawStatus[0]) : (rawStatus ? String(rawStatus) : undefined);
    
    const where = status ? { status: status as any } : {};

    const [logs, total] = await Promise.all([
      prisma.outboundEmail.findMany({
        where,
        include: {
          garage: { select: { name: true } },
          seatOrder: { select: { orderNumber: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.outboundEmail.count({ where })
    ]);

    res.json({ data: logs, meta: { total, skip, take } });
  } catch (error) {
    console.error("Failed to fetch email logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function retryLog(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const existing = await prisma.outboundEmail.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Email not found" });
    if (existing.status === "SENT") {
      throw new Error("Sent emails are immutable");
    }

    // Reset email back to QUEUED to let background worker try again
    const email = await prisma.outboundEmail.update({
      where: { id },
      data: {
        status: "QUEUED",
        lockedUntil: null,
        errorMessage: null,
      }
    });

    await prisma.emailAuditEvent.create({
      data: {
        emailId: id,
        status: "QUEUED",
        message: "Manually triggered retry",
      }
    });

    res.json(email);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Email not found" });
    console.error("Failed to retry log:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function webhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-webhook-secret'];
    if (!signature || signature !== process.env.WEBHOOK_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    // Basic structural webhook for external providers (Resend/SendGrid)
    const { emailId, status, error } = req.body;
    
    if (emailId && status && ["DELIVERED", "FAILED", "BOUNCED"].includes(status)) {
      await prisma.outboundEmail.update({
        where: { id: emailId },
        data: { 
          status: status,
          errorMessage: error || null 
        }
      });
      await prisma.emailAuditEvent.create({
        data: {
          emailId,
          status,
          message: `Webhook transition to ${status}` + (error ? `: ${error}` : "")
        }
      });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Error");
  }
}
