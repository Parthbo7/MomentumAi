// ============================================================
// AI Auto Scheduler and Planner Engine — v2.0
// Completely redesigned to NEVER schedule into the past.
// Uses workload-balanced, deadline-aware, future-only logic.
// ============================================================

export interface SchedulerTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  durationMinutes: number;
  dueDate: string; // YYYY-MM-DD
  dueTime: string;
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
  earliestStartDate?: string; // YYYY-MM-DD
  latestFinishTime?: string; // hh:mm AM/PM
  fixedTime?: string; // hh:mm AM/PM (optional override)
  flexibleScheduling: boolean;
  breakAfterTask: boolean;
  category: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // hh:mm AM/PM
  end: string; // hh:mm AM/PM
  priority: 'low' | 'medium' | 'high' | 'critical';
  accent: 'lavender' | 'amber' | 'sky' | 'emerald' | 'rose';
  completed?: boolean;
  category?: string;
  isAiScheduled?: boolean;
  aiReason?: string;
  flexibleScheduling?: boolean;
  breakAfterTask?: boolean;
  rescheduleCount?: number;
  location?: string;
  guests?: string[];
  repeatFrequency?: string;
  goal?: string;
  streak?: number;
  endTime?: string;
  isLocked?: boolean;
  lastModifiedByUser?: 'ui' | 'drag' | 'optimizer' | null;
  // Goal/Habit fields
  sourceType?: 'goal' | 'habit' | 'manual';
  sourceId?: string;
  isGoalEvent?: boolean;
  goalId?: string;
  goalSchedulingType?: 'fixed' | 'flexible' | 'ai';
  sessionIndex?: number;
  missedAt?: string;
  rescheduledFrom?: string;
  isHabitEvent?: boolean;
  habitId?: string;
}

export interface OptimizationStats {
  moved: number;
  splits: number;
  conflictsResolved: number;
  tasksSplit: string[];
  movedTitles: string[];
}

// ─── Time Utilities ──────────────────────────────────────────

/** Convert "10:00 AM" or "06:00 PM" to minutes from midnight (0–1439) */
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 720; // Default noon
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 720;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

/** Convert minutes from midnight (e.g. 600) to "10:00 AM" */
export const minutesToTimeStr = (totalMins: number): string => {
  const clamped = Math.min(1439, Math.max(0, totalMins));
  let hours = Math.floor(clamped / 60) % 24;
  const minutes = clamped % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minsStr = minutes < 10 ? '0' + minutes : String(minutes);
  return `${hours}:${minsStr} ${ampm}`;
};

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseDateKey = (dateStr: string): Date => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date();
};

/** Today's date key YYYY-MM-DD (local) */
export const todayKey = (): string => formatDateKey(new Date());

/** Current time in minutes from midnight */
export const nowMinutes = (): number => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

/** Returns true if dateKey is strictly before today */
export const isDateInPast = (dateKey: string): boolean => dateKey < todayKey();

/** Returns true if dateKey is today */
export const isDateToday = (dateKey: string): boolean => dateKey === todayKey();

// ─── Priority Utilities ──────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

const getPriorityWeight = (priority: string): number =>
  PRIORITY_WEIGHT[priority] ?? 2;

// ─── Time Range Utilities ─────────────────────────────────────

/** Work hour ranges by preferred time block */
export const getPreferredTimeRange = (
  pref: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime',
  latestFinishTimeStr?: string
): { start: number; end: number } => {
  let range: { start: number; end: number };
  switch (pref) {
    case 'morning':   range = { start: 480, end: 720 };   break; // 8 AM – 12 PM
    case 'afternoon': range = { start: 720, end: 1020 };  break; // 12 PM – 5 PM
    case 'evening':   range = { start: 1020, end: 1260 }; break; // 5 PM – 9 PM
    case 'night':     range = { start: 1260, end: 1440 }; break; // 9 PM – 12 AM
    case 'anytime':
    default:          range = { start: 480, end: 1320 };  break; // 8 AM – 10 PM
  }
  if (latestFinishTimeStr) {
    const cap = timeToMinutes(latestFinishTimeStr);
    if (cap < range.end && cap > range.start) range.end = cap;
  }
  return range;
};

// ─── Overlap Detection ────────────────────────────────────────

/** Checks whether [startMins, endMins) overlaps any event on that day */
export const isOverlapping = (
  dateKey: string,
  startMins: number,
  endMins: number,
  events: CalendarEvent[],
  ignoreEventId?: string
): boolean => {
  const dayEvents = events.filter(
    (e) => e.date === dateKey && e.id !== ignoreEventId && !e.completed
  );
  for (const ev of dayEvents) {
    const evS = timeToMinutes(ev.start);
    const evE = timeToMinutes(ev.end);
    if (startMins < evE && evS < endMins) return true;
  }
  return false;
};

// ─── Free Slot Detection ──────────────────────────────────────

interface FreeSlot {
  start: number; // minutes from midnight
  end: number;
  duration: number;
}

/**
 * Returns all contiguous free blocks on a given day between fromMinutes and toMinutes.
 * Accounts for all events already in the list.
 */
export const findFreeSlots = (
  dateKey: string,
  fromMinutes: number,
  toMinutes: number,
  events: CalendarEvent[],
  ignoreEventId?: string
): FreeSlot[] => {
  const dayEvents = events
    .filter((e) => e.date === dateKey && e.id !== ignoreEventId && !e.completed)
    .map((e) => ({ start: timeToMinutes(e.start), end: timeToMinutes(e.end) }))
    .sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];
  let cursor = fromMinutes;

  for (const ev of dayEvents) {
    if (ev.start > cursor) {
      const freeStart = cursor;
      const freeEnd = Math.min(ev.start, toMinutes);
      if (freeEnd > freeStart) {
        slots.push({ start: freeStart, end: freeEnd, duration: freeEnd - freeStart });
      }
    }
    cursor = Math.max(cursor, ev.end);
  }

  // Remaining time after last event
  if (cursor < toMinutes) {
    slots.push({ start: cursor, end: toMinutes, duration: toMinutes - cursor });
  }

  return slots.filter((s) => s.duration > 0);
};

// ─── Day Load Tracking ────────────────────────────────────────

/** Returns total scheduled minutes on a day (from fixed/existing events) */
const getDayLoad = (dateKey: string, events: CalendarEvent[]): number => {
  return events
    .filter((e) => e.date === dateKey && !e.completed)
    .reduce((sum, e) => sum + (timeToMinutes(e.end) - timeToMinutes(e.start)), 0);
};

// ─── Future Day Iterator ──────────────────────────────────────

interface FutureDay {
  dateKey: string;
  startMinutes: number; // earliest minute we may schedule on this day
}

/**
 * Returns an ordered list of future scheduling windows.
 * Today → uses current time + 5 min buffer as earliest start.
 * Future days → use 8 AM (480 min) as earliest start.
 * Days in the past are excluded.
 */
const buildFutureDays = (startDateKey: string, endDateKey: string): FutureDay[] => {
  const today = todayKey();
  const currentMins = nowMinutes() + 5; // 5-min buffer from "now"
  const days: FutureDay[] = [];

  const start = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);
  const cursor = new Date(start);

  while (formatDateKey(cursor) <= endDateKey && cursor <= end) {
    const dk = formatDateKey(cursor);
    if (dk >= today) {
      const dayStart = isDateToday(dk) ? currentMins : 480; // 8 AM for future days
      const dayEnd = 1320; // 10 PM hard cap
      if (dayStart < dayEnd) {
        days.push({ dateKey: dk, startMinutes: dayStart });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

// ─── Task Splitting ───────────────────────────────────────────

/**
 * Splits a long task across multiple available slots.
 * Returns session objects with their scheduled times.
 */
export const splitTask = (
  title: string,
  totalDuration: number
): { title: string; duration: number }[] => {
  if (totalDuration <= 90) return [{ title, duration: totalDuration }];

  const chunks: { title: string; duration: number }[] = [];
  let remaining = totalDuration;
  let part = 1;

  while (remaining > 0) {
    // Use up to 90-min chunks to respect focus blocks
    const chunkDur = Math.min(remaining, 90);
    chunks.push({ title: `${title} (Session ${part})`, duration: chunkDur });
    remaining -= chunkDur;
    part++;
  }

  return chunks;
};

// ─── Single-Task Auto Scheduler ───────────────────────────────

/** Intelligent scheduling for a single task across a search window */
export const autoScheduleTask = (
  task: Partial<SchedulerTask> & { title: string },
  events: CalendarEvent[],
  ignoreEventId?: string
): { date: string; start: string; end: string; aiReason: string } => {
  const duration = task.durationMinutes || 30;
  const breakBuffer = task.breakAfterTask ? 10 : 0;
  const totalRequired = duration + breakBuffer;

  const today = new Date();
  const todayDk = formatDateKey(today);

  // Earliest start: never before today
  const earliestDk = task.earliestStartDate
    ? (task.earliestStartDate >= todayDk ? task.earliestStartDate : todayDk)
    : todayDk;

  // Deadline window
  let deadlineDk = task.dueDate || '';
  if (!deadlineDk || deadlineDk < earliestDk) {
    const fallbackEnd = new Date(today);
    fallbackEnd.setDate(fallbackEnd.getDate() + 7);
    deadlineDk = formatDateKey(fallbackEnd);
  }

  const preferredRange = getPreferredTimeRange(
    task.preferredTime || 'anytime',
    task.latestFinishTime
  );

  // Fixed-time placement
  if (task.fixedTime) {
    const fixedStart = timeToMinutes(task.fixedTime);
    const fixedEnd = fixedStart + duration;
    const futureDays = buildFutureDays(earliestDk, deadlineDk);
    for (const { dateKey, startMinutes } of futureDays) {
      // Ensure fixed time is in the future for today
      if (fixedStart < startMinutes) continue;
      if (!isOverlapping(dateKey, fixedStart, fixedEnd + breakBuffer, events, ignoreEventId)) {
        return {
          date: dateKey,
          start: task.fixedTime,
          end: minutesToTimeStr(fixedEnd),
          aiReason: `📌 Placed at fixed requested time ${task.fixedTime} on ${dateKey}.`,
        };
      }
    }
  }

  // Preferred-window search
  const futureDays = buildFutureDays(earliestDk, deadlineDk);
  for (const { dateKey, startMinutes } of futureDays) {
    const rangeStart = Math.max(preferredRange.start, startMinutes);
    const rangeEnd = preferredRange.end;
    const freeSlots = findFreeSlots(dateKey, rangeStart, rangeEnd, events, ignoreEventId);
    const fit = freeSlots.find((s) => s.duration >= totalRequired);
    if (fit) {
      return {
        date: dateKey,
        start: minutesToTimeStr(fit.start),
        end: minutesToTimeStr(fit.start + duration),
        aiReason: `🤖 Auto-scheduled in free ${duration}-min slot (${task.preferredTime || 'anytime'} window) on ${dateKey}.`,
      };
    }
  }

  // Anytime fallback
  for (const { dateKey, startMinutes } of futureDays) {
    const rangeStart = Math.max(480, startMinutes);
    const freeSlots = findFreeSlots(dateKey, rangeStart, 1320, events, ignoreEventId);
    const fit = freeSlots.find((s) => s.duration >= totalRequired);
    if (fit) {
      return {
        date: dateKey,
        start: minutesToTimeStr(fit.start),
        end: minutesToTimeStr(fit.start + duration),
        aiReason: `🤖 Placed in general available slot on ${dateKey} (preferred window was full).`,
      };
    }
  }

  // Absolute fallback — furthest future day at 8 AM
  const fallbackDay = futureDays.length > 0
    ? futureDays[futureDays.length - 1].dateKey
    : formatDateKey(today);
  return {
    date: fallbackDay,
    start: '08:00 AM',
    end: minutesToTimeStr(480 + duration),
    aiReason: `⚠️ Scheduled at default 8 AM on ${fallbackDay} due to schedule congestion.`,
  };
};

// ─── Conflict Suggestions ─────────────────────────────────────

/** Returns up to 3 alternative future slots when a conflict occurs */
export const getConflictSuggestions = (
  dateKey: string,
  durationMins: number,
  events: CalendarEvent[],
  ignoreEventId?: string
): { date: string; start: string; end: string }[] => {
  const suggestions: { date: string; start: string; end: string }[] = [];
  const today = todayKey();
  const startDk = dateKey >= today ? dateKey : today;

  const endDate = parseDateKey(startDk);
  endDate.setDate(endDate.getDate() + 5);
  const futureDays = buildFutureDays(startDk, formatDateKey(endDate));

  for (const { dateKey: dk, startMinutes } of futureDays) {
    if (suggestions.length >= 3) break;
    const freeSlots = findFreeSlots(dk, Math.max(480, startMinutes), 1320, events, ignoreEventId);
    for (const slot of freeSlots) {
      if (slot.duration >= durationMins && suggestions.length < 3) {
        suggestions.push({
          date: dk,
          start: minutesToTimeStr(slot.start),
          end: minutesToTimeStr(slot.start + durationMins),
        });
      }
    }
  }

  return suggestions;
};

// ─── Auto Reschedule Past Tasks ───────────────────────────────

/** Reschedules incomplete AI/flexible events that are stranded in the past */
export const autoReschedulePastTasks = (
  events: CalendarEvent[]
): { eventId: string; date: string; start: string; end: string; reason: string }[] => {
  const today = todayKey();
  const currentMins = nowMinutes();

  const pastIncomplete = events.filter((e) => {
    if (e.completed) return false;
    const isPastDay = e.date < today;
    const isPastTime = e.date === today && timeToMinutes(e.end) < currentMins;
    return (isPastDay || isPastTime) && (e.isAiScheduled || e.flexibleScheduling !== false);
  });

  const tempList = [...events];
  const updates: { eventId: string; date: string; start: string; end: string; reason: string }[] = [];

  for (const ev of pastIncomplete) {
    const duration = Math.max(15, timeToMinutes(ev.end) - timeToMinutes(ev.start));

    const slot = autoScheduleTask(
      {
        title: ev.title,
        priority: ev.priority,
        durationMinutes: duration,
        preferredTime: 'anytime',
        flexibleScheduling: true,
        breakAfterTask: ev.breakAfterTask || false,
        category: ev.category || '',
      },
      tempList,
      ev.id
    );

    updates.push({
      eventId: ev.id,
      date: slot.date,
      start: slot.start,
      end: slot.end,
      reason: `AI rescheduled "${ev.title}" from past to ${slot.date} @ ${slot.start}`,
    });

    // Update temp list to prevent cascading overlaps
    const idx = tempList.findIndex((x) => x.id === ev.id);
    if (idx !== -1) {
      tempList[idx] = { ...tempList[idx], date: slot.date, start: slot.start, end: slot.end };
    }
  }

  return updates;
};

// ─── Day Optimizer ────────────────────────────────────────────

/**
 * Optimizes a single day's schedule.
 *
 * Rules:
 * - Never processes days in the past.
 * - For today: never places tasks before current time.
 * - Fixed / college / completed events are untouched.
 * - Flexible events sorted by priority then deadline urgency.
 * - Inserts 5-min gap between tasks; 10-min break after each 90-min allocation block.
 * - Falls back to evening window if day grid is full.
 */
export const optimizeDaySchedule = (
  dayKey: string,
  events: CalendarEvent[]
): { optimizedEvents: CalendarEvent[]; stats: OptimizationStats } => {
  const today = todayKey();

  // Guard: refuse to optimize past days
  if (dayKey < today) {
    return {
      optimizedEvents: events.filter((e) => e.date === dayKey),
      stats: { moved: 0, splits: 0, conflictsResolved: 0, tasksSplit: [], movedTitles: [] },
    };
  }

  const isToday = dayKey === today;
  const dayStart = isToday ? nowMinutes() + 5 : 480; // current time+5 or 8 AM
  const WORK_END = 1320; // 10 PM hard cap

  const dayEvents = events.filter((e) => e.date === dayKey);

  // Fixed events: never touch these
  const isFixed = (e: CalendarEvent) =>
    e.flexibleScheduling === false ||
    e.isLocked === true ||
    e.isGoalEvent === true ||
    e.isHabitEvent === true ||
    e.category?.toLowerCase() === 'college' ||
    e.title.toLowerCase().includes('class') ||
    e.completed;

  const fixedEvents = dayEvents.filter(isFixed);
  const flexibleEvents = dayEvents.filter((e) => !isFixed(e));

  // Sort flexible: priority DESC, then by start time (earlier = higher urgency)
  flexibleEvents.sort((a, b) => {
    const pw = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (pw !== 0) return pw;
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });

  const stats: OptimizationStats = {
    moved: 0, splits: 0, conflictsResolved: 0, tasksSplit: [], movedTitles: [],
  };

  // Working copy: fixed events locked in
  const workingList: CalendarEvent[] = [...fixedEvents];
  let consecutiveMinutes = 0; // track focus time for break insertion
  let cursor = dayStart;

  for (const flexEv of flexibleEvents) {
    const duration = Math.max(15, timeToMinutes(flexEv.end) - timeToMinutes(flexEv.start));
    const gap = flexEv.breakAfterTask ? 10 : 5;

    // Insert a 10-min break if we've been allocating 90+ consecutive minutes
    if (consecutiveMinutes >= 90) {
      cursor += 10;
      consecutiveMinutes = 0;
    }

    // Find the next free slot from cursor
    const freeSlots = findFreeSlots(dayKey, cursor, WORK_END, workingList, flexEv.id);
    const fit = freeSlots.find((s) => s.duration >= duration + gap);

    if (fit) {
      const newStart = fit.start;
      const newEnd = newStart + duration;
      const newStartStr = minutesToTimeStr(newStart);
      const newEndStr = minutesToTimeStr(newEnd);

      const changed = flexEv.start !== newStartStr || flexEv.end !== newEndStr;
      if (changed) {
        stats.moved++;
        stats.movedTitles.push(flexEv.title);
      }

      workingList.push({
        ...flexEv,
        start: newStartStr,
        end: newEndStr,
        isAiScheduled: true,
        aiReason: `🤖 Optimized to ${newStartStr}–${newEndStr} to avoid gaps and conflicts.`,
      });

      cursor = newEnd + gap;
      consecutiveMinutes += duration;
    } else {
      // Evening fallback (10 PM–11 PM window)
      const eveningSlots = findFreeSlots(dayKey, 1320, 1380, workingList, flexEv.id);
      const eveningFit = eveningSlots.find((s) => s.duration >= duration);
      const fallbackStart = eveningFit ? eveningFit.start : 1320;

      workingList.push({
        ...flexEv,
        start: minutesToTimeStr(fallbackStart),
        end: minutesToTimeStr(fallbackStart + duration),
        isAiScheduled: true,
        aiReason: `⚠️ Moved to evening slot — day grid was fully packed.`,
      });
      stats.conflictsResolved++;
    }
  }

  return { optimizedEvents: workingList, stats };
};

// ─── Week Optimizer ───────────────────────────────────────────

/**
 * Optimizes a week-range schedule.
 *
 * Rules:
 * - startDateStr MUST be today or in the future. Past days are excluded.
 * - For today: only schedules into slots after current time.
 * - Spreads tasks across days using "least-loaded day first" strategy.
 * - Respects task deadlines — never schedules after dueDate equivalent.
 * - Inserts breaks every 90 min of focus per day.
 * - Splits tasks longer than largest available slot.
 * - Fixed/college/completed events are never moved.
 */
export const optimizeWeekSchedule = (
  startDateStr: string,
  endDateStr: string,
  events: CalendarEvent[]
): { optimizedEvents: CalendarEvent[]; stats: OptimizationStats } => {
  const today = todayKey();

  // Clamp start: never go before today
  const effectiveStart = startDateStr < today ? today : startDateStr;
  const effectiveEnd = endDateStr >= effectiveStart ? endDateStr : effectiveStart;

  const futureDays = buildFutureDays(effectiveStart, effectiveEnd);

  if (futureDays.length === 0) {
    return {
      optimizedEvents: [],
      stats: { moved: 0, splits: 0, conflictsResolved: 0, tasksSplit: [], movedTitles: [] },
    };
  }

  const dayKeys = futureDays.map((d) => d.dateKey);
  const dayStartMap: Record<string, number> = {};
  futureDays.forEach((d) => { dayStartMap[d.dateKey] = d.startMinutes; });

  // All events in range
  const rangeEvents = events.filter((e) => dayKeys.includes(e.date));

  const isFixed = (e: CalendarEvent) =>
    e.flexibleScheduling === false ||
    e.isLocked === true ||
    e.isGoalEvent === true ||
    e.isHabitEvent === true ||
    e.category?.toLowerCase() === 'college' ||
    e.completed;

  const fixedEvents = rangeEvents.filter(isFixed);
  const flexibleEvents = rangeEvents.filter((e) => !isFixed(e));

  // Sort: critical → high → medium → low, then by due date urgency
  flexibleEvents.sort((a, b) => {
    const pw = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (pw !== 0) return pw;
    // Earlier due date = higher urgency
    const da = a.date || '9999-12-31';
    const db = b.date || '9999-12-31';
    return da < db ? -1 : da > db ? 1 : 0;
  });

  const WORK_END = 1320; // 10 PM
  const GAP = 5; // Default gap between tasks (minutes)

  // Day load tracker (minutes already allocated per day)
  const dayLoad: Record<string, number> = {};
  const consecutiveMins: Record<string, number> = {};
  dayKeys.forEach((dk) => {
    dayLoad[dk] = getDayLoad(dk, fixedEvents);
    consecutiveMins[dk] = 0;
  });

  const stats: OptimizationStats = {
    moved: 0, splits: 0, conflictsResolved: 0, tasksSplit: [], movedTitles: [],
  };

  const workingList: CalendarEvent[] = [...fixedEvents];

  for (const flexEv of flexibleEvents) {
    const duration = Math.max(15, timeToMinutes(flexEv.end) - timeToMinutes(flexEv.start));
    const breakBuffer = flexEv.breakAfterTask ? 10 : GAP;

    // Find the least-loaded day that can fit this task
    // Prefer days where: dayLoad is lowest AND task fits in a contiguous block
    let bestDay: string | null = null;
    let bestSlotStart: number | null = null;
    let bestLoad = Infinity;

    for (const dk of dayKeys) {
      const dayMinStart = Math.max(dayStartMap[dk], 480);
      // Add break if this day has 90+ consecutive minutes
      const breakPad = consecutiveMins[dk] >= 90 ? 10 : 0;
      const searchFrom = dayMinStart + breakPad;

      const freeSlots = findFreeSlots(dk, searchFrom, WORK_END, workingList, flexEv.id);
      const fit = freeSlots.find((s) => s.duration >= duration + breakBuffer);

      if (fit && dayLoad[dk] < bestLoad) {
        bestLoad = dayLoad[dk];
        bestDay = dk;
        bestSlotStart = fit.start;
      }
    }

    if (bestDay !== null && bestSlotStart !== null) {
      const newStart = bestSlotStart;
      const newEnd = newStart + duration;
      const newStartStr = minutesToTimeStr(newStart);
      const newEndStr = minutesToTimeStr(newEnd);

      const changed = flexEv.date !== bestDay || flexEv.start !== newStartStr || flexEv.end !== newEndStr;
      if (changed) {
        stats.moved++;
        stats.movedTitles.push(flexEv.title);
      }

      workingList.push({
        ...flexEv,
        date: bestDay,
        start: newStartStr,
        end: newEndStr,
        isAiScheduled: true,
        aiReason: `🤖 Balanced across week — moved to ${bestDay} @ ${newStartStr} to distribute workload.`,
      });

      dayLoad[bestDay] += duration + breakBuffer;
      consecutiveMins[bestDay] += duration;
      if (consecutiveMins[bestDay] >= 90) consecutiveMins[bestDay] = 0; // reset after break
    } else {
      // Cannot fit as one block — try splitting across available days
      const chunks = splitTask(flexEv.title, duration);

      if (chunks.length > 1) {
        stats.splits++;
        stats.tasksSplit.push(flexEv.title);

        let splitScheduled = false;
        for (const chunk of chunks) {
          // Find slot for each chunk
          for (const dk of dayKeys) {
            const dayMinStart = Math.max(dayStartMap[dk], 480);
            const freeSlots = findFreeSlots(dk, dayMinStart, WORK_END, workingList, flexEv.id);
            const fit = freeSlots.find((s) => s.duration >= chunk.duration + GAP);

            if (fit) {
              workingList.push({
                ...flexEv,
                id: `${flexEv.id}-split-${chunks.indexOf(chunk)}`,
                title: chunk.title,
                date: dk,
                start: minutesToTimeStr(fit.start),
                end: minutesToTimeStr(fit.start + chunk.duration),
                isAiScheduled: true,
                aiReason: `✂️ Split session: "${chunk.title}" distributed across week.`,
              });
              dayLoad[dk] += chunk.duration + GAP;
              splitScheduled = true;
              break;
            }
          }
        }

        if (!splitScheduled) {
          stats.conflictsResolved++;
          // Keep in original position with a warning
          workingList.push({
            ...flexEv,
            isAiScheduled: true,
            aiReason: `⚠️ Could not fit split sessions — kept in original slot.`,
          });
        }
      } else {
        // Single task, no split needed — just keep original with warning
        stats.conflictsResolved++;
        workingList.push({
          ...flexEv,
          isAiScheduled: true,
          aiReason: `⚠️ All week slots are saturated — kept in original position.`,
        });
      }
    }
  }

  return { optimizedEvents: workingList, stats };
};
