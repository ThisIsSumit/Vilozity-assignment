import { Router } from "express";
import { notificationController } from "../controllers/notificationController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/notificationValidators";

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);
notificationRoutes.get("/", notificationController.list);
notificationRoutes.get("/unread-count", notificationController.unreadCount);
notificationRoutes.patch("/read-all", notificationController.markAllRead);
notificationRoutes.patch("/:id/read", validate({ params: idParamSchema }), notificationController.markRead);
