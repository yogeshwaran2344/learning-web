import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  CheckCircle2,
  HelpCircle,
  FileEdit,
  Globe,
  BookOpen
} from 'lucide-react';
import { FeedbackReport, LearningFormat } from '../types';
import { ApiClient } from '../services/apiClient';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  sourcePassageSnippet?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  documentId = 'general',
  sourcePassageSnippet
}) => {
  const [formatType, setFormatType] = useState<string>('explanation');
  const [reason, setReason] = useState<string>('incorrect_explanation');
  const [comment, setComment] = useState('');
  const [passage, setPassage] = useState(sourcePassageSnippet || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await ApiClient.submitFeedback({
        documentId,
        formatType,
        itemIdentifier: 'user-flagged-item',
        reason,
        userComment: comment.trim(),
        sourcePassage: passage.trim() || undefined
      });

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setComment('');
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to submit feedback report:', err);
      setIsSubmitting(false);
      alert('Error submitting feedback. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Report Academic Inaccuracy</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step 39: Feedback & Faculty Grounding Loop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Feedback Recorded!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Thank you! Our Meaning Preservation Engine and faculty audit dashboard have recorded this correction for review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
            {/* Format Type */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Affected Learning Format
              </label>
              <select
                value={formatType}
                onChange={(e) => setFormatType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="notes">Detailed Notes & Formulas</option>
                <option value="explanation">Simplified Explanation / Analogy</option>
                <option value="flashcards">Flashcard / Quiz Question</option>
                <option value="map">Concept Map Node</option>
                <option value="worked">Worked Example Derivation</option>
                <option value="audio">Audio Narration Script</option>
                <option value="translation">Multilingual Translation (Kannada / Hindi)</option>
              </select>
            </div>

            {/* Inaccuracy Reason (Step 39 Categories) */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Inaccuracy Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="incorrect_explanation">Incorrect Explanation</option>
                <option value="missing_concept">Missing Concept / Omitted Principle</option>
                <option value="wrong_answer">Wrong Answer in Practice Quiz</option>
                <option value="translation_issue">Translation Issue (Kannada / Hindi)</option>
                <option value="source_mismatch">Source Mismatch / Fact Not in Document</option>
                <option value="altered_equation">Altered Mathematical Equation / Symbol</option>
                <option value="missing_condition">Dropped Mandatory Boundary Condition</option>
                <option value="other">Other Typo or Formatting Issue</option>
              </select>
            </div>

            {/* Source Passage Snippet (Optional) */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source Document Passage / Page Identifier (Optional)
              </label>
              <input
                type="text"
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder="e.g. Page 4, Section 2: 'Byzantine Agreement Protocol'"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specific Inaccuracy Details & Suggested Correction
              </label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what is inaccurate and what the source document specifies..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Recording...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
