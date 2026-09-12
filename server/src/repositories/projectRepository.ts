import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

const projectInclude = {
  client: { select: { id: true, name: true, company: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectInclude;

export const projectRepository = {
  findById: (id: string) => prisma.project.findUnique({ where: { id }, include: projectInclude }),

  // Scoped listing: WHERE clause is built by the service layer per-role and
  // applied at the database level (never fetch-all-then-filter).
  list: (where: Prisma.ProjectWhereInput, skip: number, take: number) =>
    Promise.all([
      prisma.project.findMany({ where, include: projectInclude, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.project.count({ where }),
    ]),

  create: (data: { name: string; description?: string; clientId: string; createdById: string }) =>
    prisma.project.create({ data, include: projectInclude }),

  update: (id: string, data: Partial<{ name: string; description: string; clientId: string }>) =>
    prisma.project.update({ where: { id }, data, include: projectInclude }),

  remove: (id: string) => prisma.project.delete({ where: { id } }),

  // Used by developer-scoped queries: does this developer have any task on
  // this project?
  hasDeveloperTask: async (projectId: string, developerId: string) => {
    const count = await prisma.task.count({ where: { projectId, assignedDeveloperId: developerId } });
    return count > 0;
  },
};
