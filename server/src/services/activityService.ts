// import { Prisma, Role } from "@prisma/client";
// import { activityRepository } from "../repositories/activityRepository";
// import { AuthenticatedUser } from "../types";

// // Same scoping principle as projectService.scopeFor: this is the single
// // choke point for "who is allowed to see this activity", used by both the
// // missed-activity REST endpoint and (indirectly, via the same rule) socket
// // room membership.
// function scopeFor(user: AuthenticatedUser): Prisma.ActivityLogWhereInput {
//   switch (user.role) {
//     case Role.ADMIN:
//       return {};
//     case Role.PROJECT_MANAGER:
//       return { project: { createdById: user.id } };
//     case Role.DEVELOPER:
//       return { task: { assignedDeveloperId: user.id } };
//   }
// }

// export const activityService = {
//   // Backs GET /api/activity/recent — also what the frontend calls on socket
//   // reconnect to recover anything missed while offline. Source of truth is
//   // always Postgres, never an in-memory buffer.
//   recent: async (user: AuthenticatedUser, limit: number) => {
//     const activities = await activityRepository.recent(scopeFor(user), limit);

//     return activities.map((activity) => ({
//       activityId: activity.id,
//       projectId: activity.projectId,
//       taskId: activity.taskId,
//       taskTitle: activity.task?.title ?? null,
//       userId: activity.userId,
//       userName: activity.user.name,
//       action: activity.action,
//       oldValue: activity.oldValue,
//       newValue: activity.newValue,
//       createdAt: activity.createdAt,
//     }));
//   },
// };
import { activityRepository } from "../repositories/activityRepository";
import { AuthenticatedUser } from "../types";
import { toActivityItem } from "../utils/activityMapper";
import { activityScopeFor } from "./scopes";

export const activityService = {
  // Backs GET /api/activity/recent — also what the frontend calls on socket
  // reconnect to recover anything missed while offline. Source of truth is
  // always Postgres, never an in-memory buffer. Mapped through
  // toActivityItem so this returns the exact same flat shape as the
  // activity:new socket event — the frontend's ActivityFeed only ever has
  // to handle one shape.
  async recent(user: AuthenticatedUser, limit: number) {
    const rows = await activityRepository.recent(activityScopeFor(user), limit);
    return rows.map(toActivityItem);
  },
};