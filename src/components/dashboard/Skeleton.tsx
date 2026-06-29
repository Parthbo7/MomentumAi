export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-[28px] bg-slate-200 dark:bg-slate-800/20 border dark:border-white/5 ${className}`} />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-[22px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4 ${className}`}>
      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-6 w-16 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-2 w-24 rounded bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export function SkeletonLine({ width = 'w-full', className = '' }: { width?: string; className?: string }) {
  return <div className={`animate-pulse h-3 rounded bg-slate-200 dark:bg-white/10 ${width} ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse text-left">
      {/* Hero Section */}
      <SkeletonBlock className="h-48 w-full" />

      {/* High Priority Tasks + Smart To-Do List */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>

      {/* Today's Timeline + Assignment Deadline Tracker */}
      <div className="grid gap-4 lg:grid-cols-12">
        <SkeletonBlock className="h-80 lg:col-span-7" />
        <SkeletonBlock className="h-80 lg:col-span-5" />
      </div>

      {/* Goals & Habits Tracker */}
      <SkeletonBlock className="h-64 w-full" />

      {/* Quick Stats (2 rows of 5 cards) */}
      <div className="grid gap-3 grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={`stats-top-${i}`} className="h-24" />
        ))}
      </div>
      <div className="grid gap-3 grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={`stats-bottom-${i}`} className="h-24" />
        ))}
      </div>

      {/* Productivity Analytics + AI Suggestions + Calendar Preview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
      </div>

      {/* Quick Actions Bar */}
      <SkeletonBlock className="h-14 w-full" />
    </div>
  );
}
