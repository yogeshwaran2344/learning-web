import React from 'react';
import {
  X,
  Sliders,
  Eye,
  Type,
  SunMoon,
  Keyboard,
  Globe,
  Check,
  Volume2
} from 'lucide-react';
import { UserPreferences } from '../types';
import { AudioService } from '../services/audioService';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Personalization & Accessibility</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phase 6: Dyslexia, Text Scaling & Keyboard Controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6 text-sm">
          {/* Font Size Scaling */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Type className="w-4 h-4 text-brand-500" />
              <span>Text Size Scaling</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdatePreferences({ fontSize: size })}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    preferences.fontSize === size
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {size === 'sm' && 'Small (85%)'}
                  {size === 'md' && 'Normal (100%)'}
                  {size === 'lg' && 'Large (115%)'}
                  {size === 'xl' && 'Huge (130%)'}
                </button>
              ))}
            </div>
          </div>

          {/* Dyslexia-Friendly Font Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-accent-500" />
                <span>Dyslexia-Friendly Font & Spacing</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Increases letter separation and applies high-legibility typographic geometry.
              </p>
            </div>

            <button
              onClick={() => onUpdatePreferences({ isDyslexicFont: !preferences.isDyslexicFont })}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                preferences.isDyslexicFont ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.isDyslexicFont ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* High Contrast Mode Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <SunMoon className="w-4 h-4 text-academic-gold" />
                <span>High Contrast Mode</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enhances element borders, backgrounds, and reading legibility.
              </p>
            </div>

            <button
              onClick={() => onUpdatePreferences({ isHighContrast: !preferences.isHighContrast })}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                preferences.isHighContrast ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.isHighContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Voice Gender Setting */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-purple-500" />
              <span>Narration Voice (Girl / Guy)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdatePreferences({ voiceGender: 'female' });
                  AudioService.setGender('female');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  preferences.voiceGender === 'female'
                    ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-2 ring-purple-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>👩 Girl / Female Voice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdatePreferences({ voiceGender: 'male' });
                  AudioService.setGender('male');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  preferences.voiceGender === 'male'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>👨 Guy / Male Voice</span>
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>Language Setting</span>
            </label>
            <select
              value={preferences.preferredLanguage}
              onChange={(e) => onUpdatePreferences({ preferredLanguage: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              <option value="English">English (US)</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>

          {/* Keyboard Navigation Shortcuts */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-brand-500" />
              <span>Keyboard Navigation Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Flip Flashcard:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono">Space</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Next / Prev Card:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono">← / →</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Self-Rate Again / Hard:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono">1 / 2</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Self-Rate Mastered:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono">3 / 4</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
