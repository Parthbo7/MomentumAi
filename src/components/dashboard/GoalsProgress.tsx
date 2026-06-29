import { memo } from 'react';
import { Target, CheckCircle2, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DbGoal } from '../../firebaseService';

interface GoalsProgressProps {
  goals: DbGoal[];
  onCompleteGoal: (goalId: string, title: string, xpReward: number) => void;
}

function GoalsProgressInner({ goals, onCompleteGoal }: GoalsProgressProps) {
  const activeGoals = goals.filter((g) => g.status === 'active' || g.status === 'paused');

  const getRemainingDays = (targetDate?: string) => {
    if (!targetDate) return 'No target date';
    const target = new Date(targetDate);
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return 'Deadline passed';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} days left`;
  };

  return (
    <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-sm flex flex-col h-full text-left space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
            <Target className="h-5 w-5 text-[#8B7CF8]" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Goals Progress</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">Tackle long-term objectives and unlock rewards.</p>
          </div>
        </div>
        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#8B7CF8]">
          {activeGoals.length} Active
        </span>
      </div>

      <div className="flex-1 space-y-4 max-h-[320px] overflow-y-auto soft-scrollbar pr-1">
        {activeGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl">🎯</span>
            <p className="text-xs font-bold text-gray-500 mt-2">No active goals scheduled.</p>
          </div>
        ) : (
          activeGoals.map((goal, idx) => {
            const percentage = goal.target > 0 ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : 0;
            const remainingDays = getRemainingDays(goal.targetDate);
            const xpReward = (goal as any).xpReward || 500;

            return (
              <motion.div
                key={goal.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 space-y-3 hover:scale-[1.01] transition-transform duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{goal.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-gray-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-purple-400" />
                        {remainingDays}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Award className="h-3 w-3" />
                        +{xpReward} XP
                      </span>
                      <span>•</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-white/5">{goal.status}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => goal.id && onCompleteGoal(goal.id, goal.title, xpReward)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer shrink-0"
                    title="Complete Goal"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-black text-gray-400">
                    <span>Progress</span>
                    <span className="text-[#8B7CF8]">{percentage}%</span>
                  </div>
                  <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-black/20 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#6D5DF6] to-cyan-400"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const GoalsProgress = memo(GoalsProgressInner);
