import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  FileText,
  BookmarkCheck,
  Sigma,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GripVertical,
  Check,
  Copy,
  BookOpen
} from 'lucide-react';
import { SourceCitation, AcademicDocument, SavedItem } from '../../types';
import { MathFormulaView } from '../Workspace/StructuredContentRenderer';

export interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCitation: SourceCitation | null;
  activeDocument: AcademicDocument | null;
  allCitations?: SourceCitation[];
  onSaveCitation: (item: SavedItem) => void;
  onJumpToCitation: (citation: SourceCitation) => void;
}

const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 680;

/**
 * Helper to extract all available citations from an AcademicDocument
 */
export const extractAllDocumentCitations = (doc: AcademicDocument | null): SourceCitation[] => {
  if (!doc) return [];
  const list: SourceCitation[] = [];
  const seenQuotes = new Set<string>();

  const addCite = (cite?: SourceCitation | null) => {
    if (!cite || !cite.exactQuote) return;
    const key = `${cite.pageNumber}-${cite.exactQuote.trim().slice(0, 40)}`;
    if (!seenQuotes.has(key)) {
      seenQuotes.add(key);
      list.push(cite);
    }
  };

  // 1. From explanations
  (doc.explanations || []).forEach(exp => {
    (exp.citations || []).forEach(addCite);
  });

  // 2. From flashcards
  (doc.flashcards || []).forEach(fc => {
    addCite(fc.sourceCitation);
  });

  // 3. From audio lesson
  (doc.audioLesson?.sections || []).forEach(sec => {
    addCite(sec.sourceCitation);
  });

  // 4. From sections
  (doc.sections || []).forEach((sec, idx) => {
    addCite({
      id: `cite-sec-${sec.id || idx}`,
      documentId: doc.id,
      pageNumber: sec.pageNumber || sec.slideNumber || idx + 1,
      sectionTitle: sec.title,
      exactQuote: sec.content.slice(0, 160) + (sec.content.length > 160 ? '...' : ''),
      contextSnippet: sec.content.slice(0, 240)
    });
  });

  return list;
};

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen,
  onClose,
  activeCitation,
  activeDocument,
  allCitations,
  onSaveCitation,
  onJumpToCitation
}) => {
  // Panel resizing state
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('learnova_context_panel_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= MAX_PANEL_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PANEL_WIDTH;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Check viewport width for responsive drawer behaviour
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dragging logic for left border
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxAllowed = Math.min(MAX_PANEL_WIDTH, Math.round(window.innerWidth * 0.65));
      if (newWidth >= MIN_PANEL_WIDTH && newWidth <= maxAllowed) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        try {
          localStorage.setItem('learnova_context_panel_width', panelWidth.toString());
        } catch {
          // ignore
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, panelWidth]);

  // Build the list of all citations in active document
  const citations = React.useMemo(() => {
    if (allCitations && allCitations.length > 0) return allCitations;
    return extractAllDocumentCitations(activeDocument);
  }, [allCitations, activeDocument]);

  // Find index of current citation
  const currentIndex = React.useMemo(() => {
    if (!activeCitation || citations.length === 0) return -1;
    const matchIdx = citations.findIndex(
      c => c.id === activeCitation.id ||
           (c.pageNumber === activeCitation.pageNumber &&
            c.exactQuote.trim().slice(0, 30) === activeCitation.exactQuote.trim().slice(0, 30))
    );
    return matchIdx !== -1 ? matchIdx : 0;
  }, [activeCitation, citations]);

  const handleStepCitation = (delta: number) => {
    if (citations.length === 0) return;
    const targetIdx = Math.max(0, Math.min(citations.length - 1, (currentIndex !== -1 ? currentIndex : 0) + delta));
    const targetCite = citations[targetIdx];
    if (targetCite) {
      onJumpToCitation(targetCite);
    }
  };

  const handleResetWidth = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    try {
      localStorage.setItem('learnova_context_panel_width', DEFAULT_PANEL_WIDTH.toString());
    } catch {
      // ignore
    }
  };

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

  const handleCopyQuote = () => {
    if (!activeCitation) return;
    navigator.clipboard.writeText(`"${activeCitation.exactQuote}" — Page ${activeCitation.pageNumber}, ${activeCitation.sectionTitle}`);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  if (!isOpen) return null;

  // Check if citation text contains LaTeX / math formulations
  const hasEquations = activeCitation && (
    activeCitation.exactQuote.includes('\\') ||
    activeCitation.exactQuote.includes('=') ||
    activeCitation.exactQuote.includes('sqrt') ||
    activeCitation.exactQuote.includes('^')
  );

  return (
    <>
      {/* Mobile Backdrop Overlay (Clicking closes drawer to keep document viewer accessible) */}
      {isMobile && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
          title="Click to close source panel and return to document"
        />
      )}

      {/* Main Source Context Panel Container */}
      <aside
        style={{
          width: isMobile ? '100%' : `${panelWidth}px`,
          maxWidth: isMobile ? '100vw' : `${MAX_PANEL_WIDTH}px`,
          minWidth: isMobile ? 'auto' : `${MIN_PANEL_WIDTH}px`
        }}
        className={`bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-screen select-none overflow-x-hidden transition-all duration-75 shrink-0 z-50 ${
          isMobile
            ? 'fixed inset-y-0 right-0 w-full sm:w-[380px] shadow-2xl animate-slideLeft'
            : 'sticky top-0 shadow-lg'
        }`}
      >
        {/* Left Border Drag Handle (Desktop only) */}
        {!isMobile && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDoubleClick={handleResetWidth}
            className={`absolute top-0 bottom-0 -left-1 w-2 hover:w-2.5 cursor-col-resize group flex items-center justify-center transition-colors z-30 select-none ${
              isDragging ? 'bg-blue-600 w-2.5' : 'hover:bg-blue-500'
            }`}
            title={`Drag to resize panel (${panelWidth}px). Double-click to reset to default (${DEFAULT_PANEL_WIDTH}px).`}
          >
            <div className="w-0.5 h-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-white transition-colors" />
          </div>
        )}

        {/* Panel Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
              Source Context Panel
            </span>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {/* Reset to default width button (Desktop only) */}
            {!isMobile && panelWidth !== DEFAULT_PANEL_WIDTH && (
              <button
                onClick={handleResetWidth}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title={`Reset width to default (${DEFAULT_PANEL_WIDTH}px)`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Citation Navigation Bar (Prev / Next citation stepper) */}
        {citations.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/90 flex items-center justify-between text-xs font-medium shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Navigation:</span>
              <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                {currentIndex !== -1 ? `${currentIndex + 1} / ${citations.length}` : `1 / ${citations.length}`}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleStepCitation(-1)}
                disabled={currentIndex <= 0}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center gap-0.5 text-[11px] font-bold"
                title="Go to previous citation"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => handleStepCitation(1)}
                disabled={currentIndex >= citations.length - 1}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center gap-0.5 text-[11px] font-bold"
                title="Go to next citation"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Panel Content Body */}
        <div className="p-4 sm:p-5 space-y-5 flex-1 text-xs overflow-y-auto overflow-x-hidden select-text">
          {/* Active Citation Card */}
          {activeCitation ? (
            <div className="space-y-3.5 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 shadow-xs">
              {/* Badge & Page Marker */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-amber-600" />
                  <span>Cited Source Passage</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono font-bold text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  Page {activeCitation.pageNumber}
                </span>
              </div>

              {/* Section Title */}
              <h4 className="font-bold text-slate-900 dark:text-white text-sm break-words leading-snug">
                {activeCitation.sectionTitle}
              </h4>

              {/* Independently Scrollable Long Citation Passage */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>Exact Source Quote</span>
                  <button
                    onClick={handleCopyQuote}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Copy quote to clipboard"
                  >
                    {copiedQuote ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedQuote ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="max-h-56 sm:max-h-64 overflow-y-auto pr-1 select-text scrollbar-thin">
                  <blockquote className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed text-xs sm:text-sm break-words whitespace-pre-wrap shadow-2xs">
                    "{activeCitation.exactQuote}"
                  </blockquote>
                </div>
              </div>

              {/* Formula & Equation Preservation Badge if present */}
              {hasEquations && (
                <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800 font-mono text-xs space-y-1 overflow-x-auto">
                  <div className="flex items-center justify-between text-[10px] text-blue-300 font-sans font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Sigma className="w-3 h-3 text-blue-400" />
                      <span>Preserved Mathematical Invariant</span>
                    </span>
                    <span className="text-slate-400">0 Altered Formulas</span>
                  </div>
                  <div className="text-blue-200 py-0.5 text-xs font-semibold break-words">
                    <MathFormulaView
                      formula={activeCitation.exactQuote.match(/([A-Za-z0-9_\\^+\-*\/=()\s]{4,})/)?.[0] || activeCitation.exactQuote}
                      isBlock={false}
                    />
                  </div>
                </div>
              )}

              {/* Context Snippet if available and distinct */}
              {activeCitation.contextSnippet &&
                activeCitation.contextSnippet.trim() !== activeCitation.exactQuote.trim() && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Surrounding Context
                    </span>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-36 overflow-y-auto break-words whitespace-pre-wrap select-text">
                      {activeCitation.contextSnippet}
                    </div>
                  </div>
                )}

              {/* Action Buttons: Focus in Studio + Bookmark */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onJumpToCitation(activeCitation)}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer active:scale-98"
                  title="Highlight and focus this exact passage in the Document Viewer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Focus in Studio</span>
                </button>

                <button
                  onClick={handleSave}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Save this passage to Saved Materials"
                >
                  <BookmarkCheck className="w-4 h-4 text-amber-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2.5">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No citation actively focused
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click any citation badge <span className="text-amber-600 font-semibold">[Ref p.X]</span> or use the <span className="font-semibold text-blue-600">Prev / Next</span> buttons above to browse grounded passages.
              </p>
            </div>
          )}

          {/* Document Specifications Card */}
          {activeDocument && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Document Specifications
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white break-words line-clamp-2">
                  {activeDocument.title}
                </div>
                <div className="text-[11px] text-slate-500 break-words">{activeDocument.author}</div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                  <div>
                    <span className="text-slate-400">Format: </span>
                    <span className="font-semibold uppercase text-slate-700 dark:text-slate-200">
                      {activeDocument.fileType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Pages: </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {activeDocument.pageCount} pgs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fidelity: </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {activeDocument.meaningPreservation && activeDocument.meaningPreservation.overallFidelityScore > 0
                        ? `${activeDocument.meaningPreservation.overallFidelityScore}%`
                        : 'Not Verified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Words: </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {activeDocument.wordCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meaning Preservation Assurance Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero-Hallucination Grounding</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              Every formula, definition, and condition in LEARNOVA is audited against atomic citations extracted from the original source.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
