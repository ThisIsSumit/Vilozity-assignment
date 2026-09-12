import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Task, Paginated } from "../types";
import { TaskTable } from "../components/TaskTable";
import { LoadingSkeleton } from "../components/States";

// Filters live in the URL (status, priority, and due-date range): refreshing
// or sharing this URL preserves the exact filtered/paginated view, and the
// request is built straight from searchParams so there is one source of
// truth — no separate "filter state" that could drift out of sync with
// what's actually in the address bar.
export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const page = Number(searchParams.get("page") ?? 1);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", { status, priority, from, to, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      params.set("page", String(page));
      params.set("limit", "20");
      return (await api.get(`/tasks?${params.toString()}`)).data.data as Paginated<Task>;
    },
  });

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>

      <div className="flex flex-wrap items-end gap-3">
        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>
        <select
          value={priority}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <label className="flex flex-col text-xs text-slate-500">
          Due from
          <input
            type="date"
            value={from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs text-slate-500">
          Due to
          <input
            type="date"
            value={to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        {(status || priority || from || to) && (
          <button
            onClick={() => setSearchParams({})}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? <LoadingSkeleton rows={8} /> : <TaskTable tasks={data?.items ?? []} />}

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} · {data.total} tasks
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => updateFilter("page", String(page + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}