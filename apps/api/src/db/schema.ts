import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Enums ─────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'both', 'parent']);
export const memUnitEnum = pgEnum('mem_unit', ['ayah', 'page', 'line', 'surah', 'juz']);
export const groupRoleEnum = pgEnum('group_role', ['member', 'leader', 'teacher']);
export const teacherTargetTypeEnum = pgEnum('teacher_target_type', ['memorization', 'revision']);
export const subcisUnitTypeEnum = pgEnum('subcis_unit_type', ['juz', 'surah', 'page_range']);
export const subcisStatusEnum = pgEnum('subcis_status', ['active', 'compiling', 'complete']);
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'pending', 'submitted', 'approved', 'needs_revision', 'missing',
]);
export const parentConnStatusEnum = pgEnum('parent_conn_status', ['pending', 'approved', 'rejected']);
export const notifTypeEnum = pgEnum('notif_type', [
  'daily_reminder', 'subcis_deadline', 'submission_received',
  'teacher_note', 'milestone', 'parent_update',
]);

// ── Users ─────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('student'),
  expoPushToken: text('expo_push_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Refresh Tokens ────────────────────────────────────────────────
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Memorization Goals ────────────────────────────────────────────
export const memorizationGoals = pgTable('memorization_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unit: memUnitEnum('unit').notNull(),
  startReference: jsonb('start_reference').notNull(),
  targetReference: jsonb('target_reference').notNull(),
  totalUnits: numeric('total_units', { precision: 8, scale: 2 }).notNull(),
  dailyTarget: numeric('daily_target', { precision: 6, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Progress Logs ─────────────────────────────────────────────────
export const progressLogs = pgTable(
  'progress_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id').notNull().references(() => memorizationGoals.id, { onDelete: 'cascade' }),
    unitsLogged: numeric('units_logged', { precision: 6, scale: 2 }).notNull(),
    logDate: date('log_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('progress_logs_user_date_idx').on(t.userId, t.logDate)]
);

// ── Revision Portions ─────────────────────────────────────────────
export const revisionPortions = pgTable('revision_portions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  portionType: text('portion_type').notNull().default('custom'), // 'surah_range' | 'page_range' | 'custom'
  surahStart: integer('surah_start'),
  surahEnd: integer('surah_end'),
  pageStartRef: integer('page_start_ref'),
  pageEndRef: integer('page_end_ref'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Revision Logs ─────────────────────────────────────────────────
export const revisionLogs = pgTable(
  'revision_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    portionId: uuid('portion_id').notNull().references(() => revisionPortions.id, { onDelete: 'cascade' }),
    logDate: date('log_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('revision_logs_portion_date_idx').on(t.portionId, t.logDate)]
);

// ── Groups ────────────────────────────────────────────────────────
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  inviteCode: text('invite_code').notNull().unique(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Group Memberships ─────────────────────────────────────────────
export const groupMemberships = pgTable(
  'group_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: groupRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('group_memberships_group_user_idx').on(t.groupId, t.userId)]
);

// ── Teacher Notes ─────────────────────────────────────────────────
export const teacherNotes = pgTable('teacher_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  studentId: uuid('student_id').notNull().references(() => users.id),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isShareableWithParent: boolean('is_shareable_with_parent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Teacher Targets ───────────────────────────────────────────────
export const teacherTargets = pgTable('teacher_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  studentId: uuid('student_id').notNull().references(() => users.id),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  targetType: teacherTargetTypeEnum('target_type').notNull(),
  description: text('description').notNull(),
  dueDate: date('due_date'),
  isComplete: boolean('is_complete').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Subcis Cycles ─────────────────────────────────────────────────
export const subcisCycles = pgTable('subcis_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  revisionTarget: text('revision_target').notNull(), // human label e.g. "Juz 1"
  unitType: subcisUnitTypeEnum('unit_type').notNull().default('page_range'),
  unitStart: integer('unit_start').notNull(),
  unitEnd: integer('unit_end').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  status: subcisStatusEnum('status').notNull().default('active'),
  compiledAudioUrl: text('compiled_audio_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Subcis Assignments ────────────────────────────────────────────
export const subcisAssignments = pgTable('subcis_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id').notNull().references(() => subcisCycles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  portionLabel: text('portion_label').notNull(),   // e.g. "Pages 210–215"
  pageStart: integer('page_start').notNull(),
  pageEnd: integer('page_end').notNull(),
  portionOrder: integer('portion_order').notNull(), // compilation order
  status: assignmentStatusEnum('status').notNull().default('pending'),
  audioUrl: text('audio_url'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewerNote: text('reviewer_note'),
});

// ── Parent Connections ────────────────────────────────────────────
export const parentConnections = pgTable('parent_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: parentConnStatusEnum('status').notNull().default('pending'),
  inviteCode: text('invite_code').notNull().unique(),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Notifications ─────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notifTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  relatedId: uuid('related_id'), // optional: group/cycle/note id
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Surah Revisions ───────────────────────────────────────────────
export const surahRevisions = pgTable(
  'surah_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    surahId: integer('surah_id').notNull(),
    logDate: date('log_date').notNull(),
    revisedAt: timestamp('revised_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('surah_revisions_user_surah_date_idx').on(t.userId, t.surahId, t.logDate),
    index('surah_revisions_user_idx').on(t.userId),
  ]
);

// ── Relations ─────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  goals: many(memorizationGoals),
  logs: many(progressLogs),
  groupMemberships: many(groupMemberships),
  notifications: many(notifications),
  parentConnections: many(parentConnections, { relationName: 'parent' }),
  studentConnections: many(parentConnections, { relationName: 'student' }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  memberships: many(groupMemberships),
  cycles: many(subcisCycles),
  notes: many(teacherNotes),
}));

export const subcisCyclesRelations = relations(subcisCycles, ({ many }) => ({
  assignments: many(subcisAssignments),
}));
