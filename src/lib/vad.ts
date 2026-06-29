import { MicVAD, utils } from '@ricky0123/vad-web';

export interface VADOptions {
  stream: MediaStream;
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Blob) => void;
  onSpeechData?: (data: Float32Array) => void;
  silenceDuration?: number; // ms - how long silence before considering speech ended
  redemptionTime?: number; // ms - grace period before finalizing speech end
}

export class VoiceActivityDetector {
  private vad: MicVAD | null = null;
  private options: VADOptions;
  private isActive = false;

  constructor(options: VADOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      this.vad = await MicVAD.new({
        stream: this.options.stream,
        onSpeechStart: () => {
          this.options.onSpeechStart?.();
        },
        onSpeechEnd: async (audio: Float32Array) => {
          // Convert Float32Array to WAV Blob
          const audioWav = utils.encodeWAV(audio);
          const audioBlob = new Blob([audioWav], { type: 'audio/wav' });
          this.options.onSpeechEnd?.(audioBlob);
        },
        onVADMisfire: () => {
          // Speech detected but was too short - ignore
        },
        // Sensitivity settings for better detection
        positiveSpeechThreshold: 0.5,  // Lower = more sensitive to speech
        negativeSpeechThreshold: 0.35, // Lower = more sensitive to silence
        redemptionTime: 200,           // ms to wait after speech ends before finalizing
        preSpeechPadTime: 100,         // ms of audio to include before speech start
      } as any);

      await this.vad.start();
      this.isActive = true;
    } catch (err) {
      console.error('Failed to start VAD:', err);
      throw err;
    }
  }

  pause(): void {
    if (this.vad && this.isActive) {
      this.vad.pause();
    }
  }

  resume(): void {
    if (this.vad && this.isActive) {
      this.vad.start();
    }
  }

  destroy(): void {
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }
    this.isActive = false;
  }

  getIsListening(): boolean {
    return this.isActive;
  }
}
