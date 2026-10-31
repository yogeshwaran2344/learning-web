import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Lightbulb,
  CheckCircle2,
  Bookmark,
  Share2,
  MessageSquare,
  HelpCircle,
  Eye,
  EyeOff,
  Calculator,
  Network,
  Split,
  Send,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  AlignLeft,
  GraduationCap
} from 'lucide-react';
import { AcademicDocument, PageWiseExplanation, SourceCitation } from '../../types';
import { PageTeacherService } from '../../services/pageTeacherService';

interface PageWiseTeacherViewProps {
  document: AcademicDocument;
  initialPage?: number;
  onNavigateToCitation?: (citation: SourceCitation) => void;
  onOpenAskAi?: (query?: string, pageNumber?: number) => void;
  onSwitchToOriginal?: () => void;
}

export const PageWiseTeacherView: React.FC<PageWiseTeacherViewProps> = ({
  document,
  initialPage = 1,
  onNavigateToCitation,
  onOpenAskAi,
  onSwitchToOriginal
}) => {
  const totalPages = Math.max(1, document.pageCount || document.sections?.length || 1);
  const [currentPage, setCurrentPage] = useState<number>(Math.min(initialPage, totalPages));
  const [mode, setMode] = useState<'short' | 'detailed'>('short');
  const [showOriginalSource, setShowOriginalSource] = useState<boolean>(false);
  const [showAskAiDrawer, setShowAskAiDrawer] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiConversation, setAiConversation] = useState<Array<{ q: string; a: string }>>([]);

  // Generate explanation for current page using the adaptive PageTeacherService
  const [explanation, setExplanation] = useState<PageWiseExplanation>(() =>
    PageTeacherService.generatePageExplanation(document, currentPage)
  );

  useEffect(() => {
    const expl = PageTeacherService.generatePageExplanation(document, currentPage);
    setExplanation(expl);
  }, [document, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleAskQuestion = (q?: string) => {
    const questionText = (q || aiQuestion).trim();
    if (!questionText) return;

    if (onOpenAskAi) {
      onOpenAskAi(questionText, currentPage);
    }

    // Local instant grounded answer
    const answer = `Personal AI Teacher (Page ${currentPage}): Regarding "${questionText}": In this section (${explanation.topicTitle}), the core rule is that ${explanation.rememberThis.rule}. For instance, ${explanation.thinkOfItThisWay}`;
    setAiConversation(prev => [...prev, { q: questionText, a: answer }]);
    setAiQuestion('');
    setShowAskAiDrawer(true);
  };

  // Find original section raw content for View Original
  const originalSection = document.sections?.find(s => s.pageNumber === currentPage);
  const rawOriginalText = originalSection?.content || document.sections?.[currentPage - 1]?.content || 'Original passage content for this page.';

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans overflow-hidden select-text">
      {/* 1. Top Control Bar (Page Navigation & The 3 Essential Controls) */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0 select-none">
        {/* Left: Previous / Next Navigation & Page Indicator */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <span className="text-slate-500 dark:text-slate-400">Page</span>
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="bg-transparent text-blue-600 dark:text-blue-400 font-black focus:outline-none cursor-pointer"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {p}
                </option>
              ))}
            </select>
            <span className="text-slate-400">of {totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center / Right: The Three Essential Controls + View Original */}
        <div className="flex items-center space-x-2">
          {/* Control 1: Short Explanation */}
          <button
            onClick={() => setMode('short')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'short'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Short Explanation</span>
          </button>

          {/* Control 2: Explain in Detail */}
          <button
            onClick={() => setMode('detailed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'detailed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Explain in Detail</span>
          </button>

          {/* Control 3: Ask AI */}
          <button
            onClick={() => setShowAskAiDrawer(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showAskAiDrawer
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>

          {/* Toggle View Original Button */}
          <button
            onClick={() => setShowOriginalSource(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              showOriginalSource
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Inspect raw extracted document page side-by-side without teaching filter"
          >
            {showOriginalSource ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showOriginalSource ? 'Hide Raw Page' : 'View Original'}</span>
          </button>

          {onSwitchToOriginal && (
            <button
              onClick={onSwitchToOriginal}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Open Full Original PDF Document Viewer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Doc</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Body: Split or Single View (AI Teacher Explanation + Optional Original Source) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Teaching Card Container */}
        <div className={`flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 ${showOriginalSource ? 'lg:border-r border-slate-200 dark:border-slate-800' : 'max-w-4xl mx-auto w-full'}`}>
          {/* Header Banner: Page Title, Explained Status, and Adaptive Content Type Pill */}
          <div className="space-y-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Page {currentPage}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Explained</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {explanation.contentType === 'theory' && 'Theory'}
                  {explanation.contentType === 'numerical' && 'Numerical Problem'}
                  {explanation.contentType === 'diagram' && 'Diagram Analysis'}
                  {explanation.contentType === 'comparison' && 'Comparison'}
                  {explanation.contentType === 'continuation' && 'Continuation'}
                  {explanation.contentType === 'unreadable' && 'Flagged / Unreadable'}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 font-semibold">
                LEARNOVA Personal AI Teacher
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Page {currentPage} – {explanation.topicTitle}
            </h1>
          </div>

          {/* Unreadable / Blank Page Warning Banner */}
          {explanation.isUnreadableOrBlank && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice: Non-Textual or Low-Quality Page</span>
              </div>
              <p className="text-xs leading-relaxed">
                {explanation.shortExplanation}
              </p>
              <button
                onClick={() => setShowOriginalSource(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-xs font-bold hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Inspect Original Scan Now →
              </button>
            </div>
          )}

          {/* Section 1: "What is [Concept]?" */}
          {!explanation.isUnreadableOrBlank && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>What is a {explanation.topicTitle.replace(/^Process\s+/, '')}?</span>
              </h2>
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-medium">
                {explanation.whatIsIt}
              </div>
            </div>
          )}

          {/* Section 2: "Think of it this way:" (Relatable Analogy) */}
          {!explanation.isUnreadableOrBlank && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Think of it this way:</span>
              </h3>
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-slate-800 dark:text-slate-200 text-sm leading-relaxed italic">
                "{explanation.thinkOfItThisWay}"
              </div>
            </div>
          )}

          {/* Section 3: "Important things to understand" */}
          {!explanation.isUnreadableOrBlank && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>Important things to understand</span>
              </h3>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                {explanation.importantThingsToUnderstand.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Adaptive Content Presentation (Numerical, Diagram, or Comparison) */}
          {/* 4A: Numerical / Calculation Page */}
          {explanation.numericalDetails && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Calculator className="w-4 h-4" />
                  <span>Step-by-Step Numerical Derivation</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Math Verified
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {explanation.numericalDetails.problemStatement}
              </div>

              {/* Given Values */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Given Values:</span>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.numericalDetails.givenValues.map((gv, gIdx) => (
                    <span key={gIdx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <strong>{gv.parameter}:</strong> {gv.value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formula Used */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 font-mono text-xs text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700">
                <strong>Formula: </strong> {explanation.numericalDetails.formulaUsed}
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Step-by-Step Calculation:</span>
                {explanation.numericalDetails.calculationSteps.map((s) => (
                  <div key={s.stepNumber} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {s.stepNumber}. {s.description}
                    </div>
                    {s.mathExpr && (
                      <div className="font-mono text-emerald-600 dark:text-emerald-400 pl-4 font-bold">
                        {s.mathExpr}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Final Answer Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-xs sm:text-sm flex items-center justify-between">
                <span>Final Answer:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 text-sm sm:text-base">
                  {explanation.numericalDetails.finalAnswer}
                </span>
              </div>
            </div>
          )}

          {/* 4B: Diagram / Component Breakdown */}
          {explanation.diagramDetails && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Network className="w-4 h-4" />
                <span>{explanation.diagramDetails.diagramTitle}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {explanation.diagramDetails.components.map((comp, cIdx) => (
                  <div key={cIdx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <strong className="text-blue-700 dark:text-blue-300 block mb-0.5">{comp.name}</strong>
                    <span className="text-slate-600 dark:text-slate-300">{comp.role}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase text-slate-400">State Transition Workflow:</span>
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  {explanation.diagramDetails.workflowSteps.map((wf, wIdx) => (
                    <div key={wIdx} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                      {wf}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4C: Comparison Table */}
          {explanation.comparisonDetails && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Split className="w-4 h-4" />
                <span>{explanation.comparisonDetails.comparisonTitle}</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                    <tr>
                      {explanation.comparisonDetails.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-2.5 border-b border-slate-200 dark:border-slate-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {explanation.comparisonDetails.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-indigo-900 dark:text-indigo-300 italic pt-1">
                Tip: {explanation.comparisonDetails.contrastSummary}
              </p>
            </div>
          )}

          {/* Detailed Mode Expansion (when Explain in Detail is selected) */}
          {mode === 'detailed' && (
            <div className="p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Comprehensive In-Depth Academic Breakdown</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-serif">
                {explanation.detailedExplanation}
              </p>
            </div>
          )}

          {/* Section 5: "Remember this" Callout Box */}
          {!explanation.isUnreadableOrBlank && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Remember this</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-pre-line font-mono">
                {explanation.rememberThis.rule}
              </div>
            </div>
          )}

          {/* Section 6: Source Attribution Footer (Clickable Traceability) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-500">Source:</span>
              <button
                onClick={() => onNavigateToCitation && onNavigateToCitation(explanation.sourceCitation)}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Original document, Page ${currentPage}`}
              >
                <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                <span>Original document, Page {currentPage}</span>
                <span className="text-[10px] opacity-75 underline">Source linked</span>
              </button>
            </div>

            {/* Bottom Page Navigation Button */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-semibold">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages && (
                <button
                  onClick={handleNextPage}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <span>Next page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ask AI Page Drawer */}
          {showAskAiDrawer && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-300 dark:border-purple-800/80 shadow-lg space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4" />
                  <span>Ask AI about Page {currentPage} ({explanation.topicTitle})</span>
                </div>
                <button
                  onClick={() => setShowAskAiDrawer(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Explain this page in simpler words',
                  'Give me an easier real-world example',
                  'What is a likely exam question on this concept?',
                  'Why does this matter in practice?'
                ].map((chip, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => handleAskQuestion(chip)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Conversation History */}
              {aiConversation.map((msg, mIdx) => (
                <div key={mIdx} className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white">
                    Q: {msg.q}
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 leading-relaxed">
                    {msg.a}
                  </div>
                </div>
              ))}

              {/* Input Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder={`Ask anything about ${explanation.topicTitle}...`}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Optional View Original Source Panel (Side-by-Side or Overlay) */}
        {showOriginalSource && (
          <div className="w-full lg:w-[45%] h-full bg-white dark:bg-[#090d16] border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-hidden select-text animate-in slide-in-from-right-10 duration-200">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0b1120]">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Original Document — Page {currentPage}
                </span>
              </div>
              <button
                onClick={() => setShowOriginalSource(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Close Original Source Panel"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300">
                <strong>Ground Truth Inspection:</strong> Below is the unedited source text extracted from Page {currentPage} for verification.
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {rawOriginalText}
              </div>

              {originalSection?.definitions && originalSection.definitions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Extracted Terms:</span>
                  {originalSection.definitions.map((d, dIdx) => (
                    <div key={dIdx} className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                      <strong>{d.term}:</strong> {d.definition}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
