import { Queue, Worker } from "bullmq";
import { env } from "../config/env";
import { runOverdueCheck } from "./overdueJob";

// Alternative scheduler used when BULLMQ_ENABLED=true. Kept isolated so the
// default (node-cron) path has zero Redis dependency — see README for why
// BullMQ is preferred in a multi-instance production deployment (a single
// leader runs the repeatable job instead of every instance double-processing).
const connection = { url: env.redisUrl };

export function startOverdueQueue() {
  const queue = new Queue("check-overdue-tasks", { connection });
  queue.add(
    "check-overdue-tasks",
    {},
    { repeat: { every: 60_000 }, removeOnComplete: true, removeOnFail: 50 }
  );

  new Worker(
    "check-overdue-tasks",
    async () => {
      await runOverdueCheck();
    },
    { connection }
  );

  // eslint-disable-next-line no-console
  console.log("[overdue-job] scheduled via BullMQ (every 60s)");
}
