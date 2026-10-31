import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  Check,
  Star,
  Flame,
  Tag
} from 'lucide-react';
import { Flashcard, SourceCitation, AcademicDocument } from '../../types';
import { AssessmentService } from '../../services/assessmentService';

interface FlashcardViewProps {
  documentId: string;
  flashcards: Flashcard[];
  document?: AcademicDocument;
  initialTopicId?: string;
  onUpdateMastery: (docId: string, cardId: string, newLevel: number) => void;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  documentId,
  flashcards: initialFlashcards,
  document,
  initialTopicId,
  onUpdateMastery,
  onNavigateToCitation
}) => {
  // Generate or partition flashcards by topic
  const { topicDecks, topicTitles, overallDeck } = useMemo(() => {
    if (document) {
      return AssessmentService.generateTopicWiseFlashcards(document);
    }
    // Fallback if full document not provided
    const overall = [...initialFlashcards];
    const decks: Record<string, Flashcard[]> = { overall };
    const titles: Record<string, string> = { overall: 'All Topics' };
    overall.forEach((fc) => {
      const topId = fc.topicId || 'general';
      const topTitle = fc.topicTitle || 'Core Concepts';
      titles[topId] = topTitle;
      if (!decks[topId]) decks[topId] = [];
      decks[topId].push(fc);
    });
    return { topicDecks: decks, topicTitles: titles, overallDeck: overall };
  }, [document, initialFlashcards]);

  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || 'overall');
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [markedDifficult, setMarkedDifficult] = useState<Set<string>>(new Set());
  const [cardRatings, setCardRatings] = useState<Record<string, 'easy' | 'medium' | 'difficult'>>({});
  const [showDifficultOnly, setShowDifficultOnly] = useState<boolean>(false);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState<boolean>(false);
  const [cardLapseStats, setCardLapseStats] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`learnova_card_lapses_${documentId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  const [viewMode, setViewMode] = useState<'study' | 'quiz'>('study');
  const [quizSelection, setQuizSelection] = useState<number | null>(null);

  useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
    }
  }, [initialTopicId]);

  // Sync deck when selected topic or adaptive mode changes (Feature 7)
  useEffect(() => {
    let targetDeck = selectedTopicId === 'overall'
      ? overallDeck
      : (topicDecks[selectedTopicId] || overallDeck);

    if (isAdaptiveMode) {
      targetDeck = [...targetDeck].sort((a, b) => (cardLapseStats[b.id] || 0) - (cardLapseStats[a.id] || 0));
    }

    setDeck(targetDeck);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedTopicId, topicDecks, overallDeck, isAdaptiveMode]);

  const activeCards = useMemo(() => {
    if (showDifficultOnly) {
      return deck.filter(c => markedDifficult.has(c.id) || cardRatings[c.id] === 'difficult');
    }
    return deck;
  }, [deck, showDifficultOnly, markedDifficult, cardRatings]);

  const currentCard = activeCards[currentIndex] || activeCards[0] || deck[0];

  // Reset flip and quiz selection on card navigation
  useEffect(() => {
    setIsFlipped(false);
    setQuizSelection(null);
  }, [currentIndex, viewMode, showDifficultOnly]);

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
        handleRateCard('easy');
      } else if (isFlipped && e.key === '2') {
        handleRateCard('medium');
      } else if (isFlipped && (e.key === '3' || e.key === '4')) {
        handleRateCard('difficult');
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

  const handleRateCard = (rating: 'easy' | 'medium' | 'difficult') => {
    if (!currentCard) return;
    setCardRatings(prev => ({ ...prev, [currentCard.id]: rating }));

    if (rating === 'difficult') {
      const newLapseCount = (cardLapseStats[currentCard.id] || 0) + 1;
      const updatedLapses = { ...cardLapseStats, [currentCard.id]: newLapseCount };
      setCardLapseStats(updatedLapses);
      try {
        localStorage.setItem(`learnova_card_lapses_${documentId}`, JSON.stringify(updatedLapses));
      } catch (e) {}

      // Adaptive queue re-injection (Feature 7): Re-insert difficult card 3 cards ahead for spaced reinforcement
      setDeck(prev => {
        const next = [...prev];
        const insertPos = Math.min(next.length, currentIndex + 3);
        next.splice(insertPos, 0, currentCard);
        return next;
      });

      setMarkedDifficult(prev => new Set(prev).add(currentCard.id));
      onUpdateMastery(documentId, currentCard.id, 0); // unlearned
    } else if (rating === 'medium') {
      onUpdateMastery(documentId, currentCard.id, 1); // learning
    } else {
      onUpdateMastery(documentId, currentCard.id, 2); // mastered
    }

    if (currentIndex < activeCards.length - 1) {
      handleNext();
    }
  };

  const handleToggleDifficult = (cardId: string) => {
    setMarkedDifficult(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const totalDifficultCount = deck.filter(c => markedDifficult.has(c.id) || cardRatings[c.id] === 'difficult').length;
  const masteredCount = deck.filter(f => cardRatings[f.id] === 'easy' || f.masteryLevel === 2).length;
  const learningCount = deck.filter(f => cardRatings[f.id] === 'medium' || f.masteryLevel === 1).length;
  const unlearnedCount = deck.filter(f => cardRatings[f.id] === 'difficult' || (!cardRatings[f.id] && f.masteryLevel === 0)).length;

  const currentCardRating = currentCard ? (cardRatings[currentCard.id] || currentCard.difficulty || 'medium') : 'medium';
  const isCurrentDifficult = currentCard ? (markedDifficult.has(currentCard.id) || cardRatings[currentCard.id] === 'difficult') : false;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-5 overflow-y-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2.5">
          <span className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Topic-Wise Flashcards & Revision
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Revise by individual topic or study the complete deck with self-rated difficulty tracking.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Shuffle */}
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            title="Shuffle cards"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>

          {/* Adaptive Review (Weakest Cards First) */}
          <button
            onClick={() => {
              setIsAdaptiveMode(!isAdaptiveMode);
              setCurrentIndex(0);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isAdaptiveMode
                ? 'bg-purple-600 text-white shadow-sm'
                : 'border border-purple-300 dark:border-purple-700/60 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
            }`}
            title="Automatically prioritize cards based on how frequently you answer incorrectly"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Adaptive Order {isAdaptiveMode && '(Weakest First)'}</span>
          </button>

          {/* Revisit Difficult Cards Filter */}
          <button
            onClick={() => {
              setShowDifficultOnly(!showDifficultOnly);
              setCurrentIndex(0);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              showDifficultOnly
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Difficult Cards ({totalDifficultCount})</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setViewMode('study')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'study'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Study Cards
            </button>
            <button
              onClick={() => setViewMode('quiz')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'quiz'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Practice
            </button>
          </div>
        </div>
      </div>

      {/* Topic Selector Tabs */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5" />
          <span>Select Topic to Study:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedTopicId('overall')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedTopicId === 'overall'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Topics ({overallDeck.length})
          </button>
          {Object.entries(topicTitles)
            .filter(([id]) => id !== 'overall')
            .map(([id, title]) => {
              const cardCount = topicDecks[id]?.length || 0;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedTopicId(id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                    selectedTopicId === id
                      ? 'bg-purple-600 text-white shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {title} ({cardCount})
                </button>
              );
            })}
        </div>
      </div>

      {/* Progress & Counters */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Card {activeCards.length > 0 ? currentIndex + 1 : 0} of {activeCards.length}
          </span>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Easy: {masteredCount}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium: {learningCount}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Difficult: {unlearnedCount}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-36 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{
              width: `${activeCards.length > 0 ? ((currentIndex + 1) / activeCards.length) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Empty State for Difficult Cards */}
      {activeCards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No cards currently marked as Difficult
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Rate cards as "Difficult" during your study session to group them here for focused re-testing.
          </p>
          <button
            onClick={() => setShowDifficultOnly(false)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
          >
            Show All {deck.length} Cards
          </button>
        </div>
      ) : (
        /* Active Flashcard Canvas */
        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
          {viewMode === 'study' ? (
            /* Flip Card View */
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full min-h-[340px] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl hover:shadow-2xl hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer flex flex-col justify-between relative group select-none"
            >
              {/* Card Meta Header */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider text-[10px]">
                    {currentCard?.topicTitle || 'Topic Concept'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {currentCard?.category?.toUpperCase() || 'CORE'}
                  </span>
                  {(cardLapseStats[currentCard?.id || ''] || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800" title="This card was missed or marked difficult">
                      ⚠️ Struggled {cardLapseStats[currentCard.id]}x
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentCard) handleToggleDifficult(currentCard.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isCurrentDifficult
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                        : 'text-slate-400 hover:text-amber-500'
                    }`}
                    title={isCurrentDifficult ? 'Marked as Difficult' : 'Mark as Difficult'}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <span className="text-[11px] font-medium text-slate-400">
                    {isFlipped ? 'Answer (Click to flip back)' : 'Question (Click to flip)'}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="py-6 flex flex-col items-center justify-center text-center">
                {!isFlipped ? (
                  <div className="space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">
                      Question
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed max-w-xl">
                      {currentCard?.front}
                    </h3>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-xl">
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Answer
                    </span>
                    <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                      {currentCard?.back}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer: Citation & Flip prompt */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {currentCard?.sourceCitation ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToCitation(currentCard.sourceCitation);
                    }}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-purple-600 transition-colors font-medium text-[11px]"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                    <span>Page {currentCard.sourceCitation.pageNumber} ({currentCard.sourceCitation.sectionTitle})</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>
                ) : (
                  <div />
                )}

                <span className="text-[11px] text-slate-400 group-hover:text-purple-600 transition-colors flex items-center gap-1 font-semibold">
                  <RotateCw className="w-3.5 h-3.5" />
                  Space or Enter to flip
                </span>
              </div>
            </div>
          ) : (
            /* Practice Multiple Choice Mode */
            <div className="w-full p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider text-[10px]">
                  {currentCard?.topicTitle}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
                  {currentCard?.front}
                </h3>
              </div>

              <div className="space-y-2.5">
                {(currentCard?.practiceOptions && currentCard.practiceOptions.length > 0
                  ? currentCard.practiceOptions
                  : [
                      { text: currentCard?.back || '', isCorrect: true, explanation: 'Direct verified definition.' },
                      { text: 'Inverted condition that contradicts source invariants.', isCorrect: false, explanation: 'Incorrect formulation.' },
                      { text: 'Approximation valid only when external dependencies are zero.', isCorrect: false, explanation: 'Unsupported condition.' }
                    ]
                ).map((opt, oIdx) => {
                  const isSelected = quizSelection === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => setQuizSelection(oIdx)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all ${
                        isSelected
                          ? opt.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.text}</span>
                        {isSelected && (
                          opt.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                      {isSelected && (
                        <p className="mt-2 text-xs opacity-80 border-t border-slate-200/40 dark:border-slate-700/40 pt-1.5 font-normal">
                          {opt.explanation}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating Buttons (Easy, Medium, Difficult) */}
          <div className="w-full mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Rate your understanding of this card:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRateCard('easy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentCardRating === 'easy'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-700 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                }`}
                title="Shortcut: Press 1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>🟢 Easy</span>
              </button>
              <button
                type="button"
                onClick={() => handleRateCard('medium')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentCardRating === 'medium'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50'
                }`}
                title="Shortcut: Press 2"
              >
                <span>🟡 Medium</span>
              </button>
              <button
                type="button"
                onClick={() => handleRateCard('difficult')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentCardRating === 'difficult' || isCurrentDifficult
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-700 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50'
                }`}
                title="Shortcut: Press 3"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>🔴 Difficult</span>
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between w-full mt-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-400 font-medium">
              Use arrow keys to navigate
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex === activeCards.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
