import { Router } from "express";
import { activityController } from "../controllers/activityController";
import { requireAuth } from "../middleware/auth";

export const activityRoutes = Router();

activityRoutes.use(requireAuth);
activityRoutes.get("/recent", activityController.recent);
