import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  dbUpdateEvent,
  dbAddEvent,
  dbDeleteEvent,
  dbAddAssignment,
  dbDeleteAssignment,
  dbUpdateAssignment,
  type DbEvent
} from '../../firebaseService';
import { CalendarGrid, HOUR_HEIGHT, GRID_START_MINS, GRID_END_MINS, type CalendarEvent } from './CalendarGrid';
import { MonthGrid } from './MonthGrid';
import { AgendaView } from './AgendaView';
import { AssignmentManager, type Assignment } from './AssignmentManager';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeDaySchedule, optimizeWeekSchedule, timeToMinutes, formatDateKey as fmtDk, todayKey } from './aiScheduler';
import * as aiService from '../../lib/aiService';
import {
  AlertTriangle,
  Sparkles,
  Trash2,
  Copy,
  CheckSquare,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Brain,
  Zap,
  Plus,
  Award
} from 'lucide-react';

interface CalendarWorkspaceProps {
  user: any;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  weekDays: Date[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  toast: { message: string; type: 'success' | 'error' } | null;
  currentTime: Date;
  aiPreferences?: any;
  tasks?: any[];
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseClockValue = (value: string) => {
  const [time, period] = value.split(' ');
  const [hoursRaw, minutesRaw] = time.split(':').map(Number);
  let hours = hoursRaw % 12;
  if (period === 'PM') {
    hours += 12;
  }
  return hours * 60 + minutesRaw;
};

const formatMinutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMins = mins < 10 ? `0${mins}` : mins;
  return `${displayHours}:${displayMins} ${ampm}`;
};

const formatTimeLabel = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

export const CalendarWorkspace: React.FC<CalendarWorkspaceProps> = ({
  user,
  events,
  setEvents,
  weekDays,
  selectedDate,
  setSelectedDate,
  showToast,
  toast: _toast,
  currentTime,
  aiPreferences,
  tasks = [],
}) => {
  const [view, setView] = useState<'day' | 'week' | 'month' | 'agenda'>('week');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showAiSuggestions, setShowAiSuggestions] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationSummary, setOptimizationSummary] = useState<string | null>(null);
  // settings state (used in settings modal)
  const [_isSettingsModalOpen, _setIsSettingsModalOpen] = useState(false);

  // Creation/Edit Type preset state
  const [editType, setEditType] = useState<'Event' | 'Task' | 'Assignment' | 'Routine' | 'Study' | 'Workout' | 'Break' | 'Meeting' | 'Reminder' | 'Class' | 'Habit' | 'AI Block'>('Event');
  const [_editIsRecurring, setEditIsRecurring] = useState(false);
  const [_editRecurrenceRule, setEditRecurrenceRule] = useState<DbEvent['recurrenceRule']>('daily');
  const [_editRecurrenceInterval, setEditRecurrenceInterval] = useState(1);
  const [_editRecurrenceDays, setEditRecurrenceDays] = useState<number[]>([]);
  const [_editRecurrenceUntil, setEditRecurrenceUntil] = useState('');

  // Assignments & state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [_collapseTodayTimeline, _setCollapseTodayTimeline] = useState(false);
  const [collapseAssignments, setCollapseAssignments] = useState(false);
  const [_collapseAnalytics, _setCollapseAnalytics] = useState(true);
  const [collapseUpcomingTasks, setCollapseUpcomingTasks] = useState(false);
  const [collapseDeadlines, setCollapseDeadlines] = useState(false);

  // Drag-and-drop state coordinates
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'drag' | 'resize-top' | 'resize-bottom' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; top: number; height: number; date: string } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredTimeMinutes, setHoveredTimeMinutes] = useState<number | null>(null);

  // Event modal inputs
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Study');
  const [editPriority, setEditPriority] = useState<CalendarEvent['priority']>('medium');
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editGoogleLink, setEditGoogleLink] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editXpReward, setEditXpReward] = useState(25);
  const [editCompleted, setEditCompleted] = useState(false);
  const [editChecklist, setEditChecklist] = useState<{ text: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const gridRef = useRef<HTMLDivElement | null>(null);

  // Populate edits when selectedEvent changes
  const activeEvent = events.find((e) => e.id === selectedEventId);
  useEffect(() => {
    if (activeEvent) {
      setEditTitle(activeEvent.title);
      setEditCategory(activeEvent.category || 'Study');
      setEditPriority(activeEvent.priority);
      setEditDate(activeEvent.date);
      setEditStart(activeEvent.start);
      setEditEnd(activeEvent.end);
      setEditFaculty(activeEvent.faculty || '');
      setEditLocation(activeEvent.location || '');
      setEditGoogleLink(activeEvent.googleCalendarLink || '');
      setEditNotes(activeEvent.notes || '');
      setEditCompleted(activeEvent.completed || false);
      setEditChecklist(activeEvent.checklist || []);
      setEditXpReward(activeEvent.xpReward || 25);
      setEditType(activeEvent.type || 'Event');
      setEditIsRecurring(activeEvent.isRecurring || false);
      setEditRecurrenceRule(activeEvent.recurrenceRule || 'daily');
      setEditRecurrenceInterval(activeEvent.recurrenceInterval || 1);
      setEditRecurrenceDays(activeEvent.recurrenceDays || []);
      setEditRecurrenceUntil(activeEvent.recurrenceUntil || '');
    }
  }, [selectedEventId, activeEvent]);

  // Real-time listener for assignments
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'calendar_assignments'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list: Assignment[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title,
          dueDate: data.dueDate,
          dueTime: data.dueTime || '11:59 PM',
          priority: data.priority || 'medium',
          subject: data.subject || '',
          description: data.description || '',
          completed: data.completed || false,
        });
      });
      setAssignments(list);
    });
    return () => unsub();
  }, [user]);

  // Handlers for Assignments
  const handleAddAssignment = async (assign: Omit<Assignment, 'id' | 'completed'>) => {
    if (!user) return;
    try {
      await dbAddAssignment(user.uid, assign);
      showToast('Assignment added ✓', 'success');
    } catch (err) {
      showToast('Failed to add assignment', 'error');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await dbDeleteAssignment(id);
      showToast('Assignment deleted ✓', 'success');
    } catch (err) {
      showToast('Failed to delete assignment', 'error');
    }
  };

  const handleToggleAssignmentComplete = async (id: string, comp: boolean) => {
    try {
      await dbUpdateAssignment(id, { completed: comp });
      showToast('Assignment status updated ✓', 'success');
    } catch (err) {
      showToast('Failed to update assignment', 'error');
    }
  };

  // Add Study Session
  const handleAddStudySession = async (session: { title: string; date: string; start: string; end: string; category: string; accent: 'emerald' }) => {
    if (!user) return;
    try {
      const [y, m, d] = session.date.split('-').map(Number);
      const baseDate = new Date(y, m - 1, d);
      
      const startTime = new Date(baseDate);
      const [sh, sm, sa] = session.start.split(/[:\s]/);
      let shVal = parseInt(sh, 10);
      if (sa === 'PM' && shVal < 12) shVal += 12;
      if (sa === 'AM' && shVal === 12) shVal = 0;
      startTime.setHours(shVal, parseInt(sm, 10), 0, 0);

      const endTime = new Date(baseDate);
      const [eh, em, ea] = session.end.split(/[:\s]/);
      let ehVal = parseInt(eh, 10);
      if (ea === 'PM' && ehVal < 12) ehVal += 12;
      if (ea === 'AM' && ehVal === 12) ehVal = 0;
      endTime.setHours(ehVal, parseInt(em, 10), 0, 0);

      await dbAddEvent(user.uid, {
        title: session.title,
        startTime,
        endTime,
        source: 'manual',
        priority: 'medium',
        category: session.category,
        xpReward: 35,
      });
      showToast('Auto-scheduled study prep block ✓', 'success');
    } catch (err) {
      showToast('Failed to schedule study prep block', 'error');
    }
  };

  // ── Day Optimizer (today only, future slots only) ──────────
  const handleOptimizeDay = async () => {
    const today = todayKey();
    const dayKey = fmtDk(selectedDate);

    // Never optimize past days
    if (dayKey < today) {
      showToast("Can't optimize a past day. Switch to today or a future date. ⏰", 'error');
      return;
    }

    setIsOptimizing(true);
    setOptimizationSummary(null);

    const useAi = aiPreferences?.enableAiScheduling && aiPreferences?.enableOptimizeDay;
    const apiKey = aiPreferences?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

    if (useAi && apiKey) {
      showToast("Optimizing day schedule via AI... 🧠", "success");
      try {
        const { optimizedEvents, overloaded, overloadSuggestion } = await aiService.optimizeDay(
          dayKey,
          events,
          tasks,
          aiPreferences,
          apiKey
        );

        let changedCount = 0;
        for (const event of optimizedEvents) {
          const original = events.find((e) => e.id === event.id);
          if (original && (original.start !== event.start || original.end !== event.end || original.date !== event.date)) {
            const [y, m, d] = event.date.split('-').map(Number);
            const sMins = timeToMinutes(event.start);
            const eMins = timeToMinutes(event.end);
            const startTime = new Date(y, m - 1, d);
            startTime.setHours(Math.floor(sMins / 60), sMins % 60, 0, 0);
            const endTime = new Date(y, m - 1, d);
            endTime.setHours(Math.floor(eMins / 60), eMins % 60, 0, 0);
            await dbUpdateEvent(event.id, { startTime, endTime, isAiScheduled: true, aiReason: event.aiReason });
            changedCount++;
          }
        }

        let summary = changedCount > 0
          ? `✨ AI Day Optimization completed! ${changedCount} tasks rearranged.`
          : "Today's schedule is already optimal. No changes needed. ✨";

        if (overloaded && overloadSuggestion) {
          summary += ` (AI Coach: ${overloadSuggestion})`;
          showToast(`⚠️ AI Coach: ${overloadSuggestion}`, 'error');
        } else {
          showToast(summary, 'success');
        }
        setOptimizationSummary(summary);
        setTimeout(() => setOptimizationSummary(null), 6000);
      } catch (err) {
        console.error('AI Day Optimization failed, falling back to local:', err);
        showToast("AI Optimization failed. Running local optimization...", 'error');
        await runLocalDayOptimization(dayKey);
      } finally {
        setIsOptimizing(false);
      }
    } else {
      await runLocalDayOptimization(dayKey);
      setIsOptimizing(false);
    }
  };

  const runLocalDayOptimization = async (dayKey: string) => {
    try {
      const { optimizedEvents, stats } = optimizeDaySchedule(dayKey, events);

      let changedCount = 0;
      for (const event of optimizedEvents) {
        const original = events.find((e) => e.id === event.id);
        if (original && (original.start !== event.start || original.end !== event.end || original.date !== event.date)) {
          const [y, m, d] = event.date.split('-').map(Number);
          const sMins = timeToMinutes(event.start);
          const eMins = timeToMinutes(event.end);
          const startTime = new Date(y, m - 1, d);
          startTime.setHours(Math.floor(sMins / 60), sMins % 60, 0, 0);
          const endTime = new Date(y, m - 1, d);
          endTime.setHours(Math.floor(eMins / 60), eMins % 60, 0, 0);
          await dbUpdateEvent(event.id, { startTime, endTime, isAiScheduled: true, aiReason: event.aiReason });
          changedCount++;
        }
      }

      const summary = changedCount > 0
        ? `✨ ${stats.moved} task${stats.moved !== 1 ? 's' : ''} optimized · ${stats.conflictsResolved} conflict${stats.conflictsResolved !== 1 ? 's' : ''} resolved`
        : "Today's schedule is already optimal. No changes needed. ✨";

      setOptimizationSummary(summary);
      showToast(summary, 'success');
      setTimeout(() => setOptimizationSummary(null), 6000);
    } catch (e) {
      console.error(e);
      showToast("Failed to optimize today's schedule", 'error');
    }
  };

  // ── Week Optimizer (today → end of visible week) ────────────
  const handleOptimizeWeek = async () => {
    const today = todayKey();
    const weekStartStr = today;
    const weekEndStr = weekDays.length > 0 ? fmtDk(weekDays[weekDays.length - 1]) : today;

    if (weekEndStr < today) {
      showToast("Can't optimize a week that has already passed. Navigate to the current week. ⏰", 'error');
      return;
    }

    setIsOptimizing(true);
    setOptimizationSummary(null);

    const useAi = aiPreferences?.enableAiScheduling && aiPreferences?.enableOptimizeWeek;
    const apiKey = aiPreferences?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

    if (useAi && apiKey) {
      showToast("Optimizing week schedule via AI... 🧠", "success");
      try {
        const { optimizedEvents } = await aiService.optimizeWeek(
          weekStartStr,
          weekEndStr,
          events,
          tasks,
          aiPreferences,
          apiKey
        );
        const overloaded = false;
        const overloadSuggestion = "";

        let changedCount = 0;
        for (const event of optimizedEvents) {
          const original = events.find((e) => e.id === event.id);
          if (original && (original.start !== event.start || original.end !== event.end || original.date !== event.date)) {
            const [y, m, d] = event.date.split('-').map(Number);
            const sMins = timeToMinutes(event.start);
            const eMins = timeToMinutes(event.end);
            const startTime = new Date(y, m - 1, d);
            startTime.setHours(Math.floor(sMins / 60), sMins % 60, 0, 0);
            const endTime = new Date(y, m - 1, d);
            endTime.setHours(Math.floor(eMins / 60), eMins % 60, 0, 0);
            await dbUpdateEvent(event.id, { startTime, endTime, isAiScheduled: true, aiReason: event.aiReason });
            changedCount++;
          }
        }

        let summary = changedCount > 0
          ? `✨ AI Week Optimization completed! ${changedCount} tasks rebalanced.`
          : 'Weekly schedule is already balanced. No changes needed. ⚡';

        if (overloaded && overloadSuggestion) {
          summary += ` (AI Coach: ${overloadSuggestion})`;
          showToast(`⚠️ AI Coach: ${overloadSuggestion}`, 'error');
        } else {
          showToast(summary, 'success');
        }
        setOptimizationSummary(summary);
        setTimeout(() => setOptimizationSummary(null), 6000);
      } catch (err) {
        console.error('AI Week Optimization failed, falling back to local:', err);
        showToast("AI Optimization failed. Running local optimization...", 'error');
        await runLocalWeekOptimization(weekStartStr, weekEndStr);
      } finally {
        setIsOptimizing(false);
      }
    } else {
      await runLocalWeekOptimization(weekStartStr, weekEndStr);
      setIsOptimizing(false);
    }
  };

  const runLocalWeekOptimization = async (weekStartStr: string, weekEndStr: string) => {
    try {
      const { optimizedEvents, stats } = optimizeWeekSchedule(weekStartStr, weekEndStr, events);

      let changedCount = 0;
      for (const event of optimizedEvents) {
        const original = events.find((e) => e.id === event.id);
        if (original && (original.start !== event.start || original.end !== event.end || original.date !== event.date)) {
          const [y, m, d] = event.date.split('-').map(Number);
          const sMins = timeToMinutes(event.start);
          const eMins = timeToMinutes(event.end);
          const startTime = new Date(y, m - 1, d);
          startTime.setHours(Math.floor(sMins / 60), sMins % 60, 0, 0);
          const endTime = new Date(y, m - 1, d);
          endTime.setHours(Math.floor(eMins / 60), eMins % 60, 0, 0);
          await dbUpdateEvent(event.id, { startTime, endTime, isAiScheduled: true, aiReason: event.aiReason });
          changedCount++;
        }
      }

      const splitPart = stats.splits > 0 ? ` · ${stats.splits} task${stats.splits !== 1 ? 's' : ''} split` : '';
      const summary = changedCount > 0
        ? `⚡ ${stats.moved} tasks optimized · ${stats.conflictsResolved} conflicts resolved${splitPart}`
        : 'Weekly schedule is already balanced. No changes needed. ⚡';

      setOptimizationSummary(summary);
      showToast(summary, 'success');
      setTimeout(() => setOptimizationSummary(null), 6000);
    } catch (e) {
      console.error(e);
      showToast('Failed to optimize week schedule', 'error');
    }
  };


  const handleAddPreset = (type: typeof editType) => {
    setEditTitle('');
    setEditCategory(type === 'Workout' ? 'Gym' : type === 'Study' ? 'Study' : 'Personal');
    setEditPriority('medium');
    setEditDate(formatDateKey(selectedDate));
    setEditStart('10:00 AM');
    setEditEnd('11:00 AM');
    setEditFaculty('');
    setEditLocation('');
    setEditGoogleLink('');
    setEditNotes('');
    setEditXpReward(type === 'Study' ? 35 : type === 'Workout' ? 30 : 25);
    setEditCompleted(false);
    setEditChecklist([]);
    setEditType(type);
    setEditIsRecurring(false);
    setEditRecurrenceRule('daily');
    setEditRecurrenceInterval(1);
    setEditRecurrenceDays([]);
    setEditRecurrenceUntil('');
    setSelectedEventId(null);
    setIsEditModalOpen(true);
  };

  const handleImportGoogleCalendar = async () => {
    if (!user) return;
    showToast('Syncing with Google Calendar...', 'success');
    try {
      const mockGoogleEvents = [
        {
          title: 'Google Calendar Meeting: Project Sync',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
          source: 'google-calendar' as const,
          priority: 'medium' as const,
          category: 'Office',
          xpReward: 15,
          type: 'Meeting' as const,
        },
        {
          title: 'Google Calendar: Advisor Sync',
          startTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 27 * 60 * 60 * 1000),
          source: 'google-calendar' as const,
          priority: 'high' as const,
          category: 'College',
          xpReward: 20,
          type: 'Meeting' as const,
        }
      ];

      for (const ev of mockGoogleEvents) {
        await dbAddEvent(user.uid, ev);
      }
      showToast('Imported Google Calendar events successfully ✓', 'success');
    } catch (err) {
      showToast('Failed to import Google Calendar', 'error');
    }
  };

  // Drag and Drop Engine
  const handleEventPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    eventId: string,
    mode: 'drag' | 'resize-top' | 'resize-bottom',
    initialDate: string,
    top: number,
    height: number
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedEventId(eventId);
    setDragMode(mode);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      top,
      height,
      date: initialDate,
    });
    setHoveredDay(initialDate);
    setHoveredTimeMinutes(top);
  };

  const handleEventPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedEventId || !dragStart || !dragMode) return;
    e.stopPropagation();

    const dy = e.clientY - dragStart.y;

    const gridElem = gridRef.current;
    if (gridElem) {
      const gridRect = gridElem.getBoundingClientRect();
      const relativeX = e.clientX - gridRect.left - 88;
      const columnsCount = view === 'week' ? 7 : 1;
      const columnWidth = (gridRect.width - 88) / columnsCount;
      const colIndex = Math.max(0, Math.min(columnsCount - 1, Math.floor(relativeX / columnWidth)));
      const targetDateKey = formatDateKey(view === 'week' ? weekDays[colIndex] : selectedDate);
      setHoveredDay(targetDateKey);

      // Snap interval = 15 minutes in pixels (HOUR_HEIGHT / 4)
      const snapPx = HOUR_HEIGHT / 4;
      const maxGridPx = ((GRID_END_MINS - GRID_START_MINS) / 60) * HOUR_HEIGHT;
      if (dragMode === 'drag') {
        const currentTop = dragStart.top + dy;
        const snappedTop = Math.max(0, Math.min(maxGridPx - dragStart.height, Math.round(currentTop / snapPx) * snapPx));
        setHoveredTimeMinutes(snappedTop);
      } else if (dragMode === 'resize-top') {
        const currentTop = dragStart.top + dy;
        const snappedTop = Math.max(0, Math.min(dragStart.top + dragStart.height - snapPx, Math.round(currentTop / snapPx) * snapPx));
        setHoveredTimeMinutes(snappedTop);
      } else if (dragMode === 'resize-bottom') {
        const currentHeight = dragStart.height + dy;
        const snappedHeight = Math.max(snapPx, Math.min(maxGridPx - dragStart.top, Math.round(currentHeight / snapPx) * snapPx));
        setHoveredTimeMinutes(dragStart.top + snappedHeight);
      }
    }
  };

  const handleEventPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedEventId || !dragStart || !dragMode) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    const targetEvent = events.find((ev) => ev.id === draggedEventId);
    if (!targetEvent) {
      resetDragStates();
      return;
    }

    const dy = e.clientY - dragStart.y;
    let targetDateKey = dragStart.date;
    let finalTop = dragStart.top;
    let finalHeight = dragStart.height;

    const gridElem = gridRef.current;
    if (gridElem) {
      const gridRect = gridElem.getBoundingClientRect();
      const relativeX = e.clientX - gridRect.left - 88;
      const columnsCount = view === 'week' ? 7 : 1;
      const columnWidth = (gridRect.width - 88) / columnsCount;
      const colIndex = Math.max(0, Math.min(columnsCount - 1, Math.floor(relativeX / columnWidth)));
      targetDateKey = formatDateKey(view === 'week' ? weekDays[colIndex] : selectedDate);

      const snapPx = HOUR_HEIGHT / 4;
      const maxGridPx = ((GRID_END_MINS - GRID_START_MINS) / 60) * HOUR_HEIGHT;
      if (dragMode === 'drag') {
        const currentTop = dragStart.top + dy;
        finalTop = Math.max(0, Math.min(maxGridPx - dragStart.height, Math.round(currentTop / snapPx) * snapPx));
      } else if (dragMode === 'resize-top') {
        const currentTop = dragStart.top + dy;
        finalTop = Math.max(0, Math.min(dragStart.top + dragStart.height - snapPx, Math.round(currentTop / snapPx) * snapPx));
        finalHeight = (dragStart.top + dragStart.height) - finalTop;
      } else if (dragMode === 'resize-bottom') {
        const currentHeight = dragStart.height + dy;
        finalHeight = Math.max(snapPx, Math.min(maxGridPx - dragStart.top, Math.round(currentHeight / snapPx) * snapPx));
      }
    }

    // Convert pixel positions back to minutes using HOUR_HEIGHT
    const startMinutes = GRID_START_MINS + Math.round((finalTop / HOUR_HEIGHT) * 60);
    const endMinutes = startMinutes + Math.round((finalHeight / HOUR_HEIGHT) * 60);

    const [year, month, day] = targetDateKey.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const startTime = new Date(dateObj);
    startTime.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

    const endTime = new Date(dateObj);
    endTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

    const previousEvents = [...events];
    const newStartStr = formatTimeLabel(startTime);
    const newEndStr = formatTimeLabel(endTime);

    // Optimistic state update
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === draggedEventId
          ? {
              ...ev,
              date: targetDateKey,
              start: newStartStr,
              end: newEndStr,
            }
          : ev
      )
    );

    resetDragStates();

    try {
      await dbUpdateEvent(draggedEventId, {
        startTime,
        endTime,
        lastModifiedByUser: 'drag',
        updatedAt: serverTimestamp(),
      });
      showToast('Saved ✓', 'success');
    } catch (err) {
      console.error('Failed to update event position:', err);
      setEvents(previousEvents);
      showToast('Failed to save changes', 'error');
    }
  };

  const resetDragStates = () => {
    setDraggedEventId(null);
    setDragMode(null);
    setDragStart(null);
    setHoveredDay(null);
    setHoveredTimeMinutes(null);
  };

  const parseTimeStr = (baseDate: Date, timeStr: string): Date => {
    const result = new Date(baseDate);
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      result.setHours(hours, minutes, 0, 0);
    }
    return result;
  };

  const handleUpdateEventDetails = async (eventId: string, updatedFields: any) => {
    const previousEvents = [...events];

    // Optimistic state update
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, ...updatedFields } : ev
      )
    );

    try {
      const dbFields: any = { ...updatedFields };
      if (updatedFields.date || updatedFields.start || updatedFields.end) {
        const targetEv = events.find((e) => e.id === eventId);
        if (targetEv) {
          const finalDate = updatedFields.date || targetEv.date;
          const finalStart = updatedFields.start || targetEv.start;
          const finalEnd = updatedFields.end || targetEv.end;

          const [year, month, day] = finalDate.split('-').map(Number);
          const baseDate = new Date(year, month - 1, day);
          dbFields.startTime = parseTimeStr(baseDate, finalStart);
          dbFields.endTime = parseTimeStr(baseDate, finalEnd);
          
          delete dbFields.date;
          delete dbFields.start;
          delete dbFields.end;
        }
      }

      await dbUpdateEvent(eventId, dbFields);
      showToast('Saved ✓', 'success');
    } catch (err) {
      console.error('Failed to update event details:', err);
      setEvents(previousEvents);
      showToast('Failed to save changes', 'error');
    }
  };

  const handleDeleteEventClick = async (eventId: string) => {
    const previousEvents = [...events];
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    setSelectedEventId(null);
    setIsEditModalOpen(false);

    try {
      await dbDeleteEvent(eventId);
      showToast('Saved ✓', 'success');
    } catch (err) {
      console.error('Failed to delete event:', err);
      setEvents(previousEvents);
      showToast('Failed to delete event', 'error');
    }
  };

  const handleDuplicateEventClick = async (event: CalendarEvent) => {
    if (!user) return;
    try {
      const [year, month, day] = event.date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const startTime = parseTimeStr(targetDate, event.start);
      const endTime = parseTimeStr(targetDate, event.end);

      await dbAddEvent(user.uid, {
        title: `${event.title} (Copy)`,
        startTime,
        endTime,
        source: 'manual',
        priority: event.priority,
        description: event.description || '',
        faculty: event.faculty || '',
        location: event.location || '',
        category: event.category || '',
        attachments: event.attachments || [],
        completed: event.completed || false,
        notes: event.notes || '',
        checklist: event.checklist || [],
        linkedAssignment: event.linkedAssignment || '',
        googleCalendarLink: event.googleCalendarLink || '',
        xpReward: event.xpReward || 25,
      });
      showToast('Saved ✓', 'success');
    } catch (err) {
      console.error('Failed to duplicate event:', err);
      showToast('Failed to duplicate event', 'error');
    }
  };

  const handleCreateQuickEvent = async (date: string, timeMinutes: number) => {
    if (!user) return;
    try {
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);

      const startTime = new Date(dateObj);
      const startMinTotal = 540 + timeMinutes;
      startTime.setHours(Math.floor(startMinTotal / 60), startMinTotal % 60, 0, 0);

      const endTime = new Date(dateObj);
      const endMinTotal = startMinTotal + 60; // 1 hour duration
      endTime.setHours(Math.floor(endMinTotal / 60), endMinTotal % 60, 0, 0);

      await dbAddEvent(user.uid, {
        title: 'New Class Block',
        startTime,
        endTime,
        source: 'manual',
        priority: 'medium',
        category: 'Study',
        xpReward: 25,
      });
      showToast('Event created ✓', 'success');
    } catch (err) {
      showToast('Failed to create event', 'error');
    }
  };

  const handleOpenModalAtSlot = (date: string, start: string, end: string) => {
    if (!user) return;
    // Pre-fill event draft and open modal directly
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const startTime = parseTimeStr(dateObj, start);
    const endTime = parseTimeStr(dateObj, end);

    dbAddEvent(user.uid, {
      title: 'New Scheduled Slot',
      startTime,
      endTime,
      source: 'manual',
      priority: 'medium',
      category: 'Study',
      xpReward: 25,
    }).then(() => {
      showToast('Scheduled event at slot ✓', 'success');
    }).catch(() => {
      showToast('Failed to schedule event', 'error');
    });
  };

  // Open Details Modal for editing
  const handleOpenEditModal = (event: CalendarEvent) => {
    setSelectedEventId(event.id);
    setIsEditModalOpen(true);
  };

  // Recurrence Expander Engine — must run before conflict detection
  const getExpandedEvents = (rawEvents: CalendarEvent[]): CalendarEvent[] => {
    const list: CalendarEvent[] = [];
    const startWindow = new Date(selectedDate);
    startWindow.setDate(startWindow.getDate() - 45);
    const endWindow = new Date(selectedDate);
    endWindow.setDate(endWindow.getDate() + 90);

    rawEvents.forEach((ev) => {
      if (!ev.isRecurring) {
        list.push(ev);
        return;
      }

      let baseStart: Date;
      let baseEnd: Date;
      if (ev.startTime) {
        baseStart = ev.startTime instanceof Date ? ev.startTime : (ev.startTime.toDate ? ev.startTime.toDate() : new Date(ev.startTime));
      } else {
        const [y, m, d] = ev.date.split('-').map(Number);
        baseStart = parseTimeStr(new Date(y, m - 1, d), ev.start);
      }
      if (ev.endTime) {
        baseEnd = ev.endTime instanceof Date ? ev.endTime : (ev.endTime.toDate ? ev.endTime.toDate() : new Date(ev.endTime));
      } else {
        const [y, m, d] = ev.date.split('-').map(Number);
        baseEnd = parseTimeStr(new Date(y, m - 1, d), ev.end);
      }
      if (isNaN(baseStart.getTime()) || isNaN(baseEnd.getTime())) return;

      const durationMs = baseEnd.getTime() - baseStart.getTime();
      let untilDate = new Date(endWindow);
      if (ev.recurrenceUntil) {
        const [uY, uM, uD] = ev.recurrenceUntil.split('-').map(Number);
        const customUntil = new Date(uY, uM - 1, uD, 23, 59, 59, 999);
        if (customUntil < untilDate) untilDate = customUntil;
      }

      const currentStep = new Date(baseStart);
      let safetyCounter = 0;
      while (currentStep <= untilDate && safetyCounter < 500) {
        safetyCounter++;
        let isMatch = false;
        const rule = ev.recurrenceRule || 'daily';
        const dayOfWeek = currentStep.getDay();
        const dateKey = formatDateKey(currentStep);
        const isExceptionDate = ev.exceptionDates?.includes(dateKey);

        if (!isExceptionDate) {
          if (rule === 'daily') {
            isMatch = true;
          } else if (rule === 'weekdays') {
            isMatch = dayOfWeek >= 1 && dayOfWeek <= 5;
          } else if (rule === 'weekends') {
            isMatch = dayOfWeek === 0 || dayOfWeek === 6;
          } else if (rule === 'weekly') {
            const days = ev.recurrenceDays || [];
            isMatch = days.length === 0 ? dayOfWeek === baseStart.getDay() : days.includes(dayOfWeek);
          } else if (rule === 'biweekly') {
            const weeksDiff = Math.floor((currentStep.getTime() - baseStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
            if (weeksDiff % 2 === 0) {
              const days = ev.recurrenceDays || [];
              isMatch = days.length === 0 ? dayOfWeek === baseStart.getDay() : days.includes(dayOfWeek);
            }
          } else if (rule === 'monthly') {
            isMatch = currentStep.getDate() === baseStart.getDate();
          } else if (rule === 'custom-days') {
            const interval = ev.recurrenceInterval || 1;
            const daysDiff = Math.floor((currentStep.getTime() - baseStart.getTime()) / (24 * 60 * 60 * 1000));
            isMatch = daysDiff % interval === 0;
          } else if (rule === 'custom-weeks') {
            const interval = ev.recurrenceInterval || 1;
            const weeksDiff = Math.floor((currentStep.getTime() - baseStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
            if (weeksDiff % interval === 0) {
              const days = ev.recurrenceDays || [];
              isMatch = days.length === 0 ? dayOfWeek === baseStart.getDay() : days.includes(dayOfWeek);
            }
          } else if (rule === 'semester') {
            const days = ev.recurrenceDays || [];
            isMatch = days.includes(dayOfWeek);
          }
        }

        if (isMatch && currentStep >= startWindow) {
          const occStart = new Date(currentStep);
          occStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          const occEnd = new Date(occStart.getTime() + durationMs);
          const occDateKey = formatDateKey(occStart);
          list.push({
            ...ev,
            id: `${ev.id}_occurrence_${occDateKey}`,
            date: occDateKey,
            start: formatTimeLabel(occStart),
            end: formatTimeLabel(occEnd),
            startTime: occStart,
            endTime: occEnd,
            repeatSeriesId: ev.id,
          });
        }
        currentStep.setDate(currentStep.getDate() + 1);
      }
    });
    return list;
  };

  const expandedEvents = getExpandedEvents(events);

  // Conflict Detection Logic
  const conflicts: string[] = [];
  const conflictingPairs: Array<[CalendarEvent, CalendarEvent]> = [];
  for (let i = 0; i < expandedEvents.length; i++) {
    for (let j = i + 1; j < expandedEvents.length; j++) {
      const e1 = expandedEvents[i];
      const e2 = expandedEvents[j];
      if (e1.date === e2.date) {
        const s1 = parseClockValue(e1.start);
        const eEnd1 = parseClockValue(e1.end);
        const s2 = parseClockValue(e2.start);
        const eEnd2 = parseClockValue(e2.end);
        if (s1 < eEnd2 && s2 < eEnd1) {
          conflicts.push(e1.id);
          conflicts.push(e2.id);
          conflictingPairs.push([e1, e2]);
        }
      }
    }
  }
  const uniqueConflictIds = Array.from(new Set(conflicts));

  // Suggest alternative slot (find first free 1-hour block)
  const getAlternativeSlot = (conflictingEvent: CalendarEvent) => {
    const dayEvents = expandedEvents.filter((e) => e.date === conflictingEvent.date && e.id !== conflictingEvent.id);
    for (let m = 540; m <= 1020; m += 60) {
      const overlap = dayEvents.some((ev) => {
        const s = parseClockValue(ev.start);
        const ed = parseClockValue(ev.end);
        return m < ed && m + 60 > s;
      });
      if (!overlap) {
        return { start: formatMinutesToTime(m), end: formatMinutesToTime(m + 60) };
      }
    }
    return null;
  };

  const handleMoveAutomatically = async (event: CalendarEvent, altSlot: { start: string; end: string }) => {
    await handleUpdateEventDetails(event.id, {
      start: altSlot.start,
      end: altSlot.end,
    });
    showToast('Rescheduled block automatically ✓', 'success');
  };


  // Checklist updates helper
  const toggleChecklistItem = (idx: number) => {
    const updated = editChecklist.map((item, i) =>
      i === idx ? { ...item, completed: !item.completed } : item
    );
    setEditChecklist(updated);
    handleUpdateEventDetails(selectedEventId!, { checklist: updated });
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const updated = [...editChecklist, { text: newChecklistItem.trim(), completed: false }];
    setEditChecklist(updated);
    setNewChecklistItem('');
    handleUpdateEventDetails(selectedEventId!, { checklist: updated });
  };


  // Filtering events
  const filteredEvents = expandedEvents.filter((ev) => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || (ev.category || 'Study').toLowerCase() === selectedCategory.toLowerCase();
    const matchesPrio = selectedPriority === 'all' || ev.priority.toLowerCase() === selectedPriority.toLowerCase();
    const matchesType = selectedType === 'all' || (ev.type || 'Event').toLowerCase() === selectedType.toLowerCase();
    return matchesSearch && matchesCat && matchesPrio && matchesType;
  });


  const shiftSelectedDate = (direction: -1 | 1) => {
    const nextDate = new Date(selectedDate);
    if (view === 'day') {
      nextDate.setDate(nextDate.getDate() + direction);
    } else if (view === 'week' || view === 'agenda') {
      nextDate.setDate(nextDate.getDate() + direction * 7);
    } else if (view === 'month') {
      nextDate.setMonth(nextDate.getMonth() + direction);
    }
    setSelectedDate(nextDate);
  };

  // Formatting date range for topbar display
  const getTopbarRangeLabel = () => {
    if (view === 'day') {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(selectedDate);
    } else if (view === 'month') {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(selectedDate);
    } else {
      // Week or Agenda view
      const first = weekDays[0];
      const last = weekDays[6];
      if (first.getMonth() === last.getMonth()) {
        return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} - ${last.getDate()}, ${last.getFullYear()}`;
      } else {
        return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} - ${last.toLocaleDateString('en-US', { month: 'short' })} ${last.getDate()}, ${last.getFullYear()}`;
      }
    }
  };





  const sameDayEventCount = expandedEvents.filter((e) => e.date === formatDateKey(selectedDate)).length;
  void sameDayEventCount; // used in conflict banner

  return (
    <div className="relative flex flex-col gap-4 h-full">

      {/* ── Optimization Overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {isOptimizing && (
          <motion.div
            key="optimizer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 bg-[#1D1F2D] border border-white/10 rounded-2xl px-8 py-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-400 animate-spin" />
                <span className="text-white font-semibold text-sm">AI is optimizing your schedule…</span>
              </div>
              <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                />
              </div>
              <p className="text-xs text-gray-400">Finding free slots · Balancing workload · Respecting deadlines</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Optimization Result Banner ───────────────────────────── */}
      <AnimatePresence>
        {optimizationSummary && !isOptimizing && (
          <motion.div
            key="opt-summary"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-400/20 rounded-xl text-sm text-purple-300 font-medium"
          >
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            <span>{optimizationSummary}</span>
            <button
              onClick={() => setOptimizationSummary(null)}
              className="ml-auto text-gray-400 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#151722]/95 backdrop-blur-md border border-[#E5E7EB] dark:border-white/8 rounded-2xl shadow-sm select-none">
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">


          {/* Left: Navigation */}
          <button
            onClick={() => setSelectedDate(new Date())}
            className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] px-3.5 py-1.5 text-xs font-bold text-gray-800 dark:text-white hover:bg-purple-500/5 transition cursor-pointer shrink-0"
          >
            Today
          </button>

          <div className="flex items-center rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] p-0.5 shrink-0">
            <button onClick={() => shiftSelectedDate(-1)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#6D4AFF] rounded-lg transition cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => shiftSelectedDate(1)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#6D4AFF] rounded-lg transition cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-sm font-bold text-gray-900 dark:text-white min-w-[160px]">
            {getTopbarRangeLabel()}
          </h3>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-1 shrink-0" />

          {/* View selector */}
          <div className="flex items-center rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] p-1 gap-0.5 shrink-0">
            {(['day', 'week', 'month', 'agenda'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition cursor-pointer ${
                  view === v ? 'bg-[#6D4AFF] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-1 shrink-0" />

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 w-36 transition"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-white focus:outline-none cursor-pointer shrink-0"
          >
            <option value="all">All Categories</option>
            {['Study', 'Gym', 'Office', 'Personal', 'Meeting', 'Sports', 'Custom'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-white focus:outline-none cursor-pointer shrink-0"
          >
            <option value="all">All Priorities</option>
            {['low', 'medium', 'high', 'critical'].map((p) => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>

          {/* AI Optimization Toolbar buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleOptimizeDay}
              disabled={isOptimizing}
              className="rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className={`h-3.5 w-3.5 text-purple-500 ${isOptimizing ? 'animate-spin' : ''}`} />
              {isOptimizing ? 'Optimizing...' : '✨ Optimize Day'}
            </button>
            <button
              onClick={handleOptimizeWeek}
              disabled={isOptimizing}
              className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className={`h-3.5 w-3.5 text-indigo-500 ${isOptimizing ? 'animate-pulse' : ''}`} />
              {isOptimizing ? 'Balancing...' : '⚡ Optimize Week'}
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons — only functional ones */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Add Event */}
            <button
              onClick={() => handleAddPreset('Event')}
              className="rounded-xl bg-[#6D4AFF] hover:brightness-110 text-white px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-purple-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add Event
            </button>

            {/* Add Task */}
            <button
              onClick={() => handleAddPreset('Task')}
              className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] hover:bg-purple-500/5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5 text-[#6D4AFF]" /> Task
            </button>

            {/* Add Study */}
            <button
              onClick={() => handleAddPreset('Study')}
              className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] hover:bg-purple-500/5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Brain className="h-3.5 w-3.5 text-sky-500" /> Study
            </button>

            {/* Google Calendar */}
            <button
              onClick={handleImportGoogleCalendar}
              className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] hover:bg-purple-500/5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer inline-flex items-center gap-1.5"
              title="Import from Google Calendar"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Google Cal
            </button>
          </div>
        </div>
      </div>

      {/* ── Conflict Warning Banner (only when there are real conflicts) ── */}
      {conflictingPairs.length > 0 && showAiSuggestions && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3.5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Overlapping Events Detected</p>
              {conflictingPairs.slice(0, 2).map(([e1, e2], idx) => {
                const alt = getAlternativeSlot(e2);
                return (
                  <div key={idx} className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="font-bold text-gray-900 dark:text-white">"{e1.title}"</span> overlaps <span className="font-bold text-gray-900 dark:text-white">"{e2.title}"</span> — {e1.start} to {e1.end}
                    </span>
                    {alt && (
                      <button
                        onClick={() => handleMoveAutomatically(e2, alt)}
                        className="rounded-lg bg-purple-600 text-white px-2.5 py-1 text-[10px] font-bold hover:bg-purple-500 transition cursor-pointer shrink-0"
                      >
                        Move to {alt.start}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={() => setShowAiSuggestions(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Calendar Grid — full width ──────────────────────────── */}
      <div className="flex-1 min-h-0">
        {filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#1D1F2D]">
            <div className="text-4xl mb-3 animate-bounce">📅</div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No events found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[260px]">
              {searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all'
                ? 'Try adjusting your filters.'
                : 'Add your first event using the toolbar above.'}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedPriority('all'); setSelectedType('all'); }}
                className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#1D1F2D] px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-purple-500/5 transition cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                onClick={() => handleCreateQuickEvent(formatDateKey(selectedDate), 60)}
                className="rounded-xl bg-[#6D4AFF] text-white px-3.5 py-2 text-xs font-bold hover:brightness-110 transition cursor-pointer"
              >
                Create Event
              </button>
            </div>
          </div>
        )}

        {/* Day & Week Timeline */}
        {(view === 'week' || view === 'day') && (
          <CalendarGrid
            view={view}
            events={filteredEvents}
            days={view === 'week' ? weekDays : [selectedDate]}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            currentTime={currentTime}
            gridRef={gridRef}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
            setSelectedEventExpanded={setIsEditModalOpen}
            draggedEventId={draggedEventId}
            hoveredDay={hoveredDay}
            hoveredTimeMinutes={hoveredTimeMinutes}
            onEventPointerDown={handleEventPointerDown}
            onEventPointerMove={handleEventPointerMove}
            onEventPointerUp={handleEventPointerUp}
            onCreateQuickEvent={handleCreateQuickEvent}
            onOpenModalAtSlot={handleOpenModalAtSlot}
            onDuplicateEvent={handleDuplicateEventClick}
            conflicts={uniqueConflictIds}
            onOpenEditModal={handleOpenEditModal}
            handleMoveAutomatically={handleMoveAutomatically}
          />
        )}

        {/* Month Grid */}
        {view === 'month' && (
          <MonthGrid
            events={filteredEvents}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onOpenEditModal={handleOpenEditModal}
            onOpenModalAtSlot={handleOpenModalAtSlot}
            onCreateQuickEvent={handleCreateQuickEvent}
          />
        )}

        {/* Agenda View */}
        {view === 'agenda' && (
          <AgendaView
            events={filteredEvents}
            days={weekDays}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onOpenEditModal={handleOpenEditModal}
          />
        )}
      </div>

      {/* ── Bottom Collapsible Panels ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Upcoming Tasks */}
        <div className="border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden bg-white dark:bg-[#151722]">
          <button
            onClick={() => setCollapseUpcomingTasks(!collapseUpcomingTasks)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-500/[0.03] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">Upcoming Tasks</span>
              <span className="bg-purple-500/10 text-purple-600 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {events.filter(ev => !ev.completed && ev.date >= formatDateKey(new Date())).length}
              </span>
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${!collapseUpcomingTasks ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {!collapseUpcomingTasks && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t dark:border-white/8"
              >
                <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto soft-scrollbar">
                  {events
                    .filter(ev => !ev.completed && ev.date >= formatDateKey(new Date()))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 8)
                    .map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => handleOpenEditModal(ev)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-500/5 transition text-left group"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          ev.priority === 'critical' ? 'bg-red-500 animate-pulse' :
                          ev.priority === 'high' ? 'bg-orange-400' :
                          ev.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{ev.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{ev.date} · {ev.start}</p>
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-600 shrink-0 font-medium capitalize">{ev.category || ev.type}</span>
                      </button>
                    ))}
                  {events.filter(ev => !ev.completed && ev.date >= formatDateKey(new Date())).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No upcoming tasks 🎉</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Upcoming Deadlines */}
        <div className="border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden bg-white dark:bg-[#151722]">
          <button
            onClick={() => setCollapseDeadlines(!collapseDeadlines)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/[0.03] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">Upcoming Deadlines</span>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {events.filter(ev => ev.deadline && ev.date >= formatDateKey(new Date())).length}
              </span>
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${!collapseDeadlines ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {!collapseDeadlines && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t dark:border-white/8"
              >
                <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto soft-scrollbar">
                  {events
                    .filter(ev => ev.deadline && ev.date >= formatDateKey(new Date()))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 6)
                    .map(ev => {
                      const daysUntil = Math.ceil((new Date(ev.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <button
                          key={ev.id}
                          onClick={() => handleOpenEditModal(ev)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-500/5 transition text-left"
                        >
                          <span className={`text-sm ${daysUntil <= 1 ? 'animate-bounce' : ''}`}>⏰</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{ev.title}</p>
                            <p className="text-[10px] text-gray-400 truncate">{ev.date} · {ev.start}</p>
                          </div>
                          <span className={`text-[9px] font-extrabold shrink-0 px-2 py-0.5 rounded-full ${
                            daysUntil <= 1 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' :
                            daysUntil <= 3 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300' :
                            'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                          }`}>
                            {daysUntil <= 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          </span>
                        </button>
                      );
                    })}
                  {events.filter(ev => ev.deadline && ev.date >= formatDateKey(new Date())).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No upcoming deadlines ✓</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Assignments Panel (collapsible, real Firebase data) ───── */}
      <div className="border border-slate-200/60 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-[#151722]">
        <button
          onClick={() => setCollapseAssignments(!collapseAssignments)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-purple-500/[0.02] transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">
              Assignments & Deadlines
            </span>
            {assignments.length > 0 && (
              <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {assignments.filter(a => !a.completed).length} pending
              </span>
            )}
          </div>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${!collapseAssignments ? 'rotate-90' : ''}`} />
        </button>
        {!collapseAssignments && (
          <div className="border-t dark:border-white/5">
            <AssignmentManager
              assignments={assignments}
              onAddAssignment={handleAddAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onToggleAssignmentComplete={handleToggleAssignmentComplete}
              onAddStudySession={handleAddStudySession}
            />
          </div>
        )}
      </div>

      {/* ── Event Details Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && activeEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-2xl rounded-2xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl p-6 shadow-2xl relative text-slate-800 dark:text-slate-100 overflow-hidden"
            >
              {/* Close */}
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-2 pb-3 border-b dark:border-white/8">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Edit Event</h3>
                  <span className="ml-auto text-[10px] text-purple-500 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">
                    {activeEvent.type || 'Event'}
                  </span>
                </div>

                {/* Title & Category */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        handleUpdateEventDetails(activeEvent.id, { title: e.target.value });
                      }}
                      className="app-input font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => { setEditCategory(e.target.value); handleUpdateEventDetails(activeEvent.id, { category: e.target.value }); }}
                      className="app-input capitalize cursor-pointer"
                    >
                      {['Study', 'Gym', 'Office', 'Personal', 'Meeting', 'Sports', 'Custom'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority, Date, Start, End */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => { setEditPriority(e.target.value as any); handleUpdateEventDetails(activeEvent.id, { priority: e.target.value }); }}
                      className="app-input capitalize cursor-pointer"
                    >
                      {['low', 'medium', 'high', 'critical'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Date</label>
                    <input type="date" value={editDate}
                      onChange={(e) => { setEditDate(e.target.value); handleUpdateEventDetails(activeEvent.id, { date: e.target.value }); }}
                      className="app-input cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Start</label>
                    <input type="text" value={editStart}
                      onChange={(e) => { setEditStart(e.target.value); handleUpdateEventDetails(activeEvent.id, { start: e.target.value }); }}
                      className="app-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">End</label>
                    <input type="text" value={editEnd}
                      onChange={(e) => { setEditEnd(e.target.value); handleUpdateEventDetails(activeEvent.id, { end: e.target.value }); }}
                      className="app-input"
                    />
                  </div>
                </div>

                {/* Faculty & Location */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Faculty / Prof</label>
                    <input type="text" value={editFaculty}
                      onChange={(e) => { setEditFaculty(e.target.value); handleUpdateEventDetails(activeEvent.id, { faculty: e.target.value }); }}
                      className="app-input" placeholder="e.g. Prof. Jones"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Location</label>
                    <input type="text" value={editLocation}
                      onChange={(e) => { setEditLocation(e.target.value); handleUpdateEventDetails(activeEvent.id, { location: e.target.value }); }}
                      className="app-input" placeholder="Room 101, Zoom link..."
                    />
                  </div>
                </div>

                {/* Notes & Google Link */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Notes</label>
                    <textarea value={editNotes}
                      onChange={(e) => { setEditNotes(e.target.value); handleUpdateEventDetails(activeEvent.id, { notes: e.target.value }); }}
                      rows={2} className="app-input text-xs resize-none" placeholder="Syllabus notes, links..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Google Calendar Link</label>
                    <input type="text" value={editGoogleLink}
                      onChange={(e) => { setEditGoogleLink(e.target.value); handleUpdateEventDetails(activeEvent.id, { googleCalendarLink: e.target.value }); }}
                      className="app-input" placeholder="https://calendar.google.com/..."
                    />
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">Checklist</label>
                  <div className="flex gap-2">
                    <input
                      type="text" value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add sub-task..."
                      className="app-input flex-1 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                    />
                    <button type="button" onClick={addChecklistItem} className="app-button-secondary py-1.5 px-3 text-xs cursor-pointer">
                      Add
                    </button>
                  </div>
                  {editChecklist.length > 0 && (
                    <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto soft-scrollbar">
                      {editChecklist.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border dark:border-white/5 bg-gray-50 dark:bg-[#1D1F2D]">
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={item.completed}
                              onChange={() => toggleChecklistItem(idx)}
                              className="h-3.5 w-3.5 text-purple-600 rounded border-gray-300/50"
                            />
                            <span className={item.completed ? 'line-through text-gray-400' : ''}>{item.text}</span>
                          </span>
                          <button type="button"
                            onClick={() => {
                              const updated = editChecklist.filter((_, i) => i !== idx);
                              setEditChecklist(updated);
                              handleUpdateEventDetails(activeEvent.id, { checklist: updated });
                            }}
                            className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between pt-3 border-t dark:border-white/8">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={editCompleted}
                        onChange={(e) => { setEditCompleted(e.target.checked); handleUpdateEventDetails(activeEvent.id, { completed: e.target.checked }); }}
                        className="h-4 w-4 text-purple-600 rounded border-gray-300/50"
                      />
                      <span className="text-gray-600 dark:text-gray-300">Mark complete</span>
                    </label>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{editXpReward} XP</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDuplicateEventClick(activeEvent)}
                      className="app-button-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={() => handleDeleteEventClick(activeEvent.id)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 px-3 py-1.5 text-xs font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
