import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  theme: 'light' | 'dark';
  momentumScore: number;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  lastLogin: Timestamp | any;
  college?: string;
  role?: string;
  location?: string;
  level?: number;
  xp?: number;
  bestStreak?: number;
  activeDays?: number;
  aiInteractions?: number;
}

export interface UserStats {
  uid: string;
  xp: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  tasksCompleted: number;
  goalsCompleted: number;
  habitsCompleted: number;
  aiInteractions: number;
  loginCount: number;
}

export interface UserBadge {
  uid: string;
  badgeId: string;
  badgeName?: string;
  description?: string;
  xpReward?: number;
  progressTarget?: number;
  xpAwarded?: number;
  category?: string;
  rarity?: BadgeDefinition['rarity'];
  unlockedAt?: Timestamp | any | null;
  earnedAt: Timestamp | any | null;
  progress: number;
  isUnlocked: boolean;
  claimed?: boolean;
}

export interface UserPreferences {
  uid: string;
  hasClaimedWelcomeBadge: boolean;
}

export interface UserIntegration {
  uid: string;
  googleCalendarConnected: boolean;
  googleTasksConnected: boolean;
  gmailConnected: boolean;
  driveConnected: boolean;
  lastSync: Timestamp | any | null;
}

export interface UserXPHistory {
  uid: string;
  action: string;
  xpEarned: number;
  timestamp: Timestamp | any;
}

export interface DbTask {
  id?: string;
  userId: string;
  title: string;
  description: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'overdue';
  completed: boolean;
  dueDate: Timestamp | any;
  dueTime?: string;
  durationMinutes?: number;
  progress?: number;
  tags?: string[];
  reminder?: boolean;
  reminderMinutesBefore?: number;
  repeatRule?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | '';
  linkedCalendarEventId?: string | null;
  linkedCalendarEvent?: boolean;
  subject?: string;
  faculty?: string;
  marksWeightage?: number;
  attachments?: string[];
  notes?: string;
  projectName?: string;
  team?: string;
  estimatedHours?: number;
  customCategory?: string;
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
  completedAt?: Timestamp | any | null;
  location?: string;
  guests?: string[];
  repeatFrequency?: string;
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

export interface DbEvent {
  id?: string;
  userId: string;
  title: string;
  startTime: Timestamp | any;
  endTime: Timestamp | any;
  source: 'manual' | 'google-calendar';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Timestamp | any;
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
  xpReward?: number;
  type?: 'Event' | 'Task' | 'Assignment' | 'Routine' | 'Study' | 'Workout' | 'Break' | 'Meeting' | 'Reminder' | 'Class' | 'Habit' | 'AI Block';
  isRecurring?: boolean;
  recurrenceRule?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'biweekly' | 'monthly' | 'custom-days' | 'custom-weeks' | 'semester';
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  recurrenceUntil?: string;
  repeatSeriesId?: string;
  isException?: boolean;
  exceptionDates?: string[];
  isAiScheduled?: boolean;
  aiReason?: string;
  flexibleScheduling?: boolean;
  breakAfterTask?: boolean;
  rescheduleCount?: number;
  // Goal-event fields
  goalId?: string;
  isGoalEvent?: boolean;
  goalSchedulingType?: 'fixed' | 'flexible' | 'ai';
  sessionIndex?: number;
  missedAt?: string;
  rescheduledFrom?: string;
  lastModifiedByUser?: string | null;
  updatedAt?: any;
}

export interface DbGoal {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  target: number;
  status: 'active' | 'completed' | 'archived' | 'paused';
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
  // Scheduling
  schedulingType?: 'ai' | 'fixed' | 'flexible';
  fixedStartTime?: string;
  fixedEndTime?: string;
  flexWindowStart?: string;
  flexWindowEnd?: string;
  sessionDurationMins?: number;
  sessionsPerWeek?: number;
  repeatDays?: number[];
  repeatRule?: 'daily' | 'weekdays' | 'weekends' | 'selected' | 'monthly';
  targetDate?: string;
  estimatedWeeklyHours?: number;
  progressType?: 'percentage' | 'sessions' | 'hours';
  // Lock persistence
  isLocked?: boolean;
  lastModifiedByUser?: string | null;
  // Sync
  linkedEventIds?: string[];
  completedSessions?: number;
  totalSessions?: number;
  currentStreak?: number;
  longestStreak?: number;
  lastCompletedDate?: string;
  missedDates?: string[];
}

export interface Habit {
  id?: string;
  userId: string;
  title: string;
  completedToday: boolean;
  lastCompletedDate: string | null;
  createdAt: Timestamp | any;
  // Extended fields (used by UI)
  description?: string;
  icon?: string;
  category?: string;
  preferredTime?: string;
  duration?: number;
  repeat?: 'daily' | 'weekdays' | 'weekends' | 'custom' | 'monthly';
  lockTime?: boolean;
  isLocked?: boolean;
  allowAiReschedule?: boolean;
  reminder?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  currentStreak?: number;
  longestStreak?: number;
  completionRate?: number;
  // Lock persistence
  lastModifiedByUser?: string | null;
  updatedAt?: Timestamp | any;
}

export interface Note {
  id?: string;
  userId: string;
  title: string;
  body: string;
  updatedAt: Timestamp | any;
  accent: string;
}

export interface BadgeDefinition {
  badgeId: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  requirementType: string;
  requirementValue: number;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isHidden: boolean;
}

export const MASTER_BADGES: BadgeDefinition[] = [
  {
    badgeId: 'welcome_aboard',
    title: 'Welcome Aboard',
    description: 'First successful login',
    category: 'BEGINNER',
    xpReward: 25,
    requirementType: 'login',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'common',
    isHidden: false
  },
  {
    badgeId: 'first_task',
    title: 'First Task',
    description: 'Complete your first task',
    category: 'BEGINNER',
    xpReward: 20,
    requirementType: 'task_completed',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'common',
    isHidden: false
  },
  {
    badgeId: 'first_goal',
    title: 'First Goal',
    description: 'Create your first goal',
    category: 'BEGINNER',
    xpReward: 20,
    requirementType: 'goal_created',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'common',
    isHidden: false
  },
  {
    badgeId: 'first_note',
    title: 'First Note',
    description: 'Create your first note',
    category: 'BEGINNER',
    xpReward: 10,
    requirementType: 'note_created',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'common',
    isHidden: false
  },
  {
    badgeId: 'calendar_connected',
    title: 'Calendar Connected',
    description: 'Connect Google Calendar',
    category: 'BEGINNER',
    xpReward: 25,
    requirementType: 'calendar_connected',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'common',
    isHidden: false
  },
  {
    badgeId: 'streak_7',
    title: '7 Day Streak',
    description: '7 login days',
    category: 'CONSISTENCY',
    xpReward: 50,
    requirementType: 'streak',
    requirementValue: 7,
    iconUrl: '',
    rarity: 'rare',
    isHidden: false
  },
  {
    badgeId: 'streak_30',
    title: '30 Day Streak',
    description: '30 login days',
    category: 'CONSISTENCY',
    xpReward: 150,
    requirementType: 'streak',
    requirementValue: 30,
    iconUrl: '',
    rarity: 'rare',
    isHidden: false
  },
  {
    badgeId: 'streak_100',
    title: '100 Day Streak',
    description: '100 login days',
    category: 'CONSISTENCY',
    xpReward: 500,
    requirementType: 'streak',
    requirementValue: 100,
    iconUrl: '',
    rarity: 'epic',
    isHidden: false
  },
  {
    badgeId: 'goal_achiever',
    title: 'Goal Achiever',
    description: 'Complete 1 Goal',
    category: 'PRODUCTIVITY',
    xpReward: 50,
    requirementType: 'goal_completed',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'common',
    isHidden: false
  },
  {
    badgeId: 'goal_master',
    title: 'Goal Master',
    description: 'Complete 10 Goals',
    category: 'PRODUCTIVITY',
    xpReward: 250,
    requirementType: 'goal_completed',
    requirementValue: 10,
    iconUrl: '',
    rarity: 'rare',
    isHidden: false
  },
  {
    badgeId: 'task_crusher',
    title: 'Task Crusher',
    description: 'Complete 50 Tasks',
    category: 'PRODUCTIVITY',
    xpReward: 250,
    requirementType: 'task_completed',
    requirementValue: 50,
    iconUrl: '',
    rarity: 'rare',
    isHidden: false
  },
  {
    badgeId: 'productivity_machine',
    title: 'Productivity Machine',
    description: 'Complete 250 Tasks',
    category: 'PRODUCTIVITY',
    xpReward: 1000,
    requirementType: 'task_completed',
    requirementValue: 250,
    iconUrl: '',
    rarity: 'epic',
    isHidden: false
  },
  {
    badgeId: 'ai_explorer',
    title: 'AI Explorer',
    description: 'Use AI Coach 10 Times',
    category: 'AI',
    xpReward: 50,
    requirementType: 'ai_used',
    requirementValue: 10,
    iconUrl: '',
    rarity: 'rare',
    isHidden: false
  },
  {
    badgeId: 'ai_power_user',
    title: 'AI Power User',
    description: 'Use AI Coach 100 Times',
    category: 'AI',
    xpReward: 500,
    requirementType: 'ai_used',
    requirementValue: 100,
    iconUrl: '',
    rarity: 'epic',
    isHidden: false
  },
  {
    badgeId: 'early_adopter',
    title: 'Early Adopter',
    description: 'First month users',
    category: 'SPECIAL',
    xpReward: 100,
    requirementType: 'early_adopter',
    requirementValue: 1,
    iconUrl: '',
    rarity: 'rare',
    isHidden: false
  },
  {
    badgeId: 'momentum_legend',
    title: 'Momentum Legend',
    description: 'Unlock all major badges',
    category: 'SPECIAL',
    xpReward: 2000,
    requirementType: 'all_badges',
    requirementValue: 15,
    iconUrl: '',
    rarity: 'legendary',
    isHidden: false
  }
];

export const ALL_BADGE_IDS = MASTER_BADGES.map(b => b.badgeId);

const BADGE_UNLOCK_NOTIFICATION_TITLE = '\u{1F389} New Badge Earned!';

function calculateLevelFromXp(xp: number): number {
  const thresholds = [
    0,     // L1
    100,   // L2
    300,   // L3
    600,   // L4
    1000,  // L5
    1500,  // L6
    2500,  // L7
    3500,  // L8
    5000,  // L9
    7000,  // L10
    9500,  // L11
    12500, // L12
    16000, // L13
    20000, // L14
    25000, // L15
    31000, // L16
    38000, // L17
    46000, // L18
    55000, // L19
    65000, // L20
    77000, // L21
    91000, // L22
    107000,// L23
    125000,// L24
    150000 // L25
  ];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 25);
}

/**
 * Computes a 0-100 momentum score from user stats.
 */
function computeMomentumScore(stats: UserStats): number {
  const streakPoints = Math.min((stats.currentStreak || 0) * 2, 30);
  const taskPoints = Math.min((stats.tasksCompleted || 0) * 0.3, 25);
  const goalPoints = Math.min((stats.goalsCompleted || 0) * 3, 20);
  const levelPoints = Math.min((stats.level || 1) * 1.5, 20);
  const habitPoints = Math.min((stats.habitsCompleted || 0) * 0.2, 5);
  return Math.min(Math.round(streakPoints + taskPoints + goalPoints + levelPoints + habitPoints), 100);
}

async function getBadgeDefinitions(): Promise<BadgeDefinition[]> {
  const definitionsSnap = await getDocs(collection(db, 'badge_definitions'));
  if (definitionsSnap.empty) {
    return MASTER_BADGES;
  }

  const definitions = definitionsSnap.docs.map((definitionDoc) => definitionDoc.data() as BadgeDefinition);
  return definitions.sort(
    (left, right) => ALL_BADGE_IDS.indexOf(left.badgeId) - ALL_BADGE_IDS.indexOf(right.badgeId)
  );
}

async function getBadgeDefinitionById(badgeId: string): Promise<BadgeDefinition | null> {
  const definitionSnap = await getDoc(doc(db, 'badge_definitions', badgeId));
  if (definitionSnap.exists()) {
    return definitionSnap.data() as BadgeDefinition;
  }

  return MASTER_BADGES.find((badge) => badge.badgeId === badgeId) ?? null;
}

function createUserBadgeRecord(
  uid: string,
  badge: BadgeDefinition,
  overrides: Partial<UserBadge> = {}
) {
  return {
    uid,
    badgeId: badge.badgeId,
    badgeName: badge.title,
    description: badge.description,
    xpReward: badge.xpReward,
    progress: 0,
    progressTarget: badge.requirementValue,
    xpAwarded: badge.xpReward,
    isUnlocked: false,
    earnedAt: null,
    claimed: false,
    category: badge.category,
    rarity: badge.rarity,
    ...overrides,
  };
}

async function createBadgeNotification(uid: string, badgeTitle: string): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    uid,
    title: BADGE_UNLOCK_NOTIFICATION_TITLE,
    message: `You unlocked the '${badgeTitle}' badge!`,
    createdAt: serverTimestamp(),
    read: false,
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid), where('read', '==', false));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true });
  });
  await batch.commit();
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const docRef = doc(db, 'notifications', notificationId);
  await deleteDoc(docRef);
}

export async function seedBadgeDefinitions(): Promise<void> {
  const colRef = collection(db, 'badge_definitions');
  const snap = await getDocs(colRef);
  const existingBadgeIds = new Set(snap.docs.map((badgeDoc) => badgeDoc.id));
  const missingBadges = MASTER_BADGES.filter((badge) => !existingBadgeIds.has(badge.badgeId));

  if (missingBadges.length > 0) {
    const batch = writeBatch(db);
    for (const badge of missingBadges) {
      batch.set(doc(db, 'badge_definitions', badge.badgeId), badge, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Transactionally awards XP to user and adds an entry in the user_xp_history collection.
 * Also checks if the user levels up.
 */
export async function awardXPAndLog(uid: string, action: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  
  const statsRef = doc(db, 'user_stats', uid);
  const xpHistoryRef = collection(db, 'user_xp_history');
  const userRef = doc(db, 'users', uid);
  
  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsRef);
    if (!statsSnap.exists()) return;
    
    const statsData = statsSnap.data() as UserStats;
    const currentXp = statsData.xp || 0;
    const newXp = currentXp + amount;
    const newLevel = calculateLevelFromXp(newXp);
    const updatedStats = { ...statsData, xp: newXp, level: newLevel };
    const momentumScore = computeMomentumScore(updatedStats);
    
    transaction.update(statsRef, { xp: newXp, level: newLevel });
    transaction.update(userRef, { momentumScore, xp: newXp, level: newLevel });
    
    const newHistoryDocRef = doc(xpHistoryRef);
    transaction.set(newHistoryDocRef, {
      uid,
      action,
      xpEarned: amount,
      timestamp: serverTimestamp()
    });
  });
}

/**
 * Checks and awards the Momentum Legend badge if all 15 other badges are unlocked.
 */
export async function checkAndAwardMomentumLegend(uid: string): Promise<void> {
  const legendRef = doc(db, 'user_badges', `${uid}_momentum_legend`);
  const legendSnap = await getDoc(legendRef);
  if (!legendSnap.exists() || legendSnap.data()?.isUnlocked) return;
  
  const legendDefinition = await getBadgeDefinitionById('momentum_legend');
  const target = legendDefinition?.requirementValue ?? 15;
  const unlockedBadgesSnap = await getDocs(
    query(collection(db, 'user_badges'), where('uid', '==', uid), where('isUnlocked', '==', true))
  );
  const unlockedCount = unlockedBadgesSnap.docs.filter(
    (badgeDoc) => badgeDoc.data().badgeId !== 'momentum_legend'
  ).length;
  
  if (unlockedCount >= target) {
    await updateDoc(legendRef, {
      progress: target,
      isUnlocked: true,
      earnedAt: serverTimestamp()
    });
    
    await createBadgeNotification(uid, legendDefinition?.title ?? 'Momentum Legend');
    /* legacy notification block removed
      title: "🎉 New Badge Earned!",
      message: "You unlocked the 'Momentum Legend' badge!",
      createdAt: serverTimestamp(),
      read: false
    */
  } else {
    await updateDoc(legendRef, {
      progress: unlockedCount
    });
  }
}

/**
 * Safely updates badge progress and unlocks the badge if the target is met.
 */
export async function updateBadgeProgress(uid: string, badgeId: string, progressVal: number): Promise<void> {
  const badgeDefinition = await getBadgeDefinitionById(badgeId);
  if (!badgeDefinition) return;

  const badgeRef = doc(db, 'user_badges', `${uid}_${badgeId}`);
  const badgeSnap = await getDoc(badgeRef);
  if (!badgeSnap.exists()) return;
  
  const badgeData = badgeSnap.data() as UserBadge;
  if (badgeData.isUnlocked) return;
  
  const target = badgeDefinition.requirementValue || badgeData.progressTarget || 1;
  const isUnlocked = progressVal >= target;
  
  await updateDoc(badgeRef, {
    progress: isUnlocked ? target : Math.min(progressVal, target),
    isUnlocked,
    earnedAt: isUnlocked ? serverTimestamp() : null
  });
  
  if (isUnlocked) {
    await createBadgeNotification(uid, badgeDefinition.title || badgeData.badgeName || badgeId);
    /* legacy notification block removed
      title: "🎉 New Badge Earned!",
      message: `You unlocked the '${badgeData.badgeName || badgeId}' badge!`,
      createdAt: serverTimestamp(),
      read: false
    */
    
    if (badgeId !== 'momentum_legend') {
      await checkAndAwardMomentumLegend(uid);
    }
  }
}

/**
 * Claims a badge reward, awards the XP, and sets claimed to true in firestore.
 */
export async function claimBadgeReward(uid: string, badgeId: string, xpReward: number): Promise<void> {
  const badgeRef = doc(db, 'user_badges', `${uid}_${badgeId}`);
  const statsRef = doc(db, 'user_stats', uid);
  const preferencesRef = doc(db, 'user_preferences', uid);
  const xpHistoryRef = doc(collection(db, 'user_xp_history'));

  await runTransaction(db, async (transaction) => {
    const [badgeSnap, statsSnap] = await Promise.all([
      transaction.get(badgeRef),
      transaction.get(statsRef)
    ]);

    if (!badgeSnap.exists() || !statsSnap.exists()) return;

    const badgeData = badgeSnap.data() as UserBadge;
    if (!badgeData.isUnlocked || badgeData.claimed) return;

    const reward = badgeData.xpReward ?? xpReward;
    const statsData = statsSnap.data() as UserStats;
    const nextXp = (statsData.xp || 0) + reward;

    transaction.update(badgeRef, { claimed: true });
    transaction.update(statsRef, {
      xp: nextXp,
      level: calculateLevelFromXp(nextXp)
    });
    transaction.set(xpHistoryRef, {
      uid,
      action: `BADGE_UNLOCKED_${badgeId.toUpperCase()}`,
      xpEarned: reward,
      timestamp: serverTimestamp()
    });

    if (badgeId === 'welcome_aboard') {
      transaction.set(preferencesRef, {
        uid,
        hasClaimedWelcomeBadge: true
      }, { merge: true });
    }
  });
}

/**
 * Checks if a user profile and stats exist in Firestore.
 * If not, initializes all required collections. Otherwise updates login/streak details.
 */
export async function ensureUserProfile(user: User, displayNameOverride?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  const statsRef = doc(db, 'user_stats', user.uid);
  const integrationsRef = doc(db, 'user_integrations', user.uid);
  const now = new Date();

  // 1. Seed definitions
  try {
    await seedBadgeDefinitions();
  } catch (err) {
    console.error('Error seeding badge definitions:', err);
  }
  const badgeDefinitions = await getBadgeDefinitions();

  // 1b. Migrate planner data to new calendar collections if needed
  try {
    await dbMigratePlannerToCalendar(user.uid);
  } catch (err) {
    console.error('Error running planner to calendar migration:', err);
  }

  if (!userSnap.exists()) {
    // Create users profile
    const defaultProfile: UserProfile = {
      uid: user.uid,
      displayName: displayNameOverride || user.displayName || 'Momentum User',
      email: user.email || '',
      avatar: 'Professional Male 1',
      bio: '',
      theme: 'dark',
      momentumScore: 87,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      level: 3,
      xp: 720,
      bestStreak: 31,
      activeDays: 87,
      aiInteractions: 14,
      college: 'Momentum Academy',
      role: 'AI Explorer',
      location: 'San Francisco, CA'
    };
    await setDoc(userRef, defaultProfile);

    // Initialize user_stats at level 1, 0 XP
    const defaultStats: UserStats = {
      uid: user.uid,
      xp: 0,
      level: 1,
      currentStreak: 1,
      bestStreak: 1,
      tasksCompleted: 0,
      goalsCompleted: 0,
      habitsCompleted: 0,
      aiInteractions: 0,
      loginCount: 1
    };
    await setDoc(statsRef, defaultStats);

    // Initialize user_integrations
    const defaultIntegrations: UserIntegration = {
      uid: user.uid,
      googleCalendarConnected: false,
      googleTasksConnected: false,
      gmailConnected: false,
      driveConnected: false,
      lastSync: null
    };
    await setDoc(integrationsRef, defaultIntegrations);

    // Initialize user_preferences
    const preferencesRef = doc(db, 'user_preferences', user.uid);
    await setDoc(preferencesRef, {
      uid: user.uid,
      hasClaimedWelcomeBadge: false
    });

    for (const badge of badgeDefinitions) {
      const badgeRef = doc(db, 'user_badges', `${user.uid}_${badge.badgeId}`);
      const isWelcome = badge.badgeId === 'welcome_aboard';
      await setDoc(badgeRef, createUserBadgeRecord(user.uid, badge, {
        unlockedAt: isWelcome ? serverTimestamp() : null,
        earnedAt: isWelcome ? serverTimestamp() : null,
        progress: isWelcome ? 1 : 0,
        isUnlocked: isWelcome
      }));
      
      if (isWelcome) {
        await createBadgeNotification(user.uid, badge.title);
        /* legacy notification block removed
          title: "🎉 New Badge Earned!",
          message: "You unlocked the 'Welcome Aboard' badge!",
          createdAt: serverTimestamp(),
          read: false
        */
      }
    }

    // Award daily login XP
    await awardXPAndLog(user.uid, 'DAILY_LOGIN', 5);
    await awardXPAndLog(user.uid, 'STREAK_BONUS', 2);
    await updateBadgeProgress(user.uid, 'early_adopter', 1);

    return defaultProfile;
  } else {
    // User already exists.
    const userData = userSnap.data() as UserProfile;
    const lastLoginVal = userData.lastLogin;

    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (lastLoginVal) {
      const lastLoginDate = lastLoginVal.toDate ? lastLoginVal.toDate() : new Date(lastLoginVal);
      const todayStr = now.toDateString();
      const lastStr = lastLoginDate.toDateString();

      if (todayStr !== lastStr) {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        const statsSnap = await getDoc(statsRef);
        if (statsSnap.exists()) {
          const stats = statsSnap.data() as UserStats;
          let newStreak = stats.currentStreak || 0;
          const bestStreak = stats.bestStreak || 0;
          const loginCount = (stats.loginCount || 0) + 1;

          if (lastStr === yesterdayStr) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }

          const updatedStats = {
            currentStreak: newStreak,
            bestStreak: Math.max(bestStreak, newStreak),
            loginCount
          };
          await updateDoc(statsRef, updatedStats);

          await awardXPAndLog(user.uid, 'DAILY_LOGIN', 5);
          await awardXPAndLog(user.uid, 'STREAK_BONUS', 2 * newStreak);

          if (newStreak % 7 === 0) {
            await awardXPAndLog(user.uid, 'WEEKLY_PERFECT_STREAK', 100);
          }
          if (newStreak % 30 === 0) {
            await awardXPAndLog(user.uid, 'MONTHLY_PERFECT_STREAK', 500);
          }

          await updateBadgeProgress(user.uid, 'streak_7', newStreak);
          await updateBadgeProgress(user.uid, 'streak_30', newStreak);
          await updateBadgeProgress(user.uid, 'streak_100', newStreak);
        }

        // Reset habits completedToday on a new day
        const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
        const habitsSnap = await getDocs(habitsQuery);
        for (const hDoc of habitsSnap.docs) {
          if (hDoc.data().completedToday) {
            await updateDoc(doc(db, 'habits', hDoc.id), { completedToday: false });
          }
        }
      }
    }

    const preferencesRef = doc(db, 'user_preferences', user.uid);
    const prefSnap = await getDoc(preferencesRef);
    if (!prefSnap.exists()) {
      await setDoc(preferencesRef, {
        uid: user.uid,
        hasClaimedWelcomeBadge: false
      });
    }

    for (const badge of badgeDefinitions) {
      const badgeRef = doc(db, 'user_badges', `${user.uid}_${badge.badgeId}`);
      const bSnap = await getDoc(badgeRef);
      if (!bSnap.exists()) {
        const oldHyphenId = badge.badgeId.replace(/_/g, '-');
        const oldRef = doc(db, 'user_badges', `${user.uid}_${oldHyphenId}`);
        const oldSnap = await getDoc(oldRef);
        
        let progress = 0;
        let isUnlocked = false;
        let earnedAt = null;
        let claimed = false;
        
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          progress = oldData.progress ?? 0;
          isUnlocked = oldData.isUnlocked ?? false;
          earnedAt = oldData.earnedAt || oldData.unlockedAt || null;
          claimed = oldData.claimed ?? false;
        } else if (badge.badgeId === 'welcome_aboard') {
          progress = 1;
          isUnlocked = true;
          earnedAt = serverTimestamp();
        }
        
        await setDoc(badgeRef, {
          ...createUserBadgeRecord(user.uid, badge, {
            isUnlocked,
            earnedAt,
            progress,
            claimed
          }),
          unlockedAt: earnedAt
        });
      } else {
        const bData = bSnap.data();
        if (
          bData.progressTarget === undefined ||
          bData.xpAwarded === undefined ||
          bData.badgeName === undefined ||
          bData.category === undefined ||
          bData.rarity === undefined
        ) {
          await updateDoc(badgeRef, {
            badgeName: badge.title,
            description: badge.description,
            xpReward: badge.xpReward,
            progressTarget: badge.requirementValue,
            xpAwarded: badge.xpReward,
            category: badge.category,
            rarity: badge.rarity,
            claimed: bData.claimed ?? false
          });
        }
      }
    }

    return userData;
  }
}

/**
 * Updates properties on the user's profile document.
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Adds a new task.
 */
export async function dbAddTask(
  userId: string,
  task: {
    title: string;
    description: string;
    category?: string;
    priority: DbTask['priority'];
    status?: DbTask['status'];
    completed: boolean;
    dueDate: Date;
    dueTime?: string;
    durationMinutes?: number;
    progress?: number;
    tags?: string[];
    reminder?: boolean;
    reminderMinutesBefore?: number;
    repeatRule?: DbTask['repeatRule'];
    linkedCalendarEventId?: string | null;
    linkedCalendarEvent?: boolean;
    subject?: string;
    faculty?: string;
    marksWeightage?: number;
    attachments?: string[];
    notes?: string;
    projectName?: string;
    team?: string;
    estimatedHours?: number;
    customCategory?: string;
    location?: string;
    guests?: string[];
    repeatFrequency?: string;
    goal?: string;
    streak?: number;
    endTime?: string;
  }
): Promise<string> {
  const tasksRef = collection(db, 'tasks');
  const docRef = await addDoc(tasksRef, {
    userId,
    title: task.title,
    description: task.description || '',
    category: task.category || 'Other',
    priority: task.priority,
    status: task.status || (task.completed ? 'completed' : 'not_started'),
    completed: task.completed,
    dueDate: task.dueDate,
    dueTime: task.dueTime || '',
    durationMinutes: task.durationMinutes ?? 30,
    progress: task.progress ?? (task.completed ? 100 : 0),
    tags: task.tags || [],
    reminder: task.reminder ?? false,
    reminderMinutesBefore: task.reminderMinutesBefore ?? 30,
    repeatRule: task.repeatRule || '',
    linkedCalendarEventId: task.linkedCalendarEventId || null,
    linkedCalendarEvent: task.linkedCalendarEvent ?? false,
    subject: task.subject || '',
    faculty: task.faculty || '',
    marksWeightage: task.marksWeightage ?? 0,
    attachments: task.attachments || [],
    notes: task.notes || '',
    projectName: task.projectName || '',
    team: task.team || '',
    estimatedHours: task.estimatedHours ?? 0,
    customCategory: task.customCategory || '',
    location: task.location || '',
    guests: task.guests || [],
    repeatFrequency: task.repeatFrequency || '',
    goal: task.goal || '',
    streak: task.streak ?? 0,
    endTime: task.endTime || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: task.completed ? serverTimestamp() : null,
  });
  
  await awardXPAndLog(userId, 'TASK_CREATED', 2);
  return docRef.id;
}

/**
 * Updates a task.
 */
export async function dbUpdateTask(
  taskId: string,
  data: Partial<Omit<DbTask, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggles a task's completion status and awards XP.
 */
export async function dbToggleTaskCompleted(taskId: string, completed: boolean): Promise<void> {
  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) return;
  const taskData = taskSnap.data() as DbTask;
  const userId = taskData.userId;

  await updateDoc(taskRef, {
    completed,
    status: completed ? 'completed' : (taskData.status || 'not_started'),
    completedAt: completed ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });

  if (completed) {
    // Priority-aware XP rewards
    const priorityXpMap: Record<string, number> = {
      critical: 50,
      high: 25,
      medium: 10,
      low: 5,
    };
    const xpEarned = priorityXpMap[taskData.priority || 'medium'] ?? 10;
    await awardXPAndLog(userId, `TASK_COMPLETED_${(taskData.priority || 'MEDIUM').toUpperCase()}`, xpEarned);

    const statsRef = doc(db, 'user_stats', userId);
    const statsSnap = await getDoc(statsRef);
    let tasksCompletedVal = 1;
    if (statsSnap.exists()) {
      const stats = statsSnap.data() as UserStats;
      tasksCompletedVal = (stats.tasksCompleted || 0) + 1;
      const momentumScore = computeMomentumScore({ ...stats, tasksCompleted: tasksCompletedVal });
      await updateDoc(statsRef, { tasksCompleted: tasksCompletedVal });
      await updateDoc(doc(db, 'users', userId), { momentumScore });
    }

    await updateBadgeProgress(userId, 'first_task', 1);
    await updateBadgeProgress(userId, 'task_crusher', tasksCompletedVal);
    await updateBadgeProgress(userId, 'productivity_machine', tasksCompletedVal);
  }

  if (taskData.linkedCalendarEventId) {
    try {
      await updateDoc(doc(db, 'calendar_events', taskData.linkedCalendarEventId), {
        completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error syncing linked calendar event from task completion:', err);
    }
  }
}

/**
 * Deletes a task.
 */
export async function dbDeleteTask(taskId: string): Promise<void> {
  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (taskSnap.exists()) {
    const taskData = taskSnap.data() as DbTask;
    if (taskData.linkedCalendarEventId) {
      try {
        await deleteDoc(doc(db, 'calendar_events', taskData.linkedCalendarEventId));
      } catch (err) {
        console.error('Error deleting linked calendar event:', err);
      }
    }
  }
  await deleteDoc(taskRef);
}

/**
 * Adds a calendar event.
 */
export async function dbAddEvent(
  userId: string,
  event: {
    title: string;
    startTime: Date;
    endTime: Date;
    source: DbEvent['source'];
    priority?: DbEvent['priority'];
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
    xpReward?: number;
    type?: DbEvent['type'];
    isRecurring?: boolean;
    recurrenceRule?: DbEvent['recurrenceRule'];
    recurrenceInterval?: number;
    recurrenceDays?: number[];
    recurrenceUntil?: string;
    repeatSeriesId?: string;
    isException?: boolean;
    exceptionDates?: string[];
    isAiScheduled?: boolean;
    aiReason?: string;
    flexibleScheduling?: boolean;
    breakAfterTask?: boolean;
    rescheduleCount?: number;
  }
): Promise<string> {
  const eventsRef = collection(db, 'calendar_events');
  const cleanEvent: any = {
    userId,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    source: event.source,
    priority: event.priority || 'medium',
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
    xpReward: event.xpReward || 0,
    createdAt: serverTimestamp(),
  };

  if (event.type !== undefined) cleanEvent.type = event.type;
  if (event.isRecurring !== undefined) cleanEvent.isRecurring = event.isRecurring;
  if (event.recurrenceRule !== undefined) cleanEvent.recurrenceRule = event.recurrenceRule;
  if (event.recurrenceInterval !== undefined) cleanEvent.recurrenceInterval = event.recurrenceInterval;
  if (event.recurrenceDays !== undefined) cleanEvent.recurrenceDays = event.recurrenceDays;
  if (event.recurrenceUntil !== undefined) cleanEvent.recurrenceUntil = event.recurrenceUntil;
  if (event.repeatSeriesId !== undefined) cleanEvent.repeatSeriesId = event.repeatSeriesId;
  if (event.isException !== undefined) cleanEvent.isException = event.isException;
  if (event.exceptionDates !== undefined) cleanEvent.exceptionDates = event.exceptionDates;
  if (event.isAiScheduled !== undefined) cleanEvent.isAiScheduled = event.isAiScheduled;
  if (event.aiReason !== undefined) cleanEvent.aiReason = event.aiReason;
  if (event.flexibleScheduling !== undefined) cleanEvent.flexibleScheduling = event.flexibleScheduling;
  if (event.breakAfterTask !== undefined) cleanEvent.breakAfterTask = event.breakAfterTask;
  if (event.rescheduleCount !== undefined) cleanEvent.rescheduleCount = event.rescheduleCount;

  const docRef = await addDoc(eventsRef, cleanEvent);
  return docRef.id;
}

/**
 * Updates a calendar event.
 */
export async function dbUpdateEvent(
  eventId: string,
  data: Partial<DbEvent>
): Promise<void> {
  const eventRef = doc(db, 'calendar_events', eventId);
  const updateData: any = { ...data };
  await updateDoc(eventRef, updateData);
}

/**
 * Deletes a calendar event.
 */
export async function dbDeleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'calendar_events', eventId);
  await deleteDoc(eventRef);
}

/**
 * Adds a new daily habit.
 */
export async function dbAddHabit(userId: string, title: string): Promise<void> {
  const habitsRef = collection(db, 'habits');
  await addDoc(habitsRef, {
    userId,
    title,
    completedToday: false,
    lastCompletedDate: null,
    createdAt: serverTimestamp()
  });

  await awardXPAndLog(userId, 'HABIT_CREATED', 3);
}

/**
 * Toggles a habit completion.
 */
export async function dbToggleHabitCompleted(userId: string, habitId: string, completed: boolean): Promise<void> {
  const habitRef = doc(db, 'habits', habitId);
  const nowStr = new Date().toDateString();

  await updateDoc(habitRef, {
    completedToday: completed,
    lastCompletedDate: completed ? nowStr : null
  });

  if (completed) {
    await awardXPAndLog(userId, 'HABIT_COMPLETED', 15);

    const statsRef = doc(db, 'user_stats', userId);
    const statsSnap = await getDoc(statsRef);
    let habitsCompletedVal = 1;
    if (statsSnap.exists()) {
      const stats = statsSnap.data() as UserStats;
      habitsCompletedVal = (stats.habitsCompleted || 0) + 1;
      const momentumScore = computeMomentumScore({ ...stats, habitsCompleted: habitsCompletedVal });
      await updateDoc(statsRef, { habitsCompleted: habitsCompletedVal });
      await updateDoc(doc(db, 'users', userId), { momentumScore });
    }
  }
}

/**
 * Deletes a habit and all its linked calendar events.
 */
export async function dbDeleteHabit(habitId: string, linkedEventIds?: string[]): Promise<void> {
  // Delete linked calendar events
  if (linkedEventIds && linkedEventIds.length > 0) {
    const eventsRef = collection(db, 'calendar_events');
    const CHUNK = 400;
    for (let i = 0; i < linkedEventIds.length; i += CHUNK) {
      const batch = writeBatch(db);
      const chunk = linkedEventIds.slice(i, i + CHUNK);
      for (const eventId of chunk) {
        batch.delete(doc(eventsRef, eventId));
      }
      await batch.commit();
    }
  }
  // Delete the habit document
  const habitRef = doc(db, 'habits', habitId);
  await deleteDoc(habitRef);
}

/**
 * Creates a habit with full calendar event integration.
 * Saves the habit doc then batch-writes all generated calendar events.
 * Returns the new habit ID.
 */
export async function dbCreateHabitWithSchedule(
  userId: string,
  habitData: Record<string, any>,
  eventSpecs: Array<{
    date: string; start: string; end: string;
    isLocked: boolean;
    icon?: string;
    category?: string;
  }>
): Promise<string> {
  // 1. Create the habit document
  const habitsRef = collection(db, 'habits');
  const habitRef = await addDoc(habitsRef, {
    ...habitData,
    userId,
    completedToday: false,
    lastCompletedDate: null,
    linkedEventIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const habitId = habitRef.id;

  // 2. Batch-create calendar events tagged with habitId
  const eventsRef = collection(db, 'calendar_events');
  const linkedIds: string[] = [];

  const CHUNK = 400;
  for (let i = 0; i < eventSpecs.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = eventSpecs.slice(i, i + CHUNK);
    for (const spec of chunk) {
      const startDate = new Date(`${spec.date}T00:00:00`);
      const [sh, sm, sap] = parseTimeParts(spec.start);
      const [eh, em, eap] = parseTimeParts(spec.end);
      startDate.setHours(sap === 'PM' && sh < 12 ? sh + 12 : (sap === 'AM' && sh === 12 ? 0 : sh), sm, 0, 0);
      const endDate = new Date(`${spec.date}T00:00:00`);
      endDate.setHours(eap === 'PM' && eh < 12 ? eh + 12 : (eap === 'AM' && eh === 12 ? 0 : eh), em, 0, 0);

      const evRef = doc(eventsRef);
      linkedIds.push(evRef.id);
      batch.set(evRef, {
        userId,
        habitId,
        isHabitEvent: true,
        sourceType: 'habit',
        sourceId: habitId,
        title: habitData.title || '',
        icon: spec.icon || '🔥',
        category: spec.category || 'Health',
        startTime: startDate,
        endTime: endDate,
        source: 'manual',
        priority: 'medium',
        flexibleScheduling: !spec.isLocked,
        isLocked: spec.isLocked,
        completed: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // 3. Patch linkedEventIds back onto the habit
  await updateDoc(habitRef, { linkedEventIds: linkedIds });

  await awardXPAndLog(userId, 'HABIT_CREATED', 3);
  return habitId;
}

/**
 * Updates a habit and regenerates all its calendar events.
 */
export async function dbUpdateHabitSchedule(
  userId: string,
  habitId: string,
  habitData: Record<string, any>,
  eventSpecs: Array<{
    date: string; start: string; end: string;
    isLocked: boolean;
    icon?: string;
    category?: string;
  }>,
  oldLinkedEventIds?: string[]
): Promise<void> {
  // 1. Delete old linked events
  if (oldLinkedEventIds && oldLinkedEventIds.length > 0) {
    const eventsRef = collection(db, 'calendar_events');
    const CHUNK = 400;
    for (let i = 0; i < oldLinkedEventIds.length; i += CHUNK) {
      const batch = writeBatch(db);
      const chunk = oldLinkedEventIds.slice(i, i + CHUNK);
      for (const eventId of chunk) {
        batch.delete(doc(eventsRef, eventId));
      }
      await batch.commit();
    }
  }

  // 2. Batch-create new events
  const eventsRef = collection(db, 'calendar_events');
  const linkedIds: string[] = [];

  const CHUNK = 400;
  for (let i = 0; i < eventSpecs.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = eventSpecs.slice(i, i + CHUNK);
    for (const spec of chunk) {
      const startDate = new Date(`${spec.date}T00:00:00`);
      const [sh, sm, sap] = parseTimeParts(spec.start);
      const [eh, em, eap] = parseTimeParts(spec.end);
      startDate.setHours(sap === 'PM' && sh < 12 ? sh + 12 : (sap === 'AM' && sh === 12 ? 0 : sh), sm, 0, 0);
      const endDate = new Date(`${spec.date}T00:00:00`);
      endDate.setHours(eap === 'PM' && eh < 12 ? eh + 12 : (eap === 'AM' && eh === 12 ? 0 : eh), em, 0, 0);

      const evRef = doc(eventsRef);
      linkedIds.push(evRef.id);
      batch.set(evRef, {
        userId,
        habitId,
        isHabitEvent: true,
        sourceType: 'habit',
        sourceId: habitId,
        title: habitData.title || '',
        icon: spec.icon || '🔥',
        category: spec.category || 'Health',
        startTime: startDate,
        endTime: endDate,
        source: 'manual',
        priority: 'medium',
        flexibleScheduling: !spec.isLocked,
        isLocked: spec.isLocked,
        completed: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // 3. Update habit doc with new linkedEventIds
  const habitRef = doc(db, 'habits', habitId);
  await updateDoc(habitRef, {
    ...habitData,
    linkedEventIds: linkedIds,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Adds a new goal (simple, legacy). Use dbCreateGoalWithSchedule for full integration.
 */
export async function dbAddGoal(userId: string, title: string, target: number): Promise<void> {
  const goalsRef = collection(db, 'goals');
  await addDoc(goalsRef, {
    userId,
    title,
    progress: 0,
    target,
    status: 'active',
    schedulingType: 'flexible',
    createdAt: serverTimestamp()
  });
  await awardXPAndLog(userId, 'GOAL_CREATED', 10);
  await updateBadgeProgress(userId, 'first_goal', 1);
}

/**
 * Creates a goal with full schedule integration.
 * Saves the goal doc then batch-writes all generated calendar events.
 * Returns the new goal ID.
 */
export async function dbCreateGoalWithSchedule(
  userId: string,
  goalData: Omit<DbGoal, 'id' | 'userId' | 'createdAt'>,
  eventSpecs: Array<{
    date: string; start: string; end: string;
    flexibleScheduling: boolean;
    goalSchedulingType: 'fixed' | 'flexible' | 'ai';
    sessionIndex: number;
  }>
): Promise<string> {
  // 1. Create the goal document
  const goalsRef = collection(db, 'goals');
  const goalRef = await addDoc(goalsRef, {
    ...goalData,
    userId,
    progress: goalData.progress ?? 0,
    status: 'active',
    completedSessions: 0,
    totalSessions: eventSpecs.length,
    linkedEventIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const goalId = goalRef.id;

  // 2. Batch-create calendar events tagged with goalId
  const eventsRef = collection(db, 'calendar_events');
  const linkedIds: string[] = [];

  // Firestore batch has a 500-doc limit; chunk for safety
  const CHUNK = 400;
  for (let i = 0; i < eventSpecs.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = eventSpecs.slice(i, i + CHUNK);
    for (const spec of chunk) {
      const [datePart, startTime, endTime] = [spec.date, spec.start, spec.end];
      const startDate = new Date(`${datePart}T00:00:00`);
      const [sh, sm, sap] = parseTimeParts(startTime);
      const [eh, em, eap] = parseTimeParts(endTime);
      startDate.setHours(sap === 'PM' && sh < 12 ? sh + 12 : (sap === 'AM' && sh === 12 ? 0 : sh), sm, 0, 0);
      const endDate = new Date(`${datePart}T00:00:00`);
      endDate.setHours(eap === 'PM' && eh < 12 ? eh + 12 : (eap === 'AM' && eh === 12 ? 0 : eh), em, 0, 0);

      const evRef = doc(eventsRef);
      linkedIds.push(evRef.id);
      batch.set(evRef, {
        userId,
        goalId,
        isGoalEvent: true,
        sourceType: 'goal',
        sourceId: goalId,
        goalSchedulingType: spec.goalSchedulingType,
        isLocked: spec.goalSchedulingType === 'fixed',
        sessionIndex: spec.sessionIndex,
        title: goalData.title,
        startTime: startDate,
        endTime: endDate,
        source: 'manual',
        priority: goalData.priority ?? 'medium',
        category: goalData.category ?? 'Personal',
        flexibleScheduling: spec.flexibleScheduling,
        completed: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // 3. Patch linkedEventIds back onto the goal
  await updateDoc(goalRef, { linkedEventIds: linkedIds });

  await awardXPAndLog(userId, 'GOAL_CREATED', 10);
  await updateBadgeProgress(userId, 'first_goal', 1);
  return goalId;
}

/** Internal: parse "H:MM AP" into [hours, minutes, 'AM'|'PM'] */
function parseTimeParts(t: string): [number, number, string] {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return [9, 0, 'AM'];
  return [parseInt(m[1], 10), parseInt(m[2], 10), m[3].toUpperCase()];
}

/**
 * Re-generates calendar events for a goal after its schedule is edited.
 * Deletes old linked events then batch-creates new ones.
 */
export async function dbUpdateGoalSchedule(
  userId: string,
  goalId: string,
  updates: Partial<DbGoal>,
  newEventSpecs: Array<{
    date: string; start: string; end: string;
    flexibleScheduling: boolean;
    goalSchedulingType: 'fixed' | 'flexible' | 'ai';
    sessionIndex: number;
  }>
): Promise<void> {
  const goalRef = doc(db, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) return;
  const existingGoal = goalSnap.data() as DbGoal;

  // Delete all previously linked events
  const oldIds: string[] = existingGoal.linkedEventIds ?? [];
  const delBatch = writeBatch(db);
  for (const eid of oldIds) {
    delBatch.delete(doc(db, 'calendar_events', eid));
  }
  if (oldIds.length > 0) await delBatch.commit();

  // Re-create events
  const eventsRef = collection(db, 'calendar_events');
  const linkedIds: string[] = [];
  const CHUNK = 400;
  for (let i = 0; i < newEventSpecs.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = newEventSpecs.slice(i, i + CHUNK);
    for (const spec of chunk) {
      const startDate = new Date(`${spec.date}T00:00:00`);
      const [sh, sm, sap] = parseTimeParts(spec.start);
      startDate.setHours(sap === 'PM' && sh < 12 ? sh + 12 : (sap === 'AM' && sh === 12 ? 0 : sh), sm, 0, 0);
      const endDate = new Date(`${spec.date}T00:00:00`);
      const [eh, em, eap] = parseTimeParts(spec.end);
      endDate.setHours(eap === 'PM' && eh < 12 ? eh + 12 : (eap === 'AM' && eh === 12 ? 0 : eh), em, 0, 0);
      const evRef = doc(eventsRef);
      linkedIds.push(evRef.id);
      batch.set(evRef, {
        userId,
        goalId,
        isGoalEvent: true,
        goalSchedulingType: spec.goalSchedulingType,
        sessionIndex: spec.sessionIndex,
        title: updates.title ?? existingGoal.title,
        startTime: startDate,
        endTime: endDate,
        source: 'manual',
        priority: updates.priority ?? existingGoal.priority ?? 'medium',
        category: updates.category ?? existingGoal.category ?? 'Personal',
        flexibleScheduling: spec.flexibleScheduling,
        completed: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  await updateDoc(goalRef, {
    ...updates,
    linkedEventIds: linkedIds,
    totalSessions: newEventSpecs.length,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates goal progress.
 */
export async function dbUpdateGoalProgress(userId: string, goalId: string, progress: number): Promise<void> {
  const goalRef = doc(db, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) return;
  const goalData = goalSnap.data() as DbGoal;
  const target = goalData.target || 1;
  const prevStatus = goalData.status;

  const isCompletedNow = progress >= target;

  await updateDoc(goalRef, {
    progress: Math.min(progress, target),
    status: isCompletedNow ? 'completed' : 'active'
  });

  if (isCompletedNow && prevStatus !== 'completed') {
    await awardXPAndLog(userId, 'GOAL_COMPLETED', 250);

    const statsRef = doc(db, 'user_stats', userId);
    const statsSnap = await getDoc(statsRef);
    let goalsCompletedVal = 1;
    if (statsSnap.exists()) {
      const stats = statsSnap.data() as UserStats;
      goalsCompletedVal = (stats.goalsCompleted || 0) + 1;
      const momentumScore = computeMomentumScore({ ...stats, goalsCompleted: goalsCompletedVal });
      await updateDoc(statsRef, { goalsCompleted: goalsCompletedVal });
      await updateDoc(doc(db, 'users', userId), { momentumScore });
    }

    await updateBadgeProgress(userId, 'goal_achiever', 1);
    await updateBadgeProgress(userId, 'goal_master', goalsCompletedVal);
  }
}

/**
 * Deletes a goal and all its linked calendar events.
 */
export async function dbDeleteGoal(goalId: string): Promise<void> {
  const goalRef = doc(db, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  if (goalSnap.exists()) {
    const data = goalSnap.data() as DbGoal;
    const ids: string[] = data.linkedEventIds ?? [];
    if (ids.length > 0) {
      const batch = writeBatch(db);
      for (const eid of ids) batch.delete(doc(db, 'calendar_events', eid));
      await batch.commit();
    }
  }
  await deleteDoc(goalRef);
}

/**
 * Marks a single goal session (calendar event) as complete.
 * Increments completedSessions, updates streak, awards XP.
 */
export async function dbCompleteGoalSession(
  userId: string,
  goalId: string,
  eventId: string
): Promise<void> {
  // Mark the event as completed
  const evRef = doc(db, 'calendar_events', eventId);
  await updateDoc(evRef, { completed: true });

  // Update goal progress
  const goalRef = doc(db, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) return;
  const goal = goalSnap.data() as DbGoal;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const lastDate = goal.lastCompletedDate ?? '';

  // Streak logic
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  const prevStreak = goal.currentStreak ?? 0;
  const newStreak = (lastDate === yStr || lastDate === todayStr) ? prevStreak + 1 : 1;
  const longestStreak = Math.max(goal.longestStreak ?? 0, newStreak);

  const completedSessions = (goal.completedSessions ?? 0) + 1;
  const total = goal.totalSessions ?? goal.target ?? 1;
  const progressType = goal.progressType ?? 'sessions';
  const newProgress = progressType === 'sessions'
    ? Math.round((completedSessions / total) * 100)
    : Math.min((goal.progress ?? 0) + Math.round(100 / total), 100);

  const isCompletedNow = newProgress >= 100;

  await updateDoc(goalRef, {
    completedSessions,
    progress: newProgress,
    status: isCompletedNow ? 'completed' : 'active',
    currentStreak: newStreak,
    longestStreak,
    lastCompletedDate: todayStr,
    updatedAt: serverTimestamp(),
  });

  await awardXPAndLog(userId, 'GOAL_CREATED', isCompletedNow ? 250 : 15);
  if (isCompletedNow) {
    await updateBadgeProgress(userId, 'goal_achiever', 1);
  }
}

/**
 * Handles a missed goal session.
 * action: 'skip' | 'reschedule' | 'ai'
 */
export async function dbHandleMissedSession(
  userId: string,
  goalId: string,
  eventId: string,
  action: 'skip' | 'reschedule' | 'ai',
  rescheduleDate?: string // YYYY-MM-DD for 'reschedule'
): Promise<void> {
  const evRef = doc(db, 'calendar_events', eventId);
  const evSnap = await getDoc(evRef);
  if (!evSnap.exists()) return;
  const ev = evSnap.data();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Mark original as missed
  await updateDoc(evRef, { missedAt: todayStr, completed: false });

  // Record missed date on goal
  const goalRef = doc(db, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) return;
  const goal = goalSnap.data() as DbGoal;
  const missedDates = [...(goal.missedDates ?? []), todayStr];

  // Break streak
  await updateDoc(goalRef, {
    currentStreak: 0,
    missedDates,
    updatedAt: serverTimestamp(),
  });

  if (action === 'skip') return;

  // For reschedule / ai: create a new event the next day (or AI-chosen date)
  const targetDateStr = rescheduleDate ?? (() => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
  })();

  // Preserve the same start/end time
  const startTime: Date = ev.startTime instanceof Date ? ev.startTime : ev.startTime.toDate();
  const endTime: Date   = ev.endTime   instanceof Date ? ev.endTime   : ev.endTime.toDate();
  const newStart = new Date(`${targetDateStr}T00:00:00`);
  newStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
  const newEnd = new Date(`${targetDateStr}T00:00:00`);
  newEnd.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

  const eventsRef = collection(db, 'calendar_events');
  const newEvRef = await addDoc(eventsRef, {
    userId,
    goalId,
    isGoalEvent: true,
    goalSchedulingType: ev.goalSchedulingType ?? 'flexible',
    sessionIndex: ev.sessionIndex ?? 0,
    title: ev.title,
    startTime: newStart,
    endTime: newEnd,
    source: 'manual',
    priority: ev.priority ?? 'medium',
    category: ev.category ?? 'Personal',
    flexibleScheduling: true,
    completed: false,
    rescheduledFrom: eventId,
    createdAt: serverTimestamp(),
  });

  // Add new event to goal's linkedEventIds
  const updatedIds = [...(goal.linkedEventIds ?? []), newEvRef.id];
  await updateDoc(goalRef, { linkedEventIds: updatedIds, updatedAt: serverTimestamp() });
}

/**
 * Logs AI coach usage statistics and awards XP.
 */
export async function dbLogAiCoachUsage(userId: string): Promise<void> {
  await awardXPAndLog(userId, 'AI_COACH_USAGE', 1);

  const statsRef = doc(db, 'user_stats', userId);
  const statsSnap = await getDoc(statsRef);
  let aiInteractionsVal = 1;
  if (statsSnap.exists()) {
    const stats = statsSnap.data() as UserStats;
    aiInteractionsVal = (stats.aiInteractions || 0) + 1;
    await updateDoc(statsRef, { aiInteractions: aiInteractionsVal });
  }

  await updateBadgeProgress(userId, 'ai_explorer', aiInteractionsVal);
  await updateBadgeProgress(userId, 'ai_power_user', aiInteractionsVal);
}

/**
 * Dynamically adds a new note.
 */
export async function dbAddNote(userId: string, title: string, body: string, accent: string): Promise<string> {
  const notesRef = collection(db, 'notes');
  const docRef = await addDoc(notesRef, {
    userId,
    title,
    body,
    accent,
    updatedAt: serverTimestamp()
  });

  await awardXPAndLog(userId, 'NOTES_CREATED', 1);

  // Count current notes for badge progress trigger
  try {
    const notesQuery = query(collection(db, 'notes'), where('userId', '==', userId));
    const notesSnap = await getDocs(notesQuery);
    await updateBadgeProgress(userId, 'first_note', notesSnap.size);
  } catch (err) {
    console.error('Error updating note badge progress:', err);
  }

  return docRef.id;
}

/**
 * Deletes a note.
 */
export async function dbDeleteNote(noteId: string): Promise<void> {
  const noteRef = doc(db, 'notes', noteId);
  await deleteDoc(noteRef);
}

/**
 * Connects or disconnects an app integration, awarding XP on connection.
 */
export async function dbToggleIntegration(userId: string, appKey: string, connected: boolean): Promise<void> {
  const integrationsRef = doc(db, 'user_integrations', userId);
  
  const fieldMap: Record<string, string> = {
    'google-calendar': 'googleCalendarConnected',
    'google-tasks': 'googleTasksConnected',
    'gmail': 'gmailConnected',
    'drive': 'driveConnected',
  };

  const fieldName = fieldMap[appKey];
  if (!fieldName) return;

  await updateDoc(integrationsRef, {
    [fieldName]: connected,
    lastSync: serverTimestamp()
  });

  if (connected) {
    if (appKey === 'google-calendar') {
      await awardXPAndLog(userId, 'CALENDAR_CONNECTED', 20);
      await updateBadgeProgress(userId, 'calendar_connected', 1);
    } else if (appKey === 'google-tasks') {
      await awardXPAndLog(userId, 'GOOGLE_TASKS_CONNECTED', 20);
    }
  }
}

/**
 * Simulates syncing connected apps.
 */
export async function dbSyncIntegration(userId: string): Promise<void> {
  const integrationsRef = doc(db, 'user_integrations', userId);
  await updateDoc(integrationsRef, {
    lastSync: serverTimestamp()
  });
}

// ─── AI CHAT HISTORY ─────────────────────────────────────────────────────────

export interface AiChatMessage {
  id?: string;
  uid: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: any;
}

/**
 * Persists a single AI chat message (user or AI) to Firestore.
 */
export async function dbSaveAiMessage(uid: string, sender: 'user' | 'ai', text: string): Promise<void> {
  await addDoc(collection(db, 'ai_chat_history'), {
    uid,
    sender,
    text,
    timestamp: serverTimestamp()
  });
}

/**
 * Loads the last N AI chat messages for a user.
 */
export async function dbGetAiHistory(uid: string, limitCount = 40): Promise<AiChatMessage[]> {
  const q = query(
    collection(db, 'ai_chat_history'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<AiChatMessage, 'id'>) }))
    .reverse();
}

// ─── XP ACTIVITY FEED ────────────────────────────────────────────────────────

export interface XpHistoryEntry {
  id?: string;
  uid: string;
  action: string;
  xpEarned: number;
  timestamp: any;
}

/**
 * Returns the last N XP history entries for a user.
 */
export async function dbGetXpHistory(uid: string, limitCount = 12): Promise<XpHistoryEntry[]> {
  const q = query(
    collection(db, 'user_xp_history'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<XpHistoryEntry, 'id'>) }));
}

// ─── WEEKLY ANALYTICS ────────────────────────────────────────────────────────

export interface WeeklyAnalytics {
  /** Bars: [Sun, Mon, Tue, Wed, Thu, Fri, Sat] — percentage 0–100 */
  dailyCompletionPcts: number[];
  dayLabels: string[];
  totalCompleted: number;
  totalTasks: number;
  completionRate: number;
  overdueCount: number;
  /** Rough estimate: 1 completed task ≈ 1.5h focus */
  estimatedFocusHours: number;
  deadlineRisk: 'Low' | 'Medium' | 'High';
}

/**
 * Aggregates task-completion data for the current week (Mon–Sun).
 */
export async function dbGetWeeklyAnalytics(userId: string): Promise<WeeklyAnalytics> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Build week boundaries (last 7 days ending today)
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const weekStart = days[0];
  const weekEnd = new Date(today);

  // Fetch all tasks for user
  const q = query(collection(db, 'tasks'), where('userId', '==', userId));
  const snap = await getDocs(q);

  const allTasks = snap.docs.map(d => d.data());

  // Per-day buckets
  const completedPerDay = new Array(7).fill(0);
  const totalPerDay = new Array(7).fill(0);
  let overdueCount = 0;
  const now = new Date();

  for (const task of allTasks) {
    const dueDateRaw = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);

    // Count overdue (not completed, past due)
    if (!task.completed && dueDateRaw && dueDateRaw < now) {
      overdueCount++;
    }

    // Only include tasks due this week in the chart
    if (!dueDateRaw || dueDateRaw < weekStart || dueDateRaw > weekEnd) continue;

    // Find which day bucket
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(days[i]);
      const dayEnd = new Date(days[i]);
      dayEnd.setHours(23, 59, 59, 999);
      if (dueDateRaw >= dayStart && dueDateRaw <= dayEnd) {
        totalPerDay[i]++;
        if (task.completed) completedPerDay[i]++;
        break;
      }
    }
  }

  const dailyCompletionPcts = days.map((_, i) => {
    if (totalPerDay[i] === 0) return 0;
    return Math.round((completedPerDay[i] / totalPerDay[i]) * 100);
  });

  const dayLabels = days.map(d =>
    new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
  );

  const totalCompleted = allTasks.filter(t => t.completed).length;
  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const estimatedFocusHours = Math.round(totalCompleted * 1.5 * 10) / 10;
  const deadlineRisk: WeeklyAnalytics['deadlineRisk'] =
    overdueCount >= 5 ? 'High' : overdueCount >= 2 ? 'Medium' : 'Low';

  return {
    dailyCompletionPcts,
    dayLabels,
    totalCompleted,
    totalTasks,
    completionRate,
    overdueCount,
    estimatedFocusHours,
    deadlineRisk,
  };
}

// ─── ASSIGNMENTS & RECURRING RULES ───────────────────────────────────────────

export interface DbAssignment {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  attachments?: string[];
  completed: boolean;
  createdAt: any;
}

export interface DbRecurringRule {
  id?: string;
  userId: string;
  title: string;
  category: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startDate: any;
  endDate?: any;
  repeatForever: boolean;
  accent: string;
  createdAt: any;
}

export async function dbAddAssignment(userId: string, assignment: Omit<DbAssignment, 'userId' | 'createdAt' | 'completed'>): Promise<void> {
  const collRef = collection(db, 'calendar_assignments');
  await addDoc(collRef, {
    userId,
    title: assignment.title,
    description: assignment.description || '',
    dueDate: assignment.dueDate,
    priority: assignment.priority,
    subject: assignment.subject,
    attachments: assignment.attachments || [],
    completed: false,
    createdAt: serverTimestamp(),
  });
}

export async function dbUpdateAssignment(assignmentId: string, data: Partial<Omit<DbAssignment, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, 'calendar_assignments', assignmentId);
  await updateDoc(docRef, data);
}

export async function dbDeleteAssignment(assignmentId: string): Promise<void> {
  const docRef = doc(db, 'calendar_assignments', assignmentId);
  await deleteDoc(docRef);
}

export async function dbAddRecurringRule(userId: string, rule: Omit<DbRecurringRule, 'userId' | 'createdAt'>): Promise<void> {
  const collRef = collection(db, 'calendar_routines');
  await addDoc(collRef, {
    userId,
    title: rule.title,
    category: rule.category,
    daysOfWeek: rule.daysOfWeek,
    startTime: rule.startTime,
    endTime: rule.endTime,
    startDate: rule.startDate,
    endDate: rule.endDate || null,
    repeatForever: rule.repeatForever,
    accent: rule.accent,
    createdAt: serverTimestamp(),
  });
}

export async function dbDeleteRecurringRule(ruleId: string): Promise<void> {
  const docRef = doc(db, 'calendar_routines', ruleId);
  await deleteDoc(docRef);
}

/**
 * Migrates existing planner data to calendar collections.
 */
export async function dbMigratePlannerToCalendar(userId: string): Promise<void> {
  const collectionsToMigrate = [
    { source: 'events', target: 'calendar_events' },
    { source: 'assignments', target: 'calendar_assignments' },
    { source: 'recurring_rules', target: 'calendar_routines' },
  ];

  for (const pair of collectionsToMigrate) {
    try {
      const srcQuery = query(collection(db, pair.source), where('userId', '==', userId));
      const snap = await getDocs(srcQuery);
      
      for (const srcDoc of snap.docs) {
        const data = srcDoc.data();
        const targetDocRef = doc(db, pair.target, srcDoc.id);
        const targetSnap = await getDoc(targetDocRef);
        if (!targetSnap.exists()) {
          await setDoc(targetDocRef, data);
        }
      }
    } catch (err) {
      console.error(`Migration error for ${pair.source} -> ${pair.target}:`, err);
    }
  }
}

/**
 * Fetches user preferences containing AI configuration.
 */
export async function dbGetUserPreferences(uid: string): Promise<any> {
  const preferencesRef = doc(db, 'user_preferences', uid);
  const snap = await getDoc(preferencesRef);
  
  const defaultPrefs = {
    uid,
    hasClaimedWelcomeBadge: false,
    geminiApiKey: '',
    sarvamApiKey: '',
    enableVoiceAssistant: true,
    enableAiScheduling: true,
    enableDailyAiBrief: true,
    enableSmartRecommendations: true,
    enableOptimizeDay: true,
    enableOptimizeWeek: true
  };

  if (snap.exists()) {
    return { ...defaultPrefs, ...snap.data() };
  }
  
  await setDoc(preferencesRef, defaultPrefs);
  return defaultPrefs;
}

/**
 * Updates user preferences in Firestore.
 */
export async function dbUpdateUserPreferences(uid: string, data: Partial<any>): Promise<void> {
  const preferencesRef = doc(db, 'user_preferences', uid);
  await setDoc(preferencesRef, data, { merge: true });
}


