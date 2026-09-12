import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

const activityInclude = {
  user: { select: { id: true, name: true } },
  task: { select: { id: true, number: true, title: true } },
} satisfies Prisma.ActivityLogInclude;

export const activityRepository = {
  create: (data: Prisma.ActivityLogUncheckedCreateInput, tx?: Prisma.TransactionClient) =>
    (tx ?? prisma).activityLog.create({ data, include: activityInclude }),

  // Role-scoped "recent activity" used both by GET /api/activity/recent and
  // by socket reconnect recovery — the single source of truth is Postgres,
  // never an in-memory buffer.
  recent: (where: Prisma.ActivityLogWhereInput, limit: number) =>
    prisma.activityLog.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
};