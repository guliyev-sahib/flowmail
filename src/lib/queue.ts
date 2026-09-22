import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

/**
 * BullMQ queue for scheduled flow steps. A delayed job is enqueued when a cart
 * is abandoned; the worker (src/worker.ts) processes it at the right time.
 */

export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

export interface FlowStepJob {
  messageId: string; // the scheduled Message row to send
}

export const FLOW_QUEUE = "flow-steps";

export const flowQueue = new Queue<FlowStepJob>(FLOW_QUEUE, { connection });

/** Enqueue a flow step to fire after `delayMs`. */
export async function scheduleFlowStep(
  job: FlowStepJob,
  delayMs: number,
): Promise<void> {
  await flowQueue.add("send", job, {
    delay: Math.max(0, delayMs),
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
