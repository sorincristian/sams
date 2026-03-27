import type { Request, Response, NextFunction } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { 
    sub: string; 
    userId: string; 
    email: string; 
    role: string;
    permissions: Record<string, string>;
    scope: { garages: string[] };
    tokenVersion?: number;
  };
}

export function signToken(payload: { sub: string; email: string; role: string }) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is completely missing or undefined");
  }

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "12h") as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

import { prisma } from "./prisma.js";

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET environment variable is missing");
    return res.status(500).json({ error: "Server auth misconfiguration" });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { 
      sub: string; 
      email: string; 
      role: string;
      permissions: Record<string, string>;
      scope: { garages: string[] };
      tokenVersion?: number;
    };

    if (decoded.tokenVersion !== undefined) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { tokenVersion: true }
      });
      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ message: "Session expired or invalidated" });
      }
    }

    req.user = { ...decoded, userId: decoded.sub };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
