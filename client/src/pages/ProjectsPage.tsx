import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Project, Client, Paginated } from "../types";
import { LoadingSkeleton, EmptyState } from "../components/States";

export default function ProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page: 1 }],
    queryFn: async () => (await api.get("/projects?page=1&limit=50")).data.data as Paginated<Project>,
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data.data as Client[],
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string; clientId: string }) =>
      api.post("/projects", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
    },
  });

  const canCreate = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Projects</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        )}
      </div>

      {isLoading && <LoadingSkeleton />}
      {!isLoading && !data?.items.length && <EmptyState title="No projects yet" />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-semibold text-slate-800">{p.name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>{p.client?.company}</span>
              <span>{p._count?.tasks ?? 0} tasks</span>
            </div>
          </Link>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">New Project</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                createMutation.mutate({
                  name: String(form.get("name")),
                  description: String(form.get("description") ?? ""),
                  clientId: String(form.get("clientId")),
                });
              }}
              className="space-y-3"
            >
              <input name="name" required placeholder="Project name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea name="description" placeholder="Description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select name="clientId" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select client…</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
              {createMutation.isError && <p className="text-sm text-red-600">Could not create project.</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
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
