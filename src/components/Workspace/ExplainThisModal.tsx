import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  X,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  Send,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Compass,
  Cpu,
  BookmarkCheck
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';
import { AppLanguage, DifficultyLevel, SourceCitation } from '../../types';

interface ExplainThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  selectionText: string;
  contextSnippet?: string;
  currentLanguage?: AppLanguage;
  initialDifficulty?: DifficultyLevel;
  onSaveSnippet?: (title: string, content: string, citation?: SourceCitation) => void;
}

export const ExplainThisModal: React.FC<ExplainThisModalProps> = ({
  isOpen,
  onClose,
  documentId,
  selectionText,
  contextSnippet,
  currentLanguage = 'English',
  initialDifficulty = 'beginner',
  onSaveSnippet
}) => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [explanationData, setExplanationData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Follow-up question state
  const [followUpQuestion, setFollowUpQuestion] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [followUpAnswer, setFollowUpAnswer] = useState<any>(null);

  useEffect(() => {
    if (isOpen && selectionText) {
      loadExplanation(difficulty);
    }
  }, [isOpen, selectionText, difficulty]);

  const loadExplanation = async (diff: DifficultyLevel) => {
    setIsLoading(true);
    setErrorMessage('');
    setFollowUpAnswer(null);
    try {
      const result = await ApiClient.explainThis({
        documentId,
        selectionText,
        contextSnippet,
        difficulty: diff,
        language: currentLanguage
      });
      setExplanationData(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to explain selection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;

    setIsAsking(true);
    try {
      const response = await ApiClient.askQuestion({
        documentId,
        question: followUpQuestion,
        currentSectionTitle: explanationData?.sourceCitation?.sectionTitle,
        difficulty,
        language: currentLanguage
      });
      setFollowUpAnswer(response);
      setFollowUpQuestion('');
    } catch (err: any) {
      console.error('Follow-up error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSave = () => {
    if (!explanationData || !onSaveSnippet) return;
    onSaveSnippet(
      `Explanation: ${explanationData.conceptIdentified}`,
      explanationData.structure?.whatIsIt || explanationData.originalText,
      explanationData.sourceCitation
    );
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (!isOpen) return null;

  const struct = explanationData?.structure;
  const terms = explanationData?.definedTerms || [];
  const math = explanationData?.technicalInvariantsPreserved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto select-none">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  LEARNOVA: Explain This
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  Step-by-Step
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grounded in original text with verified formulas and relatable real-world analogies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Quote Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs italic text-slate-600 dark:text-slate-300">
          <span className="font-semibold not-italic text-slate-400 mr-1.5">Selected:</span>
          "{selectionText.length > 200 ? selectionText.slice(0, 197) + '...' : selectionText}"
        </div>

        {/* Difficulty Selector Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Explanation Depth:</span>
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
              {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all ${
                    difficulty === lvl
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-bold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {onSaveSnippet && (
            <button
              onClick={handleSave}
              disabled={isLoading || !explanationData}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 text-slate-700 dark:text-slate-300"
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Saved to Materials' : 'Save Explanation'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400">Synthesizing step-by-step student explanation...</span>
          </div>
        ) : errorMessage ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {errorMessage}
          </div>
        ) : struct ? (
          <div className="space-y-6 text-sm">
            {/* Defined Terms Glossary */}
            {terms.length > 0 && (
              <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/60 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Technical Terms Explained First
                </span>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {terms.map((t: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">{t.term}:</strong> {t.definition}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. What is the concept? */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-brand-500" />
                1. What is the concept?
              </h4>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {struct.whatIsIt}
              </p>
            </div>

            {/* 2. Why is it important? */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                2. Why is it important?
              </h4>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {struct.whyItMatters}
              </p>
            </div>

            {/* 3. How does it work? */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                3. How does it work?
              </h4>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {struct.howItWorks}
              </p>
            </div>

            {/* 4. Step-by-Step Breakdown */}
            {struct.stepByStep && struct.stepByStep.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                  4. Step-by-Step Explanation
                </h4>
                <div className="space-y-1.5 pl-2">
                  {struct.stepByStep.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Relevant Real-World Examples */}
            {struct.realWorldExamples && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  5. Relevant Real-World Examples
                </h4>
                <div className="space-y-2 text-xs">
                  {struct.realWorldExamples.everydayAnalogy && (
                    <div>
                      <strong className="text-amber-900 dark:text-amber-200">Everyday Analogy:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{struct.realWorldExamples.everydayAnalogy}</span>
                    </div>
                  )}
                  {struct.realWorldExamples.practicalExample && (
                    <div>
                      <strong className="text-amber-900 dark:text-amber-200">Practical Example:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{struct.realWorldExamples.practicalExample}</span>
                    </div>
                  )}
                  {struct.realWorldExamples.industryApplication && (
                    <div>
                      <strong className="text-amber-900 dark:text-amber-200">Industry Application:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{struct.realWorldExamples.industryApplication}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Important Points to Remember */}
            {struct.keyTakeaways && struct.keyTakeaways.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                  6. Important Points to Remember
                </h4>
                <ul className="space-y-1 pl-2">
                  {struct.keyTakeaways.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preserved Invariants & Formulas */}
            {math && (math.equations.length > 0 || math.boundaryConditions.length > 0) && (
              <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Meaning Preservation Check:
                </span>
                {math.equations.length > 0 && (
                  <div className="font-mono text-[11px] text-brand-600 dark:text-brand-400">
                    Formula: {math.equations[0]}
                  </div>
                )}
                {math.boundaryConditions.length > 0 && (
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Condition: {math.boundaryConditions[0]}
                  </div>
                )}
              </div>
            )}

            {/* Citation footer */}
            {explanationData.sourceCitation && (
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>
                  Source: {explanationData.sourceCitation.sectionTitle} (Page {explanationData.sourceCitation.pageNumber || 1})
                </span>
                {explanationData.uncertaintyFlag && (
                  <span className="text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Uncertainty flagged in source
                  </span>
                )}
              </div>
            )}

            {/* Interactive Follow-up Question */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                Ask a Follow-up Question
              </h5>

              <form onSubmit={handleAskFollowUp} className="flex gap-2">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="e.g. Why is the square root used here?..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={isAsking || !followUpQuestion.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isAsking ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Ask</span>
                </button>
              </form>

              {followUpAnswer && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Q: {followUpAnswer.question}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {followUpAnswer.answer}
                  </div>
                  {followUpAnswer.relatableExample && (
                    <div className="text-slate-500 dark:text-slate-400 italic">
                      {followUpAnswer.relatableExample}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
