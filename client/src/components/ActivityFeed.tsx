import { ActivityItem } from "../types";
import { relativeTime, exactTime } from "../lib/format";
import { EmptyState } from "./States";

const statusLabel: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <EmptyState title="No recent activity" />;

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.activityId} className="flex gap-3 rounded-lg border border-slate-100 bg-white p-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {a.userName?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">
              {/* Matches the spec's exact wording: "Ravi moved Task #12 from
                  In Progress → In Review". Task title shown as a secondary
                  detail rather than replacing the "#N" the format calls for. */}
              <span className="font-medium">{a.userName}</span> moved{" "}
              <span className="font-medium">
                Task #{a.taskNumber ?? "?"}
                {a.taskTitle ? ` (${a.taskTitle})` : ""}
              </span>{" "}
              from{" "}
              <span className="text-slate-500">{statusLabel[a.oldValue ?? ""] ?? a.oldValue}</span> →{" "}
              <span className="text-slate-500">{statusLabel[a.newValue ?? ""] ?? a.newValue}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400" title={exactTime(a.createdAt)}>
              {relativeTime(a.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}