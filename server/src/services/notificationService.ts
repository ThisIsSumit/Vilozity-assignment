import { NotificationType, Prisma } from "@prisma/client";
import { notificationRepository } from "../repositories/notificationRepository";
import { AppError } from "../utils/AppError";
import { emitNotificationCount, emitNotificationNew } from "../websocket/emitter";

export const notificationService = {
  async list(recipientId: string, page: number, limit: number) {
    const [items, total] = await notificationRepository.list(recipientId, (page - 1) * limit, limit);
    return { items, total, page, limit };
  },

  unreadCount: (recipientId: string) => notificationRepository.unreadCount(recipientId),

  // Creates a notification AND pushes it (and the fresh unread count) over
  // the socket in one call, so every call site gets real-time delivery for
  // free instead of remembering to do it themselves.
  async createAndEmit(
    data: { recipientId: string; type: NotificationType; title: string; message: string },
    tx?: Prisma.TransactionClient
  ) {
    const notification = await notificationRepository.create(data, tx);
    // Only emit after the transaction actually commits — see taskService,
    // which calls this within `$transaction` and defers the emit itself.
    if (!tx) {
      emitNotificationNew(notification);
      const count = await notificationRepository.unreadCount(data.recipientId);
      emitNotificationCount(data.recipientId, count);
    }
    return notification;
  },

  async markRead(id: string, userId: string) {
    const notification = await notificationRepository.findById(id);
    if (!notification || notification.recipientId !== userId) {
      throw AppError.notFound("Notification not found");
    }
    const updated = await notificationRepository.markRead(id);
    const count = await notificationRepository.unreadCount(userId);
    emitNotificationCount(userId, count);
    return updated;
  },

  async markAllRead(userId: string) {
    await notificationRepository.markAllRead(userId);
    emitNotificationCount(userId, 0);
  },
};
