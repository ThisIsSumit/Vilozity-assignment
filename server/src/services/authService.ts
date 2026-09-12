import { userRepository } from "../repositories/userRepository";
import { refreshTokenRepository } from "../repositories/refreshTokenRepository";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  hashToken,
  newTokenFamilyId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

function toSafeUser(user: { id: string; name: string; email: string; role: any }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    // Same error for "no such user" and "wrong password" — don't leak which
    // one it was (username enumeration).
    if (!user) throw AppError.unauthorized("Invalid email or password");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Invalid email or password");

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresInMs);
    // Every fresh login starts a brand new token family. All tokens minted
    // by rotating THIS refresh token (see .refresh() below) will carry the
    // same familyId forward, so they can all be revoked together if reuse
    // of a dead token in this chain is ever detected.
    const familyId = newTokenFamilyId();
    await refreshTokenRepository.create(user.id, hashToken(refreshToken), expiresAt, familyId);

    return { accessToken, refreshToken, user: toSafeUser(user) };
  },

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw AppError.unauthorized("Missing refresh token");

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const record = await refreshTokenRepository.findByHash(tokenHash);

    if (!record || record.userId !== payload.sub) {
      throw AppError.unauthorized("Refresh token is invalid or expired");
    }

    // REUSE DETECTION: this exact token was already rotated away once
    // before (revokedAt is set), and yet here it is again. A legitimate
    // client would have moved on to the NEW token from that rotation and
    // never presented this one again — so this can only mean the token
    // leaked and something else (an attacker, or a stale second tab that
    // raced a legitimate refresh) is now trying to use a dead credential.
    // Treat it as compromise: kill every other still-live token descended
    // from the same login so every device has to re-authenticate, not just
    // reject this one request.
    if (record.revokedAt) {
      await refreshTokenRepository.revokeFamily(record.familyId);
      // eslint-disable-next-line no-console
      console.warn(
        `[auth] refresh-token reuse detected for user ${record.userId} (family ${record.familyId}) — entire token family revoked`
      );
      throw AppError.unauthorized("Session invalidated — please log in again");
    }

    if (record.expiresAt < new Date()) {
      throw AppError.unauthorized("Refresh token is invalid or expired");
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) throw AppError.unauthorized("User no longer exists");

    // Rotate: revoke the old refresh token and issue a brand new one in the
    // SAME family, so a future reuse of this now-dead token is still
    // detectable as part of the same chain.
    await refreshTokenRepository.revoke(record.id);
    const newRefreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresInMs);
    await refreshTokenRepository.create(user.id, hashToken(newRefreshToken), expiresAt, record.familyId);

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    return { accessToken, refreshToken: newRefreshToken, user: toSafeUser(user) };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const record = await refreshTokenRepository.findByHash(hashToken(refreshToken));
    if (record && !record.revokedAt) await refreshTokenRepository.revoke(record.id);
  },

  async createUser(input: { name: string; email: string; password: string; role: any }) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict("A user with that email already exists");
    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });
    return toSafeUser(user);
  },
};