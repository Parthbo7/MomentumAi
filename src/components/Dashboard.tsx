import { useState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { collection, query, where, doc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Layers,
  ListTodo,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  Video,
  Trash2,
} from 'lucide-react';
import { auth, db } from '../firebase';
import {
  ensureUserProfile,
  updateUserProfile,
  dbAddTask,
  dbToggleTaskCompleted,
  dbAddEvent,
  dbAddNote,
  dbDeleteNote,
  dbLogAiCoachUsage,
  claimBadgeReward,
  MASTER_BADGES,
  type UserProfile,
  type UserStats,
  type UserBadge,
  type UserIntegration,
  type Note
} from '../firebaseService';
import { BadgeIllustration } from './BadgeIllustration';
import { DailyHabitsWidget, ActiveGoalsWidget, ConnectedAppsCard } from './GamificationWidgets';


type Priority = 'critical' | 'high' | 'medium' | 'low';
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
  | 'Profile';
type ActiveModal = 'task' | 'event' | 'ai' | null;

interface DashboardProps {
  user: User | null;
  onNavigateHome: () => void;
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
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  dueDateRaw?: Date;
  priority: Priority;
  completed: boolean;
}


const REFERENCE_TODAY = new Date(2026, 5, 23);
const HOURS = Array.from({ length: 10 }, (_, index) => index + 9);
const SECTION_ITEMS: Array<{ name: SectionKey; icon: LucideIcon }> = [
  { name: 'Dashboard', icon: Layers },
  { name: 'Calendar', icon: Calendar },
  { name: 'Tasks', icon: ListTodo },
  { name: 'Planner', icon: BookOpen },
  { name: 'Events', icon: Video },
  { name: 'Notes', icon: ClipboardList },
  { name: 'AI Coach', icon: Brain },
  { name: 'Analytics', icon: TrendingUp },
  { name: 'Profile', icon: Settings },
];

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: 'bg-[#FEF2F2] dark:bg-[#2A1518] text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#5C242A]',
  high: 'bg-[#FFF7ED] dark:bg-[#2A1F15] text-[#EA580C] dark:text-[#F59E0B] border border-[#FDBA74] dark:border-[#523F27]',
  medium: 'bg-[#FFFBEB] dark:bg-[#282115] text-[#D97706] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#4B3D25]',
  low: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399] border border-[#A7F3D0] dark:border-[#154E38]',
};

const EVENT_STYLES: Record<CalendarEvent['accent'], { container: string; bar: string; text: string }> = {
  lavender: {
    container: 'bg-[#F5F2FF] border-[#DDD2FF] dark:bg-[#201C35] dark:border-[#3C326D]',
    bar: 'bg-[#8B5CF6]',
    text: 'text-[#4C1D95] dark:text-[#C0A8FF]',
  },
  amber: {
    container: 'bg-[#FFF7E8] border-[#F9D799] dark:bg-[#2A2115] dark:border-[#523F27]',
    bar: 'bg-[#F59E0B]',
    text: 'text-[#92400E] dark:text-[#FCD34D]',
  },
  sky: {
    container: 'bg-[#EEF6FF] border-[#C7DEF9] dark:bg-[#142035] dark:border-[#223E6B]',
    bar: 'bg-[#60A5FA]',
    text: 'text-[#1D4ED8] dark:text-[#93C5FD]',
  },
  emerald: {
    container: 'bg-[#ECFDF5] border-[#B7E8CF] dark:bg-[#0C251C] dark:border-[#154E38]',
    bar: 'bg-[#10B981]',
    text: 'text-[#047857] dark:text-[#34D399]',
  },
  rose: {
    container: 'bg-[#FEF2F2] border-[#FECACA] dark:bg-[#2A1518] dark:border-[#5C242A]',
    bar: 'bg-[#F87171]',
    text: 'text-[#B91C1C] dark:text-[#FCA5A5]',
  },
};

const NAVIGATOR_COPY: Record<SectionKey, { eyebrow: string; title: string; description: string }> = {
  Dashboard: {
    eyebrow: 'Workspace overview',
    title: 'Weekly Calendar',
    description: 'Plan tasks, events, and deadlines in one spacious command center.',
  },
  Calendar: {
    eyebrow: 'Schedule planning',
    title: 'Calendar Workspace',
    description: 'Shift between day, week, and month without losing your focus context.',
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
    eyebrow: 'Productivity assistant',
    title: 'AI Coach',
    description: 'Get planning suggestions, deadline rescue strategies, and focus prompts.',
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

const formatAgendaDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(date);

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const parseClockValue = (value: string) => {
  const [time, period] = value.split(' ');
  const [hoursRaw, minutesRaw] = time.split(':').map(Number);
  let hours = hoursRaw % 12;
  if (period === 'PM') {
    hours += 12;
  }
  return hours * 60 + minutesRaw;
};

const formatHourLabel = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${suffix}`;
};

const getMonthCells = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(firstDay);
  return Array.from({ length: 35 }, (_, index) => addDays(gridStart, index));
};

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
  const now = new Date(REFERENCE_TODAY);
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
  const today = new Date(REFERENCE_TODAY);
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
  return `${hours}:${minutesStr} ${ampm}`;
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

type BadgeFilter = 'all' | 'unlocked' | 'progress' | 'locked';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt?: { toDate?: () => Date } | Date | null;
  read?: boolean;
}

export function Dashboard({ user, onNavigateHome }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('Dashboard');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(REFERENCE_TODAY);
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
    dueDate: 'Tomorrow, 12 PM',
    priority: 'medium' as Priority,
  });
  const [eventDraft, setEventDraft] = useState({
    title: '',
    dayOffset: 1,
    start: '10:00 AM',
    end: '11:00 AM',
    priority: 'medium' as Priority,
  });
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // 1. Check & Ensure user profile on mount
  useEffect(() => {
    if (user) {
      ensureUserProfile(user).catch((err) => console.error('Error ensuring profile:', err));
    }
  }, [user]);

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
        let dueDateStr = 'This week';
        let dateObj: Date | undefined = undefined;
        if (dueDateVal) {
          const parsedDate = dueDateVal.toDate ? dueDateVal.toDate() : new Date(dueDateVal);
          dateObj = parsedDate;
          dueDateStr = formatUIDateString(parsedDate);
        }
        loadedTasks.push({
          id: docSnap.id,
          title: data.title,
          dueDate: dueDateStr,
          dueDateRaw: dateObj,
          priority: data.priority,
          completed: data.completed,
        });
      });
      setTasks(loadedTasks);
    });
    return () => unsub();
  }, [user]);

  // 4. Events Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'events'), where('userId', '==', user.uid));
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
        });
      });
      setEvents(loadedEvents);
    });
    return () => unsub();
  }, [user]);

  // Active Goals Count Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snapshot) => {
      setActiveGoalsCount(snapshot.size);
    });
    return () => unsub();
  }, [user]);

  // Habits Count Real-time Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setHabitsCount(snapshot.size);
    });
    return () => unsub();
  }, [user]);

  const greetingName = displayName.split('  ')[0] || displayName.split(' ')[0] || 'Parth';
  const emailLabel = user?.email || 'parthbulbule123@gmail.com';
  const weekDays = getWeekDays(selectedDate);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const eventsToday = events.filter((event) => event.date === formatDateKey(REFERENCE_TODAY)).length;
  const overdueTasks = tasks.filter((task) => !task.completed && task.priority === 'critical').length;

  const overdueTasksCount = tasks.filter((task) => {
    if (task.completed) return false;
    if (!task.dueDateRaw) return false;
    return task.dueDateRaw.getTime() < REFERENCE_TODAY.getTime();
  }).length;

  const tasksDueWithin24h = tasks.filter((task) => {
    if (task.completed) return false;
    if (!task.dueDateRaw) return false;
    const diffTime = task.dueDateRaw.getTime() - REFERENCE_TODAY.getTime();
    return diffTime >= 0 && diffTime <= 24 * 60 * 60 * 1000;
  }).length;

  const getDailyQuote = () => {
    const dayIndex = new Date().getDate() % ROTATING_QUOTES.length;
    return ROTATING_QUOTES[dayIndex];
  };

  const formatNotificationTime = (createdAt?: NotificationItem['createdAt']) => {
    if (!createdAt) return 'Just now';
    const date = createdAt instanceof Date ? createdAt : createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
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
    setProfileMenuOpen(false);

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
    const hour = new Date().getHours();
    const rotationIndex = new Date().getDate() % 3; // 0, 1, 2

    if (hour >= 5 && hour < 12) {
      const morningGreetings = [
        `Good Morning, ${name} ☀️`,
        `Good Morning, ${name} 🌅`,
        `Good Morning, ${name} 🚀`
      ];
      return morningGreetings[rotationIndex];
    } else if (hour >= 12 && hour < 17) {
      const afternoonGreetings = [
        `Good Afternoon, ${name} ☕`,
        `Good Afternoon, ${name} ⚡`,
        `Good Afternoon, ${name} 🎯`
      ];
      return afternoonGreetings[rotationIndex];
    } else if (hour >= 17 && hour < 22) {
      const eveningGreetings = [
        `Good Evening, ${name} 🌙`,
        `Good Evening, ${name} 🔥`,
        `Good Evening, ${name} ⭐`
      ];
      return eveningGreetings[rotationIndex];
    } else {
      const nightGreetings = [
        `Still Grinding, ${name} 🌌`,
        `Good Night, ${name} 🌙`,
        `Late Night Session, ${name} 💻`
      ];
      return nightGreetings[rotationIndex];
    }
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
      let line2 = "";
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

  const handleAddTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskDraft.title.trim() || !user) {
      return;
    }

    const parsedDate = parseUIDateString(taskDraft.dueDate);
    dbAddTask(user.uid, {
      title: taskDraft.title.trim(),
      description: '',
      priority: taskDraft.priority,
      completed: false,
      dueDate: parsedDate,
    }).catch((err) => console.error('Error adding task:', err));

    setTaskDraft({
      title: '',
      dueDate: 'Tomorrow, 12 PM',
      priority: 'medium',
    });
    setActiveModal(null);
  };

  const handleAddEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventDraft.title.trim() || !user) {
      return;
    }

    const targetDate = addDays(startOfWeek(selectedDate), eventDraft.dayOffset);
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
      dayOffset: 1,
      start: '10:00 AM',
      end: '11:00 AM',
      priority: 'medium',
    });
    setActiveModal(null);
  };

  const handleAskAi = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatQuery.trim()) {
      return;
    }

    const userQuestion = chatQuery.trim();
    setChatHistory((currentHistory) => [...currentHistory, { sender: 'user', text: userQuestion }]);
    setChatQuery('');

    if (user) {
      dbLogAiCoachUsage(user.uid).catch((err) => console.error('Error logging AI Coach usage:', err));
    }

    window.setTimeout(() => {
      const normalized = userQuestion.toLowerCase();
      let response =
        'I recommend keeping the first 90 minutes of tomorrow protected for your highest-value task and pushing admin work to the afternoon.';

      if (normalized.includes('dbms') || normalized.includes('deadline')) {
        response =
          'Start the DBMS assignment today with a 45-minute kickoff sprint. That reduces deadline risk the most and creates space for revision tomorrow.';
      } else if (normalized.includes('focus') || normalized.includes('deep work')) {
        response =
          'Your best focus window is between 9:00 AM and 12:00 PM. Keep meetings light there and stack medium-priority tasks after lunch.';
      } else if (normalized.includes('week') || normalized.includes('plan')) {
        response =
          'This week works best if you front-load hard deliverables by Thursday, then keep Friday afternoon for rehearsal, review, and recovery.';
      }

      setChatHistory((currentHistory) => [...currentHistory, { sender: 'ai', text: response }]);
    }, 500);
  };

  const renderWeekView = () => (
    <div className="app-surface overflow-hidden p-0">
      <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-[#E5E7EB] dark:border-white/8 bg-[#FCFCFD] dark:bg-[#151722]">
        <div className="border-r border-[#E5E7EB] dark:border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] dark:text-gray-500">
          All Day
        </div>
        {weekDays.map((day) => {
          const isToday = sameDay(day, REFERENCE_TODAY);
          return (
            <div key={formatDateKey(day)} className="border-r border-[#E5E7EB] dark:border-white/8 px-3 py-3 last:border-r-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] dark:text-gray-500">
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    isToday ? 'bg-[#6D4AFF] text-white shadow-[0_14px_24px_-18px_rgba(109,74,255,0.9)]' : 'bg-[#F9FAFB] dark:bg-[#1D1F2D] text-[#111827] dark:text-white border dark:border-white/8'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923]">
        <div className="border-r border-[#E5E7EB] dark:border-white/8 px-4 py-2.5 text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">All Day</div>
        {weekDays.map((day) => {
          const hasEvents = events.some((event) => event.date === formatDateKey(day));
          return (
            <div
              key={`allday-${formatDateKey(day)}`}
              className="border-r border-[#E5E7EB] dark:border-white/8 px-4 py-2.5 text-center text-xs text-[#CBD5E1] dark:text-[#4B5563] last:border-r-0"
            >
              {hasEvents ? '' : 'No Events'}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] bg-white dark:bg-[#171923]">
        <div className="border-r border-[#E5E7EB] dark:border-white/8 bg-[#FCFCFD] dark:bg-[#151722]">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex h-[60px] items-start justify-end border-b border-[#F0F2F6] dark:border-white/8 px-3 pt-2 text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] last:border-b-0"
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {weekDays.map((day) => {
          const dayEvents = events.filter((event) => event.date === formatDateKey(day));

          return (
            <div key={`grid-${formatDateKey(day)}`} className="relative border-r border-[#E5E7EB] dark:border-white/8 last:border-r-0">
              {HOURS.map((hour) => (
                <div key={`${formatDateKey(day)}-${hour}`} className="h-[60px] border-b border-[#F0F2F6] dark:border-white/8 last:border-b-0" />
              ))}

              {dayEvents.map((event) => {
                const startMinutes = parseClockValue(event.start);
                const endMinutes = parseClockValue(event.end);
                const top = ((startMinutes - 540) / 60) * 60;
                const height = ((endMinutes - startMinutes) / 60) * 60;
                const style = EVENT_STYLES[event.accent];

                return (
                  <div
                    key={event.id}
                    className={`absolute left-2.5 right-2.5 rounded-[14px] border px-2.5 py-2.5 shadow-[0_12px_24px_-20px_rgba(17,24,39,0.2)] ${style.container}`}
                    style={{ top: `${top + 8}px`, height: `${Math.max(height - 8, 48)}px` }}
                  >
                    <span className={`absolute bottom-0 left-0 top-0 w-0.5 rounded-l-[14px] ${style.bar}`} />
                    <div className={`relative pl-2.5 ${style.text}`}>
                      <p className="text-[13px] font-semibold leading-tight truncate">{event.title}</p>
                      <p className="mt-1 text-[10px] font-medium text-[#6B7280] dark:text-[#A1A1AA] opacity-90">
                        {event.start} - {event.end}
                      </p>
                      {event.deadline && height >= 70 ? (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-black/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#DC2626] dark:text-red-400">
                          <AlertCircle className="h-2.5 w-2.5" />
                          Deadline
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayEvents = events.filter((event) => event.date === formatDateKey(selectedDate));

    return (
      <div className="app-surface p-5">
        <div className="flex flex-col gap-3 border-b border-[#E5E7EB] dark:border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">Day view</p>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-[#111827] dark:text-white">{formatAgendaDate(selectedDate)}</h3>
          </div>
          <div className="rounded-[14px] bg-[#F8F9FC] dark:bg-[#0F1117] px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] border dark:border-white/8">
            {dayEvents.length} scheduled block{dayEvents.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {dayEvents.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#D6DAE3] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] px-5 py-8 text-center text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              No events connected
            </div>
          ) : (
            dayEvents.map((event) => {
              const style = EVENT_STYLES[event.accent];
              return (
                <div key={event.id} className={`rounded-[18px] border px-4 py-4 ${style.container}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-base font-semibold ${style.text}`}>{event.title}</p>
                      <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                        {event.start} - {event.end}
                      </p>
                    </div>
                    <span className={`priority-pill ${PRIORITY_STYLES[event.priority]}`}>{event.priority}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthCells = getMonthCells(selectedDate);
    const currentMonth = selectedDate.getMonth();

    return (
      <div className="app-surface p-5">
        <div className="grid grid-cols-7 gap-3 border-b border-[#E5E7EB] dark:border-white/8 pb-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <div key={label} className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] dark:text-gray-500">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {monthCells.map((date) => {
            const dateEvents = events.filter((event) => event.date === formatDateKey(date));
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = sameDay(date, REFERENCE_TODAY);
            return (
              <div
                key={formatDateKey(date)}
                className={`min-h-[108px] rounded-[16px] border p-2.5 transition ${
                  isCurrentMonth
                    ? 'border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923]'
                    : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? 'bg-[#6D4AFF] text-white'
                        : isCurrentMonth
                          ? 'bg-[#F8F9FC] dark:bg-[#1E2937] text-[#111827] dark:text-white'
                          : 'bg-transparent text-[#9CA3AF] dark:text-[#4B5563]'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {dateEvents.length > 0 ? (
                    <span className="text-[10px] font-semibold text-[#8B5CF6] dark:text-[#A78BFA]">{dateEvents.length} items</span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1.5">
                  {dateEvents.slice(0, 2).map((event) => {
                    const style = EVENT_STYLES[event.accent];
                    return (
                      <div key={event.id} className={`rounded-[10px] border px-2 py-1 text-[10px] font-medium truncate ${style.container} ${style.text}`}>
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTasksWorkspace = () => {
    const todayTasks = sortedTasks.filter((task) => !task.completed && task.dueDate.toLowerCase().includes('today'));
    const upcomingTasks = sortedTasks.filter((task) => !task.completed && !task.dueDate.toLowerCase().includes('today'));
    const completed = sortedTasks.filter((task) => task.completed);

    return (
      <div className="app-surface p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: 'Today', tasks: todayTasks },
            { title: 'Upcoming', tasks: upcomingTasks },
            { title: 'Completed', tasks: completed },
          ].map((group) => (
            <div key={group.title} className="rounded-[18px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-3.5">
              <div className="mb-3.5 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A1A1AA]">{group.title}</h3>
                <span className="rounded-full border border-gray-200 dark:border-white/8 bg-white dark:bg-[#171923] px-2 py-0.5 text-xs font-semibold text-[#111827] dark:text-white">{group.tasks.length}</span>
              </div>
              <div className="space-y-2.5">
                {group.tasks.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-6 text-center text-xs text-[#9CA3AF] dark:text-[#4B5563]">
                    No tasks available
                  </div>
                ) : (
                  group.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() =>
                        dbToggleTaskCompleted(task.id, !task.completed).catch((err) =>
                          console.error('Error toggling task:', err)
                        )
                      }
                      className="w-full rounded-[14px] border border-white dark:border-white/8 bg-white dark:bg-[#171923] px-3.5 py-3.5 text-left shadow-[0_12px_24px_-20px_rgba(17,24,39,0.16)] transition hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border ${
                            task.completed ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white' : 'border-[#D1D5DB] dark:border-gray-700 bg-white dark:bg-[#1E2937] text-transparent'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold ${task.completed ? 'text-[#9CA3AF] dark:text-[#4B5563] line-through' : 'text-[#111827] dark:text-white'}`}>{task.title}</p>
                          <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">{task.dueDate}</p>
                          <span className={`priority-pill mt-2.5 ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPlannerWorkspace = () => {
    const morningTasks = tasks.filter(t => !t.completed && (t.priority === 'critical' || t.priority === 'high')).map(t => t.title);
    const afternoonTasks = tasks.filter(t => !t.completed && t.priority === 'medium').map(t => t.title);
    const eveningTasks = tasks.filter(t => !t.completed && t.priority === 'low').map(t => t.title);

    const plannerBlocks = [
      {
        title: 'Morning Focus',
        time: '9:00 AM - 12:00 PM',
        items: morningTasks,
        accent: 'bg-[#F5F2FF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA]',
      },
      {
        title: 'Afternoon Execution',
        time: '1:00 PM - 4:00 PM',
        items: afternoonTasks,
        accent: 'bg-[#EEF6FF] dark:bg-[#142035] text-[#2563EB] dark:text-[#60A5FA]',
      },
      {
        title: 'Evening Reset',
        time: '5:00 PM - 7:00 PM',
        items: eveningTasks,
        accent: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399]',
      },
    ];

    return (
      <div className="app-surface p-5">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {plannerBlocks.map((block) => (
              <div key={block.title} className="rounded-[18px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${block.accent}`}>{block.title}</span>
                <p className="mt-3 text-xs font-semibold text-[#111827] dark:text-white">{block.time}</p>
                <div className="mt-3.5 space-y-2.5">
                  {block.items.length === 0 ? (
                    <div className="rounded-[12px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-3 py-4 text-center text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
                      No tasks planned
                    </div>
                  ) : (
                    block.items.map((item) => (
                      <div key={item} className="rounded-[12px] bg-white dark:bg-[#171923] border dark:border-white/8 px-3 py-2.5 text-xs text-[#374151] dark:text-white shadow-[0_12px_24px_-20px_rgba(17,24,39,0.16)]">
                        {item}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-[20px] bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(109,74,255,0.6)] flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">AI plan summary</p>
              <h3 className="mt-3 text-xl font-bold tracking-tight leading-snug">
                {tasks.length > 0 ? "Work the difficult tasks before lunch." : "No active planning recommendations."}
              </h3>
              <p className="mt-3 text-xs leading-6 text-white/88">
                {tasks.length > 0
                  ? "Your calendar has strong deep-work capacity in the morning. Put the assignment kickoff there, keep meetings compact, and protect a late-day rehearsal block for interview practice."
                  : "Add tasks to your workspace to generate an AI execution plan summary."}
              </p>
            </div>
            <button onClick={() => setActiveModal('ai')} className="mt-6 w-full rounded-[14px] bg-white px-4 py-2.5 text-xs font-semibold text-[#6D4AFF] hover:bg-white/90 transition cursor-pointer">
              Refine with AI Coach
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEventsWorkspace = () => (
    <div className="app-surface p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {weekDays.map((day) => {
          const dayEvents = events.filter((event) => event.date === formatDateKey(day));
          return (
            <div key={formatDateKey(day)} className="rounded-[18px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
              <div className="mb-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B5CF6] dark:text-[#A78BFA]">
                    {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(day)}
                  </p>
                  <p className="mt-0.5 text-base font-bold text-[#111827] dark:text-white">{formatAgendaDate(day)}</p>
                </div>
                <span className="rounded-full border border-gray-200 dark:border-white/8 bg-white dark:bg-[#171923] px-2.5 py-1 text-[11px] font-semibold text-[#111827] dark:text-white">{dayEvents.length} events</span>
              </div>
              <div className="space-y-2.5">
                {dayEvents.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-6 text-center text-xs text-[#9CA3AF] dark:text-[#4B5563]">
                    No events connected
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const style = EVENT_STYLES[event.accent];
                    return (
                      <div key={event.id} className={`rounded-[14px] border px-3.5 py-3.5 ${style.container}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-xs font-semibold ${style.text}`}>{event.title}</p>
                            <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                              {event.start} - {event.end}
                            </p>
                          </div>
                          <span className={`priority-pill ${PRIORITY_STYLES[event.priority]}`}>{event.priority}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

  const renderAiWorkspace = () => (
    <div className="app-surface p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.74fr]">
        <div className="rounded-[20px] bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] p-5 text-white flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Live AI guidance</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight leading-snug">Momentum Coach is keeping an eye on your week.</h3>
            <p className="mt-3 max-w-xl text-xs leading-6 text-white/88">
              Ask for schedule triage, meeting compression, focus strategies, or a rescue plan when deadlines start stacking.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {['Plan my next 48 hours', 'Protect a focus block', 'Reduce deadline risk'].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setChatQuery(prompt);
                  setActiveModal('ai');
                }}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/22 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[20px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B5CF6] dark:text-[#A78BFA]">Recent conversation</p>
          <div className="mt-3.5 space-y-2.5">
            {chatHistory.slice(-3).map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`rounded-[14px] px-3.5 py-3 text-xs leading-6 ${
                  message.sender === 'ai'
                    ? 'bg-white dark:bg-[#171923] text-[#111827] dark:text-white border dark:border-white/8 shadow-[0_12px_24px_-20px_rgba(17,24,39,0.16)]'
                    : 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#5B34F1] dark:text-[#A78BFA]'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsWorkspace = () => {
    const analyticsCards = [
      {
        label: 'Focus Time',
        value: '27.5h',
        change: '+12%',
        accent: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399]',
      },
      {
        label: 'Task Completion',
        value: `${completionPercentage}%`,
        change: '+8%',
        accent: 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA]',
      },
      {
        label: 'Deadline Risk',
        value: 'Low',
        change: '-2 items',
        accent: 'bg-[#FFF7ED] dark:bg-[#2A1F15] text-[#EA580C] dark:text-[#F59E0B]',
      },
    ];

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
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280] dark:text-[#A1A1AA]">Weekly momentum</h3>
            <span className="text-xs font-medium text-[#6D7280] dark:text-[#A1A1AA]">Mon - Sun</span>
          </div>
          <div className="flex items-end gap-3 pt-2">
            {[58, 76, 64, 88, 72, 42, 36].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end rounded-[12px] bg-[#F5F7FB] dark:bg-[#0F1117] px-1.5 pb-1.5">
                  <div
                    className="w-full rounded-[8px] bg-[linear-gradient(180deg,#8B5CF6,#6D4AFF)]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] dark:text-gray-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsWorkspace = () => {
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

    return (
      <div className="space-y-6 text-[#111827] dark:text-white transition-colors duration-200">
        {/* PROFILE HEADER */}
        <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md transition-colors duration-200">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#6D4AFF] to-[#EC4899] opacity-35 blur group-hover:opacity-55 transition duration-300"></div>
              {renderAvatarSvg(userAvatar, "relative h-24 w-24 rounded-full shadow-lg")}
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white leading-tight">{displayName}</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA]">{emailLabel}</p>
                {bio && <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-xl">{bio}</p>}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EEFF] dark:bg-[#1C1836] border border-[#DDD2FF] dark:border-[#312E81] px-3.5 py-1 text-xs font-semibold text-[#6D4AFF] dark:text-[#A78BFA]">
                  ⭐ Level {currentLevel} {LEVEL_NAMES[currentLevel] || 'Starter'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 px-3.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  🔥 Streak: {currentStreak} Days
                </span>
                {role && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    💼 {role}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    📍 {location}
                  </span>
                )}
                {college && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 px-3.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    🎓 {college}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 px-3.5 py-1 text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">
                  📅 Member since {memberSinceStr}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] pt-0.5">
                ⚡ Last Active: Just now
              </p>
            </div>
          </div>
        </div>
 
        {/* TWO COLUMN GRID */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-5 space-y-6">
            {/* GAMIFICATION - MOMENTUM JOURNEY */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Momentum Journey</h4>
                <span className="text-[11px] font-bold text-[#6D4AFF] dark:text-[#A78BFA] bg-[#F3EEFF] dark:bg-[#1C1836] px-2.5 py-0.5 rounded-lg border border-[#DDD2FF] dark:border-[#312E81]">Level {currentLevel}</span>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#111827] dark:text-white">Level {currentLevel} {LEVEL_NAMES[currentLevel] || 'Starter'}</span>
                  <span className="font-bold text-[#6D4AFF] dark:text-[#A78BFA]">{currentXp} / {nextLevelXp} XP</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800/60 overflow-hidden p-0.5 border dark:border-white/5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#6D4AFF] via-[#8B5CF6] to-[#EC4899] transition-all duration-500 ease-out" 
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] text-right font-medium">
                  {xpNeeded > 0 ? `${xpNeeded} XP to Level ${currentLevel + 1}` : 'Maximum Level Achieved!'}
                </p>
              </div>
            </div>
 
            {/* STREAK STATUS CARD */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mb-4">Streak Status</h4>
              <div className="flex items-center gap-6">
                {/* Flame visualization */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 dark:from-orange-500/5 dark:to-pink-500/5 border border-orange-500/20 dark:border-orange-500/10">
                  <svg className="w-10 h-10 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#EA580C" />
                        <stop offset="50%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2C12 2 17 6.5 17 11C17 15 14.5 18 12 20C9.5 18 7 15 7 11C7 6.5 12 2 12 2Z" fill="url(#flameGrad)" />
                    <path d="M12 7C12 7 14 9.5 14 11.5C14 13.5 13 15 12 16.5C11 15 10 13.5 10 11.5C10 9.5 12 7 12 7Z" fill="#FBBF24" opacity="0.9" />
                  </svg>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center divide-x divide-gray-100 dark:divide-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Current</p>
                    <p className="text-base font-black text-rose-600 dark:text-rose-400">🔥 {currentStreak}d</p>
                  </div>
                  <div className="space-y-1 pl-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Best</p>
                    <p className="text-base font-black text-amber-600 dark:text-amber-500">🏆 {bestStreak}d</p>
                  </div>
                  <div className="space-y-1 pl-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Login Count</p>
                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400">📈 {userStats?.loginCount ?? 1}d</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONNECTED APPS SECTION */}
            {user && <ConnectedAppsCard userId={user.uid} />}
 
            {/* AVATAR STUDIO CARD */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Avatar Studio</h4>
                <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">Your Digital Identity</p>
              </div>
 
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center shrink-0">
                  <p className="text-[10px] font-bold text-[#6B7280] dark:text-[#A1A1AA] mb-3 uppercase tracking-wider">Preview</p>
                  <div className="relative rounded-full p-1 bg-gradient-to-tr from-[#6D4AFF] to-[#EC4899] shadow-lg">
                    {renderAvatarSvg(avatarPreview, "h-16 w-16 border-2 border-white dark:border-[#171923]")}
                  </div>
                </div>
 
                <div className="flex-1 w-full">
                  <div className="grid grid-cols-5 gap-2">
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
                            ? 'ring-4 ring-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.6)] scale-105' 
                            : 'opacity-80 hover:opacity-100 hover:scale-105 hover:-translate-y-0.5'
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
                  className="app-button-primary px-4 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Save Avatar
                </button>
              </div>
            </div>
          </div>
 
          {/* RIGHT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            {/* BADGES SHOWCASE CARD */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Badges & Milestones</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Unlock gamified milestones and achievements based on workspace activity.</p>
              </div>

              {['BEGINNER', 'CONSISTENCY', 'PRODUCTIVITY', 'AI', 'SPECIAL'].map((cat) => {
                const catBadges = BADGE_DEFINITIONS.filter(b => b.category === cat);
                return (
                  <div key={cat} className="space-y-3">
                    <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-[#6D4AFF] dark:text-[#A78BFA] border-l-2 border-[#6D4AFF] pl-2">{cat}</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {catBadges.map((badge) => {
                        const { isUnlocked, progress, target } = getBadgeData(badge.id, badge.target);
                        return (
                          <BadgeIllustration
                            key={badge.id}
                            badgeId={badge.id}
                            isUnlocked={isUnlocked}
                            progress={progress}
                            target={target}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
 
            {/* ABOUT PERSONA CARD */}
            <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md">
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
                {/* Dark Mode toggle */}
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
 
                {/* Account Actions */}
                <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-gray-150 dark:border-white/5">
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
 
        {/* BOTTOM FULL WIDTH - YOUR MOMENTUM STORY */}
        <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md transition-colors duration-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mb-4">Your Momentum Story</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Member Since', value: memberSinceStr, accent: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
              { label: 'Current Level', value: `Lvl ${currentLevel} ${LEVEL_NAMES[currentLevel] || 'Starter'}`, accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
              { label: 'Current XP', value: `${currentXp} XP`, accent: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
              { label: 'Current Streak', value: `${currentStreak} Days`, accent: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
              { label: 'Best Streak', value: `${bestStreak} Days`, accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
              { label: 'Goals Completed', value: `${goalsCompleted}`, accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
              { label: 'Tasks Completed', value: `${tasksCompleted}`, accent: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
              { label: 'Habits Completed', value: `${habitsCompleted}`, accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
              { label: 'AI Sessions', value: `${aiInteractions}`, accent: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
              { label: 'Connected Apps', value: `${connectedAppsCount}`, accent: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10' }
            ].map((metric) => (
              <div key={metric.label} className="p-4 rounded-2xl border border-gray-150 dark:border-white/5 bg-[#FBFCFF] dark:bg-[#1D1F2D] flex flex-col justify-between min-h-[100px] transition-all hover:scale-[1.02]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] leading-snug">{metric.label}</p>
                <p className={`text-xl font-black mt-2 tracking-tight ${metric.accent.split(' ')[0]}`}>{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
 
        {/* Confirmation Modal */}
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/40 px-4 backdrop-blur-sm">
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

  const renderPrimaryWorkspace = () => {
    if (activeSection === 'Dashboard' || activeSection === 'Calendar') {
      if (calendarView === 'day') {
        return renderDayView();
      }

      if (calendarView === 'month') {
        return renderMonthView();
      }

      return renderWeekView();
    }

    if (activeSection === 'Tasks') {
      return renderTasksWorkspace();
    }

    if (activeSection === 'Planner') {
      return renderPlannerWorkspace();
    }

    if (activeSection === 'Events') {
      return renderEventsWorkspace();
    }

    if (activeSection === 'Notes') {
      return renderNotesWorkspace();
    }

    if (activeSection === 'AI Coach') {
      return renderAiWorkspace();
    }

    if (activeSection === 'Analytics') {
      return renderAnalyticsWorkspace();
    }

    return renderSettingsWorkspace();
  };

  const renderRightRailTop = () => {
    if (activeSection === 'Analytics') {
      return (
        <div className="app-surface overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] px-5 py-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">Performance insight</p>
            <h3 className="mt-2 text-lg font-bold tracking-tight leading-snug">Your focus time is trending upward.</h3>
            <p className="mt-2 text-xs leading-6 text-white/88">Keep morning hours protected and your completion rate should pass 80% this week.</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'AI Coach') {
      return (
        <div className="app-surface overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] px-5 py-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">AI recommendation</p>
            <h3 className="mt-2 text-lg font-bold tracking-tight leading-snug">Protect a deep-work block before 11 AM.</h3>
            <p className="mt-2 text-xs leading-6 text-white/88">Your highest-value task is still exposed to deadline risk. Lock 90 minutes now.</p>
            <button onClick={() => setActiveModal('ai')} className="mt-4 rounded-[14px] bg-white px-4 py-2 text-xs font-semibold text-[#6D4AFF] hover:bg-white/90 transition cursor-pointer">
              View Suggestions
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="app-surface overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] px-5 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">AI recommendation</p>
          <h3 className="mt-2 text-lg font-bold tracking-tight leading-snug">You have 3 tasks due within 48 hours.</h3>
          <p className="mt-2 text-xs leading-6 text-white/88">
            Start <span className="font-semibold text-white">DBMS Assignment</span> today to reduce your deadline risk and avoid context overload later.
          </p>
          <button onClick={() => setActiveModal('ai')} className="mt-4 rounded-[14px] bg-white px-4 py-2 text-xs font-semibold text-[#6D4AFF] hover:bg-white/90 transition cursor-pointer">
            View Suggestions
          </button>
        </div>
      </div>
    );
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
                  <span>{item.name}</span>
                </span>
                {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-[#6D4AFF]" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            onClick={() => setActiveSection('Settings')}
            className={`app-sidebar-item w-full ${activeSection === 'Settings' ? 'app-sidebar-item-active' : ''}`}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <div className="app-surface-soft p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-[#A1A1AA]">Momentum Score</p>
            <div className="mt-3.5 flex items-center gap-3">
              <div 
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#6D4AFF 0deg, #6D4AFF ${((userProfile?.momentumScore ?? 87) / 100) * 360}deg, ${theme === 'dark' ? '#1F2937' : '#EDE9FE'} ${((userProfile?.momentumScore ?? 87) / 100) * 360}deg, ${theme === 'dark' ? '#1F2937' : '#EDE9FE'} 360deg)`
                }}
              >
                <div className="absolute inset-[5px] rounded-full bg-white dark:bg-[#1D1F2D]" />
                <div className="relative text-center">
                  <p className="text-xl font-bold text-[#111827] dark:text-white">{userProfile?.momentumScore ?? 87}</p>
                  <p className="text-[10px] font-semibold text-[#6B7280] dark:text-[#A1A1AA]">/100</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#111827] dark:text-white">You&apos;re ahead.</p>
                <p className="mt-0.5 text-[11px] text-[#059669] dark:text-[#34D399]">Focus is stable.</p>
              </div>
            </div>
          </div>
        </div>
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

              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="app-surface-soft relative flex h-10 w-10 items-center justify-center cursor-pointer"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4 text-[#111827] dark:text-white" />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6D4AFF]" />
                </button>
                {notificationsOpen ? (
                  <div className="absolute right-0 top-[50px] z-50 w-[320px] rounded-[20px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-4 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.4)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B5CF6] dark:text-[#A78BFA]">Notifications</p>
                    <div className="mt-4 space-y-3">
                      {notifications.map((notification) => (
                        <div key={notification} className="rounded-[14px] bg-[#FBFCFF] dark:bg-[#1D1F2D] border border-[#EEF1F6] dark:border-white/8 px-4 py-3 text-sm leading-6 text-[#374151] dark:text-white">
                          {notification}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="app-surface-soft hidden items-center gap-2.5 px-2.5 py-1.5 sm:flex">
                {renderAvatarSvg(userAvatar, "h-8 w-8")}
                <div className="pr-1">
                  <p className="text-xs font-semibold text-[#111827] dark:text-white">{displayName}</p>
                  <p className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">{emailLabel}</p>
                </div>
              </div>

              <button onClick={handleSignOut} className="app-button-secondary">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-8 pt-[112px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-6 overflow-x-auto lg:hidden">
              <div className="flex gap-2 pb-2">
                {SECTION_ITEMS.concat([{ name: 'Settings', icon: Settings }]).map((item) => {
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
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`grid gap-6 ${activeSection === 'Settings' ? 'grid-cols-1' : 'xl:grid-cols-[minmax(0,1fr)_336px]'}`}>
              <section className="space-y-6">
                <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5CF6] dark:text-[#A78BFA]">{pageCopy.eyebrow}</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] dark:text-white">{pageCopy.title}</h2>
                    <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#A1A1AA]">{pageCopy.description}</p>
                  </div>

                  {(activeSection === 'Dashboard' || activeSection === 'Calendar') ? (
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
                          <button onClick={() => setSelectedDate(REFERENCE_TODAY)} className="rounded-full bg-white dark:bg-[#1E2937] px-4 py-1.5 text-xs font-semibold text-[#111827] dark:text-white border dark:border-white/8 transition cursor-pointer">
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
                  ) : activeSection !== 'Settings' ? (
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

                {activeSection !== 'Settings' && (
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
                )}
              </section>

              {activeSection !== 'Settings' && (
                <aside className="space-y-6">
                  {renderRightRailTop()}

                  {user && <DailyHabitsWidget userId={user.uid} />}
                  {user && <ActiveGoalsWidget userId={user.uid} />}

                  <div className="app-surface p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#111827] dark:text-white">Upcoming Tasks</p>
                      <button onClick={() => setActiveModal('task')} className="text-[#6D4AFF] dark:text-[#A78BFA] cursor-pointer">
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {sortedTasks.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-6 text-center text-xs text-[#9CA3AF] dark:text-[#4B5563]">
                          No tasks available
                        </div>
                      ) : (
                        sortedTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() =>
                              dbToggleTaskCompleted(task.id, !task.completed).catch((err) =>
                                console.error('Error toggling task:', err)
                              )
                            }
                            className="flex w-full items-start gap-2.5 rounded-[14px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] px-3.5 py-3.5 text-left transition hover:border-[#DDD6FE] dark:hover:border-purple-900/40 cursor-pointer"
                          >
                            <span
                              className={`mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-md border ${
                                task.completed ? 'border-[#A78BFA] bg-[#C4B5FD] text-white' : 'border-[#D1D5DB] dark:border-gray-700 bg-white dark:bg-[#1E2937] text-transparent'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold ${task.completed ? 'text-[#9CA3AF] dark:text-[#4B5563] line-through' : 'text-[#111827] dark:text-white'}`}>{task.title}</p>
                              <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">{task.dueDate}</p>
                            </div>
                            <span className={`priority-pill shrink-0 ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="app-surface p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#111827] dark:text-white">Quick Actions</p>
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {[
                        { label: 'Add Task', icon: ListTodo, action: () => setActiveModal('task'), tone: 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF] dark:text-[#A78BFA]' },
                        { label: 'Add Event', icon: Calendar, action: () => setActiveModal('event'), tone: 'bg-[#ECFDF5] dark:bg-[#0C251C] text-[#059669] dark:text-[#34D399]' },
                        { label: 'Add Note', icon: ClipboardList, action: () => setActiveSection('Notes'), tone: 'bg-[#FFF7ED] dark:bg-[#2A1F15] text-[#EA580C] dark:text-[#F59E0B]' },
                        { label: 'Ask AI', icon: Brain, action: () => setActiveModal('ai'), tone: 'bg-[#EEF6FF] dark:bg-[#142035] text-[#2563EB] dark:text-[#60A5FA]' },
                      ].map((actionItem) => {
                        const Icon = actionItem.icon;
                        return (
                          <button
                            key={actionItem.label}
                            onClick={actionItem.action}
                            className={`flex items-center gap-2.5 rounded-[14px] border border-transparent px-3 py-3 text-xs font-semibold transition hover:-translate-y-0.5 cursor-pointer ${actionItem.tone}`}
                          >
                            <Icon className="h-4 w-4" />
                            {actionItem.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="app-surface p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#111827] dark:text-white">Workspace Health</p>
                    <div className="mt-4 space-y-3.5">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#6B7280] dark:text-[#A1A1AA]">Task completion</span>
                          <span className="font-bold text-[#111827] dark:text-white">{completionPercentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#EEF1F6] dark:bg-gray-800">
                          <div className="h-2 rounded-full bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)]" style={{ width: `${completionPercentage}%` }} />
                        </div>
                      </div>
                      <div className="rounded-[14px] bg-[#FBFCFF] dark:bg-[#1D1F2D] border dark:border-white/8 px-3.5 py-3.5 text-xs leading-6 text-[#6B7280] dark:text-[#A1A1AA]">
                        You have strong momentum today. Keep your hardest work in the morning and use lighter admin blocks later in the day.
                      </div>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>

      {activeModal === 'task' ? (
        <ModalFrame title="Add Task" description="Capture the next priority item and place it into your workspace." onClose={() => setActiveModal(null)}>
          <form onSubmit={handleAddTask} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Task title</span>
              <input
                className="app-input"
                placeholder="Review launch checklist"
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Due date</span>
                <input
                  className="app-input"
                  placeholder="Tomorrow, 2 PM"
                  value={taskDraft.dueDate}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Priority</span>
                <select
                  className="app-input cursor-pointer"
                  value={taskDraft.priority}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value as Priority }))}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E5E7EB] dark:border-white/8 mt-4">
              <button type="button" onClick={() => setActiveModal(null)} className="app-button-secondary px-3.5 py-2 text-xs">
                Cancel
              </button>
              <button type="submit" className="app-button-primary px-3.5 py-2 text-xs">
                Save Task
              </button>
            </div>
          </form>
        </ModalFrame>
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
                <span className="mb-1.5 block text-xs font-semibold text-[#374151] dark:text-[#A1A1AA]">Day</span>
                <select
                  className="app-input cursor-pointer"
                  value={eventDraft.dayOffset}
                  onChange={(event) => setEventDraft((current) => ({ ...current, dayOffset: Number(event.target.value) }))}
                >
                  {weekDays.map((day, index) => (
                    <option key={formatDateKey(day)} value={index}>
                      {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(day)}
                    </option>
                  ))}
                </select>
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
            />
            <button type="submit" className="app-button-primary px-4 py-2 text-xs">
              Send
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
    </div>
  );
}
