import { Worker } from "bullmq";
import { connection, FLOW_QUEUE, type FlowStepJob } from "@/lib/queue";
import { processScheduledMessage } from "@/lib/flows";

/**
 * Background worker. Run alongside the web app: `npm run worker`.
 * Processes delayed flow-step jobs and sends the scheduled emails.
 */
const worker = new Worker<FlowStepJob>(
  FLOW_QUEUE,
  async (job) => {
    await processScheduledMessage(job.data.messageId);
  },
  { connection, concurrency: 5 },
);

worker.on("completed", (job) => {
  console.log(`[worker] sent message job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

console.log("[worker] Flowmail worker started, waiting for jobs...");
