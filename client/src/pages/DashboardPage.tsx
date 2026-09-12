import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Task, ActivityItem, Paginated, DashboardSummary } from "../types";
import { TaskTable } from "../components/TaskTable";
import { ActivityFeed } from "../components/ActivityFeed";
import { LoadingSkeleton } from "../components/States";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Real aggregate counts (total projects/tasks, tasks-by-status, overdue)
  // computed server-side over the FULL scoped dataset — never derived from
  // a paginated slice, which would silently under-report once there's more
  // than one page of tasks.
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data as DashboardSummary,
  });

  // Separate, small "recent tasks" preview list — this one IS fine to
  // paginate, since it's a preview table, not a source of counts.
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "dashboard-preview"],
    queryFn: async () => (await api.get("/tasks?page=1&limit=10")).data.data as Paginated<Task>,
  });

  const { data: activity } = useQuery({
    queryKey: ["activity", "recent"],
    queryFn: async () => (await api.get("/activity/recent?limit=20")).data.data as ActivityItem[],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          {user?.role === "ADMIN" && "Admin Dashboard"}
          {user?.role === "PROJECT_MANAGER" && "Project Manager Dashboard"}
          {user?.role === "DEVELOPER" && "My Dashboard"}
        </h1>
        <p className="text-sm text-slate-400">Welcome back, {user?.name}.</p>
      </div>

      {summaryLoading ? (
        <LoadingSkeleton rows={1} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label={user?.role === "DEVELOPER" ? "My Tasks" : "Total Tasks"}
            value={summary?.totalTasks ?? "—"}
          />
          <StatCard
            label={user?.role === "DEVELOPER" ? "My Projects" : "Total Projects"}
            value={summary?.totalProjects ?? "—"}
          />
          <StatCard label="Overdue" value={summary?.overdueCount ?? 0} />
          <StatCard label="In Review" value={summary?.tasksByStatus?.IN_REVIEW ?? 0} />
        </div>
      )}

      {/* PM-specific widgets: tasks by priority + upcoming due dates this week */}
      {user?.role === "PROJECT_MANAGER" && summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="Low" value={summary.tasksByPriority?.LOW ?? 0} />
          <StatCard label="Medium" value={summary.tasksByPriority?.MEDIUM ?? 0} />
          <StatCard label="High" value={summary.tasksByPriority?.HIGH ?? 0} />
          <StatCard label="Critical" value={summary.tasksByPriority?.CRITICAL ?? 0} />
          <StatCard label="Due This Week" value={summary.upcomingDueThisWeek ?? 0} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">
            {user?.role === "DEVELOPER" ? "My Tasks" : "Recent Tasks"}
          </h2>
          {tasksLoading ? <LoadingSkeleton /> : <TaskTable tasks={tasksData?.items ?? []} />}
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Live Activity</h2>
          <ActivityFeed items={activity ?? []} />
        </div>
      </div>
    </div>
  );
}