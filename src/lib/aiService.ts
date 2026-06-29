import { 
  todayKey, 
  nowMinutes, 
  timeToMinutes, 
  type CalendarEvent
} from '../components/calendar/aiScheduler';

// Fetch helper for Gemini 2.5 Flash API
async function callGemini(prompt: string, apiKey: string, jsonMode: boolean = false): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonMode ? { 
          responseMimeType: 'application/json',
          temperature: 0.2
        } : {
          temperature: 0.7
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    if (jsonMode) {
      try {
        // Remove markdown wrappers if Gemini returned them
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
      } catch (err) {
        console.error('Failed to parse Gemini JSON response:', text, err);
        throw new Error('Invalid JSON format returned by AI');
      }
    }

    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Pings Gemini to verify if the API key is active.
 */
export async function testGeminiConnection(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim() === '') return false;
  try {
    const res = await callGemini("Respond only with the word 'PONG'", apiKey);
    return res.trim().toUpperCase().includes('PONG');
  } catch (e) {
    console.error('Gemini test connection failed:', e);
    return false;
  }
}

interface BriefData {
  tasks: any[];
  events: any[];
  goals: any[];
  habits: any[];
  userName?: string;
}

/**
 * Generates an AI Daily Brief summarizing the user's workload, habits, and goals.
 */
export async function generateDailyBrief(data: BriefData, apiKey: string): Promise<any> {
  const name = data.userName || 'Parth';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  
  const prompt = `
You are a premium personal productivity coach for Momentum AI.
Generate a structured, context-aware daily summary based on the following user data:

User Name: ${name}
Current Time of Day: ${timeOfDay}
Today's Date: ${todayKey()}
Tasks: ${JSON.stringify(data.tasks.map(t => ({ title: t.title, priority: t.priority, completed: t.completed, dueDate: t.dueDateRaw || t.dueDate })))}
Events: ${JSON.stringify(data.events.map(e => ({ title: e.title, start: e.start, end: e.end, completed: e.completed, category: e.category })))}
Goals: ${JSON.stringify(data.goals.map(g => ({ title: g.title, status: g.status, progress: g.progress })))}
Habits: ${JSON.stringify(data.habits.map(h => ({ title: h.title, completedToday: h.completedToday || false })))}

Rules:
1. "estimatedWorkload" should be a number between 0 and 100 indicating workload stress based on tasks/events.
2. "expectedCompletionPct" should be a number between 0 and 100 representing the probability the user will finish everything today.
3. "freeTimeAvailable" should be a short text statement (e.g. "3 hours free" or "None").
4. "bulletPoints" should contain 3-4 short, punchy summary items (e.g. "2 assignments due this week.", "5 habits scheduled.", "Your busiest period is 2 PM - 5 PM.").
5. "suggestedFocus" should be a single clear, actionable task name or study block recommendation.
6. "statusMessage" should be a short 1-sentence summary of the day (e.g., "Today looks manageable.", "Expect a high-stress afternoon.").

Respond STRICTLY with a JSON object in this format:
{
  "greeting": "Good ${timeOfDay}, ${name} 👋",
  "statusMessage": "status message here",
  "bulletPoints": ["point 1", "point 2", "point 3"],
  "suggestedFocus": "suggested focus here",
  "estimatedWorkload": 68,
  "expectedCompletionPct": 85,
  "freeTimeAvailable": "3 hours free"
}
`;

  try {
    return await callGemini(prompt, apiKey, true);
  } catch (err) {
    console.error('Error generating daily brief:', err);
    return {
      greeting: `Good ${timeOfDay}, ${name} 👋`,
      statusMessage: "Today looks manageable.",
      bulletPoints: [
        `You have ${data.tasks.filter(t => !t.completed).length} tasks remaining.`,
        `You have ${data.events.length} classes or meetings.`,
        "Stay focused and build your momentum."
      ],
      suggestedFocus: "Focus on your highest priority task first.",
      estimatedWorkload: 40,
      expectedCompletionPct: 90,
      freeTimeAvailable: "2 hours free"
    };
  }
}

/**
 * Generates context-aware smart productivity advice.
 */
export async function generateSmartAdvice(data: { tasks: any[]; events: any[] }, apiKey: string): Promise<string> {
  const pendingTasks = data.tasks.filter(t => !t.completed);
  const totalEvents = data.events.length;
  
  const prompt = `
You are a witty, slightly sarcastic personal productivity assistant for Momentum AI.
Generate a single-sentence dynamic advice line based on the user's workload:
- Pending Tasks count: ${pendingTasks.length}
- Today's events count: ${totalEvents}

Examples of tone:
- "That assignment has been staring at you longer than your crush."
- "💀 You're one deadline away from becoming a professional procrastinator."
- "🚀 Future You already appreciates Present You."
- "Finish one task before opening twelve more tabs."
- "Even your calendar thinks you need a break."

Rules:
1. Return ONLY a single line of text under 80 characters.
2. Keep it punchy, funny, or highly motivating based on how busy they are. Do not add quotes.
`;

  try {
    const text = await callGemini(prompt, apiKey, false);
    return text.trim().replace(/^"/, '').replace(/"$/, '');
  } catch (err) {
    const fallbacks = [
      "Momentum > Motivation. 🎯",
      "Future You already appreciates Present You. 🚀",
      "Finish one task before opening twelve more tabs. 📚",
      "Even your calendar thinks you need a break. 😴"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Optimizes a single day's schedule using Gemini AI.
 */
export async function optimizeDay(
  dayKey: string,
  events: CalendarEvent[],
  tasks: any[],
  preferences: any,
  apiKey: string
): Promise<{ optimizedEvents: CalendarEvent[]; overloaded: boolean; overloadSuggestion?: string }> {
  
  const workStart = preferences?.workingHoursStart || '09:00 AM';
  const workEnd = preferences?.workingHoursEnd || '10:00 PM';
  const currentMins = nowMinutes();
  
  // Format events and tasks for the prompt
  const lockedEvents = events.filter(e => 
    e.date === dayKey && 
    (e.isLocked || e.flexibleScheduling === false || e.category?.toLowerCase() === 'college' || e.title.toLowerCase().includes('sleep') || e.completed)
  ).map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, isLocked: true }));

  const flexibleEvents = events.filter(e => 
    e.date === dayKey && 
    !(e.isLocked || e.flexibleScheduling === false || e.category?.toLowerCase() === 'college' || e.title.toLowerCase().includes('sleep') || e.completed)
  ).map(e => ({ id: e.id, title: e.title, duration: timeToMinutes(e.end) - timeToMinutes(e.start), priority: e.priority, category: e.category }));

  const unscheduledTasks = tasks.filter(t => !t.completed).map(t => ({
    id: t.id,
    title: t.title,
    duration: t.durationMinutes || 45,
    priority: t.priority || 'medium',
    difficulty: t.difficulty || 'medium',
    category: t.category || 'General',
    preferredTime: t.preferredTime || 'anytime'
  }));

  const prompt = `
You are an expert AI Scheduler. You will allocate time blocks for flexible events and unscheduled tasks for Date: ${dayKey}.
Keep all locked events exactly where they are. Do not overlap any scheduled block.

Constraints:
- Working hours: ${workStart} to ${workEnd}.
- Current time in minutes from midnight (if today): ${currentMins}. Do not schedule tasks in the past!
- Demanding tasks (difficulty: 'heavy') should preferably go in the Morning (${workStart} to 12:00 PM).
- Meetings, classes, medium tasks in the Afternoon (12:00 PM to 5:00 PM).
- Gym, habits, light revision, reading in the Evening/Night (5:00 PM to 10:00 PM).
- Leave 5-10 minutes buffer time between demanding tasks.
- If the schedule becomes overloaded and cannot fit all tasks, set "overloaded": true and provide a helpful recommendation in "overloadSuggestion" suggesting which low-priority task to postpone.

Locked Events (Do NOT move):
${JSON.stringify(lockedEvents)}

Flexible Elements to Schedule:
${JSON.stringify([...flexibleEvents, ...unscheduledTasks])}

Respond strictly in JSON format matching this schema:
{
  "optimizedEvents": [
    {
      "id": "element_id",
      "title": "Title",
      "date": "${dayKey}",
      "start": "hh:mm AM/PM",
      "end": "hh:mm AM/PM",
      "isAiScheduled": true,
      "aiReason": "AI placed this in your morning focus window"
    }
  ],
  "overloaded": false,
  "overloadSuggestion": "Your afternoon is fully packed. Consider postponing 'Read article' to tomorrow."
}
`;

  try {
    const result = await callGemini(prompt, apiKey, true);
    // Combine locked events back with optimized ones
    const optimizedList: CalendarEvent[] = [];
    
    // Add locked ones back
    events.filter(e => e.date === dayKey).forEach(e => {
      const isL = e.isLocked || e.flexibleScheduling === false || e.category?.toLowerCase() === 'college' || e.title.toLowerCase().includes('sleep') || e.completed;
      if (isL) {
        optimizedList.push(e);
      }
    });

    // Add optimized items matching active events
    result.optimizedEvents.forEach((opt: any) => {
      const original = events.find(e => e.id === opt.id) || tasks.find(t => t.id === opt.id);
      if (original) {
        optimizedList.push({
          ...original,
          id: opt.id,
          title: opt.title,
          date: opt.date,
          start: opt.start,
          end: opt.end,
          isAiScheduled: true,
          aiReason: opt.aiReason || '🤖 Placed by AI Coach.'
        } as any);
      }
    });

    return {
      optimizedEvents: optimizedList,
      overloaded: result.overloaded || false,
      overloadSuggestion: result.overloadSuggestion
    };
  } catch (err) {
    console.error('AI Day Optimization failed, falling back to local engine:', err);
    throw err;
  }
}

/**
 * Optimizes a week's schedule, balancing loads across days.
 */
export async function optimizeWeek(
  startDate: string,
  endDate: string,
  events: CalendarEvent[],
  tasks: any[],
  _preferences: any,
  apiKey: string
): Promise<{ optimizedEvents: CalendarEvent[] }> {
  
  // Format week context for Gemini
  const prompt = `
You are an expert AI Scheduler. Distribute flexible tasks intelligently across the week from ${startDate} to ${endDate}.
Avoid overloading consecutive days. Reserve recovery/rest blocks. Keep weekends lighter.
Locked events (e.g. Sleep, College, Gym) cannot be moved.

Respond in JSON format with a list of events:
{
  "optimizedEvents": [
    {
      "id": "task_or_event_id",
      "title": "Title",
      "date": "YYYY-MM-DD",
      "start": "hh:mm AM/PM",
      "end": "hh:mm AM/PM",
      "isAiScheduled": true,
      "aiReason": "Distributed to Tuesday to balance workload."
    }
  ]
}
`;

  try {
    const result = await callGemini(prompt, apiKey, true);
    const optimizedList: CalendarEvent[] = [];

    // Keep locked/fixed events unchanged
    events.forEach(e => {
      const isL = e.isLocked || e.flexibleScheduling === false || e.category?.toLowerCase() === 'college' || e.title.toLowerCase().includes('sleep') || e.completed;
      if (isL) {
        optimizedList.push(e);
      }
    });

    // Add AI scheduled events
    result.optimizedEvents.forEach((opt: any) => {
      const original = events.find(e => e.id === opt.id) || tasks.find(t => t.id === opt.id);
      if (original) {
        optimizedList.push({
          ...original,
          id: opt.id,
          title: opt.title,
          date: opt.date,
          start: opt.start,
          end: opt.end,
          isAiScheduled: true,
          aiReason: opt.aiReason || '🤖 Scheduled by AI Scheduler.'
        } as any);
      }
    });

    return { optimizedEvents: optimizedList };
  } catch (err) {
    console.error('AI Week Optimization failed:', err);
    throw err;
  }
}

/**
 * Generates an AI chatbot response based on the conversation history and user context.
 */
export async function generateChatResponse(
  query: string,
  history: { sender: 'user' | 'ai'; text: string }[],
  context: { tasks: any[]; events: any[]; goals: any[]; habits: any[]; activeSection: string; userProfile?: any },
  apiKey: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is empty');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const { tasks, events, goals, habits, activeSection, userProfile } = context;

  const tasksCtx = tasks && tasks.length > 0
    ? tasks.map(t => `- [${t.priority}] ${t.title} (${t.completed ? 'Completed' : 'Pending'}, Due: ${t.dueDate || 'No date'}, Time: ${t.dueTime || 'No time'})`).join('\n')
    : 'No tasks today.';

  const eventsCtx = events && events.length > 0
    ? events.map(e => `- ${e.title} (${e.start} - ${e.end}, Completed: ${e.completed ? 'Yes' : 'No'})`).join('\n')
    : 'No calendar events today.';

  const goalsCtx = goals && goals.length > 0
    ? goals.map(g => `- ${g.title} (${g.progress}/${g.target}, Status: ${g.status})`).join('\n')
    : 'No goals.';

  const habitsCtx = habits && habits.length > 0
    ? habits.map(h => `- ${h.title} (Streak: ${h.currentStreak || 0} days, Completed Today: ${h.completedToday ? 'Yes' : 'No'})`).join('\n')
    : 'No habits.';

  const systemPrompt = `You are Momentum AI, a premium personal productivity assistant and accountability partner.
The user is currently viewing the "${activeSection}" section of the app.
User Name: ${userProfile?.displayName || 'User'}
Current Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

Here is the user's current productivity context:
=== TODAY'S TASKS ===
${tasksCtx}

=== TODAY'S CALENDAR ===
${eventsCtx}

=== GOALS ===
${goalsCtx}

=== HABITS ===
${habitsCtx}

Rules for your responses:
1. Be extremely helpful, action-oriented, and conversational.
2. Directly reference their current context when relevant (e.g. if they are viewing the Calendar or have pending tasks, mention specific times/tasks).
3. If they ask to optimize their day, plan their day, prioritize, or reschedule, explain what they should do next and guide them.
4. Keep your replies concise and easy to read. Avoid long essays.
5. If the user refers to past topics, use the conversation history to maintain context.`;

  const chatContents = [];
  const recentHistory = history.slice(-15);
  for (const msg of recentHistory) {
    chatContents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  chatContents.push({
    role: 'user',
    parts: [{ text: query }]
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: chatContents,
        generationConfig: {
          temperature: 0.7
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text.trim();
  } catch (error) {
    console.error('Error in generateChatResponse:', error);
    throw error;
  }
}
