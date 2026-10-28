import React from 'react';
import {
  X,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  FileText,
  BookmarkCheck,
  Sigma,
  AlertTriangle,
  Info
} from 'lucide-react';
import { SourceCitation, AcademicDocument, SavedItem } from '../../types';

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCitation: SourceCitation | null;
  activeDocument: AcademicDocument | null;
  onSaveCitation: (item: SavedItem) => void;
  onJumpToCitation: (citation: SourceCitation) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen,
  onClose,
  activeCitation,
  activeDocument,
  onSaveCitation,
  onJumpToCitation
}) => {
  if (!isOpen) return null;

  const handleSave = () => {
    if (!activeCitation || !activeDocument) return;
    const newItem: SavedItem = {
      id: 'saved-' + Date.now(),
      documentId: activeDocument.id,
      documentTitle: activeDocument.title,
      type: 'source_passage',
      title: `${activeCitation.sectionTitle} (p.${activeCitation.pageNumber})`,
      content: activeCitation.exactQuote,
      savedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      citation: activeCitation
    };
    onSaveCitation(newItem);
  };

  return (
    <aside className="w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-20 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bookmark className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Source Context Panel
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1 text-xs">
        {/* Active Source Citation */}
        {activeCitation ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px]">
                Cited Source Passage
              </span>
              <span className="text-slate-400 font-mono">Page {activeCitation.pageNumber}</span>
            </div>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {activeCitation.sectionTitle}
            </h4>

            <blockquote className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 font-serif italic text-slate-700 dark:text-slate-300 leading-relaxed">
              "{activeCitation.exactQuote}"
            </blockquote>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onJumpToCitation(activeCitation)}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Focus in Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleSave}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Save this passage to Saved Materials"
              >
                <BookmarkCheck className="w-4 h-4 text-amber-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No citation actively focused
            </p>
            <p className="text-[11px] text-slate-400">
              Click any <span className="text-amber-600 font-semibold">[Ref p.X]</span> or <span className="font-semibold text-brand-600">View Source</span> button to inspect original passage details.
            </p>
          </div>
        )}

        {/* Document Specifications Card */}
        {activeDocument && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Document Summary
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                {activeDocument.title}
              </div>
              <div className="text-[11px] text-slate-500">{activeDocument.author}</div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                <div>
                  <span className="text-slate-400">Format: </span>
                  <span className="font-semibold uppercase text-slate-700 dark:text-slate-200">{activeDocument.fileType}</span>
                </div>
                <div>
                  <span className="text-slate-400">Length: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{activeDocument.pageCount} pgs</span>
                </div>
                <div>
                  <span className="text-slate-400">Fidelity: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {activeDocument.meaningPreservation.overallFidelityScore}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Words: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{activeDocument.wordCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meaning Preservation Assurance Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Hallucination Guard</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Every statement generated in LearnLens is cross-checked against atomic facts extracted from the original PDF/PPT.
          </p>
        </div>
      </div>
    </aside>
  );
};
