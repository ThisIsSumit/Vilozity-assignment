import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { userService } from "../services/userService";

export const userController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await userService.list() });
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await userService.getById(req.params.id) });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await userService.create(req.body) });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await userService.update(req.params.id, req.body) });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await userService.remove(req.params.id);
    res.status(204).send();
  }),
};
