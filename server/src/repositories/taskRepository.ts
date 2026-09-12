import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

const taskInclude = {
  project: { select: { id: true, name: true, createdById: true } },
  assignedDeveloper: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TaskInclude;

export const taskRepository = {
  findById: (id: string) => prisma.task.findUnique({ where: { id }, include: taskInclude }),

  list: (where: Prisma.TaskWhereInput, skip: number, take: number) =>
    Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        skip,
        take,
      }),
      prisma.task.count({ where }),
    ]),

  create: (data: Prisma.TaskUncheckedCreateInput) => prisma.task.create({ data, include: taskInclude }),

  update: (id: string, data: Prisma.TaskUncheckedUpdateInput) =>
    prisma.task.update({ where: { id }, data, include: taskInclude }),

  remove: (id: string) => prisma.task.delete({ where: { id } }),

  findOverdueCandidates: (now: Date) =>
    prisma.task.findMany({
      where: { isOverdue: false, status: { not: "DONE" }, dueDate: { lt: now } },
    }),

  markOverdue: (ids: string[]) =>
    prisma.task.updateMany({ where: { id: { in: ids } }, data: { isOverdue: true } }),
};
