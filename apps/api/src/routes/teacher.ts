import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import {
  users,
  groupMemberships,
  memorizationGoals,
  progressLogs,
  teacherNotes,
  teacherTargets,
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getStudentRevisionPortions } from './revision';

const addNoteSchema = z.object({
  content: z.string().min(1).max(2000),
  isShareableWithParent: z.boolean().optional().default(false),
});

const addTargetSchema = z.object({
  targetType: z.enum(['memorization', 'revision']),
  description: z.string().min(1).max(500),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// ── Helpers ────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function calcStreak(logDates: string[]): number {
  if (logDates.length === 0) return 0;
  const dateSet = new Set(logDates);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(subDays(today, 1));
  let startDate = dateSet.has(todayStr) ? today : dateSet.has(yesterdayStr) ? subDays(today, 1) : null;
  if (!startDate) return 0;
  let streak = 0;
  let cur = new Date(startDate);
  while (dateSet.has(toDateStr(cur))) {
    streak++;
    cur = subDays(cur, 1);
  }
  return streak;
}

async function assertTeacher(userId: string, groupId: string): Promise<boolean> {
  const [membership] = await db
    .select({ role: groupMemberships.role })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      )
    );
  return membership?.role === 'teacher' || membership?.role === 'leader';
}

async function getStudentStats(studentId: string) {
  const [goal] = await db
    .select()
    .from(memorizationGoals)
    .where(
      and(
        eq(memorizationGoals.userId, studentId),
        eq(memorizationGoals.isActive, true)
      )
    );

  if (!goal) return { goal: null, stats: null };

  const allLogs = await db
    .select({
      logDate: progressLogs.logDate,
      unitsLogged: progressLogs.unitsLogged,
    })
    .from(progressLogs)
    .where(eq(progressLogs.goalId, goal.id))
    .orderBy(desc(progressLogs.logDate));

  const totalLogged = allLogs.reduce((s, l) => s + parseFloat(l.unitsLogged), 0);
  const goalTotal = parseFloat(goal.totalUnits);
  const percentComplete = goalTotal > 0 ? Math.round((totalLogged / goalTotal) * 100) : 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = toDateStr(subDays(today, 7));
  const recentLogs = allLogs.filter((l) => l.logDate >= sevenDaysAgo);
  const weeklyTotal = recentLogs.reduce((s, l) => s + parseFloat(l.unitsLogged), 0);
  const weeklyAvg = Math.round((weeklyTotal / 7) * 100) / 100;

  const todayStr = toDateStr(today);
  const todayEntry = allLogs.find((l) => l.logDate === todayStr);

  // Last 7 days activity
  const logMap = new Map(allLogs.map((l) => [l.logDate, parseFloat(l.unitsLogged)]));
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = toDateStr(subDays(today, 6 - i));
    return { date: d, units: logMap.get(d) ?? 0 };
  });

  return {
    goal: {
      id: goal.id,
      unit: goal.unit,
      totalUnits: goalTotal,
      dailyTarget: parseFloat(goal.dailyTarget),
    },
    stats: {
      currentStreak: calcStreak(allLogs.map((l) => l.logDate)),
      totalLogged: Math.round(totalLogged * 100) / 100,
      percentComplete,
      weeklyTotal: Math.round(weeklyTotal * 100) / 100,
      weeklyAvg,
      todayLogged: todayEntry ? parseFloat(todayEntry.unitsLogged) : null,
      last7Days,
    },
  };
}

// ── Routes ─────────────────────────────────────────────────────────

export const teacherRoutes: FastifyPluginAsync = async (app) => {
  // GET /groups/:id/teacher/students — all students with stats
  app.get('/:id/teacher/students', async (req, reply) => {
    const teacherId = req.user!.sub;
    const { id: groupId } = req.params as { id: string };

    if (!(await assertTeacher(teacherId, groupId))) {
      return reply.code(403).send({ error: 'Teacher or leader role required' });
    }

    // All student members in this group
    const members = await db
      .select({
        userId: groupMemberships.userId,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        email: users.email,
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          // Exclude the teacher themselves
        )
      );

    const students = await Promise.all(
      members.map(async (m) => {
        const { goal, stats } = await getStudentStats(m.userId);
        return {
          id: m.userId,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          email: m.email,
          memberRole: m.role,
          joinedAt: m.joinedAt,
          goal,
          stats,
        };
      })
    );

    return reply.send({ students });
  });

  // GET /groups/:id/teacher/students/:uid — one student full detail
  app.get('/:id/teacher/students/:uid', async (req, reply) => {
    const teacherId = req.user!.sub;
    const { id: groupId, uid: studentId } = req.params as { id: string; uid: string };

    if (!(await assertTeacher(teacherId, groupId))) {
      return reply.code(403).send({ error: 'Teacher or leader role required' });
    }

    const [student] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, studentId));

    if (!student) return reply.code(404).send({ error: 'Student not found' });

    const { goal, stats } = await getStudentStats(studentId);
    const revisionPortions = await getStudentRevisionPortions(studentId);

    // Recent notes from this teacher to this student in this group
    const notes = await db
      .select()
      .from(teacherNotes)
      .where(
        and(
          eq(teacherNotes.teacherId, teacherId),
          eq(teacherNotes.studentId, studentId),
          eq(teacherNotes.groupId, groupId)
        )
      )
      .orderBy(desc(teacherNotes.createdAt));

    // Active targets
    const targets = await db
      .select()
      .from(teacherTargets)
      .where(
        and(
          eq(teacherTargets.teacherId, teacherId),
          eq(teacherTargets.studentId, studentId),
          eq(teacherTargets.groupId, groupId),
          eq(teacherTargets.isComplete, false)
        )
      )
      .orderBy(desc(teacherTargets.createdAt));

    return reply.send({ student: { ...student, goal, stats, revisionPortions, notes, targets } });
  });

  // POST /groups/:id/teacher/notes — add note for a student
  app.post('/:id/teacher/notes', async (req, reply) => {
    const teacherId = req.user!.sub;
    const { id: groupId } = req.params as { id: string };

    if (!(await assertTeacher(teacherId, groupId))) {
      return reply.code(403).send({ error: 'Teacher or leader role required' });
    }

    const body = z
      .object({ studentId: z.string().uuid() })
      .merge(addNoteSchema)
      .safeParse(req.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    const [note] = await db
      .insert(teacherNotes)
      .values({
        teacherId,
        studentId: body.data.studentId,
        groupId,
        content: body.data.content,
        isShareableWithParent: body.data.isShareableWithParent,
      })
      .returning();

    return reply.code(201).send({ note });
  });

  // POST /groups/:id/teacher/targets — assign a target
  app.post('/:id/teacher/targets', async (req, reply) => {
    const teacherId = req.user!.sub;
    const { id: groupId } = req.params as { id: string };

    if (!(await assertTeacher(teacherId, groupId))) {
      return reply.code(403).send({ error: 'Teacher or leader role required' });
    }

    const body = z
      .object({ studentId: z.string().uuid() })
      .merge(addTargetSchema)
      .safeParse(req.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten().fieldErrors });
    }

    const [target] = await db
      .insert(teacherTargets)
      .values({
        teacherId,
        studentId: body.data.studentId,
        groupId,
        targetType: body.data.targetType,
        description: body.data.description,
        dueDate: body.data.dueDate ?? null,
      })
      .returning();

    return reply.code(201).send({ target });
  });

  // PUT /groups/:id/teacher/targets/:tid/complete
  app.put('/:id/teacher/targets/:tid/complete', async (req, reply) => {
    const teacherId = req.user!.sub;
    const { id: groupId, tid } = req.params as { id: string; tid: string };

    if (!(await assertTeacher(teacherId, groupId))) {
      return reply.code(403).send({ error: 'Teacher or leader role required' });
    }

    const [target] = await db
      .update(teacherTargets)
      .set({ isComplete: true })
      .where(
        and(
          eq(teacherTargets.id, tid),
          eq(teacherTargets.teacherId, teacherId)
        )
      )
      .returning();

    if (!target) return reply.code(404).send({ error: 'Target not found' });
    return reply.send({ target });
  });
};
