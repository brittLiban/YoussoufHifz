/**
 * Worker process — runs background jobs separately from the API server.
 *
 * Handles:
 *  - Subcis audio compilation (ffmpeg, triggered by POST /subcis/:id/compile)
 *  - Daily reminder cron (push notifications to users with active goals)
 *
 * Runs in its own Docker container (see docker-compose.yml: worker service).
 * Shares the same image as the API but starts with: node dist/worker.js
 */

import 'dotenv/config';
import { Worker, Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// BullMQ manages its own ioredis connection — pass URL string, not an IORedis instance.
function redisOpts() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null as null, // required by BullMQ
  };
}

// ── Subcis compilation worker ─────────────────────────────────────────────────

const subcisWorker = new Worker(
  'subcis-compile',
  async (job) => {
    const { cycleId } = job.data as { cycleId: string };
    console.log(`[worker] subcis-compile: starting job for cycle ${cycleId}`);
    const { compileSubcisCycle } = await import('./workers/subcisCompiler.js');
    await compileSubcisCycle(cycleId);
    console.log(`[worker] subcis-compile: done for cycle ${cycleId}`);
  },
  { connection: redisOpts(), concurrency: 2 }
);

subcisWorker.on('failed', (job, err) => {
  console.error(`[worker] subcis-compile job ${job?.id} failed:`, err.message);
});

// ── Daily reminder cron ───────────────────────────────────────────────────────

const reminderQueue = new Queue('reminders', { connection: redisOpts() });

// BullMQ deduplicates by jobId so re-deploying won't create duplicates
reminderQueue.add(
  'daily-reminder',
  {},
  {
    repeat: { pattern: '0 17 * * *' }, // 5 PM UTC daily
    jobId: 'daily-reminder-cron',
  }
).catch((err: Error) => console.error('[worker] failed to schedule cron:', err.message));

const reminderWorker = new Worker(
  'reminders',
  async (job) => {
    if (job.name === 'daily-reminder') {
      const { sendDailyReminders } = await import('./workers/reminderCron.js');
      await sendDailyReminders();
    }
  },
  { connection: redisOpts() }
);

reminderWorker.on('failed', (job, err) => {
  console.error(`[worker] reminder job ${job?.id} failed:`, err.message);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown() {
  console.log('[worker] shutting down...');
  await subcisWorker.close();
  await reminderWorker.close();
  await reminderQueue.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[worker] started — listening for jobs');
