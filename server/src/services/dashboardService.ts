import { Role, TaskStatus, Priority } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "../types";
import { projectScopeFor, taskScopeFor } from "./scopes";

const ALL_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const ALL_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Backs each role's dashboard stat cards. Deliberately computed with
// aggregate Prisma queries (count / groupBy) scoped by the SAME
// projectScopeFor/taskScopeFor rule used everywhere else — never by
// fetching a page of results and counting client-side, which would silently
// under-report totals once there's more than one page of data.
export const dashboardService = {
  async summary(user: AuthenticatedUser) {
    const projectWhere = projectScopeFor(user);
    const taskWhere = taskScopeFor(user);

    const [totalProjects, totalTasks, statusGroups, overdueCount] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.groupBy({ by: ["status"], where: taskWhere, _count: { _all: true } }),
      prisma.task.count({ where: { ...taskWhere, isOverdue: true } }),
    ]);

    const tasksByStatus = Object.fromEntries(
      ALL_STATUSES.map((s) => [
        s,
        statusGroups.find((g: { status: TaskStatus; _count: { _all: number } }) => g.status === s)?._count._all ?? 0,
      ])
    ) as Record<TaskStatus, number>;

    const base = { totalProjects, totalTasks, tasksByStatus, overdueCount };

    if (user.role === Role.ADMIN) {
      // Presence (online users right now) is a live WebSocket concern, not
      // a DB aggregate — the frontend reads it from the presence:update
      // socket event instead of this endpoint.
      return base;
    }

    if (user.role === Role.PROJECT_MANAGER) {
      const priorityGroups = await prisma.task.groupBy({
        by: ["priority"],
        where: taskWhere,
        _count: { _all: true },
      });
      const tasksByPriority = Object.fromEntries(
        ALL_PRIORITIES.map((p) => [
          p,
          priorityGroups.find((g: { priority: Priority; _count: { _all: number } }) => g.priority === p)?._count
            ._all ?? 0,
        ])
      ) as Record<Priority, number>;

      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingDueThisWeek = await prisma.task.count({
        where: { ...taskWhere, status: { not: "DONE" }, dueDate: { gte: now, lte: weekFromNow } },
      });

      return { ...base, tasksByPriority, upcomingDueThisWeek };
    }

    // DEVELOPER: base counts are already scoped to "my tasks" via
    // taskScopeFor; the sorted task list itself is served by the existing
    // GET /api/tasks endpoint (already ordered priority desc, dueDate asc).
    return base;
  },
};