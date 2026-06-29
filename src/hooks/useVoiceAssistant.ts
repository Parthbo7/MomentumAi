import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceActivityDetector } from '../lib/vad';
import { transcribeAudio, synthesizeSpeech, streamAiResponse, parseVoiceCommand } from '../lib/voiceService';
import { dbAddTask, dbAddEvent, dbUpdateEvent, dbSaveAiMessage, type AiChatMessage } from '../firebaseService';

export type VoiceMode = 'idle' | 'listening' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'processing';

export interface VoiceAssistantState {
  mode: VoiceMode;
  transcript: string;
  aiResponse: string;
  isSpeaking: boolean;
  isListening: boolean;
  error: string | null;
  interimTranscript: string;
}
interface UseVoiceAssistantOptions {
  uid?: string;
  tasks: any[];
  events: any[];
  goals: any[];
  habits: any[];
  activeSection: string;
  userProfile?: any;
  geminiApiKey: string;
  sarvamApiKey: string;
  onOptimizeDay: () => void;
  onChatHistoryUpdate?: (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => void;
  setChatLoading?: (loading: boolean) => void;
  chatHistory: any[];
}

export function useVoiceAssistant({
  uid,
  tasks,
  events,
  goals,
  habits,
  activeSection,
  userProfile,
  geminiApiKey,
  sarvamApiKey,
  onOptimizeDay,
  onChatHistoryUpdate,
  setChatLoading,
  chatHistory,
}: UseVoiceAssistantOptions) {
  const [state, setState] = useState<VoiceAssistantState>({
    mode: 'idle',
    transcript: '',
    aiResponse: '',
    isSpeaking: false,
    isListening: false,
    error: null,
    interimTranscript: '',
  });

  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInterruptedRef = useRef(false);
  const shouldResumeListeningRef = useRef(false);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const modeRef = useRef<VoiceMode>('idle');

  // Keep modeRef in sync and handle loading state
  useEffect(() => {
    modeRef.current = state.mode;
    if (setChatLoading) {
      setChatLoading(
        state.mode === 'thinking' ||
        state.mode === 'transcribing' ||
        state.mode === 'processing' ||
        state.mode === 'recording'
      );
    }
  }, [state.mode, setChatLoading]);



  const stopTts = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    isInterruptedRef.current = true;
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const startListening = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        mode: 'listening',
        isListening: true,
        error: null,
        transcript: '',
        aiResponse: '',
        interimTranscript: '',
      }));

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;

      // Set up AudioContext for waveform visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;

      // Initialize VAD
      const vad = new VoiceActivityDetector({
        stream,
        onSpeechStart: () => {
          setState(prev => ({
            ...prev,
            mode: 'listening',
            interimTranscript: '',
          }));
        },
        onSpeechEnd: async (audioBlob) => {
          // Speech ended - process the audio
          setState(prev => ({ ...prev, mode: 'recording' }));
          await processAudio(audioBlob);
        },
        onSpeechData: (_data) => {
          // Could use for real-time waveform updates
        },
      });

      vadRef.current = vad;
      await vad.start();
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      setState(prev => ({
        ...prev,
        mode: 'idle',
        isListening: false,
        error: err.message || 'Failed to access microphone',
      }));
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (isInterruptedRef.current) return;

    try {
      // Transcribe
      setState(prev => ({ ...prev, mode: 'transcribing' }));
      const transcript = await transcribeAudio(audioBlob, sarvamApiKey);

      if (!transcript || !transcript.trim()) {
        // No speech detected, resume listening
        if (shouldResumeListeningRef.current) {
          await resumeListening();
        } else {
          setState(prev => ({ ...prev, mode: 'idle', isListening: false }));
        }
        return;
      }

      setState(prev => ({ ...prev, transcript, interimTranscript: '' }));

      // Add user message to chat
      const userMsg: AiChatMessage = {
        uid: uid || '',
        sender: 'user',
        text: transcript,
        timestamp: new Date(),
      };
      onChatHistoryUpdate?.(prev => [...prev, userMsg]);
      if (uid) {
        dbSaveAiMessage(uid, 'user', transcript).catch(console.error);
      }

      // Get AI response
      await getAiResponse(transcript);
    } catch (err: any) {
      console.error('Error processing audio:', err);
      setState(prev => ({
        ...prev,
        mode: 'idle',
        isListening: false,
        error: err.message || 'Failed to process audio',
      }));
    }
  }, [sarvamApiKey, uid, tasks, events, onChatHistoryUpdate, onOptimizeDay]);

  const getAiResponse = useCallback(async (userMessage: string) => {
    if (isInterruptedRef.current) return;

    setState(prev => ({ ...prev, mode: 'thinking' }));

    try {
      let fullResponse = '';
      let sentenceBuffer = '';
      let isFirstSentence = true;

      // Add to conversation history
      conversationHistoryRef.current.push({ role: 'user', content: userMessage });

      // Stream AI response
      const stream = streamAiResponse(
        userMessage,
        conversationHistoryRef.current,
        { tasks, events, goals, habits, activeSection, userProfile },
        geminiApiKey
      );

      // Append a streaming placeholder message first
      onChatHistoryUpdate?.(prev => [
        ...prev,
        { uid: uid || '', sender: 'ai', text: '', timestamp: new Date() }
      ]);

      for await (const chunk of stream) {
        if (isInterruptedRef.current) return;

        fullResponse += chunk;
        sentenceBuffer += chunk;

        // Update displayed response in real-time
        setState(prev => ({ ...prev, aiResponse: fullResponse }));
        onChatHistoryUpdate?.(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.sender === 'ai') {
            last.text = fullResponse;
          }
          return next;
        });

        // Check for sentence completion (for TTS)
        const sentenceEnd = sentenceBuffer.match(/[.!?]\s/);
        if (sentenceEnd) {
          const sentenceEndIndex = sentenceBuffer.indexOf(sentenceEnd[0]) + sentenceEnd[0].length;
          const sentenceToSpeak = sentenceBuffer.slice(0, sentenceEndIndex).trim();
          sentenceBuffer = sentenceBuffer.slice(sentenceEndIndex);

          // Start speaking this sentence
          if (sentenceToSpeak) {
            await speakSentence(sentenceToSpeak, isFirstSentence);
            isFirstSentence = false;
          }
        }
      }

      // Speak any remaining text in buffer
      if (sentenceBuffer.trim() && !isInterruptedRef.current) {
        await speakSentence(sentenceBuffer.trim(), isFirstSentence);
      }

      if (uid) {
        dbSaveAiMessage(uid, 'ai', fullResponse).catch(console.error);
      }

      // Save to conversation history
      conversationHistoryRef.current.push({ role: 'model', content: fullResponse });

      // Execute voice commands if applicable
      await executeVoiceCommand(userMessage, fullResponse);

      // After speaking, resume listening if in continuous mode
      if (!isInterruptedRef.current && shouldResumeListeningRef.current) {
        setState(prev => ({ ...prev, mode: 'speaking', isSpeaking: true }));
        // Wait for any remaining TTS to finish
        await waitForTtsEnd();
        if (!isInterruptedRef.current) {
          await resumeListening();
        }
      } else {
        setState(prev => ({ ...prev, mode: 'idle', isListening: false, isSpeaking: false }));
      }
    } catch (err: any) {
      console.error('Error getting AI response:', err);
      setState(prev => ({
        ...prev,
        mode: 'idle',
        isListening: false,
        isSpeaking: false,
        error: err.message || 'Failed to get AI response',
      }));
    }
  }, [geminiApiKey, tasks, events, uid, onChatHistoryUpdate, onOptimizeDay]);

  const speakSentence = useCallback(async (text: string, _isFirst: boolean) => {
    if (isInterruptedRef.current) return;

    try {
      setState(prev => ({ ...prev, mode: 'speaking', isSpeaking: true }));

      const base64Audio = await synthesizeSpeech(text, sarvamApiKey);
      if (isInterruptedRef.current) return;

      if (base64Audio) {
        await new Promise<void>((resolve) => {
          const audio = new Audio('data:audio/wav;base64,' + base64Audio);
          currentAudioRef.current = audio;

          audio.onended = () => {
            currentAudioRef.current = null;
            resolve();
          };

          audio.onerror = () => {
            currentAudioRef.current = null;
            resolve();
          };

          audio.play().catch(() => resolve());
        });
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  }, [sarvamApiKey]);

  const waitForTtsEnd = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!currentAudioRef.current) {
        resolve();
        return;
      }
      const check = setInterval(() => {
        if (!currentAudioRef.current) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }, []);

  const resumeListening = useCallback(async () => {
    if (isInterruptedRef.current) return;

    setState(prev => ({
      ...prev,
      mode: 'listening',
      isListening: true,
      transcript: '',
      aiResponse: '',
      interimTranscript: '',
    }));

    // The VAD should still be running on the same stream
    if (vadRef.current) {
      try {
        vadRef.current.resume();
      } catch {
        // If VAD stopped, restart it
        await startListening();
      }
    } else {
      await startListening();
    }
  }, [startListening]);

  const executeVoiceCommand = useCallback(async (transcript: string, _aiResponse: string) => {
    // Parse and execute voice commands in the background
    try {
      const actionResult = await parseVoiceCommand(transcript, { tasks, events }, geminiApiKey);

      if (actionResult.action === 'add_task' && actionResult.details && uid) {
        await dbAddTask(uid, {
          title: actionResult.details.title || 'Voice Task',
          description: '',
          priority: (actionResult.details.priority || 'medium') as any,
          durationMinutes: actionResult.details.durationMinutes || 30,
          status: 'not_started',
          completed: false,
          dueDate: actionResult.details.dueDate ? new Date(actionResult.details.dueDate) : new Date(),
        });
      } else if (actionResult.action === 'add_event' && actionResult.details && uid) {
        const startTime = actionResult.details.startTime ? new Date(actionResult.details.startTime) : new Date();
        const endTime = actionResult.details.endTime
          ? new Date(actionResult.details.endTime)
          : new Date(startTime.getTime() + 60 * 60 * 1000);
        await dbAddEvent(uid, {
          title: actionResult.details.title || 'Voice Event',
          description: 'Added via Voice Assistant',
          startTime,
          endTime,
          source: 'manual',
          category: actionResult.details.category || 'Personal',
        });
      } else if (actionResult.action === 'move_event' && actionResult.details) {
        let match = events.find((e: any) => e.id === actionResult.details!.eventId);
        if (!match && actionResult.details.title) {
          match = events.find((e: any) =>
            e.title.toLowerCase().includes(actionResult.details!.title!.toLowerCase())
          );
        }
        if (match) {
          let startTime = new Date();
          if (actionResult.details.targetDate && actionResult.details.startTime) {
            const [y, m, d] = actionResult.details.targetDate.split('-').map(Number);
            const [timeStr, period] = actionResult.details.startTime.split(' ');
            const [hrs, mins] = timeStr.split(':').map(Number);
            let hours = hrs % 12;
            if (period === 'PM') hours += 12;
            startTime = new Date(y, m - 1, d, hours, mins, 0, 0);
          }
          const duration =
            match.endTime && match.startTime
              ? new Date(match.endTime).getTime() - new Date(match.startTime).getTime()
              : 60 * 60 * 1000;
          const endTime = new Date(startTime.getTime() + duration);
          await dbUpdateEvent(match.id, { startTime, endTime });
        }
      } else if (actionResult.action === 'optimize_day' || actionResult.action === 'optimize_week') {
        onOptimizeDay();
      }
    } catch (err) {
      console.error('Error executing voice command:', err);
    }
  }, [tasks, events, geminiApiKey, uid, onOptimizeDay]);

  const interrupt = useCallback(() => {
    isInterruptedRef.current = true;
    stopTts();

    // Cancel any pending AI request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      mode: 'listening',
      aiResponse: '',
      isSpeaking: false,
    }));

    // Resume listening
    setTimeout(() => {
      isInterruptedRef.current = false;
      resumeListening();
    }, 100);
  }, [stopTts, resumeListening]);

  const startVoiceMode = useCallback(async () => {
    isInterruptedRef.current = false;
    shouldResumeListeningRef.current = true;
    conversationHistoryRef.current = chatHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.text
    }));
    await startListening();
  }, [startListening, chatHistory]);

  const stopVoiceMode = useCallback(() => {
    isInterruptedRef.current = true;
    shouldResumeListeningRef.current = false;
    stopTts();

    // Stop VAD
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioAnalyserRef.current = null;

    setState({
      mode: 'idle',
      transcript: '',
      aiResponse: '',
      isSpeaking: false,
      isListening: false,
      error: null,
      interimTranscript: '',
    });
  }, [stopTts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInterruptedRef.current = true;
      vadRef.current?.destroy();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
      currentAudioRef.current?.pause();
    };
  }, []);

  return {
    state,
    audioAnalyser: audioAnalyserRef.current,
    startVoiceMode,
    stopVoiceMode,
    interrupt,
    startListening,
    stopListening: stopVoiceMode,
  };
}
