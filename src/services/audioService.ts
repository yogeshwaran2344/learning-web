export type AudioState = 'idle' | 'playing' | 'paused';

export interface AudioListener {
  onStateChange?: (state: AudioState) => void;
  onProgress?: (charIndex: number, textLength: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class AudioService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static utterance: SpeechSynthesisUtterance | null = null;
  private static currentState: AudioState = 'idle';
  private static listeners: AudioListener[] = [];
  private static currentRate: number = 1.0;

  static subscribe(listener: AudioListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static getState(): AudioState {
    return this.currentState;
  }

  static speak(text: string, rate: number = 1.0, language: string = 'English'): void {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this environment');
      return;
    }

    this.stop();
    this.currentRate = rate;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const targetLang = language === 'Kannada' ? 'kn-IN' : language === 'Hindi' ? 'hi-IN' : 'en-US';
    utterance.lang = targetLang;

    // Try finding a natural matching voice
    const voices = this.synth.getVoices();
    const prefix = targetLang.split('-')[0];
    const matchingVoice = voices.find(v => v.lang.startsWith(prefix));
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha')));
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    } else if (naturalVoice && targetLang.startsWith('en')) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      this.currentState = 'playing';
      this.notifyState();
    };

    utterance.onpause = () => {
      this.currentState = 'paused';
      this.notifyState();
    };

    utterance.onresume = () => {
      this.currentState = 'playing';
      this.notifyState();
    };

    utterance.onboundary = (e) => {
      this.listeners.forEach(l => l.onProgress?.(e.charIndex, text.length));
    };

    utterance.onend = () => {
      this.currentState = 'idle';
      this.notifyState();
      this.listeners.forEach(l => l.onEnd?.());
    };

    utterance.onerror = (e) => {
      console.error('TTS playback error:', e);
      this.currentState = 'idle';
      this.notifyState();
      this.listeners.forEach(l => l.onError?.(e));
    };

    this.utterance = utterance;
    this.synth.speak(utterance);
  }

  static pause(): void {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.currentState = 'paused';
      this.notifyState();
    }
  }

  static resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.currentState = 'playing';
      this.notifyState();
    }
  }

  static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentState = 'idle';
      this.notifyState();
    }
  }

  static setRate(rate: number): void {
    this.currentRate = rate;
    if (this.utterance && this.currentState === 'playing') {
      // Re-trigger speech with updated rate
      const currentText = this.utterance.text;
      this.stop();
      this.speak(currentText, rate);
    }
  }

  private static notifyState(): void {
    this.listeners.forEach(l => l.onStateChange?.(this.currentState));
  }
}
