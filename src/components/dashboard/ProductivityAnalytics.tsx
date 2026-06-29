import { memo, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Flame, Trophy, Zap } from 'lucide-react';
import { TODAY, addDays, formatDateKey, sameDay } from './helpers';
import type { WeeklyAnalytics, Task, DashboardData } from './types';

function AnimatedNumber({ value }: { value: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const end = value;
    if (end <= 0) {
      setCurrent(0);
      return;
    }
    const duration = 1000;
    const startTime = performance.now();
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress);
      setCurrent(Math.floor(ease * end));
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setCurrent(end);
      }
    };
    requestAnimationFrame(update);
  }, [value]);

  return <span>{current}</span>;
}

function CircularProgress({ percentage, color, size = 90, strokeWidth = 8 }: { percentage: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percentage) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-100 dark:text-white/5"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

function getCompletionDate(task: Task): Date | null {
  const completionDate = (task.completedAt as any)?.toDate?.() || (task.completedAt ? new Date(task.completedAt as any) : (task.dueDateRaw ? new Date(task.dueDateRaw) : null));
  return completionDate && completionDate instanceof Date ? completionDate : null;
}

interface ProductivityAnalyticsProps {
  weeklyAnalytics: WeeklyAnalytics | null;
  tasks: Task[];
  assignmentCount: number;
  dashboardData?: DashboardData;
}

function ProductivityAnalyticsInner({ weeklyAnalytics, tasks, assignmentCount, dashboardData }: ProductivityAnalyticsProps) {
  const { dashboardHabits, dashboardGoals, userStats } = dashboardData || {};
  const xp = userStats?.xp || 0;
  const level = userStats?.level || 1;
  const xpForNextLevel = level * 100;
  const xpProgressPct = Math.min(100, Math.round((xp / xpForNextLevel) * 100));

  const habitConsistencyPct = useMemo(() => {
    if (!dashboardHabits || dashboardHabits.length === 0) return 0;
    const completed = dashboardHabits.filter((h) => h.completedToday).length;
    return Math.round((completed / dashboardHabits.length) * 100);
  }, [dashboardHabits]);

  const goalProgressPct = useMemo(() => {
    if (!dashboardGoals || dashboardGoals.length === 0) return 0;
    const totalProgress = dashboardGoals.reduce((sum, g) => {
      const pct = g.target > 0 ? Math.min(100, (g.progress / g.target) * 100) : 0;
      return sum + pct;
    }, 0);
    return Math.round(totalProgress / dashboardGoals.length);
  }, [dashboardGoals]);

  const heatmapCells = useMemo(() => Array.from({ length: 49 }, (_, index) => {
    const day = addDays(TODAY, index - 48);
    const count = tasks.filter((task) => {
      if (!task.completed) return false;
      const completionDate = getCompletionDate(task);
      return completionDate ? sameDay(completionDate, day) : false;
    }).length;
    return {
      date: formatDateKey(day),
      count,
      intensity:
        count === 0
          ? 'bg-slate-200 dark:bg-white/5 border-white/5'
          : count === 1
          ? 'bg-purple-300 dark:bg-purple-950/40 text-white border-purple-500/10'
          : count === 2
          ? 'bg-purple-400 dark:bg-purple-800/60 text-white border-purple-500/20'
          : count === 3
          ? 'bg-[#8B7CF8] dark:bg-[#6D5DF6]/80 text-white border-[#6D5DF6]/30'
          : 'bg-[#6D5DF6] text-white border-[#6D5DF6]/50',
    };
  }), [tasks]);

  const weeklyDayLabels = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(TODAY, i - 6);
      const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return labels[day.getDay()];
    });
  }, []);

  const weekTasks = useMemo(() => {
    const weekStart = addDays(TODAY, -6);
    weekStart.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (!t.completed) return false;
      const cd = getCompletionDate(t);
      return cd && cd >= weekStart;
    });
  }, [tasks]);

  const weekDayTaskCounts = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(TODAY, i - 6);
      return weekTasks.filter((t) => {
        const cd = getCompletionDate(t);
        return cd && sameDay(cd, day);
      }).length;
    });
  }, [weekTasks]);

  const currentStreak = userStats?.currentStreak || 0;
  const bestStreak = userStats?.bestStreak || 0;

  const productivityTrend = useMemo(() => {
    if (!weeklyAnalytics) return 0;
    const lastWeekRate = weeklyAnalytics.completionRate;
    return lastWeekRate >= 50 ? 1 : -1;
  }, [weeklyAnalytics]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-black tracking-tight text-[#111827] dark:text-white">Weekly Analytics</h3>
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">Real completion trends and historical density from live data.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Section 2: 49-Day Heatmap */}
        <div className="lg:col-span-5 rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-sm">
          <div className="border-b border-white/5 pb-3">
            <h4 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Monthly Heatmap</h4>
            <p className="mt-1 text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">Last 49 days of completions.</p>
          </div>
          <div className="mx-auto mt-4 grid w-fit grid-cols-7 gap-1.5">
            {heatmapCells.map((cell, index) => (
              <div
                key={index}
                className={`group relative flex h-6.5 w-6.5 items-center justify-center rounded-md border text-[8px] font-black transition hover:scale-105 ${cell.intensity}`}
                title={`${cell.count} completions on ${cell.date}`}
              >
                {cell.count > 0 ? cell.count : ''}
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#111827] px-2 py-1 text-[9px] font-bold text-white shadow-lg group-hover:block z-10">
                  {cell.count} tasks &middot; {cell.date}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[8px] font-bold text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Less</span>
            <div className="h-2.5 w-2.5 rounded-sm bg-slate-200 dark:bg-white/5 border border-white/5" />
            <div className="h-2.5 w-2.5 rounded-sm bg-purple-300 dark:bg-purple-950/40 border border-purple-500/10" />
            <div className="h-2.5 w-2.5 rounded-sm bg-purple-400 dark:bg-purple-800/60 border border-purple-500/20" />
            <div className="h-2.5 w-2.5 rounded-sm bg-[#8B7CF8] dark:bg-[#6D5DF6]/80 border border-[#6D5DF6]/30" />
            <div className="h-2.5 w-2.5 rounded-sm bg-[#6D5DF6] border border-[#6D5DF6]/50" />
            <span>More</span>
          </div>
        </div>

        {/* Section 1: Weekly Productivity Bar Chart */}
        <div className="lg:col-span-7 rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <h4 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Weekly Productivity</h4>
            <span className="rounded-full bg-[#6D4AFF]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA]">Auto-updating</span>
          </div>
          {!weeklyAnalytics || weeklyAnalytics.totalTasks === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-[22px] border border-dashed border-[#D6DAE3] dark:border-white/10 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
              Your analytics will appear after completing a few tasks.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Task Completion Rate</p>
                  <p className="mt-1 text-lg font-black text-[#111827] dark:text-white">{weeklyAnalytics.completionRate}%</p>
                </div>
                <div className="rounded-2xl border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Study and Focus Hours</p>
                  <p className="mt-1 text-lg font-black text-[#111827] dark:text-white">{weeklyAnalytics.estimatedFocusHours}h</p>
                </div>
                <div className="rounded-2xl border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Assignment Progress</p>
                  <p className="mt-1 text-lg font-black text-[#111827] dark:text-white">{assignmentCount === 0 ? 'Clear' : `${assignmentCount} pending`}</p>
                </div>
              </div>
              <div className="flex items-end gap-3.5 pt-2">
                {weeklyAnalytics.dailyCompletionPcts.map((pct: number, index: number) => (
                  <div key={index} className="group flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-36 w-full items-end rounded-xl bg-gray-50/60 dark:bg-black/25 px-1 pb-1">
                      <div className="absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 rounded bg-[#111827] px-2 py-1 text-[9px] font-black text-white shadow-md group-hover:block z-10">{pct}%</div>
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${Math.max(4, pct)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="w-full rounded-lg bg-gradient-to-t from-[#6D4AFF] to-cyan-400"
                      />
                    </div>
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-gray-500">{weeklyAnalytics.dayLabels[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Circular Progress Rings */}
      <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-sm">
        <div className="border-b border-white/5 pb-3">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Progress Rings</h4>
          <p className="mt-1 text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">Live completion and goal metrics.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Completion Rate', value: weeklyAnalytics?.completionRate || 0, color: '#6D4AFF' },
            { label: 'Habit Consistency', value: habitConsistencyPct, color: '#06B6D4' },
            { label: 'Goal Progress', value: goalProgressPct, color: '#10B981' },
            { label: 'XP Progress', value: xpProgressPct, color: '#F59E0B' },
          ].map((ring) => (
            <div key={ring.label} className="flex flex-col items-center gap-3">
              <div className="relative">
                <CircularProgress percentage={ring.value} color={ring.color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-[#111827] dark:text-white">{ring.value}%</span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] text-center">{ring.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Weekly Calendar Mini View */}
      <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-sm">
        <div className="border-b border-white/5 pb-3">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Weekly Calendar</h4>
          <p className="mt-1 text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">Tasks completed each day this week.</p>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {weeklyDayLabels.map((label, i) => {
            const day = addDays(TODAY, i - 6);
            const isToday = sameDay(day, TODAY);
            const dayCount = weekDayTaskCounts[i];
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-[#6D4AFF]' : 'text-[#9CA3AF]'}`}>{label}</span>
                <div className={`w-full aspect-square rounded-[22px] flex items-center justify-center transition-all ${
                  isToday
                    ? 'border-2 border-[#6D4AFF] bg-[#6D4AFF]/5'
                    : 'border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
                }`}>
                  {dayCount > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      {Array.from({ length: Math.min(dayCount, 5) }).map((_, j) => (
                        <div key={j} className="h-1.5 w-6 rounded-full bg-gradient-to-r from-[#6D4AFF] to-cyan-400" />
                      ))}
                      <span className="text-[9px] font-black text-[#111827] dark:text-white mt-0.5">{dayCount}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#D1D5DB] dark:text-white/10">&mdash;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Stats Summary Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[22px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Current Streak</p>
            <p className="text-xl font-black text-[#111827] dark:text-white"><AnimatedNumber value={currentStreak} /><span className="ml-1 text-sm">&#128293;</span></p>
          </div>
        </div>
        <div className="rounded-[22px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Longest Streak</p>
            <p className="text-xl font-black text-[#111827] dark:text-white"><AnimatedNumber value={bestStreak} /></p>
          </div>
        </div>
        <div className="rounded-[22px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <Zap className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">XP Progress</p>
            <p className="text-xl font-black text-[#111827] dark:text-white"><AnimatedNumber value={xp} /> / {xpForNextLevel}</p>
          </div>
        </div>
        <div className="rounded-[22px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 shadow-sm flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${productivityTrend >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {productivityTrend >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Productivity Trend</p>
            <p className={`text-xl font-black ${productivityTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {productivityTrend >= 0 ? 'Up' : 'Down'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProductivityAnalytics = memo(ProductivityAnalyticsInner);
