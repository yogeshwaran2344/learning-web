import React, { useState } from 'react';
import {
  Lightbulb,
  BookOpen,
  FlaskConical,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Share2,
  AlertCircle
} from 'lucide-react';
import { ExplanationLevel, SourceCitation } from '../../types';

interface ExplanationViewProps {
  explanations: ExplanationLevel[];
  onNavigateToCitation: (citation: SourceCitation) => void;
  onOpenFeedback: () => void;
}

export const ExplanationView: React.FC<ExplanationViewProps> = ({
  explanations,
  onNavigateToCitation,
  onOpenFeedback
}) => {
  const [activeTier, setActiveTier] = useState<'intuitive' | 'rigorous' | 'worked'>('intuitive');
  const [selectedExplIndex, setSelectedExplIndex] = useState<number>(0);

  const currentExpl = explanations[selectedExplIndex] || explanations[0];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-y-auto p-6 space-y-6">
      {/* Top Selector: Chapters/Topics */}
      {explanations.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          {explanations.map((exp, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedExplIndex(idx)}
              className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedExplIndex === idx
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {exp.title}
            </button>
          ))}
        </div>
      )}

      {/* Main Topic Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" />
            Verified Explanation
          </span>

          <button
            onClick={onOpenFeedback}
            className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Report Inaccuracy</span>
          </button>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
          {currentExpl.title}
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {currentExpl.summary}
        </p>
      </div>

      {/* Tier Switcher Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTier('intuitive')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTier === 'intuitive'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>1. Intuitive Analogy</span>
        </button>

        <button
          onClick={() => setActiveTier('rigorous')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTier === 'rigorous'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>2. Rigorous Theory</span>
        </button>

        <button
          onClick={() => setActiveTier('worked')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTier === 'worked'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>3. Worked Example</span>
        </button>
      </div>

      {/* Tier Content Display */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
        {activeTier === 'intuitive' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Lightbulb className="w-4 h-4" />
              <span>Conceptual Analogy (Simplified Learning)</span>
            </div>
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
              {currentExpl.intuitiveAnalogy}
            </p>
          </div>
        )}

        {activeTier === 'rigorous' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <BookOpen className="w-4 h-4" />
              <span>Formal Academic Exposition</span>
            </div>
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
              {currentExpl.rigorousBreakdown}
            </p>
          </div>
        )}

        {activeTier === 'worked' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <FlaskConical className="w-4 h-4" />
              <span>Concrete Application & Parameter Walkthrough</span>
            </div>
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-mono text-xs sm:text-sm bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              {currentExpl.workedExample}
            </p>
          </div>
        )}

        {/* Source Citation Pills (Step 13: Source Traceability) */}
        {currentExpl.citations.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Verified Citations:</span>
            </span>

            {currentExpl.citations.map((cite) => (
              <button
                key={cite.id}
                onClick={() => onNavigateToCitation(cite)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-800 transition-colors shadow-sm"
                title={`Jump to Page ${cite.pageNumber}: ${cite.sectionTitle}`}
              >
                <span>[Ref p.{cite.pageNumber} • {cite.sectionTitle.slice(0, 24)}...]</span>
                <ExternalLink className="w-3 h-3 text-amber-700 dark:text-amber-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Key Takeaways */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Core Takeaways for Exam & Synthesis</span>
        </h4>

        <ul className="space-y-2">
          {currentExpl.keyTakeaways.map((point, pIdx) => (
            <li
              key={pIdx}
              className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
