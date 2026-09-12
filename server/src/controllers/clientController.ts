import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { clientService } from "../services/clientService";

export const clientController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await clientService.list() });
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await clientService.getById(req.params.id) });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await clientService.create(req.body) });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await clientService.update(req.params.id, req.body) });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await clientService.remove(req.params.id);
    res.status(204).send();
  }),
};
