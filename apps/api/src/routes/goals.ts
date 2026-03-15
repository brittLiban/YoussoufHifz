import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { memorizationGoals } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const unitAmount = () => z.number().min(0);

const createGoalSchema = z.object({
  unit: z.enum(['ayah', 'page', 'line', 'surah', 'juz']),
  startReference: z.record(z.unknown()),
  targetReference: z.record(z.unknown()),
  totalUnits: unitAmount(),
  dailyTarget: unitAmount(),
});

const updateGoalSchema = createGoalSchema.partial();

export const goalsRoutes: FastifyPluginAsync = async (app) => {
  // POST /goals
  app.post('/', async (req, reply) => {
    const userId = req.user!.sub;
    const body = createGoalSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    await db
      .update(memorizationGoals)
      .set({ isActive: false })
      .where(and(eq(memorizationGoals.userId, userId), eq(memorizationGoals.isActive, true)));

    const [goal] = await db
      .insert(memorizationGoals)
      .values({
        userId,
        unit: body.data.unit,
        startReference: body.data.startReference,
        targetReference: body.data.targetReference,
        totalUnits: String(body.data.totalUnits),
        dailyTarget: String(body.data.dailyTarget),
        isActive: true,
      })
      .returning();

    return reply.code(201).send({ goal: serializeGoal(goal) });
  });

  // GET /goals/active
  app.get('/active', async (req, reply) => {
    const userId = req.user!.sub;
    const [goal] = await db
      .select()
      .from(memorizationGoals)
      .where(and(eq(memorizationGoals.userId, userId), eq(memorizationGoals.isActive, true)));

    return reply.send({ goal: goal ? serializeGoal(goal) : null });
  });

  // PUT /goals/:id
  app.put('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateGoalSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    const updates: Record<string, unknown> = {};
    if (body.data.unit !== undefined) updates.unit = body.data.unit;
    if (body.data.totalUnits !== undefined) updates.totalUnits = String(body.data.totalUnits);
    if (body.data.dailyTarget !== undefined) updates.dailyTarget = String(body.data.dailyTarget);

    const [goal] = await db
      .update(memorizationGoals)
      .set(updates as any)
      .where(and(eq(memorizationGoals.id, id), eq(memorizationGoals.userId, userId)))
      .returning();

    if (!goal) return reply.code(404).send({ error: 'Goal not found' });
    return reply.send({ goal: serializeGoal(goal) });
  });
};

function serializeGoal(goal: Record<string, any>) {
  return {
    ...goal,
    totalUnits: parseFloat(goal.totalUnits),
    dailyTarget: parseFloat(goal.dailyTarget),
  };
}
