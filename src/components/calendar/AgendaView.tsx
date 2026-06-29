import React from 'react';
import { Calendar, Clock, MapPin, User, Award, Lock } from 'lucide-react';
import type { CalendarEvent } from './CalendarGrid';

interface AgendaViewProps {
  events: CalendarEvent[];
  days: Date[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  onOpenEditModal: (event: CalendarEvent) => void;
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatAgendaDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400',
  high: 'bg-orange-500/10 border-orange-500/20 text-orange-500 dark:text-orange-400',
  medium: 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400',
  low: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400',
};

const ACCENT_BORDER: Record<string, string> = {
  rose: 'border-l-4 border-l-rose-500',
  amber: 'border-l-4 border-l-amber-500',
  sky: 'border-l-4 border-l-sky-500',
  emerald: 'border-l-4 border-l-emerald-500',
  lavender: 'border-l-4 border-l-violet-500',
};

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  days,
  selectedDate,
  setSelectedDate,
  onOpenEditModal,
}) => {
  return (
    <div className="app-surface p-5 space-y-6 select-none">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-white/8 pb-4">
        <Calendar className="h-5 w-5 text-purple-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Agenda Schedule List</h3>
      </div>

      <div className="space-y-6">
        {days.map((day) => {
          const dayKey = formatDateKey(day);
          const dayEvents = events.filter((e) => e.date === dayKey);
          const isSelected = selectedDate.toDateString() === day.toDateString();

          return (
            <div
              key={dayKey}
              onClick={() => setSelectedDate(day)}
              className={`rounded-[18px] border p-4 transition duration-150 cursor-pointer ${
                isSelected
                  ? 'border-purple-500/80 bg-purple-500/[0.02] shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                  : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] hover:border-purple-300 dark:hover:border-purple-800'
              }`}
            >
              <div className="mb-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B5CF6] dark:text-[#A78BFA]">
                    {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(day)}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#111827] dark:text-white">{formatAgendaDate(day)}</p>
                </div>
                <span className="rounded-full border border-gray-200 dark:border-white/8 bg-white dark:bg-[#171923] px-2.5 py-1 text-[11px] font-semibold text-[#111827] dark:text-white">
                  {dayEvents.length} block{dayEvents.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-3">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2 italic">No tasks or routines scheduled.</p>
                ) : (
                  dayEvents.map((event) => {
                    let borderColor = ACCENT_BORDER[event.accent] || ACCENT_BORDER.sky;
                    let label = '';
                    if (event.isGoalEvent) {
                      borderColor = 'border-l-4 border-l-blue-500';
                      label = '🔒 Fixed Goal';
                    } else if (event.isHabitEvent) {
                      borderColor = 'border-l-4 border-l-emerald-500';
                      label = '🔥 Fixed Habit';
                    }
                    return (
                      <div
                        key={event.id}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onOpenEditModal(event);
                        }}
                        className={`rounded-[14px] border border-white dark:border-white/8 bg-white dark:bg-[#171923] px-4 py-3.5 shadow-sm transition hover:shadow-md ${
                          borderColor
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {(event.isGoalEvent || event.isHabitEvent) && <Lock className="h-3 w-3 text-blue-500 shrink-0" />}
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{event.title}</p>
                              {label && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                  {label}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-purple-500" />
                              {event.start} - {event.end}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-purple-500" />
                                {event.location}
                              </span>
                            )}
                            {event.faculty && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-purple-500" />
                                {event.faculty}
                              </span>
                            )}
                            {event.xpReward && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <Award className="h-3.5 w-3.5" />
                                +{event.xpReward} XP
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic leading-relaxed line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-[#6D4AFF] border border-purple-500/20">
                            {event.category || 'Study'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[event.priority] || PRIORITY_STYLES.medium}`}>
                            {event.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
