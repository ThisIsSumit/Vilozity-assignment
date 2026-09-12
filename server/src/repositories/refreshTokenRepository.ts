import { prisma } from "../config/prisma";

export const refreshTokenRepository = {
  create: (userId: string, tokenHash: string, expiresAt: Date, familyId: string) =>
    prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt, familyId } }),
  findByHash: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),
  revoke: (id: string) => prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }),
  revokeAllForUser: (userId: string) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  // Called when a refresh token is presented that's already been rotated
  // away (revokedAt already set) — reuse of a dead token is the classic
  // signature of a stolen refresh token racing the legitimate user. Killing
  // every still-live token in the family forces re-authentication on every
  // device tied to that login, not just the one that got caught reusing it.
  revokeFamily: (familyId: string) =>
    prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
};