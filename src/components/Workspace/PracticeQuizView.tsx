import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  BookmarkCheck,
  Check,
  AlertTriangle,
  Flame,
  ArrowRight,
  Download,
  Filter,
  FileQuestion,
  ToggleLeft,
  PenTool,
  Calculator,
  BookOpen,
  Sparkles,
  Sliders,
  Compass,
  ArrowLeft
} from 'lucide-react';
import {
  AcademicDocument,
  SourceCitation,
  SavedItem,
  QuizQuestion,
  QuizQuestionType,
  QuizScope,
  QuizEvaluationResult
} from '../../types';
import { AssessmentService } from '../../services/assessmentService';
import { ApiClient } from '../../services/apiClient';

interface PracticeQuizViewProps {
  document: AcademicDocument;
  onNavigateToCitation: (citation: SourceCitation) => void;
  onSaveItem?: (item: SavedItem) => void;
}

export const PracticeQuizView: React.FC<PracticeQuizViewProps> = ({
  document,
  onNavigateToCitation,
  onSaveItem
}) => {
  // Quiz Configuration State
  const [selectedScopeType, setSelectedScopeType] = useState<'document' | 'chapter' | 'topic'>('document');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isQuizStarted, setIsQuizStarted] = useState<boolean>(true);
  const [retryQuestionsOnly, setRetryQuestionsOnly] = useState<QuizQuestion[] | null>(null);

  // Available scopes from topic hierarchy
  const availableChapters = useMemo(() => {
    return document.topicHierarchy?.chapters || [];
  }, [document]);

  const availableTopics = useMemo(() => {
    const list: { id: string; title: string; chapterTitle: string }[] = [];
    availableChapters.forEach(ch => {
      (ch.topics || []).forEach(t => {
        list.push({ id: t.id, title: t.title, chapterTitle: ch.title });
      });
    });
    return list;
  }, [availableChapters]);

  // Current scope object
  const currentScope: QuizScope = useMemo(() => {
    if (selectedScopeType === 'topic' && selectedScopeId !== 'all') {
      const top = availableTopics.find(t => t.id === selectedScopeId);
      return { type: 'topic', id: selectedScopeId, title: top?.title || 'Selected Topic' };
    }
    if (selectedScopeType === 'chapter' && selectedScopeId !== 'all') {
      const ch = availableChapters.find(c => c.id === selectedScopeId);
      return { type: 'chapter', id: selectedScopeId, title: ch?.title || 'Selected Chapter' };
    }
    return { type: 'document', title: document.title };
  }, [selectedScopeType, selectedScopeId, availableTopics, availableChapters, document.title]);

  // Questions generator
  const baseQuestions: QuizQuestion[] = useMemo(() => {
    return AssessmentService.generateQuizQuestions(document, currentScope, difficulty);
  }, [document, currentScope, difficulty]);

  const activeQuestions = retryQuestionsOnly || baseQuestions;

  // Active quiz session state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<QuizEvaluationResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Handlers
  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleTextChange = (questionId: string, val: string) => {
    if (isSubmitted) return;
    setTextAnswers(prev => ({
      ...prev,
      [questionId]: val
    }));
  };

  const handleToggleSolution = (questionId: string) => {
    setRevealedSolutions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmitQuiz = () => {
    // Combine option answers and text/numerical answers
    const mergedAnswers: Record<string, string> = { ...selectedAnswers };
    Object.entries(textAnswers).forEach(([qId, txt]) => {
      if (!mergedAnswers[qId] || mergedAnswers[qId].trim().length === 0) {
        mergedAnswers[qId] = txt;
      }
    });

    const result = AssessmentService.evaluateQuiz(activeQuestions, mergedAnswers);
    setEvaluation(result);
    setIsSubmitted(true);
  };

  const handleRestartQuiz = () => {
    setSelectedAnswers({});
    setTextAnswers({});
    setRevealedSolutions(new Set());
    setIsSubmitted(false);
    setEvaluation(null);
    setRetryQuestionsOnly(null);
    setShowIncorrectOnly(false);
  };

  const handleRetryIncorrect = () => {
    if (!evaluation) return;
    const incorrectIds = new Set(
      evaluation.questionBreakdown.filter(q => !q.isCorrect).map(q => q.questionId)
    );
    const missed = activeQuestions.filter(q => incorrectIds.has(q.id));
    if (missed.length > 0) {
      setRetryQuestionsOnly(missed);
      setSelectedAnswers({});
      setTextAnswers({});
      setRevealedSolutions(new Set());
      setIsSubmitted(false);
      setEvaluation(null);
      setShowIncorrectOnly(false);
    }
  };

  const handleSaveAssessment = () => {
    if (onSaveItem && evaluation) {
      onSaveItem({
        id: `saved-quiz-${Date.now()}`,
        documentId: document.id,
        documentTitle: document.title,
        type: 'quiz',
        title: `Quiz Assessment (${currentScope.title}) - Score: ${evaluation.percentage}%`,
        content: `Evaluated ${evaluation.totalQuestions} questions across ${difficulty} difficulty. Weak topics flagged: ${evaluation.weakTopics.map(w => w.topicTitle).join(', ') || 'None'}.`,
        savedAt: new Date().toISOString()
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Header & Scope/Difficulty Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileQuestion className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              AI-Generated Self-Assessment Quiz
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded diagnostic quizzes with MCQs, True/False, Fill in blanks, Short answers, Application scenarios & Numerical derivations.
          </p>
        </div>

        {/* Scope & Difficulty Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <Compass className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={`${selectedScopeType}:${selectedScopeId}`}
              onChange={(e) => {
                const [sType, sId] = e.target.value.split(':');
                setSelectedScopeType(sType as any);
                setSelectedScopeId(sId);
                handleRestartQuiz();
              }}
              className="bg-transparent font-semibold text-slate-700 dark:text-slate-200 border-none outline-none pr-2 cursor-pointer text-xs"
            >
              <option value="document:all">Entire Document (All Topics)</option>
              {availableChapters.map(ch => (
                <option key={ch.id} value={`chapter:${ch.id}`}>
                  Chapter: {ch.title}
                </option>
              ))}
              {availableTopics.map(top => (
                <option key={top.id} value={`topic:${top.id}`}>
                  Topic: {top.title}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            {(['beginner', 'intermediate', 'advanced'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => {
                  setDifficulty(lvl);
                  handleRestartQuiz();
                }}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  difficulty === lvl
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* New / Reset Quiz */}
          <button
            onClick={handleRestartQuiz}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Reset Quiz with fresh attempt"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Retry Mode Notice */}
      {retryQuestionsOnly && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Retry Mode:</strong> Re-attempting the {retryQuestionsOnly.length} questions missed on your previous attempt.
            </span>
          </div>
          <button
            onClick={handleRestartQuiz}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 underline hover:no-underline"
          >
            Load Full Quiz
          </button>
        </div>
      )}

      {/* Post-Submission Evaluation Dashboard */}
      {isSubmitted && evaluation && (
        <div className="space-y-4 animate-fadeIn">
          {/* Score Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:via-purple-950/40 dark:to-slate-800 border border-purple-200 dark:border-purple-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${
                evaluation.percentage >= 70
                  ? 'bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-rose-500 text-white shadow-rose-600/30'
              }`}>
                {evaluation.percentage}%
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {evaluation.percentage >= 70 ? 'Quiz Completed Successfully' : 'Revision Recommended'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    evaluation.percentage >= 70
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {evaluation.percentage >= 70 ? 'Passed' : 'Needs Review'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  You answered {evaluation.correctCount} of {evaluation.totalQuestions} questions correctly ({evaluation.incorrectCount} missed).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {evaluation.incorrectCount > 0 && (
                <button
                  onClick={handleRetryIncorrect}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Incorrect ({evaluation.incorrectCount})</span>
                </button>
              )}

              <button
                onClick={handleSaveAssessment}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{isSaved ? 'Saved to Materials!' : 'Save Result'}</span>
              </button>

              <button
                onClick={() => setShowIncorrectOnly(!showIncorrectOnly)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  showIncorrectOnly
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{showIncorrectOnly ? 'Show All' : 'Show Incorrect'}</span>
              </button>
            </div>
          </div>

          {/* Weak Topics & Revision Suggestions Card */}
          {evaluation.weakTopics.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Weak Topics Identified (Accuracy &lt; 70%):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evaluation.weakTopics.map((wt, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {wt.topicTitle}
                      </span>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        {wt.accuracyPercent}% Accuracy
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {wt.revisionAdvice}
                    </p>
                    <button
                      onClick={() => onNavigateToCitation({
                        id: `cite-weak-${idx}`,
                        documentId: document.id,
                        sectionTitle: wt.topicTitle,
                        pageNumber: wt.pageNumber,
                        exactQuote: wt.revisionAdvice,
                        contextSnippet: wt.revisionAdvice
                      })}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 pt-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Revisit Page {wt.pageNumber} in Original Document</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {activeQuestions.map((q, idx) => {
          const breakdown = evaluation?.questionBreakdown.find(b => b.questionId === q.id);
          const isItemCorrect = breakdown?.isCorrect;

          if (isSubmitted && showIncorrectOnly && isItemCorrect) {
            return null;
          }

          return (
            <div
              key={q.id}
              className={`p-6 rounded-3xl border transition-all ${
                isSubmitted
                  ? isItemCorrect
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-rose-200 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
              }`}
            >
              {/* Question Header: Number, Format Badge, Difficulty */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Question {idx + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold uppercase text-[10px] tracking-wider">
                    {q.type.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] capitalize">
                    {q.difficulty}
                  </span>
                </div>

                {/* Question Topic Citation */}
                <button
                  type="button"
                  onClick={() => onNavigateToCitation(q.citation)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-purple-600 transition-colors font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                  <span>Page {q.citation.pageNumber}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>

              {/* Question Prompt */}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                {q.questionText}
              </h3>

              {/* Numerical Given Values Box (if present) */}
              {q.givenValues && (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 mb-4 space-y-1.5 text-xs">
                  <div className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-blue-500" />
                    <span>Given Values & Formula:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {Object.entries(q.givenValues).map(([k, v]) => (
                      <div key={k} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/40">
                        <span className="text-[10px] text-slate-400 block">{k}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  {q.formulaUsed && (
                    <div className="pt-1.5 font-mono text-[11px] text-blue-700 dark:text-blue-300">
                      Formula: <strong>{q.formulaUsed}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Format-Specific Answer Inputs */}
              {/* 1. Multiple Choice / True False / Application Options */}
              {(q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'application' || (q.type === 'numerical' && q.options)) && (
                <div className="space-y-2">
                  {q.options?.map((opt) => {
                    const isSelected = selectedAnswers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? isSubmitted
                              ? opt.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 font-bold'
                              : 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 font-bold'
                            : isSubmitted && opt.isCorrect
                              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 font-bold'
                              : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt.text}</span>
                          {isSubmitted && opt.isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                          )}
                          {isSubmitted && isSelected && !opt.isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 ml-2" />
                          )}
                        </div>
                        {isSubmitted && (isSelected || opt.isCorrect) && (
                          <p className="mt-2 text-xs opacity-80 border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5 font-normal">
                            {opt.explanation}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. Fill in the Blank Input */}
              {q.type === 'fill_blank' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={isSubmitted}
                      value={textAnswers[q.id] || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Type your answer to fill in the blank..."
                      className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
                    />
                  </div>
                  {isSubmitted && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Expected Answer:</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {q.fillBlankAnswer}
                      </p>
                      <p className="text-slate-500 pt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Short Answer Input */}
              {q.type === 'short_answer' && (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    disabled={isSubmitted}
                    value={textAnswers[q.id] || ''}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    placeholder="Write a brief academic answer in your own words..."
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 resize-none"
                  />
                  {isSubmitted && q.modelAnswer && (
                    <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 text-xs space-y-1.5">
                      <span className="text-purple-700 dark:text-purple-300 font-bold uppercase text-[10px]">Verified Model Answer:</span>
                      <p className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                        {q.modelAnswer}
                      </p>
                      <p className="text-slate-500 pt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step-by-Step Derivation Toggle (for Numerical questions) */}
              {q.stepByStepSolution && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleSolution(q.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{revealedSolutions.has(q.id) ? 'Hide Step-by-Step Solution' : 'View Step-by-Step Derivation'}</span>
                  </button>

                  {revealedSolutions.has(q.id) && (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs animate-fadeIn">
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider">
                        Step-by-Step Mathematical Derivation:
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {q.stepByStepSolution.map((step, sIdx) => (
                          <div key={sIdx} className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                            {step}
                          </div>
                        ))}
                      </div>
                      {q.finalAnswer && (
                        <div className="pt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Final Answer: {q.finalAnswer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Submission Bar */}
      {!isSubmitted && (
        <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span>Answered {Object.keys(selectedAnswers).length + Object.keys(textAnswers).length} of {activeQuestions.length} questions</span>
          </div>

          <button
            onClick={handleSubmitQuiz}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
          >
            <span>Submit Quiz for Evaluation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
