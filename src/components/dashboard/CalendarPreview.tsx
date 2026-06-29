import { memo, useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TODAY, formatDateKey, sameDay, timeToMinutes } from './helpers';
import type { CalendarEvent } from './types';

interface CalendarPreviewProps {
  events: CalendarEvent[];
  tasks: { dueDate?: string }[];
  goals?: { dueDate?: string }[];
  habits?: { dueDate?: string }[];
  onEventClick?: (event: CalendarEvent) => void;
}

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const EVENT_DOT_COLORS: Record<string, string> = {
  task: 'bg-[#6D4AFF]',
  goal: 'bg-cyan-400',
  habit: 'bg-emerald-400',
  deadline: 'bg-red-400',
  meeting: 'bg-amber-400',
};

function getDaysInMonth(year: number, month: number): Date[] {
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getEventTypesForDate(
  date: Date,
  events: CalendarEvent[],
  tasks: { dueDate?: string }[],
  goals: { dueDate?: string }[],
  habits: { dueDate?: string }[]
): string[] {
  const dateKey = formatDateKey(date);
  const types: string[] = [];

  if (events.some((e) => e.date === dateKey)) types.push('meeting');
  if (tasks.some((t) => t.dueDate === dateKey)) types.push('task');
  if (goals.some((g) => g.dueDate === dateKey)) types.push('goal');
  if (habits.some((h) => h.dueDate === dateKey)) types.push('habit');
  if (events.some((e) => e.date === dateKey && e.deadline)) types.push('deadline');

  return types;
}

function getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateKey = formatDateKey(date);
  return events
    .filter((e) => e.date === dateKey)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

function CalendarPreviewInner({
  events,
  tasks,
  goals = [],
  habits = [],
  onEventClick,
}: CalendarPreviewProps) {
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const firstDayOffset = useMemo(() => getFirstDayOfMonth(year, month), [year, month]);

  const prevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const nextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setExpandedEventId(null);
  }, []);

  const handleEventToggle = useCallback((eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  const todayEvents = useMemo(
    () => getEventsForDate(selectedDate, events),
    [selectedDate, events]
  );

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6D4AFF]/10">
            <Calendar size={18} className="text-[#6D4AFF]" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Calendar Preview
            </h3>
            <p className="mt-0.5 text-sm font-bold text-[#111827] dark:text-white">{monthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-white/5 dark:text-[#A1A1AA] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-white/5 dark:text-[#A1A1AA] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Mini Calendar Grid */}
      <div className="mt-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_HEADERS.map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="flex h-8 items-center justify-center text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7"
          >
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {/* Day cells */}
            {days.map((date) => {
              const isToday = sameDay(date, TODAY);
              const isSelected = sameDay(date, selectedDate);
              const eventTypes = getEventTypesForDate(date, events, tasks, goals, habits);
              const hasEvents = eventTypes.length > 0;

              return (
                <div key={date.toISOString()} className="flex flex-col items-center justify-start h-10">
                  <button
                    type="button"
                    onClick={() => handleDateClick(date)}
                    className={`
                      relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200
                      ${isToday ? 'bg-[#6D4AFF] text-white font-bold shadow-[0_0_12px_rgba(109,74,255,0.4)]' : ''}
                      ${isSelected && !isToday ? 'bg-[#6D4AFF]/10 text-[#6D4AFF] font-bold' : ''}
                      ${!isToday && !isSelected ? 'text-[#374151] dark:text-[#D1D5DB] hover:bg-white/5' : ''}
                    `}
                  >
                    {date.getDate()}
                  </button>
                  {/* Event dots */}
                  {hasEvents && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {eventTypes.slice(0, 4).map((type) => (
                        <span
                          key={type}
                          className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT_COLORS[type] || 'bg-gray-400'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Today's Events */}
      <div className="mt-5 border-t border-gray-100 dark:border-white/5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
            {sameDay(selectedDate, TODAY) ? "Today's Events" : `Events — ${selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`}
          </h4>
          <span className="rounded-full bg-[#6D4AFF]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA]">
            {todayEvents.length}
          </span>
        </div>

        {todayEvents.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/10 px-4 py-8 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            No events for this day
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((event) => {
              const isExpanded = expandedEventId === event.id;
              const categoryType = event.isGoalEvent
                ? 'goal'
                : event.isHabitEvent
                  ? 'habit'
                  : event.deadline
                    ? 'deadline'
                    : event.category?.toLowerCase().includes('meeting')
                      ? 'meeting'
                      : 'task';
              const dotColor = EVENT_DOT_COLORS[categoryType] || 'bg-[#6D4AFF]';

              return (
                <motion.div
                  key={event.id}
                  layout
                  className="rounded-[14px] border border-[#EEF1F6] dark:border-white/8 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={() => handleEventToggle(event.id)}
                    className="w-full flex items-start gap-3 p-3 text-left"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <Clock size={12} className="text-[#9CA3AF]" />
                      <span className="text-[10px] font-bold text-[#9CA3AF] whitespace-nowrap">
                        {event.start}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className="text-sm font-semibold text-[#111827] dark:text-white truncate">
                          {event.title}
                        </span>
                      </div>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 pl-3.5 text-xs text-[#6B7280] dark:text-[#A1A1AA] space-y-1"
                        >
                          <p>
                            <span className="font-semibold">Time:</span> {event.start} – {event.end}
                          </p>
                          {event.category && (
                            <p>
                              <span className="font-semibold">Category:</span> {event.category}
                            </p>
                          )}
                          {event.location && (
                            <p>
                              <span className="font-semibold">Location:</span> {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p className="pt-1 border-t border-gray-100 dark:border-white/5">
                              {event.description}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Category badge */}
                    <span className="shrink-0 rounded-full bg-white/5 dark:bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#9CA3AF]">
                      {categoryType}
                    </span>
                  </button>

                  {onEventClick && (
                    <div className="px-3 pb-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="text-[10px] font-bold text-[#6D4AFF] hover:text-[#8B7CF8] transition-colors"
                      >
                        View details →
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const CalendarPreview = memo(CalendarPreviewInner);
