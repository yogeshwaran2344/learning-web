import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  Sigma,
  BookOpen,
  Shuffle,
  Bookmark,
  BookmarkCheck,
  Filter
} from 'lucide-react';
import { Flashcard, SourceCitation } from '../../types';

interface FlashcardViewProps {
  documentId: string;
  flashcards: Flashcard[];
  onUpdateMastery: (docId: string, cardId: string, newLevel: number) => void;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  documentId,
  flashcards: initialFlashcards,
  onUpdateMastery,
  onNavigateToCitation
}) => {
  const [deck, setDeck] = useState<Flashcard[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'study' | 'quiz'>('study');
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showMarkedOnly, setShowMarkedOnly] = useState<boolean>(false);

  // Sync if initialFlashcards changes
  useEffect(() => {
    setDeck(initialFlashcards);
    setCurrentIndex(0);
  }, [initialFlashcards]);

  const activeCards = showMarkedOnly
    ? deck.filter(c => markedForReview.has(c.id))
    : deck;

  const currentCard = activeCards[currentIndex] || activeCards[0] || initialFlashcards[0];

  // Reset flip and quiz selection when index changes
  useEffect(() => {
    setIsFlipped(false);
    setQuizSelection(null);
  }, [currentIndex, viewMode, showMarkedOnly]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped(f => !f);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (isFlipped && e.key === '1') {
        handleGrade(0);
      } else if (isFlipped && e.key === '2') {
        handleGrade(1);
      } else if (isFlipped && (e.key === '3' || e.key === '4')) {
        handleGrade(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, activeCards.length]);

  const handleNext = () => {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleToggleMarkForReview = (cardId: string) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleGrade = (level: number) => {
    if (currentCard) {
      onUpdateMastery(documentId, currentCard.id, level);
      if (currentIndex < activeCards.length - 1) {
        handleNext();
      }
    }
  };

  const masteredCount = deck.filter(f => f.masteryLevel === 2).length;
  const learningCount = deck.filter(f => f.masteryLevel === 1).length;
  const unlearnedCount = deck.filter(f => f.masteryLevel === 0).length;

  if (activeCards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No cards marked for review</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Mark difficult definitions or formulas during study to group them here for focused revision.
        </p>
        <button
          onClick={() => setShowMarkedOnly(false)}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
        >
          View Full Deck ({deck.length} Cards)
        </button>
      </div>
    );
  }

  const isCurrentCardMarked = currentCard ? markedForReview.has(currentCard.id) : false;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Top Bar: Progress and Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Spaced Repetition Flashcards & Practice
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Card {currentIndex + 1} of {activeCards.length} • Press Space to Flip • 1, 2, 3 to Grade
            </p>
          </div>
        </div>

        {/* View Switcher & Action Tools */}
        <div className="flex items-center gap-2">
          {/* Shuffle Button */}
          <button
            onClick={handleShuffle}
            title="Shuffle card order"
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Shuffle</span>
          </button>

          {/* Mark for Review Toggle */}
          <button
            onClick={() => currentCard && handleToggleMarkForReview(currentCard.id)}
            title="Mark card for focused review"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
              isCurrentCardMarked
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isCurrentCardMarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isCurrentCardMarked ? 'Marked' : 'Mark for Review'}</span>
          </button>

          {/* Filter Marked Only */}
          {markedForReview.size > 0 && (
            <button
              onClick={() => {
                setShowMarkedOnly(m => !m);
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1 ${
                showMarkedOnly
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showMarkedOnly ? 'Showing Marked' : `Review (${markedForReview.size})`}</span>
            </button>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('study')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'study'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Study Flip
            </button>
            <button
              onClick={() => setViewMode('quiz')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'quiz'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Practice Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Mastered: {masteredCount}</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">Reviewing: {learningCount}</span>
          <span className="text-slate-500 font-medium">New: {unlearnedCount}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div style={{ width: `${(masteredCount / deck.length) * 100}%` }} className="bg-emerald-500 h-full" />
          <div style={{ width: `${(learningCount / deck.length) * 100}%` }} className="bg-amber-400 h-full" />
          <div style={{ width: `${(unlearnedCount / deck.length) * 100}%` }} className="bg-slate-300 dark:bg-slate-700 h-full" />
        </div>
      </div>

      {/* Main Flashcard Card Container */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[360px]">
        {viewMode === 'study' ? (
          <div
            onClick={() => setIsFlipped(f => !f)}
            className="w-full max-w-xl min-h-[320px] rounded-3xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 p-8 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all cursor-pointer relative"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {currentCard.category}
                </span>
                {isCurrentCardMarked && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                    ★ Marked for Review
                  </span>
                )}
              </div>

              <span className="flex items-center gap-1 text-slate-400 text-xs">
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isFlipped ? 'Answer Side' : 'Question Side (Click to Flip)'}</span>
              </span>
            </div>

            {/* Content (Front vs Back) */}
            <div className="my-6 text-center">
              {!isFlipped ? (
                <div className="space-y-3">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                    {currentCard.front}
                  </h3>
                  <p className="text-xs text-slate-400 italic">Click card or press Space to reveal answer</p>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Verified Answer:
                  </div>
                  <div className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed font-sans">
                    {currentCard.back}
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Mastery: {currentCard.masteryLevel === 2 ? '⭐⭐ Mastered' : currentCard.masteryLevel === 1 ? '⭐ Reviewing' : '⚪ Unlearned'}
              </span>

              {isFlipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToCitation(currentCard.sourceCitation);
                  }}
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  <span>Source p.{currentCard.sourceCitation.pageNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Practice Quiz Mode */
          <div className="w-full max-w-xl min-h-[340px] rounded-3xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 p-8 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between text-xs mb-4">
                <span className="px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Multiple-Choice Practice
                </span>
                <span className="text-xs text-slate-400">Card {currentIndex + 1}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-5">
                {currentCard.front}
              </h3>

              {/* Options */}
              <div className="space-y-2.5">
                {(currentCard.practiceOptions || [
                  { text: currentCard.back, isCorrect: true, explanation: 'Directly stated in the source text.' },
                  { text: 'None of the above conditions apply.', isCorrect: false, explanation: 'Incorrect statement.' }
                ]).map((opt, oIdx) => {
                  const isSelected = quizSelection === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => setQuizSelection(oIdx)}
                      className={`w-full p-3.5 rounded-xl text-left text-xs font-medium border transition-all flex items-start gap-2.5 ${
                        quizSelection === null
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                          : opt.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <div className="flex-1">
                        <div>{opt.text}</div>
                        {quizSelection !== null && isSelected && (
                          <div className="mt-1 text-[11px] opacity-90 italic">
                            {opt.explanation}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-400">Select an answer to verify</span>
              <button
                onClick={() => onNavigateToCitation(currentCard.sourceCitation)}
                className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                <span>Verify with Source Passage</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Self-Grading Buttons (Mark as Easy, Medium, or Difficult) */}
        {viewMode === 'study' && isFlipped && (
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => handleGrade(0)}
              className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-xs border border-rose-300 dark:border-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Mark as Difficult (1)"
            >
              <span>🔴 Difficult</span>
            </button>
            <button
              onClick={() => handleGrade(1)}
              className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-xs border border-amber-300 dark:border-amber-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Mark as Medium (2)"
            >
              <span>🟡 Medium</span>
            </button>
            <button
              onClick={() => handleGrade(2)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Mark as Easy (3)"
            >
              <span>🟢 Easy</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Card</span>
        </button>

        <span className="text-xs font-mono text-slate-500">
          Card {currentIndex + 1} / {activeCards.length}
        </span>

        <button
          onClick={handleNext}
          disabled={currentIndex === activeCards.length - 1}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <span>Next Card</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
