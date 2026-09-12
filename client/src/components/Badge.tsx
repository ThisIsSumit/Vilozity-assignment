import { Priority, TaskStatus } from "../types";

const statusStyles: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  DONE: "bg-emerald-100 text-emerald-700",
};

const statusLabel: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

const priorityStyles: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyles[priority]}`}>
      {priority !== "LOW" && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            priority === "CRITICAL" ? "bg-red-500" : priority === "HIGH" ? "bg-orange-500" : "bg-sky-500"
          }`}
        />
      )}
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export function OverdueBadge({ isOverdue }: { isOverdue: boolean }) {
  if (!isOverdue) return <span className="text-slate-300">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
      Overdue
    </span>
  );
}
