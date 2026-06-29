import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Bot, X } from 'lucide-react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceOverlay } from './VoiceOverlay';
import type { AiChatMessage } from '../firebaseService';

interface FloatingAiAssistantProps {
  activeSection: string;
  tasks: any[];
  events: any[];
  goals: any[];
  habits: any[];
  chatHistory: any[];
  chatLoading: boolean;
  onOptimizeDay: () => void;
  onAddTask: () => void;
  onAskAi: (query: string) => void;
  onChatHistoryUpdate?: (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => void;
  setChatLoading?: (loading: boolean) => void;
  isOpenControlled?: boolean;
  setIsOpenControlled?: (open: boolean) => void;
  user: any;
  aiPreferences?: any;
}

export function FloatingAiAssistant({
  activeSection,
  tasks,
  events,
  goals,
  habits,
  chatHistory,
  chatLoading,
  onOptimizeDay,
  onAddTask,
  onAskAi,
  onChatHistoryUpdate,
  setChatLoading,
  isOpenControlled,
  setIsOpenControlled,
  user,
  aiPreferences,
}: FloatingAiAssistantProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : isOpenInternal;
  const setIsOpen = setIsOpenControlled !== undefined ? setIsOpenControlled : setIsOpenInternal;

  const [query, setQuery] = useState('');
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const geminiKey = aiPreferences?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  const sarvamKey = aiPreferences?.sarvamApiKey || import.meta.env.VITE_SARVAM_API_KEY || '';

  const {
    state: voiceState,
    audioAnalyser,
    startVoiceMode,
    stopVoiceMode,
    interrupt,
  } = useVoiceAssistant({
    uid: user?.uid,
    tasks,
    events,
    goals,
    habits,
    activeSection,
    userProfile: user,
    geminiApiKey: geminiKey,
    sarvamApiKey: sarvamKey,
    onOptimizeDay,
    onChatHistoryUpdate,
    setChatLoading,
    chatHistory,
  });

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading, isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, setIsOpen]);

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || chatLoading) return;
    onAskAi(query.trim());
    setQuery('');
  };

  const handleVoiceModeStart = async () => {
    if (aiPreferences && aiPreferences.enableVoiceAssistant === false) {
      alert("Voice Assistant is disabled in preferences. Please enable it in Settings.");
      return;
    }
    setVoiceOverlayOpen(true);
    setIsOpen(false);
    await startVoiceMode();
  };

  const handleVoiceModeStop = () => {
    stopVoiceMode();
    setVoiceOverlayOpen(false);
  };

  const handleToggleMic = () => {
    if (voiceState.mode === 'listening') {
      interrupt();
    } else if (voiceState.mode === 'idle' || voiceState.mode === 'speaking') {
      handleVoiceModeStart();
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'optimize') {
      onOptimizeDay();
      setIsOpen(false);
    } else if (action === 'add') {
      onAddTask();
      setIsOpen(false);
    } else if (action === 'reschedule') {
      onAskAi("Reschedule overdue tasks for today");
    } else {
      onAskAi(action);
    }
  };

  return (
    <>
      <VoiceOverlay
        isOpen={voiceOverlayOpen}
        mode={voiceState.mode}
        transcript={voiceState.transcript}
        aiResponse={voiceState.aiResponse}
        interimTranscript={voiceState.interimTranscript}
        audioAnalyser={audioAnalyser}
        onToggleMic={handleToggleMic}
        onEndCall={handleVoiceModeStop}
        isMuted={isMuted}
        onMute={() => setIsMuted(!isMuted)}
      />

      {/* Chat Panel - slides in from right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[90] w-[400px] max-w-[90vw] flex flex-col border-l border-[#6D5DF6]/15 bg-[#0B0B0F]/97 dark:bg-[#0d0f15]/98 backdrop-blur-2xl shadow-[-20px_0_60px_rgba(0,0,0,0.4)]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/20 px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-300">Momentum AI</h4>
                  <p className="text-[9px] text-[#A1A1AA] font-semibold mt-0.5">
                    Page: <span className="text-[#8B7CF8] font-bold">{activeSection}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 soft-scrollbar bg-[#0B0B0F]/40">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 text-2xl animate-bounce-subtle">
                    &#129302;
                  </div>
                  <div className="space-y-1.5 max-w-[260px]">
                    <p className="text-sm font-bold text-white">How can I assist today?</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">Tap the mic for a voice conversation, or type a message below.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    <button
                      onClick={() => handleQuickAction('optimize')}
                      className="rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20 transition cursor-pointer"
                    >
                      &#9889; Optimize Day
                    </button>
                    <button
                      onClick={() => handleQuickAction('add')}
                      className="rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/20 transition cursor-pointer"
                    >
                      &#10133; Add Task
                    </button>
                    <button
                      onClick={() => handleQuickAction('How should I prioritize today?')}
                      className="rounded-full bg-[#6D5DF6]/10 hover:bg-[#6D5DF6]/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8B7CF8] border border-[#6D5DF6]/20 transition cursor-pointer"
                    >
                      &#128161; Prioritize
                    </button>
                  </div>
                </div>
              ) : (
                chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed flex flex-col ${
                      message.sender === 'ai'
                        ? 'bg-slate-900/60 dark:bg-white/5 border border-white/5 text-white mr-auto'
                        : 'ml-auto bg-gradient-to-tr from-[#6D5DF6] to-[#8B7CF8] text-white shadow-sm'
                    }`}
                  >
                    <span className="whitespace-pre-line font-medium">{message.text}</span>
                    <span className="text-[8px] opacity-40 self-end mt-1 text-right">
                      {new Date(message.timestamp?.toDate ? message.timestamp.toDate() : message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="max-w-[85%] rounded-2xl px-3.5 py-3 text-xs bg-slate-900/60 dark:bg-white/5 border border-white/5 text-white mr-auto flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-[#8B7CF8] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 bg-[#8B7CF8] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 bg-[#8B7CF8] rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] text-gray-400">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions */}
            <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex gap-1.5 overflow-x-auto soft-scrollbar shrink-0">
              <button
                onClick={() => handleQuickAction('optimize')}
                className="shrink-0 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-indigo-400 border border-indigo-500/20 transition cursor-pointer"
              >
                &#9889; Optimize Day
              </button>
              <button
                onClick={() => handleQuickAction('add')}
                className="shrink-0 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-cyan-400 border border-cyan-500/20 transition cursor-pointer"
              >
                &#10133; Add Task
              </button>
              <button
                onClick={() => handleQuickAction('reschedule')}
                className="shrink-0 rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/20 transition cursor-pointer"
              >
                &#128260; Reschedule
              </button>
              <button
                onClick={() => handleQuickAction('How should I prioritize today?')}
                className="shrink-0 rounded-full bg-[#6D5DF6]/10 hover:bg-[#6D5DF6]/20 px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-[#8B7CF8] border border-[#6D5DF6]/20 transition cursor-pointer"
              >
                &#128161; Prioritize
              </button>
            </div>

            {/* Input form & Voice Module */}
            <div className="p-4 border-t border-white/5 bg-slate-950/40 shrink-0">
              {/* Voice status mini-bar */}
              <AnimatePresence>
                {voiceState.mode !== 'idle' && voiceOverlayOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-950/20 border border-purple-500/10">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-[#8B7CF8]"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B7CF8]">
                        {voiceState.mode === 'listening' ? 'Listening...' :
                         voiceState.mode === 'thinking' ? 'Thinking...' :
                         voiceState.mode === 'speaking' ? 'Speaking...' : 'Active'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2.5 items-center">
                {/* Voice mode button */}
                <button
                  type="button"
                  onClick={handleVoiceModeStart}
                  className={`h-10 w-10 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 ${
                    voiceOverlayOpen
                      ? 'bg-[#6D5DF6]/20 border-[#6D5DF6] text-[#8B7CF8]'
                      : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Start voice conversation"
                >
                  <Mic className="h-4.5 w-4.5" />
                </button>

                {/* Input box */}
                <form onSubmit={handleSubmitChat} className="flex-1 flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={chatLoading}
                    placeholder="Ask Momentum AI..."
                    className="flex-1 rounded-xl border border-white/8 bg-[#111318] text-white text-xs px-3.5 py-2.5 outline-none focus:border-[#6D5DF6]/45"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !query.trim()}
                    className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#6D5DF6] to-[#8B7CF8] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
