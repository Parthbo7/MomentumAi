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
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  dueDate: Timestamp | any;
  createdAt: Timestamp | any;
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
}

export interface DbGoal {
  id?: string;
  userId: string;
  title: string;
  progress: number;
  target: number;
  status: string;
  createdAt: Timestamp | any;
}

export interface Habit {
  id?: string;
  userId: string;
  title: string;
  completedToday: boolean;
  lastCompletedDate: string | null;
  createdAt: Timestamp | any;
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
  if (xp <= 100) return 1;
  if (xp <= 300) return 2;
  if (xp <= 600) return 3;
  if (xp <= 1000) return 4;
  if (xp <= 1500) return 5;
  if (xp <= 2500) return 6;
  return 7;
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
  
  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsRef);
    if (!statsSnap.exists()) return;
    
    const statsData = statsSnap.data() as UserStats;
    const currentXp = statsData.xp || 0;
    const newXp = currentXp + amount;
    
    const newLevel = calculateLevelFromXp(newXp);
    
    transaction.update(statsRef, {
      xp: newXp,
      level: newLevel
    });
    
    const newHistoryDocRef = doc(xpHistoryRef);
    transaction.set(newHistoryDocRef, {
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
    progress: Math.min(progressVal, target),
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
      lastLogin: serverTimestamp()
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
            await awardXPAndLog(user.uid, 'WEEKLY_PERFECT_STREAK', 50);
          }
          if (newStreak % 30 === 0) {
            await awardXPAndLog(user.uid, 'MONTHLY_PERFECT_STREAK', 200);
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
export async function dbAddTask(userId: string, task: { title: string; description: string; priority: DbTask['priority']; completed: boolean; dueDate: Date }): Promise<void> {
  const tasksRef = collection(db, 'tasks');
  await addDoc(tasksRef, {
    userId,
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    completed: task.completed,
    dueDate: task.dueDate,
    createdAt: serverTimestamp(),
  });
  
  await awardXPAndLog(userId, 'TASK_CREATED', 2);
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
  });

  if (completed) {
    await awardXPAndLog(userId, 'TASK_COMPLETED', 10);

    const statsRef = doc(db, 'user_stats', userId);
    const statsSnap = await getDoc(statsRef);
    let tasksCompletedVal = 1;
    if (statsSnap.exists()) {
      const stats = statsSnap.data() as UserStats;
      tasksCompletedVal = (stats.tasksCompleted || 0) + 1;
      await updateDoc(statsRef, { tasksCompleted: tasksCompletedVal });
    }

    await updateBadgeProgress(userId, 'first_task', 1);
    await updateBadgeProgress(userId, 'task_crusher', tasksCompletedVal);
    await updateBadgeProgress(userId, 'productivity_machine', tasksCompletedVal);
  }
}

/**
 * Deletes a task.
 */
export async function dbDeleteTask(taskId: string): Promise<void> {
  const taskRef = doc(db, 'tasks', taskId);
  await deleteDoc(taskRef);
}

/**
 * Adds a calendar event.
 */
export async function dbAddEvent(userId: string, event: { title: string; startTime: Date; endTime: Date; source: DbEvent['source']; priority?: DbEvent['priority'] }): Promise<void> {
  const eventsRef = collection(db, 'events');
  await addDoc(eventsRef, {
    userId,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    source: event.source,
    priority: event.priority || 'medium',
    createdAt: serverTimestamp(),
  });
}

/**
 * Deletes a calendar event.
 */
export async function dbDeleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
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
    await awardXPAndLog(userId, 'HABIT_COMPLETED', 5);

    const statsRef = doc(db, 'user_stats', userId);
    const statsSnap = await getDoc(statsRef);
    let habitsCompletedVal = 1;
    if (statsSnap.exists()) {
      const stats = statsSnap.data() as UserStats;
      habitsCompletedVal = (stats.habitsCompleted || 0) + 1;
      await updateDoc(statsRef, { habitsCompleted: habitsCompletedVal });
    }
  }
}

/**
 * Deletes a habit.
 */
export async function dbDeleteHabit(habitId: string): Promise<void> {
  const habitRef = doc(db, 'habits', habitId);
  await deleteDoc(habitRef);
}

/**
 * Adds a new goal.
 */
export async function dbAddGoal(userId: string, title: string, target: number): Promise<void> {
  const goalsRef = collection(db, 'goals');
  await addDoc(goalsRef, {
    userId,
    title,
    progress: 0,
    target,
    status: 'active',
    createdAt: serverTimestamp()
  });

  await awardXPAndLog(userId, 'GOAL_CREATED', 5);
  await updateBadgeProgress(userId, 'first_goal', 1);
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
    await awardXPAndLog(userId, 'GOAL_COMPLETED', 25);

    const statsRef = doc(db, 'user_stats', userId);
    const statsSnap = await getDoc(statsRef);
    let goalsCompletedVal = 1;
    if (statsSnap.exists()) {
      const stats = statsSnap.data() as UserStats;
      goalsCompletedVal = (stats.goalsCompleted || 0) + 1;
      await updateDoc(statsRef, { goalsCompleted: goalsCompletedVal });
    }

    await updateBadgeProgress(userId, 'goal_achiever', 1);
    await updateBadgeProgress(userId, 'goal_master', goalsCompletedVal);
  }
}

/**
 * Deletes a goal.
 */
export async function dbDeleteGoal(goalId: string): Promise<void> {
  const goalRef = doc(db, 'goals', goalId);
  await deleteDoc(goalRef);
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
