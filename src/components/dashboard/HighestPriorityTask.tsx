import { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Clock, Calendar, Play } from 'lucide-react';
import { getDueLabel, formatDuration } from './helpers';
import type { Task } from './types';

interface HighestPriorityTaskProps {
  task: Task | null;
  onStartFocus: () => void;
  onComplete: (taskId: string) => void;
  onReschedule: () => void;
  onAskAi: (taskTitle: string) => void;
  tasks?: Task[];
}

function useCountdown(dueDateRaw: Date | undefined): string {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!dueDateRaw) {
      setTimeLeft('No due date');
      return;
    }
    const updateTimer = () => {
      const diff = dueDateRaw.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Overdue');
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dueDateRaw]);

  return timeLeft;
}

function CountdownBadge({ dueDateRaw }: { dueDateRaw: Date | undefined }) {
  const timeLeft = useCountdown(dueDateRaw);
  return (
    <span className="font-mono text-[10px] font-bold text-[#F87171]">
      {timeLeft}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const isCritical = priority === 'critical';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
        isCritical
          ? 'border border-red-500/20 bg-red-500/10 text-red-300'
          : 'border border-orange-500/20 bg-orange-500/10 text-orange-300'
      }`}
    >
      {isCritical ? <AlertTriangle className="h-2.5 w-2.5" /> : null}
      {priority}
    </span>
  );
}

function TaskRow({
  task,
  index,
  onStartFocus,
  onComplete,
}: {
  task: Task;
  index: number;
  onStartFocus: () => void;
  onComplete: (taskId: string) => void;
}) {
  const dueLabel = getDueLabel(task.dueDateRaw, task.dueTime);
  const duration = formatDuration(task.durationMinutes || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            {task.customCategory || task.category ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                {task.customCategory || task.category}
              </span>
            ) : null}
          </div>
          <h4 className="mt-2 truncate text-[15px] font-bold text-white">{task.title}</h4>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9CA3AF]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dueLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
            <CountdownBadge dueDateRaw={task.dueDateRaw} />
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(task.progress || 0, 4)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 }}
              className="h-full rounded-full bg-gradient-to-r from-[#EF4444] to-[#F97316]"
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#6B7280]">{task.progress || 0}% complete</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            onClick={onStartFocus}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444] transition hover:bg-[#EF4444]/20"
            title="Start Focus"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={() => onComplete(task.id)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20"
            title="Mark Complete"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HighestPriorityTaskInner({
  task,
  onStartFocus,
  onComplete,
  tasks: tasksProp,
}: HighestPriorityTaskProps) {
  const highPriorityTasks = useMemo(() => {
    if (tasksProp && tasksProp.length > 0) {
      return tasksProp.filter(
        (t) => (t.priority === 'critical' || t.priority === 'high') && !t.completed
      );
    }
    if (task && (task.priority === 'critical' || task.priority === 'high') && !task.completed) {
      return [task];
    }
    return [];
  }, [tasksProp, task]);

  const count = highPriorityTasks.length;

  return (
    <div className="lg:col-span-4 rounded-[28px] border border-[#EF4444]/20 bg-gradient-to-br from-[#171923] to-[#21131A] p-6 shadow-[0_22px_55px_-30px_rgba(239,68,68,0.5)]">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#F87171]">High Priority Tasks</h3>
          {count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#EF4444] px-1.5 text-[10px] font-black text-white">
              {count}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {count === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-5 flex flex-col items-center justify-center rounded-[22px] border border-dashed border-emerald-500/20 bg-emerald-500/[0.03] px-4 py-10 text-center"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-emerald-300">Great! No urgent tasks today.</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">All caught up 🎉</p>
          </motion.div>
        ) : (
          <div className="mt-5 space-y-3">
            <AnimatePresence mode="popLayout">
              {highPriorityTasks.map((t, i) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  index={i}
                  onStartFocus={onStartFocus}
                  onComplete={onComplete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const HighestPriorityTask = memo(HighestPriorityTaskInner);
