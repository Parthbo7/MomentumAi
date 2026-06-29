/**
 * goalScheduleEngine.ts
 * ─────────────────────
 * Pure-function engine: converts a DbGoal into a list of calendar event
 * specs that can be batch-written to Firestore.  No side-effects.
 *
 * Scheduling modes
 *   fixed    → exact start/end time, locked, never moveable by AI
 *   flexible → AI places within user-defined window on each repeat day
 *   ai       → AI chooses time based on free-slot productivity analysis
 */

// ── Public Types ────────────────────────────────────────────────────────────

export interface GoalEventSpec {
  goalId: string;
  title: string;
  icon: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  date: string;           // YYYY-MM-DD
  start: string;          // "H:MM AM/PM"
  end: string;
  flexibleScheduling: boolean;
  goalSchedulingType: 'fixed' | 'flexible' | 'ai';
  sessionIndex: number;
  isGoalEvent: true;
  isLocked?: boolean;
}

export interface ExistingBlock {
  date: string;
  start: string;
  end: string;
}

export interface DbGoalInput {
  id?: string;
  title: string;
  icon?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  schedulingType: 'ai' | 'fixed' | 'flexible';
  fixedStartTime?: string;
  fixedEndTime?: string;
  flexWindowStart?: string;
  flexWindowEnd?: string;
  sessionDurationMins?: number;
  sessionsPerWeek?: number;
  repeatDays?: number[];   // 0=Sun … 6=Sat
  repeatRule?: 'daily' | 'weekdays' | 'weekends' | 'selected' | 'monthly';
  targetDate?: string;     // YYYY-MM-DD
  isLocked?: boolean;
}

// ── Internal Utilities ──────────────────────────────────────────────────────

export const timeToMins = (t: string): number => {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 720;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

export const minsToTime = (total: number): string => {
  const c = Math.min(1439, Math.max(0, total));
  let h = Math.floor(c / 60) % 24;
  const min = c % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min < 10 ? '0' : ''}${min} ${ap}`;
};

const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const buildDateRange = (targetDate: string | undefined, weeksAhead: number): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let end: Date;
  if (targetDate) {
    end = new Date(targetDate);
    end.setHours(0, 0, 0, 0);
  } else {
    end = addDays(today, weeksAhead * 7);
  }
  const dates: Date[] = [];
  let cur = new Date(today);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return dates;
};

const WEEKDAYS_SET = new Set([1, 2, 3, 4, 5]);
const WEEKENDS_SET = new Set([0, 6]);

const dateMatchesRule = (
  date: Date,
  rule: DbGoalInput['repeatRule'],
  selectedDays: number[]
): boolean => {
  const dow = date.getDay();
  switch (rule) {
    case 'daily':    return true;
    case 'weekdays': return WEEKDAYS_SET.has(dow);
    case 'weekends': return WEEKENDS_SET.has(dow);
    case 'selected': return selectedDays.includes(dow);
    case 'monthly':  return true; // caller filters to 1/month
    default:         return true;
  }
};

const overlaps = (s1: number, e1: number, s2: number, e2: number): boolean =>
  s1 < e2 && s2 < e1;

const findFreeSlot = (
  date: string,
  winStart: number,
  winEnd: number,
  dur: number,
  existing: ExistingBlock[]
): { start: number; end: number } | null => {
  const busy = existing
    .filter(b => b.date === date)
    .map(b => ({ s: timeToMins(b.start), e: timeToMins(b.end) }))
    .sort((a, b) => a.s - b.s);

  let cursor = winStart;
  while (cursor + dur <= winEnd) {
    const end = cursor + dur;
    const blocker = busy.find(b => overlaps(cursor, end, b.s, b.e));
    if (!blocker) return { start: cursor, end };
    cursor = blocker.e;
  }
  return null;
};

// Productivity windows ordered by effectiveness
const AI_WINDOWS = [
  { start: 7 * 60,  end: 11 * 60 },  // morning deep work
  { start: 18 * 60, end: 21 * 60 },  // evening focus
  { start: 13 * 60, end: 17 * 60 },  // afternoon
  { start: 21 * 60, end: 22 * 60 },  // late
];

// ── Main Export ────────────────────────────────────────────────────────────

/**
 * Generate all calendar event specs for a goal.
 * Pass your current calendar events as `existing` for conflict avoidance.
 */
export function generateGoalEvents(
  goal: DbGoalInput,
  existing: ExistingBlock[],
  weeksAhead = 4
): GoalEventSpec[] {
  const specs: GoalEventSpec[] = [];
  const icon     = goal.icon     ?? '🎯';
  const category = goal.category ?? 'Personal';
  const priority = goal.priority ?? 'medium';
  const dur      = goal.sessionDurationMins ?? 60;
  const goalId   = goal.id ?? 'pending';
  const limit    = goal.sessionsPerWeek ?? Infinity;

  const allDates = buildDateRange(goal.targetDate, weeksAhead);

  // Filter by repeat rule
  const eligible = allDates.filter(d =>
    dateMatchesRule(d, goal.repeatRule ?? 'selected', goal.repeatDays ?? [])
  );

  // For monthly: keep only first per month
  const monthSeen = new Set<string>();
  const filtered = goal.repeatRule === 'monthly'
    ? eligible.filter(d => {
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthSeen.has(mk)) return false;
        monthSeen.add(mk);
        return true;
      })
    : eligible;

  const weekBuckets: Record<string, number> = {};
  let sessionIndex = 0;
  let existingMut  = [...existing];

  for (const date of filtered) {
    // Week key (Monday-based)
    const mon = new Date(date);
    mon.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const weekKey = dateKey(mon);
    if ((weekBuckets[weekKey] ?? 0) >= limit) continue;

    const dk   = dateKey(date);
    const label = `${icon} ${goal.title}`;
    let spec: GoalEventSpec | null = null;

    if (goal.schedulingType === 'fixed') {
      const st = goal.fixedStartTime ?? '09:00 AM';
      const et = goal.fixedEndTime   ?? minsToTime(timeToMins(st) + dur);
      spec = {
        goalId, title: label, icon, category, priority,
        date: dk, start: st, end: et,
        flexibleScheduling: false,
        goalSchedulingType: 'fixed',
        sessionIndex: sessionIndex++,
        isGoalEvent: true,
        isLocked: goal.isLocked ?? true,
      };

    } else if (goal.schedulingType === 'flexible') {
      const ws = timeToMins(goal.flexWindowStart ?? '06:00 PM');
      const we = timeToMins(goal.flexWindowEnd   ?? '10:00 PM');
      const slot = findFreeSlot(dk, ws, we, dur, existingMut);
      if (slot) {
        spec = {
          goalId, title: label, icon, category, priority,
          date: dk, start: minsToTime(slot.start), end: minsToTime(slot.end),
          flexibleScheduling: true,
          goalSchedulingType: 'flexible',
          sessionIndex: sessionIndex++,
          isGoalEvent: true,
          isLocked: goal.isLocked ?? false,
        };
        existingMut.push({ date: dk, start: minsToTime(slot.start), end: minsToTime(slot.end) });
      }

    } else {
      // ai mode
      let placed = false;
      for (const win of AI_WINDOWS.filter(w => w.end - w.start >= dur)) {
        const slot = findFreeSlot(dk, win.start, win.end, dur, existingMut);
        if (slot) {
          spec = {
            goalId, title: label, icon, category, priority,
            date: dk, start: minsToTime(slot.start), end: minsToTime(slot.end),
            flexibleScheduling: true,
            goalSchedulingType: 'ai',
            sessionIndex: sessionIndex++,
            isGoalEvent: true,
            isLocked: goal.isLocked ?? false,
          };
          existingMut.push({ date: dk, start: minsToTime(slot.start), end: minsToTime(slot.end) });
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Fallback: 9 PM
        spec = {
          goalId, title: label, icon, category, priority,
          date: dk, start: '9:00 PM', end: minsToTime(21 * 60 + dur),
          flexibleScheduling: true,
          goalSchedulingType: 'ai',
          sessionIndex: sessionIndex++,
          isGoalEvent: true,
          isLocked: goal.isLocked ?? false,
        };
      }
    }

    if (spec) {
      specs.push(spec);
      weekBuckets[weekKey] = (weekBuckets[weekKey] ?? 0) + 1;
    }
  }

  return specs;
}

// ── Habit Event Generation ────────────────────────────────────────────────

export interface HabitEventSpec {
  habitId: string;
  title: string;
  icon: string;
  category: string;
  date: string;           // YYYY-MM-DD
  start: string;          // "H:MM AM/PM"
  end: string;
  isLocked: boolean;
}

export interface DbHabitInput {
  id?: string;
  title: string;
  icon?: string;
  category?: string;
  preferredTime?: string;  // "09:00 AM"
  duration?: number;       // minutes
  repeat?: 'daily' | 'weekdays' | 'weekends' | 'custom' | 'monthly';
  repeatDays?: number[];   // 0=Sun … 6=Sat (for 'custom')
  isLocked?: boolean;
}

/**
 * Generates calendar event specs for a habit over N weeks.
 * Pure function — no side effects.
 */
export function generateHabitEvents(
  habit: DbHabitInput,
  weeksAhead: number = 4
): HabitEventSpec[] {
  const specs: HabitEventSpec[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startMins = timeToMins(habit.preferredTime || '09:00 AM');
  const duration = habit.duration || 15;
  const endMins = startMins + duration;
  const startStr = minsToTime(startMins);
  const endStr = minsToTime(endMins);

  const totalDays = weeksAhead * 7;

  for (let d = 0; d < totalDays; d++) {
    const date = addDays(today, d);
    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
    const dk = dateKey(date);

    let matches = false;
    switch (habit.repeat || 'daily') {
      case 'daily':
        matches = true;
        break;
      case 'weekdays':
        matches = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;
      case 'weekends':
        matches = dayOfWeek === 0 || dayOfWeek === 6;
        break;
      case 'custom':
        matches = (habit.repeatDays || []).includes(dayOfWeek);
        break;
      case 'monthly':
        matches = date.getDate() === today.getDate();
        break;
    }

    if (matches) {
      specs.push({
        habitId: habit.id || '',
        title: habit.title,
        icon: habit.icon || '🔥',
        category: habit.category || 'Health',
        date: dk,
        start: startStr,
        end: endStr,
        isLocked: habit.isLocked ?? true,
      });
    }
  }

  return specs;
}
