
interface BadgeIllustrationProps {
  badgeId: string;
  isUnlocked: boolean;
  progress: number;
  target: number;
  badgeName?: string;
  description?: string;
  xpReward?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  isHighlighted?: boolean;
}

export function BadgeIllustration({
  badgeId,
  isUnlocked,
  progress,
  target,
  badgeName,
  description,
  xpReward,
  rarity = 'common',
  isHighlighted
}: BadgeIllustrationProps) {
  const percent = Math.round((progress / target) * 100) || 0;

  // Render specific premium SVG design for each badge
  const renderSVG = () => {
    switch (badgeId) {
      case 'welcome_aboard':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(245,158,11,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="url(#glassGrad)" stroke="url(#goldGrad)" strokeWidth="2.5" />
            <path d="M50 25 L65 38 L65 60 L50 75 L35 60 L35 38 Z" fill="url(#goldGrad)" opacity="0.9" />
            <circle cx="50" cy="46" r="8" fill="#FFFFFF" />
            <rect x="47" y="52" width="6" height="15" rx="3" fill="#FFFFFF" />
            <rect x="52" y="58" width="6" height="4" rx="1" fill="#FFFFFF" />
          </svg>
        );

      case 'first_task':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(99,102,241,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CD7F32" />
                <stop offset="50%" stopColor="#B87333" />
                <stop offset="100%" stopColor="#8B4513" />
              </linearGradient>
              <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#4F46E5" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#bronzeGrad)" strokeWidth="2.5" />
            <path d="M22 35 L12 45 L25 55 L35 45 Z" fill="url(#bronzeGrad)" />
            <path d="M78 35 L88 45 L75 55 L65 45 Z" fill="url(#bronzeGrad)" />
            <circle cx="50" cy="48" r="26" fill="url(#blueGlow)" />
            <path d="M42 48 L48 54 L58 42" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case 'first_goal':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(236,72,153,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#F43F5E" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#pinkGrad)" strokeWidth="2" />
            <circle cx="50" cy="50" r="32" stroke="url(#pinkGrad)" strokeWidth="3" />
            <circle cx="50" cy="50" r="20" stroke="#FFFFFF" strokeWidth="3" />
            <circle cx="50" cy="50" r="8" fill="url(#pinkGrad)" />
            <path d="M48 52 L30 70" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 72 L22 78 L26 74 Z" fill="#FFFFFF" />
            <rect x="25" y="71" width="4" height="4" fill="url(#pinkGrad)" />
          </svg>
        );

      case 'first_note':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(109,74,255,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="noteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#6D4AFF" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#noteGrad)" strokeWidth="2.5" />
            {/* Clipboard backing */}
            <rect x="34" y="28" width="32" height="44" rx="5" stroke="url(#noteGrad)" strokeWidth="3" fill="rgba(255,255,255,0.05)" />
            {/* Clip */}
            <path d="M44 28 V22 H56 V28 Z" fill="url(#noteGrad)" />
            {/* Lines */}
            <line x1="40" y1="38" x2="60" y2="38" stroke="url(#noteGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <line x1="40" y1="46" x2="60" y2="46" stroke="url(#noteGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <line x1="40" y1="54" x2="52" y2="54" stroke="url(#noteGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            {/* Diagonal Pen */}
            <g transform="translate(62, 45) rotate(25)">
              <rect x="-2" y="-14" width="4" height="28" rx="1" fill="url(#noteGrad)" stroke="#FFFFFF" strokeWidth="1" />
              <path d="M-2 -14 L0 -19 L2 -14 Z" fill="#FFFFFF" />
              <rect x="1" y="-8" width="1" height="8" rx="0.5" fill="#FFFFFF" />
            </g>
          </svg>
        );

      case 'calendar_connected':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(6,182,212,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#cyanGrad)" strokeWidth="2" />
            <rect x="32" y="32" width="36" height="36" rx="6" stroke="url(#cyanGrad)" strokeWidth="3" />
            <line x1="32" y1="44" x2="68" y2="44" stroke="url(#cyanGrad)" strokeWidth="2" />
            <line x1="44" y1="32" x2="44" y2="38" stroke="url(#cyanGrad)" strokeWidth="3" strokeLinecap="round" />
            <line x1="56" y1="32" x2="56" y2="38" stroke="url(#cyanGrad)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="42" cy="54" r="3.5" fill="#FFFFFF" />
            <circle cx="58" cy="54" r="3.5" fill="#FFFFFF" />
            <path d="M42 54 H58" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        );

      case 'streak_7':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(234,88,12,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="orangeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
              <linearGradient id="bronzeFlames" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CD7F32" />
                <stop offset="100%" stopColor="#8B4513" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#bronzeFlames)" strokeWidth="2.5" />
            <path d="M50 20 C62 35 68 45 68 56 C68 68 59 74 50 74 C41 74 32 68 32 56 C32 45 38 35 50 20 Z" fill="url(#orangeGrad)" />
            <path d="M50 35 C57 45 60 52 60 60 C60 68 55 70 50 70 C45 70 40 68 40 60 C40 52 43 45 50 35 Z" fill="#FBBF24" opacity="0.9" />
            <text x="50" y="62" fill="#FFFFFF" fontSize="18" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">7</text>
          </svg>
        );

      case 'streak_30':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(107,114,128,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5E7EB" />
                <stop offset="50%" stopColor="#9CA3AF" />
                <stop offset="100%" stopColor="#4B5563" />
              </linearGradient>
              <linearGradient id="streak30Grad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#6B7280" />
                <stop offset="50%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#silverGrad)" strokeWidth="2.5" />
            <path d="M50 18 C65 33 70 43 70 55 C70 69 60 76 50 76 C40 76 30 69 30 55 C30 43 35 33 50 18 Z" fill="url(#streak30Grad)" />
            <path d="M50 32 C58 42 62 50 62 58 C62 67 56 69 50 69 C44 69 38 67 38 58 C38 50 42 42 50 32 Z" fill="#FFFFFF" opacity="0.8" />
            <text x="50" y="58" fill="#111827" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="middle">30</text>
          </svg>
        );

      case 'streak_100':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_20px_rgba(245,158,11,0.4)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldMedal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="goldStreak" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="85%" stopColor="#FCD34D" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#goldMedal)" strokeWidth="3" />
            <circle cx="50" cy="50" r="39" stroke="url(#goldMedal)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M50 15 C68 31 72 41 72 54 C72 71 60 78 50 78 C40 78 28 71 28 54 C28 41 32 31 50 15 Z" fill="url(#goldStreak)" />
            <path d="M42 22 L45 28 L51 25 L50 31 L56 32 L49 35 L50 41 L45 37 L39 41 L42 34 L36 32 L42 31 Z" fill="#FCD34D" opacity="0.9" />
            <text x="50" y="60" fill="#FFFFFF" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="middle">100</text>
          </svg>
        );

      case 'goal_achiever':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(16,185,129,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#emeraldGrad)" strokeWidth="2" />
            <path d="M36 28 H64 V44 C64 52 58 58 50 58 C42 58 36 52 36 44 Z" fill="url(#emeraldGrad)" />
            <path d="M46 58 H54 V70 H46 Z" fill="url(#emeraldGrad)" />
            <path d="M38 70 H62 V74 H38 Z" fill="url(#emeraldGrad)" />
            <path d="M36 34 H30 V42 H36" stroke="url(#emeraldGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M64 34 H70 V42 H64" stroke="url(#emeraldGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="50" cy="42" r="4" fill="#FFFFFF" />
          </svg>
        );

      case 'goal_master':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(245,158,11,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goalMasterGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="50%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#goalMasterGold)" strokeWidth="2.5" />
            <path d="M26 62 L32 36 L44 48 L50 30 L56 48 L68 36 L74 62 Z" fill="url(#goalMasterGold)" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="24" y="64" width="52" height="6" rx="2" fill="url(#goalMasterGold)" />
            <circle cx="32" cy="34" r="2.5" fill="#FFFFFF" />
            <circle cx="50" cy="28" r="2.5" fill="#FFFFFF" />
            <circle cx="68" cy="34" r="2.5" fill="#FFFFFF" />
          </svg>
        );

      case 'task_crusher':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(59,130,246,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
              <linearGradient id="goldGlint" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#metalGrad)" strokeWidth="2.5" />
            <path d="M28 58 H72 V66 H28 Z" fill="url(#metalGrad)" />
            <path d="M34 40 H66 C66 48 58 58 58 58 H42 C42 58 34 48 34 40 Z" fill="url(#metalGrad)" />
            <path d="M22 40 C34 40 34 46 34 46 H22 V40 Z" fill="url(#metalGrad)" opacity="0.8" />
            <path d="M52 18 L40 34 H50 L42 50 L60 32 H48 Z" fill="url(#goldGlint)" />
          </svg>
        );

      case 'productivity_machine':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(139,92,246,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="purpleGears" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#6D4AFF" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#purpleGears)" strokeWidth="2.5" />
            <g transform="translate(50,50)">
              <circle cx="0" cy="0" r="18" fill="none" stroke="url(#purpleGears)" strokeWidth="8" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <rect
                  key={angle}
                  x="-4"
                  y="-24"
                  width="8"
                  height="10"
                  rx="1.5"
                  fill="url(#purpleGears)"
                  transform={`rotate(${angle})`}
                />
              ))}
              <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
            </g>
            <g transform="translate(70,68) scale(0.6)">
              <circle cx="0" cy="0" r="18" fill="none" stroke="url(#purpleGears)" strokeWidth="8" />
              {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                <rect
                  key={angle}
                  x="-4"
                  y="-24"
                  width="8"
                  height="10"
                  rx="1.5"
                  fill="url(#purpleGears)"
                  transform={`rotate(${angle})`}
                />
              ))}
            </g>
          </svg>
        );

      case 'ai_explorer':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(168,85,247,0.25)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="aiChipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#aiChipGrad)" strokeWidth="2" />
            <rect x="32" y="32" width="36" height="36" rx="6" fill="url(#aiChipGrad)" />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x={38 + i * 8} y="26" width="4" height="6" fill="url(#aiChipGrad)" rx="1" />
                <rect x={38 + i * 8} y="68" width="4" height="6" fill="url(#aiChipGrad)" rx="1" />
                <rect x="26" y={38 + i * 8} width="6" height="4" fill="url(#aiChipGrad)" rx="1" />
                <rect x="68" y={38 + i * 8} width="6" height="4" fill="url(#aiChipGrad)" rx="1" />
              </g>
            ))}
            <circle cx="50" cy="50" r="10" fill="#FFFFFF" />
            <path d="M47 50 C47 47 53 47 53 50 M47 52 C47 55 53 55 53 52" stroke="url(#aiChipGrad)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'ai_power_user':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(236,72,153,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="aiPowerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#aiPowerGrad)" strokeWidth="2.5" />
            <polygon points="50,22 75,36 75,64 50,78 25,64 25,36" fill="url(#aiPowerGrad)" opacity="0.8" stroke="#FFFFFF" strokeWidth="1.5" />
            <line x1="50" y1="22" x2="50" y2="78" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="25" y1="36" x2="75" y2="64" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="25" y1="64" x2="75" y2="36" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="7" fill="#FFFFFF" className="animate-pulse" />
          </svg>
        );

      case 'early_adopter':
        return (
          <svg className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(251,191,36,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.04)" stroke="url(#rocketGrad)" strokeWidth="2.5" />
            <g transform="translate(10,-5)">
              <path d="M50 20 C50 20 62 42 58 60 C54 72 46 72 42 60 C38 42 50 20 50 20 Z" fill="url(#rocketGrad)" />
              <path d="M42 54 L32 64 C32 64 36 68 43 60 Z" fill="url(#rocketGrad)" opacity="0.8" />
              <path d="M58 54 L68 64 C68 64 64 68 57 60 Z" fill="url(#rocketGrad)" opacity="0.8" />
              <circle cx="50" cy="40" r="4.5" fill="#FFFFFF" />
              <path d="M46 68 L50 82 L54 68 Z" fill="#FBBF24" />
            </g>
          </svg>
        );

      case 'momentum_legend':
        return (
          <svg className="w-18 h-18 drop-shadow-[0_8px_24px_rgba(139,92,246,0.5)] animate-glow-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="legendGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="30%" stopColor="#8B5CF6" />
                <stop offset="70%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#6D4AFF" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="44" fill="url(#legendGrad)" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="38" fill="rgba(23, 25, 35, 0.85)" stroke="url(#legendGrad)" strokeWidth="2.5" />
            <g transform="translate(50,50)" filter="url(#glow)">
              <polygon points="0,-25 6,-6 25,0 6,6 0,25 -6,6 -25,0 -6,-6" fill="url(#legendGrad)" />
              <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#FFFFFF" />
              <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
            </g>
          </svg>
        );

      default:
        return (
          <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="44" fill="gray" opacity="0.3" />
          </svg>
        );
    }
  };

  const rarityInfo = {
    common: {
      border: 'border-slate-300/30 dark:border-slate-700/30 bg-gradient-to-b from-slate-500/5 to-transparent backdrop-blur-sm bg-white/5 shadow-sm',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-750',
      label: 'Common',
      color: 'text-slate-500 dark:text-slate-400'
    },
    rare: {
      border: 'border-amber-400/30 dark:border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent backdrop-blur-md bg-white/5 shadow-[0_8px_22px_-6px_rgba(245,158,11,0.2)]',
      badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30',
      label: 'Rare',
      color: 'text-amber-500 dark:text-amber-400'
    },
    epic: {
      border: 'border-indigo-500/30 dark:border-indigo-400/30 bg-gradient-to-b from-indigo-500/10 via-pink-500/5 to-transparent backdrop-blur-xl bg-white/10 shadow-[0_8px_25px_-6px_rgba(99,102,241,0.3)]',
      badge: 'bg-gradient-to-r from-indigo-500/20 to-pink-500/20 text-indigo-500 dark:text-indigo-300 border border-indigo-300/30 dark:border-indigo-800/30',
      label: 'Epic',
      color: 'text-indigo-500 dark:text-indigo-400'
    },
    legendary: {
      border: 'border-purple-500/30 bg-gradient-to-b from-purple-500/10 via-indigo-500/5 to-transparent backdrop-blur-2xl bg-white/15 shadow-[0_8px_30px_-6px_rgba(139,92,246,0.4)]',
      badge: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold shadow-[0_0_12px_rgba(139,92,246,0.5)]',
      label: 'Legendary',
      color: 'text-purple-600 dark:text-purple-400 font-extrabold tracking-wide'
    }
  };

  const style = rarityInfo[rarity];

  // Wrapper card content
  const renderCardContent = () => (
    <div className={`relative flex flex-col items-center justify-between p-4.5 rounded-[22px] h-full text-center transition-all duration-300 ${isHighlighted ? 'ring-4 ring-[#8B5CF6] scale-105 shadow-[0_0_25px_rgba(139,92,246,0.6)] animate-glow-pulse' : 'hover:scale-[1.04] hover:-translate-y-1.5 hover:shadow-lg'} ${rarity !== 'legendary' ? style.border : 'border border-white/5 bg-[#171923]/92 shadow-[0_8px_30px_-10px_rgba(139,92,246,0.5)]'}`}>
      
      {/* Glow shadow ring on hover if unlocked */}
      {isUnlocked && rarity !== 'legendary' && (
        <div className="absolute -inset-1 rounded-[22px] bg-gradient-to-tr from-[#6D4AFF]/10 to-[#EC4899]/10 opacity-0 hover:opacity-100 blur transition duration-300 pointer-events-none" />
      )}

      {/* Floating high-priority notification tooltip if highlighted */}
      {isHighlighted && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-[#6D4AFF] to-[#EC4899] text-white text-[10.5px] font-black px-3.5 py-1 rounded-full shadow-[0_4px_15px_rgba(109,74,255,0.5)] whitespace-nowrap animate-bounce-subtle">
          New badge unlocked!
        </div>
      )}

      {/* Rarity particle drift shimmer for Legendary badges */}
      {rarity === 'legendary' && isUnlocked && (
        <div className="absolute inset-0 overflow-hidden rounded-[22px] pointer-events-none">
          <div className="absolute top-2 left-3 w-1 h-1 bg-yellow-300 rounded-full animate-particle-drift opacity-75" />
          <div className="absolute top-10 right-4 w-1.5 h-1.5 bg-white rounded-full animate-particle-drift [animation-delay:1.2s] opacity-70" />
          <div className="absolute bottom-6 left-5 w-1 h-1 bg-purple-400 rounded-full animate-particle-drift [animation-delay:2.4s] opacity-75" />
          <div className="absolute bottom-10 right-10 w-1 h-1 bg-pink-400 rounded-full animate-particle-drift [animation-delay:3.6s] opacity-75" />
        </div>
      )}

      {/* Badge Illustration */}
      <div className={`relative transition-all duration-300 mt-2 ${!isUnlocked ? 'filter grayscale opacity-30' : ''}`}>
        {renderSVG()}
        
        {/* Lock Overlay on SVG */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#11131E]/95 border border-white/5 h-8 w-8 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Text Info */}
      <div className="mt-3.5 w-full flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h5 className="text-[13px] font-bold text-[#111827] dark:text-white truncate max-w-[110px]">{badgeName || 'Achievement'}</h5>
            <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.badge}`}>
              {style.label}
            </span>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-[#6B7280] dark:text-[#A1A1AA] line-clamp-2 h-8">
            {description || 'Workspace achievement'}
          </p>
        </div>

        {/* Progress details */}
        <div className="mt-3.5 w-full">
          {isUnlocked ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Unlocked</span>
                <span className="font-black text-purple-600 dark:text-purple-400">+{xpReward ?? 25} XP</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-emerald-500/10 border border-emerald-500/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">{percent}% Done</span>
                <span className="text-gray-400 dark:text-gray-505">+{xpReward ?? 25} XP</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-150 dark:bg-gray-800/60 overflow-hidden border dark:border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#6D4AFF] to-[#8B5CF6] rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[9.5px] text-gray-500 dark:text-gray-400 font-medium text-left">
                Progress: <span className="font-bold text-gray-700 dark:text-gray-300">{progress}</span> / {target}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // For Legendary rarity, render the animated border spin wrapper
  if (rarity === 'legendary') {
    return (
      <div id={`badge-${badgeId}`} className="p-[1.5px] rounded-[24px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-shimmer-border h-full shadow-lg">
        {renderCardContent()}
      </div>
    );
  }

  return (
    <div id={`badge-${badgeId}`} className="h-full">
      {renderCardContent()}
    </div>
  );
}
