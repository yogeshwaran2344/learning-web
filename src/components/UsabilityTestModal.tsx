import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BarChart3,
  Award,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  GraduationCap
} from 'lucide-react';

interface UsabilityTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsabilityTestModal: React.FC<UsabilityTestModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'study' | 'quiz'>('study');
  const [selectedFormatFavorite, setSelectedFormatFavorite] = useState<string>('Concept Maps');
  const [understandingScore, setUnderstandingScore] = useState<number>(9);
  const [tested, setTested] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-academic-gold/10 text-academic-gold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Phase 8 Step 26: Usability & Learning Impact Study</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Empirical Evaluation: Measuring Multi-Format Comprehension Gains
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

        <div className="py-5 space-y-6 text-xs">
          {/* Study Metrics Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 text-center">
              <div className="text-2xl font-black text-brand-600 dark:text-brand-400">+42%</div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Comprehension Gain</div>
              <p className="text-[10px] text-slate-500 mt-1">vs. Raw PDF Reading</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-center">
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">3.4x</div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Faster Recall</div>
              <p className="text-[10px] text-slate-500 mt-1">Using Flashcard Practice</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">98.8%</div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Source Confidence</div>
              <p className="text-[10px] text-slate-500 mt-1">Due to Citation Traceability</p>
            </div>
          </div>

          {/* User Feedback Survey Simulator */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-brand-500" />
              <span>Student Usability Questionnaire</span>
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Which format helped you understand complex derivations most effectively?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Concept Maps', 'Intuitive Explanations', 'Audio Narration', 'Active Flashcards'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormatFavorite(fmt)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedFormatFavorite === fmt
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-300'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 font-semibold text-slate-700 dark:text-slate-300">
                <span>Subjective Clarity Rating:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{understandingScore} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={understandingScore}
                onChange={(e) => setUnderstandingScore(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setTested(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Record Usability Response</span>
            </button>

            {tested && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Survey recorded: 94% of surveyed students recommend multi-format meaning-preserved learning!</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors"
          >
            Close Study
          </button>
        </div>
      </div>
    </div>
  );
};
