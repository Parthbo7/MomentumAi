import React, { useState } from 'react';
import { BarChart3, ChevronDown, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarEvent } from './CalendarGrid';

interface AnalyticsPanelProps {
  events: CalendarEvent[];
}

const parseClockValue = (value: string) => {
  const [time, period] = value.split(' ');
  const [hoursRaw, minutesRaw] = time.split(':').map(Number);
  let hours = hoursRaw % 12;
  if (period === 'PM') {
    hours += 12;
  }
  return hours * 60 + minutesRaw;
};

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ events }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Compute category hours
  let studyHours = 0;
  let gymHours = 0;
  let collegeHours = 0;
  let otherHours = 0;
  let completedCount = 0;
  let totalCount = 0;

  events.forEach((event) => {
    const startMins = parseClockValue(event.start);
    const endMins = parseClockValue(event.end);
    const durationHours = (endMins - startMins) / 60;
    
    totalCount++;
    if (event.completed) {
      completedCount++;
    }

    const cat = (event.category || '').toLowerCase();
    if (cat === 'study') {
      studyHours += durationHours;
    } else if (cat === 'gym' || cat === 'sports') {
      gymHours += durationHours;
    } else if (cat === 'college') {
      collegeHours += durationHours;
    } else {
      otherHours += durationHours;
    }
  });

  // const missedCount = totalCount - completedCount;
  const productivityPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Consistency metric based on completion percent
  let consistencyScore = 50;
  if (productivityPct > 80) consistencyScore = 95;
  else if (productivityPct > 60) consistencyScore = 80;
  else if (productivityPct > 40) consistencyScore = 65;
  else if (totalCount === 0) consistencyScore = 0;

  const totalEventHours = studyHours + gymHours + collegeHours + otherHours;
  // Free hours: assume 10 hours of active time daily, 70 hours a week
  const freeTimeHours = Math.max(0, 70 - totalEventHours);

  return (
    <div className="app-surface overflow-hidden select-none">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-purple-500/[0.02] transition"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Calendar Insights & Analytics</h3>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-5"
          >
            <div className="grid gap-5 md:grid-cols-4">
              {/* Card 1: Completed */}
              <div className="rounded-[18px] border dark:border-white/8 bg-white dark:bg-[#171923] p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Completed Sessions</p>
                  <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Blocks checked off</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
              </div>

              {/* Card 2: Hours Distribution */}
              <div className="rounded-[18px] border dark:border-white/8 bg-white dark:bg-[#171923] p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Category distribution</p>
                <div className="space-y-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between"><span>Academic College</span> <span className="font-bold text-gray-900 dark:text-white">{Math.round(collegeHours * 10) / 10}h</span></div>
                  <div className="flex justify-between"><span>Study sessions</span> <span className="font-bold text-gray-900 dark:text-white">{Math.round(studyHours * 10) / 10}h</span></div>
                  <div className="flex justify-between"><span>Gym workouts</span> <span className="font-bold text-gray-900 dark:text-white">{Math.round(gymHours * 10) / 10}h</span></div>
                  <div className="flex justify-between"><span>Other activities</span> <span className="font-bold text-gray-900 dark:text-white">{Math.round(otherHours * 10) / 10}h</span></div>
                </div>
              </div>

              {/* Card 3: Free time */}
              <div className="rounded-[18px] border dark:border-white/8 bg-white dark:bg-[#171923] p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unscheduled hours</p>
                  <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">{Math.round(freeTimeHours * 10) / 10}h</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Open time buffer</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">±</div>
              </div>

              {/* Card 4: Streak/XP bonus */}
              <div className="rounded-[18px] border dark:border-white/8 bg-white dark:bg-[#171923] p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Productivity Score</p>
                  <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">{consistencyScore}%</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Consistency metric</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
