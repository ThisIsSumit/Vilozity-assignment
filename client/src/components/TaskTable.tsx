import { Link } from "react-router-dom";
import { Task } from "../types";
import { StatusBadge, PriorityBadge, OverdueBadge } from "./Badge";
import { shortDate } from "../lib/format";
import { EmptyState } from "./States";

export function TaskTable({ tasks, showProject = true }: { tasks: Task[]; showProject?: boolean }) {
  if (!tasks.length) return <EmptyState title="No tasks" subtitle="Nothing matches the current filters." />;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Task</th>
            {showProject && <th className="px-4 py-3">Project</th>}
            <th className="px-4 py-3">Developer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Overdue</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">
                <Link to={`/tasks/${t.id}`} className="hover:text-brand-600 hover:underline">
                  <span className="text-slate-400">#{t.number}</span> {t.title}
                </Link>
              </td>
              {showProject && (
                <td className="px-4 py-3">
                  <Link to={`/projects/${t.projectId}`} className="text-slate-500 hover:text-brand-600 hover:underline">
                    {t.project?.name}
                  </Link>
                </td>
              )}
              <td className="px-4 py-3 text-slate-500">{t.assignedDeveloper?.name ?? "Unassigned"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={t.priority} />
              </td>
              <td className="px-4 py-3 text-slate-500">{shortDate(t.dueDate)}</td>
              <td className="px-4 py-3">
                <OverdueBadge isOverdue={t.isOverdue} />
              </td>
              <td className="px-4 py-3 text-slate-400">{shortDate(t.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}