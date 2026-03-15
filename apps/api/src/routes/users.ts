import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const pushTokenSchema = z.object({
  token: z.string().min(1),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // GET /users/me
  app.get('/me', async (req, reply) => {
    const userId = req.user!.sub;
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.send({ user });
  });

  // PUT /users/me
  app.put('/me', async (req, reply) => {
    const userId = req.user!.sub;
    const body = updateProfileSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.displayName !== undefined) updates.displayName = body.data.displayName;
    if (body.data.avatarUrl !== undefined) updates.avatarUrl = body.data.avatarUrl;

    const [user] = await db
      .update(users)
      .set(updates as any)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
      });

    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.send({ user });
  });

  // PUT /users/me/push-token
  app.put('/me/push-token', async (req, reply) => {
    const userId = req.user!.sub;
    const body = pushTokenSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'token is required' });
    }

    await db
      .update(users)
      .set({ expoPushToken: body.data.token, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return reply.code(204).send();
  });
};
