import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "../services/socket";
import { useAuthStore } from "../store/authStore";
import { queryKeys } from "../lib/queryKeys";
import { ActivityItem, NotificationItem } from "../types";

// Wires the global socket lifecycle: connect on login, disconnect on
// logout, and on every reconnect re-fetch the last 20 relevant activity
// events from Postgres (never trust an in-memory buffer for what was
// missed while offline).
export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      socketService.disconnect();
      return;
    }

    const socket = socketService.connect();
    if (!socket) return;

    const onConnect = () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    };

    const onActivityNew = (activity: ActivityItem) => {
      queryClient.setQueryData<ActivityItem[]>(["activity", "recent"], (old) =>
        old ? [activity, ...old].slice(0, 20) : [activity]
      );
    };

    const onNotificationNew = (_notification: NotificationItem) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const onNotificationCount = (payload: { count: number }) => {
      queryClient.setQueryData(queryKeys.unreadCount, { count: payload.count });
    };

    const onPresenceUpdate = (payload: { onlineUserIds: string[] }) => {
      queryClient.setQueryData(["presence"], payload.onlineUserIds);
    };

    socket.on("connect", onConnect);
    socket.on("activity:new", onActivityNew);
    socket.on("notification:new", onNotificationNew);
    socket.on("notification:count", onNotificationCount);
    socket.on("presence:update", onPresenceUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("activity:new", onActivityNew);
      socket.off("notification:new", onNotificationNew);
      socket.off("notification:count", onNotificationCount);
      socket.off("presence:update", onPresenceUpdate);
    };
  }, [accessToken, queryClient]);
}
