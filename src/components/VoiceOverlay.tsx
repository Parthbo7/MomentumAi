import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Phone, Settings, Volume2, VolumeX } from 'lucide-react';
import { VoiceOrb } from './VoiceOrb';
import type { VoiceMode } from '../hooks/useVoiceAssistant';

interface VoiceOverlayProps {
  isOpen: boolean;
  mode: VoiceMode;
  transcript: string;
  aiResponse: string;
  interimTranscript: string;
  audioAnalyser: AnalyserNode | null;
  onToggleMic: () => void;
  onEndCall: () => void;
  onMute?: () => void;
  isMuted?: boolean;
}

const modeStatusConfig: Record<VoiceMode, { label: string; color: string }> = {
  idle: { label: 'Tap to speak', color: '#8B7CF8' },
  listening: { label: 'Listening...', color: '#A78BFA' },
  recording: { label: 'Processing audio...', color: '#C4B5FD' },
  transcribing: { label: 'Transcribing...', color: '#A78BFA' },
  thinking: { label: 'Thinking...', color: '#818CF8' },
  speaking: { label: 'Speaking...', color: '#A78BFA' },
  processing: { label: 'Processing...', color: '#A78BFA' },
};

export function VoiceOverlay({
  isOpen,
  mode,
  transcript,
  aiResponse,
  interimTranscript,
  audioAnalyser,
  onToggleMic,
  onEndCall,
  onMute,
  isMuted = false,
}: VoiceOverlayProps) {
  const status = modeStatusConfig[mode] || modeStatusConfig.idle;
  const isListening = mode === 'listening';
  const isSpeaking = mode === 'speaking';
  const isThinking = mode === 'thinking';
  const isProcessing = mode === 'transcribing' || mode === 'recording' || mode === 'processing';
  const showTranscript = transcript || interimTranscript || aiResponse;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onEndCall();
    }
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      onToggleMic();
    }
  }, [isOpen, onEndCall, onToggleMic]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] voice-overlay-glass flex flex-col items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onEndCall();
          }}
        >
          {/* Subtle ambient gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute rounded-full blur-[150px]"
              style={{
                width: 500,
                height: 500,
                background: 'radial-gradient(circle, rgba(109, 74, 255, 0.08), transparent 70%)',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                scale: isListening ? [1, 1.2, 1] : isSpeaking ? [1, 1.15, 1] : [1, 1.05, 1],
                opacity: isListening ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute rounded-full blur-[120px]"
              style={{
                width: 300,
                height: 300,
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06), transparent 70%)',
                bottom: '15%',
                right: '20%',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
          </div>

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 mb-6"
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{
                borderColor: status.color + '30',
                backgroundColor: status.color + '08',
              }}
            >
              {(isProcessing || isThinking) && (
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
              {isListening && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              {isSpeaking && (
                <Volume2 className="w-3.5 h-3.5" style={{ color: status.color }} />
              )}
              {!isProcessing && !isThinking && !isListening && !isSpeaking && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color + '60' }} />
              )}
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            </div>
          </motion.div>

          {/* Voice Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative z-10 mb-6"
          >
            <VoiceOrb
              mode={mode}
              audioAnalyser={audioAnalyser}
              onClick={onToggleMic}
              size={160}
            />
          </motion.div>

          {/* Transcript area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 w-full max-w-md px-8 mb-8 min-h-[80px]"
          >
            <AnimatePresence mode="wait">
              {interimTranscript && !transcript && (
                <motion.div
                  key="interim"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.6, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-center"
                >
                  <p className="text-sm text-gray-400 italic leading-relaxed">
                    {interimTranscript}
                  </p>
                </motion.div>
              )}

              {transcript && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-center mb-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    You
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {transcript}
                  </p>
                </motion.div>
              )}

              {aiResponse && (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B7CF8] mb-1.5">
                    Momentum AI
                  </p>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    {aiResponse}
                    {isThinking && (
                      <span className="inline-flex ml-1 gap-0.5 align-middle">
                        <span className="h-1 w-1 bg-[#8B7CF8] rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1 w-1 bg-[#8B7CF8] rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1 w-1 bg-[#8B7CF8] rounded-full animate-bounce" />
                      </span>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!showTranscript && mode === 'idle' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-center text-xs text-gray-500"
              >
                Tap the orb or press Space to start
              </motion.p>
            )}

            {!showTranscript && isListening && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center text-xs text-gray-500"
              >
                Speak anytime...
              </motion.p>
            )}
          </motion.div>

          {/* Floating controls */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 flex items-center gap-4"
          >
            {/* Mute button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onMute}
              className="voice-control-btn bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </motion.button>

            {/* Main mic / toggle button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onToggleMic}
              className="voice-control-btn h-16 w-16 border-2"
              style={{
                backgroundColor: isListening ? 'rgba(167, 139, 250, 0.15)' : 'rgba(109, 74, 255, 0.1)',
                borderColor: isListening ? '#A78BFA' : 'rgba(109, 74, 255, 0.3)',
                color: isListening ? '#A78BFA' : '#8B7CF8',
              }}
              animate={
                isListening
                  ? {
                      boxShadow: [
                        '0 0 0 0px rgba(167, 139, 250, 0.3)',
                        '0 0 0 10px rgba(167, 139, 250, 0)',
                      ],
                    }
                  : { boxShadow: '0 0 0 0px rgba(109, 74, 255, 0)' }
              }
              transition={
                isListening
                  ? { duration: 1.2, repeat: Infinity, ease: 'easeOut' }
                  : { duration: 0.3 }
              }
            >
              {isListening ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </motion.button>

            {/* End conversation */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEndCall}
              className="voice-control-btn bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              title="End conversation"
            >
              <Phone className="h-4.5 w-4.5 rotate-[135deg]" />
            </motion.button>

            {/* Settings placeholder */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="voice-control-btn bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              title="Voice settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </motion.button>
          </motion.div>

          {/* Keyboard hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-5 flex items-center gap-3 text-[10px] text-gray-500 font-medium"
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">ESC</kbd>
              close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">Space</kbd>
              listen
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
