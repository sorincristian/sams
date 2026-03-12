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
      email: z.string().email(),
      password: z.string().min(1)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    console.log("LOGIN ATTEMPT:", { email: parsed.data.email });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
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
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, jwtSecret, { expiresIn });

    console.log("LOGIN SUCCESS:", { email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error("LOGIN ROUTE ERROR:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;
