import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import './App.css';
import { auth } from './firebase';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  function navigate(nextPath: string) {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPath(nextPath);
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      const currentPath = window.location.pathname;
      if (currentUser && currentPath === '/') {
        navigate('/dashboard');
      } else if (!currentUser && currentPath === '/dashboard') {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/dashboard' && !user) {
        window.history.replaceState({}, '', '/');
        setPath('/');
        return;
      }

      if (currentPath === '/' && user) {
        window.history.replaceState({}, '', '/dashboard');
        setPath('/dashboard');
        return;
      }

      setPath(currentPath);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC] dark:bg-[#0F1117] px-6 text-center transition-colors duration-200">
        <div className="app-surface w-full max-w-sm p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 animate-[pulse-soft_2.2s_ease-in-out_infinite] items-center justify-center rounded-[18px] bg-[#F3EEFF] dark:bg-[#1C1836]">
            <div className="h-6 w-6 rounded-full bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)]" />
          </div>
          <p className="text-sm font-semibold text-[#111827] dark:text-white">Loading Momentum AI</p>
          <p className="mt-2 text-sm text-[#6B7280] dark:text-[#A1A1AA]">Preparing your workspace and productivity context.</p>
        </div>
      </div>
    );
  }

  if (path === '/') {
    return <LandingPage onGetStarted={() => navigate('/dashboard')} />;
  }

  if (path === '/dashboard') {
    return <Dashboard user={user} onNavigateHome={() => navigate('/')} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC] dark:bg-[#0F1117] px-6 transition-colors duration-200">
      <div className="app-surface w-full max-w-md p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6] dark:text-[#A78BFA]">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#111827] dark:text-white">Workspace not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280] dark:text-[#A1A1AA]">
          The page you requested does not exist in this build of Momentum AI.
        </p>
        <button onClick={() => navigate('/')} className="app-button-primary mt-8">
          Return Home
        </button>
      </div>
    </div>
  );
}

export default App;
