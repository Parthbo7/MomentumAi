import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Target,
  CalendarPlus,
  CalendarClock,
  Zap,
  Bot,
  Repeat,
} from 'lucide-react';

type SectionKey = string;

interface FloatingActionButtonProps {
  activeSection: SectionKey;
  onAddTask: () => void;
  onAddGoal: () => void;
  onAddEvent: () => void;
  onOptimizeDay: () => void;
  onOptimizeWeek: () => void;
  onOpenAi: () => void;
}

interface SpeedDialAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  onClick: () => void;
}

function getActionsForSection(
  section: SectionKey,
  callbacks: {
    onAddTask: () => void;
    onAddGoal: () => void;
    onAddEvent: () => void;
    onOptimizeDay: () => void;
    onOptimizeWeek: () => void;
    onOpenAi: () => void;
  }
): SpeedDialAction[] {
  const { onAddTask, onAddGoal, onAddEvent, onOptimizeDay, onOptimizeWeek, onOpenAi } = callbacks;

  switch (section) {
    case 'Calendar':
      return [
        { id: 'add-event', label: 'Add Event', icon: CalendarPlus, color: '#818CF8', glow: 'rgba(129,140,248,0.4)', onClick: onAddEvent },
        { id: 'optimize-week', label: 'Optimize Week', icon: CalendarClock, color: '#F472B6', glow: 'rgba(244,114,182,0.4)', onClick: onOptimizeWeek },
        { id: 'ask-ai', label: 'Ask AI', icon: Bot, color: '#A78BFA', glow: 'rgba(167,139,250,0.4)', onClick: onOpenAi },
      ];
    case 'Tasks':
      return [
        { id: 'add-task', label: 'Add Task', icon: Plus, color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)', onClick: onAddTask },
        { id: 'optimize-day', label: 'Optimize Day', icon: Zap, color: '#FBBF24', glow: 'rgba(251,191,36,0.4)', onClick: onOptimizeDay },
      ];
    case 'AI Coach':
      return [
        { id: 'add-goal', label: 'Add Goal', icon: Target, color: '#22D3EE', glow: 'rgba(34,211,238,0.4)', onClick: onAddGoal },
        { id: 'add-habit', label: 'Add Habit', icon: Repeat, color: '#34D399', glow: 'rgba(52,211,153,0.4)', onClick: onAddGoal },
        { id: 'ask-ai', label: 'Ask AI', icon: Bot, color: '#A78BFA', glow: 'rgba(167,139,250,0.4)', onClick: onOpenAi },
      ];
    case 'Notes':
      return [
        { id: 'ask-ai', label: 'Ask AI', icon: Bot, color: '#A78BFA', glow: 'rgba(167,139,250,0.4)', onClick: onOpenAi },
      ];
    case 'Dashboard':
    default:
      return [
        { id: 'add-task', label: 'Add Task', icon: Plus, color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)', onClick: onAddTask },
        { id: 'add-goal', label: 'Add Goal', icon: Target, color: '#22D3EE', glow: 'rgba(34,211,238,0.4)', onClick: onAddGoal },
        { id: 'optimize-day', label: 'Optimize Day', icon: Zap, color: '#FBBF24', glow: 'rgba(251,191,36,0.4)', onClick: onOptimizeDay },
        { id: 'ask-ai', label: 'Ask AI', icon: Bot, color: '#A78BFA', glow: 'rgba(167,139,250,0.4)', onClick: onOpenAi },
      ];
  }
}

function FloatingActionButtonInner({
  activeSection,
  onAddTask,
  onAddGoal,
  onAddEvent,
  onOptimizeDay,
  onOptimizeWeek,
  onOpenAi,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const actions = getActionsForSection(activeSection, {
    onAddTask,
    onAddGoal,
    onAddEvent,
    onOptimizeDay,
    onOptimizeWeek,
    onOpenAi,
  });

  const close = useCallback(() => setIsOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Close on section change
  useEffect(() => {
    close();
  }, [activeSection, close]);

  const handleAction = (action: SpeedDialAction) => {
    action.onClick();
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleActionKeyDown = (e: React.KeyboardEvent, action: SpeedDialAction) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction(action);
    }
  };

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      {/* Speed Dial Actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-end gap-3 pb-2"
            role="menu"
            aria-label="Quick actions"
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.id}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, scale: 0.3, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.3, x: 20 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 22,
                    delay: index * 0.06,
                  }}
                >
                  {/* Tooltip */}
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="px-3 py-1.5 rounded-lg bg-[#111318]/95 border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md whitespace-nowrap">
                      <p className="text-[11px] font-bold text-white">{action.label}</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    onClick={() => handleAction(action)}
                    onKeyDown={(e) => handleActionKeyDown(e, action)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="group relative h-12 w-12 rounded-full flex items-center justify-center cursor-pointer border border-white/10 backdrop-blur-md shadow-lg transition-colors"
                    style={{
                      background: `linear-gradient(135deg, ${action.color}25, ${action.color}10)`,
                      borderColor: `${action.color}30`,
                    }}
                    role="menuitem"
                    tabIndex={0}
                    aria-label={action.label}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${action.glow}`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${action.color}60`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                      (e.currentTarget as HTMLElement).style.borderColor = `${action.color}30`;
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: action.color }} />

                    {/* Tooltip on hover */}
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="px-3 py-1.5 rounded-lg bg-[#111318]/95 border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md whitespace-nowrap">
                        <p className="text-[11px] font-bold text-white">{action.label}</p>
                      </div>
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={{
          rotate: isOpen ? 45 : 0,
          boxShadow: isOpen
            ? '0 0 30px rgba(139,92,246,0.5), 0 8px 32px rgba(0,0,0,0.3)'
            : [
                '0 0 20px rgba(109,74,255,0.3), 0 8px 24px rgba(0,0,0,0.2)',
                '0 0 30px rgba(139,92,246,0.45), 0 8px 32px rgba(0,0,0,0.25)',
                '0 0 20px rgba(109,74,255,0.3), 0 8px 24px rgba(0,0,0,0.2)',
              ],
        }}
        transition={
          isOpen
            ? { type: 'spring', stiffness: 300, damping: 20 }
            : { boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }, rotate: { type: 'spring', stiffness: 300, damping: 20 } }
        }
        className="h-14 w-14 rounded-full bg-gradient-to-br from-[#6D4AFF] via-[#8B5CF6] to-[#A78BFA] text-white flex items-center justify-center cursor-pointer border border-white/15 shadow-[0_0_20px_rgba(109,74,255,0.3),0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md"
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

export const FloatingActionButton = memo(FloatingActionButtonInner);
