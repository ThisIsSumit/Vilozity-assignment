import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
// Shape of the response varies by role (see dashboardService.summary) but
// the route itself is open to all authenticated roles — each role only
// ever sees aggregates scoped to what it's already allowed to see.
dashboardRoutes.get("/summary", dashboardController.summary);