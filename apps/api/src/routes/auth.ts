import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(80),
  role: z.enum(['student', 'teacher', 'both', 'parent']).default('student'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/register
  app.post('/register', async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    const { email, password, displayName, role } = body.data;

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, displayName, role })
      .returning();

    const tokens = await issueTokenPair(user.id, user.email, user.role);

    return reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      ...tokens,
    });
  });

  // POST /auth/login
  app.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    const { email, password } = body.data;
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const tokens = await issueTokenPair(user.id, user.email, user.role);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      ...tokens,
    });
  });

  // POST /auth/refresh
  app.post('/refresh', async (req, reply) => {
    const body = refreshSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'refreshToken is required' });
    }

    try {
      const tokens = await rotateRefreshToken(body.data.refreshToken);
      return reply.send(tokens);
    } catch (err: any) {
      return reply.code(401).send({ error: err.message });
    }
  });

  // POST /auth/logout
  app.post('/logout', async (req, reply) => {
    const body = logoutSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'refreshToken is required' });
    }

    // Best-effort revoke — don't expose errors to client
    const userId = (req as any).user?.sub;
    if (userId) {
      await revokeRefreshToken(userId, body.data.refreshToken);
    }

    return reply.code(204).send();
  });
};
