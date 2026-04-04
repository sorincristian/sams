import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../prisma.js";
import { requireAuth, type AuthRequest } from "../../auth.js";
import jwt, { SignOptions } from "jsonwebtoken";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().refine(
        (value) => value.toLowerCase() === 'dev@local' || z.string().email().safeParse(value).success,
        { message: 'Invalid email' }
      ),
      password: z.string().min(1)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    console.log("LOGIN ATTEMPT:", { email: parsed.data.email });

    // Development / staging only
    // Never enabled in production
    // Requires DEV_BYPASS=true
    const devBypassEnabled = process.env.DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production';

    // === DEV BYPASS ===
    if (devBypassEnabled && parsed.data.email.toLowerCase() === 'dev@local' && parsed.data.password === 'bypass') {
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) return res.status(500).json({ message: "Server auth misconfiguration" });
      
      const expiresIn = (process.env.JWT_EXPIRES_IN || "12h") as SignOptions["expiresIn"];
      
      const payload = {
        sub: 'dev-bypass-user-id',
        email: 'dev@local',
        role: 'ADMIN',
        permissions: {
          inventory: "manage", fleet: "manage", reports: "manage", catalog: "manage",
          work_orders: "manage", dashboard: "manage", transactions: "manage", admin: "manage"
        },
        scope: { garages: [] }
      };
      
      const token = jwt.sign(payload, jwtSecret, { expiresIn });
      console.log("DEV BYPASS LOGIN SUCCESS");
      return res.json({
        token,
        user: { 
          id: payload.sub, 
          email: payload.email, 
          name: 'Dev Bypass', 
          role: payload.role, 
          permissions: payload.permissions, 
          scope: payload.scope 
        }
      });
    }
    // ==================

    const user = await prisma.user.findUnique({ 
      where: { email: parsed.data.email },
      include: {
        roleRelation: { include: { permissions: true } },
        scopes: true
      }
    });
    if (!user) {
      console.error("LOGIN FAILED: User not found", parsed.data.email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.passwordHash) {
      console.error("LOGIN FAILED: User missing passwordHash", user.email);
      return res.status(500).json({ message: "User record invalid" });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      console.error("LOGIN FAILED: Password mismatch", user.email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("LOGIN FAILED: JWT_SECRET environment variable is missing");
      return res.status(500).json({ message: "Server auth misconfiguration" });
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || "12h") as SignOptions["expiresIn"];
    
    const permissions: Record<string, string> = {};
    if (user.roleRelation?.permissions) {
      user.roleRelation.permissions.forEach(p => {
        permissions[p.module] = p.access;
      });
    }
    
    // Auto-grant "manage" if legacy role is ADMIN, they have NO role relation explicitly configured, and permissions are empty.
    if (user.role === "ADMIN" && !user.roleId && Object.keys(permissions).length === 0) {
      permissions["inventory"] = "manage";
      permissions["fleet"] = "manage";
      permissions["reports"] = "manage";
      permissions["catalog"] = "manage";
      permissions["work_orders"] = "manage";
      permissions["dashboard"] = "manage";
      permissions["transactions"] = "manage";
      permissions["admin"] = "manage";
    }

    const scope = {
      garages: user.scopes.map(s => s.garageId)
    };

    // Auto-grant all garages if legacy role is ADMIN, no relation exists, and scopes are empty
    if (user.role === "ADMIN" && !user.roleId && scope.garages.length === 0) {
      const allGarages = await prisma.garage.findMany({ select: { id: true } });
      scope.garages = allGarages.map(g => g.id);
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.roleRelation?.name || user.role,
      permissions,
      scope,
      tokenVersion: user.tokenVersion
    };
    const token = jwt.sign(payload, jwtSecret, { expiresIn });

    console.log("LOGIN SUCCESS:", { email: user.email });

    res.json({
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.roleRelation?.name || user.role,
        permissions,
        scope
      }
    });
  } catch (err) {
    console.error("LOGIN ROUTE ERROR:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

router.post("/accept-invite", async (req, res) => {
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) return res.status(400).json({ error: "Missing required fields" });

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await prisma.userInvite.findUnique({ where: { token: tokenHash } });
    if (!invite || invite.status !== "PENDING" || invite.usedAt !== null) {
      return res.status(400).json({ error: "Invalid, consumed, or expired invite token" });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.userInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
      return res.status(400).json({ error: "Invite token has strictly expired" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      return res.status(409).json({ error: "An active account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name,
          email: invite.email,
          passwordHash,
          roleId: invite.roleId,
          role: "OPERATOR"
        }
      });
      if (invite.garageIds.length > 0) {
        await tx.userScope.createMany({
          data: invite.garageIds.map(gId => ({ userId: u.id, garageId: gId }))
        });
      }
      await tx.userInvite.update({
        where: { id: invite.id },
        data: { 
          status: "ACCEPTED",
          usedAt: new Date()
        }
      });
      return u;
    });

    res.status(201).json({ message: "Account setup deployed" });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: "Email already in use" });
    res.status(500).json({ error: "Failed to cleanly accept invite" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.sub },
      include: {
        roleRelation: { include: { permissions: true } },
        scopes: true
      }
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Format matches login payload structurally to ensure consistency
    const permissions = req.user.permissions;
    const scope = req.user.scope;

    res.json({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.roleRelation?.name || user.role,
      permissions,
      scope 
    });
  } catch (err) {
    console.error("GET /me ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const key = `forgotpw_${req.ip}_${email}`;
    const now = new Date();

    // Clean out globally expired rate limits periodically
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });

    const limitWindow = 15 * 60 * 1000;
    const rateLimit = await prisma.rateLimit.upsert({
      where: { key },
      update: { points: { increment: 1 } },
      create: { key, points: 1, expiresAt: new Date(now.getTime() + limitWindow) }
    });

    if (rateLimit.points > 3) {
      console.warn(`RATE LIMIT HIT for forgot-password: ${email} from ${req.ip}`);
      return res.status(200).json({ success: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Forgot Password requested for non-existent email: ${email}`);
      return res.status(200).json({ success: true });
    }

    // Produce Audit Log
    await prisma.auditLog.create({
      data: {
        action: "FORGOT_PASSWORD_REQUEST",
        entity: "User",
        entityId: user.id,
        userId: user.id
      }
    });

    const crypto = await import("crypto");
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expiresAt
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password#token=${rawToken}`;
    
    const isProd = process.env.NODE_ENV === "production";
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">SAMS Platform Security</h2>
          <p>We received a request to reset your operational account password.</p>
          <p>Click the button below to establish new credentials. <strong>This link will safely expire in 30 minutes.</strong></p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #666;">If you did not request this, please ignore this email or contact the fleet security team.</p>
        </div>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "security@sams-platform.com",
            to: email,
            subject: "Password Reset Request - SAMS Platform",
            html: htmlBody
          })
        });
        
        if (!emailRes.ok) {
          const errData = await emailRes.text();
          console.error("Resend API failed:", errData);
        } else {
          console.log(`[EMAIL] Dispatched password reset link to ${email}`);
        }
      } catch (emailErr) {
        console.error("Failed to execute Resend fetch:", emailErr);
      }
    }

    if (!isProd) {
      console.log(`\n=== [DEV EMAIL FALLBACK] Password Reset ===\nLink for ${email}:\n${resetLink}\n===========================================\n`);
      console.log(`RESET_LINK_GENERATED for ${email}`);
      return res.status(200).json({ success: true, debugResetUrl: resetLink });
    } else {
      console.log(`Password reset requested for ${email}`);
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(1),
      password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[0-9]/, "Password must contain a number")
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }
    const { token, password } = parsed.data;

    const crypto = await import("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken }
    });

    if (!resetRecord || resetRecord.usedAt || new Date() > resetRecord.expiresAt) {
      console.warn(`Invalid or expired reset token attempt`);
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    const user = await prisma.user.findUnique({ where: { email: resetRecord.email } });
    if (!user) {
      return res.status(400).json({ message: "User account no longer exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { 
          passwordHash,
          tokenVersion: { increment: 1 } // INVALIDATES ALL ACTIVE SESSIONS
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() }
      }),
      prisma.auditLog.create({
        data: {
          action: "PASSWORD_RESET_COMPLETED",
          entity: "User",
          entityId: user.id,
          userId: user.id
        }
      }),
      // Cleanup token bloat
      prisma.passwordResetToken.deleteMany({
        where: { OR: [ { usedAt: { not: null } }, { expiresAt: { lt: new Date() } } ] }
      })
    ]);

    console.log(`Password reset successfully for ${user.email}, sessions invalidated.`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
