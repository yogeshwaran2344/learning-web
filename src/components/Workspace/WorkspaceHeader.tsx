import React from 'react';
import {
  ArrowLeft,
  Columns,
  Maximize2,
  Network,
  Lightbulb,
  Layers,
  Headphones,
  ShieldCheck,
  FileText,
  AlertCircle,
  Sparkles,
  Download
} from 'lucide-react';
import { AcademicDocument, LearningFormat } from '../../types';

interface WorkspaceHeaderProps {
  document: AcademicDocument;
  currentFormat: LearningFormat;
  onSelectFormat: (format: LearningFormat) => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
  onBackToDashboard: () => void;
  onOpenFeedback: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  document,
  currentFormat,
  onSelectFormat,
  isSplitView,
  onToggleSplitView,
  onBackToDashboard,
  onOpenFeedback
}) => {
  const formats: { id: LearningFormat; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'map', label: 'Concept Map', icon: <Network className="w-4 h-4" />, color: 'text-blue-500' },
    { id: 'explanation', label: 'Explanations', icon: <Lightbulb className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'flashcards', label: 'Flashcards & Quiz', icon: <Layers className="w-4 h-4" />, color: 'text-purple-500' },
    { id: 'audio', label: 'Audio Lesson', icon: <Headphones className="w-4 h-4" />, color: 'text-emerald-500' },
    { id: 'preservation', label: 'Meaning Preservation', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-600' },
    { id: 'source', label: 'Original Paper', icon: <FileText className="w-4 h-4" />, color: 'text-slate-500' },
  ];

  const handleExportSummary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(document, null, 2));
    const downloadAnchor = window.document.createElement('a') as any;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${document.title.replace(/\s+/g, '_')}_Learnova_Pack.json`);
    window.document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Back & Document Metadata */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">
                {document.title}
              </h1>
              {document.meaningPreservation && document.meaningPreservation.overallFidelityScore > 0 ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  {document.meaningPreservation.overallFidelityScore}% Verified
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                  Not Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
              {document.author} • {document.category}
            </p>
          </div>
        </div>

        {/* Right: Format Switches & Split View Toggle */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Format Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-1 border border-slate-200 dark:border-slate-700/80 overflow-x-auto text-xs">
            {formats.map((fmt) => {
              const isActive = currentFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => onSelectFormat(fmt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={isActive ? fmt.color : ''}>{fmt.icon}</span>
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Split Screen View Toggle */}
          <button
            onClick={onToggleSplitView}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isSplitView
                ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/50 dark:border-brand-700 dark:text-brand-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle Split-Screen View: Source on left, Learning format on right"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSplitView ? 'Exit Split View' : 'Split View'}</span>
          </button>

          {/* Report Feedback / Correction */}
          <button
            onClick={onOpenFeedback}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors border border-slate-200 dark:border-slate-700"
            title="Report correction or altered explanation"
          >
            <AlertCircle className="w-4 h-4" />
          </button>

          {/* Export Learning Pack */}
          <button
            onClick={handleExportSummary}
            className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-brand-950/30 transition-colors border border-slate-200 dark:border-slate-700"
            title="Export Learning Pack (JSON / Verified Notes)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
