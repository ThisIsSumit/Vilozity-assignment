import { getIo } from "./ioInstance";
import { rooms } from "./rooms";
import { ActivityLog, Notification, Role } from "@prisma/client";
import { toActivityItem } from "../utils/activityMapper";

type ActivityWithRelations = ActivityLog & {
  user: { id: string; name: string };
  task: { id: string; number: number; title: string } | null;
};

// Emits activity:new to exactly the sockets authorized to see it:
// - global:activity room (admins)
// - project:{projectId} room (the PM who owns it + anyone else legitimately
//   subscribed to that project room, which itself is access-checked at
//   join time)
// - user:{developerId} room, so an assigned developer sees it even if they
//   aren't (and shouldn't be) subscribed to the whole project room.
//
// Uses the same toActivityItem() shape as GET /api/activity/recent, so the
// frontend never has to branch on whether an activity item came from the
// initial REST fetch or a live socket event.
export function emitActivityNew(activity: ActivityWithRelations, relevantDeveloperId?: string | null) {
  const io = getIo();
  const payload = toActivityItem(activity);

  io.to(rooms.globalActivity).emit("activity:new", payload);
  io.to(rooms.project(activity.projectId)).emit("activity:new", payload);
  if (relevantDeveloperId) {
    io.to(rooms.user(relevantDeveloperId)).emit("activity:new", payload);
  }
}

export function emitNotificationNew(notification: Notification) {
  const io = getIo();
  io.to(rooms.user(notification.recipientId)).emit("notification:new", notification);
}

export function emitNotificationCount(userId: string, count: number) {
  const io = getIo();
  io.to(rooms.user(userId)).emit("notification:count", { count });
}

export function emitPresenceUpdate(onlineUserIds: string[]) {
  const io = getIo();
  io.to(rooms.presence).emit("presence:update", { onlineUserIds });
}

export function broadcastRole(role: Role, event: string, payload: unknown) {
  // Helper reserved for role-wide broadcasts (e.g. future admin-only
  // events); not required by the core flows above but kept small/typed
  // rather than reaching for io.emit() unscoped.
  const io = getIo();
  io.to(role).emit(event, payload);
}