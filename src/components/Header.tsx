import React from 'react';
import {
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Sliders,
  Sparkles,
  HelpCircle,
  RotateCcw,
  UserCheck,
  Glasses
} from 'lucide-react';
import { UserPreferences, AcademicDocument } from '../types';

interface HeaderProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onOpenAccessibility: () => void;
  onOpenUsabilityStudy: () => void;
  onResetData: () => void;
  activeDocument?: AcademicDocument;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  preferences,
  onUpdatePreferences,
  onOpenAccessibility,
  onOpenUsabilityStudy,
  onResetData,
  activeDocument,
  onNavigateHome
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Learn<span className="text-brand-600 dark:text-brand-400">Lens</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Verified Meaning
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Multi-Format Academic Transformation with Source Traceability
            </p>
          </div>
        </div>

        {/* Center: Current Document breadcrumb if active */}
        {activeDocument && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-sm truncate text-xs">
            <BookOpen className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">Active:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{activeDocument.title}</span>
          </div>
        )}

        {/* Right action controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Role Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => onUpdatePreferences({ role: 'student' })}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                preferences.role === 'student'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Student View: Focuses on intuition, flashcard practice and audio narration"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
            <button
              onClick={() => onUpdatePreferences({ role: 'lecturer' })}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                preferences.role === 'lecturer'
                  ? 'bg-white dark:bg-slate-700 text-accent-600 dark:text-accent-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Lecturer View: Deep meaning preservation audit, equation integrity and verification logs"
            >
              <Glasses className="w-3.5 h-3.5" />
              <span>Lecturer</span>
            </button>
          </div>

          {/* Usability & Validation Study button */}
          <button
            onClick={onOpenUsabilityStudy}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="View Phase 8 Step 26: Usability & Comprehension Study"
          >
            <Sparkles className="w-3.5 h-3.5 text-academic-gold" />
            <span>Usability Study</span>
          </button>

          {/* Accessibility Settings button */}
          <button
            onClick={onOpenAccessibility}
            className="p-2 text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Accessibility Options (Text size, Dyslexia font, High contrast)"
            aria-label="Accessibility options"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Reset Demo Data button */}
          <button
            onClick={onResetData}
            className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            title="Reset to default sample papers"
            aria-label="Reset sample data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
