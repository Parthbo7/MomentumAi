import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Edit3, Lock, Calendar, ChevronLeft, ChevronRight, 
  Check, MoreVertical, Archive, 
  Flame, CalendarDays, Sparkles, Clock, Target,
  Copy, CheckSquare as CheckIcon,
  Brain, X, Timer
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { 
  dbDeleteGoal,
  dbCreateGoalWithSchedule, dbUpdateGoalSchedule,
  dbCompleteGoalSession, dbHandleMissedSession,
  dbToggleHabitCompleted, dbDeleteHabit, 
  dbCreateHabitWithSchedule, dbUpdateHabitSchedule,
  dbAddEvent, dbUpdateEvent, dbDeleteEvent 
} from '../firebaseService';
import { generateGoalEvents, generateHabitEvents, type DbGoalInput, type DbHabitInput, type ExistingBlock } from '../lib/goalScheduleEngine';

// Time Conversions & Helpers
const HOUR_HEIGHT = 80;
const GRID_START_MINS = 420; // 7:00 AM
const GRID_END_MINS = 1320; // 10:00 PM

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 720;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 720;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const minutesToTimeStr = (totalMins: number): string => {
  const clamped = Math.min(1439, Math.max(0, totalMins));
  let hours = Math.floor(clamped / 60) % 24;
  const minutes = clamped % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minsStr = minutes < 10 ? '0' + minutes : String(minutes);
  return `${hours}:${minsStr} ${ampm}`;
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekDays = (refDate: Date): Date[] => {
  const start = new Date(refDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(start.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

interface GoalsHabitsWorkspaceProps {
  user: any;
  events: any[];
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function GoalsHabitsWorkspace({
  user,
  events,
  setEvents,
  showToast
}: GoalsHabitsWorkspaceProps) {
  // DB Lists
  const [goals, setGoals] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);

  // Helpers for Event colors and statuses
  const getEventColorClass = (ev: any) => {
    if (ev.completed) {
      return 'bg-emerald-600 dark:bg-emerald-700 text-white border-l-[4px] border-emerald-400 hover:shadow-md cursor-pointer';
    }
    if (ev.missedAt) {
      return 'bg-rose-600 dark:bg-rose-700 text-white border-l-[4px] border-rose-400 hover:shadow-md cursor-pointer';
    }
    if (ev.rescheduledFrom) {
      return 'bg-amber-600 dark:bg-amber-700 text-white border-l-[4px] border-amber-400 hover:shadow-md cursor-pointer';
    }
    
    const isLocked = ev.flexibleScheduling === false || 
                     ev.isLocked === true ||
                     ev.category?.toLowerCase() === 'college' || 
                     ev.title.toLowerCase().includes('class');

    if (ev.isGoalEvent) {
      if (ev.goalSchedulingType === 'fixed') {
        return 'bg-blue-600 dark:bg-blue-700 text-white border-l-[4px] border-blue-400 cursor-not-allowed';
      } else {
        return 'bg-purple-600 dark:bg-purple-700 text-white border-l-[4px] border-purple-400 cursor-grab active:cursor-grabbing hover:shadow-md';
      }
    }

    return isLocked 
      ? 'bg-blue-900/90 dark:bg-blue-950/90 text-blue-100 border-l-[4px] border-blue-500 cursor-not-allowed' 
      : 'bg-[#6D4AFF] text-white border-l-[4px] border-purple-400 cursor-grab active:cursor-grabbing hover:shadow-md';
  };

  const isEventInPast = (ev: any) => {
    if (!ev || !ev.date || !ev.end) return false;
    const now = new Date();
    const todayStr = formatDateKey(now);
    if (ev.date < todayStr) return true;
    if (ev.date === todayStr) {
      return timeToMinutes(ev.end) < (now.getHours() * 60 + now.getMinutes());
    }
    return false;
  };

  // Selection & Navigation
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('day');

  // Modals
  const [activeModal, setActiveModal] = useState<'goal' | 'habit' | 'editGoal' | 'editHabit' | 'eventDetails' | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [selectedDetailGoal, setSelectedDetailGoal] = useState<any>(null);
  const [selectedHabit, setSelectedHabit] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Form states for Goals
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState('Fitness');
  const [goalPriority, setGoalPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [goalTargetDate, setGoalTargetDate] = useState(formatDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [goalWeeklyHours, setGoalWeeklyHours] = useState(4);
  const [goalProgressType, setGoalProgressType] = useState<'percentage' | 'sessions' | 'tasks' | 'hours'>('percentage');
  const [goalIcon, setGoalIcon] = useState('🏋');
  const [goalTargetValue, setGoalTargetValue] = useState(100);

  // Form states for Habits
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitIcon, setHabitIcon] = useState('💧');
  const [habitCategory, setHabitCategory] = useState('Health');
  const [habitPreferredTime, setHabitPreferredTime] = useState('09:00 AM');
  const [habitDuration, setHabitDuration] = useState(15);
  const [habitRepeat, setHabitRepeat] = useState<'daily' | 'weekdays' | 'weekends' | 'custom' | 'monthly'>('daily');
  const [habitReminder, setHabitReminder] = useState(true);
  const [habitAllowAiReschedule, setHabitAllowAiReschedule] = useState(true);
  const [habitLockTime, setHabitLockTime] = useState(true);
  const [habitDifficulty, setHabitDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Time Block Drag-and-drop Coordinates
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ y: number; top: number; date: string; height: number } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredTimeMinutes, setHoveredTimeMinutes] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eventId: string } | null>(null);

  // AI suggestions list based on schedule & progress
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // ── Wizard state ─────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardSchedulingType, setWizardSchedulingType] = useState<'ai' | 'fixed' | 'flexible'>('fixed');
  const [wizardFixedStart, setWizardFixedStart] = useState('05:00 PM');
  const [wizardFixedEnd, setWizardFixedEnd] = useState('06:00 PM');
  const [wizardFlexStart, setWizardFlexStart] = useState('06:00 PM');
  const [wizardFlexEnd, setWizardFlexEnd] = useState('10:00 PM');
  const [wizardDuration, setWizardDuration] = useState(60);
  const [wizardRepeatRule, setWizardRepeatRule] = useState<'daily'|'weekdays'|'weekends'|'selected'|'monthly'>('selected');
  const [wizardRepeatDays, setWizardRepeatDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [wizardSessionsPerWeek, setWizardSessionsPerWeek] = useState(3);
  const [wizardIsLocked, setWizardIsLocked] = useState(true);
  const [wizardPreviewSpecs, setWizardPreviewSpecs] = useState<any[]>([]);
  const [wizardSaving, setWizardSaving] = useState(false);

  // Missed session dialog
  const [missedLoading, setMissedLoading] = useState(false);

  // 1. Firebase Listeners for Goals and Habits
  useEffect(() => {
    if (!user) return;
    const goalsQ = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(goalsQ, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d });
      });
      setGoals(list);
    });

    const habitsQ = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsubHabits = onSnapshot(habitsQ, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d });
      });
      setHabits(list);
    });

    return () => {
      unsubGoals();
      unsubHabits();
    };
  }, [user]);

  // 2. Generate AI Insights / suggestions based on live data
  useEffect(() => {
    const suggestions: string[] = [];
    if (goals.length > 0) {
      const behindGoals = goals.filter(g => (g.progress / (g.target || 1)) < 0.3);
      if (behindGoals.length > 0) {
        suggestions.push(`⚠️ Progress Alert: You are behind on "${behindGoals[0].title}". Consider rescheduling deep work blocks for it.`);
      }
    }
    const uncompletedHabits = habits.filter(h => !h.completedToday);
    if (uncompletedHabits.length > 0) {
      suggestions.push(`💡 Streak recovery: You have ${uncompletedHabits.length} habits remaining today. Complete "${uncompletedHabits[0].title}" to keep your streak!`);
    }
    // Check conflicts
    const dayKey = formatDateKey(selectedDate);
    const dayEvents = events.filter(e => e.date === dayKey);
    let hasConflict = false;
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const startA = timeToMinutes(dayEvents[i].start);
        const endA = timeToMinutes(dayEvents[i].end);
        const startB = timeToMinutes(dayEvents[j].start);
        const endB = timeToMinutes(dayEvents[j].end);
        if (startA < endB && startB < endA) {
          hasConflict = true;
          break;
        }
      }
    }
    if (hasConflict) {
      suggestions.push("⚡ Conflict Detected: Some blocks overlap in your calendar. Click 'Optimize Schedule' to resolve conflicts automatically.");
    } else if (suggestions.length === 0) {
      suggestions.push("✨ Schedule Health is optimal! No conflicts, and your deep work slots are fully protected.");
    }
    setAiSuggestions(suggestions);
  }, [goals, habits, events, selectedDate]);

  // Generate preview whenever scheduling params change (for wizard step 4)
  const generatePreview = useCallback(() => {
    const existing: ExistingBlock[] = events.map((e: any) => ({
      date: e.date,
      start: e.start,
      end: e.end,
    }));
    const goalInput: DbGoalInput = {
      id: 'preview',
      title: goalName || 'My Goal',
      icon: goalIcon,
      category: goalCategory,
      priority: goalPriority,
      schedulingType: wizardSchedulingType,
      fixedStartTime: wizardFixedStart,
      fixedEndTime: wizardFixedEnd,
      flexWindowStart: wizardFlexStart,
      flexWindowEnd: wizardFlexEnd,
      sessionDurationMins: wizardDuration,
      sessionsPerWeek: wizardSessionsPerWeek,
      repeatDays: wizardRepeatRule === 'selected' ? wizardRepeatDays : undefined,
      repeatRule: wizardRepeatRule,
      targetDate: goalTargetDate,
      isLocked: wizardIsLocked,
    };
    const specs = generateGoalEvents(goalInput, existing, 2);
    setWizardPreviewSpecs(specs.slice(0, 14)); // show first 14 sessions
  }, [events, goalName, goalIcon, goalCategory, goalPriority, wizardSchedulingType,
      wizardFixedStart, wizardFixedEnd, wizardFlexStart, wizardFlexEnd,
      wizardDuration, wizardSessionsPerWeek, wizardRepeatRule, wizardRepeatDays, goalTargetDate, wizardIsLocked]);

  // Reactive preview generator for Wizard Step 4
  useEffect(() => {
    if (activeModal === 'goal' || activeModal === 'editGoal') {
      generatePreview();
    }
  }, [
    activeModal,
    goalName,
    goalIcon,
    goalCategory,
    goalPriority,
    wizardSchedulingType,
    wizardFixedStart,
    wizardFixedEnd,
    wizardFlexStart,
    wizardFlexEnd,
    wizardDuration,
    wizardSessionsPerWeek,
    wizardRepeatRule,
    wizardRepeatDays,
    goalTargetDate,
    wizardIsLocked,
    generatePreview
  ]);

  // 3. Goal CRUD handlers
  const handleOpenGoalModal = () => {
    setGoalName('');
    setGoalDesc('');
    setGoalCategory('Fitness');
    setGoalPriority('medium');
    setGoalTargetDate(formatDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
    setGoalWeeklyHours(4);
    setGoalProgressType('percentage');
    setGoalIcon('🏋');
    setGoalTargetValue(100);
    // Reset wizard
    setWizardStep(1);
    setWizardSchedulingType('ai');
    setWizardFixedStart('05:00 PM');
    setWizardFixedEnd('06:00 PM');
    setWizardFlexStart('06:00 PM');
    setWizardFlexEnd('10:00 PM');
    setWizardDuration(60);
    setWizardRepeatRule('selected');
    setWizardRepeatDays([1, 3, 5]);
    setWizardSessionsPerWeek(3);
    setWizardPreviewSpecs([]);
    setActiveModal('goal');
  };

  const handleOpenEditGoal = (goal: any) => {
    setSelectedGoal(goal);
    setGoalName(goal.title);
    setGoalDesc(goal.description || '');
    setGoalCategory(goal.category || 'Fitness');
    setGoalPriority(goal.priority || 'medium');
    setGoalTargetDate(goal.targetDate || formatDateKey(new Date()));
    setGoalWeeklyHours(goal.estimatedWeeklyHours || 4);
    setGoalProgressType(goal.progressType || 'percentage');
    setGoalIcon(goal.icon || '🏋');
    setGoalTargetValue(goal.target || 100);

    // Populate wizard states from edited goal
    setWizardStep(1);
    setWizardSchedulingType(goal.schedulingType || 'flexible');
    setWizardFixedStart(goal.fixedStartTime || '05:00 PM');
    setWizardFixedEnd(goal.fixedEndTime || '06:00 PM');
    setWizardFlexStart(goal.flexWindowStart || '06:00 PM');
    setWizardFlexEnd(goal.flexWindowEnd || '10:00 PM');
    setWizardDuration(goal.sessionDurationMins || 60);
    setWizardRepeatRule(goal.repeatRule || 'selected');
    setWizardRepeatDays(goal.repeatDays || [1, 3, 5]);
    setWizardSessionsPerWeek(goal.sessionsPerWeek || 3);
    setWizardPreviewSpecs([]);

    setActiveModal('editGoal');
  };

  const handleSaveGoal = async () => {
    if (!goalName.trim()) return;
    setWizardSaving(true);
    try {
      // Build event specs from the engine
      const existing: ExistingBlock[] = events.map((e: any) => ({
        date: e.date, start: e.start, end: e.end,
      }));
      const goalInput: DbGoalInput = {
        title: goalName.trim(),
        icon: goalIcon,
        category: goalCategory,
        priority: goalPriority,
        schedulingType: wizardSchedulingType,
        fixedStartTime: wizardFixedStart,
        fixedEndTime: wizardFixedEnd,
        flexWindowStart: wizardFlexStart,
        flexWindowEnd: wizardFlexEnd,
        sessionDurationMins: wizardDuration,
        sessionsPerWeek: wizardSessionsPerWeek,
        repeatDays: wizardRepeatRule === 'selected' ? wizardRepeatDays : undefined,
        repeatRule: wizardRepeatRule,
        targetDate: goalTargetDate,
        isLocked: wizardIsLocked,
      };
      const specs = generateGoalEvents(goalInput, existing, 4);

      const payload = {
        title: goalName.trim(),
        description: goalDesc.trim(),
        category: goalCategory,
        priority: goalPriority as 'low'|'medium'|'high'|'critical',
        targetDate: goalTargetDate,
        estimatedWeeklyHours: Number(goalWeeklyHours),
        progressType: goalProgressType as 'percentage'|'sessions'|'hours',
        icon: goalIcon,
        target: Number(goalTargetValue),
        progress: 0,
        status: 'active' as const,
        // Scheduling fields
        schedulingType: wizardSchedulingType,
        fixedStartTime: wizardFixedStart,
        fixedEndTime: wizardFixedEnd,
        flexWindowStart: wizardFlexStart,
        flexWindowEnd: wizardFlexEnd,
        sessionDurationMins: wizardDuration,
        sessionsPerWeek: wizardSessionsPerWeek,
        repeatDays: wizardRepeatDays,
        repeatRule: wizardRepeatRule,
        // Lock persistence
        isLocked: wizardIsLocked,
        lastModifiedByUser: 'ui',
        updatedAt: serverTimestamp(),
      };

      if (activeModal === 'goal') {
        await dbCreateGoalWithSchedule(user.uid, payload, specs);
        showToast(`Goal created! ${specs.length} sessions scheduled automatically. 🎯`, 'success');
      } else if (selectedGoal) {
        await dbUpdateGoalSchedule(user.uid, selectedGoal.id, payload, specs);
        showToast('Goal & schedule updated!', 'success');
      }
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save goal', 'error');
    } finally {
      setWizardSaving(false);
    }
  };

  const handleArchiveGoal = async (goalId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'archived' ? 'active' : 'archived';
      await updateDoc(doc(db, 'goals', goalId), { status: nextStatus });
      showToast(currentStatus === 'archived' ? 'Goal unarchived' : 'Goal archived', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error archiving goal', 'error');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Delete this goal permanently?')) return;
    try {
      await dbDeleteGoal(goalId);
      showToast('Goal deleted', 'success');
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast('Error deleting goal', 'error');
    }
  };

  const handleCompleteSession = async (eventId: string, goalId: string) => {
    if (!user) return;
    try {
      await dbCompleteGoalSession(user.uid, goalId, eventId);
      showToast('Session completed! Streak updated & XP awarded! 🎉', 'success');
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to complete session', 'error');
    }
  };

  const handleMissedAction = async (eventId: string, goalId: string, action: 'skip' | 'reschedule' | 'ai') => {
    if (!user) return;
    setMissedLoading(true);
    try {
      await dbHandleMissedSession(user.uid, goalId, eventId, action);
      showToast(
        action === 'skip' ? 'Session marked as skipped.' :
        action === 'reschedule' ? 'Rescheduled for tomorrow! 📅' :
        'AI rescheduled into the next available slot! 🧠',
        'success'
      );
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to process action', 'error');
    } finally {
      setMissedLoading(false);
    }
  };

  // 4. Habit CRUD handlers
  const handleOpenHabitModal = () => {
    setHabitName('');
    setHabitDesc('');
    setHabitIcon('💧');
    setHabitCategory('Health');
    setHabitPreferredTime('09:00 AM');
    setHabitDuration(15);
    setHabitRepeat('daily');
    setHabitReminder(true);
    setHabitAllowAiReschedule(true);
    setHabitLockTime(false);
    setHabitDifficulty('medium');
    setActiveModal('habit');
  };

  const handleOpenEditHabit = (habit: any) => {
    setSelectedHabit(habit);
    setHabitName(habit.title);
    setHabitDesc(habit.description || '');
    setHabitIcon(habit.icon || '💧');
    setHabitCategory(habit.category || 'Health');
    setHabitPreferredTime(habit.preferredTime || '09:00 AM');
    setHabitDuration(habit.duration || 15);
    setHabitRepeat(habit.repeat || 'daily');
    setHabitReminder(habit.reminder ?? true);
    setHabitAllowAiReschedule(habit.allowAiReschedule ?? true);
    setHabitLockTime(habit.lockTime ?? true);
    setHabitDifficulty(habit.difficulty || 'medium');
    setActiveModal('editHabit');
  };

  const handleSaveHabit = async () => {
    if (!habitName.trim()) return;
    try {
      const habitInput: DbHabitInput = {
        id: selectedHabit?.id,
        title: habitName.trim(),
        icon: habitIcon,
        category: habitCategory,
        preferredTime: habitPreferredTime,
        duration: Number(habitDuration),
        repeat: habitRepeat,
        repeatDays: [],
        isLocked: habitLockTime,
      };

      const specs = generateHabitEvents(habitInput, 4);

      const payload = {
        title: habitName.trim(),
        description: habitDesc.trim(),
        icon: habitIcon,
        category: habitCategory,
        preferredTime: habitPreferredTime,
        duration: Number(habitDuration),
        repeat: habitRepeat,
        reminder: habitReminder,
        allowAiReschedule: habitAllowAiReschedule,
        lockTime: habitLockTime,
        isLocked: habitLockTime,
        difficulty: habitDifficulty,
        lastModifiedByUser: 'ui',
        updatedAt: serverTimestamp(),
      };

      if (activeModal === 'habit') {
        await dbCreateHabitWithSchedule(user.uid, payload, specs);
        showToast(`Habit created! ${specs.length} sessions scheduled. 🔥`, 'success');
      } else {
        await dbUpdateHabitSchedule(
          user.uid,
          selectedHabit.id,
          payload,
          specs,
          selectedHabit.linkedEventIds
        );
        showToast('Habit & schedule updated!', 'success');
      }
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast('Error saving habit', 'error');
    }
  };

  const handleToggleHabit = async (habit: any) => {
    try {
      const nextCompleted = !habit.completedToday;
      const todayStr = new Date().toDateString();
      const currentStreak = habit.currentStreak || 0;
      const nextStreak = nextCompleted ? currentStreak + 1 : Math.max(0, currentStreak - 1);
      const longestStreak = Math.max(habit.longestStreak || 0, nextStreak);

      await updateDoc(doc(db, 'habits', habit.id), {
        completedToday: nextCompleted,
        lastCompletedDate: nextCompleted ? todayStr : null,
        currentStreak: nextStreak,
        longestStreak: longestStreak
      });

      // Award XP
      await dbToggleHabitCompleted(user.uid, habit.id, nextCompleted);
      showToast(nextCompleted ? 'Habit completed! +15 XP ⚡' : 'Habit unchecked', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error completing habit', 'error');
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm('Delete this habit permanently?')) return;
    try {
      await dbDeleteHabit(habitId, selectedHabit?.linkedEventIds);
      showToast('Habit deleted', 'success');
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast('Error deleting habit', 'error');
    }
  };

  // 5. Calendar drag and drop pointer engine
  const handlePointerDown = (
    e: React.PointerEvent,
    eventId: string,
    _mode: 'drag' | 'resize-top' | 'resize-bottom',
    initDate: string,
    top: number,
    height: number,
    isLocked: boolean
  ) => {
    if (isLocked) {
      showToast("Fixed blocks are locked and cannot be moved.", 'error');
      return;
    }
    e.stopPropagation();
    const elem = e.currentTarget as HTMLDivElement;
    elem.setPointerCapture(e.pointerId);

    setDraggedEventId(eventId);
    setDragStart({
      y: e.clientY,
      top,
      date: initDate,
      height
    });
    setHoveredDay(initDate);
    setHoveredTimeMinutes(top);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedEventId || !dragStart) return;
    e.stopPropagation();

    const dy = e.clientY - dragStart.y;
    const gridElem = gridRef.current;
    if (gridElem) {
      const gridRect = gridElem.getBoundingClientRect();
      const relativeX = e.clientX - gridRect.left - 64; // adjust left offset padding
      const columnsCount = calendarView === 'week' ? 7 : 1;
      const columnWidth = (gridRect.width - 64) / columnsCount;
      const colIndex = Math.max(0, Math.min(columnsCount - 1, Math.floor(relativeX / columnWidth)));
      const weekDaysList = getWeekDays(selectedDate);
      const targetDateKey = formatDateKey(calendarView === 'week' ? weekDaysList[colIndex] : selectedDate);
      setHoveredDay(targetDateKey);

      const snapPx = HOUR_HEIGHT / 4; // 15m snap
      const maxGridPx = ((GRID_END_MINS - GRID_START_MINS) / 60) * HOUR_HEIGHT;
      const currentTop = dragStart.top + dy;
      const snappedTop = Math.max(0, Math.min(maxGridPx - dragStart.height, Math.round(currentTop / snapPx) * snapPx));
      setHoveredTimeMinutes(snappedTop);
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!draggedEventId || !dragStart) return;
    e.stopPropagation();
    const elem = e.currentTarget as HTMLDivElement;
    elem.releasePointerCapture(e.pointerId);

    const targetEvent = events.find((ev) => ev.id === draggedEventId);
    if (!targetEvent) {
      resetDrag();
      return;
    }

    const snapPx = HOUR_HEIGHT / 4;
    const maxGridPx = ((GRID_END_MINS - GRID_START_MINS) / 60) * HOUR_HEIGHT;
    const dy = e.clientY - dragStart.y;
    let finalTop = Math.max(0, Math.min(maxGridPx - dragStart.height, Math.round((dragStart.top + dy) / snapPx) * snapPx));
    let targetDayKey = hoveredDay || dragStart.date;

    const startMinutes = GRID_START_MINS + Math.round((finalTop / HOUR_HEIGHT) * 60);
    const endMinutes = startMinutes + Math.round((dragStart.height / HOUR_HEIGHT) * 60);

    const [year, month, day] = targetDayKey.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const startTime = new Date(dateObj);
    startTime.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

    const endTime = new Date(dateObj);
    endTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

    const previousEvents = [...events];
    const newStartStr = minutesToTimeStr(startMinutes);
    const newEndStr = minutesToTimeStr(endMinutes);

    // Optimistic UI updates
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === draggedEventId
          ? { ...ev, date: targetDayKey, start: newStartStr, end: newEndStr }
          : ev
      )
    );

    resetDrag();

    try {
      await dbUpdateEvent(draggedEventId, {
        startTime,
        endTime,
        lastModifiedByUser: 'drag',
        updatedAt: serverTimestamp(),
      });
      showToast('Event updated successfully ✓', 'success');
    } catch (err) {
      console.error(err);
      setEvents(previousEvents);
      showToast('Failed to save position', 'error');
    }
  };

  const resetDrag = () => {
    setDraggedEventId(null);
    setDragStart(null);
    setHoveredDay(null);
    setHoveredTimeMinutes(null);
  };

  // 6. Right click context menu actions
  const handleContextMenu = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      eventId
    });
  };

  const handleContextAction = async (action: 'duplicate' | 'delete' | 'toggleLock' | 'toggleComplete') => {
    if (!contextMenu) return;
    const { eventId } = contextMenu;
    const ev = events.find(e => e.id === eventId);
    setContextMenu(null);
    if (!ev) return;

    try {
      if (action === 'delete') {
        await dbDeleteEvent(eventId);
        showToast('Event deleted', 'success');
      } else if (action === 'duplicate') {
        const [y, m, d] = ev.date.split('-').map(Number);
        const refStart = new Date(y, m - 1, d);
        const sMins = timeToMinutes(ev.start);
        const eMins = timeToMinutes(ev.end);
        
        const start = new Date(refStart);
        start.setHours(Math.floor((sMins + 60) / 60), (sMins + 60) % 60);

        const end = new Date(refStart);
        end.setHours(Math.floor((eMins + 60) / 60), (eMins + 60) % 60);

        await dbAddEvent(user.uid, {
          title: `${ev.title} (Copy)`,
          startTime: start,
          endTime: end,
          source: 'manual',
          priority: ev.priority,
          flexibleScheduling: ev.flexibleScheduling !== false,
          category: ev.category,
          description: ev.description
        });
        showToast('Event duplicated', 'success');
      } else if (action === 'toggleLock') {
        const nextLock = ev.flexibleScheduling === false ? true : false;
        await dbUpdateEvent(eventId, { flexibleScheduling: nextLock });
        showToast(nextLock ? 'Block unlocked (Flexible)' : 'Block locked (Fixed) 🔒', 'success');
      } else if (action === 'toggleComplete') {
        await dbUpdateEvent(eventId, { completed: !ev.completed });
        showToast(ev.completed ? 'Event incomplete' : 'Event completed! +10 XP', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed', 'error');
    }
  };

  // 7. Time Blocking Smart Optimizer
  // Conflict detection: check if a new locked block overlaps existing locked blocks
  const checkLockedConflict = (
    newStart: number,
    newEnd: number,
    excludeId: string,
    allEvents: any[]
  ): { hasConflict: boolean; conflictEvent?: any } => {
    const locked = allEvents.filter(e =>
      (e.flexibleScheduling === false || e.isLocked === true || e.isGoalEvent === true || e.isHabitEvent === true) && e.id !== excludeId
    );
    for (const ev of locked) {
      const evS = timeToMinutes(ev.start);
      const evE = timeToMinutes(ev.end);
      if (newStart < evE && evS < newEnd) {
        return { hasConflict: true, conflictEvent: ev };
      }
    }
    return { hasConflict: false };
  };

  const handleOptimizeSchedule = async () => {
    showToast('AI is optimizing your schedule blocks...', 'success');
    const dayKey = formatDateKey(selectedDate);
    const dayEvents = events.filter(e => e.date === dayKey);

    // Filter fixed events
    const fixedList = dayEvents.filter(e => 
      e.flexibleScheduling === false || 
      e.isLocked === true ||
      e.isGoalEvent === true ||
      e.isHabitEvent === true ||
      e.category?.toLowerCase() === 'college' || 
      e.title.toLowerCase().includes('class') || 
      e.completed
    );

    // Filter flexible events
    const flexList = dayEvents.filter(e => !fixedList.some(f => f.id === e.id));

    // Sort flexible: priority DESC, duration DESC
    const getPriorityW = (p: string) => {
      if (p === 'critical') return 4;
      if (p === 'high') return 3;
      if (p === 'medium') return 2;
      return 1;
    };
    flexList.sort((a, b) => getPriorityW(b.priority) - getPriorityW(a.priority));

    let cursor = GRID_START_MINS; // start at 7:00 AM
    const maxEnd = GRID_END_MINS; // end at 10:00 PM
    const optimized: any[] = [];

    // Helper: Checks overlap with fixed list + already optimized list
    const hasOverlap = (start: number, end: number, id: string) => {
      const merged = [...fixedList, ...optimized];
      for (const ev of merged) {
        if (ev.id === id) continue;
        const evS = timeToMinutes(ev.start);
        const evE = timeToMinutes(ev.end);
        if (start < evE && evS < end) return true;
      }
      return false;
    };

    // Auto place uncompleted habits for today
    const activeHabits = habits.filter(h => !h.completedToday);
    const generatedHabits: any[] = [];
    for (const hab of activeHabits) {
      // Check if habit is already scheduled
      const alreadyScheduled = dayEvents.some(e => e.title.includes(hab.title));
      if (!alreadyScheduled) {
        const prefMins = timeToMinutes(hab.preferredTime || '09:00 AM');
        const duration = hab.duration || 15;
        generatedHabits.push({
          title: hab.title,
          preferredTimeMins: prefMins,
          duration,
          isFixedHabit: hab.lockTime === true,
          originalHabit: hab
        });
      }
    }

    // Process Fixed Habits first
    for (const h of generatedHabits) {
      if (h.isFixedHabit) {
        let placed = false;
        // Check for conflict with existing locked blocks
        const conflict = checkLockedConflict(h.preferredTimeMins, h.preferredTimeMins + h.duration, '', dayEvents);
        if (conflict.hasConflict) {
          showToast(`⚠️ Conflict: "${h.title}" overlaps with locked "${conflict.conflictEvent?.title}". Skipping.`, 'error');
          continue;
        }
        // try to fit exactly at preferredTime
        if (!hasOverlap(h.preferredTimeMins, h.preferredTimeMins + h.duration, '')) {
          const [year, month, day] = dayKey.split('-').map(Number);
          const start = new Date(year, month - 1, day);
          start.setHours(Math.floor(h.preferredTimeMins / 60), h.preferredTimeMins % 60);
          const end = new Date(start);
          end.setMinutes(start.getMinutes() + h.duration);

          await dbAddEvent(user.uid, {
            title: h.title,
            startTime: start,
            endTime: end,
            source: 'manual',
            flexibleScheduling: false,
            category: 'Habit',
            description: h.originalHabit.description || ''
          });
          placed = true;
        }
        if (!placed) {
          showToast(`Could not fit fixed habit "${h.title}" due to overlap.`, 'error');
        }
      }
    }

    // Combine flexible habits & remaining flexible tasks to optimize
    const flexQueue = [
      ...generatedHabits.filter(h => !h.isFixedHabit).map(h => ({
        id: `gen-habit-${h.originalHabit.id}`,
        title: h.title,
        duration: h.duration,
        priority: 'medium',
        category: 'Habit',
        desc: h.originalHabit.description || '',
        isGenerated: true
      })),
      ...flexList.map(e => ({
        id: e.id,
        title: e.title,
        duration: timeToMinutes(e.end) - timeToMinutes(e.start),
        priority: e.priority,
        category: e.category,
        desc: e.description,
        isGenerated: false,
        rawEvent: e
      }))
    ];

    let consecutiveWork = 0;

    for (const item of flexQueue) {
      let duration = item.duration;
      // Break logic: if deep work exceeds 90 minutes, add a 10m break buffer
      if (consecutiveWork >= 90) {
        cursor += 10;
        consecutiveWork = 0;
      }

      let placed = false;
      while (cursor + duration <= maxEnd) {
        if (!hasOverlap(cursor, cursor + duration, item.id)) {
          const newStartStr = minutesToTimeStr(cursor);
          const newEndStr = minutesToTimeStr(cursor + duration);

          if (item.isGenerated) {
            const [year, month, day] = dayKey.split('-').map(Number);
            const start = new Date(year, month - 1, day);
            start.setHours(Math.floor(cursor / 60), cursor % 60);
            const end = new Date(start);
            end.setMinutes(start.getMinutes() + duration);

            await dbAddEvent(user.uid, {
              title: item.title,
              startTime: start,
              endTime: end,
              source: 'manual',
              flexibleScheduling: true,
              category: 'Habit',
              description: item.desc
            });
          } else {
            const [year, month, day] = dayKey.split('-').map(Number);
            const start = new Date(year, month - 1, day);
            start.setHours(Math.floor(cursor / 60), cursor % 60);
            const end = new Date(start);
            end.setMinutes(start.getMinutes() + duration);

            await dbUpdateEvent(item.id, {
              startTime: start,
              endTime: end,
              isAiScheduled: true,
              aiReason: `🤖 Re-aligned to ${newStartStr}-${newEndStr} to avoid overlaps.`
            });
          }

          optimized.push({
            id: item.id,
            start: newStartStr,
            end: newEndStr
          });

          cursor += duration + 5; // 5m buffer after tasks
          consecutiveWork += duration;
          placed = true;
          break;
        }
        cursor += 15; // advance cursor in 15m intervals to scan
      }
      if (!placed) {
        showToast(`Day fully packed! Could not fit "${item.title}".`, 'error');
      }
    }
    showToast('Optimize complete! ⚡ Day schedule balanced.', 'success');
  };

  // 8. Calculations for active date display & week column positions
  const weekDays = getWeekDays(selectedDate);
  const dayKey = formatDateKey(selectedDate);

  // Group events by day key
  const getEventsForDay = (dateKey: string) => {
    return events.filter(e => e.date === dateKey);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] p-4 lg:p-6 text-gray-800 dark:text-white overflow-x-hidden">
      {/* Background glass glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-600/5" />
      <div className="pointer-events-none absolute right-10 top-20 h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[150px] dark:bg-indigo-600/5" />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-white/8 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Goals & Habits
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Build long-term consistency with intelligent scheduling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenGoalModal}
            className="app-button-secondary inline-flex items-center gap-2 text-xs font-semibold py-2 px-3.5 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 text-purple-500" />
            + New Goal
          </button>
          <button
            onClick={handleOpenHabitModal}
            className="app-button-secondary inline-flex items-center gap-2 text-xs font-semibold py-2 px-3.5 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 text-emerald-500" />
            + New Habit
          </button>
          <button
            onClick={handleOptimizeSchedule}
            className="app-button-primary inline-flex items-center gap-2 text-xs font-bold py-2 px-4 shadow-lg shadow-purple-500/20 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Optimize Schedule
          </button>
        </div>
      </div>

      {/* ── AI ADVISORY/INSIGHTS BAR ── */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center gap-3 rounded-[16px] bg-gradient-to-r from-[#F5EEFF] to-transparent dark:from-[#21163A]/40 border border-purple-500/10 px-4 py-3 text-xs leading-5 backdrop-blur-sm"
          >
            <Sparkles className="h-4.5 w-4.5 text-purple-500 shrink-0 animate-pulse" />
            <p className="font-medium text-gray-700 dark:text-purple-200">
              {aiSuggestions[0]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN GRID LAYOUT ── */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        
        {/* LEFT COLUMN: Goals & Habits */}
        <div className="space-y-6">
          
          {/* SECTION 1: GOALS OVERVIEW */}
          <section className="app-surface p-5 backdrop-blur-md bg-white/50 dark:bg-[#171923]/60 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-gray-200/50 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <h2 className="text-base font-bold tracking-tight">Goals Overview</h2>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
                {goals.filter(g => g.status === 'active').length} Active
              </span>
            </div>

            {goals.filter(g => g.status !== 'archived').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 mb-3">
                  <Target className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Create your first goal.</p>
                <button
                  onClick={handleOpenGoalModal}
                  className="mt-3 text-xs font-bold text-purple-500 hover:underline"
                >
                  Get started
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.filter(g => g.status !== 'archived').map((goal) => {
                  const pct = Math.min(100, Math.round(((goal.progress || 0) / (goal.target || 100)) * 100));
                  const strokeDashoffset = 113 - (113 * pct) / 100;
                  
                  // Category Styling
                  const colorsMap: Record<string, string> = {
                    Fitness: 'from-emerald-500 to-teal-500 text-emerald-500',
                    Learning: 'from-indigo-500 to-blue-500 text-indigo-500',
                    College: 'from-sky-500 to-indigo-500 text-sky-500',
                    Career: 'from-purple-500 to-indigo-500 text-purple-500',
                    Finance: 'from-amber-500 to-orange-500 text-amber-500',
                    Personal: 'from-pink-500 to-rose-500 text-pink-500',
                    Health: 'from-emerald-400 to-green-500 text-green-500'
                  };
                  const colorGradient = colorsMap[goal.category] || 'from-purple-500 to-indigo-500 text-purple-500';

                  return (
                    <motion.div
                      key={goal.id}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="relative overflow-hidden rounded-[18px] border border-gray-200 dark:border-white/5 bg-white/70 dark:bg-[#1C1F2E]/70 p-4 shadow-sm hover:shadow-md transition-all duration-200 group flex items-center justify-between gap-4"
                    >
                      {/* Left: Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div 
                          onClick={() => setSelectedDetailGoal(goal)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-xl leading-none">{goal.icon || '🎯'}</span>
                          <h3 className="font-bold text-sm truncate pr-2 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition">
                            {goal.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                          <span className={`px-1.5 py-0.5 rounded-md bg-gradient-to-r ${colorGradient.split(' text-')[0]} text-white text-[9px]`}>
                            {goal.category}
                          </span>
                          {goal.currentStreak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-500">
                              <Flame className="h-3.5 w-3.5 fill-orange-500/10" /> {goal.currentStreak}d Streak
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-bold">
                            Target: {goal.targetDate}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition duration-200 pt-1">
                          <button
                            onClick={() => setSelectedDetailGoal(goal)}
                            className="text-xs text-gray-400 hover:text-purple-500 cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <Target className="h-3 w-3" /> Open
                          </button>
                          <button
                            onClick={() => handleOpenEditGoal(goal)}
                            className="text-xs text-gray-400 hover:text-purple-500 cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <Edit3 className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleArchiveGoal(goal.id, goal.status)}
                            className="text-xs text-gray-400 hover:text-amber-500 cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <Archive className="h-3 w-3" /> Archive
                          </button>
                        </div>
                      </div>

                      {/* Right: Progress Ring */}
                      <div 
                        onClick={() => setSelectedDetailGoal(goal)}
                        className="relative flex flex-col items-center justify-center shrink-0 cursor-pointer"
                      >
                        <svg className="h-14 w-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="18"
                            stroke="rgba(109,74,255,0.06)"
                            strokeWidth="3.5"
                            fill="transparent"
                          />
                          <motion.circle
                            cx="28"
                            cy="28"
                            r="18"
                            stroke={goal.status === 'completed' ? '#10B981' : '#6D4AFF'}
                            strokeWidth="3.5"
                            fill="transparent"
                            strokeDasharray="113"
                            initial={{ strokeDashoffset: 113 }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-black text-gray-900 dark:text-white">
                          {pct}%
                        </span>
                        <span className="mt-1 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-center">
                          {goal.progress} / {goal.target}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: HABITS */}
          <section className="app-surface p-5 backdrop-blur-md bg-white/50 dark:bg-[#171923]/60">
            <div className="flex items-center justify-between mb-4 border-b border-gray-200/50 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500 fill-orange-500/10" />
                <h2 className="text-base font-bold tracking-tight">Habit Tracker</h2>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
                {habits.length} Habits
              </span>
            </div>

            {habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                  <Flame className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Start building your first habit.</p>
                <button
                  onClick={handleOpenHabitModal}
                  className="mt-3 text-xs font-bold text-emerald-500 hover:underline"
                >
                  Add a Habit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {habits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    whileHover={{ y: -2 }}
                    className={`relative overflow-hidden rounded-[18px] border p-4 shadow-sm transition-all duration-200 flex items-center justify-between gap-4 ${
                      habit.completedToday 
                        ? 'border-emerald-500/20 bg-emerald-500/4 dark:bg-emerald-950/10' 
                        : 'border-gray-200 dark:border-white/5 bg-white/70 dark:bg-[#1C1F2E]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox today with animation */}
                      <button
                        onClick={() => handleToggleHabit(habit)}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all cursor-pointer ${
                          habit.completedToday 
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                            : 'border-gray-300 dark:border-white/15 hover:border-emerald-500 hover:bg-emerald-500/10 text-transparent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3px]" />
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg leading-none shrink-0">{habit.icon || '💧'}</span>
                          <h3 className={`text-sm font-bold truncate ${habit.completedToday ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                            {habit.title}
                          </h3>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-2">
                          <span>⏱ {habit.preferredTime}</span>
                          <span>·</span>
                          <span className="capitalize">{habit.repeat}</span>
                        </p>
                      </div>
                    </div>

                    {/* Streak Info / Difficulty */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex flex-col items-end">
                        {habit.currentStreak > 0 ? (
                          <div className="flex items-center gap-0.5 text-orange-500 font-black text-xs animate-[bounce_1s_infinite]">
                            <Flame className="h-4 w-4 fill-orange-500/25" />
                            <span>{habit.currentStreak}d</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400">No streak</span>
                        )}
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mt-0.5">
                          Rate: {habit.completionRate || 100}%
                        </span>
                      </div>

                      {/* Options context menu */}
                      <button
                        onClick={() => handleOpenEditHabit(habit)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Time Blocking Calendar */}
        <section className="app-surface p-5 backdrop-blur-md bg-white/50 dark:bg-[#171923]/60 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 dark:border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-bold tracking-tight">Time Blocking Calendar</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    calendarView === 'day' ? 'bg-white dark:bg-[#1F2232] text-purple-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    calendarView === 'week' ? 'bg-white dark:bg-[#1F2232] text-purple-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Date Nav */}
              <div className="flex items-center gap-1 border border-gray-200 dark:border-white/10 rounded-xl px-1.5 py-1">
                <button
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setDate(selectedDate.getDate() - (calendarView === 'week' ? 7 : 1));
                    setSelectedDate(prev);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-bold px-1 select-none">
                  {calendarView === 'day' 
                    ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : `Wk of ${weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  }
                </span>
                <button
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setDate(selectedDate.getDate() + (calendarView === 'week' ? 7 : 1));
                    setSelectedDate(next);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Time Blocking Key Legend */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 mb-3 border-b border-gray-200/50 dark:border-white/5 pb-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Fixed Event (Locked)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-600" />
              Flexible Task (AI Optimizer eligible)
            </span>
          </div>

          {/* Daily/Weekly Vertical Timeline */}
          <div 
            ref={gridRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative border border-gray-200 dark:border-white/8 rounded-[16px] overflow-hidden bg-white/30 dark:bg-black/10 select-none soft-scrollbar"
            style={{ height: '520px', overflowY: 'auto' }}
          >
            <div 
              className="relative w-full"
              style={{ height: `${((GRID_END_MINS - GRID_START_MINS) / 60) * HOUR_HEIGHT}px` }}
            >
              {/* Hourly ticks */}
              {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => {
                const top = ((hour - 7) * HOUR_HEIGHT);
                const timeLabel = hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
                return (
                  <div 
                    key={hour} 
                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-white/4 pointer-events-none flex items-center pr-3"
                    style={{ top: `${top}px`, height: `${HOUR_HEIGHT}px` }}
                  >
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 pl-2">
                      {timeLabel}
                    </span>
                  </div>
                );
              })}

              {/* Day View Columns */}
              {calendarView === 'day' ? (
                <div className="absolute left-16 right-0 top-0 bottom-0">
                  {/* Snapping guidelines on drag */}
                  {draggedEventId && hoveredTimeMinutes !== null && hoveredDay === dayKey && (
                    <div 
                      className="absolute left-0 right-0 border-2 border-dashed border-purple-500 bg-purple-500/10 rounded-lg pointer-events-none z-30"
                      style={{
                        top: `${hoveredTimeMinutes}px`,
                        height: `${dragStart?.height}px`
                      }}
                    />
                  )}

                  {/* Render Events */}
                  {getEventsForDay(dayKey).map((ev) => {
                    const sMins = timeToMinutes(ev.start);
                    const eMins = timeToMinutes(ev.end);
                    const top = ((sMins - GRID_START_MINS) / 60) * HOUR_HEIGHT;
                    const height = ((eMins - sMins) / 60) * HOUR_HEIGHT;

                    // Fixed events check
                    const isLocked = ev.flexibleScheduling === false || 
                                     ev.isLocked === true ||
                                     ev.category?.toLowerCase() === 'college' || 
                                     ev.title.toLowerCase().includes('class');

                    const isDragged = draggedEventId === ev.id;

                    return (
                      <div
                        key={ev.id}
                        onPointerDown={(e) => handlePointerDown(e, ev.id, 'drag', dayKey, top, height, isLocked)}
                        onDoubleClick={() => { setSelectedEvent(ev); setActiveModal('eventDetails'); }}
                        onContextMenu={(e) => handleContextMenu(e, ev.id)}
                        className={`absolute left-2 right-2 rounded-[12px] p-2.5 shadow-sm overflow-hidden select-none transition-shadow ${getEventColorClass(ev)} ${isDragged ? 'opacity-40 z-50 scale-[0.98]' : 'z-20'}`}
                        style={{
                          top: `${top + 2}px`,
                          height: `${height - 4}px`
                        }}
                      >
                        <div className="flex items-start justify-between gap-1.5 h-full">
                          <div className="min-w-0 h-full flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1">
                                {isLocked && (
                                  <div className="group/lock relative">
                                    <Lock className="h-3 w-3 text-blue-300 shrink-0" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[9px] font-semibold rounded-md whitespace-nowrap opacity-0 group-hover/lock:opacity-100 pointer-events-none transition-opacity z-50">
                                      Fixed Schedule – Only changes when you edit it.
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-bold truncate leading-tight pr-1">
                                  {ev.title}
                                </p>
                              </div>
                              {ev.description && (
                                <p className="text-[10px] opacity-75 truncate mt-0.5">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] font-black opacity-85">
                              {ev.start} - {ev.end}
                            </span>
                          </div>

                          {ev.isAiScheduled && (
                            <Sparkles className="h-3.5 w-3.5 text-purple-200 shrink-0 animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Week View Grid */
                <div className="absolute left-16 right-0 top-0 bottom-0 grid grid-cols-7 border-l border-gray-200/50 dark:border-white/5">
                  {weekDays.map((date) => {
                    const dk = formatDateKey(date);
                    const isToday = dk === formatDateKey(new Date());
                    return (
                      <div key={dk} className="relative border-r border-gray-100 dark:border-white/4 h-full">
                        {/* Column Header */}
                        <div className={`absolute top-1 left-0 right-0 text-center z-20 pointer-events-none`}>
                          <span className={`text-[8px] font-extrabold px-1 rounded-md uppercase tracking-wider ${
                            isToday ? 'bg-purple-500 text-white' : 'text-gray-400'
                          }`}>
                            {date.toLocaleDateString(undefined, { weekday: 'short' })} {date.getDate()}
                          </span>
                        </div>

                        {/* Snapping guide in week view columns */}
                        {draggedEventId && hoveredTimeMinutes !== null && hoveredDay === dk && (
                          <div 
                            className="absolute left-0.5 right-0.5 border-2 border-dashed border-purple-500 bg-purple-500/10 rounded-lg pointer-events-none z-30"
                            style={{
                              top: `${hoveredTimeMinutes}px`,
                              height: `${dragStart?.height}px`
                            }}
                          />
                        )}

                        {/* Events in this Column */}
                        {getEventsForDay(dk).map((ev) => {
                          const sMins = timeToMinutes(ev.start);
                          const eMins = timeToMinutes(ev.end);
                          const top = ((sMins - GRID_START_MINS) / 60) * HOUR_HEIGHT;
                          const height = ((eMins - sMins) / 60) * HOUR_HEIGHT;

                          const isLocked = ev.flexibleScheduling === false || 
                                           ev.isLocked === true ||
                                           ev.category?.toLowerCase() === 'college' || 
                                           ev.title.toLowerCase().includes('class');

                          const isDragged = draggedEventId === ev.id;

                          return (
                            <div
                              key={ev.id}
                              onPointerDown={(e) => handlePointerDown(e, ev.id, 'drag', dk, top, height, isLocked)}
                              onDoubleClick={() => { setSelectedEvent(ev); setActiveModal('eventDetails'); }}
                              onContextMenu={(e) => handleContextMenu(e, ev.id)}
                              className={`absolute left-0.5 right-0.5 rounded-[8px] p-1 shadow-sm overflow-hidden select-none transition-shadow ${getEventColorClass(ev)} ${isDragged ? 'opacity-40 z-50 scale-[0.98]' : 'z-20'}`}
                              style={{
                                top: `${top + 1}px`,
                                height: `${height - 2}px`
                              }}
                            >
                              <div className="flex flex-col justify-between h-full select-none">
                                <div>
                                  <div className="flex items-center gap-0.5">
                                    {isLocked && (
                                      <div className="group/lock relative">
                                        <Lock className="h-2.5 w-2.5 text-blue-300 shrink-0" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[9px] font-semibold rounded-md whitespace-nowrap opacity-0 group-hover/lock:opacity-100 pointer-events-none transition-opacity z-50">
                                          Fixed Schedule – Only changes when you edit it.
                                        </div>
                                      </div>
                                    )}
                                    <p className="text-[10px] font-bold truncate leading-tight pr-0.5">
                                      {ev.title}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[8px] font-black opacity-80 leading-none">
                                  {ev.start}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── CUSTOM CONTEXT MENU ── */}
      {contextMenu && (
        <>
          <div 
            onClick={() => setContextMenu(null)}
            className="fixed inset-0 z-40 bg-transparent"
          />
          <div 
            className="fixed z-50 min-w-[150px] overflow-hidden rounded-xl border border-gray-200 dark:border-white/8 bg-white/85 dark:bg-[#1E2030]/85 backdrop-blur-md p-1.5 shadow-xl animate-fadeIn"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            <button
              onClick={() => handleContextAction('duplicate')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              onClick={() => handleContextAction('toggleLock')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" /> Toggle Lock status
            </button>
            <button
              onClick={() => handleContextAction('toggleComplete')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <CheckIcon className="h-3.5 w-3.5" /> Toggle Complete
            </button>
            <hr className="my-1 border-gray-200 dark:border-white/5" />
            <button
              onClick={() => handleContextAction('delete')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete event
            </button>
          </div>
        </>
      )}

      {/* ── ADD / EDIT GOAL MODAL (4-STEP WIZARD) ── */}
      <AnimatePresence>
        {(activeModal === 'goal' || activeModal === 'editGoal') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-[24px] border border-gray-200 dark:border-white/8 bg-white dark:bg-[#181A26] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Wizard Header Progress */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    {activeModal === 'goal' ? '🎯 Create New Goal' : '📝 Edit Goal'}
                  </h2>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                    Step {wizardStep} of 4: {
                      wizardStep === 1 ? 'Core Details' :
                      wizardStep === 2 ? 'Schedule Settings' :
                      wizardStep === 3 ? 'Recurrence & Target' : 'Review & Confirm'
                    }
                  </p>
                </div>
                {/* Step dots */}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map(s => (
                    <span 
                      key={s}
                      className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        s === wizardStep 
                          ? 'bg-[#6D4AFF] w-5' 
                          : s < wizardStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Wizard Steps Container */}
              <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-4 soft-scrollbar max-h-[60vh]">
                <AnimatePresence mode="wait">
                  {wizardStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -10, opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Icon</label>
                          <input
                            type="text"
                            value={goalIcon}
                            onChange={(e) => setGoalIcon(e.target.value)}
                            className="w-12 text-center text-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl py-2 outline-none focus:border-purple-500 font-sans"
                          />
                        </div>
                        <div className="space-y-1.5 w-full">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Goal Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Solve Leetcode Problems, Gym Session"
                            value={goalName}
                            onChange={(e) => setGoalName(e.target.value)}
                            className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#6D4AFF] text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Description</label>
                        <textarea
                          placeholder="Describe your motivations, guidelines or targets..."
                          value={goalDesc}
                          onChange={(e) => setGoalDesc(e.target.value)}
                          className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#6D4AFF] h-20 resize-none text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Category</label>
                          <select
                            value={goalCategory}
                            onChange={(e) => setGoalCategory(e.target.value)}
                            className="app-select"
                          >
                            {['Health', 'Learning', 'College', 'Fitness', 'Career', 'Personal', 'Finance'].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Priority</label>
                          <select
                            value={goalPriority}
                            onChange={(e) => setGoalPriority(e.target.value as any)}
                            className="app-select"
                          >
                            {['low', 'medium', 'high', 'critical'].map(p => (
                              <option key={p} value={p}>{p.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -10, opacity: 0 }}
                      className="space-y-5"
                    >
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Scheduling Type</label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {/* AI SUGGESTED */}
                          <div 
                            onClick={() => setWizardSchedulingType('ai')}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              wizardSchedulingType === 'ai'
                                ? 'border-[#6D4AFF] bg-[#F3EEFF]/40 dark:bg-[#1C1836]/40'
                                : 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/12'
                            }`}
                          >
                            <Brain className={`h-5 w-5 shrink-0 mt-0.5 ${wizardSchedulingType === 'ai' ? 'text-[#6D4AFF]' : 'text-gray-400'}`} />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white">AI Suggested Time</h4>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                                AI suggests the best time based on your classes, sleep, habits, and deadlines.
                              </p>
                            </div>
                          </div>

                          {/* FIXED TIME */}
                          <div 
                            onClick={() => setWizardSchedulingType('fixed')}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              wizardSchedulingType === 'fixed'
                                ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-950/10'
                                : 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/12'
                            }`}
                          >
                            <Lock className={`h-5 w-5 shrink-0 mt-0.5 ${wizardSchedulingType === 'fixed' ? 'text-blue-500' : 'text-gray-400'}`} />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Fixed Time Block</h4>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                                Manually pick start/end times. This block is permanently locked and ignored by the AI scheduler.
                              </p>
                            </div>
                          </div>

                          {/* FLEXIBLE WINDOW */}
                          <div 
                            onClick={() => setWizardSchedulingType('flexible')}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              wizardSchedulingType === 'flexible'
                                ? 'border-purple-500 bg-purple-500/5 dark:bg-purple-950/10'
                                : 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/12'
                            }`}
                          >
                            <Timer className={`h-5 w-5 shrink-0 mt-0.5 ${wizardSchedulingType === 'flexible' ? 'text-purple-500' : 'text-gray-400'}`} />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Flexible Time Window</h4>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                                Pick a window (e.g. 6-10 PM). The AI dynamically places this block only within this window.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scheduling type settings fields */}
                      {wizardSchedulingType === 'ai' && (
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/2 border border-gray-200/50 dark:border-white/5 space-y-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Session Duration (minutes)</label>
                            <input
                              type="number"
                              value={wizardDuration}
                              onChange={(e) => setWizardDuration(Number(e.target.value))}
                              className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-[#6D4AFF]"
                            />
                          </div>
                          <p className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 leading-normal flex items-start gap-1">
                            <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                            AI will schedule {wizardDuration}m sessions across your day, keeping you at peak energy.
                          </p>
                        </div>
                      )}

                      {wizardSchedulingType === 'fixed' && (
                        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-blue-400">Start Time</label>
                              <input
                                type="text"
                                placeholder="05:00 PM"
                                value={wizardFixedStart}
                                onChange={(e) => setWizardFixedStart(e.target.value)}
                                className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-blue-400">End Time</label>
                              <input
                                type="text"
                                placeholder="06:30 PM"
                                value={wizardFixedEnd}
                                onChange={(e) => setWizardFixedEnd(e.target.value)}
                                className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-blue-400">Session Duration (minutes)</label>
                            <input
                              type="number"
                              value={wizardDuration}
                              onChange={(e) => setWizardDuration(Number(e.target.value))}
                              className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                            />
                          </div>
                          {/* Lock Toggle */}
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <Lock className="h-4 w-4 text-blue-500 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">Fixed Schedule (Recommended)</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Optimizer will never move this block. Only you can change it.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setWizardIsLocked(!wizardIsLocked)}
                              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${wizardIsLocked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${wizardIsLocked ? 'translate-x-5' : ''}`} />
                            </button>
                          </div>
                        </div>
                      )}

                      {wizardSchedulingType === 'flexible' && (
                        <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-400">Window Start</label>
                              <input
                                type="text"
                                placeholder="06:00 PM"
                                value={wizardFlexStart}
                                onChange={(e) => setWizardFlexStart(e.target.value)}
                                className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-400">Window End</label>
                              <input
                                type="text"
                                placeholder="10:00 PM"
                                value={wizardFlexEnd}
                                onChange={(e) => setWizardFlexEnd(e.target.value)}
                                className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-400">Session Duration (mins)</label>
                              <input
                                type="number"
                                value={wizardDuration}
                                onChange={(e) => setWizardDuration(Number(e.target.value))}
                                className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {wizardStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -10, opacity: 0 }}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Recurrence Rule</label>
                          <select
                            value={wizardRepeatRule}
                            onChange={(e) => setWizardRepeatRule(e.target.value as any)}
                            className="app-select"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekdays">Weekdays</option>
                            <option value="weekends">Weekends</option>
                            <option value="selected">Selected Days</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Target Date</label>
                          <input
                            type="date"
                            value={goalTargetDate}
                            onChange={(e) => setGoalTargetDate(e.target.value)}
                            className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 outline-none focus:border-[#6D4AFF]"
                          />
                        </div>
                      </div>

                      {wizardRepeatRule === 'selected' && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Selected Days</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                              const active = wizardRepeatDays.includes(idx);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    setWizardRepeatDays(prev => 
                                      prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                    active 
                                      ? 'border-[#6D4AFF] bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]'
                                      : 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/2 text-gray-400 hover:text-gray-600'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Weekly Goal Frequency</label>
                          <span className="text-xs font-black text-[#6D4AFF] dark:text-[#A78BFA]">{wizardSessionsPerWeek} sessions/wk</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="7"
                          value={wizardSessionsPerWeek}
                          onChange={(e) => setWizardSessionsPerWeek(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-100 dark:bg-white/8 rounded-lg appearance-none cursor-pointer accent-[#6D4AFF]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Goal Target Metric</label>
                          <select
                            value={goalProgressType}
                            onChange={(e) => setGoalProgressType(e.target.value as any)}
                            className="app-select"
                          >
                            <option value="percentage">Percentage (0-100%)</option>
                            <option value="sessions">Completed Sessions</option>
                            <option value="hours">Duration Hours</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Target value</label>
                          <input
                            type="number"
                            value={goalTargetValue}
                            onChange={(e) => setGoalTargetValue(Number(e.target.value))}
                            className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#6D4AFF]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -10, opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Summary review card */}
                      <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xl">{goalIcon}</span>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white mt-1 truncate">{goalName || 'Untitled Goal'}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
                            Category: {goalCategory} · Priority: {goalPriority}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${
                            wizardSchedulingType === 'fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                            wizardSchedulingType === 'flexible' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                            'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]'
                          }`}>
                            {wizardSchedulingType === 'fixed' ? '🔒 Fixed Time' :
                             wizardSchedulingType === 'flexible' ? '🟣 Flexible' : '🧠 AI Suggested'}
                          </span>
                        </div>
                      </div>

                      {/* Scheduled Events Preview list */}
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-purple-500" />
                          Generated Schedule Preview (Next 2 Weeks)
                        </h4>
                        <div className="max-h-[160px] overflow-y-auto border border-gray-200/50 dark:border-white/5 rounded-xl bg-white/40 dark:bg-black/10 divide-y divide-gray-100 dark:divide-white/5 soft-scrollbar">
                          {wizardPreviewSpecs.length === 0 ? (
                            <p className="text-[10px] text-gray-400 p-4 text-center">No matching dates found. Adjust repeat days or target date.</p>
                          ) : (
                            wizardPreviewSpecs.map((spec, i) => (
                              <div key={i} className="flex items-center justify-between p-2.5 text-[10px]">
                                <span className="font-bold text-gray-600 dark:text-gray-300">
                                  📅 {new Date(spec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <span className="font-black text-[#6D4AFF] dark:text-[#A78BFA] bg-[#6D4AFF]/6 px-2 py-0.5 rounded-md">
                                  {spec.start} - {spec.end}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wizard Footer Controls */}
              <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
                {activeModal === 'editGoal' && wizardStep === 1 ? (
                  <button
                    onClick={() => handleDeleteGoal(selectedGoal.id)}
                    className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Delete Goal
                  </button>
                ) : (
                  <div>
                    {wizardStep > 1 && (
                      <button
                        onClick={() => setWizardStep(prev => prev - 1)}
                        className="rounded-xl border border-gray-200 dark:border-white/8 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="h-3 w-3" /> Back
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="rounded-xl border border-gray-200 dark:border-white/8 px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  {wizardStep < 4 ? (
                    <button
                      onClick={() => {
                        if (wizardStep === 1 && !goalName.trim()) {
                          showToast('Please enter a goal name', 'error');
                          return;
                        }
                        setWizardStep(prev => prev + 1);
                      }}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      Next <ChevronRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveGoal}
                      disabled={wizardSaving}
                      className="app-button-primary rounded-xl px-6 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {wizardSaving ? 'Saving...' : activeModal === 'goal' ? '🚀 Generate Schedule' : 'Save Goal'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD / EDIT HABIT MODAL ── */}
      <AnimatePresence>
        {(activeModal === 'habit' || activeModal === 'editHabit') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-[24px] border border-gray-200 dark:border-white/8 bg-white dark:bg-[#181A26] p-6 shadow-2xl overflow-y-auto max-h-[90vh] soft-scrollbar"
            >
              <h2 className="text-xl font-bold tracking-tight">
                {activeModal === 'habit' ? '✨ New Habit setup' : '📝 Edit Habit'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">Configure habit tracking details.</p>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Icon</label>
                    <input
                      type="text"
                      value={habitIcon}
                      onChange={(e) => setHabitIcon(e.target.value)}
                      className="w-12 text-center text-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl py-2 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Habit Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Drink 3L Water, Read 10 pages"
                      value={habitName}
                      onChange={(e) => setHabitName(e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Description</label>
                  <textarea
                    placeholder="Habit motivation or rules..."
                    value={habitDesc}
                    onChange={(e) => setHabitDesc(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500 h-16 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Category</label>
                    <select
                      value={habitCategory}
                      onChange={(e) => setHabitCategory(e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {['Health', 'Learning', 'College', 'Fitness', 'Career', 'Personal', 'Finance'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Repeat Frequency</label>
                    <select
                      value={habitRepeat}
                      onChange={(e) => setHabitRepeat(e.target.value as any)}
                      className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="daily">Every Day</option>
                      <option value="weekdays">Weekdays (Mon-Fri)</option>
                      <option value="weekends">Weekends</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Preferred Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00 AM"
                      value={habitPreferredTime}
                      onChange={(e) => setHabitPreferredTime(e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={habitDuration}
                      onChange={(e) => setHabitDuration(Number(e.target.value))}
                      className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Difficulty</label>
                    <select
                      value={habitDifficulty}
                      onChange={(e) => setHabitDifficulty(e.target.value as any)}
                      className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={habitReminder}
                        onChange={(e) => setHabitReminder(e.target.checked)}
                        className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Reminder Notifications</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/5 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={habitAllowAiReschedule}
                      onChange={(e) => setHabitAllowAiReschedule(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Allow AI Reschedule</span>
                  </label>

                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <Lock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="flex-1">Fixed Schedule</span>
                    <button
                      type="button"
                      onClick={() => setHabitLockTime(!habitLockTime)}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${habitLockTime ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${habitLockTime ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-white/5 pt-4">
                {activeModal === 'editHabit' && (
                  <button
                    onClick={() => handleDeleteHabit(selectedHabit.id)}
                    className="mr-auto text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Delete Habit
                  </button>
                )}
                <button
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-gray-200 dark:border-white/8 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHabit}
                  className="app-button-primary rounded-xl px-5 py-2 text-xs font-bold cursor-pointer"
                >
                  Save Habit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EVENT DETAILS DRAWER/MODAL ── */}
      <AnimatePresence>
        {activeModal === 'eventDetails' && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-[24px] border border-gray-200 dark:border-white/8 bg-white dark:bg-[#181A26] p-6 shadow-2xl overflow-y-auto max-h-[90vh] soft-scrollbar"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  selectedEvent.completed ? 'bg-emerald-500' :
                  selectedEvent.missedAt ? 'bg-red-500' :
                  selectedEvent.flexibleScheduling === false ? 'bg-blue-600' : 'bg-purple-600'
                }`} />
                <h2 className="text-lg font-bold truncate pr-3">{selectedEvent.title}</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-semibold flex items-center gap-1.5">
                <span>{selectedEvent.flexibleScheduling === false ? '🔒 Fixed Time Block' : '🟣 Flexible Task (AI Managed)'}</span>
                {selectedEvent.isGoalEvent && <span className="bg-[#6D4AFF]/10 text-[#6D4AFF] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold">Goal Event</span>}
              </p>

              {/* Status Alert Banners */}
              {selectedEvent.isGoalEvent && !selectedEvent.completed && (
                <div className="mt-3.5">
                  {selectedEvent.missedAt ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/10 rounded-xl text-red-500 text-xs font-semibold">
                      🔴 Marked as Missed on {selectedEvent.missedAt}. Action required below.
                    </div>
                  ) : isEventInPast(selectedEvent) ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-semibold">
                      ⚠️ This scheduled session was missed. Choose an option below.
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 space-y-3.5 text-xs">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold">{selectedEvent.date} @ {selectedEvent.start} - {selectedEvent.end}</span>
                </div>
                {selectedEvent.category && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span>Category: <span className="font-bold">{selectedEvent.category}</span></span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedEvent.description}
                  </div>
                )}
                {selectedEvent.isAiScheduled && selectedEvent.aiReason && (
                  <div className="flex items-start gap-2 text-purple-600 dark:text-purple-300 bg-purple-500/10 rounded-xl p-3 border border-purple-500/10">
                    <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed font-medium">{selectedEvent.aiReason}</p>
                  </div>
                )}
              </div>

              {/* Goal actions: Complete or Reschedule */}
              {selectedEvent.isGoalEvent && !selectedEvent.completed && (
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                  <button
                    onClick={() => handleCompleteSession(selectedEvent.id, selectedEvent.goalId)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs cursor-pointer shadow-md transition"
                  >
                    <Check className="h-4 w-4 stroke-[3px]" /> Mark Session Complete
                  </button>

                  {(selectedEvent.missedAt || isEventInPast(selectedEvent)) && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Missed Session Actions</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          disabled={missedLoading}
                          onClick={() => handleMissedAction(selectedEvent.id, selectedEvent.goalId, 'skip')}
                          className="py-2 border border-gray-200 dark:border-white/8 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-[10px] font-bold cursor-pointer"
                        >
                          Skip
                        </button>
                        <button
                          disabled={missedLoading}
                          onClick={() => handleMissedAction(selectedEvent.id, selectedEvent.goalId, 'reschedule')}
                          className="py-2 border border-blue-500/20 bg-blue-500/5 text-blue-500 rounded-xl hover:bg-blue-500/10 text-[10px] font-bold cursor-pointer"
                        >
                          Tomorrow
                        </button>
                        <button
                          disabled={missedLoading}
                          onClick={() => handleMissedAction(selectedEvent.id, selectedEvent.goalId, 'ai')}
                          className="py-2 border border-purple-500/20 bg-purple-500/5 text-purple-500 rounded-xl hover:bg-purple-500/10 text-[10px] font-bold cursor-pointer flex items-center justify-center gap-0.5"
                        >
                          <Sparkles className="h-3 w-3 shrink-0" /> AI Auto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer controls */}
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-white/5 pt-4">
                <button
                  onClick={async () => {
                    await dbDeleteEvent(selectedEvent.id);
                    showToast('Event deleted', 'success');
                    setActiveModal(null);
                  }}
                  className="mr-auto text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  Delete Block
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-gray-200 dark:border-white/8 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── GOAL DETAILS SIDE DRAWER / PANEL ── */}
      <AnimatePresence>
        {selectedDetailGoal && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-full max-w-md h-full bg-white dark:bg-[#151722] border-l border-gray-200 dark:border-white/8 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between soft-scrollbar"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedDetailGoal.icon || '🎯'}</span>
                    <div>
                      <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                        {selectedDetailGoal.title}
                      </h2>
                      <span className="text-[10px] font-bold text-[#6D4AFF] dark:text-[#A78BFA] uppercase tracking-wider">
                        {selectedDetailGoal.category} Goal
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDetailGoal(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Progress Details */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-white/2 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Streak</p>
                    <p className="text-base font-black text-orange-500 mt-1 flex items-center justify-center gap-0.5">
                      <Flame className="h-4.5 w-4.5 fill-orange-500/10" /> {selectedDetailGoal.currentStreak || 0}d
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/2 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Longest</p>
                    <p className="text-base font-black text-amber-500 mt-1">
                      👑 {selectedDetailGoal.longestStreak || 0}d
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/2 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Completed</p>
                    <p className="text-base font-black text-emerald-500 mt-1">
                      {selectedDetailGoal.completedSessions || 0} / {selectedDetailGoal.totalSessions || selectedDetailGoal.target || 1}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedDetailGoal.description && (
                  <div className="mt-5 p-3.5 bg-gray-50 dark:bg-white/2 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Motivations / Rules</p>
                    {selectedDetailGoal.description}
                  </div>
                )}

                {/* AI Suggestions Card */}
                <div className="mt-5 p-4 bg-[#F3EEFF]/40 dark:bg-[#1C1836]/40 border border-[#6D4AFF]/10 rounded-2xl">
                  <h4 className="text-xs font-black text-[#6D4AFF] dark:text-[#A78BFA] flex items-center gap-1">
                    <Brain className="h-4 w-4" /> AI Goal Suggestions
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed font-semibold">
                    {selectedDetailGoal.currentStreak > 3 
                      ? "🔥 Awesome streak! You're performing best in morning slots. We've optimized your schedule to protect 9:00 AM." 
                      : "💡 Consistency tip: Schedule this goal at a Fixed Time to build muscle memory before converting to Flexible."}
                  </p>
                </div>

                {/* Upcoming sessions list */}
                <div className="mt-5 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Upcoming Scheduled Blocks</h3>
                  <div className="max-h-[220px] overflow-y-auto border border-gray-100 dark:border-white/5 rounded-2xl divide-y divide-gray-100 dark:divide-white/5 soft-scrollbar bg-white dark:bg-transparent">
                    {events
                      .filter((e: any) => e.goalId === selectedDetailGoal.id && !e.completed && !e.missedAt)
                      .slice(0, 7)
                      .map((ev: any, i) => (
                        <div key={i} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-white/2 transition">
                          <span className="font-bold text-gray-700 dark:text-gray-200">
                            📅 {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="font-black text-[#6D4AFF] dark:text-[#A78BFA]">
                            {ev.start} - {ev.end}
                          </span>
                        </div>
                      ))}
                    {events.filter((e: any) => e.goalId === selectedDetailGoal.id && !e.completed && !e.missedAt).length === 0 && (
                      <p className="text-xs text-gray-400 p-4 text-center">No upcoming sessions scheduled.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 border-t border-gray-100 dark:border-white/5 pt-4 flex gap-3">
                <button
                  onClick={() => {
                    handleOpenEditGoal(selectedDetailGoal);
                    setSelectedDetailGoal(null);
                  }}
                  className="flex-1 py-3 bg-[#6D4AFF] hover:bg-[#593CD4] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition text-center"
                >
                  Edit Schedule & Goal
                </button>
                <button
                  onClick={() => setSelectedDetailGoal(null)}
                  className="px-4 py-3 border border-gray-200 dark:border-white/8 rounded-xl text-gray-500 font-extrabold text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
