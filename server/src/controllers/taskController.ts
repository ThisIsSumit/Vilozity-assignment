import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { taskService } from "../services/taskService";
import { AppError } from "../utils/AppError";

export const taskController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await taskService.list(req.user, req.query as any) });
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await taskService.getForUser(req.params.id, req.user) });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.status(201).json({ success: true, data: await taskService.create(req.user, req.body) });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await taskService.update(req.params.id, req.user, req.body) });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await taskService.remove(req.params.id, req.user);
    res.status(204).send();
  }),
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({
      success: true,
      data: await taskService.updateStatus(req.params.id, req.user, req.body.status),
    });
  }),
};
