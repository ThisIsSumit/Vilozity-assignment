import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { dashboardService } from "../services/dashboardService";
import { AppError } from "../utils/AppError";

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await dashboardService.summary(req.user) });
  }),
};