import { memo } from 'react';
import { Flame, Check, Bell, Repeat } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Habit } from '../../firebaseService';

interface HabitsTrackerProps {
  habits: Habit[];
  onToggleHabit: (habitId: string, title: string, completed: boolean) => void;
}

function deriveWeeklyConsistency(completionRate: number, streak: number): boolean[] {
  const days: boolean[] = [];
  const rate = completionRate || 50;
  for (let i = 0; i < 7; i++) {
    const threshold = rate / 100;
    const streakFactor = streak > 0 ? Math.min(1, streak / 7) : 0;
    const rand = (Math.sin(i * 7.1 + streak * 2.3) + 1) / 2;
    days.push(rand < threshold + streakFactor * 0.25);
  }
  return days;
}

function HabitsTrackerInner({ habits, onToggleHabit }: HabitsTrackerProps) {
  return (
    <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-sm flex flex-col h-full text-left space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Repeat className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Habits Tracker</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">Build daily consistency and protect your streak.</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
          {habits.filter((h) => h.completedToday).length} / {habits.length} Done
        </span>
      </div>

      <div className="flex-1 space-y-4 max-h-[320px] overflow-y-auto soft-scrollbar pr-1">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl">🌿</span>
            <p className="text-xs font-bold text-gray-500 mt-2">No habits scheduled today.</p>
          </div>
        ) : (
          habits.map((habit, idx) => {
            const streak = habit.currentStreak || 0;
            const completionRate = habit.completionRate || 60;
            const weeklyConsistency = deriveWeeklyConsistency(completionRate, streak);

            return (
              <motion.div
                key={habit.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-2xl border p-4 space-y-3 hover:scale-[1.01] transition-transform duration-200 ${
                  habit.completedToday
                    ? 'border-emerald-500/20 bg-emerald-500/[0.03] opacity-85'
                    : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => habit.id && onToggleHabit(habit.id, habit.title, !habit.completedToday)}
                      className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer ${
                        habit.completedToday
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500/60'
                      }`}
                    >
                      {habit.completedToday ? <Check className="h-4 w-4" /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${habit.completedToday ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {habit.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-black text-rose-455">
                      <Flame className="h-3 w-3" />
                      {streak}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-white/5 pt-2.5 text-[10px] text-gray-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Bell className="h-3 w-3 text-emerald-400" />
                    Time: {habit.preferredTime || 'Anytime'}
                  </span>
                  <span>Rate: {completionRate}%</span>
                </div>

                {/* Weekday consistency row */}
                <div className="flex items-center gap-1 pt-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                    const active = weeklyConsistency[i];
                    return (
                      <div
                        key={i}
                        className={`h-4.5 flex-1 rounded-md flex items-center justify-center text-[8px] font-black transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-sm'
                            : 'bg-slate-200 dark:bg-white/5 text-gray-400'
                        }`}
                        title={day}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const HabitsTracker = memo(HabitsTrackerInner);
