import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Bell, 
  CalendarClock, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Download, 
  Filter, 
  Plus, 
  Search, 
  Sparkles, 
  Repeat, 
  Paperclip,
  Check,
  Trash2,
  Edit,
  GripVertical,
  Zap,
  ChevronRight,
} from 'lucide-react';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'overdue';
export type TaskFilter = 'all' | 'due_today' | 'due_week' | 'overdue' | 'completed' | 'in_progress' | 'recurring' | 'assignment' | 'work';

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  status: TaskStatus;
  dueDate: string;
  dueDateRaw?: Date;
  dueTime: string;
  durationMinutes: number;
  progress: number;
  priority: TaskPriority;
  completed: boolean;
  tags: string[];
  reminder: boolean;
  reminderMinutesBefore: number;
  repeatRule: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | '';
  linkedCalendarEventId?: string | null;
  subject?: string;
  faculty?: string;
  marksWeightage?: number;
  attachments?: string[];
  notes?: string;
  projectName?: string;
  team?: string;
  estimatedHours?: number;
  customCategory?: string;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
  orderIndex?: number;
  location?: string;
  guests?: string[];
  repeatFrequency?: string;
  goal?: string;
  streak?: number;
  endTime?: string;
}

export interface CalendarEventRecord {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
}

interface TaskWorkspaceProps {
  tasks: TaskRecord[];
  events: CalendarEventRecord[];
  onCreateTask: (category?: string) => void;
  onEditTask: (task: TaskRecord) => void;
  onUpdateTask: (taskId: string, data: Partial<TaskRecord>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleTaskCompleted: (taskId: string, completed: boolean) => Promise<void>;
  onDuplicateTask: (taskId: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onNavigate?: (section: string) => void;
  onOptimizeSchedule?: () => void;
}

const DEFAULT_CATEGORIES = [
  'All Tasks',
  '📚 Assignments',
  '💼 Work',
  '🎯 Personal',
  '🛒 Shopping',
  '🏠 Home',
  '💻 Coding',
  '📖 Study',
  '📝 Notes to Self',
  '⭐ Priority',
  '📦 Other'
];

const FILTERS: Array<{ key: TaskFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'due_today', label: 'Today' },
  { key: 'due_week', label: 'This Week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Done' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'assignment', label: 'Assignments' },
  { key: 'work', label: 'Work' },
];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-[#FEF2F2] dark:bg-[#2A1518] text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#5C242A]',
  high: 'bg-[#FFF7ED] dark:bg-[#2A1F15] text-[#EA580C] dark:text-[#F59E0B] border border-[#FDBA74] dark:border-[#523F27]',
  medium: 'bg-[#FFFBEB] dark:bg-[#282115] text-[#D97706] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#4B3D25]',
  low: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399] border border-[#A7F3D0] dark:border-[#154E38]',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
};

const getCategoryEmoji = (cat: string) => {
  const c = cat.toLowerCase().trim();
  if (c === 'assignments') return '📚';
  if (c === 'work') return '💼';
  if (c === 'personal') return '🎯';
  if (c === 'shopping') return '🛒';
  if (c === 'home') return '🏠';
  if (c === 'coding') return '💻';
  if (c === 'study') return '📖';
  if (c === 'notes to self') return '📝';
  if (c === 'priority') return '⭐';
  if (c === 'other') return '📦';
  return '🏷️';
};

const normalizeTabCategory = (tab: string) => {
  if (tab === 'All Tasks') return 'All Tasks';
  const parts = tab.split(' ');
  if (parts.length > 1 && !/^[a-zA-Z0-9]/.test(parts[0])) {
    return parts.slice(1).join(' ');
  }
  return tab;
};

const isSameDay = (left?: Date, right?: Date) => 
  Boolean(left && right && left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate());

const isWithinWeek = (date?: Date) => {
  if (!date) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date <= end;
};

const formatDeadline = (task: TaskRecord) => 
  (task.dueDateRaw ? (task.dueTime ? `${task.dueDate} · ${task.dueTime}` : task.dueDate) : task.dueDate);

export function TaskWorkspace({ 
  tasks, 
  events: _events, 
  onCreateTask, 
  onEditTask, 
  onUpdateTask, 
  onDeleteTask, 
  onToggleTaskCompleted, 
  onDuplicateTask, 
  showToast,
  onNavigate,
  onOptimizeSchedule
}: TaskWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilter>('all');
  const [activeTaskCategory, setActiveTaskCategory] = useState('All Tasks');
  const [taskSortMode, setTaskSortMode] = useState<'due' | 'priority' | 'recent' | 'custom'>('due');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [customCategoryDraft, setCustomCategoryDraft] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('Other');
  const [bulkPriorityTarget, setBulkPriorityTarget] = useState<TaskPriority>('medium');

  const now = new Date();
  const lowerQuery = searchQuery.trim().toLowerCase();

  const enrichedTasks = useMemo(() => tasks.map((task) => {
    const category = (task.customCategory || task.category || 'Other').trim() || 'Other';
    const overdue = !task.completed && task.dueDateRaw ? task.dueDateRaw.getTime() < now.getTime() : task.status === 'overdue';
    const status: TaskStatus = task.completed ? 'completed' : (overdue ? 'overdue' : task.status || 'not_started');
    return { ...task, category, status, overdue };
  }), [tasks, now.getTime()]);

  const categoryOptions = useMemo(() => {
    const defaultCleanNames = DEFAULT_CATEGORIES.map(c => normalizeTabCategory(c).toLowerCase());
    const allCustomRaw = Array.from(new Set([
      ...customCategories,
      ...enrichedTasks.map(t => t.category).filter(c => c && c.trim() !== '')
    ])).filter(c => !defaultCleanNames.includes(c.toLowerCase()));
    const formattedCustom = allCustomRaw.map(c => {
      if (/^[^\w\s]/.test(c)) return c;
      return `🏷️ ${c}`;
    });
    return [...DEFAULT_CATEGORIES, ...formattedCustom];
  }, [customCategories, enrichedTasks]);

  const visibleTasks = useMemo(() => enrichedTasks.filter((task) => {
    const matchesSearch = !lowerQuery || [
      task.title, task.description, task.category, task.subject,
      task.faculty, task.projectName, task.team, task.notes,
      ...(task.tags || [])
    ].join(' ').toLowerCase().includes(lowerQuery);
    
    const cleanActiveCat = normalizeTabCategory(activeTaskCategory);
    const matchesCategory = cleanActiveCat === 'All Tasks' || task.category.toLowerCase() === cleanActiveCat.toLowerCase();
    
    const matchesFilter = activeTaskFilter === 'all' ? true
      : activeTaskFilter === 'due_today' ? isSameDay(task.dueDateRaw, now)
      : activeTaskFilter === 'due_week' ? isWithinWeek(task.dueDateRaw)
      : activeTaskFilter === 'overdue' ? task.overdue
      : activeTaskFilter === 'completed' ? task.completed
      : activeTaskFilter === 'in_progress' ? task.status === 'in_progress'
      : activeTaskFilter === 'recurring' ? Boolean(task.repeatRule)
      : activeTaskFilter === 'assignment' ? task.category.toLowerCase().includes('assignment') || Boolean(task.subject || task.faculty || task.marksWeightage)
      : activeTaskFilter === 'work' ? task.category.toLowerCase().includes('work') || Boolean(task.projectName || task.team || task.estimatedHours)
      : true;
      
    return matchesSearch && matchesCategory && matchesFilter;
  }), [activeTaskCategory, activeTaskFilter, enrichedTasks, lowerQuery, now]);

  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...visibleTasks].sort((left, right) => {
      if (taskSortMode === 'priority') return priorityOrder[left.priority] - priorityOrder[right.priority];
      if (taskSortMode === 'recent') return (right.updatedAt?.seconds || right.createdAt?.seconds || 0) - (left.updatedAt?.seconds || left.createdAt?.seconds || 0);
      if (taskSortMode === 'custom') return (left.orderIndex ?? 0) - (right.orderIndex ?? 0) || (left.createdAt?.seconds || 0) - (right.createdAt?.seconds || 0);
      return (left.dueDateRaw?.getTime() || Number.MAX_SAFE_INTEGER) - (right.dueDateRaw?.getTime() || Number.MAX_SAFE_INTEGER) || priorityOrder[left.priority] - priorityOrder[right.priority];
    });
  }, [taskSortMode, visibleTasks]);

  const selectedTasks = useMemo(() => enrichedTasks.filter((task) => selectedTaskIds.includes(task.id)), [enrichedTasks, selectedTaskIds]);
  const upcomingDeadlines = useMemo(() => 
    [...enrichedTasks].filter(t => !t.completed && t.dueDateRaw)
      .sort((a, b) => (a.dueDateRaw?.getTime() || Number.MAX_SAFE_INTEGER) - (b.dueDateRaw?.getTime() || Number.MAX_SAFE_INTEGER))
      .slice(0, 3),
    [enrichedTasks]
  );

  // AI coaching suggestions
  const aiSuggestionsList = useMemo(() => {
    const suggestions: string[] = [];
    const overdueList = enrichedTasks.filter(t => t.status === 'overdue' && !t.completed);
    if (overdueList.length > 0) {
      suggestions.push(`⚠️ ${overdueList.length} overdue task${overdueList.length === 1 ? '' : 's'} — reschedule them to regain momentum!`);
    }
    const assignmentsDue = enrichedTasks.filter(t => !t.completed && (t.category.toLowerCase() === 'assignments' || t.subject || t.faculty) && isWithinWeek(t.dueDateRaw));
    if (assignmentsDue.length > 0) {
      suggestions.push(`📚 ${assignmentsDue.length} assignment${assignmentsDue.length === 1 ? '' : 's'} due this week — lock in deep study blocks.`);
      const crit = assignmentsDue.find(t => t.priority === 'critical' || t.priority === 'high');
      if (crit) suggestions.push(`🔥 Prioritize "${crit.title}" today to lower workload risk.`);
    }
    const dayCounts: Record<string, number> = {};
    enrichedTasks.forEach(t => { if (!t.completed && t.dueDateRaw) dayCounts[t.dueDate] = (dayCounts[t.dueDate] || 0) + 1; });
    const heavyDay = Object.entries(dayCounts).find(([, count]) => count >= 4)?.[0];
    if (heavyDay) suggestions.push(`📅 Schedule looks heavy on ${heavyDay} — stagger lower priority items.`);
    if (suggestions.length === 0) {
      suggestions.push("🎉 Outstanding! All tasks are balanced and on track.");
      suggestions.push("💡 Knock out a daily habit to keep your momentum streak alive.");
    }
    return suggestions.slice(0, 3);
  }, [enrichedTasks, now]);

  const toggleTaskSelection = (taskId: string) => 
    setSelectedTaskIds(cur => cur.includes(taskId) ? cur.filter(id => id !== taskId) : [...cur, taskId]);
  const clearSelection = () => setSelectedTaskIds([]);

  const exportTasks = () => {
    const payload = JSON.stringify(selectedTasks.length > 0 ? selectedTasks : sortedTasks, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'momentum-tasks-export.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export created ✓', 'success');
  };

  const runBulk = async (runner: (task: TaskRecord) => Promise<void>, success: string, error: string) => {
    try {
      for (const task of selectedTasks) await runner(task);
      clearSelection();
      showToast(success, 'success');
    } catch (_err) {
      showToast(error, 'error');
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryDraft.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed)) setCustomCategories([...customCategories, trimmed]);
    setActiveTaskCategory(`🏷️ ${trimmed}`);
    setCustomCategoryDraft('');
    onCreateTask(trimmed);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDropOnCard = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData('text/plain');
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;
    const draggedTask = enrichedTasks.find(t => t.id === draggedTaskId);
    const targetTask = enrichedTasks.find(t => t.id === targetTaskId);
    if (!draggedTask || !targetTask) return;
    const draggedOrder = draggedTask.orderIndex ?? 0;
    const targetOrder = targetTask.orderIndex ?? 0;
    if (draggedOrder === targetOrder) {
      try {
        const visibleIds = visibleTasks.map(t => t.id);
        const fromIndex = visibleIds.indexOf(draggedTaskId);
        const toIndex = visibleIds.indexOf(targetTaskId);
        const reorderedIds = [...visibleIds];
        reorderedIds.splice(fromIndex, 1);
        reorderedIds.splice(toIndex, 0, draggedTaskId);
        for (let i = 0; i < reorderedIds.length; i++) await onUpdateTask(reorderedIds[i], { orderIndex: i });
        showToast('Tasks reordered ✓', 'success');
      } catch (err) {
        console.error('Error reordering:', err);
        showToast('Reorder failed', 'error');
      }
    } else {
      await onUpdateTask(draggedTaskId, { orderIndex: targetOrder });
      await onUpdateTask(targetTaskId, { orderIndex: draggedOrder });
      showToast('Tasks reordered ✓', 'success');
    }
  };

  const handleDropOnTab = async (e: React.DragEvent, tabName: string) => {
    e.preventDefault();
    const targetTabEl = e.currentTarget;
    targetTabEl.classList.remove('bg-[#F3EEFF]', 'dark:bg-[#1C1836]', 'border-[#6D4AFF]');
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const cleanCatName = normalizeTabCategory(tabName);
    if (cleanCatName === 'All Tasks') return;
    try {
      await onUpdateTask(taskId, { category: cleanCatName, customCategory: cleanCatName });
      showToast(`Category updated to ${cleanCatName} ✓`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update category', 'error');
    }
  };

  const pendingCount = enrichedTasks.filter(t => !t.completed).length;
  const overdueCount = enrichedTasks.filter(t => t.overdue && !t.completed).length;

  // Empty state
  const emptyState = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-[28px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-[linear-gradient(180deg,rgba(251,252,255,0.8),rgba(243,244,246,0.8))] dark:bg-[linear-gradient(180deg,rgba(25,29,46,0.4),rgba(15,17,23,0.4))] p-14 text-center shadow-[0_30px_80px_-40px_rgba(17,24,39,0.35)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#6D4AFF]/10 text-[#6D4AFF] dark:text-[#A78BFA] shadow-[inset_0_0_20px_rgba(109,74,255,0.05)] relative mb-6">
        <Sparkles className="h-10 w-10 animate-[pulse-soft_2.5s_infinite]" />
        <div className="absolute inset-0 rounded-full border border-[#6D4AFF]/20 animate-ping [animation-duration:3s]" />
      </div>
      <h3 className="text-2xl font-black tracking-tight text-[#111827] dark:text-white">You're all caught up!</h3>
      <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-[#6B7280] dark:text-[#A1A1AA]">
        No pending items in this category. Create your first task to start organizing your work and building momentum.
      </p>
      <motion.button 
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onCreateTask(normalizeTabCategory(activeTaskCategory) === 'All Tasks' ? 'Assignments' : normalizeTabCategory(activeTaskCategory))}
        className="app-button-primary mx-auto mt-8 px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-[0_12px_24px_-10px_rgba(109,74,255,0.4)] cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Add Your First Task
      </motion.button>
    </motion.div>
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-5 pb-16 text-left">

      {/* ── 1. Single-Row Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Title + Counts */}
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Priority Tasks</h2>
          <span className="rounded-full bg-purple-500/10 text-[#6D4AFF] dark:text-[#A78BFA] border border-purple-500/20 px-3 py-0.5 text-xs font-black shrink-0">
            {pendingCount} pending
          </span>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-0.5 text-xs font-black shrink-0 animate-pulse">
              {overdueCount} overdue
            </span>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate('AI Coach')}
              className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1D1F2D] hover:bg-purple-500/5 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6] animate-pulse" /> Ask AI
            </motion.button>
          )}
          {onOptimizeSchedule && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOptimizeSchedule}
              className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1D1F2D] hover:bg-amber-500/5 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Optimize Schedule
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onCreateTask('Assignments')}
            className="app-button-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-bold shadow-md hover:brightness-110 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Task
          </motion.button>
        </div>
      </div>

      {/* ── 2. Compact Goals & Habits Banner ── */}
      <div className="relative overflow-hidden rounded-[18px] border border-purple-500/20 dark:border-purple-500/10 bg-gradient-to-r from-purple-500/6 via-indigo-500/4 to-transparent px-4 py-3 flex items-center justify-between gap-3 shadow-sm backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-[#6D4AFF]/3 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 min-w-0 relative z-10">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          </span>
          <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">
            <span className="text-[#6D4AFF] dark:text-[#A78BFA] mr-1">Goals & Habits:</span>
            {aiSuggestionsList[0] ?? "Your schedule is well balanced. Great focus! ✨"}
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('AI Coach')}
            className="relative z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#6D4AFF] dark:text-[#A78BFA] hover:underline cursor-pointer transition shrink-0"
          >
            View Goals <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── 3. Upcoming Deadlines (compact horizontal, max 3) ── */}
      {upcomingDeadlines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-purple-500" />
            Upcoming Deadlines
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {upcomingDeadlines.map((task) => (
              <motion.div
                key={task.id}
                whileHover={{ y: -2, scale: 1.01 }}
                onClick={() => onEditTask(task)}
                className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white/60 dark:bg-[#1C1E2C]/60 p-3 cursor-pointer transition-shadow hover:shadow-md flex items-center justify-between gap-3 min-w-0 backdrop-blur-sm"
              >
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{task.title}</p>
                    <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">{task.dueDate}{task.dueTime ? ` @ ${task.dueTime}` : ''}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Sticky Filter Toolbar ── */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-slate-50/88 dark:bg-[#131520]/88 py-3.5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-gray-150/30 dark:border-white/5 space-y-3">
        
        {/* Row 1: Filters + Search + Sort */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-white/50 dark:bg-white/5 border dark:border-white/5 rounded-full p-1 w-fit shadow-sm">
            {FILTERS.map((filter) => (
              <motion.button
                key={filter.key}
                onClick={() => setActiveTaskFilter(filter.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  activeTaskFilter === filter.key
                    ? 'bg-[#6D4AFF] text-white shadow-md'
                    : 'text-gray-500 dark:text-[#A1A1AA] hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {filter.label}
              </motion.button>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-white/80 dark:bg-[#1D1F2D]/80 border border-gray-200 dark:border-white/8 rounded-full pl-9 pr-3.5 py-1.5 text-xs outline-none text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#6D4AFF] focus:ring-1 focus:ring-[#6D4AFF] transition"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-white/8 bg-white/80 dark:bg-[#1C1E2C] px-3.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-[#8B5CF6] shrink-0" />
              <select
                value={taskSortMode}
                onChange={(e) => setTaskSortMode(e.target.value as any)}
                className="bg-transparent text-xs font-extrabold text-gray-700 dark:text-white outline-none cursor-pointer"
              >
                <option value="due">Due Date</option>
                <option value="priority">Priority</option>
                <option value="custom">Custom Order</option>
                <option value="recent">Recently Updated</option>
              </select>
            </div>

            {/* Calendar View */}
            {onNavigate && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate('Calendar')}
                className="rounded-full border border-gray-200 dark:border-white/8 bg-white/80 dark:bg-[#1C1E2C] hover:bg-purple-500/5 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <CalendarClock className="h-3.5 w-3.5 text-[#6D4AFF]" /> Calendar
              </motion.button>
            )}
          </div>
        </div>

        {/* Row 2: Category Chips */}
        <div className="flex flex-wrap items-center gap-2 justify-between pt-2 border-t border-gray-150/30 dark:border-white/5">
          <div className="flex flex-wrap gap-1.5">
            {categoryOptions.map((category) => {
              const isActive = activeTaskCategory === category;
              return (
                <motion.button
                  key={category}
                  onClick={() => setActiveTaskCategory(category)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('!border-[#6D4AFF]', '!bg-[#F3EEFF]');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('!border-[#6D4AFF]', '!bg-[#F3EEFF]');
                  }}
                  onDrop={(e) => handleDropOnTab(e, category)}
                  whileHover={{ scale: 1.06, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  className={`rounded-full border px-3.5 py-1 text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-[#6D4AFF] bg-[#F3EEFF] text-[#6D4AFF] dark:border-[#8B5CF6] dark:bg-[#1C1836] dark:text-[#A78BFA] shadow-[0_0_14px_rgba(109,74,255,0.28)] ring-1 ring-[#6D4AFF]/20'
                      : 'border-gray-200 bg-white/80 text-gray-500 dark:border-white/8 dark:bg-white/5 dark:text-[#A1A1AA] hover:border-purple-400/40 hover:text-[#6D4AFF] dark:hover:border-purple-500/30 dark:hover:text-[#A78BFA]'
                  }`}
                >
                  {category}
                </motion.button>
              );
            })}
          </div>

          {/* Add Category */}
          <div className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/8 bg-white/80 dark:bg-white/5 px-2 py-0.5 ml-auto">
            <input
              value={customCategoryDraft}
              onChange={(e) => setCustomCategoryDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
              placeholder="New category..."
              className="w-24 bg-transparent px-2 py-1 text-[11px] outline-none text-gray-900 dark:text-white placeholder-gray-400 font-medium"
            />
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleAddCustomCategory}
              className="rounded-full bg-[#6D4AFF] hover:bg-[#5B3FF0] px-3 py-1 text-[10px] font-bold text-white transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5" /> Add
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── 5. Task Card Board ── */}
      <div className="space-y-3 pt-1">
        {sortedTasks.length === 0 ? emptyState : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);
              const isAssignment = task.category.toLowerCase().includes('assignment') || Boolean(task.subject || task.faculty);
              const isWork = task.category.toLowerCase().includes('work') || Boolean(task.projectName || task.team);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: task.completed ? 0.65 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  key={task.id}
                  draggable
                  onDragStart={(e: any) => handleDragStart(e, task.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnCard(e, task.id)}
                  onDoubleClick={() => onEditTask(task)}
                  className={`group w-full rounded-[20px] border text-left transition-all duration-250 relative select-none ${
                    task.completed
                      ? 'bg-slate-50/40 dark:bg-slate-900/30 border-gray-200/40 dark:border-white/4 py-2 px-5'
                      : isSelected
                      ? 'border-[#6D4AFF] bg-[#F8F5FF] dark:bg-[#1A1731] shadow-[0_8px_32px_rgba(109,74,255,0.12)] p-5'
                      : 'border-[#EDF0F5] dark:border-white/7 bg-white dark:bg-[#1C1E2C] shadow-[0_4px_20px_-8px_rgba(17,24,39,0.08)] hover:shadow-[0_12px_36px_-12px_rgba(17,24,39,0.14)] hover:-translate-y-0.5 hover:border-purple-400/25 dark:hover:border-purple-500/15 p-5'
                  }`}
                >
                  {/* COMPLETED TASK — collapsed single row */}
                  {task.completed ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggleTaskCompleted(task.id, false)}
                        className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-md border border-emerald-500 bg-emerald-500 text-white cursor-pointer focus:outline-none transition-all hover:bg-emerald-600"
                      >
                        <Check className="h-2.5 w-2.5" />
                      </button>
                      <span className="flex-1 text-xs font-semibold text-gray-400 dark:text-gray-600 line-through truncate">{task.title}</span>
                      <span className="text-[9px] text-gray-400 dark:text-gray-600 shrink-0">{task.dueDate}</span>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* ACTIVE TASK — full card */
                    <div className="flex items-start gap-3.5">
                      {/* Drag Handle */}
                      <div
                        className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-700 hover:text-[#6D4AFF] transition p-0.5 shrink-0"
                        title="Drag to Reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Multi-select */}
                      <button
                        onClick={() => toggleTaskSelection(task.id)}
                        className="mt-0.5 shrink-0 rounded-full cursor-pointer focus:outline-none"
                        aria-label="select task"
                      >
                        {isSelected
                          ? <CheckCircle2 className="h-5 w-5 text-[#6D4AFF]" />
                          : <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 hover:text-[#6D4AFF] transition" />
                        }
                      </button>

                      {/* Complete Toggle */}
                      <button
                        onClick={() => onToggleTaskCompleted(task.id, true)}
                        className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161927] text-transparent hover:border-emerald-500 hover:text-emerald-500 cursor-pointer focus:outline-none transition-all duration-200"
                      >
                        <Check className="h-3 w-3" />
                      </button>

                      {/* Main Content */}
                      <div className="min-w-0 flex-1">
                        {/* Title Row */}
                        <div className="flex flex-wrap items-start gap-2">
                          <h4 className="text-[15px] font-black tracking-tight leading-tight text-gray-900 dark:text-white">
                            {task.title}
                          </h4>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold shrink-0 mt-0.5 ${PRIORITY_STYLES[task.priority]}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          <span className="rounded-full bg-purple-500/10 text-[#6D4AFF] dark:text-[#A78BFA] px-2 py-0.5 text-[9px] font-bold border border-purple-500/15 shrink-0 mt-0.5">
                            {getCategoryEmoji(task.category)} {task.category}
                          </span>
                          {task.repeatRule && (
                            <span className="rounded-full bg-[#EEF6FF] px-2 py-0.5 text-[9px] font-bold text-[#2563EB] dark:bg-[#142035] dark:text-[#60A5FA] inline-flex items-center shrink-0 mt-0.5">
                              <Repeat className="mr-1 h-2.5 w-2.5" /> Recurring
                            </span>
                          )}
                          {task.linkedCalendarEventId && (
                            <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[9px] font-bold text-[#059669] dark:bg-[#0C251C] dark:text-[#34D399] inline-flex items-center shrink-0 mt-0.5">
                              <CalendarClock className="mr-1 h-2.5 w-2.5" /> Synced
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        {task.progress > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(4, task.progress)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-[#6D4AFF] to-[#8B5CF6] shadow-sm"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 shrink-0">{task.progress}%</span>
                          </div>
                        )}

                        {/* Assignment fields */}
                        {isAssignment && (task.subject || task.faculty || task.marksWeightage) && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl bg-gray-50/60 dark:bg-black/10 p-2.5 text-[10px] text-gray-600 dark:text-[#A1A1AA] border border-gray-100/60 dark:border-white/5 font-semibold">
                            {task.subject && <div className="flex items-center gap-1"><span>🎓</span><span>Subject: <b className="text-gray-900 dark:text-white">{task.subject}</b></span></div>}
                            {task.faculty && <div className="flex items-center gap-1"><span>👤</span><span>Faculty: <b className="text-gray-900 dark:text-white">{task.faculty}</b></span></div>}
                            {task.marksWeightage !== undefined && task.marksWeightage > 0 && <div className="flex items-center gap-1"><span>📈</span><span>Weight: <b className="text-gray-900 dark:text-white">{task.marksWeightage}%</b></span></div>}
                          </div>
                        )}

                        {/* Work fields */}
                        {isWork && (task.projectName || task.team || task.estimatedHours) && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl bg-gray-50/60 dark:bg-black/10 p-2.5 text-[10px] text-gray-600 dark:text-[#A1A1AA] border border-gray-100/60 dark:border-white/5 font-semibold">
                            {task.projectName && <div className="flex items-center gap-1"><span>📁</span><span>Project: <b className="text-gray-900 dark:text-white">{task.projectName}</b></span></div>}
                            {task.team && <div className="flex items-center gap-1"><span>👥</span><span>Team: <b className="text-gray-900 dark:text-white">{task.team}</b></span></div>}
                            {task.estimatedHours !== undefined && task.estimatedHours > 0 && <div className="flex items-center gap-1"><span>⏱️</span><span>Hours: <b className="text-gray-900 dark:text-white">{task.estimatedHours}h</b></span></div>}
                          </div>
                        )}

                        {/* Notes */}
                        {task.notes && (
                          <div className="mt-2 text-[10.5px] italic text-gray-400 dark:text-gray-500 border-l-2 border-gray-200 dark:border-white/5 pl-2.5">
                            "{task.notes}"
                          </div>
                        )}

                        {/* Metadata Chips Row */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 dark:text-[#A1A1AA] font-semibold">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 dark:bg-white/5 px-2.5 py-1 border border-gray-100 dark:border-white/5">
                            <Clock className="h-3 w-3 text-purple-500" /> {formatDeadline(task)}
                          </span>
                          {task.durationMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 dark:bg-white/5 px-2.5 py-1 border border-gray-100 dark:border-white/5">
                              ⏱ {task.durationMinutes}m
                            </span>
                          )}
                          {task.reminder && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 dark:bg-white/5 px-2.5 py-1 border border-gray-100 dark:border-white/5">
                              <Bell className="h-3 w-3 text-amber-500" /> Reminder
                            </span>
                          )}
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 dark:bg-white/5 px-2.5 py-1 border border-gray-100 dark:border-white/5">
                              <Paperclip className="h-3 w-3" /> {task.attachments.length}
                            </span>
                          )}
                          {task.tags?.map((tag) => (
                            <span key={tag} className="rounded-full bg-[#F3EEFF] px-2.5 py-1 text-[#6D4AFF] dark:bg-[#1C1836] dark:text-[#A78BFA]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right Icon Actions (hover-only) */}
                      <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5">
                        <motion.button
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEditTask(task)}
                          title="Edit"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1D1F2D] text-gray-600 dark:text-gray-400 hover:text-[#6D4AFF] hover:border-purple-400/30 transition cursor-pointer shadow-sm"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDeleteTask(task.id)}
                          title="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 bg-red-50 dark:bg-red-950/10 dark:border-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/20 transition cursor-pointer shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── 6. Floating Bulk Actions Dock ── */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 56, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 56, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-6 left-1/2 z-[70] flex flex-wrap items-center gap-3 rounded-[22px] border border-white/10 bg-[#171923]/93 px-6 py-3.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md min-w-[320px] max-w-[90%] sm:max-w-2xl text-left"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6D4AFF] text-[10px] font-black text-white">
                {selectedTaskIds.length}
              </span>
              <span className="text-xs font-bold text-white">Selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => runBulk((task) => onToggleTaskCompleted(task.id, true), 'Tasks marked completed ✓', 'Failed to complete tasks')}
                className="rounded-xl bg-[#6D4AFF] hover:bg-[#5B3FF0] px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer"
              >Complete</button>
              <button
                onClick={() => runBulk((task) => onDuplicateTask(task.id), 'Tasks duplicated ✓', 'Failed to duplicate tasks')}
                className="rounded-xl border border-white/10 hover:bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer"
              >Duplicate</button>
              <button
                onClick={() => runBulk((task) => onDeleteTask(task.id), 'Tasks deleted ✓', 'Failed to delete tasks')}
                className="rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 px-3.5 py-2 text-xs font-bold text-red-400 transition cursor-pointer"
              >Delete</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <div className="flex items-center gap-1 bg-[#1D1F2D] border border-white/10 rounded-xl px-2 py-1">
                <select
                  value={bulkCategoryTarget}
                  onChange={(e) => setBulkCategoryTarget(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer pr-1"
                >
                  <option disabled value="">Move to Category</option>
                  {DEFAULT_CATEGORIES.filter(c => c !== 'All Tasks').map(c => {
                    const clean = normalizeTabCategory(c);
                    return <option key={clean} value={clean}>{c}</option>;
                  })}
                </select>
                <button
                  onClick={() => runBulk((task) => onUpdateTask(task.id, { category: bulkCategoryTarget, customCategory: bulkCategoryTarget }), 'Category updated ✓', 'Failed')}
                  className="bg-white text-black hover:bg-white/90 px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer"
                >Move</button>
              </div>

              <div className="flex items-center gap-1 bg-[#1D1F2D] border border-white/10 rounded-xl px-2 py-1">
                <select
                  value={bulkPriorityTarget}
                  onChange={(e) => setBulkPriorityTarget(e.target.value as TaskPriority)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer pr-1"
                >
                  <option disabled value="">Set Priority</option>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <button
                  onClick={() => runBulk((task) => onUpdateTask(task.id, { priority: bulkPriorityTarget }), 'Priority updated ✓', 'Failed')}
                  className="bg-white text-black hover:bg-white/90 px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer"
                >Set</button>
              </div>

              <button
                onClick={exportTasks}
                className="p-2 border border-white/10 hover:bg-white/5 rounded-xl text-white cursor-pointer"
                title="Export Selected"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={clearSelection}
                className="p-2 border border-white/10 hover:bg-white/5 rounded-xl text-white/60 hover:text-white cursor-pointer"
                title="Clear Selection"
              >
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
