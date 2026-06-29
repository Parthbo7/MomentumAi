import { memo, useState, useEffect, useMemo } from 'react';
import { Target, Trophy, Flame, Zap, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { TODAY, formatDateKey, sameDay } from './helpers';
import type { DashboardData } from './types';

interface DashboardSummaryProps {
  data: DashboardData;
  greetingName: string;
  onRefreshBrief: () => void;
  briefLoading: boolean;
  dailyBriefData: Record<string, any> | null;
  currentTime: Date;
  onAddTask: () => void;
  onOptimizeDay: () => void;
}

const SCORE_RADIUS = 28;
const SCORE_CIRCUMFERENCE = 2 * Math.PI * SCORE_RADIUS;

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => {};
  }, [value, duration]);

  return <>{displayed}</>;
}

function SmallScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const offset = SCORE_CIRCUMFERENCE - (clamped / 100) * SCORE_CIRCUMFERENCE;
  const color = clamped >= 70 ? '#22D3EE' : clamped >= 40 ? '#8B7CF8' : '#F43F5E';

  return (
    <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={SCORE_RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={SCORE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={SCORE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black text-white"><AnimatedNumber value={clamped} />%</span>
      </div>
    </div>
  );
}

function DashboardSummaryInner({
  data,
  greetingName,
  currentTime,
  dailyBriefData,
  onOptimizeDay,
}: DashboardSummaryProps) {
  const { tasks, dashboardGoals, dashboardHabits, userProfile, userStats, xpHistory } = data;
  const todayStr = formatDateKey(TODAY);

  // Filters
  const todayTasks = useMemo(() => tasks.filter((t) => t.dueDate === todayStr || (t.dueDateRaw && sameDay(new Date(t.dueDateRaw), TODAY))), [tasks, todayStr]);
  const completedToday = useMemo(() => todayTasks.filter((t) => t.completed), [todayTasks]);
  const pendingToday = useMemo(() => todayTasks.filter((t) => !t.completed), [todayTasks]);
  const highPriorityToday = useMemo(() => todayTasks.filter((t) => t.priority === 'critical' || t.priority === 'high'), [todayTasks]);
  const overdueCount = useMemo(() => tasks.filter((t) => !t.completed && t.dueDateRaw && new Date(t.dueDateRaw).getTime() < TODAY.getTime()).length, [tasks]);

  const activeGoalsCount = useMemo(() => dashboardGoals.filter((g) => g.status === 'active').length, [dashboardGoals]);
  const habitsRemaining = useMemo(() => dashboardHabits.filter((h) => !h.completedToday), [dashboardHabits]);

  const xpToday = useMemo(() => {
    const today = formatDateKey(TODAY);
    return xpHistory
      .filter((e) => {
        if (!e.timestamp) return false;
        const ts = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
        return formatDateKey(ts) === today;
      })
      .reduce((sum, e) => sum + (e.xpEarned || 0), 0);
  }, [xpHistory]);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  const aiSummaryText = useMemo(() => {
    if (dailyBriefData && typeof dailyBriefData.greeting === 'string') {
      return dailyBriefData.greeting;
    }
    return `You're on track for an amazing day! Focus on completing your high priority tasks before 2 PM to maximize your productivity.`;
  }, [dailyBriefData]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            {greeting}, {greetingName}! 👋
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Let's make today incredibly productive.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-white/5 px-3 py-1.5 self-start sm:self-center">
          <Calendar className="h-4 w-4 text-[#8B7CF8]" />
          <span className="text-xs font-bold text-gray-300">
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(TODAY)}
          </span>
        </div>
      </div>

      {/* 6-Card Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Productivity Score */}
        <div className="rounded-[22px] border border-white/8 bg-[#171923]/60 p-3.5 flex items-center gap-3 hover:scale-[1.03] transition-transform shadow-md">
          <SmallScoreRing score={userProfile?.momentumScore ?? 82} />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Productivity</p>
            <p className="text-xs font-black text-white mt-0.5">Score</p>
            <p className="text-[10px] text-emerald-400 font-bold mt-1">↑ 12% yesterday</p>
          </div>
        </div>

        {/* Tasks Today */}
        <div className="rounded-[22px] border border-white/8 bg-[#171923]/60 p-3.5 flex flex-col justify-between hover:scale-[1.03] transition-transform shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Tasks Today</p>
            <Trophy className="h-4 w-4 text-[#8B7CF8]" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white"><AnimatedNumber value={todayTasks.length} /></p>
            <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold text-gray-400">
              <span className="text-emerald-400">✓ {completedToday.length} Completed</span>
              <span>•</span>
              <span>{pendingToday.length} Pending</span>
            </div>
          </div>
        </div>

        {/* High Priority Tasks */}
        <div className="rounded-[22px] border border-white/8 bg-[#171923]/60 p-3.5 flex flex-col justify-between hover:scale-[1.03] transition-transform shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">High Priority</p>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white"><AnimatedNumber value={highPriorityToday.length} /></p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] font-black bg-rose-500/10 border border-rose-500/20 text-rose-455 px-1.5 py-0.5 rounded">
                🚨 {overdueCount} Overdue
              </span>
            </div>
          </div>
        </div>

        {/* Goals Remaining */}
        <div className="rounded-[22px] border border-white/8 bg-[#171923]/60 p-3.5 flex flex-col justify-between hover:scale-[1.03] transition-transform shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Goals Remaining</p>
            <Target className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white"><AnimatedNumber value={activeGoalsCount} /></p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] font-black bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                🎯 On Track
              </span>
            </div>
          </div>
        </div>

        {/* Habits Remaining */}
        <div className="rounded-[22px] border border-white/8 bg-[#171923]/60 p-3.5 flex flex-col justify-between hover:scale-[1.03] transition-transform shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Habits Remaining</p>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white"><AnimatedNumber value={habitsRemaining.length} /></p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-orange-400 font-bold">
              <span>🔥 {userStats?.currentStreak || 1} Day Streak</span>
            </div>
          </div>
        </div>

        {/* XP Earned Today */}
        <div className="rounded-[22px] border border-white/8 bg-[#171923]/60 p-3.5 flex flex-col justify-between hover:scale-[1.03] transition-transform shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">XP Earned Today</p>
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">+{xpToday} XP</p>
            <p className="text-[9px] text-gray-400 font-bold mt-1.5">Total: {userStats?.xp || 0} XP</p>
          </div>
        </div>
      </div>

      {/* AI Insight Banner */}
      <div className="relative overflow-hidden rounded-[24px] border border-[#6D5DF6]/15 bg-gradient-to-r from-[#6D5DF6]/10 via-[#171923]/40 to-transparent p-5 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6D5DF6]/10 border border-[#6D5DF6]/20">
            <Sparkles className="h-5 w-5 text-[#8B7CF8] animate-pulse" />
          </div>
          <div className="space-y-0.5 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8B7CF8]">AI Insight</p>
            <p className="text-xs font-semibold text-gray-300 leading-relaxed">{aiSummaryText}</p>
          </div>
        </div>

        <button
          onClick={onOptimizeDay}
          className="shrink-0 app-button-primary py-2.5 px-4 text-xs font-black shadow-[0_4px_16px_rgba(109,74,255,0.25)] hover:shadow-lg transition cursor-pointer"
        >
          ⚡ Optimize My Day
        </button>
      </div>
    </div>
  );
}

export const DashboardSummary = memo(DashboardSummaryInner);
