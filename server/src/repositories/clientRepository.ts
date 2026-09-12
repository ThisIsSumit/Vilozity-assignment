import { prisma } from "../config/prisma";

export const clientRepository = {
  list: () => prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
  findById: (id: string) => prisma.client.findUnique({ where: { id } }),
  create: (data: { name: string; email: string; company: string }) => prisma.client.create({ data }),
  update: (id: string, data: Partial<{ name: string; email: string; company: string }>) =>
    prisma.client.update({ where: { id }, data }),
  remove: (id: string) => prisma.client.delete({ where: { id } }),
};
