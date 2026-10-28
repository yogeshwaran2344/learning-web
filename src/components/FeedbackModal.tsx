import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  CheckCircle2,
  HelpCircle,
  FileEdit
} from 'lucide-react';
import { FeedbackReport, LearningFormat } from '../types';
import { StorageService } from '../services/storageService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  documentId = 'general'
}) => {
  const [formatType, setFormatType] = useState<LearningFormat>('explanation');
  const [reason, setReason] = useState<FeedbackReport['reason']>('altered_equation');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const report: FeedbackReport = {
      id: 'fb-' + Date.now(),
      documentId,
      formatType,
      itemIdentifier: 'user-flagged-item',
      reason,
      userComment: comment.trim(),
      reportedAt: new Date().toISOString(),
      status: 'pending'
    };

    StorageService.saveFeedbackReport(report);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setComment('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Report Academic Inaccuracy</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phase 6 Step 17: Feedback & Verification Loop
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
              Feedback Received
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Thank you! Our Meaning Preservation Engine has recorded this correction for faculty review.
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
                onChange={(e) => setFormatType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="explanation">Explanation / Analogy</option>
                <option value="flashcards">Flashcard / Quiz Question</option>
                <option value="map">Concept Map Node</option>
                <option value="audio">Audio Narration Script</option>
                <option value="preservation">Meaning Preservation Fact Check</option>
              </select>
            </div>

            {/* Inaccuracy Reason */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Inaccuracy Category
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="altered_equation">Altered Mathematical Equation / Symbol</option>
                <option value="missing_condition">Dropped Mandatory Boundary Condition</option>
                <option value="unclear_explanation">Confusing or Over-Simplified Analogy</option>
                <option value="hallucination">Fact Not Supported by Original Document</option>
                <option value="other">Other Typo or Formatting Issue</option>
              </select>
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
                placeholder="Describe which formula, sentence, or concept is inaccurate and what the source document states..."
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
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
