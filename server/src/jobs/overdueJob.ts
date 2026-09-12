import cron from "node-cron";
import { taskRepository } from "../repositories/taskRepository";
import { env } from "../config/env";

// Overdue detection MUST happen on a schedule, not on page load, so a task
// becomes overdue for every viewer at the same time regardless of who (if
// anyone) has the page open.
//
// We use node-cron here by default (zero extra infra). If BULLMQ_ENABLED=true
// the same logic can be scheduled as a BullMQ repeatable job instead — see
// README "Why node-cron / BullMQ" for the trade-off discussion. Both paths
// call the same `runOverdueCheck` so behavior is identical either way.
export async function runOverdueCheck() {
  const now = new Date();
  try {
    const candidates = await taskRepository.findOverdueCandidates(now);
    if (candidates.length === 0) return;
    await taskRepository.markOverdue(candidates.map((t: { id: string }) => t.id));
    // eslint-disable-next-line no-console
    console.log(`[overdue-job] flagged ${candidates.length} task(s) as overdue at ${now.toISOString()}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[overdue-job] failed:", err);
  }
}

export function startOverdueJob() {
  if (env.bullmqEnabled) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startOverdueQueue } = require("./overdueQueue");
    startOverdueQueue();
    return;
  }
  // Runs every minute — frequent enough that "overdue" reflects reality
  // within a minute, cheap enough (single indexed WHERE query) to not matter.
  cron.schedule("* * * * *", runOverdueCheck);
  // eslint-disable-next-line no-console
  console.log("[overdue-job] scheduled via node-cron (every minute)");
}
