import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, Award, Sparkles, Plus, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import type { CalendarEvent } from './CalendarGrid';

interface MonthGridProps {
  events: CalendarEvent[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  onOpenEditModal: (event: CalendarEvent) => void;
  onOpenModalAtSlot: (date: string, start: string, end: string) => void;
  onCreateQuickEvent: (date: string, timeMinutes: number) => void;
}

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

const getMonthCells = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - diff);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return cells;
};

// Pill color per accent
const PILL_STYLES: Record<CalendarEvent['accent'], { pill: string; dot: string }> = {
  lavender: { pill: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200', dot: 'bg-violet-500' },
  amber:    { pill: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200',       dot: 'bg-amber-500' },
  sky:      { pill: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200',               dot: 'bg-sky-500' },
  emerald:  { pill: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' },
  rose:     { pill: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200',           dot: 'bg-rose-500' },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500 animate-pulse',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-400',
};

const MAX_VISIBLE = 3;

export const MonthGrid: React.FC<MonthGridProps> = ({
  events,
  selectedDate,
  setSelectedDate,
  onOpenEditModal,
  onOpenModalAtSlot: _onOpenModalAtSlot,
  onCreateQuickEvent: _onCreateQuickEvent,
}) => {
  const monthCells = getMonthCells(selectedDate);
  const currentMonth = selectedDate.getMonth();
  const TODAY = new Date();

  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="app-surface p-4 select-none" onMouseMove={(e) => setTooltipPos({ x: e.clientX + 15, y: e.clientY + 10 })}>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div
            key={label}
            className={`text-center text-[9px] font-extrabold uppercase tracking-widest py-2 ${
              label === 'Sat' || label === 'Sun' ? 'text-purple-400 dark:text-purple-500' : 'text-gray-400 dark:text-gray-600'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {monthCells.map((date) => {
          const dk = formatDateKey(date);
          const dateEvents = events.filter((ev) => ev.date === dk);
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isToday = sameDay(date, TODAY);
          const isSelected = sameDay(date, selectedDate);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isExpanded = expandedCell === dk;
          const visible = isExpanded ? dateEvents : dateEvents.slice(0, MAX_VISIBLE);
          const overflow = dateEvents.length - MAX_VISIBLE;

          return (
            <div
              key={dk}
              onClick={() => setSelectedDate(date)}
              className={`min-h-[100px] rounded-xl border p-1.5 transition-all cursor-pointer flex flex-col ${
                isToday
                  ? 'border-purple-400/60 bg-purple-50/50 dark:bg-purple-950/20'
                  : isSelected
                  ? 'border-purple-400/40 bg-purple-50/30 dark:bg-purple-950/10'
                  : isWeekend
                  ? 'border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.008]'
                  : isCurrentMonth
                  ? 'border-gray-100 dark:border-white/8 bg-white dark:bg-[#171923]'
                  : 'border-transparent bg-gray-50/20 dark:bg-transparent'
              } hover:border-purple-300/50 dark:hover:border-purple-700/40`}
            >
              {/* Date number row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold transition-all ${
                    isToday
                      ? 'bg-[#6D4AFF] text-white shadow-[0_0_12px_rgba(109,74,255,0.5)]'
                      : isSelected
                      ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200'
                      : isCurrentMonth
                      ? 'text-gray-800 dark:text-gray-200'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Quick add button on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); _onOpenModalAtSlot(dk, '9:00 AM', '10:00 AM'); }}
                  className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-400 hover:text-purple-500"
                  title="Add event"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Event pills */}
              <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                {visible.map((ev) => {
                  let style = PILL_STYLES[ev.accent] ?? PILL_STYLES.lavender;
                  if (ev.isGoalEvent) {
                    style = { pill: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200', dot: 'bg-blue-500' };
                  } else if (ev.isHabitEvent) {
                    style = { pill: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' };
                  }
                  return (
                    <motion.div
                      key={ev.id}
                      layout
                      onClick={(e) => { e.stopPropagation(); onOpenEditModal(ev); }}
                      onMouseEnter={() => setHoveredEventId(ev.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold truncate cursor-pointer ${style.pill} hover:brightness-95 transition-all`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[ev.priority] ?? style.dot}`} />
                      {(ev.isGoalEvent || ev.isHabitEvent) && <Lock className="h-2 w-2 shrink-0" />}
                      <span className="truncate">{ev.title}</span>
                    </motion.div>
                  );
                })}

                {/* Overflow toggle */}
                {overflow > 0 && !isExpanded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedCell(dk); }}
                    className="flex items-center gap-0.5 text-[9px] font-bold text-purple-500 hover:text-purple-700 pl-1 mt-0.5 transition-colors"
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                    +{overflow} more
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedCell(null); }}
                    className="flex items-center gap-0.5 text-[9px] font-bold text-gray-400 hover:text-gray-600 pl-1 mt-0.5 transition-colors"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                    Show less
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredEventId && (() => {
          const ev = events.find((x) => x.id === hoveredEventId);
          if (!ev) return null;
          return (
            <motion.div
              key="month-tooltip"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
              className="z-[999] pointer-events-none w-64 rounded-2xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-[#1D1F2D]/95 backdrop-blur-xl p-3.5 shadow-2xl text-xs flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-800 dark:text-white truncate max-w-[160px]">{ev.title}</span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  {ev.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span>{ev.start} – {ev.end}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <AlertCircle className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span className="capitalize">{ev.category || 'Event'}</span>
              </div>
              {ev.xpReward && (
                <div className="flex items-center gap-2 text-emerald-500 font-bold">
                  <Award className="h-3.5 w-3.5 shrink-0" />
                  <span>+{ev.xpReward} XP</span>
                </div>
              )}
              {ev.isAiScheduled && (
                <div className="flex items-center gap-1 text-purple-500 font-bold text-[10px]">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span>Scheduled by AI</span>
                </div>
              )}
              <p className="text-[9px] text-gray-400 dark:text-gray-500">Double-click to edit</p>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
