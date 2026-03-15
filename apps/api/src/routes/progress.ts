import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { progressLogs, memorizationGoals } from '../db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

const logSchema = z.object({
  goalId: z.string().uuid(),
  unitsLogged: z.number().min(0),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  note: z.string().max(500).optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function calcCurrentStreak(logDates: string[]): number {
  if (logDates.length === 0) return 0;
  const dateSet = new Set(logDates);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(subDays(today, 1));
  const startDate = dateSet.has(todayStr) ? today : dateSet.has(yesterdayStr) ? subDays(today, 1) : null;
  if (!startDate) return 0;
  let streak = 0;
  let cur = new Date(startDate);
  while (dateSet.has(toDateStr(cur))) { streak++; cur = subDays(cur, 1); }
  return streak;
}

function calcLongestStreak(logDates: string[]): number {
  if (logDates.length === 0) return 0;
  const sorted = [...logDates].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
    if (diff === 1) { current++; if (current > longest) longest = current; }
    else if (diff > 1) current = 1;
  }
  return longest;
}

// ── Routes ──────────────────────────────────────────────────────────

export const progressRoutes: FastifyPluginAsync = async (app) => {
  // POST /progress — log a day (upsert)
  app.post('/', async (req, reply) => {
    const userId = req.user!.sub;
    const body = logSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten().fieldErrors });

    const [goal] = await db
      .select({ id: memorizationGoals.id })
      .from(memorizationGoals)
      .where(and(eq(memorizationGoals.id, body.data.goalId), eq(memorizationGoals.userId, userId)));
    if (!goal) return reply.code(404).send({ error: 'Goal not found' });

    const [log] = await db
      .insert(progressLogs)
      .values({
        userId,
        goalId: body.data.goalId,
        unitsLogged: String(body.data.unitsLogged),
        logDate: body.data.logDate,
        note: body.data.note ?? null,
      })
      .onConflictDoUpdate({
        target: [progressLogs.userId, progressLogs.logDate],
        set: {
          unitsLogged: sql`excluded.units_logged`,
          note: sql`excluded.note`,
          goalId: sql`excluded.goal_id`,
        },
      })
      .returning();

    return reply.code(201).send({ log: serializeLog(log) });
  });

  // GET /progress
  app.get('/', async (req, reply) => {
    const userId = req.user!.sub;
    const query = req.query as { from?: string; to?: string };
    const conditions = [eq(progressLogs.userId, userId)];
    if (query.from) conditions.push(gte(progressLogs.logDate, query.from));
    if (query.to) conditions.push(lte(progressLogs.logDate, query.to));

    const logs = await db
      .select()
      .from(progressLogs)
      .where(and(...conditions))
      .orderBy(desc(progressLogs.logDate));

    return reply.send({ logs: logs.map(serializeLog) });
  });

  // GET /progress/stats
  app.get('/stats', async (req, reply) => {
    const userId = req.user!.sub;

    const [goal] = await db
      .select()
      .from(memorizationGoals)
      .where(and(eq(memorizationGoals.userId, userId), eq(memorizationGoals.isActive, true)));

    if (!goal) return reply.send({ stats: null });

    const allLogs = await db
      .select({ logDate: progressLogs.logDate, unitsLogged: progressLogs.unitsLogged })
      .from(progressLogs)
      .where(eq(progressLogs.goalId, goal.id))
      .orderBy(desc(progressLogs.logDate));

    const logDates = allLogs.map((l) => l.logDate);
    const totalLogged = allLogs.reduce((s, l) => s + parseFloat(l.unitsLogged), 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const logMap = new Map(allLogs.map((l) => [l.logDate, parseFloat(l.unitsLogged)]));

    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const d = toDateStr(subDays(today, 6 - i));
      return { date: d, units: logMap.get(d) ?? 0 };
    });

    const weeklyTotal = weeklyData.reduce((s, d) => s + d.units, 0);
    const todayEntry = logMap.get(toDateStr(today));

    return reply.send({
      stats: {
        currentStreak: calcCurrentStreak(logDates),
        longestStreak: calcLongestStreak(logDates),
        weeklyTotal: Math.round(weeklyTotal * 100) / 100,
        weeklyAvg: Math.round((weeklyTotal / 7) * 100) / 100,
        totalLogged: Math.round(totalLogged * 100) / 100,
        todayLogged: todayEntry ?? null,
        weeklyData,
        goal: {
          id: goal.id,
          unit: goal.unit,
          totalUnits: parseFloat(goal.totalUnits),
          dailyTarget: parseFloat(goal.dailyTarget),
        },
      },
    });
  });

  // PUT /progress/set-position — set the running total directly
  app.put('/set-position', async (req, reply) => {
    const userId = req.user!.sub;
    const body = z.object({ total: z.number().min(0) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid total' });

    const [goal] = await db
      .select()
      .from(memorizationGoals)
      .where(and(eq(memorizationGoals.userId, userId), eq(memorizationGoals.isActive, true)));
    if (!goal) return reply.code(404).send({ error: 'No active goal' });

    const today = toDateStr(new Date());

    const allLogs = await db
      .select({ logDate: progressLogs.logDate, unitsLogged: progressLogs.unitsLogged })
      .from(progressLogs)
      .where(and(eq(progressLogs.goalId, goal.id), eq(progressLogs.userId, userId)));

    const todayLog = allLogs.find((l) => l.logDate === today);
    const prevTotal =
      allLogs.reduce((s, l) => s + parseFloat(l.unitsLogged), 0) -
      (todayLog ? parseFloat(todayLog.unitsLogged) : 0);

    const newTodayUnits = Math.max(0, body.data.total - prevTotal);

    await db
      .insert(progressLogs)
      .values({ userId, goalId: goal.id, unitsLogged: String(newTodayUnits), logDate: today })
      .onConflictDoUpdate({
        target: [progressLogs.userId, progressLogs.logDate],
        set: {
          unitsLogged: sql`excluded.units_logged`,
          goalId: sql`excluded.goal_id`,
        },
      });

    return reply.send({ total: body.data.total });
  });

  // GET /progress/forecast
  app.get('/forecast', async (req, reply) => {
    const userId = req.user!.sub;

    const [goal] = await db
      .select()
      .from(memorizationGoals)
      .where(and(eq(memorizationGoals.userId, userId), eq(memorizationGoals.isActive, true)));

    if (!goal) return reply.send({ forecast: null });

    const allLogs = await db
      .select({ unitsLogged: progressLogs.unitsLogged, logDate: progressLogs.logDate })
      .from(progressLogs)
      .where(eq(progressLogs.goalId, goal.id));

    const totalLogged = allLogs.reduce((s, l) => s + parseFloat(l.unitsLogged), 0);
    const goalTotal = parseFloat(goal.totalUnits);
    const remaining = Math.max(0, goalTotal - totalLogged);

    const distinctDaysLogged = new Set(allLogs.map((l) => l.logDate)).size;
    const dailyAvg = distinctDaysLogged >= 7
      ? Math.round((totalLogged / distinctDaysLogged) * 100) / 100
      : parseFloat(goal.dailyTarget);

    let projectedDate: string | null = null;
    let daysLeft: number | null = null;
    if (remaining === 0) {
      projectedDate = toDateStr(new Date());
      daysLeft = 0;
    } else if (dailyAvg > 0) {
      daysLeft = Math.ceil(remaining / dailyAvg);
      projectedDate = toDateStr(addDays(new Date(), daysLeft));
    }

    return reply.send({
      forecast: {
        projectedDate,
        daysLeft,
        dailyAvg,
        totalLogged: Math.round(totalLogged * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        totalUnits: goalTotal,
        unit: goal.unit,
      },
    });
  });
};

function serializeLog(log: Record<string, any>) {
  return { ...log, unitsLogged: parseFloat(log.unitsLogged) };
}
