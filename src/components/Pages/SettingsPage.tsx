import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Type,
  SunMoon,
  Volume2,
  Lock,
  User,
  ShieldCheck,
  Check,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { UserPreferences, AppLanguage } from '../../types';

interface SettingsPageProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onResetData: () => void;
  onClearAll?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  preferences,
  onUpdatePreferences,
  onResetData,
  onClearAll
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLanguageChange = (lang: AppLanguage) => {
    onUpdatePreferences({ preferredLanguage: lang });
    showFeedback();
  };

  const handleFontSize = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    onUpdatePreferences({ fontSize: size });
    showFeedback();
  };

  const showFeedback = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Settings & Accessibility
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure learning languages, typographic geometry, screen contrast, audio narration, and privacy controls.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold flex items-center gap-1 animate-pulse">
            <Check className="w-3.5 h-3.5" />
            <span>Preferences Saved</span>
          </div>
        )}
      </div>

      <div className="space-y-6 text-xs">
        {/* Disciplinary Language Selector (English, Kannada, Hindi) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5">
            <Globe className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Platform & Learning Language
              </h3>
              <p className="text-slate-400">
                Choose the primary language for AI explanations, flashcard translations, and interface labels.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'English' as const, label: 'English (US)', sub: 'Standard Academic' },
              { id: 'Kannada' as const, label: 'Kannada (ಕನ್ನಡ)', sub: 'ಕರ್ನಾಟಕ ಶೈಕ್ಷಣಿಕ' },
              { id: 'Hindi' as const, label: 'Hindi (हिन्दी)', sub: 'भारतीय अकादमिक' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleLanguageChange(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  preferences.preferredLanguage === item.id
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{item.label}</div>
                <div className="text-[11px] opacity-70 mt-0.5">{item.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility & Typography Suite */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Visual Comfort & Accessibility Options
              </h3>
              <p className="text-slate-400">
                Adjust typography geometry, dyslexic accommodations, and high-contrast display.
              </p>
            </div>
          </div>

          {/* Text Size */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Text Size Scaling
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontSize(size)}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                    preferences.fontSize === size
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {size === 'sm' && 'Compact (85%)'}
                  {size === 'md' && 'Standard (100%)'}
                  {size === 'lg' && 'Large (115%)'}
                  {size === 'xl' && 'Extra (130%)'}
                </button>
              ))}
            </div>
          </div>

          {/* Dyslexia Font Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="font-bold text-slate-900 dark:text-white">
                Dyslexia-Friendly Typographic Geometry
              </div>
              <p className="text-[11px] text-slate-400">
                Uses weighted lower-stems, distinct character kerning, and increased word spacing to reduce letter confusion.
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

          {/* High Contrast Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="font-bold text-slate-900 dark:text-white">
                High Contrast Display Mode
              </div>
              <p className="text-[11px] text-slate-400">
                Strengthens element boundaries and text contrast for low-vision environments.
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
        </div>

        {/* Narration & Audio Controls */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5">
            <Volume2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Audio Narration Settings
              </h3>
              <p className="text-slate-400">
                Configure default playback speed and voice tone.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Default Playback Speed
            </label>
            <div className="flex items-center gap-2">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdatePreferences({ audioSpeed: s })}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                    preferences.audioSpeed === s
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy & Account Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5">
            <Lock className="w-5 h-5 text-slate-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Privacy & Data Consent
              </h3>
              <p className="text-slate-400">
                Control your analytics sharing and quiz telemetry participation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="font-bold text-slate-900 dark:text-white">
                Consent to Aggregated Usability Study Analytics
              </div>
              <p className="text-[11px] text-slate-400">
                Allows course lecturers to observe anonymized cohort comprehension gains.
              </p>
            </div>
            <button
              onClick={() => onUpdatePreferences({ privacyAnalyticsConsent: !preferences.privacyAnalyticsConsent })}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                preferences.privacyAnalyticsConsent ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.privacyAnalyticsConsent ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400">Library and workspace data options:</span>
            <div className="flex items-center gap-2">
              {onClearAll && (
                <button
                  onClick={onClearAll}
                  className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Data (Start Fresh)</span>
                </button>
              )}
              <button
                onClick={onResetData}
                className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <span>Load Sample Papers</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
