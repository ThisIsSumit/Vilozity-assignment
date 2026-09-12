import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { AccessTokenPayload } from "../types";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string };
}

// We never store the raw refresh token in the DB — only a hash of it — so a
// database leak alone can't be used to mint sessions.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Identifies a chain of rotated refresh tokens back to a single login. See
// RefreshToken.familyId in schema.prisma for why this exists.
export function newTokenFamilyId(): string {
  return crypto.randomUUID();
}