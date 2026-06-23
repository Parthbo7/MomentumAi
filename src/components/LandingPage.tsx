import { useState } from 'react';
import {
  ArrowRight,
  Brain,
  Calendar,
  Check,
  Clock,
  ListTodo,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

interface LandingPageProps {
  onGetStarted: () => void;
}

const metrics = [
  { label: 'Tasks planned ahead', value: '12k+' },
  { label: 'Focus sessions completed', value: '84%' },
  { label: 'Time saved every week', value: '7.2h' },
];

const features = [
  {
    title: 'Calendar-first planning',
    description: 'Schedule deadlines, tasks, and deep work blocks in one premium workspace.',
    icon: Calendar,
  },
  {
    title: 'AI coaching that feels useful',
    description: 'Get planning suggestions based on urgency, not generic advice.',
    icon: Brain,
  },
  {
    title: 'Momentum analytics',
    description: 'Track focus quality, task completion, and schedule health in real time.',
    icon: TrendingUp,
  },
];

const previewTasks = [
  { title: 'DBMS Assignment', time: '9:00 AM - 10:30 AM', tone: 'bg-[#F5F2FF] dark:bg-[#1E1B4B] text-[#6D4AFF] dark:text-[#A78BFA] border-[#DDD2FF] dark:border-[#312E81]' },
  { title: 'Hackathon Prep', time: '11:00 AM - 1:30 PM', tone: 'bg-[#FFF7E8] dark:bg-[#451A03] text-[#B45309] dark:text-[#FBBF24] border-[#F9D799] dark:border-[#78350F]' },
  { title: 'Team Meeting', time: '2:00 PM - 3:00 PM', tone: 'bg-[#EEF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border-[#C7DEF9] dark:border-[#1E3A8A]' },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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
  };

  return (
    <div className="min-h-screen bg-transparent text-[#111827] dark:text-white transition-colors duration-200">
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB]/80 dark:border-white/8 bg-white/90 dark:bg-[#0F1117]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[22px] font-bold tracking-tight">Momentum AI</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6D4AFF]">Pro Workspace</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 lg:flex">
            {['Product', 'Planner', 'Analytics', 'Pricing'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-semibold text-[#6B7280] dark:text-[#A1A1AA] transition hover:text-[#111827] dark:hover:text-white">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="app-surface-soft flex items-center gap-1 p-1 mr-2">
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
            <button onClick={() => setIsAuthOpen(true)} className="hidden text-sm font-semibold text-[#6B7280] dark:text-[#A1A1AA] transition hover:text-[#111827] dark:hover:text-white sm:inline-flex cursor-pointer">
              Sign In
            </button>
            <button onClick={() => setIsAuthOpen(true)} className="app-button-primary">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1480px] gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pt-20">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#A1A1AA] shadow-[0_14px_30px_-24px_rgba(17,24,39,0.18)]">
              <ShieldCheck className="h-4 w-4 text-[#6D4AFF]" />
              Premium planning for students, operators, and builders
            </div>

            <h1 className="mt-8 max-w-2xl text-balance text-5xl font-bold tracking-tight text-[#111827] dark:text-white sm:text-6xl lg:text-[72px] lg:leading-[1.02]">
              Finish important work before it becomes urgent.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#6B7280] dark:text-[#A1A1AA]">
              Momentum AI combines a spacious calendar, high-signal task planning, and smart recommendations inside a premium productivity workspace.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button onClick={() => setIsAuthOpen(true)} className="app-button-primary">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setIsAuthOpen(true)} className="app-button-secondary">
                <Play className="h-4 w-4" />
                Watch Demo
              </button>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="app-surface-soft p-5">
                  <p className="text-3xl font-bold tracking-tight text-[#111827] dark:text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-[#6B7280] dark:text-[#A1A1AA]">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top_right,rgba(109,74,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.14),transparent_30%)]" />
            <div className="relative app-surface overflow-hidden rounded-[32px] p-4 sm:p-5">
              <div className="rounded-[28px] border border-[#EEF1F6] dark:border-white/8 bg-[#F8F9FC] dark:bg-[#0F1117] p-4">
                <div className="flex items-center justify-between rounded-[22px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] px-4 py-4">
                  <div>
                    <p className="text-lg font-bold text-[#111827] dark:text-white">Good Morning, Parth</p>
                    <p className="mt-1 text-sm text-[#6B7280] dark:text-[#A1A1AA]">Stay focused. Finish strong.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#F3EEFF] dark:bg-[#1C1836] px-4 py-2 text-sm font-semibold text-[#6D4AFF]">Week</div>
                    <button className="app-button-primary px-4 py-2.5 text-sm">Add Event</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-lg font-bold text-[#111827] dark:text-white">Jun 22 - Jun 28, 2026</p>
                      <div className="flex items-center gap-2 rounded-full bg-[#F8F9FC] dark:bg-[#0F1117] p-1">
                        {['Day', 'Week', 'Month'].map((label) => (
                          <span
                            key={label}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              label === 'Week' ? 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]' : 'text-[#6B7280] dark:text-[#A1A1AA]'
                            }`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#EEF1F6] dark:border-white/8 p-4 bg-white dark:bg-[#171923]">
                      <div className="grid grid-cols-3 gap-3">
                        {previewTasks.map((item) => (
                          <div key={item.title} className={`rounded-[18px] border p-4 ${item.tone}`}>
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="mt-2 text-xs font-medium opacity-80">{item.time}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        {[
                          { label: 'Tasks Scheduled', value: '12', icon: ListTodo, tone: 'bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]' },
                          { label: 'Focus Time', value: '3h 45m', icon: Clock, tone: 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#059669] dark:text-[#34D399]' },
                          { label: 'Events Today', value: '2', icon: Calendar, tone: 'bg-[#FFF7ED] dark:bg-[#431407] text-[#EA580C] dark:text-[#FB923C]' },
                          { label: 'Ahead of Plan', value: '87', icon: TrendingUp, tone: 'bg-[#EEF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA]' },
                        ].map((stat) => {
                          const Icon = stat.icon;
                          return (
                            <div key={stat.label} className="rounded-[18px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-4">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] ${stat.tone}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <p className="mt-4 text-2xl font-bold tracking-tight text-[#111827] dark:text-white">{stat.value}</p>
                              <p className="mt-1 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">{stat.label}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] p-5 text-white shadow-[0_24px_50px_-30px_rgba(109,74,255,0.75)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">AI Recommendation</p>
                      <p className="mt-3 text-lg font-bold tracking-tight">Start DBMS Assignment today.</p>
                      <p className="mt-2 text-sm leading-7 text-white/88">Three near-term deadlines are stacking. Front-load the hardest block now.</p>
                    </div>
                    <div className="app-surface-soft p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#111827] dark:text-white">Upcoming Tasks</p>
                      <div className="mt-4 space-y-3">
                        {['Review lecture slides', 'Figma UI edits', 'Schedule interview session'].map((item) => (
                          <div key={item} className="flex items-start gap-3 rounded-[18px] bg-[#FBFCFF] dark:bg-[#1D1F2D] px-4 py-4 border border-[#EEF1F6] dark:border-white/8">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-[#D1D5DB] dark:border-gray-700 bg-white dark:bg-[#171923]">
                              <Check className="h-3.5 w-3.5 text-transparent" />
                            </span>
                            <p className="text-sm font-medium text-[#111827] dark:text-white">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-[1480px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="app-surface p-8 sm:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B5CF6]">Why Momentum AI</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#111827] dark:text-white">A calm, premium system for planning real work.</h2>
              <p className="mt-4 text-base leading-8 text-[#6B7280] dark:text-[#A1A1AA]">
                Every part of the product is designed to help you see the week clearly, prioritize with confidence, and keep your workspace feeling deliberate.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-[24px] border border-[#EEF1F6] dark:border-white/8 bg-[#FBFCFF] dark:bg-[#1D1F2D] p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F3EEFF] dark:bg-[#1C1836] text-[#6D4AFF]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-2xl font-bold tracking-tight text-[#111827] dark:text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6B7280] dark:text-[#A1A1AA]">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="planner" className="mx-auto max-w-[1480px] px-4 pb-24 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] px-8 py-10 text-white sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Ready to build momentum?</p>
            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-bold tracking-tight">Turn your schedule into a focused operating system.</h2>
                <p className="mt-4 text-base leading-8 text-white/88">
                  Join Momentum AI to manage tasks, events, notes, and AI coaching in a single polished workspace.
                </p>
              </div>
              <button onClick={() => setIsAuthOpen(true)} className="rounded-[18px] bg-white px-6 py-4 text-sm font-semibold text-[#6D4AFF] cursor-pointer">
                Create Workspace
              </button>
            </div>
          </div>
        </section>
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={onGetStarted} />
    </div>
  );
}
