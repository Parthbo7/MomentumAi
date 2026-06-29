export const TODAY = new Date();

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const timeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

export const nowMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export const formatDuration = (minutes: number) => {
  if (!minutes) return '0m';
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
};

export const getDueLabel = (dueDateRaw: Date | undefined, dueTime?: string) => {
  if (!dueDateRaw) return 'No deadline';
  if (dueDateRaw.getTime() < TODAY.getTime()) return 'Overdue';
  if (sameDay(dueDateRaw, TODAY)) return `Today${dueTime ? ` at ${dueTime}` : ''}`;
  if (sameDay(dueDateRaw, addDays(TODAY, 1))) return `Tomorrow${dueTime ? ` at ${dueTime}` : ''}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dueDateRaw.getMonth()]} ${dueDateRaw.getDate()}${dueTime ? ` at ${dueTime}` : ''}`;
};

export const getRemainingTime = (dueDateRaw: Date | undefined) => {
  if (!dueDateRaw) return 'No due date';
  const diff = dueDateRaw.getTime() - Date.now();
  if (diff <= 0) return 'Due now';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m left`;
};

export const getGreeting = (name: string) => {
  const date = new Date().getDate();
  const funnyHeadlines = [
    `😂 Your assignments have started a fan club waiting for you, ${name}.`,
    `☕ Coffee isn't counted as productivity, ${name}.`,
    `💀 You have opened Momentum AI, ${name}. That's already better than procrastinating.`,
    `🚀 Future ${name} sends regards. Make them proud!`,
    `😴 Your calendar says "Please take a break," ${name}.`,
    `📚 Finish one assignment before opening YouTube, ${name}!`,
    `🎯 Tiny wins become huge streaks, ${name}.`
  ];
  return funnyHeadlines[date % funnyHeadlines.length];
};

export const formatTimeLabel = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutesStr + ' ' + ampm;
};
