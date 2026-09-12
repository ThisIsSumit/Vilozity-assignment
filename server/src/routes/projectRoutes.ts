import { Router } from "express";
import { Role } from "@prisma/client";
import { projectController } from "../controllers/projectController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from "../validators/projectValidators";
import { idParamSchema } from "../validators/userValidators";

export const projectRoutes = Router();

projectRoutes.use(requireAuth);

// GET endpoints are open to all roles but auto-scoped inside the service —
// this is what makes "developer sees only relevant projects" hold even if
// they call the API directly.
projectRoutes.get("/", validate({ query: listProjectsQuerySchema }), projectController.list);
projectRoutes.get("/:id", validate({ params: idParamSchema }), projectController.getById);

projectRoutes.post(
  "/",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ body: createProjectSchema }),
  projectController.create
);
projectRoutes.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ params: idParamSchema, body: updateProjectSchema }),
  projectController.update
);
projectRoutes.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ params: idParamSchema }),
  projectController.remove
);
