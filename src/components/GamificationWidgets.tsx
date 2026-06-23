import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  doc,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  CheckSquare, 
  Mail, 
  HardDrive, 
  PlusCircle, 
  Sparkles,
  MessageSquare
} from 'lucide-react';
import {
  dbAddHabit,
  dbToggleHabitCompleted,
  dbDeleteHabit,
  dbAddGoal,
  dbUpdateGoalProgress,
  dbDeleteGoal,
  dbToggleIntegration,
  dbSyncIntegration,
  type Habit,
  type DbGoal,
  type UserIntegration
} from '../firebaseService';

interface WidgetProps {
  userId: string;
}

// 1. DAILY HABITS WIDGET
export function DailyHabitsWidget({ userId }: WidgetProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'habits'), where('userId', '==', userId));
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
      // Sort by createdAt
      list.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tA - tB;
      });
      setHabits(list);
    });
    return () => unsub();
  }, [userId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    try {
      await dbAddHabit(userId, newHabitTitle.trim());
      setNewHabitTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding habit:', err);
    }
  };

  const handleToggle = async (habitId: string, currentStatus: boolean) => {
    try {
      await dbToggleHabitCompleted(userId, habitId, !currentStatus);
    } catch (err) {
      console.error('Error toggling habit:', err);
    }
  };

  const handleDelete = async (habitId: string) => {
    try {
      await dbDeleteHabit(habitId);
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  return (
    <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Daily Habits</h4>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Check off habits to earn +5 XP</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[#6D4AFF] dark:text-[#A78BFA] hover:scale-105 transition cursor-pointer"
        >
          <PlusCircle className="h-5 w-5" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-4 flex gap-2 animate-[fade-up_0.2s_ease-out]">
          <input
            className="app-input flex-1 py-1.5 px-3 text-xs"
            placeholder="Add habit, e.g. Inbox Zero..."
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
          />
          <button type="submit" className="app-button-primary py-1.5 px-3 text-xs font-semibold">
            Add
          </button>
        </form>
      )}

      <div className="space-y-2">
        {habits.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-5 text-center text-xs text-[#9CA3AF] dark:text-[#4B5563]">
            No habits active. Click + to add!
          </div>
        ) : (
          habits.map((habit) => (
            <div 
              key={habit.id}
              className={`flex items-center justify-between p-3 rounded-[16px] border transition-all ${
                habit.completedToday 
                  ? 'border-emerald-250 bg-emerald-50/20 dark:border-emerald-950/40 dark:bg-emerald-950/5' 
                  : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
              }`}
            >
              <button
                onClick={() => habit.id && handleToggle(habit.id, habit.completedToday)}
                className="flex items-center gap-2.5 text-left flex-1 cursor-pointer group"
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                    habit.completedToday 
                      ? 'border-emerald-500 bg-emerald-500 text-white scale-105 shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                      : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E2937] text-transparent group-hover:scale-105'
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={`text-xs font-semibold ${
                  habit.completedToday 
                    ? 'text-gray-400 dark:text-gray-500 line-through' 
                    : 'text-[#111827] dark:text-white'
                }`}>
                  {habit.title}
                </span>
              </button>

              <button
                onClick={() => habit.id && handleDelete(habit.id)}
                className="text-gray-400 hover:text-red-500 transition pl-2 cursor-pointer"
                title="Delete Habit"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 2. ACTIVE GOALS WIDGET
export function ActiveGoalsWidget({ userId }: WidgetProps) {
  const [goals, setGoals] = useState<DbGoal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState(5);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: DbGoal[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          progress: data.progress || 0,
          target: data.target || 1,
          status: data.status || 'active',
          createdAt: data.createdAt
        });
      });
      // Sort by status, then createdAt
      list.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tA - tB;
      });
      setGoals(list);
    });
    return () => unsub();
  }, [userId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || goalTarget <= 0) return;
    try {
      await dbAddGoal(userId, newGoalTitle.trim(), goalTarget);
      setNewGoalTitle('');
      setGoalTarget(5);
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding goal:', err);
    }
  };

  const handleIncrement = async (goalId: string, currentProgress: number) => {
    try {
      await dbUpdateGoalProgress(userId, goalId, currentProgress + 1);
    } catch (err) {
      console.error('Error incrementing goal:', err);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await dbDeleteGoal(goalId);
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  return (
    <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">Active Goals</h4>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Creating awards +5 XP · Completing +25 XP</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[#6D4AFF] dark:text-[#A78BFA] hover:scale-105 transition cursor-pointer"
        >
          <PlusCircle className="h-5 w-5" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 border-b border-gray-100 dark:border-white/5 pb-3.5 animate-[fade-up_0.2s_ease-out]">
          <input
            className="app-input py-1.5 px-3 text-xs"
            placeholder="Goal Title, e.g. Focus Sessions..."
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
          />
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-gray-400 whitespace-nowrap">Target Count:</span>
            <input
              type="number"
              className="app-input py-1.5 px-3 text-xs w-20"
              min="1"
              value={goalTarget}
              onChange={(e) => setGoalTarget(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <button type="submit" className="app-button-primary py-1.5 px-3 text-xs font-semibold ml-auto">
              Create Goal
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-5 text-center text-xs text-[#9CA3AF] dark:text-[#4B5563]">
            No active goals. Add some goals to track progress!
          </div>
        ) : (
          goals.map((goal) => {
            const isCompleted = goal.status === 'completed';
            const progressPct = Math.min(100, Math.round((goal.progress / goal.target) * 100)) || 0;

            return (
              <div 
                key={goal.id}
                className={`p-3.5 rounded-[18px] border transition-all ${
                  isCompleted 
                    ? 'border-emerald-250 bg-emerald-50/10 dark:border-emerald-950/20 dark:bg-emerald-950/5 opacity-75' 
                    : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight ${isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-[#111827] dark:text-white'}`}>
                      {goal.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
                      Progress: {goal.progress} / {goal.target}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {!isCompleted && goal.id && (
                      <button
                        onClick={() => handleIncrement(goal.id!, goal.progress)}
                        className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-950 bg-purple-50 dark:bg-purple-950/20 text-[#6D4AFF] dark:text-[#A78BFA] hover:scale-105 transition cursor-pointer"
                        title="Increment Progress"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => goal.id && handleDelete(goal.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border dark:border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 3. CONNECTED APPS CARD (INTEGRATIONS)
export function ConnectedAppsCard({ userId }: WidgetProps) {
  const [integrations, setIntegrations] = useState<UserIntegration | null>(null);
  const [syncingApp, setSyncingApp] = useState(false);

  useEffect(() => {
    const q = doc(db, 'user_integrations', userId);
    const unsub = onSnapshot(q, (docSnap) => {
      if (docSnap.exists()) {
        setIntegrations(docSnap.data() as UserIntegration);
      }
    });
    return () => unsub();
  }, [userId]);

  const handleToggleConnect = async (appKey: string, currentVal: boolean) => {
    try {
      await dbToggleIntegration(userId, appKey, !currentVal);
    } catch (err) {
      console.error('Error toggling integration:', err);
    }
  };

  const handleSyncAll = async () => {
    setSyncingApp(true);
    // Simulate real SaaS sync sequence animation
    setTimeout(async () => {
      try {
        await dbSyncIntegration(userId);
        setSyncingApp(false);
      } catch (err) {
        console.error('Error syncing:', err);
        setSyncingApp(false);
      }
    }, 1500);
  };

  const formatSyncTime = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  const apps = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: Calendar,
      connected: integrations?.googleCalendarConnected || false,
      color: 'from-blue-500 to-indigo-600',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
      desc: 'Sync calendar blocks, deadlines and events.'
    },
    {
      id: 'google-tasks',
      name: 'Google Tasks',
      icon: CheckSquare,
      connected: integrations?.googleTasksConnected || false,
      color: 'from-blue-400 to-cyan-500',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      desc: 'Import tasks from Google Tasks natively.'
    },
    {
      id: 'gmail',
      name: 'Google Gmail',
      icon: Mail,
      connected: integrations?.gmailConnected || false,
      color: 'from-red-500 to-rose-600',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
      desc: 'Track action items from unread emails.'
    },
    {
      id: 'drive',
      name: 'Google Drive',
      icon: HardDrive,
      connected: integrations?.driveConnected || false,
      color: 'from-yellow-500 to-amber-600',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      desc: 'Link documents and plans to notes.'
    }
  ];

  const futureApps = [
    { name: 'Notion', icon: Sparkles, desc: 'Knowledge database connection.' },
    { name: 'Slack', icon: MessageSquare, desc: 'Real-time alert messaging.' },
    { name: 'Discord', icon: MessageSquare, desc: 'Community scoreboards & profiles.' },
    { name: 'Microsoft Outlook', icon: Mail, desc: 'Corporate emails and schedules.' }
  ];

  return (
    <div id="connected-apps-widget" className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-6 shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-gray-150 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight text-[#111827] dark:text-white">Connected Apps</h3>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">Manage sync states, credentials and OAuth integrations.</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncingApp || !apps.some(a => a.connected)}
          className="app-button-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncingApp ? 'animate-spin' : ''}`} />
          {syncingApp ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Sync Status Info */}
      <div className="mb-6 rounded-[16px] bg-[#FBFCFF] dark:bg-[#1D1F2D] border border-gray-100 dark:border-white/5 p-3.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-500 dark:text-gray-400">Sync Status:</span>
        <span className="font-bold text-[#6D4AFF] dark:text-[#A78BFA] flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${apps.some(a => a.connected) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-450'}`} />
          Last synced: {formatSyncTime(integrations?.lastSync)}
        </span>
      </div>

      {/* ACTIVE INTEGRATIONS */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mb-3">Active Integrations</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <div 
              key={app.id} 
              className={`p-4 rounded-[20px] border transition-all duration-300 flex flex-col justify-between min-h-[140px] relative overflow-hidden hover:border-[#6D4AFF]/50 hover:shadow-[0_0_15px_rgba(109,74,255,0.15)] ${
                app.connected 
                  ? 'border-emerald-350 dark:border-emerald-950/60 bg-emerald-50/10 dark:bg-emerald-950/5 ' + app.glow
                  : 'border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D]'
              }`}
            >
              {/* Connected Glow Border Overlay */}
              {app.connected && (
                <div className="absolute top-0 right-0 h-4 w-4 bg-emerald-500 rounded-bl-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              )}
              
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${app.color} text-white shadow-md`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <button
                  onClick={() => handleToggleConnect(app.id, app.connected)}
                  className={`py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    app.connected 
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                      : 'app-button-primary px-3 py-1.5'
                  }`}
                >
                  {app.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">{app.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-normal">{app.desc}</p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-gray-150/40 dark:border-white/5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                <span className="text-gray-400">Status:</span>
                <span className="flex items-center gap-1.5 font-bold">
                  {syncingApp && app.connected ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-amber-550 flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Syncing
                      </span>
                    </>
                  ) : app.connected ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-500">Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      <span className="text-gray-400">Disconnected</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FUTURE INTEGRATIONS */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] mt-6 mb-3">Coming Soon</h4>
      <div className="grid gap-3 sm:grid-cols-4">
        {futureApps.map((app) => {
          const Icon = app.icon;
          return (
            <div 
              key={app.name} 
              className="p-3.5 rounded-[18px] border border-dashed border-gray-200 dark:border-white/5 bg-[#FBFCFF] dark:bg-[#1D1F2D] flex flex-col justify-between opacity-60"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-[#111827] dark:text-white">{app.name}</span>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-2.5 leading-normal">{app.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
