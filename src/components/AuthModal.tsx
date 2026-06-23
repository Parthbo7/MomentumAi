import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  User,
} from 'lucide-react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { ensureUserProfile } from '../firebaseService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const readErrorMessage = (authError: unknown) => (authError instanceof Error ? authError.message : '');
  const readErrorCode = (authError: unknown) =>
    typeof authError === 'object' && authError !== null && 'code' in authError ? String(authError.code) : '';

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in your email and password.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Please add your name so we can personalize your workspace.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name.trim() });
        await ensureUserProfile(result.user, name.trim());
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(result.user);
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (authError: unknown) {
      setLoading(false);
      const message = readErrorMessage(authError);

      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
        setError('Invalid email or password.');
      } else if (message.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (message.includes('auth/weak-password')) {
        setError('Password should be at least 6 characters long.');
      } else {
        setError('We could not complete authentication. Please try again.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
      setLoading(false);
      onSuccess();
      onClose();
    } catch (authError: unknown) {
      setLoading(false);
      if (readErrorCode(authError) !== 'auth/popup-closed-by-user') {
        setError('Google sign in was interrupted. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#111827]/35 px-4 backdrop-blur-sm">
      <div ref={modalRef} className="app-surface grid w-full max-w-[980px] overflow-hidden p-0 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="hidden bg-[linear-gradient(135deg,#6D4AFF,#8B5CF6)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/14">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-8 text-4xl font-bold tracking-tight">Build a calmer planning system.</h2>
            <p className="mt-4 max-w-md text-sm leading-8 text-white/88">
              Momentum AI keeps your calendar, tasks, notes, and AI suggestions in one premium command center designed for focused execution.
            </p>
          </div>

          <div className="space-y-4">
            {[
              'Weekly calendar workspace with large, readable time blocks',
              'Priority-aware task planning and quick scheduling actions',
              'AI recommendations that help before deadlines become stressful',
            ].map((item) => (
              <div key={item} className="rounded-[20px] bg-white/10 px-4 py-4 text-sm leading-7 text-white/90">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#171923] p-6 sm:p-8 lg:p-10 transition-colors duration-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B5CF6]">{isSignUp ? 'Create account' : 'Welcome back'}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
                {isSignUp ? 'Set up your workspace' : 'Sign in to Momentum AI'}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#6B7280] dark:text-[#A1A1AA]">
                {isSignUp ? 'Start planning with a cleaner, calmer workflow.' : 'Continue where your schedule left off.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] dark:border-white/8 bg-white dark:bg-[#171923] text-[#6B7280] dark:text-[#A1A1AA] transition hover:text-[#111827] dark:hover:text-white"
            >
              <ArrowRight className="h-4 w-4 rotate-45" />
            </button>
          </div>

          <div className="mt-8 flex rounded-[18px] bg-[#F8F9FC] dark:bg-[#0F1117] p-1">
            <button
              onClick={() => {
                setIsSignUp(false);
                setError('');
              }}
              className={`flex-1 rounded-[14px] px-4 py-3 text-sm font-semibold transition ${!isSignUp ? 'bg-white dark:bg-[#1E2937] text-[#111827] dark:text-white shadow-[0_10px_24px_-18px_rgba(17,24,39,0.22)]' : 'text-[#6B7280] dark:text-[#A1A1AA]'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setError('');
              }}
              className={`flex-1 rounded-[14px] px-4 py-3 text-sm font-semibold transition ${isSignUp ? 'bg-white dark:bg-[#1E2937] text-[#111827] dark:text-white shadow-[0_10px_24px_-18px_rgba(17,24,39,0.22)]' : 'text-[#6B7280] dark:text-[#A1A1AA]'}`}
            >
              Sign Up
            </button>
          </div>

          {error ? (
            <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-[#FECACA] dark:border-[#991B1B]/30 bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 px-4 py-4 text-sm text-[#B91C1C] dark:text-[#F87171]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
            {isSignUp ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#374151] dark:text-[#A1A1AA]">Full name</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] dark:text-[#4B5563]" />
                  <input className="app-input pl-11" value={name} onChange={(event) => setName(event.target.value)} placeholder="Parth Bulbule" />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#374151] dark:text-[#A1A1AA]">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] dark:text-[#4B5563]" />
                <input
                  type="email"
                  className="app-input pl-11"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#374151] dark:text-[#A1A1AA]">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] dark:text-[#4B5563]" />
                <input
                  type="password"
                  className="app-input pl-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                />
              </div>
            </label>

            <button type="submit" disabled={loading} className="app-button-primary w-full disabled:opacity-70">
              {loading ? 'Please wait...' : isSignUp ? 'Create Workspace' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E5E7EB] dark:bg-white/8" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9CA3AF] dark:text-[#4B5563]">or</span>
            <div className="h-px flex-1 bg-[#E5E7EB] dark:bg-white/8" />
          </div>

          <button onClick={handleGoogleAuth} disabled={loading} className="app-button-secondary w-full disabled:opacity-70">
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
