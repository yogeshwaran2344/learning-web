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
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Layers,
  Sparkles,
  EyeOff,
  Menu,
  RotateCw,
  Download,
  Printer,
  MoreVertical,
  Maximize2,
  PenTool,
  Underline as UnderlineIcon,
  Undo2,
  PlusCircle,
  Lightbulb
} from 'lucide-react';
import { AcademicDocument, SourceCitation, ExtractionDiagnosticWarning } from '../../types';
import { StructuredContentRenderer } from './StructuredContentRenderer';
import { NeuronAnatomyDiagram } from './NeuronAnatomyDiagram';

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

  // PDF-style viewing controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('sans');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<'none' | 'note' | 'highlight' | 'underline'>('none');

  const sections = document.sections || [];
  const totalPages = document.pageCount || Math.max(1, sections.length);

  const handlePageStep = (delta: number) => {
    const target = Math.max(1, Math.min(totalPages, currentPage + delta));
    setCurrentPage(target);
    const targetEl = containerRef.current?.querySelector(`[data-section-page="${target}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRotate = () => {
    setRotationDegrees(prev => (prev + 90) % 360);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const textBlob = new Blob(
      [
        `LEARNOVA ACADEMIC EXPORT: ${document.title}\nAuthor: ${document.author}\nPages: ${document.pageCount}\n\n` +
        sections.map(s => `[Page ${s.pageNumber}] ${s.title}\n${s.content}\n`).join('\n')
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(textBlob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '_')}_Source.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    if (highlightedCitation) {
      if (highlightedCitation.pageNumber) {
        setCurrentPage(highlightedCitation.pageNumber);
      }
      setTimeout(() => {
        if (activeHighlightRef.current) {
          activeHighlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const targetEl = containerRef.current?.querySelector(`[data-section-page="${highlightedCitation.pageNumber}"]`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 50);
    }
  }, [highlightedCitation]);

  const isPresentation = document.fileType === 'pptx';
  const isScanned = document.fileType === 'scanned_notes';
  const isNeurology = document.id === 'doc-intro-neurology' || document.title.toLowerCase().includes('neuro');
  const extractionStatus = document.extractionStatus || (document.processingStatus === 'warning' ? 'needs_review' : 'ready');
  const quality = document.extractionQuality;

  return (
    <div
      onMouseUp={handleMouseUp}
      className="h-full flex flex-col bg-[#0b1120] text-slate-100 transition-colors select-text relative overflow-hidden"
    >
      {/* Floating Explain This Tooltip */}
      {selectionPosition && (
        <button
          onClick={() => {
            if (onExplainSelection) onExplainSelection(selectedText, undefined, selectedPageNumber, selectedSectionTitle);
            setSelectionPosition(null);
          }}
          className="fixed z-50 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl text-xs font-semibold flex items-center space-x-1.5 -translate-x-1/2 -translate-y-full transition-all cursor-pointer border border-white/20 active:scale-95 animate-fadeIn"
          style={{ left: selectionPosition.x, top: selectionPosition.y }}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
          <span>Explain This</span>
        </button>
      )}

      {/* PDF Viewer Dark Header Bar (matching Learning Cortex screenshot) */}
      <div className="px-4 py-2.5 bg-[#090d16] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 select-none z-20">
        {/* Left: Sidebar Menu + Doc Title + Page Stepper */}
        <div className="flex items-center space-x-3 truncate">
          <button
            onClick={() => setShowDiagnostics(v => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Toggle Document Outline & Quality Diagnostics"
          >
            <Menu className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]" title={document.title}>
            {document.title.length > 18 ? document.title.slice(0, 15) + '...' : document.title}
          </span>

          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
            <button
              onClick={() => handlePageStep(-1)}
              disabled={currentPage <= 1}
              className="p-0.5 hover:text-white disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1.5 text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageStep(1)}
              disabled={currentPage >= totalPages}
              className="p-0.5 hover:text-white disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center & Right: Zoom & Tool Icons */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
            <button
              onClick={() => setZoomLevel(z => Math.max(70, z - 10))}
              className="p-1 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1.5 min-w-[40px] text-center text-slate-200">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(150, z + 10))}
              className="p-1 hover:text-white transition-colors"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit Page */}
          <button
            onClick={() => setZoomLevel(100)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reset Zoom (Fit Page)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Rotate Page"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadPdf}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Download Document"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors hidden sm:block"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* More options */}
          <button
            onClick={() => setShowDiagnostics(v => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Quality Diagnostics Dropdown */}
      {showDiagnostics && (
        <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 text-xs select-none animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Extraction Fidelity & OCR Diagnostic Breakdown</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              {extractionStatus.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Completeness</div>
              <div className="text-base font-bold text-white">{quality ? quality.textCompletenessScore : 100}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">OCR Confidence</div>
              <div className="text-base font-bold text-emerald-400">{quality ? quality.ocrConfidenceScore : 100}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Math Formula</div>
              <div className="text-base font-bold text-blue-400">{quality ? quality.equationIntegrityScore : 100}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Structure</div>
              <div className="text-base font-bold text-purple-400">{quality ? quality.structurePreservationScore : 100}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Traceability</div>
              <div className="text-base font-bold text-emerald-400">{quality ? quality.sourceTraceabilityScore : 100}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Active Citation Focus Banner */}
      {highlightedCitation && (
        <div className="px-4 py-2 bg-amber-950/80 border-b border-amber-800 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2 truncate">
            <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold">Active Citation Focus:</span>
            <span className="truncate">
              Page {highlightedCitation.pageNumber} — {highlightedCitation.sectionTitle}
            </span>
          </div>
          {onClearHighlight && (
            <button
              onClick={onClearHighlight}
              className="text-xs font-bold text-amber-300 hover:text-white underline shrink-0 ml-2 cursor-pointer"
            >
              Clear Focus
            </button>
          )}
        </div>
      )}

      {/* Workspace Body: Left Annotation Sidebar + Main Centered Document Page Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Vertical Annotation Toolbar (matching Learning Cortex screenshot) */}
        <div className="w-11 sm:w-12 bg-[#090d16] border-r border-slate-800 flex flex-col items-center py-4 space-y-4 shrink-0 select-none">
          <button
            onClick={() => setActiveAnnotationTool(t => t === 'note' ? 'none' : 'note')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeAnnotationTool === 'note'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Add Note Annotation (+)"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveAnnotationTool(t => t === 'highlight' ? 'none' : 'highlight')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeAnnotationTool === 'highlight'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Highlight Tool (✎)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveAnnotationTool(t => t === 'underline' ? 'none' : 'underline')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeAnnotationTool === 'underline'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Underline Tool (U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveAnnotationTool('none')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer"
            title="Undo Annotation (↶)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Main Document Viewer Canvas (Center stage with paper page styling) */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#090d16] flex justify-center"
        >
          <div
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotationDegrees}deg)`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="w-full max-w-4xl bg-white text-slate-900 rounded-sm shadow-2xl p-6 sm:p-10 md:p-12 min-h-[920px] select-text font-sans relative"
          >
            {/* Textbook Page Header (if Neurology or Fundamentals) */}
            {isNeurology ? (
              <div className="space-y-6">
                {/* Header Bar: Page 1 number & 1 Fundamentals pink badge */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-400">1</span>
                      <span className="text-lg font-black text-pink-600 tracking-tight">
                        Fundamentals
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-sans space-y-0.5 pt-1 pl-5">
                      <div>Microscopic Anatomy of the Nervous system ... 1</div>
                      <div>Elements of Neurophysiology ... 4</div>
                      <div>Elements of Neurogenetics ... 5</div>
                    </div>
                  </div>

                  {/* Pink Chapter Tag */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-700">1</span>
                    <div className="w-7 h-10 bg-pink-600 text-white font-bold flex flex-col items-center justify-center text-xs shadow-sm">
                      <span>1</span>
                    </div>
                  </div>
                </div>

                {/* Section Title */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-pink-600 font-bold text-base">
                    <span className="w-3.5 h-1 bg-pink-600 rounded-full inline-block" />
                    <h2>Microscopic Anatomy of the Nervous System</h2>
                  </div>

                  {/* Pink Outlined Quote Box */}
                  <div className="p-4 rounded-xl border-2 border-pink-400 bg-pink-50/60 text-slate-900 text-xs sm:text-sm font-semibold leading-relaxed shadow-2xs">
                    Neurons are the structural and functional building blocks of the nervous system. This type of cell is specialized for the reception, integration, and transmission of electrical impulses.
                  </div>

                  {/* Two-Column Textbook Layout matching screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm leading-relaxed text-slate-800 text-justify">
                    <div>
                      <p>
                        <strong className="font-bold text-slate-900">Neurons.</strong> The cell body (soma) of the neuron is enclosed by the cell membrane and contains the cell nucleus, mitochondria, endoplasmic reticulum, neurotubules, and neurofilaments (Fig. 1.1). Dendrites are short, more or less extensively branched, cellular processes that conduct afferent impulses toward the cell body. They provide the cell with a much larger surface area than the cell body alone, thereby increasing the area available for intercellular contact and for the deployment of cell
                      </p>
                    </div>

                    <div>
                      <p>
                        membrane receptors. Different types of neurons have different characteristic morphological types of dendrites; those of the cerebellar Purkinje cells, for example, resemble a deer's antlers (Fig. 1.2). The axon is a single cell process, usually longer than a dendrite, which emerges from the cell body at the axon hillock. It conducts efferent impulses away from the cell body to another neuron or an effector organ.
                      </p>
                      <p className="mt-2">
                        Generally speaking, every neuron has a soma, an axon, and one or more dendrites. The structure and configuration of the nerve cell processes (especially the dendrites) vary depending on the function of the neuron. Thus, neurons can be classified into a number of morphological subtypes (Fig. 1.3).
                      </p>
                    </div>
                  </div>

                  {/* Fig. 1.1 Fine Structure of a Neuron Vector Diagram */}
                  <div className="pt-2">
                    <NeuronAnatomyDiagram />
                  </div>
                </div>

                {/* Additional Pages / Sections for Neurology */}
                {sections.slice(1).map((sec, secIdx) => (
                  <div
                    key={sec.id}
                    data-section-page={sec.pageNumber || secIdx + 2}
                    data-section-title={sec.title}
                    className="mt-8 pt-8 border-t-2 border-slate-200 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold font-mono">
                          {secIdx + 2}
                        </span>
                        <h2 className="text-base font-bold text-slate-900">
                          {sec.title}
                        </h2>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Page {sec.pageNumber || secIdx + 2}
                      </span>
                    </div>

                    <StructuredContentRenderer
                      content={sec.content || ''}
                      tables={sec.tables}
                      equations={sec.equations}
                      conditions={sec.conditions}
                      isQuoteMatched={Boolean(highlightedCitation && (sec.content || '').includes(highlightedCitation.exactQuote.slice(0, 35)))}
                      highlightRef={activeHighlightRef}
                      pageNumber={sec.pageNumber || secIdx + 2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Standard Academic Document Rendering (e.g. OS Scheduling, Transformer Attention, Raft) */
              <div className="space-y-8 font-sans">
                {/* Header */}
                <div className="pb-6 border-b border-slate-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {isPresentation ? 'PowerPoint Lecture Deck' : isScanned ? 'Handwritten Scanned Notes' : 'Academic Research Paper'}
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 leading-tight">
                    {document.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    {document.author} • {document.year || '2026'} • {document.wordCount} Words • {document.pageCount} Pages
                  </p>
                </div>

                {/* Sections with Structured Tables & Calculations */}
                {sections.map((sec, secIdx) => {
                  const isSectionTargeted =
                    highlightedCitation?.sectionTitle.includes(sec.title) ||
                    highlightedCitation?.pageNumber === sec.pageNumber;

                  return (
                    <div
                      key={sec.id}
                      data-section-page={sec.pageNumber || sec.slideNumber || secIdx + 1}
                      data-section-title={sec.title}
                      className={`space-y-4 p-5 sm:p-6 rounded-2xl transition-all ${
                        isSectionTargeted
                          ? 'bg-amber-50/70 border-2 border-amber-400 shadow-md'
                          : 'bg-white border border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold font-mono">
                            {secIdx + 1}
                          </span>
                          <h2 className="text-base font-bold text-slate-900">
                            {sec.title}
                          </h2>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {isPresentation ? `Slide ${sec.pageNumber}` : `Page ${sec.pageNumber}`}
                        </span>
                      </div>

                      <StructuredContentRenderer
                        content={sec.content || ''}
                        tables={sec.tables}
                        equations={sec.equations}
                        conditions={sec.conditions}
                        isQuoteMatched={Boolean(highlightedCitation && (sec.content || '').includes(highlightedCitation.exactQuote.slice(0, 35)))}
                        highlightRef={activeHighlightRef}
                        pageNumber={sec.pageNumber || sec.slideNumber || secIdx + 1}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
