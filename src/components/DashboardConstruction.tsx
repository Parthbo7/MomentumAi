import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { ArrowLeft, Check, LogOut, Sparkles } from 'lucide-react';
import { auth } from '../firebase';

interface DashboardConstructionProps {
  user: User | null;
  onNavigateHome: () => void;
}

export function DashboardConstruction({ user, onNavigateHome }: DashboardConstructionProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Unable to sign out', error);
    }
    onNavigateHome();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="app-surface w-full max-w-[920px] p-8 sm:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F3EEFF] text-[#6D4AFF]">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#8B5CF6]">Construction mode</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">The upgraded workspace is almost ready.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-[#6B7280]">
              This fallback screen now follows the same premium visual language as the rest of Momentum AI while the main dashboard is unavailable.
            </p>
          </div>

          <button onClick={handleSignOut} className="app-button-secondary">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[#EEF1F6] bg-[#FBFCFF] p-5">
            <p className="text-sm font-semibold text-[#111827]">{user?.displayName || 'Parth'}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{user?.email || 'parthbulbule123@gmail.com'}</p>
          </div>
          <div className="rounded-[24px] border border-[#EEF1F6] bg-[#FBFCFF] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B5CF6]">Coming next</p>
            <div className="mt-4 space-y-3">
              {['Smart task planning', 'AI schedule suggestions', 'Momentum analytics', 'Deadline rescue flows'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-sm text-[#374151]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F3EEFF] text-[#6D4AFF]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onNavigateHome} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#6D4AFF]">
          <ArrowLeft className="h-4 w-4" />
          Return Home
        </button>
      </div>
    </div>
  );
}
