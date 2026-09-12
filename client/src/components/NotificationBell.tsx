import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { queryKeys } from "../lib/queryKeys";
import { NotificationItem, Paginated } from "../types";
import { relativeTime } from "../lib/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => (await api.get("/notifications/unread-count")).data.data as { count: number },
  });

  const { data } = useQuery({
    queryKey: queryKeys.notifications({ page: 1 }),
    queryFn: async () =>
      (await api.get("/notifications?page=1&limit=10")).data.data as Paginated<NotificationItem>,
    enabled: open,
  });

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const count = countData?.count ?? 0;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-md p-2 hover:bg-slate-100">
        <Bell className="h-5 w-5 text-slate-500" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Notifications</p>
            <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!data?.items.length && <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</p>}
            {data?.items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`block w-full border-b border-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                  !n.isRead ? "bg-brand-50/40" : ""
                }`}
              >
                <p className="font-medium text-slate-700">{n.title}</p>
                <p className="text-slate-500">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{relativeTime(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
