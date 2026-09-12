import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Task, TaskStatus } from "../types";
import { StatusBadge, PriorityBadge, OverdueBadge } from "../components/Badge";
import { LoadingSkeleton, ErrorState } from "../components/States";
import { shortDate } from "../lib/format";
import { useAuthStore } from "../store/authStore";

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: task, isLoading, isError } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}`)).data.data as Task,
  });

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (isError || !task) return <ErrorState message="Task not found or you don't have access to it." />;

  const canChangeStatus =
    user?.role === "ADMIN" ||
    (user?.role === "PROJECT_MANAGER" && task.project.createdById === user.id) ||
    (user?.role === "DEVELOPER" && task.assignedDeveloperId === user.id);

  return (
    <div className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          <span className="text-slate-400">#{task.number}</span> {task.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{task.description || "No description provided."}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        <OverdueBadge isOverdue={task.isOverdue} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-400">Project</p>
          <p className="font-medium text-slate-700">{task.project.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Developer</p>
          <p className="font-medium text-slate-700">{task.assignedDeveloper?.name ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Due Date</p>
          <p className="font-medium text-slate-700">{shortDate(task.dueDate)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Updated</p>
          <p className="font-medium text-slate-700">{shortDate(task.updatedAt)}</p>
        </div>
      </div>

      {canChangeStatus && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Change Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                disabled={s === task.status || statusMutation.isPending}
                onClick={() => statusMutation.mutate(s)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}