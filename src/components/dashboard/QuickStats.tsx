import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Timer,
  Zap,
  Trophy,
  Flame,
  Medal,
  Target,
  Repeat,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

function AnimatedNumber({ value }: { value: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const end = value;
    if (end <= 0) {
      setCurrent(0);
      return;
    }
    const duration = 1200;
    const startTime = performance.now();
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(ease * end));
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setCurrent(end);
      }
    };
    requestAnimationFrame(update);
  }, [value]);

  return <span>{current.toLocaleString()}</span>;
}

interface StatCard {
  label: string;
  value: number;
  sublabel: string;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
}

interface QuickStatsProps {
  stats: StatCard[];
}

const accentMap: Record<string, { bg: string; text: string; glow: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', ring: 'ring-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', glow: 'shadow-cyan-500/20', ring: 'ring-cyan-500/30' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', glow: 'shadow-amber-500/20', ring: 'ring-amber-500/30' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', glow: 'shadow-purple-500/20', ring: 'ring-purple-500/30' },
  rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', glow: 'shadow-rose-500/20', ring: 'ring-rose-500/30' },
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', glow: 'shadow-orange-500/20', ring: 'ring-orange-500/30' },
  sky: { bg: 'bg-sky-500/15', text: 'text-sky-400', glow: 'shadow-sky-500/20', ring: 'ring-sky-500/30' },
};

function StatMetricCard({ stat, index }: { stat: StatCard; index: number }) {
  const Icon = stat.icon;
  const colors = accentMap[stat.accent ?? 'emerald'] ?? accentMap.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-[20px] border border-white/8 bg-[#1D1F2D] p-5 transition-all duration-300 hover:border-white/15 hover:shadow-lg hover:shadow-black/30 cursor-default"
    >
      {/* Hover gradient border overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)',
        }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center ring-1 ${colors.ring}`}>
          {Icon && <Icon className={`h-5 w-5 ${colors.text}`} />}
        </div>

        {/* Value */}
        <p className="mt-4 text-2xl font-black text-white">
          <AnimatedNumber value={Math.round(stat.value)} />
          {stat.suffix && <span className="text-lg font-bold text-white/60">{stat.suffix}</span>}
        </p>

        {/* Label */}
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
          {stat.label}
        </p>

        {/* Sublabel */}
        {stat.sublabel && (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {stat.sublabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function QuickStatsInner({ stats }: QuickStatsProps) {
  const displayStats = stats.length > 0 ? stats : defaultStats;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-black tracking-tight text-white">
          Productivity Overview
        </h3>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Live numbers animated from current dashboard data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {displayStats.map((stat, index) => (
          <StatMetricCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </div>
  );
}

const defaultStats: StatCard[] = [
  { label: 'Tasks Completed Today', value: 12, sublabel: '+3 from yesterday', icon: CheckCircle2, accent: 'emerald' },
  { label: 'Hours Focused', value: 6, sublabel: 'Best session: 2h', suffix: 'h', icon: Timer, accent: 'cyan' },
  { label: 'XP Earned Today', value: 480, sublabel: '+120 bonus', suffix: ' XP', icon: Zap, accent: 'amber' },
  { label: 'Level', value: 24, sublabel: '2,400 / 3,000 XP', icon: Trophy, accent: 'purple' },
  { label: 'Current Streak', value: 14, sublabel: 'Personal best: 31', suffix: ' days', icon: Flame, accent: 'rose' },
  { label: 'Longest Streak', value: 31, sublabel: 'Set on May 12', suffix: ' days', icon: Medal, accent: 'orange' },
  { label: 'Goals Completed', value: 8, sublabel: '2 in progress', icon: Target, accent: 'sky' },
  { label: 'Habits Completed', value: 5, sublabel: '3/8 remaining today', icon: Repeat, accent: 'emerald' },
  { label: 'Weekly Score', value: 92, sublabel: 'Top 10% of users', suffix: '%', icon: TrendingUp, accent: 'purple' },
  { label: 'Monthly Score', value: 87, sublabel: '+5 vs last month', suffix: '%', icon: BarChart3, accent: 'cyan' },
];

export const QuickStats = memo(QuickStatsInner);
