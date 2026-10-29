import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Headphones,
  Presentation,
  ShieldCheck,
  CheckCircle2,
  Globe,
  ExternalLink,
  Printer
} from 'lucide-react';
import { AcademicDocument, AppLanguage, StudioTab } from '../types';
import { ApiClient } from '../services/apiClient';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: AcademicDocument;
  currentTab?: StudioTab;
  currentLanguage?: AppLanguage;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  document,
  currentTab = 'notes',
  currentLanguage = 'English'
}) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'pptx' | 'csv' | 'markdown' | 'audio' | 'wav' | 'json'>('pdf');
  const [exportType, setExportType] = useState<string>(
    currentTab === 'quiz' ? 'quiz' : currentTab === 'flashcards' ? 'flashcards' : currentTab === 'audio' ? 'audio' : 'notes'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(currentLanguage);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    const url = ApiClient.getExportUrl(document.id, exportFormat, exportType, selectedLanguage);

    // Open download directly
    const link = window.document.createElement('a');
    link.href = url;
    link.target = '_blank';
    const ext = exportFormat === 'audio' ? 'txt' : exportFormat === 'wav' ? 'wav' : exportFormat;
    link.setAttribute('download', `${document.title}_${exportFormat}.${ext}`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        onClose();
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Export Grounded Learning Material</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step 38: Multi-Format Academic Packaging
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

        {isDone ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Export Complete!
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Your academic file has been packaged with verified formulas, citations, and UTF-8 characters.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-5 text-xs">
            {/* Document Context Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white line-clamp-1">{document.title}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {document.meaningPreservation && document.meaningPreservation.overallFidelityScore > 0
                    ? `${document.meaningPreservation.overallFidelityScore}% Grounded`
                    : 'Not Verified'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Author: {document.author || 'Academic Faculty'} • Source: {(document as any).originalFileName || document.title} ({document.fileType.toUpperCase()})
              </p>
            </div>

            {/* Target Export Format Selector */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Select Export Package Format
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    exportFormat === 'pdf'
                      ? 'bg-brand-50/50 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">PDF Notes</div>
                    <div className="text-[10px] text-slate-400">Formatted with equations & citations</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('pptx')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    exportFormat === 'pptx'
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Presentation className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Presentation (Slides)</div>
                    <div className="text-[10px] text-slate-400">Concept summaries & formulas</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    exportFormat === 'csv'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Flashcards / Quiz CSV</div>
                    <div className="text-[10px] text-slate-400">UTF-8 Question Bank</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('audio')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    exportFormat === 'audio'
                      ? 'bg-purple-50/50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Headphones className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Audio Lesson Script</div>
                    <div className="text-[10px] text-slate-400">Timestamped narration cues</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Package Language (UTF-8 Verified)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['English', 'Kannada', 'Hindi'] as AppLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      selectedLanguage === lang
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {lang === 'Kannada' ? 'ಕನ್ನಡ (Kannada)' : lang === 'Hindi' ? 'हिन्दी (Hindi)' : 'English'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                <Globe className="w-3 h-3 text-brand-500 shrink-0" />
                <span>Kannada & Hindi UTF-8 glyphs and KaTeX formulas are preserved without character distortion.</span>
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Packaging...' : 'Download Export Package'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
