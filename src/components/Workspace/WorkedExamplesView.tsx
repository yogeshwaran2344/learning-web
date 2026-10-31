import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Calculator,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Sparkles,
  Tag,
  Copy,
  Check,
  ShieldCheck,
  FileQuestion
} from 'lucide-react';
import {
  AcademicDocument,
  SourceCitation,
  WorkedExamplesSuite,
  WorkedExampleItem
} from '../../types';
import { DetailedNotesService } from '../../services/detailedNotesService';

interface WorkedExamplesViewProps {
  document: AcademicDocument;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const WorkedExamplesView: React.FC<WorkedExamplesViewProps> = ({
  document,
  onNavigateToCitation
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const suite: WorkedExamplesSuite = useMemo(() => {
    return DetailedNotesService.generateWorkedExamplesSuite(document);
  }, [document]);

  const [selectedExampleId, setSelectedExampleId] = useState<string>('all');

  const visibleExamples = useMemo(() => {
    if (selectedExampleId === 'all') {
      return suite.examples;
    }
    return suite.examples.filter(e => e.id === selectedExampleId);
  }, [suite, selectedExampleId]);

  const handleCopySolution = (ex: WorkedExampleItem) => {
    const text = [
      `# ${ex.title}`,
      `Topic: ${ex.topicTitle}`,
      `Problem Statement: ${ex.problemStatement}`,
      `Given Parameters: ${ex.givenParameters.join(', ')}`,
      `Formula: ${ex.formulaApplied}`,
      '',
      'Solution Steps:',
      ...ex.solutionSteps.map(s => `Step ${s.stepNumber}: ${s.statement}\nCalculation: ${s.calculation || 'N/A'}\nRationale: ${s.rationale}\n`),
      `Final Answer: ${ex.finalAnswer}`,
      `Verification: ${ex.verification}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(ex.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FlaskConical className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Step-by-Step Worked Problems & Calculations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded numerical derivations showing given parameters, formulas, intermediate operations, and explicit pedagogical rationales.
          </p>
        </div>

        {/* Quick Count Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {suite.examples.length} Solved Problem{suite.examples.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Example Selector Filter */}
      {suite.examples.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedExampleId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedExampleId === 'all'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Examples ({suite.examples.length})
          </button>
          {suite.examples.map(ex => (
            <button
              key={ex.id}
              onClick={() => setSelectedExampleId(ex.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedExampleId === ex.id
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {ex.title}
            </button>
          ))}
        </div>
      )}

      {/* Examples List */}
      <div className="space-y-8">
        {visibleExamples.map((ex) => (
          <div
            key={ex.id}
            className="p-6 rounded-3xl bg-slate-900 text-slate-100 border border-slate-800 space-y-6 shadow-xl"
          >
            {/* Top Bar: Title, Topic, Citation, Copy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wider">
                    {ex.topicTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                    Step-by-Step Derivation
                  </span>
                </div>
                <h3 className="text-lg font-black text-white pt-1">
                  {ex.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToCitation(ex.citation)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View original problem statement on source page/slide"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Page {ex.citation.pageNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCopySolution(ex)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy full worked solution to clipboard"
                >
                  {copiedId === ex.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === ex.id ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Problem Statement Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span>Problem Statement</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Invariant Verified</span>
                </span>
              </div>
              <p className="text-slate-200 font-sans leading-relaxed text-sm">
                {ex.problemStatement}
              </p>

              {/* Given Parameters */}
              {ex.givenParameters && ex.givenParameters.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Given Information / Input Variables:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {ex.givenParameters.map((param, pIdx) => (
                      <div key={pIdx} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300/90 font-mono text-xs">
                        • {param}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formula & Method Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Governing Formulation:
                </span>
                <code className="text-emerald-400 font-bold font-mono text-xs sm:text-sm">
                  {ex.formulaApplied}
                </code>
              </div>
              {ex.methodRequired && (
                <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-sans">
                  <strong>Solution Method:</strong> {ex.methodRequired}
                </p>
              )}
            </div>

            {/* Step-by-Step Solution Derivations */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span>Rigorous Step-by-Step Derivation & Intermediate Operations:</span>
              </div>

              <div className="space-y-3">
                {ex.solutionSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-sans"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </span>
                      <span className="font-bold text-slate-200">
                        {step.statement}
                      </span>
                    </div>

                    {step.calculation && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                        {step.calculation}
                      </div>
                    )}

                    <div className="p-2 rounded-xl bg-slate-900/40 text-slate-400 text-[11px] leading-relaxed border-l-2 border-emerald-500 pl-3">
                      <strong>Pedagogical Rationale:</strong> {step.rationale}
                    </div>

                    {step.intermediateResult && (
                      <div className="text-[11px] text-slate-300 font-semibold pt-1">
                        ↳ <em>Outcome:</em> {step.intermediateResult}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Final Answer Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-950 to-emerald-950/80 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Final Evaluated Result
                </span>
                <div className="text-base sm:text-lg font-black text-white">
                  {ex.finalAnswer}
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Calculation Verified</span>
              </div>
            </div>

            {/* Mathematical Verification Checkpoint */}
            {ex.verification && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Independent Verification Check:</strong> {ex.verification}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
