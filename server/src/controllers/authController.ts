import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authService } from "../services/authService";
import { userRepository } from "../repositories/userRepository";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const REFRESH_COOKIE = "refreshToken";

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: (env.nodeEnv === "production" ? "strict" : "lax") as "strict" | "lax",
  maxAge: env.jwt.refreshExpiresInMs,
  path: "/api/auth",
};

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ success: true, data: { accessToken, user } });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ success: true, data: { accessToken, user } });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ success: true, data: {} });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await userRepository.findById(req.user.id);
    if (!user) throw AppError.unauthorized();
    res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }),
};
