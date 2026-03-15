import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { authRoutes } from './routes/auth';
import { usersRoutes } from './routes/users';
import { goalsRoutes } from './routes/goals';
import { progressRoutes } from './routes/progress';
import { groupsRoutes } from './routes/groups';
import { teacherRoutes } from './routes/teacher';
import { subcisRoutes } from './routes/subcis';
import { notificationsRoutes } from './routes/notifications';
import { parentRoutes } from './routes/parent';
import { revisionRoutes } from './routes/revision';
import { authMiddleware } from './middleware/auth.middleware';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function build() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  // ── Plugins ──────────────────────────────────────────────
  await app.register(cors, {
    origin: true, // restrict in production to specific origins
    credentials: true,
  });

  await app.register(helmet, { global: true });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });

  await app.register(authMiddleware);

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — for audio uploads
  });

  // ── Routes ───────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usersRoutes, { prefix: '/users' });
  await app.register(goalsRoutes, { prefix: '/goals' });
  await app.register(progressRoutes, { prefix: '/progress' });
  await app.register(groupsRoutes, { prefix: '/groups' });
  await app.register(teacherRoutes, { prefix: '/groups' });
  await app.register(subcisRoutes, { prefix: '/subcis' });
  await app.register(notificationsRoutes, { prefix: '/notifications' });
  await app.register(parentRoutes, { prefix: '/parent' });
  await app.register(revisionRoutes, { prefix: '/revision' });

  // ── Health check ─────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return app;
}

async function start() {
  const app = await build();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🕌 Youssouf API running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
