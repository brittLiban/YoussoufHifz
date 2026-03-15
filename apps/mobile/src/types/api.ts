export type MemUnit = 'ayah' | 'page' | 'line' | 'surah' | 'juz';
export type RevisionStrength = 'strong' | 'good' | 'review' | 'weak' | 'critical';

export interface Goal {
  id: string;
  userId: string;
  unit: MemUnit;
  startReference: Record<string, unknown>;
  targetReference: Record<string, unknown>;
  totalUnits: number;
  dailyTarget: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProgressLog {
  id: string;
  userId: string;
  goalId: string;
  unitsLogged: number;
  logDate: string;
  note: string | null;
  createdAt: string;
}

export interface WeeklyDataPoint {
  date: string;
  units: number;
}

export interface ProgressStats {
  currentStreak: number;
  longestStreak: number;
  weeklyTotal: number;
  weeklyAvg: number;
  totalLogged: number;
  todayLogged: number | null;
  weeklyData: WeeklyDataPoint[];
  goal: {
    id: string;
    unit: MemUnit;
    totalUnits: number;
    dailyTarget: number;
  };
}

export interface Forecast {
  projectedDate: string | null;
  daysLeft: number | null;
  dailyAvg: number;
  totalLogged: number;
  remaining: number;
  totalUnits: number;
  unit: MemUnit;
}

export type PortionType = 'surah_range' | 'page_range' | 'custom';

export interface RevisionPortion {
  id: string;
  label: string;
  portionType: PortionType;
  surahStart: number | null;
  surahEnd: number | null;
  pageStartRef: number | null;
  pageEndRef: number | null;
  sortOrder: number;
  createdAt: string;
  lastRevised: string | null;
  daysSinceRevision: number | null;
  strength: RevisionStrength;
  revisedToday: boolean;
}

export interface RevisionLog {
  id: string;
  logDate: string;
  note: string | null;
  createdAt: string;
}

export type GroupRole = 'member' | 'leader' | 'teacher';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  myRole: GroupRole;
  memberCount?: number;
  joinedAt?: string;
}

export interface GroupMember {
  userId: string;
  role: GroupRole;
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
  goal: { unit: MemUnit; totalUnits: number; dailyTarget: number } | null;
  streak: number;
  percentComplete: number;
  loggedToday: boolean;
}

export interface TeacherNote {
  id: string;
  teacherId: string;
  studentId: string;
  groupId: string;
  content: string;
  isShareableWithParent: boolean;
  createdAt: string;
}

export interface TeacherTarget {
  id: string;
  teacherId: string;
  studentId: string;
  groupId: string;
  targetType: 'memorization' | 'revision';
  description: string;
  dueDate: string | null;
  isComplete: boolean;
  createdAt: string;
}

export interface StudentStats {
  currentStreak: number;
  totalLogged: number;
  percentComplete: number;
  weeklyTotal: number;
  weeklyAvg: number;
  todayLogged: number | null;
  last7Days: { date: string; units: number }[];
}

export interface StudentDetail {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  goal: { id: string; unit: MemUnit; totalUnits: number; dailyTarget: number } | null;
  stats: StudentStats | null;
  revisionPortions: RevisionPortion[];
  notes: TeacherNote[];
  targets: TeacherTarget[];
}
