import { memo, useMemo } from 'react';
import type { Task, CalendarEvent } from './types';
import { TODAY, sameDay, timeToMinutes } from './helpers';
import { Sparkles, CalendarClock, Timer, CheckCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface Recommendation {
  id: string;
  text: string;
  actionLabel: string;
  actionIcon: 'optimize' | 'reschedule' | 'focus' | 'complete';
  accent: string;
  taskId?: string;
}

interface AISuggestionsProps {
  tasks: Task[];
  events: CalendarEvent[];
  highestPriorityTask: Task | null;
  overdueTasksCount: number;
  hasIncompleteHabits: boolean;
  onOptimizeDay?: () => void;
  onReschedule?: () => void;
  onFocusMode?: () => void;
  onMarkComplete?: (taskId: string) => void;
}

const ACTION_CONFIG = {
  optimize: { icon: Sparkles, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50' },
  reschedule: { icon: CalendarClock, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50' },
  focus: { icon: Timer, bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-900/50' },
  complete: { icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/50' },
} as const;

function AISuggestionsInner({
  tasks,
  events,
  highestPriorityTask,
  overdueTasksCount,
  hasIncompleteHabits,
  onOptimizeDay,
  onReschedule,
  onFocusMode,
  onMarkComplete,
}: AISuggestionsProps) {
  const recommendations = useMemo(() => {
    const list: Recommendation[] = [];
    const todayStr = TODAY.toISOString().split('T')[0];
    const todayEvents = events
      .filter((e) => e.date === todayStr)
      .sort((l, r) => timeToMinutes(l.start) - timeToMinutes(r.start));

    if (highestPriorityTask) {
      const dueTime = highestPriorityTask.dueTime || 'end of day';
      list.push({
        id: 'highest-priority',
        text: `Complete ${highestPriorityTask.title} before ${dueTime} to avoid schedule conflicts.`,
        actionLabel: 'Focus Mode',
        actionIcon: 'focus',
        accent: 'border-cyan-400/30 bg-cyan-50/50 dark:bg-cyan-900/10',
        taskId: highestPriorityTask.id,
      });
    }

    const pendingTasks = tasks.filter((t) => !t.completed);
    const totalTasks = pendingTasks.length;
    if (totalTasks > 0) {
      const completedToday = tasks.filter((t) => t.completed && t.completedAt && sameDay(new Date((t.completedAt as any)?.toDate?.() || (t.completedAt as any)), TODAY)).length;
      const probability = Math.min(100, Math.round((completedToday / Math.max(totalTasks, 1)) * 100));
      list.push({
        id: 'completion-prob',
        text: `You have a ${probability}% chance of finishing today's goals.`,
        actionLabel: 'Optimize Day',
        actionIcon: 'optimize',
        accent: 'border-amber-400/30 bg-amber-50/50 dark:bg-amber-900/10',
      });
    }

    if (todayEvents.length >= 2) {
      for (let i = 0; i < todayEvents.length - 1; i++) {
        const current = todayEvents[i];
        const next = todayEvents[i + 1];
        const currentEnd = timeToMinutes(current.end);
        const nextStart = timeToMinutes(next.start);
        if (nextStart - currentEnd < 15 && nextStart > currentEnd) {
          list.push({
            id: `conflict-${i}`,
            text: `Move ${current.title} to ${current.end} — it's clashing with ${next.title}.`,
            actionLabel: 'Reschedule',
            actionIcon: 'reschedule',
            accent: 'border-purple-400/30 bg-purple-50/50 dark:bg-purple-900/10',
          });
          break;
        }
      }
    }

    const workoutEvent = todayEvents.find((e) => /workout|gym|exercise/i.test(e.title));
    const assignmentEvent = todayEvents.find((e) => /assignment|project|submission/i.test(e.title));
    if (workoutEvent && assignmentEvent) {
      const workoutStart = timeToMinutes(workoutEvent.start);
      const assignmentStart = timeToMinutes(assignmentEvent.start);
      const workoutEnd = timeToMinutes(workoutEvent.end);
      if (workoutStart < assignmentStart && workoutEnd > assignmentStart) {
        list.push({
          id: 'clash-workout',
          text: `Workout is clashing with ${assignmentEvent.title}.`,
          actionLabel: 'Reschedule',
          actionIcon: 'reschedule',
          accent: 'border-purple-400/30 bg-purple-50/50 dark:bg-purple-900/10',
        });
      }
    }

    if (todayEvents.length >= 1) {
      const lastEvent = todayEvents[todayEvents.length - 1];
      const lastEndMinutes = timeToMinutes(lastEvent.end);
      if (lastEndMinutes < 21 * 60) {
        const hours = Math.floor((21 * 60 - lastEndMinutes) / 60);
        if (hours >= 1) {
          list.push({
            id: 'free-block',
            text: `You have a ${hours}-hour free block — use it for deep work.`,
            actionLabel: 'Focus Mode',
            actionIcon: 'focus',
            accent: 'border-cyan-400/30 bg-cyan-50/50 dark:bg-cyan-900/10',
          });
        }
      }
    }

    if (overdueTasksCount > 0) {
      const overdueTask = tasks.find((t) => !t.completed && t.dueDateRaw && t.dueDateRaw.getTime() < TODAY.getTime());
      if (overdueTask) {
        list.push({
          id: 'overdue',
          text: `Clear ${overdueTask.title} or reschedule it today.`,
          actionLabel: 'Reschedule',
          actionIcon: 'reschedule',
          accent: 'border-purple-400/30 bg-purple-50/50 dark:bg-purple-900/10',
          taskId: overdueTask.id,
        });
      }
    }

    if (hasIncompleteHabits) {
      list.push({
        id: 'habits',
        text: 'Close one habit before evening to protect your streak.',
        actionLabel: 'Optimize Day',
        actionIcon: 'optimize',
        accent: 'border-amber-400/30 bg-amber-50/50 dark:bg-amber-900/10',
      });
    }

    const seen = new Set<string>();
    return list.filter((r) => {
      if (seen.has(r.text)) return false;
      seen.add(r.text);
      return true;
    }).slice(0, 5);
  }, [tasks, events, highestPriorityTask, overdueTasksCount, hasIncompleteHabits]);

  const handleAction = (rec: Recommendation) => {
    switch (rec.actionIcon) {
      case 'optimize':
        onOptimizeDay?.();
        break;
      case 'reschedule':
        onReschedule?.();
        break;
      case 'focus':
        onFocusMode?.();
        break;
      case 'complete':
        if (rec.taskId) onMarkComplete?.(rec.taskId);
        break;
    }
  };

  return (
    <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-sm">
      <div className="border-b border-white/5 pb-3">
        <h4 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
          <Zap className="mr-1.5 inline-block h-3.5 w-3.5 text-[#6D4AFF]" />
          AI Recommendations
        </h4>
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
          Smart suggestions based on your current state.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {recommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-[20px] border border-dashed border-[#D6DAE3] dark:border-white/10 px-4 py-8 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]"
          >
            Your plan looks balanced right now ✨
          </motion.div>
        ) : (
          recommendations.map((rec, index) => {
            const config = ACTION_CONFIG[rec.actionIcon];
            const Icon = config.icon;

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className={`rounded-[20px] border border-[#6D4AFF]/12 ${rec.accent} px-4 py-3`}
              >
                <p className="text-sm leading-relaxed text-[#111827] dark:text-[#E5E7EB]">
                  {rec.text}
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => handleAction(rec)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all duration-200 ${config.bg} ${config.text} ${config.hover} cursor-pointer`}
                  >
                    <Icon className="h-3 w-3" />
                    {rec.actionLabel}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const AISuggestions = memo(AISuggestionsInner);
