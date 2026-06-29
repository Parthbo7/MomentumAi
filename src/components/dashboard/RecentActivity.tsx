import { memo } from 'react';
import type { XpHistoryEntry } from '../../firebaseService';

interface RecentActivityProps {
  xpHistory: XpHistoryEntry[];
}

function RecentActivityInner({ xpHistory }: RecentActivityProps) {
  return (
    <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-sm">
      <div className="border-b border-gray-100 dark:border-white/5 pb-3">
        <h4 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Recent Activity</h4>
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">Newest events first.</p>
      </div>
      <div className="relative mt-4 space-y-4 pl-6">
        <div className="absolute bottom-0 left-2 top-1 w-px bg-slate-100 dark:bg-white/8" />
        {xpHistory.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#D6DAE3] dark:border-white/10 px-4 py-8 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            No recent activity logged yet.
          </div>
        ) : (
          xpHistory.slice(0, 6).map((entry, index) => {
            const actionLabel = entry.action
              .replace(/_/g, ' ')
              .replace('TASK COMPLETED', 'Completed task')
              .replace('GOAL COMPLETED', 'Finished goal')
              .replace('HABIT COMPLETED', 'Completed habit')
              .replace('DAILY LOGIN', 'Opened dashboard')
              .replace('BADGE UNLOCKED', 'Unlocked badge');
            const ts = entry.timestamp?.toDate ? entry.timestamp.toDate() : (entry.timestamp ? new Date(entry.timestamp) : null);
            const timeLabel = ts
              ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(ts)
              : 'Just now';
            return (
              <div key={entry.id || index} className="relative flex gap-3">
                <span className="absolute -left-5 mt-1.5 h-3.5 w-3.5 rounded-full border border-[#6D4AFF]/30 bg-[#6D4AFF]/20" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#111827] dark:text-white">{actionLabel}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    <span>{timeLabel}</span>
                    <span className="text-[#8B7CF8]">+{entry.xpEarned} XP</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const RecentActivity = memo(RecentActivityInner);
