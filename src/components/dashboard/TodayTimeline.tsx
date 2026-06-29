import { memo } from 'react';
import { BookOpen, Dumbbell, FileText, Users, BookMarked, Clock } from 'lucide-react';
import { TODAY, formatDateKey, timeToMinutes, nowMinutes } from './helpers';
import type { CalendarEvent } from './types';

interface TodayTimelineProps {
  events: CalendarEvent[];
  currentTime: Date;
  onToggleEvent?: (eventId: string, completed: boolean) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#6D4AFF',
  low: '#9CA3AF',
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Study/DSA': BookOpen,
  'Gym/Workout': Dumbbell,
  'Assignment': FileText,
  'Meeting': Users,
  'Reading': BookMarked,
};

function getCategoryIcon(category?: string) {
  if (!category) return Clock;
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return Clock;
}

function getEventStatus(event: CalendarEvent) {
  const currentMinutes = nowMinutes();
  const startMinutes = timeToMinutes(event.start);
  const endMinutes = timeToMinutes(event.end);

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return { label: 'Current', glow: true };
  }
  if (event.completed || currentMinutes >= endMinutes) {
    return { label: 'Completed', glow: false };
  }
  return { label: 'Upcoming', glow: false };
}

function getCountdown(event: CalendarEvent): string | null {
  const currentMinutes = nowMinutes();
  const startMinutes = timeToMinutes(event.start);
  const endMinutes = timeToMinutes(event.end);

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return null;
  if (event.completed || currentMinutes >= endMinutes) return null;

  const diff = startMinutes - currentMinutes;
  if (diff < 0) return 'Overdue';

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) return `in ${hours}h ${minutes}m`;
  if (hours > 0) return `in ${hours}h`;
  return `in ${minutes}m`;
}

function getStatusBadge(status: { label: string; glow: boolean }) {
  if (status.glow) {
    return 'text-[#A78BFA] bg-[#6D4AFF]/15 border-[#6D4AFF]/30';
  }
  if (status.label === 'Completed') {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
  return 'text-gray-400 bg-white/5 border-white/10';
}

function TodayTimelineInner({ events, currentTime, onToggleEvent }: TodayTimelineProps) {
  const todayStr = formatDateKey(TODAY);
  const todayEvents = [...events]
    .filter((e) => e.date === todayStr)
    .sort((l, r) => timeToMinutes(l.start) - timeToMinutes(r.start));

  return (
    <div className="lg:col-span-7 rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
            Today's Schedule Timeline
          </h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            Current time:{' '}
            <span className="font-bold text-[#8B7CF8]">
              {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-[#6D4AFF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA]">
          {todayEvents.length} event{todayEvents.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="relative mt-5 pl-5">
        <div className="absolute bottom-0 left-2 top-0 w-px bg-gray-200 dark:bg-white/8" />

        {todayEvents.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#D6DAE3] dark:border-white/10 px-4 py-10 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            <div className="space-y-2">
              <p className="text-base">No events scheduled today 🎉</p>
              <p className="text-xs opacity-60">Add an event or optimize your day to build your timeline.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {todayEvents.map((event) => {
              const status = getEventStatus(event);
              const countdown = getCountdown(event);
              const priorityColor = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.low;
              const CategoryIcon = getCategoryIcon(event.category);

              return (
                <div
                  key={event.id}
                  className={`
                    relative rounded-[22px] border p-4 transition-all duration-300
                    ${
                      status.glow
                        ? 'border-[#6D4AFF]/30 bg-[#6D4AFF]/[0.06] shadow-[0_0_24px_rgba(109,74,255,0.18)]'
                        : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
                    }
                  `}
                >
                  {/* Timeline dot */}
                  <span
                    className={`
                      absolute -left-[1.45rem] top-5 h-3.5 w-3.5 rounded-full border-4 border-white dark:border-[#171923]
                      ${status.glow ? 'bg-[#8B7CF8] animate-pulse' : status.label === 'Completed' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}
                    `}
                  />

                  {/* Priority left border */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                    style={{ backgroundColor: priorityColor }}
                  />

                  <div className="flex items-start justify-between gap-4 pl-3">
                    <div className="min-w-0 flex-1">
                      {/* Time row with icon */}
                      <div className="flex items-center gap-2">
                        <CategoryIcon
                          size={14}
                          className={`shrink-0 ${status.glow ? 'text-[#A78BFA]' : 'text-[#6B7280] dark:text-[#A1A1AA]'}`}
                        />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8B7CF8]">
                          {event.start} - {event.end}
                        </p>
                      </div>

                      {/* Title */}
                      <h4
                        className={`mt-1 text-sm font-bold ${event.completed ? 'text-gray-400 line-through' : 'text-[#111827] dark:text-white'}`}
                      >
                        {event.title}
                      </h4>

                      {/* Meta row */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                        <span>{Math.max(15, timeToMinutes(event.end) - timeToMinutes(event.start))} min</span>
                        {event.category && (
                          <>
                            <span className="opacity-30">·</span>
                            <span>{event.category}</span>
                          </>
                        )}
                        {event.location && (
                          <>
                            <span className="opacity-30">·</span>
                            <span>{event.location}</span>
                          </>
                        )}
                      </div>

                      {/* Countdown */}
                      {countdown && (
                        <p
                          className={`mt-2 text-[11px] font-semibold ${countdown === 'Overdue' ? 'text-red-500' : 'text-[#6B7280] dark:text-[#A1A1AA]'}`}
                        >
                          {countdown === 'Overdue' ? '⚠ Overdue' : `⏳ ${countdown}`}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Status badge */}
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusBadge(status)}`}
                      >
                        {status.label}
                      </span>

                      {/* Completion checkbox */}
                      <button
                        type="button"
                        onClick={() => onToggleEvent && onToggleEvent(event.id, !event.completed)}
                        className={`
                          group flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200
                          ${
                            event.completed
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 hover:border-[#6D4AFF] hover:bg-[#6D4AFF]/10'
                          }
                        `}
                        aria-label={event.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {event.completed ? (
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-[#6D4AFF] transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const TodayTimeline = memo(TodayTimelineInner);
