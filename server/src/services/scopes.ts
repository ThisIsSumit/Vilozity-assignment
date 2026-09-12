import { Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../types";

// Single source of truth for "which projects/tasks is this user allowed to
// see". Every role-scoped query — project list/lookup, task list/lookup,
// activity feed, dashboard aggregates, and the Socket.IO project:join
// handler — goes through these two functions so the rule can't drift
// between call sites. Previously this logic was copy-pasted per service;
// consolidating it here is what lets the dashboard summary endpoint below
// report numbers that are guaranteed consistent with what the same user
// sees in the project/task list views.
export function projectScopeFor(user: AuthenticatedUser): Prisma.ProjectWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return {};
    case Role.PROJECT_MANAGER:
      return { createdById: user.id };
    case Role.DEVELOPER:
      return { tasks: { some: { assignedDeveloperId: user.id } } };
  }
}

export function taskScopeFor(user: AuthenticatedUser): Prisma.TaskWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return {};
    case Role.PROJECT_MANAGER:
      return { project: { createdById: user.id } };
    case Role.DEVELOPER:
      return { assignedDeveloperId: user.id };
  }
}

export function activityScopeFor(user: AuthenticatedUser): Prisma.ActivityLogWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return {};
    case Role.PROJECT_MANAGER:
      return { project: { createdById: user.id } };
    case Role.DEVELOPER:
      return { task: { assignedDeveloperId: user.id } };
  }
}