import { Prisma, Role, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { taskRepository } from "../repositories/taskRepository";
import { projectRepository } from "../repositories/projectRepository";
import { activityRepository } from "../repositories/activityRepository";
import { notificationRepository } from "../repositories/notificationRepository";
import { AppError } from "../utils/AppError";
import { AuthenticatedUser } from "../types";
import { emitActivityNew, emitNotificationCount, emitNotificationNew } from "../websocket/emitter";
import { taskScopeFor } from "./scopes";

interface TaskFilters {
  status?: TaskStatus;
  priority?: string;
  from?: Date;
  to?: Date;
  projectId?: string;
  page: number;
  limit: number;
}

// scopeFor is now shared as taskScopeFor() in ./scopes.

export const taskService = {
  async list(user: AuthenticatedUser, filters: TaskFilters) {
    const where: Prisma.TaskWhereInput = {
      ...taskScopeFor(user),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.from || filters.to
        ? { dueDate: { ...(filters.from && { gte: filters.from }), ...(filters.to && { lte: filters.to }) } }
        : {}),
    };
    const [items, total] = await taskRepository.list(where, (filters.page - 1) * filters.limit, filters.limit);
    return { items, total, page: filters.page, limit: filters.limit };
  },

  // Fetch + ownership check combined — an out-of-scope ID yields 404, never
  // a 200 with different permissions attached.
  async getForUser(id: string, user: AuthenticatedUser) {
    const task = await taskRepository.findById(id);
    if (!task) throw AppError.notFound("Task not found");
    if (user.role === Role.ADMIN) return task;
    if (user.role === Role.PROJECT_MANAGER && task.project.createdById === user.id) return task;
    if (user.role === Role.DEVELOPER && task.assignedDeveloperId === user.id) return task;
    throw AppError.notFound("Task not found");
  },

  async create(
    user: AuthenticatedUser,
    data: {
      projectId: string;
      title: string;
      description?: string;
      assignedDeveloperId?: string;
      priority: any;
      dueDate?: Date;
    }
  ) {
    // A PM may only create tasks inside a project they own; Admin may
    // create anywhere.
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw AppError.notFound("Project not found");
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.id) {
      throw AppError.forbidden("You do not own this project");
    }

    const task = await taskRepository.create(data as Prisma.TaskUncheckedCreateInput);

    if (data.assignedDeveloperId) {
      const notification = await notificationRepository.create({
        recipientId: data.assignedDeveloperId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `${user.name} assigned you "${task.title}"`,
      });
      emitNotificationNew(notification);
      emitNotificationCount(data.assignedDeveloperId, await notificationRepository.unreadCount(data.assignedDeveloperId));
    }

    return task;
  },

  async update(
    id: string,
    user: AuthenticatedUser,
    data: Partial<{
      title: string;
      description: string;
      assignedDeveloperId: string | null;
      priority: any;
      dueDate: Date | null;
    }>
  ) {
    const task = await this.assertMutable(id, user);

    const previousDeveloperId = task.assignedDeveloperId;
    const updated = await taskRepository.update(task.id, data as Prisma.TaskUncheckedUpdateInput);

    // Newly (re)assigned developer gets notified, same as at creation time.
    if (data.assignedDeveloperId && data.assignedDeveloperId !== previousDeveloperId) {
      const notification = await notificationRepository.create({
        recipientId: data.assignedDeveloperId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `${user.name} assigned you "${updated.title}"`,
      });
      emitNotificationNew(notification);
      emitNotificationCount(
        data.assignedDeveloperId,
        await notificationRepository.unreadCount(data.assignedDeveloperId)
      );
    }

    return updated;
  },

  async remove(id: string, user: AuthenticatedUser) {
    const task = await this.assertMutable(id, user);
    return taskRepository.remove(task.id);
  },

  // Admin: any task. PM: tasks in projects they created. Developer may only
  // mutate metadata (not status — see updateStatus) on their own task, and
  // in practice the route only exposes update to Admin/PM; this guard is
  // the defense-in-depth backstop.
  async assertMutable(id: string, user: AuthenticatedUser) {
    const task = await taskRepository.findById(id);
    if (!task) throw AppError.notFound("Task not found");
    if (user.role === Role.ADMIN) return task;
    if (user.role === Role.PROJECT_MANAGER && task.project.createdById === user.id) return task;
    throw AppError.forbidden("You do not have access to this task");
  },

  // Implements the exact flow from the spec:
  // validate permission -> read current status -> update -> ActivityLog ->
  // Notification (if -> IN_REVIEW) -> commit as one transaction -> emit
  // activity:new / notification:new / notification:count.
  async updateStatus(id: string, user: AuthenticatedUser, newStatus: TaskStatus) {
    const task = await taskRepository.findById(id);
    if (!task) throw AppError.notFound("Task not found");

    const isAdmin = user.role === Role.ADMIN;
    const isOwningPm = user.role === Role.PROJECT_MANAGER && task.project.createdById === user.id;
    const isAssignedDeveloper = user.role === Role.DEVELOPER && task.assignedDeveloperId === user.id;
    if (!isAdmin && !isOwningPm && !isAssignedDeveloper) {
      throw AppError.forbidden("You do not have access to this task");
    }

    const oldStatus = task.status;

    const { updatedTask, activity, pmNotification } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedTask = await tx.task.update({
        where: { id },
        data: { status: newStatus },
        include: { project: true, assignedDeveloper: true },
      });

      const activity = await activityRepository.create(
        {
          projectId: task.projectId,
          taskId: task.id,
          userId: user.id,
          action: "TASK_STATUS_CHANGED",
          oldValue: oldStatus,
          newValue: newStatus,
        },
        tx
      );

      let pmNotification = null;
      if (newStatus === "IN_REVIEW" && oldStatus !== "IN_REVIEW") {
        pmNotification = await tx.notification.create({
          data: {
            recipientId: updatedTask.project.createdById,
            type: "TASK_IN_REVIEW",
            title: "Task moved to In Review",
            message: `${user.name} moved "${updatedTask.title}" to In Review`,
          },
        });
      }

      return { updatedTask, activity, pmNotification };
    });

    // Emit only after the transaction has committed successfully.
    emitActivityNew(
      { ...activity, user: { id: user.id, name: user.name }, task: { id: task.id, number: task.number, title: task.title } },
      updatedTask.assignedDeveloperId
    );

    if (pmNotification) {
      emitNotificationNew(pmNotification);
      emitNotificationCount(pmNotification.recipientId, await notificationRepository.unreadCount(pmNotification.recipientId));
    }

    return updatedTask;
  },
};