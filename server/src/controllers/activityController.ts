import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { activityService } from "../services/activityService";
import { AppError } from "../utils/AppError";

export const activityController = {
  recent: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    res.json({ success: true, data: await activityService.recent(req.user, limit) });
  }),
};
