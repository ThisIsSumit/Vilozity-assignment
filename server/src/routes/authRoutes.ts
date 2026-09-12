import { Router } from "express";
import { authController } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { loginSchema } from "../validators/authValidators";
import { requireAuth } from "../middleware/auth";
import { loginRateLimiter } from "../middleware/rate-Limit";

export const authRoutes = Router();

authRoutes.post("/login", loginRateLimiter, validate({ body: loginSchema }), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", requireAuth, authController.me);