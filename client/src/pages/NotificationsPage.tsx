import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { NotificationItem, Paginated } from "../types";
import { relativeTime } from "../lib/format";
import { LoadingSkeleton, EmptyState } from "../components/States";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", { page: 1, full: true }],
    queryFn: async () => (await api.get("/notifications?page=1&limit=50")).data.data as Paginated<NotificationItem>,
  });

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Notifications</h1>
        <button onClick={markAllRead} className="text-sm font-medium text-brand-600 hover:underline">
          Mark all read
        </button>
      </div>

      {isLoading && <LoadingSkeleton />}
      {!isLoading && !data?.items.length && <EmptyState title="You're all caught up" />}

      <div className="space-y-2">
        {data?.items.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`block w-full rounded-xl border px-4 py-3 text-left text-sm ${
              n.isRead ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"
            }`}
          >
            <p className="font-medium text-slate-700">{n.title}</p>
            <p className="text-slate-500">{n.message}</p>
            <p className="mt-1 text-xs text-slate-400">{relativeTime(n.createdAt)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
