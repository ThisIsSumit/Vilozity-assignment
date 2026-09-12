import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { notificationService } from "../services/notificationService";
import { AppError } from "../utils/AppError";

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    res.json({ success: true, data: await notificationService.list(req.user.id, page, limit) });
  }),
  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: { count: await notificationService.unreadCount(req.user.id) } });
  }),
  markRead: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await notificationService.markRead(req.params.id, req.user.id) });
  }),
  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await notificationService.markAllRead(req.user.id);
    res.json({ success: true, data: {} });
  }),
};
