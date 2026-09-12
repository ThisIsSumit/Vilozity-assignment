import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  list: () =>
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    }),
  create: (data: { name: string; email: string; passwordHash: string; role: Role }) =>
    prisma.user.create({ data }),
  update: (id: string, data: Partial<{ name: string; email: string; role: Role }>) =>
    prisma.user.update({ where: { id }, data }),
  remove: (id: string) => prisma.user.delete({ where: { id } }),
};
