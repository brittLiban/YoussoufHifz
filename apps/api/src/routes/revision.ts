import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { revisionPortions, revisionLogs, surahRevisions, memorizationGoals, progressLogs } from '../db/schema';
import { eq, and, desc, max, count, sql } from 'drizzle-orm';

// Surah page starts (Madinah Mushaf) for page→surah conversion
const SURAH_PAGE_STARTS: { id: number; pageStart: number }[] = [
  {id:1,pageStart:1},{id:2,pageStart:2},{id:3,pageStart:50},{id:4,pageStart:77},{id:5,pageStart:106},
  {id:6,pageStart:128},{id:7,pageStart:151},{id:8,pageStart:177},{id:9,pageStart:187},{id:10,pageStart:208},
  {id:11,pageStart:221},{id:12,pageStart:235},{id:13,pageStart:249},{id:14,pageStart:255},{id:15,pageStart:262},
  {id:16,pageStart:267},{id:17,pageStart:282},{id:18,pageStart:293},{id:19,pageStart:305},{id:20,pageStart:312},
  {id:21,pageStart:322},{id:22,pageStart:332},{id:23,pageStart:342},{id:24,pageStart:350},{id:25,pageStart:359},
  {id:26,pageStart:367},{id:27,pageStart:377},{id:28,pageStart:385},{id:29,pageStart:396},{id:30,pageStart:404},
  {id:31,pageStart:411},{id:32,pageStart:415},{id:33,pageStart:418},{id:34,pageStart:428},{id:35,pageStart:434},
  {id:36,pageStart:440},{id:37,pageStart:446},{id:38,pageStart:453},{id:39,pageStart:458},{id:40,pageStart:467},
  {id:41,pageStart:477},{id:42,pageStart:483},{id:43,pageStart:489},{id:44,pageStart:496},{id:45,pageStart:499},
  {id:46,pageStart:502},{id:47,pageStart:507},{id:48,pageStart:511},{id:49,pageStart:515},{id:50,pageStart:518},
  {id:51,pageStart:520},{id:52,pageStart:523},{id:53,pageStart:526},{id:54,pageStart:528},{id:55,pageStart:531},
  {id:56,pageStart:534},{id:57,pageStart:537},{id:58,pageStart:542},{id:59,pageStart:545},{id:60,pageStart:549},
  {id:61,pageStart:551},{id:62,pageStart:553},{id:63,pageStart:554},{id:64,pageStart:556},{id:65,pageStart:558},
  {id:66,pageStart:560},{id:67,pageStart:562},{id:68,pageStart:564},{id:69,pageStart:566},{id:70,pageStart:568},
  {id:71,pageStart:570},{id:72,pageStart:572},{id:73,pageStart:574},{id:74,pageStart:575},{id:75,pageStart:577},
  {id:76,pageStart:578},{id:77,pageStart:580},{id:78,pageStart:582},{id:79,pageStart:583},{id:80,pageStart:585},
  {id:81,pageStart:586},{id:82,pageStart:587},{id:83,pageStart:587},{id:84,pageStart:589},{id:85,pageStart:590},
  {id:86,pageStart:591},{id:87,pageStart:591},{id:88,pageStart:592},{id:89,pageStart:593},{id:90,pageStart:594},
  {id:91,pageStart:595},{id:92,pageStart:595},{id:93,pageStart:596},{id:94,pageStart:596},{id:95,pageStart:597},
  {id:96,pageStart:597},{id:97,pageStart:598},{id:98,pageStart:598},{id:99,pageStart:599},{id:100,pageStart:599},
  {id:101,pageStart:600},{id:102,pageStart:600},{id:103,pageStart:601},{id:104,pageStart:601},{id:105,pageStart:601},
  {id:106,pageStart:602},{id:107,pageStart:602},{id:108,pageStart:602},{id:109,pageStart:603},{id:110,pageStart:603},
  {id:111,pageStart:603},{id:112,pageStart:604},{id:113,pageStart:604},{id:114,pageStart:604},
];

// Strength thresholds (days since last revision)
export type RevisionStrength = 'strong' | 'good' | 'review' | 'weak' | 'critical';

function getStrength(daysSinceLast: number | null): RevisionStrength {
  if (daysSinceLast === null) return 'critical';
  if (daysSinceLast <= 6) return 'strong';
  if (daysSinceLast <= 13) return 'good';
  if (daysSinceLast <= 20) return 'review';
  if (daysSinceLast <= 30) return 'weak';
  return 'critical';
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Attach last-revised data to a list of portions
async function withStrength(portions: typeof revisionPortions.$inferSelect[]) {
  if (portions.length === 0) return [];

  // Fetch the most recent log for each portion
  const results = await Promise.all(
    portions.map(async (p) => {
      const [latest] = await db
        .select({ logDate: revisionLogs.logDate })
        .from(revisionLogs)
        .where(eq(revisionLogs.portionId, p.id))
        .orderBy(desc(revisionLogs.logDate))
        .limit(1);

      const lastRevised = latest?.logDate ?? null;
      const days = daysSince(lastRevised);
      const strength = getStrength(days);
      const revisedToday = lastRevised === todayStr();

      return {
        id: p.id,
        label: p.label,
        portionType: p.portionType ?? 'custom',
        surahStart: p.surahStart ?? null,
        surahEnd: p.surahEnd ?? null,
        pageStartRef: p.pageStartRef ?? null,
        pageEndRef: p.pageEndRef ?? null,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt,
        lastRevised,
        daysSinceRevision: days,
        strength,
        revisedToday,
      };
    })
  );

  // Sort: critical first, then by days desc
  const strengthOrder: Record<RevisionStrength, number> = {
    critical: 0, weak: 1, review: 2, good: 3, strong: 4,
  };
  return results.sort((a, b) => {
    if (a.revisedToday !== b.revisedToday) return a.revisedToday ? 1 : -1;
    return strengthOrder[a.strength] - strengthOrder[b.strength];
  });
}

export const revisionRoutes: FastifyPluginAsync = async (app) => {
  // GET /revision/portions
  app.get('/portions', async (req, reply) => {
    const userId = req.user!.sub;
    const portions = await db
      .select()
      .from(revisionPortions)
      .where(and(eq(revisionPortions.userId, userId), eq(revisionPortions.isActive, true)))
      .orderBy(revisionPortions.sortOrder, revisionPortions.createdAt);

    return reply.send({ portions: await withStrength(portions) });
  });

  // POST /revision/portions
  app.post('/portions', async (req, reply) => {
    const userId = req.user!.sub;
    const body = z.object({
      label: z.string().min(1).max(150),
      portionType: z.enum(['surah_range', 'page_range', 'custom']).optional().default('custom'),
      surahStart: z.number().int().min(1).max(114).optional().nullable(),
      surahEnd: z.number().int().min(1).max(114).optional().nullable(),
      pageStartRef: z.number().int().min(1).max(604).optional().nullable(),
      pageEndRef: z.number().int().min(1).max(604).optional().nullable(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten().fieldErrors });

    const existing = await db
      .select({ sortOrder: revisionPortions.sortOrder })
      .from(revisionPortions)
      .where(and(eq(revisionPortions.userId, userId), eq(revisionPortions.isActive, true)));
    const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder), -1);

    const [portion] = await db
      .insert(revisionPortions)
      .values({
        userId,
        label: body.data.label,
        portionType: body.data.portionType,
        surahStart: body.data.surahStart ?? null,
        surahEnd: body.data.surahEnd ?? null,
        pageStartRef: body.data.pageStartRef ?? null,
        pageEndRef: body.data.pageEndRef ?? null,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return reply.code(201).send({
      portion: {
        ...portion,
        lastRevised: null,
        daysSinceRevision: null,
        strength: 'critical' as RevisionStrength,
        revisedToday: false,
      },
    });
  });

  // PUT /revision/portions/:id — rename
  app.put('/portions/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = z.object({ label: z.string().min(1).max(100) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten().fieldErrors });

    const [portion] = await db
      .update(revisionPortions)
      .set({ label: body.data.label })
      .where(and(eq(revisionPortions.id, id), eq(revisionPortions.userId, userId)))
      .returning();

    if (!portion) return reply.code(404).send({ error: 'Portion not found' });
    return reply.send({ portion });
  });

  // DELETE /revision/portions/:id — soft delete
  app.delete('/portions/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const [portion] = await db
      .update(revisionPortions)
      .set({ isActive: false })
      .where(and(eq(revisionPortions.id, id), eq(revisionPortions.userId, userId)))
      .returning();

    if (!portion) return reply.code(404).send({ error: 'Portion not found' });
    return reply.send({ ok: true });
  });

  // POST /revision/log/:portionId — mark as revised today (upsert)
  app.post('/log/:portionId', async (req, reply) => {
    const userId = req.user!.sub;
    const { portionId } = req.params as { portionId: string };
    const body = z.object({ note: z.string().max(250).optional() }).safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: body.error.flatten().fieldErrors });

    // Verify portion belongs to user
    const [portion] = await db
      .select()
      .from(revisionPortions)
      .where(and(eq(revisionPortions.id, portionId), eq(revisionPortions.userId, userId)));
    if (!portion) return reply.code(404).send({ error: 'Portion not found' });

    const today = todayStr();
    const [log] = await db
      .insert(revisionLogs)
      .values({ userId, portionId, logDate: today, note: body.data?.note ?? null })
      .onConflictDoNothing()
      .returning();

    return reply.code(201).send({ log: log ?? null, alreadyLogged: !log });
  });

  // DELETE /revision/log/:portionId — undo today's revision
  app.delete('/log/:portionId', async (req, reply) => {
    const userId = req.user!.sub;
    const { portionId } = req.params as { portionId: string };
    const today = todayStr();

    await db
      .delete(revisionLogs)
      .where(
        and(
          eq(revisionLogs.portionId, portionId),
          eq(revisionLogs.userId, userId),
          eq(revisionLogs.logDate, today)
        )
      );

    return reply.send({ ok: true });
  });

  // GET /revision/surahs — memorized surahs with revision stats
  app.get('/surahs', async (req, reply) => {
    const userId = req.user!.sub;

    // Get active goal
    const [goal] = await db
      .select()
      .from(memorizationGoals)
      .where(and(eq(memorizationGoals.userId, userId), eq(memorizationGoals.isActive, true)));

    if (!goal) return reply.send({ memorized: [], currentSurahId: null, totalMemorized: 0 });

    // Sum all logged units
    const logRows = await db
      .select({ unitsLogged: progressLogs.unitsLogged })
      .from(progressLogs)
      .where(eq(progressLogs.userId, userId));
    const totalLogged = logRows.reduce((s, r) => s + parseFloat(r.unitsLogged), 0);
    const totalFloor = Math.floor(totalLogged);

    // Compute memorized surah IDs based on unit (Nas→Baqarah direction)
    let memorizedIds: number[] = [];
    let currentSurahId: number | null = null;

    if (goal.unit === 'surah') {
      // Each unit = 1 surah, going 114 → 1
      for (let i = 114; i >= Math.max(1, 115 - totalFloor); i--) memorizedIds.push(i);
      currentSurahId = totalFloor > 0 ? Math.max(1, 114 - totalFloor) : null;
    } else if (goal.unit === 'page') {
      // Each unit = 1 page, going 604 → 1. A surah is memorized when its whole page range is covered.
      const coveredStart = Math.max(1, 605 - totalFloor); // first covered page (from back)
      for (let i = 0; i < SURAH_PAGE_STARTS.length; i++) {
        const s = SURAH_PAGE_STARTS[i];
        const nextPageStart = i < SURAH_PAGE_STARTS.length - 1 ? SURAH_PAGE_STARTS[i + 1].pageStart : 605;
        // Surah is fully covered if all its pages are in the covered range
        if (s.pageStart >= coveredStart) memorizedIds.push(s.id);
        else if (nextPageStart - 1 >= coveredStart) {
          // Partially covered — include as "in progress"
          currentSurahId = s.id;
        }
      }
      memorizedIds.sort((a, b) => b - a);
    } else if (goal.unit === 'juz') {
      // 1 unit = 1 juz (30 juz total), going juz 30 → 1
      const juzPageStarts = [1,22,42,62,82,102,121,142,162,182,201,221,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
      const coveredJuz = totalFloor;
      const coveredStartPage = coveredJuz > 0 ? juzPageStarts[30 - coveredJuz] : 605;
      for (let i = 0; i < SURAH_PAGE_STARTS.length; i++) {
        const s = SURAH_PAGE_STARTS[i];
        if (s.pageStart >= coveredStartPage) memorizedIds.push(s.id);
      }
      memorizedIds.sort((a, b) => b - a);
      if (coveredJuz < 30) {
        const nextJuzPage = juzPageStarts[30 - coveredJuz - 1] ?? 1;
        const s = SURAH_PAGE_STARTS.find(s => s.pageStart <= nextJuzPage)!;
        currentSurahId = s?.id ?? null;
      }
    }

    // Aggregate revision stats per surah
    const stats = await db
      .select({
        surahId: surahRevisions.surahId,
        lastDate: max(surahRevisions.logDate),
        revisionCount: count(),
      })
      .from(surahRevisions)
      .where(eq(surahRevisions.userId, userId))
      .groupBy(surahRevisions.surahId);

    const today = todayStr();
    const statsMap = new Map(stats.map(s => [s.surahId, s]));

    const memorized = memorizedIds.map((surahId) => {
      const stat = statsMap.get(surahId);
      const lastRevised = stat?.lastDate ?? null;
      const days = daysSince(lastRevised);
      return {
        surahId,
        revisionCount: stat ? Number(stat.revisionCount) : 0,
        lastRevised,
        daysSinceRevision: days,
        strength: getStrength(days),
        revisedToday: lastRevised === today,
      };
    });

    return reply.send({ memorized, currentSurahId, totalMemorized: memorizedIds.length });
  });

  // POST /revision/surahs/log — batch mark surahs as revised
  app.post('/surahs/log', async (req, reply) => {
    const userId = req.user!.sub;
    const body = z.object({
      surahIds: z.array(z.number().int().min(1).max(114)).min(1).max(50),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten().fieldErrors });

    const today = todayStr();
    const rows = body.data.surahIds.map((surahId) => ({ userId, surahId, logDate: today }));

    await db.insert(surahRevisions).values(rows).onConflictDoNothing();

    return reply.send({ logged: body.data.surahIds.length, date: today });
  });

  // DELETE /revision/surahs/log — undo today's revision for a surah
  app.delete('/surahs/log/:surahId', async (req, reply) => {
    const userId = req.user!.sub;
    const surahId = parseInt((req.params as { surahId: string }).surahId, 10);
    if (isNaN(surahId)) return reply.code(400).send({ error: 'Invalid surahId' });

    await db
      .delete(surahRevisions)
      .where(
        and(
          eq(surahRevisions.userId, userId),
          eq(surahRevisions.surahId, surahId),
          eq(surahRevisions.logDate, todayStr())
        )
      );

    return reply.send({ ok: true });
  });

  // GET /revision/portions/:id/history
  app.get('/portions/:id/history', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const [portion] = await db
      .select()
      .from(revisionPortions)
      .where(and(eq(revisionPortions.id, id), eq(revisionPortions.userId, userId)));
    if (!portion) return reply.code(404).send({ error: 'Portion not found' });

    const logs = await db
      .select({ id: revisionLogs.id, logDate: revisionLogs.logDate, note: revisionLogs.note, createdAt: revisionLogs.createdAt })
      .from(revisionLogs)
      .where(eq(revisionLogs.portionId, id))
      .orderBy(desc(revisionLogs.logDate));

    const totalRevisions = logs.length;
    const last30 = logs.filter((l) => {
      const d = daysSince(l.logDate);
      return d !== null && d <= 30;
    }).length;

    return reply.send({
      portion: {
        ...portion,
        totalRevisions,
        revisionsLast30Days: last30,
      },
      logs,
    });
  });
};

// Export for use in teacher routes — get a student's portions with strength
export async function getStudentRevisionPortions(studentId: string) {
  const portions = await db
    .select()
    .from(revisionPortions)
    .where(and(eq(revisionPortions.userId, studentId), eq(revisionPortions.isActive, true)))
    .orderBy(revisionPortions.sortOrder);
  return withStrength(portions);
}
