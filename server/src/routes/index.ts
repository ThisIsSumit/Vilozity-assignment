import { Router } from "express";
import { authRoutes } from "./authRoutes";
import { userRoutes } from "./userRoutes";
import { clientRoutes } from "./clientRoutes";
import { projectRoutes } from "./projectRoutes";
import { taskRoutes } from "./taskRoutes";
import { activityRoutes } from "./activityRoutes";
import { notificationRoutes } from "./notificationRoutes";
import { dashboardRoutes } from "./dashboardRoutes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/clients", clientRoutes);
apiRouter.use("/projects", projectRoutes);
apiRouter.use("/tasks", taskRoutes);
apiRouter.use("/activity", activityRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/dashboard", dashboardRoutes);