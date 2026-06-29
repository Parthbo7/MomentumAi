import { todayKey } from '../components/calendar/aiScheduler';

/**
 * Transcribes audio blob using Sarvam's Speech-to-Text API.
 */
export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Sarvam AI API key is not configured.');

  const formData = new FormData();
  const filename = audioBlob.type.includes('wav') ? 'audio.wav' : 'audio.webm';
  formData.append('file', audioBlob, filename);
  formData.append('model', 'saaras:v3');
  formData.append('language_code', 'en-IN');

  const url = 'https://api.sarvam.ai/speech-to-text';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam STT failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.transcript || '';
}

/**
 * Synthesizes text into base64 speech audio using Sarvam's Text-to-Speech API.
 */
export async function synthesizeSpeech(text: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Sarvam AI API key is not configured.');

  const url = 'https://api.sarvam.ai/text-to-speech';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      target_language_code: 'en-IN',
      speaker: 'aditya',
      model: 'bulbul:v3',
      speech_sample_rate: 24000,
      pace: 1.0,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam TTS failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (data.audios && data.audios[0]) {
    return data.audios[0]; // base64 string
  }
  throw new Error('No audio returned from Sarvam AI');
}

/**
 * Streams an AI response from Gemini, yielding text chunks as they arrive.
 */
export async function* streamAiResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: { tasks: any[]; events: any[]; goals?: any[]; habits?: any[]; activeSection?: string; userProfile?: any },
  geminiApiKey: string
): AsyncGenerator<string> {
  if (!geminiApiKey) throw new Error('Gemini API key is not configured.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${geminiApiKey}`;

  const { tasks, events, goals = [], habits = [], activeSection = 'Dashboard', userProfile } = context;

  const tasksCtx = tasks && tasks.length > 0
    ? tasks.slice(0, 10).map((t: any) => `- [${t.priority}] ${t.title} (${t.completed ? 'Completed' : 'Pending'})`).join('\n')
    : 'No tasks.';

  const eventsCtx = events && events.length > 0
    ? events.slice(0, 10).map((e: any) => `- ${e.title} (${e.start} - ${e.end}, Completed: ${e.completed ? 'Yes' : 'No'})`).join('\n')
    : 'No events.';

  const goalsCtx = goals && goals.length > 0
    ? goals.map((g: any) => `- ${g.title} (${g.progress}/${g.target}, Status: ${g.status})`).join('\n')
    : 'No goals.';

  const habitsCtx = habits && habits.length > 0
    ? habits.map((h: any) => `- ${h.title} (Streak: ${h.currentStreak || 0} days, Completed Today: ${h.completedToday ? 'Yes' : 'No'})`).join('\n')
    : 'No habits.';

  const systemPrompt = `You are Momentum AI, a premium personal productivity voice assistant. You are speaking directly to the user through voice, so keep responses conversational, concise, and natural.
The user is currently viewing the "${activeSection}" section of the app.
User Name: ${userProfile?.displayName || 'User'}
Current Date: ${todayKey()}
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

Rules:
- Respond like a natural conversational assistant, not a chatbot.
- Keep responses under 3 sentences unless the user asks for detail.
- Use natural speech patterns - contractions, casual tone.
- Do NOT use markdown, bullet points, or formatting - this will be spoken aloud.
- If the user asks about their schedule, reference their actual tasks and events.
- Be helpful, motivating, and slightly witty.
- For voice commands (add task, schedule event, etc.), confirm naturally like "Done! I've added that task."`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood! I\'m ready to help as your voice assistant.' }] },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini streaming failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}

export interface VoiceActionContract {
  action: 'add_task' | 'add_event' | 'move_event' | 'optimize_day' | 'optimize_week' | 'none';
  details?: {
    title?: string;
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // hh:mm AM/PM
    priority?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    durationMinutes?: number;
    targetDate?: string; // YYYY-MM-DD
    eventId?: string;
    startTime?: string;
    endTime?: string;
  };
  reply: string;
}

/**
 * Uses Gemini to parse a text transcript into a structured voice command contract.
 */
export async function parseVoiceCommand(
  transcript: string,
  context: { tasks: any[]; events: any[] },
  geminiApiKey: string
): Promise<VoiceActionContract> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const prompt = `
You are the natural language parser for Momentum AI's Voice Assistant.
Parse the user's voice command and map it to a structured action contract.

Current Date context: ${todayKey()}
User Voice Transcript: "${transcript}"
Current Tasks: ${JSON.stringify(context.tasks.map(t => ({ id: t.id, title: t.title })))}
Current Events: ${JSON.stringify(context.events.map(e => ({ id: e.id, title: e.title, date: e.date })))}

Supported Actions:
1. 'add_task': Add a new task. Details: title, dueDate, dueTime, priority, category, durationMinutes.
2. 'add_event': Add a calendar time block/meeting. Details: title, targetDate, startTime, endTime, category.
3. 'move_event': Reschedule/move an existing event. Details: eventId, targetDate, startTime.
4. 'optimize_day': Run daily schedule optimizer.
5. 'optimize_week': Run weekly schedule optimizer.
6. 'none': Generic conversation or question.

Rules:
- Resolve relative dates like "tomorrow", "Friday", "next week" based on the current date context.
- For 'move_event', find the matching event ID from the Current Events list.
- Reply should be a short, direct confirmation (e.g. "Sure, moving Gym to tomorrow.").
- If user is asking a question (e.g., "what's my schedule?"), action is 'none' and reply should answer the query using the context.

Respond STRICTLY with a JSON object following this schema:
{
  "action": "add_task" | "add_event" | "move_event" | "optimize_day" | "optimize_week" | "none",
  "details": { ... },
  "reply": "Natural voice response confirming the action"
}
`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini parsing failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error('Error parsing voice command:', err);
    return {
      action: 'none',
      reply: 'Sorry, I encountered an error processing that instruction.'
    };
  }
}
