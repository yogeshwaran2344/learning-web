import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { AcademicDocument, SourceCitation, Flashcard, SavedItem } from '../../types';
import { ApiClient } from '../../services/apiClient';

interface PracticeQuizViewProps {
  document: AcademicDocument;
  onNavigateToCitation: (citation: SourceCitation) => void;
  onSaveItem?: (item: SavedItem) => void;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  citation: SourceCitation;
  category: string;
}

export const PracticeQuizView: React.FC<PracticeQuizViewProps> = ({
  document,
  onNavigateToCitation,
  onSaveItem
}) => {
  // Convert flashcards into quiz questions with multiple options
  const questions: QuizQuestion[] = React.useMemo(() => {
    return (document.flashcards || []).slice(0, 6).map((card, idx) => {
      if (card.practiceOptions && card.practiceOptions.length >= 2) {
        return {
          id: card.id,
          questionText: card.front,
          options: card.practiceOptions.map((opt, optIdx) => ({
            id: `opt-${idx}-${optIdx}`,
            text: opt.text,
            isCorrect: opt.isCorrect,
            explanation: opt.explanation
          })),
          citation: card.sourceCitation,
          category: card.category
        };
      }

      // Generate plausible distractors based on the back of the card
      const correctAnswer = card.back;
      const distractors = [
        `Opposite formulation: does not preserve ${card.category} conditions in extreme bounds.`,
        `Alternative heuristic without formal mathematical normalization or proof.`,
        `Simplified legacy approximation that ignores spatial/sequential dependencies.`
      ];

      const options = [
        {
          id: `opt-${idx}-0`,
          text: correctAnswer,
          isCorrect: true,
          explanation: `Directly supported by ${card.sourceCitation.sectionTitle} on Page ${card.sourceCitation.pageNumber}.`
        },
        {
          id: `opt-${idx}-1`,
          text: distractors[0],
          isCorrect: false,
          explanation: `Contradicts the explicit conditions verified in the source material.`
        },
        {
          id: `opt-${idx}-2`,
          text: distractors[1],
          isCorrect: false,
          explanation: `Omits the rigorous mathematical definition established in the document.`
        }
      ].sort(() => (idx % 2 === 0 ? 0.5 - Math.random() : 0));

      return {
        id: card.id,
        questionText: card.front,
        options,
        citation: card.sourceCitation,
        category: card.category
      };
    });
  }, [document.flashcards]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<{
    score: number;
    correctCount: number;
    total: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(selectedAnswers).length === 0) return;
    setIsSubmitting(true);

    const answersPayload = questions.map(q => {
      const selectedOptionId = selectedAnswers[q.id];
      const selectedOption = q.options.find(o => o.id === selectedOptionId);
      const isCorrect = selectedOption ? selectedOption.isCorrect : false;
      return {
        questionId: q.id,
        selectedOptionId,
        isCorrect
      };
    });

    const correctCount = answersPayload.filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);

    setScoreResult({
      score,
      correctCount,
      total: questions.length
    });
    setIsSubmitted(true);

    try {
      await ApiClient.submitQuizAttempt(document.id, answersPayload, questions.length);
    } catch (e) {
      console.warn('Backend quiz attempt sync fallback (handled locally):', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    setIsSaved(false);
  };

  const handleBookmarkResults = () => {
    if (!scoreResult || !onSaveItem) return;
    const item: SavedItem = {
      id: `saved-quiz-${Date.now()}`,
      documentId: document.id,
      documentTitle: document.title,
      type: 'quiz',
      title: `Practice Quiz Attempt: ${scoreResult.score}% Score`,
      content: `Completed ${scoreResult.correctCount}/${scoreResult.total} questions correctly across ${document.title}.`,
      savedAt: new Date().toISOString(),
      citation: questions[0]?.citation
    };
    onSaveItem(item);
    setIsSaved(true);
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === questions.length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
            <Award className="w-4 h-4" />
            <span>08. Practice Quiz & Diagnostic Verification</span>
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {document.title} Assessment
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test your comprehension against verified textbook definitions, boundary conditions, and equations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {answeredCount} of {questions.length} Answered
          </div>
          {isSubmitted && (
            <button
              onClick={handleRetake}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          )}
        </div>
      </div>

      {/* Score Summary Banner if submitted */}
      {isSubmitted && scoreResult && (
        <div
          className={`p-6 rounded-3xl border shadow-sm transition-all flex flex-col sm:flex-row items-center justify-between gap-6 ${
            scoreResult.score >= 80
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100'
              : scoreResult.score >= 50
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-100'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center gap-5">
            <div
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black text-2xl shadow-inner ${
                scoreResult.score >= 80
                  ? 'bg-emerald-600 text-white'
                  : scoreResult.score >= 50
                  ? 'bg-amber-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              <span>{scoreResult.score}%</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {scoreResult.score >= 80
                    ? 'Excellent Comprehension!'
                    : scoreResult.score >= 50
                    ? 'Good Progress — Review Source Passages'
                    : 'Concept Review Recommended'}
                </h3>
                {scoreResult.score >= 80 && <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />}
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                You correctly answered {scoreResult.correctCount} out of {scoreResult.total} questions.
                {scoreResult.score < 100 && ' Click "View Source" on missed questions to inspect the verified text.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onSaveItem && (
              <button
                onClick={handleBookmarkResults}
                disabled={isSaved}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isSaved
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <BookmarkCheck className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Attempt Saved' : 'Save Attempt'}</span>
              </button>
            )}
            <button
              onClick={handleRetake}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => {
          const userSelectedOptionId = selectedAnswers[q.id];
          const isAnswered = !!userSelectedOptionId;
          const userOption = q.options.find(o => o.id === userSelectedOptionId);
          const isUserCorrect = userOption?.isCorrect ?? false;

          return (
            <div
              key={q.id}
              className={`p-6 rounded-3xl border transition-all ${
                isSubmitted
                  ? isUserCorrect
                    ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-900/60 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-900/60 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300'
              }`}
            >
              {/* Question Header & Citation */}
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400">Question {qIdx + 1}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 uppercase">
                    {q.category}
                  </span>
                </div>

                <button
                  onClick={() => onNavigateToCitation(q.citation)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                  title="Open source citation in context panel and highlight document"
                >
                  <span>View Source (p. {q.citation.pageNumber})</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Question Text */}
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-4">
                {q.questionText}
              </h3>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options.map((opt, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const isSelected = userSelectedOptionId === opt.id;
                  let optionStyles = 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300';

                  if (isSubmitted) {
                    if (opt.isCorrect) {
                      optionStyles = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-semibold';
                    } else if (isSelected && !opt.isCorrect) {
                      optionStyles = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-100';
                    } else {
                      optionStyles = 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20';
                    }
                  } else if (isSelected) {
                    optionStyles = 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold';
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      disabled={isSubmitted}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-all ${optionStyles}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isSubmitted && opt.isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isSubmitted && isSelected && !opt.isCorrect
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isSubmitted && opt.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isSubmitted && isSelected && !opt.isCorrect ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          letter
                        )}
                      </div>

                      <div className="flex-1 leading-relaxed">
                        <span>{opt.text}</span>
                        {isSubmitted && (opt.isCorrect || isSelected) && (
                          <p className="mt-1.5 text-xs font-normal opacity-90">
                            <span className="font-semibold">
                              {opt.isCorrect ? 'Why this is correct: ' : 'Why this is incorrect: '}
                            </span>
                            {opt.explanation}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Source verification footer */}
              {isSubmitted && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="italic truncate max-w-md">"{q.citation.exactQuote}"</span>
                  </div>
                  <button
                    onClick={() => onNavigateToCitation(q.citation)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2"
                  >
                    <span>Inspect Page {q.citation.pageNumber}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quiz Submit Action Bar */}
      {!isSubmitted && (
        <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h4 className="font-bold text-sm">Ready to check your understanding?</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAllAnswered
                ? 'All questions answered! Click submit to evaluate your responses.'
                : `You have answered ${answeredCount} of ${questions.length} questions.`}
            </p>
          </div>

          <button
            onClick={handleSubmitQuiz}
            disabled={answeredCount === 0 || isSubmitting}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              answeredCount > 0 && !isSubmitting
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span>Evaluating Answers...</span>
            ) : (
              <>
                <span>Submit Assessment</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
