import React, { useState } from 'react';
import {
  Sparkles,
  Globe,
  Gauge,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Award,
  Layers,
  ChevronDown
} from 'lucide-react';
import { StudioTab, AppLanguage, DifficultyLevel, FormatVerificationResult } from '../../types';

interface GeneratorControlBarProps {
  activeTab: StudioTab;
  currentLanguage: AppLanguage;
  difficulty: DifficultyLevel;
  isGenerating: boolean;
  verification?: FormatVerificationResult | null;
  hasBeyondNotesAnnotation?: boolean;
  onLanguageChange: (lang: AppLanguage) => void;
  onDifficultyChange: (diff: DifficultyLevel) => void;
  onRegenerate: () => void;
  onOpenTestSuite: () => void;
}

export const GeneratorControlBar: React.FC<GeneratorControlBarProps> = ({
  activeTab,
  currentLanguage,
  difficulty,
  isGenerating,
  verification,
  hasBeyondNotesAnnotation,
  onLanguageChange,
  onDifficultyChange,
  onRegenerate,
  onOpenTestSuite
}) => {
  // If activeTab is 'original', generator controls are hidden
  if (activeTab === 'original') return null;

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
      {/* Left: Language & Difficulty Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Language Selector */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-500 text-[11px]">Language:</span>
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value as AppLanguage)}
            disabled={isGenerating}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
          >
            <option value="English">English</option>
            <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
            <option value="Hindi">Hindi (हिन्दी)</option>
          </select>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-500 text-[11px]">Difficulty:</span>
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as DifficultyLevel)}
            disabled={isGenerating}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
          >
            <option value="beginner">Beginner (Intuitive)</option>
            <option value="intermediate">Intermediate (Standard)</option>
            <option value="advanced">Advanced (Rigorous Proofs)</option>
          </select>
        </div>

        {/* Beyond Notes Tag */}
        {hasBeyondNotesAnnotation && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Includes Pedagogical Analogy (Beyond Uploaded Text)</span>
          </span>
        )}
      </div>

      {/* Right: Verification Status & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Verification Status Pill */}
        {verification && (
          <div
            className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 border shadow-sm ${
              verification.status === 'verified'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                : verification.status === 'needs_review'
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
                : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            {verification.status === 'verified' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : verification.status === 'needs_review' ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {verification.status === 'verified'
                ? 'Verified by Source'
                : verification.status === 'needs_review'
                ? 'Needs Review'
                : 'Unable to Verify'}
            </span>
            <span className="opacity-60 text-[10px]">({verification.overallScore}%)</span>
          </div>
        )}

        {/* 9-Point Testing Suite Trigger */}
        <button
          onClick={onOpenTestSuite}
          className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>9-Point Audit Suite</span>
        </button>

        {/* Regenerate Action */}
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            isGenerating
              ? 'bg-slate-300 text-slate-500 cursor-wait'
              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-sm'
          }`}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Regenerating...' : 'Regenerate'}</span>
        </button>
      </div>
    </div>
  );
};
