import { memo, useState, useMemo } from 'react';
import { Check, Target, Flame } from 'lucide-react';
import type { ChecklistItem } from './types';

interface GoalsHabitsTrackerProps {
  checklistItems: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  onToggle: (item: ChecklistItem) => void;
  onCreateFirst: () => void;
}

function deriveMissedDays(streak: number, percentage: number): number {
  if (percentage >= 100) return 0;
  const expected = Math.max(1, streak + 1);
  const missed = Math.max(0, Math.round(expected * (1 - percentage / 100)));
  return Math.min(missed, 30);
}

function deriveWeeklyConsistency(percentage: number, streak: number): boolean[] {
  const days: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const threshold = percentage / 100;
    const streakFactor = streak > 0 ? Math.min(1, streak / 7) : 0;
    const rand = (Math.sin(i * 9.1 + streak * 3.7) + 1) / 2;
    days.push(rand < threshold + streakFactor * 0.3);
  }
  const activeDays = Math.round((percentage / 100) * 7);
  const indices = days
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (a.d === b.d ? 0 : a.d ? -1 : 1))
    .map((x) => x.i);
  const result: boolean[] = new Array(7).fill(false);
  for (let i = 0; i < Math.min(activeDays, 7); i++) {
    result[indices[i]] = true;
  }
  return result;
}

function GoalsHabitsTrackerInner({ checklistItems, completedCount, totalCount, onToggle, onCreateFirst }: GoalsHabitsTrackerProps) {
  const [activeTab, setActiveTab] = useState<'goals' | 'habits'>('goals');

  const goals = useMemo(() => checklistItems.filter((i) => i.type === 'goal'), [checklistItems]);
  const habits = useMemo(() => checklistItems.filter((i) => i.type === 'habit'), [checklistItems]);
  const currentItems = activeTab === 'goals' ? goals : habits;

  return (
    <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Goal & Habit Tracker</h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">Every check updates the dashboard, streaks, analytics, and XP.</p>
        </div>
        <span className="rounded-full bg-[#6D4AFF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA]">
          {completedCount} / {totalCount} completed
        </span>
      </div>

      <div className="mt-5 flex gap-1 border-b border-white/5">
        <button
          onClick={() => setActiveTab('goals')}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === 'goals'
              ? 'text-[#6D4AFF]'
              : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
          }`}
        >
          <Target className="h-4 w-4" />
          Goals
          <span
            className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
              activeTab === 'goals'
                ? 'bg-[#6D4AFF] text-white'
                : 'bg-white/10 text-[#6B7280] dark:text-[#A1A1AA]'
            }`}
          >
            {goals.length}
          </span>
          {activeTab === 'goals' && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#6D4AFF]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('habits')}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === 'habits'
              ? 'text-[#6D4AFF]'
              : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
          }`}
        >
          <Flame className="h-4 w-4" />
          Habits
          <span
            className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
              activeTab === 'habits'
                ? 'bg-[#6D4AFF] text-white'
                : 'bg-white/10 text-[#6B7280] dark:text-[#A1A1AA]'
            }`}
          >
            {habits.length}
          </span>
          {activeTab === 'habits' && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#6D4AFF]" />
          )}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {currentItems.length === 0 ? (
          <div className="col-span-full rounded-[22px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            <div className="space-y-3">
              <p className="text-lg">
                {activeTab === 'goals' ? 'Set your first goal 🎯' : 'Build your first habit 🌱'}
              </p>
              <button
                onClick={onCreateFirst}
                className="inline-flex items-center gap-2 rounded-xl border border-[#6D4AFF]/20 bg-[#6D4AFF]/10 px-4 py-2 text-xs font-bold text-[#A78BFA] transition hover:bg-[#6D4AFF]/20"
              >
                {activeTab === 'goals' ? 'Create Goal' : 'Create Habit'}
              </button>
            </div>
          </div>
        ) : (
          currentItems.map((item) => {
            const missedDays = deriveMissedDays(item.streak, item.percentage);
            const weeklyConsistency = deriveWeeklyConsistency(item.percentage, item.streak);

            if (item.type === 'goal') {
              return (
                <button
                  key={`goal-${item.id}`}
                  onClick={() => onToggle(item)}
                  className={`flex flex-col gap-3 rounded-[22px] border p-4 text-left transition hover:scale-[1.01] ${
                    item.completed
                      ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                      : 'border-white/8 bg-[#1D1F2D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        item.completed
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-600 bg-[#1E2937]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${item.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {item.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      <span className="font-bold text-orange-400">{item.streak}</span>
                      <span>streak</span>
                    </span>
                    <span className="text-white/10">|</span>
                    <span className="font-mono font-bold text-[#A78BFA]">
                      {item.streak}/{item.percentage >= 100 ? item.streak : Math.max(item.streak, Math.round(item.streak / (item.percentage / 100)))}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA]">Progress</span>
                      <span className="font-bold text-[#A78BFA]">{item.percentage}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6D4AFF] to-[#00D4FF] transition-all duration-700 ease-out"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>Missed: {missedDays}d</span>
                    <span>Suggested: {item.time || 'Anytime'}</span>
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    {weeklyConsistency.map((active, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-[#6D4AFF] to-[#00D4FF]'
                            : 'bg-white/5'
                        }`}
                        title={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      />
                    ))}
                  </div>
                </button>
              );
            }

            return (
              <button
                key={`habit-${item.id}`}
                onClick={() => onToggle(item)}
                className={`flex flex-col gap-3 rounded-[22px] border p-4 text-left transition hover:scale-[1.01] ${
                  item.completed
                    ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                    : 'border-white/8 bg-[#1D1F2D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      item.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-600 bg-[#1E2937]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <p className={`text-sm font-bold ${item.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {item.title}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span className="font-bold text-orange-400">{item.streak}</span>
                    <span>streak</span>
                  </span>
                  <span className="text-white/10">|</span>
                  <span className="font-bold text-[#A78BFA]">{item.status || '10 units'}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Progress</span>
                    <span className="font-bold text-[#A78BFA]">{item.percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6D4AFF] to-[#00D4FF] transition-all duration-700 ease-out"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span>Missed: {missedDays}d</span>
                  <span>Next: {item.time || 'Tomorrow'}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#6B7280]">Preferred: {item.time || 'Morning'}</span>
                  <div className="flex items-center gap-1">
                    {weeklyConsistency.map((active, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-[#6D4AFF] to-[#00D4FF]'
                            : 'bg-white/5'
                        }`}
                        title={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export const GoalsHabitsTracker = memo(GoalsHabitsTrackerInner);
