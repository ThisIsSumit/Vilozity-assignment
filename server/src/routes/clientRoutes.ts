import { Router } from "express";
import { Role } from "@prisma/client";
import { clientController } from "../controllers/clientController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createClientSchema, updateClientSchema } from "../validators/clientValidators";
import { idParamSchema } from "../validators/userValidators";

export const clientRoutes = Router();

clientRoutes.use(requireAuth);

// Any authenticated role may read clients (needed to render project info);
// only Admin/PM may write.
clientRoutes.get("/", clientController.list);
clientRoutes.get("/:id", validate({ params: idParamSchema }), clientController.getById);
clientRoutes.post(
  "/",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ body: createClientSchema }),
  clientController.create
);
clientRoutes.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ params: idParamSchema, body: updateClientSchema }),
  clientController.update
);
clientRoutes.delete("/:id", requireRole(Role.ADMIN), validate({ params: idParamSchema }), clientController.remove);
