import { memo } from 'react';
import { getDueLabel, getRemainingTime } from './helpers';
import type { Task } from './types';

interface AssignmentDeadlineTrackerProps {
  assignments: Task[];
}

function AssignmentDeadlineTrackerInner({ assignments }: AssignmentDeadlineTrackerProps) {
  return (
    <div className="lg:col-span-5 rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Assignment Deadline Tracker</h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">Urgency-sorted using live task data.</p>
        </div>
        <span className="rounded-full bg-[#6D4AFF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA]">
          {assignments.length} pending
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {assignments.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#D6DAE3] dark:border-white/10 px-4 py-10 text-center text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            <div className="space-y-1">
              <p>🎉 No assignments due.</p>
              <p className="text-xs">Enjoy your free time.</p>
            </div>
          </div>
        ) : (
          assignments.slice(0, 6).map((task) => (
            <div key={task.id} className="rounded-[22px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] dark:text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">{task.subject || task.customCategory || task.category || 'Assignment'}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#6D4AFF]/15 bg-[#6D4AFF]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA]">
                  {getDueLabel(task.dueDateRaw, task.dueTime)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-[#9CA3AF]">Time Left</span>
                  <span className="mt-1 block font-semibold text-[#111827] dark:text-white">{getRemainingTime(task.dueDateRaw)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-[#9CA3AF]">Priority</span>
                  <span className="mt-1 block font-semibold capitalize text-[#111827] dark:text-white">{task.priority}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const AssignmentDeadlineTracker = memo(AssignmentDeadlineTrackerInner);
