import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

// Authenticates the request from the Authorization: Bearer <accessToken>
// header. This is the ONLY place identity is established server-side —
// nothing from the request body/query is ever trusted for identity or role.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Missing access token");
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    // Re-check the user still exists / role hasn't been revoked since the
    // token was issued — protects against a stale token surviving a
    // deactivation or role change.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppError.unauthorized("User no longer exists");

    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    next(AppError.unauthorized("Invalid or expired access token"));
  }
}

// Coarse-grained role gate. Per the spec, this is NEVER sufficient on its
// own for resource endpoints — it must be paired with an ownership check
// in the service layer (see services/*Service.ts `assert*Access` helpers).
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
