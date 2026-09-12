import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Project, Task, ActivityItem } from "../types";
import { TaskTable } from "../components/TaskTable";
import { ActivityFeed } from "../components/ActivityFeed";
import { LoadingSkeleton, ErrorState } from "../components/States";
import { socketService } from "../services/socket";
import { useAuthStore } from "../store/authStore";
import { Plus } from "lucide-react";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data.data as Project,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", { projectId }],
    queryFn: async () => (await api.get(`/tasks?projectId=${projectId}&limit=100`)).data.data as { items: Task[] },
    enabled: !!project,
  });

  const { data: activity } = useQuery({
    queryKey: ["activity", "project", projectId],
    queryFn: async () => (await api.get(`/activity/recent?limit=20`)).data.data as ActivityItem[],
    enabled: !!project,
    select: (items) => items.filter((a) => a.projectId === projectId),
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: any) => api.post("/tasks", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreateTask(false);
    },
  });

  // Join the project's socket room so activity for THIS project streams in
  // live — server re-verifies access before allowing the join.
  useEffect(() => {
    if (!projectId) return;
    socketService.joinProject(projectId);
    return () => socketService.leaveProject(projectId);
  }, [projectId]);

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (isError || !project) return <ErrorState message="Project not found or you don't have access to it." />;

  const canManage = user?.role === "ADMIN" || (user?.role === "PROJECT_MANAGER" && project.createdById === user.id);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{project.description}</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Create Task
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-400">Client</p>
            <p className="font-medium text-slate-700">{project.client?.company}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Project Manager</p>
            <p className="font-medium text-slate-700">{project.createdBy?.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Tasks</p>
            <p className="font-medium text-slate-700">{project._count?.tasks ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Tasks</h2>
          <TaskTable tasks={tasksData?.items ?? []} showProject={false} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Live Activity</h2>
          <ActivityFeed items={activity ?? []} />
        </div>
      </div>

      {showCreateTask && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">New Task</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                createTaskMutation.mutate({
                  projectId,
                  title: String(form.get("title")),
                  description: String(form.get("description") ?? ""),
                  priority: String(form.get("priority")),
                  dueDate: form.get("dueDate") ? new Date(String(form.get("dueDate"))).toISOString() : undefined,
                });
              }}
              className="space-y-3"
            >
              <input name="title" required placeholder="Task title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea name="description" placeholder="Description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select name="priority" defaultValue="MEDIUM" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <input name="dueDate" type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateTask(false)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
