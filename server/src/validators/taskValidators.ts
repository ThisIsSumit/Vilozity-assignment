import { z } from "zod";
import { Priority, TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  assignedDeveloperId: z.string().uuid().optional(),
  priority: z.nativeEnum(Priority).default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  assignedDeveloperId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const listTasksQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
