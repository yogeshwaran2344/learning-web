export type AudioState = 'idle' | 'playing' | 'paused';
export type VoiceGender = 'female' | 'male';

export interface AudioListener {
  onStateChange?: (state: AudioState) => void;
  onProgress?: (charIndex: number, textLength: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

const FEMALE_VOICE_REGEX = /(?:female|woman|girl|zira|jenny|aria|sonia|samantha|victoria|karen|moira|tessa|fiona|veena|lekha|heera|kalpana|swara|neerja|hazel|susan|catherine|stephanie|ayumi|kyoko|yuna|katja|monica|helena|paulina|laura|anna|alice)/i;
const MALE_VOICE_REGEX = /(?:male|man|boy|david|mark|guy|george|alex|daniel|fred|oliver|ravi|hemant|rishi|madhav|aaron|arthur|richard|james|john|paul|brian|thomas|alva|diego|jorge|martin|stefan)/i;

export class AudioService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static utterance: SpeechSynthesisUtterance | null = null;
  private static currentState: AudioState = 'idle';
  private static listeners: AudioListener[] = [];
  private static currentRate: number = 1.0;
  private static currentGender: VoiceGender = 'female';

  static subscribe(listener: AudioListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static getState(): AudioState {
    return this.currentState;
  }

  static setGender(gender: VoiceGender): void {
    this.currentGender = gender;
  }

  static getGender(): VoiceGender {
    return this.currentGender;
  }

  static speak(
    text: string,
    rate: number = 1.0,
    language: string = 'English',
    gender?: VoiceGender
  ): void {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this environment');
      return;
    }

    this.stop();
    this.currentRate = rate;
    const activeGender: VoiceGender = gender || this.currentGender || 'female';

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    // Acoustic calibration:
    // Girl / Female voice pitch: 1.20 (bright, youthful, clear female teacher tone)
    // Guy / Male voice pitch: 0.85 (deep, warm, resonant male teacher tone)
    utterance.pitch = activeGender === 'female' ? 1.2 : 0.85;

    const targetLang = language === 'Kannada' ? 'kn-IN' : language === 'Hindi' ? 'hi-IN' : 'en-US';
    utterance.lang = targetLang;

    // Retrieve system voices and select the best gender-matching voice
    const voices = this.synth.getVoices();
    const prefix = targetLang.split('-')[0];
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));

    let chosenVoice: SpeechSynthesisVoice | null = null;

    if (activeGender === 'female') {
      // 1. Language-matched female voice
      chosenVoice = langVoices.find(v => FEMALE_VOICE_REGEX.test(v.name) && !MALE_VOICE_REGEX.test(v.name)) || null;
      // 2. Any English female voice if target is English
      if (!chosenVoice && targetLang.startsWith('en')) {
        chosenVoice = voices.find(v => v.lang.startsWith('en') && FEMALE_VOICE_REGEX.test(v.name)) || null;
      }
      // 3. Fallback to any language-matched voice
      if (!chosenVoice) {
        chosenVoice = langVoices[0] || null;
      }
    } else {
      // 1. Language-matched male voice
      chosenVoice = langVoices.find(v => MALE_VOICE_REGEX.test(v.name) && !FEMALE_VOICE_REGEX.test(v.name)) || null;
      // 2. Any English male voice if target is English
      if (!chosenVoice && targetLang.startsWith('en')) {
        chosenVoice = voices.find(v => v.lang.startsWith('en') && MALE_VOICE_REGEX.test(v.name)) || null;
      }
      // 3. Fallback to any language-matched voice
      if (!chosenVoice) {
        chosenVoice = langVoices[0] || null;
      }
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
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
