import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import {
  groups,
  groupMemberships,
  users,
  memorizationGoals,
  progressLogs,
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// ── Helpers ────────────────────────────────────────────────────────

function generateInviteCode(): string {
  // Unambiguous characters (no 0/O, 1/I/L)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function calcStreak(logDates: string[]): number {
  if (!logDates.length) return 0;
  const dateSet = new Set(logDates);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayS = today.toISOString().slice(0, 10);
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const yesterdayS = yest.toISOString().slice(0, 10);
  if (!dateSet.has(todayS) && !dateSet.has(yesterdayS)) return 0;
  let streak = 0;
  const cur = new Date(dateSet.has(todayS) ? today : yest);
  while (dateSet.has(cur.toISOString().slice(0, 10))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

async function getMemberStats(userId: string) {
  const [goal] = await db
    .select()
    .from(memorizationGoals)
    .where(
      and(
        eq(memorizationGoals.userId, userId),
        eq(memorizationGoals.isActive, true)
      )
    );

  if (!goal) return { goal: null, streak: 0, percentComplete: 0, loggedToday: false, currentSurahId: null };

  const allLogs = await db
    .select({ logDate: progressLogs.logDate, unitsLogged: progressLogs.unitsLogged })
    .from(progressLogs)
    .where(eq(progressLogs.goalId, goal.id))
    .orderBy(desc(progressLogs.logDate));

  const totalLogged = allLogs.reduce((s, l) => s + parseFloat(l.unitsLogged), 0);
  const goalTotal = parseFloat(goal.totalUnits);
  const percentComplete = goalTotal > 0 ? Math.round((totalLogged / goalTotal) * 100) : 0;
  const loggedToday = allLogs.some((l) => l.logDate === todayStr());
  const streak = calcStreak(allLogs.map((l) => l.logDate));

  // currentSurahId — stored in startReference by the onboarding flow
  const ref = goal.startReference as Record<string, unknown>;
  const currentSurahId = typeof ref?.surahId === 'number' ? ref.surahId : null;

  return {
    goal: {
      unit: goal.unit,
      totalUnits: goalTotal,
      dailyTarget: parseFloat(goal.dailyTarget),
    },
    streak,
    percentComplete,
    loggedToday,
    currentSurahId,
  };
}

// ── Routes ─────────────────────────────────────────────────────────

export const groupsRoutes: FastifyPluginAsync = async (app) => {
  // POST /groups — create a group
  app.post('/', async (req, reply) => {
    const userId = req.user!.sub;
    const body = z
      .object({
        name: z.string().min(1).max(80),
        description: z.string().max(300).optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    // Generate a unique invite code
    let inviteCode = generateInviteCode();
    const [collision] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode));
    if (collision) inviteCode = generateInviteCode();

    const [group] = await db
      .insert(groups)
      .values({
        name: body.data.name,
        description: body.data.description ?? null,
        inviteCode,
        createdBy: userId,
      })
      .returning();

    // Auto-join creator as leader
    await db
      .insert(groupMemberships)
      .values({ groupId: group.id, userId, role: 'leader' });

    return reply.code(201).send({ group });
  });

  // GET /groups — list groups I belong to
  app.get('/', async (req, reply) => {
    const userId = req.user!.sub;

    const memberships = await db
      .select({
        groupId: groupMemberships.groupId,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
      })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    const result = await Promise.all(
      memberships.map(async (m) => {
        const [group] = await db
          .select()
          .from(groups)
          .where(eq(groups.id, m.groupId));

        const allMembers = await db
          .select({ id: groupMemberships.id })
          .from(groupMemberships)
          .where(eq(groupMemberships.groupId, m.groupId));

        return {
          ...group,
          myRole: m.role,
          joinedAt: m.joinedAt,
          memberCount: allMembers.length,
        };
      })
    );

    return reply.send({ groups: result });
  });

  // GET /groups/:id — group detail with members + their stats
  app.get('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const [myMembership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, id),
          eq(groupMemberships.userId, userId)
        )
      );

    if (!myMembership) {
      return reply.code(403).send({ error: 'Not a member of this group' });
    }

    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    if (!group) return reply.code(404).send({ error: 'Group not found' });

    const allMembers = await db
      .select({
        userId: groupMemberships.userId,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, id));

    const members = await Promise.all(
      allMembers.map(async (m) => {
        const stats = await getMemberStats(m.userId);
        return { ...m, ...stats };
      })
    );

    // Sort: leader/teacher first, then by streak desc
    members.sort((a, b) => {
      const roleOrder = { leader: 0, teacher: 1, member: 2 };
      const ro = (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2);
      if (ro !== 0) return ro;
      return b.streak - a.streak;
    });

    return reply.send({
      group: { ...group, myRole: myMembership.role },
      members,
    });
  });

  // POST /groups/join — join a group by invite code
  app.post('/join', async (req, reply) => {
    const userId = req.user!.sub;
    const body = z
      .object({ inviteCode: z.string().min(1) })
      .safeParse(req.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invite code required' });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, body.data.inviteCode.toUpperCase().trim()));

    if (!group) {
      return reply.code(404).send({ error: 'Invalid invite code' });
    }

    const [existing] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, group.id),
          eq(groupMemberships.userId, userId)
        )
      );

    if (existing) {
      return reply.code(409).send({ error: "You're already a member of this group" });
    }

    await db
      .insert(groupMemberships)
      .values({ groupId: group.id, userId, role: 'member' });

    return reply.code(201).send({ group });
  });
};
