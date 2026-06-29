import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Repeat, Sparkles, Calendar, Timer, CalendarDays } from 'lucide-react';

interface QuickActionsProps {
  onAddTask: () => void;
  onAddGoal: () => void;
  onAddHabit: () => void;
  onOptimizeDay: () => void;
  onOptimizeWeek: () => void;
  onStartFocus: () => void;
  onOpenCalendar: () => void;
}

interface ActionButton {
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  onClick: () => void;
}

function QuickActionsInner({
  onAddTask,
  onAddGoal,
  onAddHabit,
  onOptimizeDay,
  onOptimizeWeek,
  onStartFocus,
  onOpenCalendar,
}: QuickActionsProps) {
  const [expanded, setExpanded] = useState(false);

  const actions: ActionButton[] = [
    {
      label: 'Add Task',
      description: 'Create a new task with details',
      icon: Plus,
      gradient: 'from-[#6D4AFF] to-[#8B5CF6]',
      iconColor: 'text-white',
      onClick: onAddTask,
    },
    {
      label: 'Add Goal',
      description: 'Set a new long-term goal',
      icon: Target,
      gradient: 'from-cyan-500 to-cyan-400',
      iconColor: 'text-white',
      onClick: onAddGoal,
    },
    {
      label: 'Add Habit',
      description: 'Track a new daily habit',
      icon: Repeat,
      gradient: 'from-emerald-500 to-emerald-400',
      iconColor: 'text-white',
      onClick: onAddHabit,
    },
    {
      label: 'Optimize Day',
      description: 'AI-powered daily schedule optimization',
      icon: Sparkles,
      gradient: 'from-amber-500 to-amber-400',
      iconColor: 'text-white',
      onClick: onOptimizeDay,
    },
    {
      label: 'Optimize Week',
      description: 'Plan your entire week with AI',
      icon: Calendar,
      gradient: 'from-rose-500 to-rose-400',
      iconColor: 'text-white',
      onClick: onOptimizeWeek,
    },
    {
      label: 'Start Focus',
      description: 'Begin a distraction-free session',
      icon: Timer,
      gradient: 'from-[#6D4AFF] to-[#A78BFA]',
      iconColor: 'text-white',
      onClick: onStartFocus,
    },
    {
      label: 'Calendar',
      description: 'Open your full calendar view',
      icon: CalendarDays,
      gradient: 'from-blue-500 to-blue-400',
      iconColor: 'text-white',
      onClick: onOpenCalendar,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="flex items-center gap-2 rounded-full bg-[#171923]/80 backdrop-blur-xl border border-white/10 px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.label}
              className="relative group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 * index, ease: 'easeOut' }}
            >
              <motion.button
                onClick={action.onClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 bg-gradient-to-r ${action.gradient} text-white cursor-pointer transition-colors hover:brightness-110`}
              >
                <Icon className={`h-4 w-4 ${action.iconColor}`} />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="text-[11px] font-bold whitespace-nowrap overflow-hidden"
                    >
                      {action.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="px-3 py-2 rounded-xl bg-[#111318]/95 border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md whitespace-nowrap">
                  <p className="text-[11px] font-bold text-white">{action.label}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{action.description}</p>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-[#111318]" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export const QuickActions = memo(QuickActionsInner);
