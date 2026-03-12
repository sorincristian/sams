import type { Request, Response, NextFunction } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { sub: string; email: string; role: string };
}

export function signToken(payload: { sub: string; email: string; role: string }) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is completely missing or undefined");
  }

  // Ensure options strictly match JSON Web Token SignOptions
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as string) || "12h"
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is missing");
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET) as AuthRequest["user"];
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
