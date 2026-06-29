import type { UserProfile, UserStats, Habit, DbGoal, XpHistoryEntry, WeeklyAnalytics } from '../../firebaseService';
export type { UserProfile, UserStats, Habit, DbGoal, XpHistoryEntry, WeeklyAnalytics };

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'overdue';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  priority: Priority;
  accent: 'lavender' | 'amber' | 'sky' | 'emerald' | 'rose';
  deadline?: boolean;
  description?: string;
  faculty?: string;
  location?: string;
  category?: string;
  attachments?: string[];
  completed?: boolean;
  notes?: string;
  checklist?: { text: string; completed: boolean }[];
  linkedAssignment?: string;
  googleCalendarLink?: string;
  isAiScheduled?: boolean;
  aiReason?: string;
  flexibleScheduling?: boolean;
  breakAfterTask?: boolean;
  rescheduleCount?: number;
  sourceType?: 'goal' | 'habit' | 'manual';
  sourceId?: string;
  isGoalEvent?: boolean;
  goalId?: string;
  goalSchedulingType?: 'fixed' | 'flexible' | 'ai';
  sessionIndex?: number;
  missedAt?: string;
  rescheduledFrom?: string;
  isHabitEvent?: boolean;
  habitId?: string;
  isLocked?: boolean;
  lastModifiedByUser?: 'ui' | 'drag' | 'optimizer' | null;
}

export interface Task {
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
  priority: Priority;
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
  createdAt?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
  location?: string;
  guests?: string[];
  repeatFrequency?: string;
  difficulty?: string;
  goal?: string;
  streak?: number;
  endTime?: string;
  scheduleInCalendar?: boolean;
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
  earliestStartDate?: string;
  latestFinishTime?: string;
  fixedTime?: string;
  flexibleScheduling?: boolean;
  breakAfterTask?: boolean;
  isAiScheduled?: boolean;
  aiReason?: string;
  rescheduleCount?: number;
}

export interface DashboardData {
  tasks: Task[];
  events: CalendarEvent[];
  dashboardHabits: Habit[];
  dashboardGoals: DbGoal[];
  xpHistory: XpHistoryEntry[];
  weeklyAnalytics: WeeklyAnalytics | null;
  userProfile: UserProfile | null;
  userStats: UserStats | null;
  smartAdvice: string;
}

export interface ChecklistItem {
  id: string;
  type: 'habit' | 'goal';
  title: string;
  completed: boolean;
  streak: number;
  percentage: number;
  icon: string;
  status: string;
  time: string;
}
