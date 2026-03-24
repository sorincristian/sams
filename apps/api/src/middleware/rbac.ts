import { Response, NextFunction } from "express";
import { AuthRequest } from "../auth.js";

export function requirePermission(module: string, level: "view" | "manage") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const userAccess = req.user.permissions?.[module] || "none";

    if (userAccess === "none") {
      return res.status(403).json({ error: "Forbidden: No access to this module" });
    }

    if (level === "manage" && userAccess !== "manage") {
      return res.status(403).json({ error: "Forbidden: Manage access required" });
    }

    next();
  };
}

export function requireGarageScope(garageId: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    // Some routes might pass garageId in body, others in params. 
    // This explicit middleware requires garageId as an argument but we can also extract it from req.
    // For manual checks, developers usually check inside the route. Wait, the prompt said:
    // requireGarageScope(garageId) 
    // Actually, middleware can't usually take a dynamic value from the DB on route define, 
    // it's easier to pass a param name like params.id or body.garageId, but let's implement the standard function.

    const allowedGarages = req.user.scope?.garages || [];
    
    if (!allowedGarages.includes(garageId)) {
      return res.status(403).json({ error: "Forbidden: No access to this facility" });
    }
    
    next();
  };
}
