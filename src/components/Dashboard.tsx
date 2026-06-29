import { useState, useEffect, useRef, useCallback, type FormEvent, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { collection, query, where, doc, onSnapshot, orderBy, limit, getDoc } from 'firebase/firestore';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Bell,
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Layers,
  ListTodo,
  LogOut,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  User as UserIcon,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { auth, db } from '../firebase';
import {
  ensureUserProfile,
  updateUserProfile,
  dbAddTask,
  dbUpdateTask,
  dbToggleTaskCompleted,
  dbDeleteTask,
  dbAddEvent,
  dbUpdateEvent,
  dbAddNote,
  dbDeleteNote,
  dbLogAiCoachUsage,
  claimBadgeReward,
  MASTER_BADGES,
  dbToggleHabitCompleted,
  dbUpdateGoalProgress,
  dbSaveAiMessage,
  dbGetAiHistory,
  dbGetXpHistory,
  dbGetWeeklyAnalytics,
  dbGetUserPreferences,
  dbUpdateUserPreferences,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type UserProfile,
  type UserStats,
  type UserBadge,
  type UserIntegration,
  type Note,
  type Habit,
  type DbGoal,
  type AiChatMessage,
  type XpHistoryEntry,
  type WeeklyAnalytics
} from '../firebaseService';
import { BadgeIllustration } from './BadgeIllustration';
import { ConnectedAppsCard } from './GamificationWidgets';
import { CalendarWorkspace } from './calendar/CalendarWorkspace';
import { TaskWorkspace } from './TaskWorkspace';
import TaskEditorModal from './TaskEditorModal';
import { GoalsHabitsWorkspace } from './GoalsHabitsWorkspace';

import { FloatingAiAssistant } from './FloatingAiAssistant';
import { FloatingActionButton } from './FloatingActionButton';
import { autoScheduleTask, timeToMinutes, autoReschedulePastTasks, optimizeDaySchedule, todayKey, formatDateKey as fmtDkScheduler } from './calendar/aiScheduler';
import * as aiService from '../lib/aiService';
import * as voiceService from '../lib/voiceService';
import {
  DashboardSummary,
  TodayTimeline,
  HighestPriorityTask,
  AssignmentDeadlineTracker,
  GoalsProgress,
  HabitsTracker,
  ProductivityAnalytics,
  RecentActivity,
  AISuggestions,
  CalendarPreview,
  SmartToDoList,
  DashboardSkeleton,
} from './dashboard/index';





type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'overdue';
type CalendarView = 'day' | 'week' | 'month';
type SectionKey =
  | 'Dashboard'
  | 'Calendar'
  | 'Tasks'
  | 'Planner'
  | 'Events'
  | 'Notes'
  | 'AI Coach'
  | 'Analytics'
  | 'Profile'
  | 'Settings';
type ActiveModal = 'task' | 'event' | 'ai' | null;

interface DashboardProps {
  user: User | null;
  onNavigateHome: () => void;
  initialSection?: SectionKey;
}

interface CalendarEvent {
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
  // Goal/Habit fields
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

interface Task {
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
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
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


// Use the actual current date throughout — never a frozen reference date
const TODAY = new Date();
const SECTION_ITEMS: Array<{ name: SectionKey; icon: LucideIcon; label?: string }> = [
  { name: 'Dashboard', icon: Layers },
  { name: 'Calendar', icon: Calendar },
  { name: 'Tasks', icon: ListTodo },
  { name: 'Notes', icon: ClipboardList },
  { name: 'AI Coach', icon: Brain, label: 'Goals & Habits' },
  { name: 'Profile', icon: UserIcon },
  { name: 'Settings', icon: SettingsIcon },
];




const NAVIGATOR_COPY: Record<SectionKey, { eyebrow: string; title: string; description: string }> = {
  Dashboard: {
    eyebrow: 'Execution & Momentum',
    title: 'Command Center',
    description: 'Track your focus, clear high-priority tasks, and optimize your daily velocity.',
  },
  Calendar: {
    eyebrow: 'Schedule planning',
    title: 'Calendar',
    description: 'Manage your complete schedule, routines, assignments and AI-generated plans from one place.',
  },
  Tasks: {
    eyebrow: 'Execution board',
    title: 'Priority Tasks',
    description: 'See what is urgent, what is next, and what is already complete.',
  },
  Planner: {
    eyebrow: 'AI daily plan',
    title: 'Momentum Planner',
    description: 'Organize your deep work, meetings, and reset windows for the day.',
  },
  Events: {
    eyebrow: 'Meetings and deadlines',
    title: 'Upcoming Events',
    description: 'Review the week by time block and prepare before context switches hit.',
  },
  Notes: {
    eyebrow: 'Knowledge capture',
    title: 'Notes and Briefs',
    description: 'Keep quick context, action items, and meeting takeaways close to your calendar.',
  },
  'AI Coach': {
    eyebrow: 'Goals & Habits Intelligence',
    title: 'Goals & Habits',
    description: 'Build long-term consistency with intelligent scheduling and time blocking.',
  },
  Analytics: {
    eyebrow: 'Performance trends',
    title: 'Workspace Analytics',
    description: 'Measure focus time, delivery consistency, and schedule health at a glance.',
  },
  Profile: {
    eyebrow: 'PROFILE',
    title: 'Profile',
    description: 'Manage your identity, achievements, integrations, badges, and personal workspace journey.',
  },
  Settings: {
    eyebrow: 'AI CONFIGURATION',
    title: 'Settings',
    description: 'Configure your Gemini and Sarvam AI connection keys, scheduling parameters, and coach features.',
  },
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getWeekDays = (date: Date) => {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekRange = (date: Date) => {
  const weekDays = getWeekDays(date);
  const first = weekDays[0];
  const last = weekDays[6];
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(first);
  const lastMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(last);
  const yearLabel = new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(last);

  if (first.getMonth() === last.getMonth()) {
    return `${monthLabel} ${first.getDate()} - ${last.getDate()}, ${yearLabel}`;
  }

  return `${monthLabel} ${first.getDate()} - ${lastMonthLabel} ${last.getDate()}, ${yearLabel}`;
};

const formatMonthTitle = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const ModalFrame = ({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#000000]/50 px-4 backdrop-blur-sm">
    <div className="app-surface w-full max-w-lg p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-[#111827] dark:text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#6B7280] dark:text-[#A1A1AA]">{description}</p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] text-[#6B7280] dark:text-[#A1A1AA] transition hover:text-[#111827] dark:hover:text-white cursor-pointer"
        >
          <Plus className="h-4 w-4 rotate-45" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

function renderAvatarSvg(name: string, className = "h-12 w-12") {
  const base = "rounded-full select-none " + className;
  switch (name) {
    case 'Professional Male 1':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#1E3A8A"/>
          <circle cx="50" cy="40" r="18" fill="#FEE2E2"/>
          <path d="M25 80C25 65 35 58 50 58C65 58 75 65 75 80" fill="#1E40AF"/>
          <path d="M42 36C42 36 46 38 50 38C54 38 58 36 58 36" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"/>
          <rect x="34" y="32" width="10" height="6" rx="2" stroke="#1E1B4B" strokeWidth="2"/>
          <rect x="56" y="32" width="10" height="6" rx="2" stroke="#1E1B4B" strokeWidth="2"/>
          <line x1="44" y1="35" x2="56" y2="35" stroke="#1E1B4B" strokeWidth="2"/>
        </svg>
      );
    case 'Professional Male 2':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#0D9488"/>
          <circle cx="50" cy="42" r="17" fill="#FEF3C7"/>
          <path d="M28 82C28 67 36 60 50 60C64 60 72 67 72 82" fill="#0F766E"/>
          <path d="M40 45C45 52 55 52 60 45" stroke="#78350F" strokeWidth="2" strokeLinecap="round"/>
          <path d="M38 35C42 30 58 30 62 35" stroke="#78350F" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      );
    case 'Professional Male 3':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#EA580C"/>
          <circle cx="50" cy="40" r="18" fill="#FFEDD5"/>
          <path d="M25 80C25 65 35 58 50 58C65 58 75 65 75 80" fill="#C2410C"/>
          <circle cx="50" cy="40" r="14" stroke="#7C2D12" strokeWidth="1" strokeDasharray="3 3"/>
        </svg>
      );
    case 'Professional Female 1':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#6D28D9"/>
          <path d="M30 35C22 50 22 70 30 85C40 85 60 85 70 85C78 70 78 50 70 35" fill="#4C1D95"/>
          <circle cx="50" cy="42" r="16" fill="#FDE047"/>
          <path d="M28 82C28 69 36 62 50 62C64 62 72 69 72 82" fill="#5B21B6"/>
          <rect x="36" y="36" width="10" height="6" rx="3" stroke="#1E1B4B" strokeWidth="2"/>
          <rect x="54" y="36" width="10" height="6" rx="3" stroke="#1E1B4B" strokeWidth="2"/>
        </svg>
      );
    case 'Professional Female 2':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#F43F5E"/>
          <path d="M32 30C25 40 25 60 32 75C35 75 65 75 68 75C75 60 75 40 68 30" fill="#BE123C"/>
          <circle cx="50" cy="42" r="16" fill="#ECE9E6"/>
          <path d="M28 82C28 68 37 61 50 61C63 61 72 68 72 82" fill="#E11D48"/>
          <circle cx="32" cy="44" r="3" fill="#FBBF24"/>
          <circle cx="68" cy="44" r="3" fill="#FBBF24"/>
        </svg>
      );
    case 'Student Avatar 1':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#CA8A04"/>
          <path d="M30 40L50 25L70 40L50 55Z" fill="#854D0E"/>
          <circle cx="50" cy="46" r="16" fill="#FFEDD5"/>
          <path d="M28 82C28 68 37 62 50 62C63 62 72 68 72 82" fill="#A16207"/>
        </svg>
      );
    case 'Student Avatar 2':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#059669"/>
          <circle cx="50" cy="40" r="16" fill="#F3F4F6"/>
          <path d="M25 80C25 66 35 60 50 60C65 60 75 66 75 80" fill="#047857"/>
          <rect x="36" y="34" width="8" height="5" rx="1.5" stroke="#064E3B" strokeWidth="2"/>
          <rect x="56" y="34" width="8" height="5" rx="1.5" stroke="#064E3B" strokeWidth="2"/>
        </svg>
      );
    case 'Minimal Abstract Avatar 1':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6"/>
              <stop offset="100%" stopColor="#EC4899"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g1)"/>
          <circle cx="50" cy="50" r="24" fill="white" fillOpacity="0.2"/>
          <circle cx="50" cy="50" r="14" fill="white" fillOpacity="0.4"/>
        </svg>
      );
    case 'Minimal Abstract Avatar 2':
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4"/>
              <stop offset="100%" stopColor="#3B82F6"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g2)"/>
          <path d="M30 70L50 30L70 70Z" fill="white" fillOpacity="0.25"/>
          <circle cx="50" cy="55" r="10" fill="white" fillOpacity="0.4"/>
        </svg>
      );
    case 'AI Generated Style Avatar':
    default:
      return (
        <svg className={base} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5"/>
              <stop offset="50%" stopColor="#7C3AED"/>
              <stop offset="100%" stopColor="#06B6D4"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g3)"/>
          <path d="M50 20L80 50L50 80L20 50Z" stroke="white" strokeWidth="2" strokeLinecap="round" fill="white" fillOpacity="0.1"/>
          <circle cx="50" cy="50" r="8" fill="#06B6D4"/>
        </svg>
      );
  }
}

const parseUIDateString = (str: string): Date => {
  const now = new Date(TODAY);
  const lower = str.toLowerCase();
  
  let targetDate = new Date(now);
  let hour = 12;
  let isPM = true;

  const timeMatch = str.match(/(\d+)\s*(AM|PM)/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    isPM = timeMatch[2].toUpperCase() === 'PM';
  }

  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  targetDate.setHours(hour, 0, 0, 0);

  if (lower.startsWith('today')) {
    // today
  } else if (lower.startsWith('tomorrow')) {
    targetDate.setDate(now.getDate() + 1);
  } else {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const parts = lower.split(/[\s,]+/);
    let monthIdx = -1;
    let day = -1;

    for (const part of parts) {
      const parsedDay = parseInt(part, 10);
      if (!isNaN(parsedDay)) {
        day = parsedDay;
      } else {
        const foundIdx = monthNames.findIndex(m => part.startsWith(m));
        if (foundIdx !== -1) {
          monthIdx = foundIdx;
        }
      }
    }

    if (monthIdx !== -1 && day !== -1) {
      targetDate.setMonth(monthIdx);
      targetDate.setDate(day);
    }
  }

  return targetDate;
};

const formatUIDateString = (date: Date): string => {
  const today = new Date(TODAY);
  today.setHours(0,0,0,0);
  
  const compareDate = new Date(date);
  compareDate.setHours(0,0,0,0);

  const diffTime = compareDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let datePrefix = '';
  if (diffDays === 0) {
    datePrefix = 'Today';
  } else if (diffDays === 1) {
    datePrefix = 'Tomorrow';
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    datePrefix = `${months[date.getMonth()]} ${date.getDate()}`;
  }

  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${datePrefix}, ${hours} ${ampm}`;
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

const formatTimeLabel = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutesStr + ' ' + ampm;
};

const parseTags = (value: string) =>
  value.split(',').map((tag) => tag.trim()).filter(Boolean);

const normalizeCategory = (value?: string, customCategory?: string) => {
  const custom = customCategory?.trim();
  return custom || value?.trim() || 'Other';
};

const ROTATING_QUOTES = [
  "Progress over perfection.",
  "Small actions compound.",
  "Consistency creates results.",
  "The best time to start is now.",
  "Momentum is built one task at a time.",
  "Discipline is remembering what you want.",
  "Future you will thank present you."
];

const LEVEL_NAMES: Record<number, string> = {
  1: 'Starter',
  2: 'Explorer',
  3: 'Builder',
  4: 'Achiever',
  5: 'Momentum Master',
  6: 'Elite Performer',
  7: 'Legend'
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500];

function getXpDetails(xp: number, level: number) {
  const currentMin = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextMax = LEVEL_THRESHOLDS[level] || Infinity;
  
  if (nextMax === Infinity) {
    return {
      percent: 100,
      xpNeeded: 0,
      nextLevelXp: currentMin
    };
  }
  
  const range = nextMax - currentMin;
  const progress = xp - currentMin;
  const percent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  const xpNeeded = nextMax - xp;
  
  return {
    percent,
    xpNeeded,
    nextLevelXp: nextMax
  };
}

const BADGE_DEFINITIONS = MASTER_BADGES.map((badge) => ({
  id: badge.badgeId,
  label: badge.title,
  desc: badge.description,
  category: badge.category,
  target: badge.requirementValue,
  rarity: badge.rarity,
  xpReward: badge.xpReward,
}));



interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt?: { toDate?: () => Date } | Date | null;
  read?: boolean;
}

export function Dashboard({ user, onNavigateHome, initialSection = 'Dashboard' }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [dailyBriefData, setDailyBriefData] = useState<any>(null);
  const [smartAdvice, setSmartAdvice] = useState<string>('');
  const briefLoadedRef = useRef(false);
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (user) {
      updateUserProfile(user.uid, { theme: nextTheme }).catch((err) =>
        console.error('Error updating theme in profile:', err)
      );
    }
  };

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userAvatar, setUserAvatar] = useState('Professional Male 1');
  const [avatarPreview, setAvatarPreview] = useState('Professional Male 1');
  const [displayName, setDisplayName] = useState(user?.displayName || 'Parth Bulbule');
  const [bio, setBio] = useState('Engineering Student | Hackathon Builder | AI Enthusiast');
  const [tempDisplayName, setTempDisplayName] = useState(user?.displayName || 'Parth Bulbule');
  const [tempBio, setTempBio] = useState('Engineering Student | Hackathon Builder | AI Enthusiast');
  const [college, setCollege] = useState('Momentum Academy');
  const [tempCollege, setTempCollege] = useState('Momentum Academy');
  const [role, setRole] = useState('AI Explorer');
  const [tempRole, setTempRole] = useState('AI Explorer');
  const [location, setLocation] = useState('San Francisco, CA');
  const [tempLocation, setTempLocation] = useState('San Francisco, CA');

  // Gamification States
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userIntegration, setUserIntegration] = useState<UserIntegration | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<NotificationItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [lastLevel, setLastLevel] = useState<number | null>(null);
  const [levelUpToast, setLevelUpToast] = useState<{ isOpen: boolean; oldLevel: number; newLevel: number } | null>(null);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [habitsCount, setHabitsCount] = useState(0);
  const [dashboardHabits, setDashboardHabits] = useState<Habit[]>([]);
  const [dashboardGoals, setDashboardGoals] = useState<DbGoal[]>([]);


  type BadgeFilter = 'all' | 'unlocked' | 'progress' | 'locked';
  const [badgeVaultOpen, setBadgeVaultOpen] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [highlightedBadgeId, setHighlightedBadgeId] = useState<string | null>(null);
  const [celebratingBadge, setCelebratingBadge] = useState<UserBadge | null>(null);

  const profileTopRef = useRef<HTMLDivElement | null>(null);
  const achievementsRef = useRef<HTMLDivElement | null>(null);
  const connectedAppsRef = useRef<HTMLDivElement | null>(null);
  const preferencesRef = useRef<HTMLDivElement | null>(null);

  // Notes Editor States
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteAccent, setNewNoteAccent] = useState('#F3EEFF');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const [taskDraft, setTaskDraft] = useState({
    title: '',
    description: '',
    category: 'Assignments',
    customCategory: '',
    priority: 'medium' as Priority,
    status: 'not_started' as TaskStatus,
    dueDate: 'Tomorrow, 12 PM',
    dueTime: '12:00 PM',
    durationMinutes: '30',
    progress: '0',
    tags: '',
    reminder: true,
    reminderMinutesBefore: '30',
    repeatRule: '' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | '',
    subject: '',
    faculty: '',
    marksWeightage: '0',
    attachments: '',
    notes: '',
    projectName: '',
    team: '',
    estimatedHours: '1',
    linkedCalendarEvent: true,
    location: '',
    guests: '',
    repeatFrequency: 'Daily',
    goal: '',
    streak: '0',
    endTime: '12:30 PM',
    scheduleInCalendar: false,
    preferredTime: 'anytime' as 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime',
    earliestStartDate: '',
    latestFinishTime: '',
    fixedTime: '',
    flexibleScheduling: true,
    breakAfterTask: false,
  });
  const [taskFormMode, setTaskFormMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [eventDraft, setEventDraft] = useState({
    title: '',
    date: formatDateKey(TODAY),
    start: '10:00 AM',
    end: '11:00 AM',
    priority: 'medium' as Priority,
  });
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<AiChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // XP Activity Feed
  const [xpHistory, setXpHistory] = useState<XpHistoryEntry[]>([]);
  // Weekly Analytics (derived from real task data)
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<WeeklyAnalytics | null>(null);

  // AI Preference Settings State
  const [aiPreferences, setAiPreferences] = useState<any>({
    geminiApiKey: '',
    sarvamApiKey: '',
    enableVoiceAssistant: true,
    enableAiScheduling: true,
    enableDailyAiBrief: true,
    enableSmartRecommendations: true,
    enableOptimizeDay: true,
    enableOptimizeWeek: true
  });

  // Temporary settings editing states
  const [settingsGeminiKey, setSettingsGeminiKey] = useState('');
  const [settingsSarvamKey, setSettingsSarvamKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'connected' | 'invalid' | 'failed' | 'unconfigured' | 'testing'>('unconfigured');
  const [sarvamStatus, setSarvamStatus] = useState<'connected' | 'invalid' | 'failed' | 'unconfigured' | 'testing'>('unconfigured');
  const [settingsToggles, setSettingsToggles] = useState({
    enableVoiceAssistant: true,
    enableAiScheduling: true,
    enableDailyAiBrief: true,
    enableSmartRecommendations: true,
    enableOptimizeDay: true,
    enableOptimizeWeek: true
  });

  // Close notification drawer on Escape
  useEffect(() => {
    if (!notificationsOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [notificationsOpen]);

  useEffect(() => {
    if (aiPreferences) {
      setSettingsGeminiKey(aiPreferences.geminiApiKey || '');
      setSettingsSarvamKey(aiPreferences.sarvamApiKey || '');
      setSettingsToggles({
        enableVoiceAssistant: aiPreferences.enableVoiceAssistant ?? true,
        enableAiScheduling: aiPreferences.enableAiScheduling ?? true,
        enableDailyAiBrief: aiPreferences.enableDailyAiBrief ?? true,
        enableSmartRecommendations: aiPreferences.enableSmartRecommendations ?? true,
        enableOptimizeDay: aiPreferences.enableOptimizeDay ?? true,
        enableOptimizeWeek: aiPreferences.enableOptimizeWeek ?? true
      });
      setGeminiStatus(aiPreferences.geminiApiKey ? 'connected' : 'unconfigured');
      setSarvamStatus(aiPreferences.sarvamApiKey ? 'connected' : 'unconfigured');
    }
  }, [aiPreferences]);

  // Calendar Premium Redesign States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // 1. Check & Ensure user profile on mount — use return value to unblock skeleton
  useEffect(() => {
    if (!user) return;
    ensureUserProfile(user)
      .then(async (profile) => {
        if (profile) {
          setUserProfile(profile);
          setDisplayName(profile.displayName || user.displayName || 'Momentum User');
          setUserAvatar(profile.avatar || 'Professional Male 1');
        }
        // Also fetch user_stats directly to unblock skeleton
        try {
          const statsSnap = await getDoc(doc(db, 'user_stats', user.uid));
          if (statsSnap.exists()) {
            setUserStats(statsSnap.data() as UserStats);
          }
        } catch (_) { /* onSnapshot will handle it */ }
      })
      .catch((err) => console.error('Error ensuring profile:', err));
  }, [user]);

  // 1e. Loading timeout fallback — never stay stuck on skeleton forever
  useEffect(() => {
    if (!user || weeklyAnalytics) return;
    const timer = setTimeout(() => {
      if (!userProfile) setUserProfile({
        uid: user.uid,
        displayName: user.displayName || 'Momentum User',
        email: user.email || '',
        avatar: 'Professional Male 1',
        bio: '',
        theme: 'dark',
        momentumScore: 0,
        createdAt: null,
        updatedAt: null,
        lastLogin: null,
        level: 1,
        xp: 0,
        bestStreak: 0,
        activeDays: 0,
        aiInteractions: 0,
        college: '',
        role: '',
        location: '',
      });
      if (!userStats) setUserStats({
        uid: user.uid,
        xp: 0,
        level: 1,
        currentStreak: 0,
        bestStreak: 0,
        tasksCompleted: 0,
        goalsCompleted: 0,
        habitsCompleted: 0,
        aiInteractions: 0,
        loginCount: 0,
      });
      setWeeklyAnalytics((prev) => prev ?? {
        dailyCompletionPcts: [0, 0, 0, 0, 0, 0, 0],
        dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        totalCompleted: 0,
        totalTasks: 0,
        completionRate: 0,
        overdueCount: 0,
        estimatedFocusHours: 0,
        deadlineRisk: 'Low' as const,
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [user, weeklyAnalytics, userProfile, userStats]);

  // 1b. Load AI chat history from Firestore on mount
  useEffect(() => {
    if (!user) return;
    dbGetAiHistory(user.uid).then((msgs) => {
      setChatHistory(msgs);
    }).catch((err) => console.error('Error loading AI history:', err));
  }, [user]);

  // 1c. Load XP activity feed
  useEffect(() => {
    if (!user) return;
    dbGetXpHistory(user.uid).then((entries) => {
      setXpHistory(entries);
    }).catch((err) => console.error('Error loading XP history:', err));
  }, [user]);

  // 1d. Load weekly analytics (refreshes when tasks state changes)
  useEffect(() => {
    if (!user) return;
    dbGetWeeklyAnalytics(user.uid).then((analytics) => {
      setWeeklyAnalytics(analytics);
    }).catch((err) => console.error('Error loading weekly analytics:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tasks.length]);

  // 2. User Profile Document Real-time Listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setUserProfile(data);
        setDisplayName(data.displayName || user.displayName || 'Momentum User');
        setBio(data.bio || '');
        setUserAvatar(data.avatar || 'Professional Male 1');
        setCollege(data.college || 'Momentum Academy');
        setRole(data.role || 'AI Explorer');
        setLocation(data.location || 'San Francisco, CA');
        
        // Sync local theme preference if changed remotely
        if (data.theme) {
          setTheme(data.theme);
          localStorage.setItem('theme', data.theme);
          if (data.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Sync event draft date when modal opens
  useEffect(() => {
    if (activeModal === 'event') {
      setEventDraft((current) => ({
        ...current,
        date: formatDateKey(selectedDate),
      }));
    }
  }, [activeModal, selectedDate]);

  // 2b. User Stats Real-time Listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'user_stats', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserStats(docSnap.data() as UserStats);
      }
    });
    return () => unsub();
  }, [user]);

  // 2c. User Badges Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'user_badges'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: UserBadge[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserBadge);
      });
      setUserBadges(list);
    });
    return () => unsub();
  }, [user]);

  // 2d. User Integrations Real-time Listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'user_integrations', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserIntegration(docSnap.data() as UserIntegration);
      }
    });
    return () => unsub();
  }, [user]);

  // AI Preferences Real-time Listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'user_preferences', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setAiPreferences(docSnap.data());
      } else {
        dbGetUserPreferences(user.uid).then(setAiPreferences).catch(console.error);
      }
    });
    return () => unsub();
  }, [user]);

  // AI Daily Brief Loader
  const loadDailyBrief = useCallback(async () => {
    if (!user) return;
    setBriefLoading(true);
    try {
      const apiKey = aiPreferences?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        setBriefLoading(false);
        return;
      }
      
      const brief = await aiService.generateDailyBrief({
        tasks: tasks,
        events: events,
        goals: dashboardGoals,
        habits: dashboardHabits,
        userName: userProfile?.displayName || 'Parth'
      }, apiKey);
      
      setDailyBriefData(brief);

      const advice = await aiService.generateSmartAdvice({
        tasks: tasks,
        events: events
      }, apiKey);
      setSmartAdvice(advice);
    } catch (err) {
      console.error('Failed to load daily brief:', err);
    } finally {
      setBriefLoading(false);
    }
  }, [user, tasks, events, dashboardGoals, dashboardHabits, userProfile, aiPreferences]);

  useEffect(() => {
    if (user && tasks.length > 0 && !briefLoadedRef.current) {
      briefLoadedRef.current = true;
      loadDailyBrief();
    }
  }, [user, tasks, loadDailyBrief]);

  // 2e. Notes Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notes'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Note[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          body: data.body,
          accent: data.accent,
          updatedAt: data.updatedAt
        });
      });
      setNotes(list);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(8)
    );
    const unsub = onSnapshot(notificationsQuery, (snapshot) => {
      const list: NotificationItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'Notification',
          message: data.message || '',
          createdAt: data.createdAt || null,
          read: data.read || false,
        };
      });
      setHeaderNotifications(list);
    });
    return () => unsub();
  }, [user]);

  // Level Up Toast Listener
  useEffect(() => {
    if (userStats?.level) {
      if (lastLevel !== null && userStats.level > lastLevel) {
        setLevelUpToast({
          isOpen: true,
          oldLevel: lastLevel,
          newLevel: userStats.level
        });
        setTimeout(() => {
          setLevelUpToast(null);
        }, 6000);
      }
      setLastLevel(userStats.level);
    }
  }, [userStats?.level]);

  useEffect(() => {
    if (celebratingBadge?.claimed) {
      setCelebratingBadge(null);
      return;
    }

    const nextBadge = [...userBadges]
      .filter((badge) => badge.isUnlocked && !badge.claimed)
      .sort((left, right) => {
        const leftTime = left.earnedAt?.toDate ? left.earnedAt.toDate().getTime() : 0;
        const rightTime = right.earnedAt?.toDate ? right.earnedAt.toDate().getTime() : 0;
        return rightTime - leftTime;
      })[0];

    if (!celebratingBadge && nextBadge) {
      setCelebratingBadge(nextBadge);
    }

    if (celebratingBadge && !userBadges.some((badge) => badge.badgeId === celebratingBadge.badgeId && !badge.claimed)) {
      setCelebratingBadge(null);
    }
  }, [userBadges, celebratingBadge]);

  // Sync edit forms fields when userProfile is loaded or updated
  useEffect(() => {
    if (userProfile) {
      setTempDisplayName(userProfile.displayName || '');
      setTempBio(userProfile.bio || '');
      setAvatarPreview(userProfile.avatar || 'Professional Male 1');
      setTempCollege(userProfile.college || 'Momentum Academy');
      setTempRole(userProfile.role || 'AI Explorer');
      setTempLocation(userProfile.location || 'San Francisco, CA');
    }
  }, [userProfile?.displayName, userProfile?.bio, userProfile?.avatar, userProfile?.college, userProfile?.role, userProfile?.location]);
  // 3. Tasks Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const loadedTasks: Task[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const dueDateVal = data.dueDate;
        let dueDateStr = 'No due date';
        let dateObj: Date | undefined = undefined;
        if (dueDateVal) {
          const parsedDate = dueDateVal.toDate ? dueDateVal.toDate() : new Date(dueDateVal);
          dateObj = parsedDate;
          dueDateStr = formatUIDateString(parsedDate);
        }
        const category = normalizeCategory(data.category, data.customCategory);
        const computedStatus: TaskStatus = data.status || (data.completed ? 'completed' : (dateObj && dateObj.getTime() < new Date().getTime() ? 'overdue' : 'not_started'));
        loadedTasks.push({
          id: docSnap.id,
          title: data.title || 'Untitled Task',
          description: data.description || '',
          category,
          status: computedStatus,
          dueDate: dueDateStr,
          dueDateRaw: dateObj,
          dueTime: data.dueTime || (dateObj ? formatTimeLabel(dateObj) : ''),
          durationMinutes: data.durationMinutes ?? 30,
          progress: data.progress ?? (data.completed ? 100 : 0),
          priority: (data.priority || 'medium') as Priority,
          completed: Boolean(data.completed),
          tags: data.tags || [],
          reminder: Boolean(data.reminder),
          reminderMinutesBefore: data.reminderMinutesBefore ?? 30,
          repeatRule: data.repeatRule || '',
          linkedCalendarEventId: data.linkedCalendarEventId || null,
          subject: data.subject || '',
          faculty: data.faculty || '',
          marksWeightage: data.marksWeightage ?? 0,
          attachments: data.attachments || [],
          notes: data.notes || '',
          projectName: data.projectName || '',
          team: data.team || '',
          estimatedHours: data.estimatedHours ?? 0,
          customCategory: data.customCategory || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          completedAt: data.completedAt,
        });
      });
      setTasks(loadedTasks);
    });
    return () => unsub();
  }, [user]);

  // 4. Events Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'calendar_events'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const loadedEvents: CalendarEvent[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const start = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
        const end = data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime);
        
        const accentMap: Record<Priority, CalendarEvent['accent']> = {
          critical: 'rose',
          high: 'amber',
          medium: 'sky',
          low: 'emerald',
        };

        loadedEvents.push({
          id: docSnap.id,
          title: data.title,
          date: formatDateKey(start),
          start: formatTimeLabel(start),
          end: formatTimeLabel(end),
          priority: (data.priority || 'medium') as Priority,
          accent: accentMap[(data.priority || 'medium') as Priority] || 'sky',
          deadline: data.priority === 'critical',
          description: data.description || '',
          faculty: data.faculty || '',
          location: data.location || '',
          category: data.category || '',
          attachments: data.attachments || [],
          completed: data.completed || false,
          notes: data.notes || '',
          checklist: data.checklist || [],
          linkedAssignment: data.linkedAssignment || '',
          googleCalendarLink: data.googleCalendarLink || '',
          // Goal/Habit fields
          sourceType: data.sourceType || 'manual',
          sourceId: data.sourceId || data.goalId || data.habitId || '',
          isGoalEvent: data.isGoalEvent || false,
          goalId: data.goalId || '',
          goalSchedulingType: data.goalSchedulingType || 'ai',
          sessionIndex: data.sessionIndex,
          missedAt: data.missedAt || '',
          rescheduledFrom: data.rescheduledFrom || '',
          isHabitEvent: data.isHabitEvent || false,
          habitId: data.habitId || '',
          isAiScheduled: data.isAiScheduled || false,
          aiReason: data.aiReason || '',
          flexibleScheduling: data.flexibleScheduling ?? true,
          breakAfterTask: data.breakAfterTask || false,
          isLocked: data.isLocked || data.flexibleScheduling === false,
        });
      });
      setEvents(loadedEvents);
    });
    return () => unsub();
  }, [user]);

  // Auto-reschedule overdue/past incomplete AI-scheduled events
  const hasRescheduledRef = useRef(false);
  useEffect(() => {
    if (!user || events.length === 0 || hasRescheduledRef.current) return;
    
    const runAutoReschedule = async () => {
      hasRescheduledRef.current = true;
      const missedUpdates = autoReschedulePastTasks(events);
      if (missedUpdates.length > 0) {
        for (let update of missedUpdates) {
          try {
            const ev = events.find(e => e.id === update.eventId);
            if (!ev) continue;
            
            const task = tasks.find(t => t.linkedCalendarEventId === update.eventId);
            const startMins = timeToMinutes(update.start);
            const endMins = timeToMinutes(update.end);
            
            const [y, m, d] = update.date.split('-').map(Number);
            const schedStart = new Date(y, m - 1, d);
            schedStart.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
            
            const schedEnd = new Date(y, m - 1, d);
            schedEnd.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);

            await dbUpdateEvent(update.eventId, {
              startTime: schedStart,
              endTime: schedEnd,
              aiReason: `🤖 Auto-rescheduled: ${update.reason}`
            });

            if (task) {
              await dbUpdateTask(task.id, {
                dueDate: schedStart,
                dueTime: update.start,
                rescheduleCount: (task.rescheduleCount || 0) + 1,
                aiReason: `🤖 Auto-rescheduled: ${update.reason}`
              });
            }

            showToast(`Moved missed task '${ev.title}' to ${update.date} @ ${update.start}.`, 'success');
          } catch (e) {
            console.error('Error in auto rescheduling:', e);
          }
        }
      }
    };
    
    if (tasks.length > 0) {
      runAutoReschedule();
    }
  }, [user, events, tasks]);

  // Active Goals Count Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: DbGoal[] = [];
      let activeCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const goalObj = {
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          progress: data.progress || 0,
          target: data.target || 1,
          status: data.status || 'active',
          createdAt: data.createdAt
        };
        list.push(goalObj);
        if (goalObj.status === 'active') {
          activeCount++;
        }
      });
      list.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tA - tB;
      });
      setDashboardGoals(list);
      setActiveGoalsCount(activeCount);
    });
    return () => unsub();
  }, [user]);

  // Habits Count Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Habit[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          completedToday: data.completedToday || false,
          lastCompletedDate: data.lastCompletedDate || null,
          createdAt: data.createdAt
        });
      });
      list.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tA - tB;
      });
      setDashboardHabits(list);
      setHabitsCount(list.length);
    });
    return () => unsub();
  }, [user]);

  const greetingName = displayName.split('  ')[0] || displayName.split(' ')[0] || 'Parth';
  const showHeaderActions = activeSection !== 'Profile';
  const emailLabel = user?.email || 'parthbulbule123@gmail.com';
  const weekDays = getWeekDays(selectedDate);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const eventsToday = events.filter((event) => event.date === formatDateKey(TODAY)).length;
  const overdueTasks = tasks.filter((task) => !task.completed && task.priority === 'critical').length;

  const overdueTasksCount = tasks.filter((task) => {
    if (task.completed) return false;
    if (!task.dueDateRaw) return false;
    return task.dueDateRaw.getTime() < TODAY.getTime();
  }).length;

  const tasksDueWithin24h = tasks.filter((task) => {
    if (task.completed) return false;
    if (!task.dueDateRaw) return false;
    const diffTime = task.dueDateRaw.getTime() - TODAY.getTime();
    return diffTime >= 0 && diffTime <= 24 * 60 * 60 * 1000;
  }).length;

  const getDailyQuote = () => {
    const dayIndex = new Date().getDate() % ROTATING_QUOTES.length;
    return ROTATING_QUOTES[dayIndex];
  };

  const formatNotificationTime = (createdAt?: NotificationItem['createdAt']) => {
    if (!createdAt) return 'Just now';
    let date: Date;
    if (createdAt instanceof Date) {
      date = createdAt;
    } else if (createdAt && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else {
      date = new Date(createdAt as any);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const scrollToProfileSection = (
    section: 'profile' | 'achievements' | 'apps' | 'preferences',
    badgeId?: string
  ) => {
    const sectionMap = {
      profile: profileTopRef,
      achievements: achievementsRef,
      apps: connectedAppsRef,
      preferences: preferencesRef,
    } as const;

    setActiveSection('Profile');
    if (badgeId || section === 'achievements') {
      setBadgeVaultOpen(true);
    }

    window.setTimeout(() => {
      sectionMap[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (badgeId) {
        document.getElementById(`badge-${badgeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedBadgeId(badgeId);
        window.setTimeout(() => setHighlightedBadgeId((current) => (current === badgeId ? null : current)), 3500);
      }
    }, 120);
  };


  const handleClaimCelebration = async (viewProfile: boolean) => {
    if (!user || !celebratingBadge) return;

    await claimBadgeReward(
      user.uid,
      celebratingBadge.badgeId,
      celebratingBadge.xpReward ?? 0
    );

    const claimedBadgeId = celebratingBadge.badgeId;
    setCelebratingBadge(null);

    if (viewProfile) {
      scrollToProfileSection('achievements', claimedBadgeId);
    }
  };

  const getGreeting = (name: string) => {
    const date = new Date().getDate();
    const funnyHeadlines = [
      `😂 Your assignments have started a fan club waiting for you, ${name}.`,
      `☕ Coffee isn't counted as productivity, ${name}.`,
      `💀 You have opened Momentum AI, ${name}. That's already better than procrastinating.`,
      `🚀 Future ${name} sends regards. Make them proud!`,
      `😴 Your calendar says "Please take a break," ${name}.`,
      `📚 Finish one assignment before opening YouTube, ${name}!`,
      `🎯 Tiny wins become huge streaks, ${name}.`
    ];
    return funnyHeadlines[date % funnyHeadlines.length];
  };

  const getHeaderContent = () => {
    if (activeSection === 'Dashboard' || activeSection === 'Calendar') {
      // Check for Empty Workspace State
      const isWorkspaceEmpty = tasks.length === 0 && activeGoalsCount === 0 && habitsCount === 0;
      if (isWorkspaceEmpty) {
        return {
          line1: "Welcome to Momentum AI 🚀",
          line2: "Start by creating your first goal, task, or habit to begin building momentum."
        };
      }

      // Time-based greeting
      const line1 = getGreeting(greetingName);

      // Task-aware motivational engine
      let line2 = smartAdvice || "";
      if (!line2) {
        if (overdueTasksCount > 0) {
          line2 = "⚠️ Let's clear those overdue tasks today. Every completed task reduces future stress.";
        } else if (tasksDueWithin24h > 0) {
          line2 = "🔥 Deadline approaching. Focus on what matters most first.";
        } else if (eventsToday > 0) {
          line2 = `📅 ${eventsToday} event${eventsToday === 1 ? '' : 's'} scheduled today. Stay prepared and stay ahead.`;
        } else if (activeGoalsCount > 0) {
          line2 = `🎯 You are currently working toward ${activeGoalsCount} active goal${activeGoalsCount === 1 ? '' : 's'}. Keep moving forward.`;
        } else if (userStats?.currentStreak && userStats.currentStreak >= 1) {
          line2 = `🔥 ${userStats.currentStreak}-Day Streak. Consistency is becoming your superpower.`;
        } else if (tasks.length > 0 && tasks.filter(t => !t.completed).length === 0) {
          line2 = "🎉 You're all caught up. Enjoy the momentum you've created.";
        } else {
          line2 = getDailyQuote();
        }
      }

      return { line1, line2 };
    } else {
      // Non-dashboard pages: show normal title and description from NAVIGATOR_COPY
      const copy = NAVIGATOR_COPY[activeSection] || { title: activeSection, description: "" };
      return {
        line1: copy.title,
        line2: copy.description
      };
    }
  };

  const { line1: headerLine1, line2: headerLine2 } = getHeaderContent();
  const completionPercentage = Math.round((completedTasks / tasks.length) * 100) || 0;
  const sortedTasks = [...tasks].sort((left, right) => {
    const order: Priority[] = ['critical', 'high', 'medium', 'low'];
    return order.indexOf(left.priority) - order.indexOf(right.priority);
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Unable to sign out', error);
    }
    onNavigateHome();
  };

  const shiftCalendar = (direction: -1 | 1) => {
    if (calendarView === 'day') {
      setSelectedDate((currentDate) => addDays(currentDate, direction));
      return;
    }

    if (calendarView === 'week') {
      setSelectedDate((currentDate) => addDays(currentDate, direction * 7));
      return;
    }

    setSelectedDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const resetTaskDraft = (category = 'Assignments') => {
    setTaskDraft({
      title: '',
      description: '',
      category,
      customCategory: '',
      priority: 'medium',
      status: 'not_started',
      dueDate: 'Tomorrow, 12 PM',
      dueTime: '12:00 PM',
      durationMinutes: '30',
      progress: '0',
      tags: '',
      reminder: true,
      reminderMinutesBefore: '30',
      repeatRule: '',
      subject: '',
      faculty: '',
      marksWeightage: '0',
      attachments: '',
      notes: '',
      projectName: '',
      team: '',
      estimatedHours: '1',
      linkedCalendarEvent: true,
      location: '',
      guests: '',
      repeatFrequency: 'Daily',
      goal: '',
      streak: '0',
      endTime: '12:30 PM',
      scheduleInCalendar: false,
      preferredTime: 'anytime',
      earliestStartDate: '',
      latestFinishTime: '',
      fixedTime: '',
      flexibleScheduling: true,
      breakAfterTask: false,
    });
    setTaskFormMode('create');
    setEditingTaskId(null);
  };

  const openTaskEditor = (task: Task) => {
    const category = task.customCategory || task.category || 'Other';
    setTaskFormMode('edit');
    setEditingTaskId(task.id);
    setTaskDraft({
      title: task.title || '',
      description: task.description || '',
      category,
      customCategory: task.customCategory || '',
      priority: task.priority,
      status: task.status || (task.completed ? 'completed' : 'not_started'),
      dueDate: task.dueDate || 'Tomorrow, 12 PM',
      dueTime: task.dueTime || '12:00 PM',
      durationMinutes: String(task.durationMinutes ?? 30),
      progress: String(task.progress ?? 0),
      tags: (task.tags || []).join(', '),
      reminder: task.reminder,
      reminderMinutesBefore: String(task.reminderMinutesBefore ?? 30),
      repeatRule: task.repeatRule || '',
      subject: task.subject || '',
      faculty: task.faculty || '',
      marksWeightage: String(task.marksWeightage ?? 0),
      attachments: (task.attachments || []).join(', '),
      notes: task.notes || '',
      projectName: task.projectName || '',
      team: task.team || '',
      estimatedHours: String(task.estimatedHours ?? 1),
      linkedCalendarEvent: Boolean(task.linkedCalendarEventId),
      location: task.location || '',
      guests: (task.guests || []).join(', '),
      repeatFrequency: task.repeatFrequency || 'Daily',
      goal: task.goal || '',
      streak: String(task.streak || 0),
      endTime: task.endTime || '12:30 PM',
      scheduleInCalendar: task.scheduleInCalendar || false,
      preferredTime: task.preferredTime || 'anytime',
      earliestStartDate: task.earliestStartDate || '',
      latestFinishTime: task.latestFinishTime || '',
      fixedTime: task.fixedTime || '',
      flexibleScheduling: task.flexibleScheduling ?? true,
      breakAfterTask: task.breakAfterTask || false,
    });
    setActiveModal('task');
  };

  const handleAddTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskDraft.title.trim() || !user) {
      return;
    }

    const dateString = taskDraft.dueDate.trim();
    const timeString = taskDraft.dueTime.trim() || '12:00 PM';
    const parsedDate = parseUIDateString(dateString + ', ' + timeString);
    const taskCategory = normalizeCategory(taskDraft.category, taskDraft.customCategory);

    // AI Auto Scheduler computation
    let targetDate = parsedDate;
    let targetEndTime = new Date(parsedDate.getTime() + (Number(taskDraft.durationMinutes) || 30) * 60000);
    let aiReason = '';
    let isAiScheduled = false;

    if (taskDraft.scheduleInCalendar) {
      const durMins = Number(taskDraft.durationMinutes) || 30;
      const schedulerTask = {
        title: taskDraft.title.trim(),
        priority: taskDraft.priority,
        durationMinutes: durMins,
        dueDate: formatDateKey(parsedDate),
        dueTime: timeString,
        preferredTime: taskDraft.preferredTime || 'anytime',
        earliestStartDate: taskDraft.earliestStartDate || formatDateKey(new Date()),
        latestFinishTime: taskDraft.latestFinishTime || '11:00 PM',
        fixedTime: taskDraft.fixedTime || undefined,
        flexibleScheduling: taskDraft.flexibleScheduling ?? true,
        breakAfterTask: taskDraft.breakAfterTask || false,
        category: taskCategory,
      };

      const slot = autoScheduleTask(schedulerTask, events, editingTaskId || undefined);
      
      const dateParts = slot.date.split('-').map(Number);
      const startMinutes = timeToMinutes(slot.start);
      const endMinutes = timeToMinutes(slot.end);
      
      const schedStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      schedStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      
      const schedEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      schedEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      targetDate = schedStart;
      targetEndTime = schedEnd;
      aiReason = slot.aiReason;
      isAiScheduled = true;
    }

    const payload = {
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim(),
      category: taskCategory,
      priority: taskDraft.priority,
      status: taskDraft.status,
      completed: taskDraft.status === 'completed',
      dueDate: parsedDate,
      dueTime: timeString,
      durationMinutes: Number(taskDraft.durationMinutes) || 30,
      progress: Math.min(100, Math.max(0, Number(taskDraft.progress) || 0)),
      tags: parseTags(taskDraft.tags),
      reminder: taskDraft.reminder,
      reminderMinutesBefore: Number(taskDraft.reminderMinutesBefore) || 30,
      repeatRule: taskDraft.repeatRule as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | '',
      subject: taskDraft.subject.trim(),
      faculty: taskDraft.faculty.trim(),
      marksWeightage: Number(taskDraft.marksWeightage) || 0,
      attachments: parseTags(taskDraft.attachments),
      notes: taskDraft.notes.trim(),
      projectName: taskDraft.projectName.trim(),
      team: taskDraft.team.trim(),
      estimatedHours: Number(taskDraft.estimatedHours) || 1,
      customCategory: taskCategory,
      linkedCalendarEvent: taskDraft.linkedCalendarEvent || taskDraft.scheduleInCalendar,
      location: taskDraft.location?.trim() || '',
      guests: taskDraft.guests ? parseTags(taskDraft.guests) : [],
      repeatFrequency: taskDraft.repeatFrequency || '',
      goal: taskDraft.goal?.trim() || '',
      streak: Number(taskDraft.streak) || 0,
      endTime: taskDraft.endTime || '',
      scheduleInCalendar: taskDraft.scheduleInCalendar || false,
      preferredTime: taskDraft.preferredTime || 'anytime',
      earliestStartDate: taskDraft.earliestStartDate || '',
      latestFinishTime: taskDraft.latestFinishTime || '',
      fixedTime: taskDraft.fixedTime || '',
      flexibleScheduling: taskDraft.flexibleScheduling ?? true,
      breakAfterTask: taskDraft.breakAfterTask || false,
      isAiScheduled: isAiScheduled,
      aiReason: aiReason,
    };

    try {
      if (taskFormMode === 'edit' && editingTaskId) {
        await dbUpdateTask(editingTaskId, {
          ...payload,
          completed: payload.completed,
        });

        const existingLinkedEventId = tasks.find((item) => item.id === editingTaskId)?.linkedCalendarEventId;
        if (payload.linkedCalendarEvent) {
          if (existingLinkedEventId) {
            await dbUpdateEvent(existingLinkedEventId, {
              title: payload.title,
              startTime: targetDate,
              endTime: targetEndTime,
              priority: payload.priority,
              description: payload.description,
              category: taskCategory,
              completed: payload.completed,
              isAiScheduled: payload.isAiScheduled,
              aiReason: payload.aiReason,
              flexibleScheduling: payload.flexibleScheduling,
              breakAfterTask: payload.breakAfterTask,
            });
          } else {
            const eventId = await dbAddEvent(user.uid, {
              title: payload.title,
              startTime: targetDate,
              endTime: targetEndTime,
              source: 'manual',
              priority: payload.priority,
              description: payload.description,
              category: taskCategory,
              completed: payload.completed,
              isAiScheduled: payload.isAiScheduled,
              aiReason: payload.aiReason,
              flexibleScheduling: payload.flexibleScheduling,
              breakAfterTask: payload.breakAfterTask,
            });
            await dbUpdateTask(editingTaskId, { linkedCalendarEventId: eventId });
          }
        }
      } else {
        const taskId = await dbAddTask(user.uid, payload);
        if (payload.linkedCalendarEvent) {
          const eventId = await dbAddEvent(user.uid, {
            title: payload.title,
            startTime: targetDate,
            endTime: targetEndTime,
            source: 'manual',
            priority: payload.priority,
            description: payload.description,
            category: taskCategory,
            completed: payload.completed,
            isAiScheduled: payload.isAiScheduled,
            aiReason: payload.aiReason,
            flexibleScheduling: payload.flexibleScheduling,
            breakAfterTask: payload.breakAfterTask,
          });
          await dbUpdateTask(taskId, { linkedCalendarEventId: eventId });
        }
      }
      showToast(taskFormMode === 'edit' ? 'Task updated' : 'Task added', 'success');
    } catch (err) {
      console.error('Error saving task:', err);
      showToast('Failed to save task', 'error');
    }

    resetTaskDraft();
    setActiveModal(null);
  };
  const handleAddEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventDraft.title.trim() || !user || !eventDraft.date) {
      return;
    }

    const [year, month, day] = eventDraft.date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const startTime = parseTimeStr(targetDate, eventDraft.start);
    const endTime = parseTimeStr(targetDate, eventDraft.end);

    dbAddEvent(user.uid, {
      title: eventDraft.title.trim(),
      startTime,
      endTime,
      source: 'manual',
      priority: eventDraft.priority,
    }).catch((err) => console.error('Error adding event:', err));

    setEventDraft({
      title: '',
      date: formatDateKey(selectedDate),
      start: '10:00 AM',
      end: '11:00 AM',
      priority: 'medium',
    });
    setActiveModal(null);
  };
  const handleTaskCreate = (category?: string) => {
    resetTaskDraft(category || 'Assignments');
    setActiveModal('task');
  };

  const handleTaskUpdate = async (taskId: string, data: Partial<Task>) => {
    await dbUpdateTask(taskId, data);
  };

  const handleTaskDelete = async (taskId: string) => {
    await dbDeleteTask(taskId);
  };

  const handleTaskDuplicate = async (taskId: string) => {
    if (!user) return;
    const source = tasks.find((task) => task.id === taskId);
    if (!source) return;

    const duplicateDate = source.dueDateRaw || new Date();
    const duplicateId = await dbAddTask(user.uid, {
      title: source.title + ' Copy',
      description: source.description,
      category: source.customCategory || source.category,
      priority: source.priority,
      status: source.status,
      completed: false,
      dueDate: duplicateDate,
      dueTime: source.dueTime,
      durationMinutes: source.durationMinutes,
      progress: 0,
      tags: source.tags,
      reminder: source.reminder,
      reminderMinutesBefore: source.reminderMinutesBefore,
      repeatRule: source.repeatRule as any,
      subject: source.subject,
      faculty: source.faculty,
      marksWeightage: source.marksWeightage,
      attachments: source.attachments,
      notes: source.notes,
      projectName: source.projectName,
      team: source.team,
      estimatedHours: source.estimatedHours,
      customCategory: source.customCategory,
      location: source.location || '',
      guests: source.guests || [],
      repeatFrequency: source.repeatFrequency || '',
      goal: source.goal || '',
      streak: source.streak || 0,
      endTime: source.endTime || '',
    });

    if (source.linkedCalendarEventId) {
      await dbUpdateTask(duplicateId, { linkedCalendarEventId: source.linkedCalendarEventId });
    }
  };



  const askAiAssistant = async (queryText: string) => {
    if (!queryText.trim() || chatLoading) return;

    const userQuestion = queryText.trim();
    const uid = user?.uid;

    // Optimistically append user message to local state
    const userMsg: AiChatMessage = { uid: uid || '', sender: 'user', text: userQuestion, timestamp: new Date() };
    setChatHistory((h) => [...h, userMsg]);
    setChatLoading(true);

    if (uid) {
      // Persist user message & log AI coach usage
      dbSaveAiMessage(uid, 'user', userQuestion).catch((e) => console.error(e));
      dbLogAiCoachUsage(uid).catch((e) => console.error('Error logging AI Coach usage:', e));
    }

    let response = '';
    try {
      const apiKey = aiPreferences?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
      response = await aiService.generateChatResponse(
        userQuestion,
        chatHistory,
        {
          tasks,
          events,
          goals: dashboardGoals,
          habits: dashboardHabits,
          activeSection,
          userProfile
        },
        apiKey
      );
    } catch (err) {
      console.error('Error generating AI response:', err);
      response = "Sorry, I couldn't process that. Please check your Gemini API key configuration and try again.";
    }

    const aiMsg: AiChatMessage = { uid: uid || '', sender: 'ai', text: response, timestamp: new Date() };
    setChatHistory((h) => [...h, aiMsg]);
    setChatLoading(false);

    if (uid) {
      // Persist AI response & refresh XP history feed
      dbSaveAiMessage(uid, 'ai', response).catch((e) => console.error(e));
      dbGetXpHistory(uid).then(setXpHistory).catch(() => {});
    }
  };

  const handleAskAi = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatQuery.trim() || chatLoading) return;
    const query = chatQuery;
    setChatQuery('');
    await askAiAssistant(query);
  };



  const handleOptimizeSchedule = async () => {
    const today = todayKey();
    const dayKey = fmtDkScheduler(TODAY); // TODAY must be today's Date object

    // Never optimize a past day
    if (dayKey < today) {
      showToast("Can't optimize a past day. ⏰", 'error');
      return;
    }

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

        if (overloaded && overloadSuggestion) {
          showToast(`⚠️ AI Coach: ${overloadSuggestion}`, 'error');
        } else if (changedCount > 0) {
          showToast(`✨ AI Day Optimization completed! ${changedCount} tasks rearranged.`, 'success');
        } else {
          showToast("AI Coach: Today's schedule is already optimal. ✨", 'success');
        }
      } catch (err) {
        console.error('AI Day Optimization failed, falling back to local:', err);
        showToast("AI Optimization failed. Running local optimization...", 'error');
        await runLocalOptimization(dayKey);
      }
    } else {
      await runLocalOptimization(dayKey);
    }
  };

  const runLocalOptimization = async (dayKey: string) => {
    try {
      const { optimizedEvents, stats } = optimizeDaySchedule(dayKey, events as any[]);

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
      if (changedCount > 0) {
        showToast(`✨ ${stats.moved} task${stats.moved !== 1 ? 's' : ''} optimized · ${stats.conflictsResolved} conflicts resolved`, 'success');
      } else {
        showToast("Today's schedule is already optimal. No changes needed. ✨", 'success');
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to optimize today's schedule", 'error');
    }
  };

  const renderTasksWorkspace = () => (
    <TaskWorkspace
      tasks={tasks}
      events={events}
      onCreateTask={handleTaskCreate}
      onEditTask={openTaskEditor}
      onUpdateTask={handleTaskUpdate}
      onDeleteTask={handleTaskDelete}
      onToggleTaskCompleted={dbToggleTaskCompleted}
      onDuplicateTask={handleTaskDuplicate}
      showToast={showToast}
      onNavigate={(sec) => setActiveSection(sec as any)}
      onOptimizeSchedule={handleOptimizeSchedule}
    />
  );

  const renderNotesWorkspace = () => {
    const getNoteAccentClass = (accent: string) => {
      if (accent.includes('#F3EEFF') || accent.includes('lavender')) return 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA] border-[#DDD2FF] dark:border-[#312E81]';
      if (accent.includes('#EEF6FF') || accent.includes('sky')) return 'bg-[#EEF6FF] dark:bg-[#142035] text-[#2563EB] dark:text-[#60A5FA] border-[#C7DEF9] dark:border-[#223E6B]';
      return 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399] border-[#B7E8CF] dark:border-[#154E38]';
    };

    const formatNoteTime = (timestamp: any) => {
      if (!timestamp) return 'Just now';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleCreateNoteSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!newNoteTitle.trim() || !newNoteBody.trim() || !user) return;
      try {
        await dbAddNote(user.uid, newNoteTitle.trim(), newNoteBody.trim(), newNoteAccent);
        setNewNoteTitle('');
        setNewNoteBody('');
        setIsCreatingNote(false);
      } catch (err) {
        console.error('Error creating note:', err);
      }
    };

    return (
      <div className="app-surface p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-white/8 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A1A1AA]">My Workspace Notes</h3>
          <button
            onClick={() => setIsCreatingNote(!isCreatingNote)}
            className="app-button-primary py-1.5 px-3 text-xs font-semibold"
          >
            {isCreatingNote ? 'Cancel' : 'Create Note'}
          </button>
        </div>

        {isCreatingNote && (
          <form onSubmit={handleCreateNoteSubmit} className="p-4 rounded-2xl border border-gray-200 dark:border-white/5 bg-[#FBFCFF] dark:bg-[#1D1F2D] space-y-4 max-w-xl animate-[fade-up_0.2s_ease-out]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Title</span>
                <input
                  className="app-input py-1.5 px-3 text-xs"
                  placeholder="Note Title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Color Card Theme</span>
                <select
                  className="app-input py-1.5 px-3 text-xs cursor-pointer"
                  value={newNoteAccent}
                  onChange={(e) => setNewNoteAccent(e.target.value)}
                >
                  <option value="#F3EEFF">Lavender Accent</option>
                  <option value="#EEF6FF">Sky Blue Accent</option>
                  <option value="#ECFDF5">Emerald Green Accent</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Content</span>
              <textarea
                className="app-input resize-none h-24 text-xs py-2 px-3"
                placeholder="Write your note description here..."
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="app-button-primary py-1.5 px-3 text-xs font-semibold"
              >
                Save Note
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {notes.length === 0 ? (
            <div className="col-span-full rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-8 text-center text-xs text-[#9CA3AF] dark:text-[#4B5563]">
              No notes created yet. Click 'Create Note' to begin capture!
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-[20px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 flex flex-col justify-between min-h-[160px] relative group hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${getNoteAccentClass(note.accent)}`}>Note</span>
                    <span className="text-[10px] font-medium text-[#9CA3AF] dark:text-[#6B7280]">{formatNoteTime(note.updatedAt)}</span>
                  </div>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-[#111827] dark:text-white leading-tight">{note.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-[#6B7280] dark:text-[#A1A1AA] whitespace-pre-wrap">{note.body}</p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-gray-150/40 dark:border-white/5 flex justify-end">
                  <button
                    onClick={() => note.id && dbDeleteNote(note.id)}
                    className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAnalyticsWorkspace = () => {
    const a = weeklyAnalytics;
    const focusHours = a ? `${a.estimatedFocusHours}h` : '—';
    const completionRateStr = a ? `${a.completionRate}%` : `${completionPercentage}%`;
    const riskValue = a?.deadlineRisk ?? 'Low';
    const riskAccent =
      riskValue === 'High'
        ? 'bg-[#FEF2F2] dark:bg-[#300E0E] text-[#DC2626] dark:text-[#F87171]'
        : riskValue === 'Medium'
        ? 'bg-[#FFF7ED] dark:bg-[#2A1F15] text-[#EA580C] dark:text-[#F59E0B]'
        : 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399]';
    const overdueLabel = a ? (a.overdueCount > 0 ? `-${a.overdueCount} overdue` : 'On track') : '—';

    const analyticsCards = [
      {
        label: 'Est. Focus Time',
        value: focusHours,
        change: `${a?.totalCompleted ?? 0} tasks done`,
        accent: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399]',
      },
      {
        label: 'Task Completion',
        value: completionRateStr,
        change: `${a?.totalCompleted ?? completedTasks}/${a?.totalTasks ?? tasks.length} tasks`,
        accent: 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA]',
      },
      {
        label: 'Deadline Risk',
        value: riskValue,
        change: overdueLabel,
        accent: riskAccent,
      },
    ];

    const chartBars = a ? a.dailyCompletionPcts : [0, 0, 0, 0, 0, 0, 0];
    const chartLabels = a ? a.dayLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Ensure minimum bar height of 4% for visual appearance when value is 0
    const normalizedBars = chartBars.map(v => (v === 0 ? 4 : v));

    return (
      <div className="app-surface p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          {analyticsCards.map((card) => (
            <div key={card.label} className="rounded-[18px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${card.accent}`}>{card.change}</span>
              <p className="mt-4 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">{card.label}</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#111827] dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[20px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280] dark:text-[#A1A1AA]">Weekly task completion</h3>
            <span className="text-xs font-medium text-[#6D7280] dark:text-[#A1A1AA]">Last 7 days</span>
          </div>
          {!a ? (
            <div className="flex items-end gap-3 pt-2 animate-pulse">
              {[40, 60, 30, 70, 50, 20, 10].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end rounded-[12px] bg-[#F5F7FB] dark:bg-[#0F1117] px-1.5 pb-1.5">
                    <div className="w-full rounded-[8px] bg-gray-200 dark:bg-gray-700" style={{ height: `${h}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] dark:text-gray-500">—</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-3 pt-2">
              {normalizedBars.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end rounded-[12px] bg-[#F5F7FB] dark:bg-[#0F1117] px-1.5 pb-1.5">
                    <div
                      className="w-full rounded-[8px] bg-[linear-gradient(180deg,#8B5CF6,#6D4AFF)] transition-all duration-700"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] dark:text-gray-500">
                    {chartLabels[index]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };



  const renderProfileWorkspace = () => {
    const currentLevel = userStats?.level ?? 1;
    const currentXp = userStats?.xp ?? 0;
    const bestStreak = userStats?.bestStreak ?? 1;
    const currentStreak = userStats?.currentStreak ?? 1;
    const tasksCompleted = userStats?.tasksCompleted ?? 0;
    const goalsCompleted = userStats?.goalsCompleted ?? 0;
    const habitsCompleted = userStats?.habitsCompleted ?? 0;
    const aiInteractions = userStats?.aiInteractions ?? 0;

    const memberSinceStr = userProfile?.createdAt 
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
          userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt)
        )
      : 'June 2026';

    const getBadgeData = (badgeId: string, defaultTarget: number) => {
      const badge = userBadges.find(b => b.badgeId === badgeId);
      return {
        isUnlocked: badge?.isUnlocked || false,
        progress: badge?.progress || 0,
        target: defaultTarget
      };
    };

    const handleSaveProfile = () => {
      if (user) {
        updateUserProfile(user.uid, {
          displayName: tempDisplayName,
          bio: tempBio,
          college: tempCollege,
          role: tempRole,
          location: tempLocation
        })
          .then(() => alert('Profile updated successfully!'))
          .catch((err) => console.error('Error updating profile:', err));
      }
    };

    const handleSaveAvatar = () => {
      if (user) {
        updateUserProfile(user.uid, { avatar: avatarPreview })
          .then(() => alert('Avatar updated successfully!'))
          .catch((err) => console.error('Error updating avatar:', err));
      }
    };

    const triggerConfirmation = (title: string, message: string, actionLabel: string, onConfirm: () => void) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        actionLabel,
        onConfirm: () => {
          onConfirm();
          setConfirmModal(null);
        }
      });
    };

    const { percent: xpPercent, xpNeeded, nextLevelXp } = getXpDetails(currentXp, currentLevel);
    const connectedAppsCount = [
      userIntegration?.googleCalendarConnected,
      userIntegration?.googleTasksConnected,
      userIntegration?.gmailConnected,
      userIntegration?.driveConnected
    ].filter(Boolean).length;

    // SVG Progress Ring calculations
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (xpPercent / 100) * circumference;

    const totalUnlocked = userBadges.filter(b => b.isUnlocked).length;

    return (
      <div className="space-y-6 text-[#111827] dark:text-white transition-colors duration-200">
        
        {/* TWO COLUMN GRID */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN: Profile Header, Avatar Studio, Connected Apps */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* PROFILE HEADER CARD */}
            <div ref={profileTopRef} id="profile-header" className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md transition-colors duration-200">
              <div className="flex flex-col items-center text-center space-y-4">
                
                {/* Dynamic Circular SVG XP Progress Ring around Avatar */}
                <div className="relative h-28 w-28 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-gray-100 dark:stroke-white/5"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-[#6D4AFF] dark:stroke-[#A78BFA] transition-all duration-1000 ease-out"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  <div className="h-[76px] w-[76px] rounded-full overflow-hidden relative shadow-inner">
                    {renderAvatarSvg(userAvatar, "h-full w-full object-cover")}
                  </div>
                  
                  <span className="absolute bottom-1 right-1 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-gradient-to-tr from-[#6D4AFF] via-[#8B5CF6] to-[#EC4899] text-[9.5px] font-black text-white shadow-[0_4px_12px_rgba(109,74,255,0.4)] border border-white dark:border-[#171923]">
                    {currentLevel}
                  </span>
                </div>

                <div className="space-y-1.5 w-full">
                  <h3 className="text-xl font-bold tracking-tight text-[#111827] dark:text-white leading-tight">
                    {displayName}
                  </h3>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] font-semibold">
                    {emailLabel}
                  </p>
                  {bio && (
                    <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm mx-auto font-medium">
                      {bio}
                    </p>
                  )}
                  {(location || college) && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-semibold">
                      {location && `📍 ${location}`} {college && ` • 🎓 ${college}`}
                    </p>
                  )}
                </div>

                <div className="w-full bg-gray-50/50 dark:bg-black/10 rounded-2xl p-4.5 border dark:border-white/5 space-y-2 text-left">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-[#111827] dark:text-white">
                      ⭐ {LEVEL_NAMES[currentLevel] || 'Starter'}
                    </span>
                    <span className="font-black text-[#6D4AFF] dark:text-[#A78BFA]">
                      {currentXp} / {nextLevelXp} XP ({xpPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-150 dark:bg-gray-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#6D4AFF] via-[#8B5CF6] to-[#EC4899] transition-all duration-1000 ease-out" 
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <p className="text-[9.5px] text-[#6B7280] dark:text-[#A1A1AA] font-semibold text-right">
                    {xpNeeded > 0 ? `${xpNeeded} XP to Level ${currentLevel + 1}` : 'Maximum Level Achieved!'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                  <div className="rounded-xl border dark:border-white/5 bg-gray-50/30 dark:bg-white/2 p-3 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Streak Status</p>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1">🔥 {currentStreak} Days</p>
                  </div>
                  <div className="rounded-xl border dark:border-white/5 bg-gray-50/30 dark:bg-white/2 p-3 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Best Streak</p>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-500 mt-1">🏆 {bestStreak} Days</p>
                  </div>
                  <div className="rounded-xl border dark:border-white/5 bg-gray-50/30 dark:bg-white/2 p-3 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Workspace</p>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1 truncate">{role}</p>
                  </div>
                  <div className="rounded-xl border dark:border-white/5 bg-gray-50/30 dark:bg-white/2 p-3 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Member Since</p>
                    <p className="text-sm font-black text-[#6D4AFF] dark:text-[#A78BFA] mt-1 truncate">{memberSinceStr}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DIGITAL IDENTITY (AVATAR STUDIO) */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Digital Identity</h4>
                <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">Customize your digital avatar.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center shrink-0">
                  <p className="text-[9.5px] font-black text-[#6B7280] dark:text-[#A1A1AA] mb-2.5 uppercase tracking-widest">Enlarge Preview</p>
                  <div className="relative rounded-full p-1 bg-gradient-to-tr from-[#6D4AFF] via-[#8B5CF6] to-[#EC4899] shadow-lg animate-pulse-soft">
                    {renderAvatarSvg(avatarPreview, "h-20 w-20 border-2 border-white dark:border-[#171923]")}
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <div className="grid grid-cols-5 gap-2.5">
                    {[
                      'Professional Male 1', 'Professional Male 2', 'Professional Male 3',
                      'Professional Female 1', 'Professional Female 2',
                      'Student Avatar 1', 'Student Avatar 2',
                      'Minimal Abstract Avatar 1', 'Minimal Abstract Avatar 2',
                      'AI Generated Style Avatar'
                    ].map((name) => (
                      <button
                        key={name}
                        onClick={() => setAvatarPreview(name)}
                        className={`relative rounded-full p-0.5 overflow-hidden transition-all duration-200 cursor-pointer ${
                          avatarPreview === name 
                            ? 'ring-4 ring-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.6)] scale-110 z-10' 
                            : 'opacity-85 hover:opacity-100 hover:scale-105'
                        }`}
                        title={name}
                      >
                        {renderAvatarSvg(name, "h-8 w-8")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-gray-150 dark:border-white/5 pt-4">
                <button
                  onClick={handleSaveAvatar}
                  disabled={avatarPreview === userAvatar}
                  className="app-button-primary px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  Save Avatar
                </button>
              </div>
            </div>

            {/* CONNECTED APPS SECTION */}
            <div ref={connectedAppsRef} id="connected-apps">
              {user && <ConnectedAppsCard userId={user.uid} />}
            </div>
          </div>

          {/* RIGHT COLUMN: Achievements Vault Accordion, Profile Insights, Persona Form, Preferences */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ACHIEVEMENTS VAULT ACCORDION */}
            <div ref={achievementsRef} id="achievements-vault" className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] overflow-hidden shadow-md transition-all duration-300">
              <button 
                onClick={() => setBadgeVaultOpen(!badgeVaultOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-white/2 transition duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h4 className="text-base font-black text-[#111827] dark:text-white">Achievements Vault</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {totalUnlocked} of 16 Badges Unlocked • {16 - totalUnlocked} Remaining
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-450">
                    {Math.round((totalUnlocked / 16) * 105) > 100 ? 100 : Math.round((totalUnlocked / 16) * 100)}% Complete
                  </span>
                  <span className={`text-[#6B7280] dark:text-[#A1A1AA] transition-transform duration-300 ${badgeVaultOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              <div 
                className={`transition-all duration-300 overflow-hidden ${
                  badgeVaultOpen ? 'max-h-[2000px] border-t border-[#E5E7EB] dark:border-white/8' : 'max-h-0'
                }`}
              >
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-4">
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 dark:bg-black/20 rounded-xl w-fit">
                      {(['all', 'unlocked', 'progress', 'locked'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setBadgeFilter(tab)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                            badgeFilter === tab 
                              ? 'bg-white dark:bg-[#1E2937] text-[#6D4AFF] dark:text-[#A78BFA] shadow-sm' 
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-250'
                          }`}
                        >
                          {tab === 'all' ? 'All' : tab === 'progress' ? 'In Progress' : tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {['BEGINNER', 'CONSISTENCY', 'PRODUCTIVITY', 'AI', 'SPECIAL'].map((cat) => {
                      let catBadges = BADGE_DEFINITIONS.filter(b => b.category === cat);
                      
                      catBadges = catBadges.filter(badge => {
                        const { isUnlocked, progress } = getBadgeData(badge.id, badge.target);
                        if (badgeFilter === 'unlocked') return isUnlocked;
                        if (badgeFilter === 'progress') return !isUnlocked && progress > 0;
                        if (badgeFilter === 'locked') return !isUnlocked && progress === 0;
                        return true;
                      });

                      if (catBadges.length === 0) return null;

                      return (
                        <div key={cat} className="space-y-3">
                          <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA] border-l-2 border-[#6D4AFF] pl-2">
                            {cat}
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                            {catBadges.map((badge) => {
                              const { isUnlocked, progress } = getBadgeData(badge.id, badge.target);
                              return (
                                <BadgeIllustration
                                  key={badge.id}
                                  badgeId={badge.id}
                                  isUnlocked={isUnlocked}
                                  progress={progress}
                                  target={badge.target}
                                  badgeName={badge.label}
                                  description={badge.desc}
                                  xpReward={badge.xpReward || 20}
                                  rarity={badge.rarity || 'common'}
                                  isHighlighted={highlightedBadgeId === badge.id}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PROFILE INSIGHTS */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md transition-colors duration-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mb-4">Workspace Insights</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Level Title', value: `${LEVEL_NAMES[currentLevel] || 'Starter'}`, accent: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
                  { label: 'Total Experience', value: `${currentXp} XP`, accent: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
                  { label: 'Active Streak', value: `${currentStreak} Days`, accent: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
                  { label: 'Best Streak Record', value: `${bestStreak} Days`, accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
                  { label: 'Goals Completed', value: `${goalsCompleted}`, accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                  { label: 'Tasks Completed', value: `${tasksCompleted}`, accent: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
                  { label: 'Habits Completed', value: `${habitsCompleted}`, accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                  { label: 'AI Sessions Logs', value: `${aiInteractions}`, accent: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
                  { label: 'Connected Apps', value: `${connectedAppsCount}`, accent: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10' }
                ].map((metric) => (
                  <div key={metric.label} className="p-3.5 rounded-2xl border border-gray-150 dark:border-white/5 bg-[#FBFCFF] dark:bg-[#1D1F2D] flex flex-col justify-between min-h-[92px] transition-all hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-sm">
                    <p className="text-[9.5px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] leading-snug">{metric.label}</p>
                    <p className={`text-lg font-black mt-2.5 tracking-tight ${metric.accent.split(' ')[0]}`}>{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* XP ACTIVITY FEED */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">⚡ XP Activity Feed</h4>
                {xpHistory.length > 0 && (
                  <span className="text-[10px] font-semibold text-[#6D4AFF] dark:text-[#A78BFA] bg-[#F3EEFF] dark:bg-[#1C1836] px-2.5 py-0.5 rounded-full">
                    Last {xpHistory.length} events
                  </span>
                )}
              </div>
              {xpHistory.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">No XP events yet. Complete tasks and goals to earn XP!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {xpHistory.map((entry) => {
                    const actionLabel = entry.action
                      .replace(/_/g, ' ')
                      .replace('TASK COMPLETED', 'Task Completed')
                      .replace('GOAL COMPLETED', 'Goal Completed')
                      .replace('HABIT COMPLETED', 'Habit Completed')
                      .replace('DAILY LOGIN', 'Daily Login')
                      .replace('STREAK BONUS', 'Streak Bonus')
                      .replace('BADGE UNLOCKED', 'Badge Unlocked')
                      .replace('AI COACH USAGE', 'AI Coach Used')
                      .replace('GOAL CREATED', 'Goal Created')
                      .replace('NOTES CREATED', 'Note Created');
                    const ts = entry.timestamp?.toDate ? entry.timestamp.toDate() : (entry.timestamp ? new Date(entry.timestamp) : null);
                    const timeStr = ts ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(ts) : '';
                    return (
                      <div key={entry.id} className="flex items-center justify-between rounded-[12px] bg-[#F9FAFB] dark:bg-[#1D1F2D] px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3EEFF] dark:bg-[#1C1836] text-[11px]">⚡</span>
                          <div>
                            <p className="text-xs font-semibold text-[#111827] dark:text-white capitalize">{actionLabel}</p>
                            {timeStr && <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">{timeStr}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#6D4AFF] dark:text-[#A78BFA]">+{entry.xpEarned} XP</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ABOUT PERSONA FORM */}
            <div ref={preferencesRef} id="about-persona" className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mb-4">About Persona</h4>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Display Name</span>
                    <input
                      className="app-input"
                      value={tempDisplayName}
                      onChange={(e) => setTempDisplayName(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Email (Read Only)</span>
                    <input
                      className="app-input bg-gray-50 dark:bg-gray-800/40 text-gray-450 dark:text-gray-500 cursor-not-allowed"
                      value={emailLabel}
                      readOnly
                      disabled
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Bio</span>
                    <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">{tempBio.length} / 250</span>
                  </div>
                  <textarea
                    className="app-input resize-none h-16 text-xs"
                    maxLength={250}
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    placeholder="Tell your story..."
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">College</span>
                    <input
                      className="app-input"
                      value={tempCollege}
                      onChange={(e) => setTempCollege(e.target.value)}
                      placeholder="Momentum Academy"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Role</span>
                    <input
                      className="app-input"
                      value={tempRole}
                      onChange={(e) => setTempRole(e.target.value)}
                      placeholder="AI Explorer"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Location</span>
                    <input
                      className="app-input"
                      value={tempLocation}
                      onChange={(e) => setTempLocation(e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-150 dark:border-white/5">
                  <button
                    onClick={handleSaveProfile}
                    className="app-button-primary px-4 py-2 text-xs font-bold"
                  >
                    Save Persona
                  </button>
                </div>
              </div>
            </div>

            {/* PREFERENCES & ACCOUNT SECURITY */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mb-4">Preferences & Security</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#111827] dark:text-white">Dark Mode</p>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">Toggle system theme preference.</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      theme === 'dark' ? 'bg-[#6D4AFF]' : 'bg-gray-250 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 pt-2 border-t border-gray-150 dark:border-white/5">
                  <button
                    onClick={() => alert('Password reset link sent to your email.')}
                    className="px-3 py-2.5 text-xs font-bold text-center border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => triggerConfirmation(
                      'Delete Account?',
                      'This action is permanent. All your data, focus history, and identity records will be lost forever.',
                      'Delete My Account',
                      () => {
                        alert('Account deletion request received.');
                        handleSignOut();
                      }
                    )}
                    className="px-3 py-2.5 text-xs font-bold text-center border border-red-200 dark:border-red-950 bg-red-50/10 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/45 px-4 backdrop-blur-sm">
            <div className="app-surface w-full max-w-sm p-5">
              <h4 className="text-base font-bold text-[#111827] dark:text-white">{confirmModal.title}</h4>
              <p className="mt-2 text-xs leading-5 text-[#6B7280] dark:text-[#A1A1AA]">{confirmModal.message}</p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition cursor-pointer"
                >
                  {confirmModal.actionLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsWorkspace = () => {
    const handleSaveConfig = async () => {
      if (!user) return;
      try {
        await dbUpdateUserPreferences(user.uid, {
          geminiApiKey: settingsGeminiKey,
          sarvamApiKey: settingsSarvamKey,
          ...settingsToggles
        });
        showToast('Configuration saved successfully! 🟢', 'success');
      } catch (err) {
        console.error('Failed to save settings:', err);
        showToast('Failed to save settings. 🔴', 'error');
      }
    };

    const handleReset = () => {
      if (aiPreferences) {
        setSettingsGeminiKey(aiPreferences.geminiApiKey || '');
        setSettingsSarvamKey(aiPreferences.sarvamApiKey || '');
        setSettingsToggles({
          enableVoiceAssistant: aiPreferences.enableVoiceAssistant ?? true,
          enableAiScheduling: aiPreferences.enableAiScheduling ?? true,
          enableDailyAiBrief: aiPreferences.enableDailyAiBrief ?? true,
          enableSmartRecommendations: aiPreferences.enableSmartRecommendations ?? true,
          enableOptimizeDay: aiPreferences.enableOptimizeDay ?? true,
          enableOptimizeWeek: aiPreferences.enableOptimizeWeek ?? true
        });
        setGeminiStatus(aiPreferences.geminiApiKey ? 'connected' : 'unconfigured');
        setSarvamStatus(aiPreferences.sarvamApiKey ? 'connected' : 'unconfigured');
        showToast('Settings reset to saved values. ⚪', 'success');
      }
    };

    const handleTestGemini = async () => {
      if (!settingsGeminiKey.trim()) {
        showToast('Please enter a Gemini API Key to test.', 'error');
        return;
      }
      setGeminiStatus('testing');
      const isSuccess = await aiService.testGeminiConnection(settingsGeminiKey);
      setGeminiStatus(isSuccess ? 'connected' : 'failed');
      if (isSuccess) {
        showToast('Gemini API connection successful! 🟢', 'success');
      } else {
        showToast('Gemini API connection failed. 🔴', 'error');
      }
    };

    const handleTestSarvam = async () => {
      if (!settingsSarvamKey.trim()) {
        showToast('Please enter a Sarvam AI API Key to test.', 'error');
        return;
      }
      setSarvamStatus('testing');
      try {
        const base64Audio = await voiceService.synthesizeSpeech("Ping", settingsSarvamKey);
        const isSuccess = !!base64Audio;
        setSarvamStatus(isSuccess ? 'connected' : 'failed');
        if (isSuccess) {
          showToast('Sarvam AI connection successful! 🟢', 'success');
        } else {
          showToast('Sarvam AI connection failed. 🔴', 'error');
        }
      } catch (err) {
        console.error(err);
        setSarvamStatus('failed');
        showToast('Sarvam AI connection failed. 🔴', 'error');
      }
    };

    const handleTestAll = async () => {
      showToast('Testing all connections...', 'success');
      await Promise.all([handleTestGemini(), handleTestSarvam()]);
    };

    const getStatusText = (status: typeof geminiStatus) => {
      switch (status) {
        case 'connected': return '🟢 Connected';
        case 'invalid': return '🟡 Invalid API Key';
        case 'failed': return '🔴 Connection Failed';
        case 'testing': return '🟡 Testing...';
        case 'unconfigured':
        default: return '⚪ Not Configured';
      }
    };

    return (
      <div className="mx-auto max-w-[1200px] space-y-6 text-left animate-[fade-up_0.3s_ease-out]">
        <div className="rounded-[24px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
          <h3 className="text-base font-black text-[#111827] dark:text-white mb-2">AI Configurator</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure the AI services used by Momentum AI. These keys are only required during the MVP stage.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gemini API config card */}
          <div className="rounded-[24px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧠</span>
                  <h4 className="text-sm font-black text-[#111827] dark:text-white">Gemini API Settings</h4>
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {getStatusText(geminiStatus)}
                </span>
              </div>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="block mb-2 text-xs font-bold text-gray-600 dark:text-gray-400">API Key</span>
                  <input
                    type="password"
                    className="app-input w-full"
                    placeholder="Enter your Gemini API key"
                    value={settingsGeminiKey}
                    onChange={(e) => setSettingsGeminiKey(e.target.value)}
                  />
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-150 dark:border-white/5">
              <button
                onClick={handleTestGemini}
                disabled={geminiStatus === 'testing'}
                className="app-button-secondary py-2 px-3 text-xs font-bold w-full cursor-pointer"
              >
                Test Connection
              </button>
              <button
                onClick={handleSaveConfig}
                className="app-button-primary py-2 px-3 text-xs font-bold w-full cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          {/* Sarvam AI config card */}
          <div className="rounded-[24px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎙</span>
                  <h4 className="text-sm font-black text-[#111827] dark:text-white">Sarvam AI Settings</h4>
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {getStatusText(sarvamStatus)}
                </span>
              </div>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="block mb-2 text-xs font-bold text-gray-600 dark:text-gray-400">API Key</span>
                  <input
                    type="password"
                    className="app-input w-full"
                    placeholder="Enter your Sarvam AI API key"
                    value={settingsSarvamKey}
                    onChange={(e) => setSettingsSarvamKey(e.target.value)}
                  />
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-150 dark:border-white/5">
              <button
                onClick={handleTestSarvam}
                disabled={sarvamStatus === 'testing'}
                className="app-button-secondary py-2 px-3 text-xs font-bold w-full cursor-pointer"
              >
                Test Connection
              </button>
              <button
                onClick={handleSaveConfig}
                className="app-button-primary py-2 px-3 text-xs font-bold w-full cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Features Toggles */}
        <div className="rounded-[24px] border border-[#EEF1F6] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
          <div className="flex items-center gap-2 border-b border-gray-150 dark:border-white/5 pb-3 mb-4">
            <span className="text-lg">⚙</span>
            <h4 className="text-sm font-black text-[#111827] dark:text-white">Advanced AI Features</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: 'enableVoiceAssistant', label: 'Enable Voice Assistant', desc: 'Control schedule using browser voice recorder.' },
              { key: 'enableAiScheduling', label: 'Enable AI Scheduling', desc: 'Use Gemini to place study/work slots.' },
              { key: 'enableDailyAiBrief', label: 'Enable Daily AI Brief', desc: 'Display summarized day analysis on Dashboard.' },
              { key: 'enableSmartRecommendations', label: 'Enable Smart Recommendations', desc: 'Show dynamic motivational tips.' },
              { key: 'enableOptimizeDay', label: 'Enable Optimize Day', desc: 'Allow Gemini-powered daily schedule optimization.' },
              { key: 'enableOptimizeWeek', label: 'Enable Optimize Week', desc: 'Allow Gemini-powered weekly rebalancing.' },
            ].map((opt) => (
              <div key={opt.key} className="flex items-start justify-between p-3.5 rounded-2xl bg-gray-50/50 dark:bg-white/2 border border-transparent hover:border-purple-500/10 transition">
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">{opt.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
                <button
                  onClick={() => setSettingsToggles(prev => ({
                    ...prev,
                    [opt.key]: !((prev as any)[opt.key])
                  }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    (settingsToggles as any)[opt.key] ? 'bg-[#6D4AFF]' : 'bg-gray-250 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      (settingsToggles as any)[opt.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security and Bottom actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-[24px] bg-red-50/5 dark:bg-red-950/5 border border-red-500/10">
          <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 text-left max-w-md">
            ⚠️ Security Notice: API keys are stored securely on your user preferences profile in Firestore and are never exposed to the client in plain text production builds.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleReset}
              className="app-button-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
            >
              Reset
            </button>
            <button
              onClick={handleTestAll}
              className="app-button-secondary py-2.5 px-4 text-xs font-bold cursor-pointer hover:border-cyan-500/40"
            >
              Test All Connections
            </button>
            <button
              onClick={handleSaveConfig}
              className="app-button-primary py-2.5 px-5 text-xs font-bold cursor-pointer shadow-[0_10px_20px_-10px_rgba(109,74,255,0.4)]"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardWorkspace = () => {
    const isInitialLoading = user ? (!userProfile || !userStats || !weeklyAnalytics) : false;

    if (isInitialLoading) {
      return <DashboardSkeleton />;
    }


    const pendingTasks = [...sortedTasks].filter((task) => !task.completed);
    const dueTodayTasks = pendingTasks.filter((task) => task.dueDateRaw && sameDay(task.dueDateRaw, TODAY));
    const overdueTasksList = pendingTasks.filter((task) => task.dueDateRaw && task.dueDateRaw.getTime() < TODAY.getTime());
    const assignmentDeadlinesList = pendingTasks
      .filter((task) => task.category === 'Assignments' || Boolean(task.subject))
      .sort((left, right) => {
        const leftTime = left.dueDateRaw?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDateRaw?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return leftTime - rightTime || priorityOrder[left.priority] - priorityOrder[right.priority];
      });
    const highestPriorityTask =
      dueTodayTasks[0] ||
      assignmentDeadlinesList[0] ||
      pendingTasks.find((task) => task.priority === 'critical' || task.priority === 'high') ||
      pendingTasks[0];




    const handleRefreshBrief = async () => {
      await loadDailyBrief();
      showToast('Brief refreshed', 'success');
    };

    const handleOptimizeDay = async () => {
      try {
        showToast('Optimizing your day...', 'success');
        const dayKey = todayKey();
        const result = optimizeDaySchedule(dayKey, events as any[]);
        setEvents(result.optimizedEvents as any);
        showToast(`Day optimized! ${result.stats.moved} events moved, ${result.stats.conflictsResolved} conflicts resolved.`, 'success');
      } catch {
        showToast('Failed to optimize day.', 'error');
      }
    };

    return (
      <div className="relative space-y-6 text-left">
        {/* 1. AI Daily Summary Hero */}
        <DashboardSummary
          data={{
            tasks,
            events,
            dashboardHabits,
            dashboardGoals,
            xpHistory,
            weeklyAnalytics,
            userProfile,
            userStats,
            smartAdvice,
          }}
          greetingName={greetingName}
          onRefreshBrief={handleRefreshBrief}
          briefLoading={briefLoading}
          dailyBriefData={dailyBriefData}
          currentTime={currentTime}
          onAddTask={() => handleTaskCreate()}
          onOptimizeDay={handleOptimizeDay}
        />

        {/* 2. Today's Timeline + High Priority Tasks & Smart To-Do List */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7">
            <TodayTimeline 
              events={events} 
              currentTime={currentTime} 
              onToggleEvent={async (eventId, completed) => {
                await dbUpdateEvent(eventId, { completed });
                showToast(completed ? "Event completed ✓" : "Event active", "success");
              }}
            />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <HighestPriorityTask
              task={highestPriorityTask || null}
              tasks={pendingTasks}
              onStartFocus={() => setActiveSection('Tasks')}
              onComplete={(id) => { dbToggleTaskCompleted(id, true); showToast('Task completed!', 'success'); }}
              onReschedule={() => setActiveSection('Calendar')}
              onAskAi={(title) => {
                setAiAssistantOpen(true);
                void askAiAssistant(`What should I do next to finish ${title}?`);
              }}
            />
            <SmartToDoList
              tasks={tasks}
              onToggleComplete={(id, completed) => { dbToggleTaskCompleted(id, completed); }}
              onDelete={(id) => { dbDeleteTask(id); showToast('Task deleted', 'success'); }}
              onUpdateTask={(id, updates) => { dbUpdateTask(id, updates); }}
              onAddTask={() => handleTaskCreate()}
            />
          </div>
        </div>

        {/* 3. Goals Progress + Habits Tracker */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7">
            <GoalsProgress
              goals={dashboardGoals}
              onCompleteGoal={async (goalId, title, xpReward) => {
                if (user) {
                  await dbUpdateGoalProgress(user.uid, goalId, 100);
                  showToast(`Goal Completed: ${title} (+${xpReward} XP)!`, "success");
                }
              }}
            />
          </div>
          <div className="lg:col-span-5">
            <HabitsTracker
              habits={dashboardHabits}
              onToggleHabit={async (habitId, title, completed) => {
                if (user) {
                  await dbToggleHabitCompleted(user.uid, habitId, completed);
                  showToast(completed ? `Completed habit: ${title}` : `Incompleted habit: ${title}`, "success");
                }
              }}
            />
          </div>
        </div>

        {/* 4. Weekly Analytics + Assignment Deadline Tracker */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8">
            <ProductivityAnalytics
              weeklyAnalytics={weeklyAnalytics}
              tasks={tasks}
              assignmentCount={assignmentDeadlinesList.length}
              dashboardData={{
                tasks,
                events,
                dashboardHabits,
                dashboardGoals,
                xpHistory,
                weeklyAnalytics,
                userProfile,
                userStats,
                smartAdvice,
              }}
            />
          </div>
          <div className="lg:col-span-4">
            <AssignmentDeadlineTracker assignments={assignmentDeadlinesList} />
          </div>
        </div>

        {/* 5. AI Recommendations + Recent Activity + Mini Calendar */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-4">
            <AISuggestions
              tasks={tasks}
              events={events}
              highestPriorityTask={highestPriorityTask || null}
              overdueTasksCount={overdueTasksList.length}
              hasIncompleteHabits={dashboardHabits.some((h) => !h.completedToday)}
              onOptimizeDay={handleOptimizeDay}
              onReschedule={() => setActiveSection('Calendar')}
              onFocusMode={() => setActiveSection('Tasks')}
              onMarkComplete={(id) => { dbToggleTaskCompleted(id, true); showToast('Task completed!', 'success'); }}
            />
          </div>
          <div className="lg:col-span-4">
            <RecentActivity xpHistory={xpHistory} />
          </div>
          <div className="lg:col-span-4">
            <CalendarPreview
              events={events}
              tasks={tasks}
              goals={dashboardGoals.map(g => ({ dueDate: g.targetDate }))}
              habits={dashboardHabits.map(() => ({ dueDate: undefined }))}
            />
          </div>
        </div>
      </div>
    );
  };
  const renderPrimaryWorkspace = () => {
    if (activeSection === 'Dashboard') {
      return renderDashboardWorkspace();
    }

    if (activeSection === 'Calendar' || activeSection === 'Planner' || activeSection === 'Events') {
      return (
        <CalendarWorkspace
          user={user}
          events={events}
          setEvents={setEvents}
          weekDays={weekDays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          showToast={showToast}
          toast={toast}
          currentTime={currentTime}
          aiPreferences={aiPreferences}
          tasks={tasks}
        />
      );
    }

    if (activeSection === 'Tasks') {
      return renderTasksWorkspace();
    }

    if (activeSection === 'Notes') {
      return renderNotesWorkspace();
    }

    if (activeSection === 'AI Coach') {
      return (
        <GoalsHabitsWorkspace
          user={user}
          events={events}
          setEvents={setEvents}
          showToast={showToast}
        />
      );
    }

    if (activeSection === 'Analytics') {
      return renderAnalyticsWorkspace();
    }

    if (activeSection === 'Settings') {
      return renderSettingsWorkspace();
    }

    return renderProfileWorkspace();
  };

  const pageCopy = NAVIGATOR_COPY[activeSection];

  return (
    <div className="min-h-screen bg-transparent text-[#111827] dark:text-white transition-colors duration-200">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[224px] flex-col border-r border-[#E5E7EB] dark:border-white/8 bg-white/92 dark:bg-[#111827]/92 px-4 py-5 backdrop-blur-xl transition-all duration-200">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] shadow-[inset_0_0_0_1px_rgba(109,74,255,0.08)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-tight text-[#111827] dark:text-white leading-tight">Momentum AI</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6D4AFF]">Pro Workspace</p>
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {SECTION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.name === activeSection;
            return (
              <button
                key={item.name}
                onClick={() => setActiveSection(item.name)}
                className={`app-sidebar-item w-full justify-between ${isActive ? 'app-sidebar-item-active' : ''}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label ?? item.name}</span>
                </span>
                {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-[#6D4AFF]" /> : null}
              </button>
            );
          })}
        </nav>


      </aside>

      <div className="lg:pl-[224px]">
        <header className="app-topbar fixed left-0 right-0 top-0 z-30 lg:left-[224px] transition-all duration-200">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <h1 key={headerLine1} className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-[#111827] dark:text-white animate-[fade-up_0.4s_ease-out]">
                {headerLine1}
              </h1>
              <p key={headerLine2} className="mt-1.5 text-sm sm:text-base text-[#6B7280] dark:text-[#A1A1AA] font-medium animate-[fade-up_0.4s_ease-out]">
                {headerLine2}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="app-surface-soft hidden items-center gap-1 p-1 sm:flex">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
                    theme === 'light' ? 'bg-white text-[#F59E0B] shadow-[0_4px_10px_rgba(17,24,39,0.08)]' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                  aria-label="Light mode"
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-[#1F2937] text-[#818CF8] shadow-[0_4px_10px_rgba(0,0,0,0.3)]' : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
                  }`}
                  aria-label="Dark mode"
                >
                  <Moon className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setAiAssistantOpen(true)}
                className="app-button-primary !h-9 !px-4 !py-0 !text-xs !rounded-xl hidden sm:flex items-center gap-2 cursor-pointer"
                aria-label="Ask AI"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-bold uppercase tracking-wider text-[10px]">Ask AI</span>
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="app-surface-soft relative flex h-10 w-10 items-center justify-center cursor-pointer"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4 text-[#111827] dark:text-white" />
                  {headerNotifications.some(n => !n.read) && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#6D4AFF] text-[8px] font-bold text-white flex items-center justify-center">
                      {headerNotifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen((current) => !current)}
                  className="app-surface-soft hidden items-center gap-2.5 px-2.5 py-1.5 sm:flex hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none text-left"
                  aria-label="User profile menu"
                >
                  {renderAvatarSvg(userAvatar, "h-8 w-8")}
                  <div className="pr-1">
                    <p className="text-xs font-semibold text-[#111827] dark:text-white leading-tight">{displayName}</p>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">{emailLabel}</p>
                  </div>
                </button>
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-[48px] z-50 w-48 rounded-2xl border border-gray-150 dark:border-white/5 bg-white/95 dark:bg-[#171923]/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-md animate-[fade-up_0.15s_ease-out]">
                      <button
                        onClick={() => {
                          scrollToProfileSection('profile');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-250 hover:bg-[#F3EEFF] dark:hover:bg-[#1C1836] hover:text-[#6D4AFF] dark:hover:text-[#A78BFA] transition cursor-pointer"
                      >
                        👤 View Profile
                      </button>
                      <button
                        onClick={() => {
                          scrollToProfileSection('achievements');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-250 hover:bg-[#F3EEFF] dark:hover:bg-[#1C1836] hover:text-[#6D4AFF] dark:hover:text-[#A78BFA] transition cursor-pointer"
                      >
                        🏆 Achievements
                      </button>
                      <button
                        onClick={() => {
                          scrollToProfileSection('apps');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-250 hover:bg-[#F3EEFF] dark:hover:bg-[#1C1836] hover:text-[#6D4AFF] dark:hover:text-[#A78BFA] transition cursor-pointer"
                      >
                        🔌 Connected Apps
                      </button>
                      <button
                        onClick={() => {
                          scrollToProfileSection('preferences');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-250 hover:bg-[#F3EEFF] dark:hover:bg-[#1C1836] hover:text-[#6D4AFF] dark:hover:text-[#A78BFA] transition cursor-pointer"
                      >
                        ⚙️ Preferences
                      </button>
                      <div className="my-1 border-t border-gray-100 dark:border-white/5" />
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button onClick={handleSignOut} className="app-button-secondary">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="px-8 pb-8 pt-[112px]">
          <div className="mx-auto">
            <div className="mb-6 overflow-x-auto lg:hidden">
              <div className="flex gap-2 pb-2">
                {SECTION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.name === activeSection;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setActiveSection(item.name)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer ${
                        isActive
                          ? 'border-[#D9CCFF] dark:border-[#312E81] bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]'
                          : 'border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] text-[#6B7280] dark:text-[#A1A1AA]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label ?? item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 grid-cols-1">
              <section className="space-y-6">
                <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5CF6] dark:text-[#A78BFA]">{pageCopy.eyebrow}</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] dark:text-white">{pageCopy.title}</h2>
                    <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#A1A1AA]">{pageCopy.description}</p>
                  </div>

                  {(activeSection === 'Calendar') ? (
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="app-surface-soft px-4 py-2.5 text-xs font-semibold text-[#111827] dark:text-white">{calendarView === 'month' ? formatMonthTitle(selectedDate) : formatWeekRange(selectedDate)}</div>
                        <div className="app-surface-soft flex items-center gap-1 px-1.5 py-1.5">
                          <button
                            onClick={() => shiftCalendar(-1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] dark:text-[#A1A1AA] transition hover:bg-white dark:hover:bg-[#1E2937] hover:text-[#111827] dark:hover:text-white cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button onClick={() => setSelectedDate(TODAY)} className="rounded-full bg-white dark:bg-[#1E2937] px-4 py-1.5 text-xs font-semibold text-[#111827] dark:text-white border dark:border-white/8 transition cursor-pointer">
                            Today
                          </button>
                          <button
                            onClick={() => shiftCalendar(1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] dark:text-[#A1A1AA] transition hover:bg-white dark:hover:bg-[#1E2937] hover:text-[#111827] dark:hover:text-white cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="app-surface-soft flex items-center gap-1 p-1">
                          {(['day', 'week', 'month'] as CalendarView[]).map((view) => (
                            <button
                              key={view}
                              onClick={() => setCalendarView(view)}
                              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold capitalize transition cursor-pointer ${
                                calendarView === view ? 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA]' : 'text-[#6B7280] dark:text-[#A1A1AA]'
                              }`}
                            >
                              {view}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setActiveModal('event')} className="app-button-primary">
                          <Plus className="h-4 w-4" />
                          Add Event
                        </button>
                      </div>
                    </div>
                  ) : showHeaderActions ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button onClick={() => setActiveModal('task')} className="app-button-secondary">
                        <ListTodo className="h-4 w-4" />
                        Add Task
                      </button>
                      <button onClick={() => setActiveModal('ai')} className="app-button-primary">
                        <Sparkles className="h-4 w-4" />
                        Ask AI
                      </button>
                    </div>
                  ) : null}
                </div>

                {renderPrimaryWorkspace()}

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  {[
                    { label: 'Tasks Scheduled', value: `${pendingTasks}`, icon: ListTodo, accent: 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA]' },
                    { label: 'Focus Time', value: '3h 45m', icon: Clock, accent: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399]' },
                    { label: 'Events Today', value: `${eventsToday}`, icon: Calendar, accent: 'bg-[#FFF7ED] dark:bg-[#2A1F15] text-[#EA580C] dark:text-[#F59E0B]' },
                    { label: 'Overdue Tasks', value: `${overdueTasks}`, icon: AlertCircle, accent: 'bg-[#EEF6FF] dark:bg-[#142035] text-[#2563EB] dark:text-[#60A5FA]' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="app-surface-soft flex items-center justify-between p-4">
                        <div>
                          <p className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">{stat.label}</p>
                          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#111827] dark:text-white">{stat.value}</p>
                        </div>
                        <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${stat.accent}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {activeModal === 'task' ? (
        <TaskEditorModal
          taskFormMode={taskFormMode}
          editingTaskId={editingTaskId}
          taskDraft={taskDraft as any}
          setTaskDraft={setTaskDraft as any}
          onClose={() => { resetTaskDraft(); setActiveModal(null); }}
          onSubmit={handleAddTask}
        />
      ) : null}

      {activeModal === 'event' ? (
        <ModalFrame title="Add Event" description="Schedule a time block with the same visual language as the weekly workspace." onClose={() => setActiveModal(null)}>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Event title</span>
              <input
                className="app-input"
                placeholder="Design review"
                value={eventDraft.title}
                onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Date</span>
                <input
                  type="date"
                  className="app-input cursor-pointer"
                  value={eventDraft.date}
                  onChange={(event) => setEventDraft((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Start</span>
                <input
                  className="app-input"
                  placeholder="10:00 AM"
                  value={eventDraft.start}
                  onChange={(event) => setEventDraft((current) => ({ ...current, start: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">End</span>
                <input
                  className="app-input"
                  placeholder="11:30 AM"
                  value={eventDraft.end}
                  onChange={(event) => setEventDraft((current) => ({ ...current, end: event.target.value }))}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Priority</span>
              <select
                className="app-input cursor-pointer"
                value={eventDraft.priority}
                onChange={(event) => setEventDraft((current) => ({ ...current, priority: event.target.value as Priority }))}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E5E7EB] dark:border-white/8 mt-4">
              <button type="button" onClick={() => setActiveModal(null)} className="app-button-secondary px-3.5 py-2 text-xs">
                Cancel
              </button>
              <button type="submit" className="app-button-primary px-3.5 py-2 text-xs">
                Add Event
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {activeModal === 'ai' ? (
        <ModalFrame title="Ask AI Coach" description="Use the assistant to improve your schedule, protect focus time, and reduce deadline risk." onClose={() => setActiveModal(null)}>
          <div className="rounded-[18px] bg-[#FBFCFF] dark:bg-[#1D1F2D] border dark:border-white/8 p-3.5">
            <div className="soft-scrollbar max-h-[280px] space-y-2.5 overflow-y-auto pr-2">
              {chatHistory.map((message, index) => (
                <div
                  key={`${message.sender}-${index}`}
                  className={`max-w-[90%] rounded-[14px] px-3.5 py-3 text-xs leading-6 ${
                    message.sender === 'ai'
                      ? 'bg-white dark:bg-[#171923] text-[#111827] dark:text-white shadow-[0_12px_24px_-20px_rgba(17,24,39,0.16)] border dark:border-white/8'
                      : 'ml-auto bg-[#F3EEFF] dark:bg-[#1C1836] text-[#5B34F1] dark:text-[#A78BFA]'
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2">
            {['How should I plan tomorrow?', 'Reduce deadline risk', 'Find a focus block'].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setChatQuery(prompt)}
                className="rounded-full bg-[#F3EEFF] dark:bg-[#1C1836] px-3.5 py-1.5 text-xs font-semibold text-[#6D4AFF] dark:text-[#A78BFA] transition hover:scale-105 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleAskAi} className="mt-4 flex gap-2.5">
            <input
              className="app-input flex-1"
              placeholder="Ask your AI coach anything..."
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatQuery.trim()}
              className="app-button-primary px-4 py-2 text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {chatLoading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Thinking…
                </>
              ) : 'Send'}
            </button>
          </form>

        </ModalFrame>
      ) : null}

      {levelUpToast?.isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-[24px] border border-[#DDD2FF] dark:border-[#312E81] bg-white/90 dark:bg-[#1A152E]/90 p-5 shadow-[0_20px_50px_rgba(109,74,255,0.3)] backdrop-blur-md animate-[fade-up_0.4s_ease-out] flex gap-4 items-center">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6D4AFF] to-[#EC4899] text-white font-black text-xl shadow-[0_0_15px_rgba(109,74,255,0.4)]">
            <span>🎉</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#111827] dark:text-white leading-tight">Level Up!</h4>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              You ascended from Level {levelUpToast.oldLevel} to <span className="font-bold text-[#6D4AFF] dark:text-[#A78BFA]">Level {levelUpToast.newLevel}</span>!
            </p>
          </div>
          <button
            onClick={() => setLevelUpToast(null)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-250 dark:border-white/5 bg-gray-50 dark:bg-[#1E2937] text-gray-500 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 rotate-45" />
          </button>
        </div>
      )}

      {/* BADGE CELEBRATION MODAL */}
      {celebratingBadge && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="relative w-full max-w-sm rounded-[32px] bg-[#171923] border border-white/10 p-6 text-center text-white shadow-[0_0_50px_rgba(109,74,255,0.4)] animate-[fade-up_0.3s_ease-out]">
            <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none opacity-20">
              <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
              <div className="absolute top-20 right-10 w-3.5 h-3.5 bg-purple-500 rounded-full animate-ping [animation-delay:0.5s]" />
              <div className="absolute bottom-10 left-12 w-2 h-2 bg-pink-500 rounded-full animate-ping [animation-delay:1s]" />
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A78BFA] leading-tight">Achievement Unlocked</p>
            <h3 className="mt-2 text-xl font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-[#8B5CF6] bg-clip-text text-transparent">
              {celebratingBadge.badgeName || 'Congratulations!'}
            </h3>
            
            <div className="my-6 flex justify-center scale-110">
              <div className="relative p-1 bg-gradient-to-tr from-[#6D4AFF] to-[#EC4899] rounded-[24px] shadow-[0_0_30px_rgba(109,74,255,0.5)]">
                <BadgeIllustration
                  badgeId={celebratingBadge.badgeId}
                  isUnlocked={true}
                  progress={celebratingBadge.progressTarget || 1}
                  target={celebratingBadge.progressTarget || 1}
                  badgeName={celebratingBadge.badgeName}
                  description={celebratingBadge.description}
                  xpReward={celebratingBadge.xpReward}
                  rarity={celebratingBadge.rarity}
                />
              </div>
            </div>
            
            <p className="text-xs text-[#A1A1AA] px-4 leading-relaxed">
              {celebratingBadge.description || 'You unlocked a new workspace achievement!'}
            </p>
            
            <div className="mt-3.5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3.5 py-1 text-xs font-black text-yellow-400">
                🏆 +{celebratingBadge.xpReward ?? 25} XP Reward
              </span>
            </div>
            
            <div className="mt-6 space-y-2">
              <button
                onClick={() => handleClaimCelebration(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6D4AFF] to-[#8B5CF6] text-xs font-bold text-white shadow-[0_10px_20px_-10px_rgba(109,74,255,0.5)] hover:from-[#7C5CFF] hover:to-[#9A6FFF] transition cursor-pointer"
              >
                Claim & View Profile
              </button>
              <button
                onClick={() => handleClaimCelebration(false)}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-[#A1A1AA] hover:text-white transition cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FLOATING ACTION BUTTON (Speed Dial) */}
      <FloatingActionButton
        activeSection={activeSection}
        onAddTask={() => handleTaskCreate()}
        onAddGoal={() => setActiveSection('AI Coach')}
        onAddEvent={() => setActiveModal('event')}
        onOptimizeDay={handleOptimizeSchedule}
        onOptimizeWeek={handleOptimizeSchedule}
        onOpenAi={() => setAiAssistantOpen(true)}
      />
      {/* NOTIFICATION DRAWER */}
      {notificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-[85] bg-black/30 backdrop-blur-sm"
            onClick={() => setNotificationsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[86] w-[400px] max-w-[90vw] bg-[#0B0B0F]/97 dark:bg-[#0d0f15]/98 backdrop-blur-2xl border-l border-[#6D5DF6]/15 shadow-[-20px_0_60px_rgba(0,0,0,0.4)] flex flex-col animate-[slide-in-right_0.25s_ease-out]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {headerNotifications.filter(n => !n.read).length} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                {headerNotifications.some(n => !n.read) && (
                  <button
                    onClick={async () => {
                      if (user) {
                        await markAllNotificationsRead(user.uid);
                      }
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#8B7CF8] hover:text-[#A78BFA] transition cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 soft-scrollbar">
              {headerNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="h-14 w-14 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-2xl mb-4">
                    &#127881;
                  </div>
                  <p className="text-sm font-bold text-white">You're all caught up!</p>
                  <p className="text-[11px] text-gray-500 mt-1">No new notifications.</p>
                </div>
              ) : (
                headerNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative rounded-[14px] border px-4 py-3 text-xs leading-5 transition cursor-pointer group ${
                      notification.read
                        ? 'bg-[#FBFCFF]/50 dark:bg-[#1D1F2D]/50 border-[#EEF1F6]/50 dark:border-white/5 text-[#374151] dark:text-gray-400'
                        : 'bg-[#FBFCFF] dark:bg-[#1D1F2D] border-[#EEF1F6] dark:border-white/8 text-[#374151] dark:text-white'
                    }`}
                    onClick={async () => {
                      if (!notification.read) {
                        await markNotificationRead(notification.id);
                      }
                    }}
                  >
                    {!notification.read && (
                      <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#6D4AFF]" />
                    )}
                    <p className={`font-semibold ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'text-[#111827] dark:text-white'}`}>
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-gray-500 dark:text-gray-400">{notification.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      {/* GLOBAL FLOATING AI ASSISTANT */}
      <FloatingAiAssistant
        activeSection={activeSection}
        tasks={tasks}
        events={events}
        goals={dashboardGoals}
        habits={dashboardHabits}
        chatHistory={chatHistory}
        chatLoading={chatLoading}
        onOptimizeDay={handleOptimizeSchedule}
        onAddTask={() => handleTaskCreate()}
        onAskAi={askAiAssistant}
        onChatHistoryUpdate={setChatHistory}
        setChatLoading={setChatLoading}
        isOpenControlled={aiAssistantOpen}
        setIsOpenControlled={setAiAssistantOpen}
        user={user}
        aiPreferences={aiPreferences}
      />
    </div>
  );
}
