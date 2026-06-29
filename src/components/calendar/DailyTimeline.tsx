import React from 'react';
import { Clock, CheckCircle, Hourglass } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CalendarEvent } from './CalendarGrid';

interface DailyTimelineProps {
  events: CalendarEvent[];
  currentTime: Date;
  selectedDate: Date;
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseClockValue = (value: string) => {
  const [time, period] = value.split(' ');
  const [hoursRaw, minutesRaw] = time.split(':').map(Number);
  let hours = hoursRaw % 12;
  if (period === 'PM') {
    hours += 12;
  }
  return hours * 60 + minutesRaw;
};

const ACCENT_BORDER: Record<CalendarEvent['accent'], string> = {
  rose: 'border-l-4 border-rose-500',
  amber: 'border-l-4 border-amber-500',
  sky: 'border-l-4 border-sky-500',
  emerald: 'border-l-4 border-emerald-500',
  lavender: 'border-l-4 border-violet-500',
};

// const ACCENT_TEXT: Record<CalendarEvent['accent'], string> = {
//   rose: 'text-rose-500',
//   amber: 'text-amber-500',
//   sky: 'text-sky-500',
//   emerald: 'text-emerald-500',
//   lavender: 'text-violet-500',
// };

export const DailyTimeline: React.FC<DailyTimelineProps> = ({
  events,
  currentTime,
  selectedDate,
}) => {
  const dateKey = formatDateKey(selectedDate);
  const dayEvents = events
    .filter((e) => e.date === dateKey)
    .sort((a, b) => parseClockValue(a.start) - parseClockValue(b.start));

  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  return (
    <div className="app-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-purple-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          {formatDateKey(new Date()) === dateKey ? "Today's Schedule Timeline" : `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(selectedDate)} Schedule`}
        </h3>
      </div>

      {dayEvents.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#D6DAE3] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] px-5 py-8 text-center text-xs text-gray-500">
          No classes or events scheduled for this day.
        </div>
      ) : (
        <div className="relative border-l border-[#EEF1F6] dark:border-white/8 pl-5 ml-2.5 space-y-5">
          {dayEvents.map((event) => {
            const startMins = parseClockValue(event.start);
            const endMins = parseClockValue(event.end);
            const isActive = nowMinutes >= startMins && nowMinutes <= endMins && formatDateKey(new Date()) === dateKey;
            const isPast = nowMinutes > endMins && formatDateKey(new Date()) === dateKey;

            let pctProgress = 0;
            let timeRemainingStr = '';
            if (isActive) {
              const totalDuration = endMins - startMins;
              const elapsed = nowMinutes - startMins;
              pctProgress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

              const remainingMins = endMins - nowMinutes;
              timeRemainingStr = `${remainingMins}m remaining`;
            }

            return (
              <div key={event.id} className="relative select-none">
                <div
                  className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white dark:bg-[#171923] transition duration-200 ${
                    isActive
                      ? 'border-purple-500 scale-125 shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                      : isPast
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {isPast && (
                    <CheckCircle className="h-2.5 w-2.5 text-emerald-500 absolute -top-0.5 -left-0.5" />
                  )}
                </div>

                <div
                  className={`rounded-xl border dark:border-white/8 p-3.5 transition-all bg-white dark:bg-[#171923] ${
                    ACCENT_BORDER[event.accent] || ACCENT_BORDER.sky
                  } ${isActive ? 'shadow-[0_12px_24px_-16px_rgba(109,74,255,0.25)] border-purple-500/40 ring-1 ring-purple-500/10' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h4 className={`text-xs font-bold text-gray-800 dark:text-white ${isPast ? 'line-through opacity-60' : ''}`}>
                        {event.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                        {event.start} - {event.end} {event.location ? `• ${event.location}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          <Hourglass className="h-3 w-3 animate-spin" /> Active
                        </span>
                      )}
                      {event.isAiScheduled && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          🤖 AI
                        </span>
                      )}
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/5 text-purple-500">
                        {event.category || 'Study'}
                      </span>
                    </div>
                  </div>

                  {isActive && pctProgress > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[9px] font-bold text-purple-500/80 mb-1">
                        <span>Session Progress</span>
                        <span>{timeRemainingStr}</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pctProgress}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
