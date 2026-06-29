import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, FileText, BookOpen, Dumbbell, Users, Circle } from 'lucide-react';
import { timeToMinutes, formatDuration } from './helpers';
import type { Task } from './types';

interface SmartToDoListProps {
  tasks: Task[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: () => void;
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500', text: 'text-white' },
  high: { bg: 'bg-orange-500', text: 'text-white' },
  medium: { bg: 'bg-purple-500', text: 'text-white' },
  low: { bg: 'bg-gray-500', text: 'text-white' },
};

const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  assignments: FileText,
  study: BookOpen,
  workout: Dumbbell,
  gym: Dumbbell,
  meeting: Users,
};

function getCategoryIconComponent(category: string): React.FC<{ size?: number; className?: string }> {
  const key = category?.toLowerCase() || '';
  return CATEGORY_ICONS[key] || Circle;
}

function renderCategoryIcon(category: string, completed: boolean) {
  const Icon = getCategoryIconComponent(category);
  return <Icon size={16} className={`shrink-0 ${completed ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`} />;
}

function InlineEditInput({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }, [text, value, onSave, onCancel]);

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      className="flex-1 bg-transparent border-b border-[#6D4AFF] outline-none text-sm font-medium text-white px-0 py-0"
    />
  );
}

function TaskItem({
  task,
  onToggleComplete,
  onDelete,
  onUpdateTask,
}: {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: task.completed ? 0.5 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group flex items-center gap-3 rounded-[14px] border border-white/8 px-4 py-3 transition-all duration-200 ${
        task.completed
          ? 'bg-emerald-500/[0.04] opacity-50'
          : 'bg-white/[0.02] hover:bg-white/[0.05] hover:scale-[1.01] hover:shadow-lg'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(task.id, !task.completed)}
        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
          task.completed
            ? 'border-[#6D4AFF] bg-[#6D4AFF]'
            : 'border-white/20 hover:border-[#6D4AFF]/60'
        }`}
      >
        <AnimatePresence>
          {task.completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Check size={12} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Category Icon */}
      {renderCategoryIcon(task.customCategory || task.category, task.completed)}

      {/* Title + inline edit */}
      <div className="flex min-w-0 flex-1 items-center">
        {editing ? (
          <InlineEditInput
            value={task.title}
            onSave={(val) => {
              onUpdateTask(task.id, { title: val });
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span
            onClick={() => !task.completed && setEditing(true)}
            className={`truncate text-sm font-medium cursor-pointer transition-colors ${
              task.completed
                ? 'text-[#6B7280] line-through'
                : 'text-white hover:text-[#C4B5FD]'
            }`}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Priority badge */}
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${priorityStyle.bg} ${priorityStyle.text}`}
      >
        {task.priority}
      </span>

      {/* Due time */}
      <span className="hidden shrink-0 text-xs text-[#9CA3AF] sm:block">
        {task.dueTime || 'No time set'}
      </span>

      {/* Estimated duration */}
      <span className="hidden shrink-0 text-xs font-semibold text-[#A1A1AA] sm:block">
        {formatDuration(task.durationMinutes || 0)}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#6B7280] hover:text-red-400"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

function SmartToDoListInner({
  tasks,
  onToggleComplete,
  onDelete,
  onUpdateTask,
  onAddTask,
}: SmartToDoListProps) {
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pa = PRIORITY_ORDER[a.priority] ?? 4;
    const pb = PRIORITY_ORDER[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;
    return timeToMinutes(a.dueTime || '12:00 AM') - timeToMinutes(b.dueTime || '12:00 AM');
  });

  return (
    <div className="rounded-[28px] border border-white/8 bg-[#171923] p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#C4B5FD]">
            Today's Tasks
          </h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            {tasks.filter((t) => !t.completed).length} remaining
          </p>
        </div>
        <button
          onClick={onAddTask}
          className="rounded-full bg-[#6D4AFF] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#5B3AE6] active:scale-95"
        >
          + Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-[20px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-[#9CA3AF]"
            >
              <p>No tasks today 🎉</p>
              <button
                onClick={onAddTask}
                className="mt-3 text-xs font-bold text-[#6D4AFF] hover:text-[#C4B5FD] transition-colors"
              >
                Add your first task
              </button>
            </motion.div>
          ) : (
            sorted.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onUpdateTask={onUpdateTask}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const SmartToDoList = memo(SmartToDoListInner);
