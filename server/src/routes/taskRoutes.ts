import { Router } from "express";
import { Role } from "@prisma/client";
import { taskController } from "../controllers/taskController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../validators/taskValidators";
import { idParamSchema } from "../validators/userValidators";

export const taskRoutes = Router();

taskRoutes.use(requireAuth);

taskRoutes.get("/", validate({ query: listTasksQuerySchema }), taskController.list);
taskRoutes.get("/:id", validate({ params: idParamSchema }), taskController.getById);

taskRoutes.post(
  "/",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ body: createTaskSchema }),
  taskController.create
);
taskRoutes.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ params: idParamSchema, body: updateTaskSchema }),
  taskController.update
);
taskRoutes.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ params: idParamSchema }),
  taskController.remove
);

// Status changes are allowed for Admin, the owning PM, AND the assigned
// developer — exact ownership is re-verified inside taskService.updateStatus,
// not just by role.
taskRoutes.patch(
  "/:id/status",
  validate({ params: idParamSchema, body: updateTaskStatusSchema }),
  taskController.updateStatus
);
