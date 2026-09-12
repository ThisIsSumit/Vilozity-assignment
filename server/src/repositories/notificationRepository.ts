import { prisma } from "../config/prisma";
import { NotificationType, Prisma } from "@prisma/client";

export const notificationRepository = {
  create: (
    data: { recipientId: string; type: NotificationType; title: string; message: string },
    tx?: Prisma.TransactionClient
  ) => (tx ?? prisma).notification.create({ data }),

  list: (recipientId: string, skip: number, take: number) =>
    Promise.all([
      prisma.notification.findMany({
        where: { recipientId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where: { recipientId } }),
    ]),

  unreadCount: (recipientId: string) =>
    prisma.notification.count({ where: { recipientId, isRead: false } }),

  findById: (id: string) => prisma.notification.findUnique({ where: { id } }),

  markRead: (id: string) => prisma.notification.update({ where: { id }, data: { isRead: true } }),

  markAllRead: (recipientId: string) =>
    prisma.notification.updateMany({ where: { recipientId, isRead: false }, data: { isRead: true } }),
};
