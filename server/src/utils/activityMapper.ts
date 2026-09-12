import { ActivityLog } from "@prisma/client";

type ActivityWithRelations = ActivityLog & {
  user: { id: string; name: string };
  task: { id: string; number: number; title: string } | null;
};

// Single source of truth for the activity "wire shape" — used by BOTH the
// REST endpoint (GET /api/activity/recent) and the Socket.IO emitter
// (activity:new), so the frontend's ActivityFeed component always receives
// the same flat fields regardless of which path delivered the data. This
// mismatch (nested Prisma relations vs. flat socket payload) was the source
// of an earlier `a.userName.charAt is not a function` crash on first
// dashboard load.
export function toActivityItem(activity: ActivityWithRelations) {
  return {
    activityId: activity.id,
    projectId: activity.projectId,
    taskId: activity.taskId,
    taskNumber: activity.task?.number ?? null,
    taskTitle: activity.task?.title ?? null,
    userId: activity.userId,
    userName: activity.user.name,
    action: activity.action,
    oldValue: activity.oldValue,
    newValue: activity.newValue,
    createdAt: activity.createdAt,
  };
}