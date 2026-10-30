import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Bookmark,
  ExternalLink,
  Sigma,
  AlertTriangle,
  Info,
  Hash,
  CheckCircle2,
  Table as TableIcon,
  MessageSquare,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  EyeOff
} from 'lucide-react';
import { AcademicDocument, SourceCitation, ExtractionDiagnosticWarning } from '../../types';
import { Lightbulb } from 'lucide-react';

interface OriginalDocumentViewProps {
  document: AcademicDocument;
  highlightedCitation?: SourceCitation | null;
  onClearHighlight?: () => void;
  onExplainSelection?: (text: string, context?: string, pageNumber?: number, sectionTitle?: string) => void;
}

export const OriginalDocumentView: React.FC<OriginalDocumentViewProps> = ({
  document,
  highlightedCitation,
  onClearHighlight,
  onExplainSelection
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeHighlightRef = useRef<HTMLDivElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedPageNumber, setSelectedPageNumber] = useState<number | undefined>(undefined);
  const [selectedSectionTitle, setSelectedSectionTitle] = useState<string | undefined>(undefined);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 3) {
      try {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect && rect.top > 0) {
          setSelectionPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 });
          setSelectedText(text);

          // Find enclosing section element to resolve page number and section title
          const node = range?.commonAncestorContainer;
          const el = node ? (node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement) : null;
          const sectionEl = el?.closest('[data-section-page]');
          const pageStr = sectionEl?.getAttribute('data-section-page');
          const titleStr = sectionEl?.getAttribute('data-section-title');
          setSelectedPageNumber(pageStr ? parseInt(pageStr, 10) : undefined);
          setSelectedSectionTitle(titleStr || undefined);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    setSelectionPosition(null);
  };

  useEffect(() => {
    if (highlightedCitation && activeHighlightRef.current) {
      activeHighlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCitation]);

  const isPresentation = document.fileType === 'pptx';
  const isScanned = document.fileType === 'scanned_notes';
  const extractionStatus = document.extractionStatus || (document.processingStatus === 'warning' ? 'needs_review' : 'ready');
  const quality = document.extractionQuality;

  return (
    <div
      onMouseUp={handleMouseUp}
      className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-colors select-text relative"
    >
      {/* Floating Explain This Tooltip */}
      {selectionPosition && (
        <button
          onClick={() => {
            if (onExplainSelection) onExplainSelection(selectedText, undefined, selectedPageNumber, selectedSectionTitle);
            setSelectionPosition(null);
          }}
          className="fixed z-50 px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-xl text-xs font-semibold flex items-center space-x-1.5 -translate-x-1/2 -translate-y-full transition-all cursor-pointer border border-white/20 active:scale-95"
          style={{ left: selectionPosition.x, top: selectionPosition.y }}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
          <span>Explain This</span>
        </button>
      )}
      {/* Top Banner: Quality Status Bar (Section 4.3) */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Extracted Source Material ({document.fileType.toUpperCase()})
            </span>
          </div>

          {/* User-Facing Status Pill: Ready | Needs review | Failed */}
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                extractionStatus === 'ready'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  : extractionStatus === 'needs_review'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-700'
              }`}
            >
              {extractionStatus === 'ready' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </>
              ) : extractionStatus === 'needs_review' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Needs Review</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Extraction Failed</span>
                </>
              )}
            </span>

            <button
              onClick={() => setShowDiagnostics(v => !v)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-1"
            >
              <span>Quality Checks</span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable 5-Dimensional Extraction Quality Breakdown (Section 4.3) */}
        {showDiagnostics && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Completeness</div>
                <div className="text-base font-bold text-slate-800 dark:text-white">
                  {quality ? quality.textCompletenessScore : 100}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">OCR Confidence</div>
                <div className={`text-base font-bold ${
                  (quality?.ocrConfidenceScore || 100) < 85 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {quality ? quality.ocrConfidenceScore : (isScanned ? 76 : 100)}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Equation Math</div>
                <div className="text-base font-bold text-blue-600">
                  {quality ? quality.equationIntegrityScore : 100}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Structure</div>
                <div className="text-base font-bold text-purple-600">
                  {quality ? quality.structurePreservationScore : (isPresentation ? 98 : 100)}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Traceability</div>
                <div className="text-base font-bold text-emerald-600">
                  {quality ? quality.sourceTraceabilityScore : 100}%
                </div>
              </div>
            </div>

            {/* Diagnostic Warnings List */}
            {quality && quality.diagnostics.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="font-bold text-amber-800 dark:text-amber-300 text-[11px] uppercase tracking-wider">
                  Diagnostic Extraction Warnings ({quality.diagnostics.length})
                </div>
                {quality.diagnostics.map((diag, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] space-y-1 text-slate-700 dark:text-slate-300"
                  >
                    <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{diag.message}</span>
                      </span>
                      {diag.pageNumber && (
                        <span className="font-mono text-[10px] bg-amber-200/60 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                          Page {diag.pageNumber}
                        </span>
                      )}
                    </div>
                    {diag.flaggedSnippet && (
                      <p className="font-mono text-xs italic text-slate-500 pl-4">
                        Flagged snippet: "{diag.flaggedSnippet}"
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 pl-4">
                      Action: {diag.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Citation Focus Banner */}
      {highlightedCitation && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center space-x-2 truncate">
            <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">Active Citation Focus:</span>
            <span className="truncate">
              {isPresentation ? `Slide ${highlightedCitation.pageNumber}` : `Page ${highlightedCitation.pageNumber}`} — {highlightedCitation.sectionTitle}
            </span>
          </div>

          {onClearHighlight && (
            <button
              onClick={onClearHighlight}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 dark:text-amber-300 underline shrink-0 ml-2"
            >
              Clear Focus
            </button>
          )}
        </div>
      )}

      {/* Main Extracted Flow */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-8 font-serif leading-relaxed">
        {/* Document Header */}
        <div className="pb-6 border-b border-slate-200 dark:border-slate-800 font-sans space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {isPresentation ? 'PowerPoint Lecture Deck' : isScanned ? 'Handwritten Scanned Notes' : 'Academic Research Paper'}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {document.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
            {document.author} • {document.year || '2026'} • {document.wordCount} Words
          </p>
        </div>

        {/* Extracted Sections */}
        {(document.sections || []).map((sec, secIdx) => {
          const isSectionTargeted =
            highlightedCitation?.sectionTitle.includes(sec.title) ||
            highlightedCitation?.pageNumber === sec.pageNumber;

          return (
            <div
              key={sec.id}
              data-section-page={sec.pageNumber || sec.slideNumber || secIdx + 1}
              data-section-title={sec.title}
              className={`space-y-4 p-5 rounded-3xl transition-all ${
                isSectionTargeted
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-400 shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {/* Section Header with Page / Slide Badge */}
              <div className="flex items-center justify-between font-sans pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold font-mono">
                    {secIdx + 1}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {sec.title}
                  </h2>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {isPresentation ? `Slide ${sec.pageNumber}` : `Page ${sec.pageNumber}`}
                </span>
              </div>

              {/* Main Content Paragraphs with Highlight Logic */}
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-3 font-serif leading-7">
                {(sec.content || '').split('\n\n').map((paragraph, pIdx) => {
                  const isQuoteMatched = highlightedCitation && paragraph.includes(highlightedCitation.exactQuote.slice(0, 35));

                  return (
                    <div
                      key={pIdx}
                      ref={isQuoteMatched ? activeHighlightRef : null}
                      className={`relative transition-all rounded-xl p-2 ${
                        isQuoteMatched
                          ? 'highlight-active bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 font-medium shadow-sm'
                          : ''
                      }`}
                    >
                      {paragraph}
                    </div>
                  );
                })}
              </div>

              {/* Speaker Notes (Section 4.1 for PPT/PPTX) */}
              {isPresentation && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 font-sans text-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Presenter Speaker Notes (Slide {sec.pageNumber})</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 italic">
                    "Emphasize the mathematical necessity of majority quorum overlap: any two majorities of N nodes must intersect by at least one server."
                  </p>
                </div>
              )}

              {/* Extracted Tables (Section 4.1) */}
              {sec.tables && sec.tables.length > 0 && (
                <div className="space-y-2 pt-2 font-sans">
                  {sec.tables.map((table, tIdx) => (
                    <div key={tIdx} className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5 text-brand-500" />
                        <span>{table.caption}</span>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              {table.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-2.5 text-slate-700 dark:text-slate-200">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {table.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-2.5 text-slate-600 dark:text-slate-300">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted Equations */}
              {sec.equations && sec.equations.length > 0 && (
                <div className="space-y-2 pt-2 font-sans">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sigma className="w-3.5 h-3.5 text-brand-500" />
                    <span>Recognized Mathematical Formulations</span>
                  </div>

                  {sec.equations.map((eq, eIdx) => (
                    <div
                      key={eIdx}
                      className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-brand-300">
                        <span className="font-bold">{eq.label}</span>
                        <span className="text-[10px] text-slate-400">Validated LaTeX</span>
                      </div>
                      <div className="text-sm text-brand-200 py-1 font-semibold">{eq.latex}</div>
                      <div className="text-[11px] text-slate-400 font-sans italic">{eq.meaning}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Uncertain Handwriting / Blurry Scan Symbols Warning */}
              {sec.uncertainSymbols && sec.uncertainSymbols.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 font-sans text-xs space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>OCR Handwriting Uncertainty Flag:</span>
                  </div>
                  <ul className="list-disc pl-4 text-slate-700 dark:text-slate-300 text-[11px] space-y-0.5">
                    {sec.uncertainSymbols.map((sym, sIdx) => (
                      <li key={sIdx}>{sym}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Boundary Conditions */}
              {sec.conditions && sec.conditions.length > 0 && (
                <div className="space-y-1.5 pt-2 font-sans">
                  {sec.conditions.map((cond, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900 dark:text-amber-300">Mandatory Condition: </span>
                        <span className="text-slate-700 dark:text-slate-300">{cond}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
