import { Router } from "express";
import { Role } from "@prisma/client";
import { userController } from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createUserSchema, idParamSchema, updateUserSchema } from "../validators/userValidators";

export const userRoutes = Router();

// Only Admin has complete user-management access (spec section 8).
userRoutes.use(requireAuth, requireRole(Role.ADMIN));

userRoutes.get("/", userController.list);
userRoutes.get("/:id", validate({ params: idParamSchema }), userController.getById);
userRoutes.post("/", validate({ body: createUserSchema }), userController.create);
userRoutes.patch("/:id", validate({ params: idParamSchema, body: updateUserSchema }), userController.update);
userRoutes.delete("/:id", validate({ params: idParamSchema }), userController.remove);
