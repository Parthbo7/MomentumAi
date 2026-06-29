import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, Plus, MapPin, User, Clock, Award, FileText, Sparkles, RefreshCw, Lock
} from 'lucide-react';
import { getConflictSuggestions, timeToMinutes } from './aiScheduler';

// ─── Interfaces ───────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  accent: 'lavender' | 'amber' | 'sky' | 'emerald' | 'rose';
  deadline?: boolean;
  description?: string;
  faculty?: string;
  location?: string;
  category?: string;
  attachments?: string[];
  completed?: boolean;
  notes?: string;
  checklist?: { text: string; completed: boolean }[];
  linkedAssignment?: string;
  googleCalendarLink?: string;
  participants?: string[];
  xpReward?: number;
  type?: 'Event' | 'Task' | 'Assignment' | 'Routine' | 'Study' | 'Workout' | 'Break' | 'Meeting' | 'Reminder' | 'Class' | 'Habit' | 'AI Block';
  isRecurring?: boolean;
  recurrenceRule?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'biweekly' | 'monthly' | 'custom-days' | 'custom-weeks' | 'semester';
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  recurrenceUntil?: string;
  repeatSeriesId?: string;
  isException?: boolean;
  exceptionDates?: string[];
  startTime?: any;
  endTime?: any;
  isAiScheduled?: boolean;
  aiReason?: string;
  flexibleScheduling?: boolean;
  breakAfterTask?: boolean;
  rescheduleCount?: number;
  progress?: number;
  emoji?: string;
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
  isLocked?: boolean;
  lastModifiedByUser?: 'ui' | 'drag' | 'optimizer' | null;
}

interface CalendarGridProps {
  view: 'day' | 'week';
  events: CalendarEvent[];
  days: Date[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  currentTime: Date;
  gridRef: React.RefObject<HTMLDivElement | null>;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  setSelectedEventExpanded: (exp: boolean) => void;
  draggedEventId: string | null;
  hoveredDay: string | null;
  hoveredTimeMinutes: number | null;
  onEventPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    eventId: string,
    mode: 'drag' | 'resize-top' | 'resize-bottom',
    initialDate: string,
    top: number,
    height: number
  ) => void;
  onEventPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onEventPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCreateQuickEvent: (date: string, timeMinutes: number) => void;
  onOpenModalAtSlot: (date: string, start: string, end: string) => void;
  onDuplicateEvent: (ev: CalendarEvent) => void;
  conflicts: string[];
  onOpenEditModal: (event: CalendarEvent) => void;
  handleMoveAutomatically?: (event: CalendarEvent, altSlot: { start: string; end: string }) => Promise<void>;
}

// ─── Grid Constants ────────────────────────────────────────────
export const HOUR_HEIGHT = 80;        // px per hour — the single source of truth
export const GRID_START_MINS = 420;   // 7:00 AM
export const GRID_END_MINS   = 1320;  // 10:00 PM (22:00)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // [7, 8, … 21]

// ─── Positioning Helpers ──────────────────────────────────────

/** Pixel offset from grid top for a given minute value */
const minToY = (mins: number): number =>
  ((mins - GRID_START_MINS) / 60) * HOUR_HEIGHT;

/** Pixel height for a duration in minutes */
const durToH = (startMins: number, endMins: number): number =>
  Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 22);

// ─── Formatted helpers ────────────────────────────────────────
const formatMinutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMins = mins < 10 ? `0${mins}` : mins;
  return `${displayHours}:${displayMins} ${ampm}`;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

// ─── Column Overlap Algorithm ──────────────────────────────────
interface ColInfo { col: number; totalCols: number; }

function computeEventColumns(dayEvents: CalendarEvent[]): Map<string, ColInfo> {
  const result = new Map<string, ColInfo>();
  if (dayEvents.length === 0) return result;

  const sorted = [...dayEvents].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  // Group events into overlapping clusters
  const clusters: CalendarEvent[][] = [];
  for (const ev of sorted) {
    const evS = timeToMinutes(ev.start);
    const evE = timeToMinutes(ev.end);
    let merged = false;
    for (const cluster of clusters) {
      const overlapsCluster = cluster.some((ce) => {
        const cs = timeToMinutes(ce.start);
        const ce2 = timeToMinutes(ce.end);
        return evS < ce2 && cs < evE;
      });
      if (overlapsCluster) { cluster.push(ev); merged = true; break; }
    }
    if (!merged) clusters.push([ev]);
  }

  // Assign columns within each cluster
  for (const cluster of clusters) {
    const clSorted = [...cluster].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );
    const colEnds: number[] = [];
    const evCols = new Map<string, number>();

    for (const ev of clSorted) {
      const sM = timeToMinutes(ev.start);
      const eM = timeToMinutes(ev.end);
      let col = colEnds.findIndex((e) => e <= sM);
      if (col === -1) { col = colEnds.length; colEnds.push(eM); }
      else colEnds[col] = eM;
      evCols.set(ev.id, col);
    }

    const totalCols = colEnds.length;
    for (const ev of cluster) {
      result.set(ev.id, { col: evCols.get(ev.id) ?? 0, totalCols });
    }
  }

  return result;
}

// ─── Event Type Identity ───────────────────────────────────────
interface EventTypeConfig {
  borderClass: string;
  bgClass: string;
  textClass: string;
  mutedClass: string;
  badge: string;
  badgeBg: string;
  emoji: string;
}

function getEventTypeConfig(event: CalendarEvent): EventTypeConfig {
  // Goal events
  if (event.isGoalEvent) {
    if (event.goalSchedulingType === 'fixed') {
      return { borderClass: 'border-l-blue-500', bgClass: 'bg-blue-100 dark:bg-blue-900/60', textClass: 'text-blue-900 dark:text-blue-100', mutedClass: 'text-blue-600 dark:text-blue-300', badge: '🔒', badgeBg: 'bg-blue-600', emoji: '📚' };
    }
    return { borderClass: 'border-l-purple-500', bgClass: 'bg-purple-100 dark:bg-purple-900/60', textClass: 'text-purple-900 dark:text-purple-100', mutedClass: 'text-purple-600 dark:text-purple-300', badge: '📚', badgeBg: 'bg-purple-600', emoji: '📚' };
  }
  // Habit events
  if (event.isHabitEvent) {
    return { borderClass: 'border-l-emerald-500', bgClass: 'bg-emerald-100 dark:bg-emerald-900/60', textClass: 'text-emerald-900 dark:text-emerald-100', mutedClass: 'text-emerald-600 dark:text-emerald-300', badge: '🔥', badgeBg: 'bg-emerald-600', emoji: '🔥' };
  }
  if (event.googleCalendarLink) return { borderClass: 'border-l-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950/40', textClass: 'text-blue-900 dark:text-blue-100', mutedClass: 'text-blue-600 dark:text-blue-300', badge: 'G', badgeBg: 'bg-blue-500', emoji: '🗓' };
  if (event.isAiScheduled) return { borderClass: 'border-l-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950/40', textClass: 'text-purple-900 dark:text-purple-100', mutedClass: 'text-purple-600 dark:text-purple-300', badge: '✨', badgeBg: 'bg-purple-500', emoji: '✨' };
  const cat = (event.category || '').toLowerCase();
  const t = (event.type || '').toLowerCase();
  if (cat === 'assignments' || cat === 'assignment' || t === 'assignment') return { borderClass: 'border-l-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950/40', textClass: 'text-orange-900 dark:text-orange-100', mutedClass: 'text-orange-600 dark:text-orange-300', badge: '📚', badgeBg: 'bg-orange-500', emoji: '📚' };
  if (cat === 'gym' || cat === 'workout' || t === 'workout') return { borderClass: 'border-l-green-400', bgClass: 'bg-green-50 dark:bg-green-950/40', textClass: 'text-green-900 dark:text-green-100', mutedClass: 'text-green-600 dark:text-green-300', badge: '💪', badgeBg: 'bg-green-500', emoji: '💪' };
  if (cat === 'meeting' || t === 'meeting') return { borderClass: 'border-l-sky-400', bgClass: 'bg-sky-50 dark:bg-sky-950/40', textClass: 'text-sky-900 dark:text-sky-100', mutedClass: 'text-sky-600 dark:text-sky-300', badge: '🤝', badgeBg: 'bg-sky-500', emoji: '🤝' };
  if (cat === 'college' || cat === 'class' || t === 'class') return { borderClass: 'border-l-indigo-400', bgClass: 'bg-indigo-50 dark:bg-indigo-950/40', textClass: 'text-indigo-900 dark:text-indigo-100', mutedClass: 'text-indigo-600 dark:text-indigo-300', badge: '🎓', badgeBg: 'bg-indigo-500', emoji: '🎓' };
  if (cat === 'personal' || t === 'habit') return { borderClass: 'border-l-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950/40', textClass: 'text-pink-900 dark:text-pink-100', mutedClass: 'text-pink-600 dark:text-pink-300', badge: '👤', badgeBg: 'bg-pink-500', emoji: '👤' };
  if (cat === 'break' || t === 'break') return { borderClass: 'border-l-gray-300', bgClass: 'bg-gray-50 dark:bg-gray-900/40', textClass: 'text-gray-700 dark:text-gray-200', mutedClass: 'text-gray-500 dark:text-gray-400', badge: '☕', badgeBg: 'bg-gray-400', emoji: '☕' };
  // accent-based fallback
  const accentMap: Record<string, Omit<EventTypeConfig, 'badge' | 'badgeBg' | 'emoji'>> = {
    lavender: { borderClass: 'border-l-violet-400', bgClass: 'bg-violet-50 dark:bg-violet-950/40', textClass: 'text-violet-900 dark:text-violet-100', mutedClass: 'text-violet-600 dark:text-violet-300' },
    amber:    { borderClass: 'border-l-amber-400',  bgClass: 'bg-amber-50 dark:bg-amber-950/40',   textClass: 'text-amber-900 dark:text-amber-100',  mutedClass: 'text-amber-600 dark:text-amber-300' },
    sky:      { borderClass: 'border-l-sky-400',    bgClass: 'bg-sky-50 dark:bg-sky-950/40',       textClass: 'text-sky-900 dark:text-sky-100',      mutedClass: 'text-sky-600 dark:text-sky-300' },
    emerald:  { borderClass: 'border-l-emerald-400',bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',textClass: 'text-emerald-900 dark:text-emerald-100',mutedClass: 'text-emerald-600 dark:text-emerald-300' },
    rose:     { borderClass: 'border-l-rose-400',   bgClass: 'bg-rose-50 dark:bg-rose-950/40',     textClass: 'text-rose-900 dark:text-rose-100',    mutedClass: 'text-rose-600 dark:text-rose-300' },
  };
  const acc = accentMap[event.accent] ?? accentMap.lavender;
  return { ...acc, badge: '📌', badgeBg: 'bg-violet-500', emoji: '📌' };
}

// ─── Priority Dot ─────────────────────────────────────────────
const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500 animate-pulse',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-400',
};

// ─── Main Component ────────────────────────────────────────────
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  view,
  events,
  days,
  selectedDate,
  setSelectedDate,
  currentTime,
  gridRef,
  selectedEventId,
  setSelectedEventId: _setSelectedEventId,
  setSelectedEventExpanded: _setSelectedEventExpanded,
  draggedEventId,
  hoveredDay,
  hoveredTimeMinutes,
  onEventPointerDown,
  onEventPointerMove,
  onEventPointerUp,
  onCreateQuickEvent,
  onOpenModalAtSlot,
  onDuplicateEvent,
  conflicts,
  onOpenEditModal,
  handleMoveAutomatically,
}) => {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ date: string; mins: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [copiedEvent, setCopiedEvent] = useState<CalendarEvent | null>(null);

  // Keyboard copy/paste
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedEventId) {
        const ev = events.find((x) => x.id === selectedEventId);
        if (ev) setCopiedEvent(ev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && copiedEvent) {
        onDuplicateEvent({ ...copiedEvent, date: formatDateKey(selectedDate), start: '10:00 AM', end: '11:00 AM' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEventId, copiedEvent, events, selectedDate, onDuplicateEvent]);

  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const showTimeLine = nowMins >= GRID_START_MINS && nowMins <= GRID_END_MINS;
  const timeLineTop = showTimeLine ? minToY(nowMins) : 0;
  const currentHour = currentTime.getHours();

  const isWeek = view === 'week';

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 16, y: e.clientY + 8 });
  };

  // Pre-compute column info per day
  const colInfoByDay = useMemo(() => {
    const map = new Map<string, Map<string, ColInfo>>();
    for (const day of days) {
      const dk = formatDateKey(day);
      const dayEvs = events.filter((ev) => ev.date === dk);
      map.set(dk, computeEventColumns(dayEvs));
    }
    return map;
  }, [events, days]);

  return (
    <div
      ref={gridRef}
      onPointerMove={onEventPointerMove}
      onPointerUp={onEventPointerUp}
      className="app-surface overflow-hidden p-0 relative select-none"
      onMouseMove={handleMouseMove}
    >
      {/* ── Day Header Row ──────────────────────────────────── */}
      <div
        className={`grid ${isWeek ? 'grid-cols-[72px_repeat(7,minmax(0,1fr))]' : 'grid-cols-[72px_1fr]'} sticky top-0 z-20 border-b border-[#E5E7EB] dark:border-white/8 bg-[#FAFAFA] dark:bg-[#151722]`}
      >
        <div className="border-r border-[#E5E7EB] dark:border-white/8 px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 flex items-end justify-end pb-3">
          GMT+5
        </div>
        {days.map((day) => {
          const isToday = sameDay(day, new Date());
          const isSelected = sameDay(day, selectedDate);
          const dk = formatDateKey(day);
          const dayEventCount = events.filter((e) => e.date === dk).length;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={dk}
              onClick={() => setSelectedDate(day)}
              className={`border-r border-[#E5E7EB] dark:border-white/8 px-2 py-2.5 last:border-r-0 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isWeekend ? 'bg-gray-50/60 dark:bg-white/[0.015]' : ''
              } hover:bg-purple-500/[0.04]`}
            >
              <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)}
              </p>
              <motion.span
                animate={isSelected ? { scale: [1, 1.12, 1.08] } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold transition-all ${
                  isToday
                    ? 'bg-[#6D4AFF] text-white shadow-[0_0_18px_rgba(109,74,255,0.5)]'
                    : isSelected
                    ? 'bg-[#8B5CF6]/80 text-white'
                    : 'text-gray-700 dark:text-white hover:bg-purple-500/10'
                }`}
              >
                {day.getDate()}
              </motion.span>
              {dayEventCount > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: Math.min(dayEventCount, 4) }).map((_, i) => (
                    <span key={i} className="w-1 h-1 rounded-full bg-purple-400 opacity-60" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Scrollable Body: Hour Grid + Events ────────────── */}
      <div
        className={`grid ${isWeek ? 'grid-cols-[72px_repeat(7,minmax(0,1fr))]' : 'grid-cols-[72px_1fr]'} relative overflow-y-auto max-h-[calc(100vh-220px)] soft-scrollbar`}
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* Left: Hour Labels */}
        <div className="border-r border-[#E5E7EB] dark:border-white/8 bg-[#FAFAFA] dark:bg-[#151722] relative z-10">
          {HOURS.map((hour) => {
            const isCurrentHour = hour === currentHour;
            return (
              <div
                key={hour}
                className={`flex items-start justify-end border-b border-[#F0F2F6] dark:border-white/[0.05] px-2 pt-1 text-[10px] font-semibold transition-colors ${
                  isCurrentHour
                    ? 'text-purple-500 dark:text-purple-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {formatMinutesToTime(hour * 60)}
              </div>
            );
          })}
        </div>

        {/* Day Columns */}
        {days.map((day) => {
          const dk = formatDateKey(day);
          const dayEvents = events.filter((ev) => ev.date === dk);
          const isTodayColumn = sameDay(day, new Date());
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const dayColInfo = colInfoByDay.get(dk) ?? new Map<string, ColInfo>();

          // Drag ghost duration in pixels
          const draggedEv = draggedEventId ? events.find((e) => e.id === draggedEventId) : null;
          const ghostHeight = draggedEv
            ? durToH(timeToMinutes(draggedEv.start), timeToMinutes(draggedEv.end))
            : HOUR_HEIGHT;

          return (
            <div
              key={`col-${dk}`}
              className={`relative border-r border-[#E5E7EB] dark:border-white/8 last:border-r-0 ${
                isTodayColumn ? 'bg-purple-500/[0.025]' : ''
              } ${isWeekend ? 'bg-gray-50/40 dark:bg-white/[0.008]' : ''} ${
                draggedEventId && hoveredDay === dk ? 'bg-cyan-500/[0.04]' : ''
              }`}
            >
              {/* Hour rows (click to add) */}
              {HOURS.map((hour) => {
                const halfHourMins = hour * 60;
                const fullHourMins = hour * 60 + 30;
                const isCurrentHour = isTodayColumn && hour === currentHour;

                return (
                  <div
                    key={`${dk}-${hour}`}
                    className={`relative border-b border-[#F0F2F6] dark:border-white/[0.05] last:border-b-0 transition-colors ${
                      isCurrentHour ? 'bg-purple-400/[0.06]' : ''
                    }`}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {/* Top half (on-the-hour) */}
                    <div
                      onClick={() =>
                        onOpenModalAtSlot(
                          dk,
                          formatMinutesToTime(halfHourMins),
                          formatMinutesToTime(halfHourMins + 30)
                        )
                      }
                      onDoubleClick={() => onCreateQuickEvent(dk, halfHourMins - GRID_START_MINS)}
                      onMouseEnter={() => setHoveredSlot({ date: dk, mins: halfHourMins })}
                      onMouseLeave={() => setHoveredSlot(null)}
                      className="absolute top-0 left-0 right-0 h-1/2 cursor-pointer group/slot flex items-center justify-start pl-2"
                    >
                      <AnimatePresence>
                        {hoveredSlot?.date === dk && hoveredSlot?.mins === halfHourMins && (
                          <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="flex items-center gap-1 text-[9px] font-bold text-purple-400 pointer-events-none"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{formatMinutesToTime(halfHourMins)}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Bottom half (30-min mark) */}
                    <div
                      onClick={() =>
                        onOpenModalAtSlot(
                          dk,
                          formatMinutesToTime(fullHourMins),
                          formatMinutesToTime(fullHourMins + 30)
                        )
                      }
                      onDoubleClick={() => onCreateQuickEvent(dk, fullHourMins - GRID_START_MINS)}
                      onMouseEnter={() => setHoveredSlot({ date: dk, mins: fullHourMins })}
                      onMouseLeave={() => setHoveredSlot(null)}
                      className="absolute bottom-0 left-0 right-0 h-1/2 cursor-pointer border-t border-dashed border-[#E5E7EB]/60 dark:border-white/[0.04] group/slot flex items-center justify-start pl-2"
                    >
                      <AnimatePresence>
                        {hoveredSlot?.date === dk && hoveredSlot?.mins === fullHourMins && (
                          <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="flex items-center gap-1 text-[9px] font-bold text-purple-400 pointer-events-none"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{formatMinutesToTime(fullHourMins)}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}

              {/* Current Time Line */}
              {isTodayColumn && showTimeLine && (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                  style={{ top: `${timeLineTop}px` }}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  <div className="flex-1 h-[1.5px] bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                  <span className="text-[9px] font-black text-red-500 px-1 shrink-0 bg-white dark:bg-[#171923] rounded">
                    {formatMinutesToTime(nowMins)}
                  </span>
                </div>
              )}

              {/* Drag Ghost Preview */}
              {draggedEventId && hoveredDay === dk && hoveredTimeMinutes !== null && (
                <div
                  className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.3)] pointer-events-none z-20 flex items-center justify-center"
                  style={{ top: `${hoveredTimeMinutes}px`, height: `${ghostHeight}px` }}
                >
                  <span className="text-[10px] font-bold text-cyan-400">
                    {formatMinutesToTime(GRID_START_MINS + Math.round(hoveredTimeMinutes / HOUR_HEIGHT * 60))}
                  </span>
                </div>
              )}

              {/* ── Event Cards ─────────────────────────────── */}
              {dayEvents.map((event) => {
                const startMins = timeToMinutes(event.start);
                const endMins   = timeToMinutes(event.end);

                // Clamp to grid bounds — skip if entirely outside
                if (endMins <= GRID_START_MINS || startMins >= GRID_END_MINS) return null;
                const clampedStart = Math.max(startMins, GRID_START_MINS);
                const clampedEnd   = Math.min(endMins, GRID_END_MINS);

                const top    = minToY(clampedStart);
                const height = durToH(clampedStart, clampedEnd);

                const colInfo = dayColInfo.get(event.id) ?? { col: 0, totalCols: 1 };
                const cfg     = getEventTypeConfig(event);

                const isSelected  = selectedEventId === event.id;
                const hasConflict = conflicts.includes(event.id);
                const isDragged   = draggedEventId === event.id;

                // Column geometry
                const SIDE_PAD = 4; // px from each side of column
                const colW = `calc(${(1 / colInfo.totalCols) * 100}% - ${SIDE_PAD * 2}px)`;
                const colL = `calc(${(colInfo.col / colInfo.totalCols) * 100}% + ${SIDE_PAD}px)`;

                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={event.isAiScheduled ? { opacity: 0, scale: 0.95, y: 4 } : false}
                    animate={{ opacity: isDragged ? 0.55 : 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26, duration: 0.25 }}
                    onPointerDown={(e) => onEventPointerDown(e, event.id, 'drag', dk, top, height)}
                    onDoubleClick={() => onOpenEditModal(event)}
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    className={`absolute cursor-grab active:cursor-grabbing z-10 rounded-lg border-l-[3px] shadow-sm transition-all duration-150 group/card overflow-hidden ${cfg.borderClass} ${cfg.bgClass} ${
                      isSelected ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-[#171923] z-20' : ''
                    } ${isDragged ? 'pointer-events-none z-40 opacity-50' : ''} ${
                      hasConflict ? 'ring-2 ring-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]' : ''
                    } hover:shadow-md hover:z-20 hover:brightness-[1.03]`}
                    style={{
                      top: `${top + 1}px`,
                      height: `${height - 2}px`,
                      left: colL,
                      width: colW,
                    }}
                  >
                    {/* AI Scheduled glow animation on mount */}
                    {event.isAiScheduled && (
                      <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 2, delay: 0.3 }}
                        className="absolute inset-0 rounded-lg bg-purple-400/20 pointer-events-none"
                      />
                    )}

                    {/* Card Content — density based on height */}
                    <div className="h-full flex flex-col px-1.5 py-1 overflow-hidden select-none">

                      {/* Always: title row */}
                      <div className="flex items-start gap-1 min-w-0">
                        {/* Priority dot */}
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${PRIORITY_DOT[event.priority] ?? 'bg-gray-400'}`}
                        />
                        {/* Lock icon for fixed events */}
                        {(event.flexibleScheduling === false || event.isGoalEvent || event.isHabitEvent) && (
                          <div className="group/lock relative shrink-0 mt-0.5">
                            <Lock className="h-2.5 w-2.5 text-blue-300" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[9px] font-semibold rounded-md whitespace-nowrap opacity-0 group-hover/lock:opacity-100 pointer-events-none transition-opacity z-50">
                              Fixed Schedule – Only changes when you edit it.
                            </div>
                          </div>
                        )}
                        <p className={`text-[10px] font-extrabold leading-tight truncate flex-1 min-w-0 ${cfg.textClass}`}>
                          {event.title}
                        </p>
                        {/* Type badge (top-right) */}
                        {height >= 30 && (
                          <span className={`shrink-0 text-[8px] font-black text-white ${cfg.badgeBg} px-1 py-0.5 rounded-sm leading-none`}>
                            {cfg.badge}
                          </span>
                        )}
                      </div>

                      {/* Height ≥ 36: show time range */}
                      {height >= 36 && (
                        <div className={`flex items-center gap-0.5 mt-0.5 ${cfg.mutedClass}`}>
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          <span className="text-[9px] font-semibold truncate">
                            {event.start} – {event.end}
                          </span>
                        </div>
                      )}

                      {/* Height ≥ 60: category + recurring badge */}
                      {height >= 60 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {event.category && (
                            <span className={`text-[8px] font-bold uppercase tracking-wide ${cfg.mutedClass} truncate`}>
                              {event.category}
                            </span>
                          )}
                          {event.isRecurring && (
                            <RefreshCw className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                          )}
                          {hasConflict && (
                            <span className="text-[8px] font-black text-red-500 shrink-0">⚠️</span>
                          )}
                        </div>
                      )}

                      {/* Height ≥ 90: progress bar */}
                      {height >= 90 && event.progress !== undefined && event.progress > 0 && (
                        <div className="mt-auto pt-1">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${cfg.badgeBg} rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${event.progress}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                              />
                            </div>
                            <span className={`text-[8px] font-black ${cfg.mutedClass} shrink-0`}>
                              {event.progress}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Height ≥ 100: XP reward */}
                      {height >= 100 && event.xpReward && (
                        <div className={`flex items-center gap-0.5 text-[8px] font-bold ${cfg.mutedClass}`}>
                          <Award className="h-2.5 w-2.5" />
                          <span>+{event.xpReward} XP</span>
                        </div>
                      )}
                    </div>

                    {/* Completed overlay */}
                    {event.completed && (
                      <div className="absolute inset-0 rounded-lg bg-white/40 dark:bg-black/40 flex items-center justify-center">
                        <div className="text-green-600 dark:text-green-400 text-[10px] font-black">✓ Done</div>
                      </div>
                    )}

                    {/* Resize handles */}
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); onEventPointerDown(e, event.id, 'resize-top', dk, top, height); }}
                      className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); onEventPointerDown(e, event.id, 'resize-bottom', dk, top, height); }}
                      className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-30"
                    />
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Hover Tooltip ──────────────────────────────────── */}
      <AnimatePresence>
        {hoveredEventId && (() => {
          const ev = events.find((x) => x.id === hoveredEventId);
          if (!ev) return null;
          const cfg = getEventTypeConfig(ev);
          const durationMins = timeToMinutes(ev.end) - timeToMinutes(ev.start);

          return (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
              className="z-[999] pointer-events-auto w-72 rounded-2xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-[#1D1F2D]/95 backdrop-blur-xl p-4 shadow-2xl text-xs flex flex-col gap-2.5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[ev.priority] ?? 'bg-gray-400'}`} />
                  <span className={`font-bold text-sm truncate ${cfg.textClass}`}>{ev.emoji} {ev.title}</span>
                </div>
                <span className={`shrink-0 text-[9px] font-black text-white ${cfg.badgeBg} px-1.5 py-0.5 rounded-full uppercase tracking-wide`}>
                  {ev.category || ev.type || 'Event'}
                </span>
              </div>

              {/* Time & duration */}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span>{ev.start} – {ev.end}</span>
                <span className="text-gray-400 dark:text-gray-600">·</span>
                <span className="font-semibold">{durationMins}m</span>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <AlertCircle className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span className="capitalize font-semibold">{ev.priority} priority</span>
              </div>

              {ev.location && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>{ev.location}</span>
                </div>
              )}

              {ev.faculty && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <User className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>Faculty: {ev.faculty}</span>
                </div>
              )}

              {/* Progress bar */}
              {ev.progress !== undefined && ev.progress > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Progress</span>
                    <span className={`text-[10px] font-black ${cfg.mutedClass}`}>{ev.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cfg.badgeBg} rounded-full transition-all duration-500`}
                      style={{ width: `${ev.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {ev.xpReward && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Award className="h-3.5 w-3.5 shrink-0" />
                  <span>+{ev.xpReward} XP on completion</span>
                </div>
              )}

              {/* AI reason */}
              {ev.isAiScheduled && ev.aiReason && (
                <div className="border-t border-purple-200/40 dark:border-purple-800/40 pt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-300 font-bold text-[10px]">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span>Scheduled by AI</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-4 leading-relaxed">{ev.aiReason}</p>
                </div>
              )}

              {/* Description */}
              {ev.description && (
                <div className="border-t border-gray-100 dark:border-white/8 pt-2 flex gap-1.5 items-start text-gray-500 dark:text-gray-400">
                  <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                  <p className="line-clamp-2 leading-snug text-[10px]">{ev.description}</p>
                </div>
              )}

              {/* Conflict suggestions */}
              {conflicts.includes(ev.id) && (
                <div className="border-t border-red-200/50 dark:border-red-900/40 pt-2 space-y-1.5">
                  <div className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>Time conflict detected</span>
                  </div>
                  <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">Suggested Slots:</div>
                  <div className="flex flex-col gap-1">
                    {getConflictSuggestions(ev.date, timeToMinutes(ev.end) - timeToMinutes(ev.start), events, ev.id)
                      .slice(0, 3)
                      .map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={async (e) => { e.stopPropagation(); if (handleMoveAutomatically) await handleMoveAutomatically(ev, { start: sug.start, end: sug.end }); }}
                          className="w-full text-left bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center justify-between"
                        >
                          <span>{sug.date} @ {sug.start}</span>
                          <span className="text-[8px] font-black uppercase text-purple-500">Apply →</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
