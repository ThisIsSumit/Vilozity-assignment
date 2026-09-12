import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { projectService } from "../services/projectService";
import { AppError } from "../utils/AppError";

export const projectController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    res.json({ success: true, data: await projectService.list(req.user, page, limit) });
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await projectService.getForUser(req.params.id, req.user) });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.status(201).json({ success: true, data: await projectService.create(req.user, req.body) });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: await projectService.update(req.params.id, req.user, req.body) });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await projectService.remove(req.params.id, req.user);
    res.status(204).send();
  }),
};
