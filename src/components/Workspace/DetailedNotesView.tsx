import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Sliders,
  RotateCcw,
  Edit3,
  Save,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sigma,
  Table as TableIcon,
  Tag,
  Check,
  Printer,
  ChevronRight,
  Eye,
  Sparkles,
  Info
} from 'lucide-react';
import {
  AcademicDocument,
  SourceCitation,
  DetailedNotesSuite,
  TopicNoteSection,
  AcademicContentType
} from '../../types';
import { DetailedNotesService } from '../../services/detailedNotesService';

interface DetailedNotesViewProps {
  document: AcademicDocument;
  initialTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
  onSaveNotes?: (updatedSuite: DetailedNotesSuite) => void;
}

export const DetailedNotesView: React.FC<DetailedNotesViewProps> = ({
  document,
  initialTopicId,
  onNavigateToCitation,
  onSaveNotes
}) => {
  const [mode, setMode] = useState<'short' | 'detailed'>('detailed');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || 'all');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
    }
  }, [initialTopicId]);

  // Generate or retrieve notes suite
  const initialSuite = useMemo(() => {
    return DetailedNotesService.generateDetailedNotesSuite(document, mode);
  }, [document, mode]);

  const [notesSuite, setNotesSuite] = useState<DetailedNotesSuite>(initialSuite);

  // Re-generate if document or mode changes
  useEffect(() => {
    setNotesSuite(DetailedNotesService.generateDetailedNotesSuite(document, mode));
  }, [document, mode]);

  // Available topics for filtering
  const availableTopics = useMemo(() => {
    return notesSuite.sections.map(s => ({
      id: s.id,
      topicId: s.topicId,
      title: s.topicTitle,
      pageOrSlide: s.pageOrSlide,
      contentType: s.contentType
    }));
  }, [notesSuite]);

  // Filtered sections based on topic selector
  const visibleSections = useMemo(() => {
    if (selectedTopicId === 'all') {
      return notesSuite.sections;
    }
    return notesSuite.sections.filter(s => s.id === selectedTopicId || s.topicId === selectedTopicId);
  }, [notesSuite, selectedTopicId]);

  // Handlers
  const handleStartEdit = (section: TopicNoteSection) => {
    setEditingSectionId(section.id);
    setEditText(section.detailedExplanation);
  };

  const handleSaveEdit = (sectionId: string) => {
    const updatedSections = notesSuite.sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          detailedExplanation: editText,
          isUserEdited: true
        };
      }
      return s;
    });

    const updatedSuite: DetailedNotesSuite = {
      ...notesSuite,
      sections: updatedSections
    };

    setNotesSuite(updatedSuite);
    setEditingSectionId(null);
    if (onSaveNotes) {
      onSaveNotes(updatedSuite);
    }
    setSaveSuccessNotice('Changes saved successfully to your learning workspace.');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleRegenerateSection = (sectionId: string) => {
    const freshSection = DetailedNotesService.regenerateSection(document, sectionId, mode);
    if (!freshSection) return;

    const updatedSections = notesSuite.sections.map(s => {
      if (s.id === sectionId) {
        return { ...freshSection, id: s.id };
      }
      return s;
    });

    const updatedSuite: DetailedNotesSuite = {
      ...notesSuite,
      sections: updatedSections
    };

    setNotesSuite(updatedSuite);
    setSaveSuccessNotice(`Section regenerated with verified source grounding.`);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleDownloadMarkdown = () => {
    const md = DetailedNotesService.exportNotesToMarkdown(notesSuite);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '_')}_Detailed_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintOrPdf = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Top Header: Title, Controls, Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              AI-Generated Detailed Notes & Revision
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded topic-wise academic notes, definitions, formulas, tables, and exam checkpoints with source citations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher: Short vs Detailed */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setMode('short')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'short'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Concise bullet points & exam cheat sheet"
            >
              Short Notes
            </button>
            <button
              onClick={() => setMode('detailed')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'detailed'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Comprehensive explanations & step-by-step breakdown"
            >
              Detailed Notes
            </button>
          </div>

          {/* Export to Markdown */}
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Download notes as formatted Markdown file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .md</span>
          </button>

          {/* Export / Print PDF */}
          <button
            onClick={handlePrintOrPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            title="Print or export notes as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Topic Filter Bar */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5" />
          <span>Select Topic to Study:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedTopicId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedTopicId === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Topics ({notesSuite.sections.length})
          </button>
          {availableTopics.map(top => (
            <button
              key={top.id}
              onClick={() => setSelectedTopicId(top.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedTopicId === top.id
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {top.title}
            </button>
          ))}
        </div>
      </div>

      {/* Distinction Banner: Source vs AI */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            <strong>Meaning Preservation Active:</strong> Definitions and formulas are directly cited from your original upload without alteration.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase">
            ✓ Verified Source Ground Truth
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold text-[10px] uppercase">
            ✦ AI Pedagogical Structure
          </span>
        </div>
      </div>

      {/* Topic-Wise Sections List */}
      <div className="space-y-6">
        {visibleSections.map((sec, idx) => {
          const isEditing = editingSectionId === sec.id;

          return (
            <div
              key={sec.id}
              className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-5 transition-all shadow-sm"
            >
              {/* Section Header: Title, Content Type, Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {sec.pageOrSlide}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {sec.contentType.replace('_', ' ')}
                    </span>
                    {sec.isUserEdited && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Edited by Student
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white pt-1">
                    {sec.topicTitle}
                  </h3>
                </div>

                {/* Section Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToCitation(sec.sourceCitation)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Jump to original source page/slide"
                  >
                    <span>View Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRegenerateSection(sec.id)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Regenerate this section"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(sec)}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-500 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit note content"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(sec.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                      title="Save note edits"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Uncertainty Warning (e.g. Scanned Notes) */}
              {sec.isFlaggedUncertain && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Scanned / Optical Note Notice:</strong> {sec.uncertaintyReason}
                  </span>
                </div>
              )}

              {/* 1. Topic Introduction */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Topic Introduction:
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {sec.introduction}
                </p>
              </div>

              {/* 2. Definitions Box */}
              {sec.definitions && sec.definitions.length > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Important Definitions & Invariants:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {sec.definitions.map((def, defIdx) => (
                      <div key={defIdx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-1">
                        <span className="font-bold text-slate-900 dark:text-white block">{def.term}</span>
                        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{def.definition}</p>
                        {def.conditions && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block pt-0.5">
                            Condition: {def.conditions}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Detailed Explanation / Short Summary (Editable) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {mode === 'short' ? 'Concise Revision Summary:' : 'Detailed Academic Breakdown:'}
                  </span>
                  {isEditing && (
                    <span className="text-[10px] text-indigo-600 font-semibold">Editing active...</span>
                  )}
                </div>

                {!isEditing ? (
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line space-y-2">
                    {sec.detailedExplanation}
                  </div>
                ) : (
                  <textarea
                    rows={8}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                )}
              </div>

              {/* 4. Formulas and Equations (Preserved with derivations) */}
              {sec.equations && sec.equations.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Sigma className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Governing Formulas & Derivations (Zero Alteration):</span>
                  </div>
                  <div className="space-y-2 pt-1">
                    {sec.equations.map((eq, eqIdx) => (
                      <div key={eqIdx} className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono space-y-1">
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 overflow-x-auto pb-1">
                          $${eq.latex}$$
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-sans">
                          <strong>{eq.label}:</strong> {eq.meaning}
                        </p>
                        {eq.derivation && (
                          <div className="text-[11px] text-slate-500 font-sans border-t border-slate-100 dark:border-slate-800/80 pt-1">
                            Derivation: {eq.derivation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Diagrams and Component Working */}
              {sec.diagrams && sec.diagrams.length > 0 && (
                <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 space-y-2 text-xs">
                  <div className="font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider text-[10px]">
                    Diagram Schematic & Component Working:
                  </div>
                  {sec.diagrams.map((diag, dIdx) => (
                    <div key={dIdx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 space-y-2">
                      <span className="font-bold text-slate-900 dark:text-white block">{diag.title}</span>
                      <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                        {diag.asciiOrSvg}
                      </pre>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{diag.working}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {diag.components.map((comp, cIdx) => (
                          <span key={cIdx} className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. Tables and Comparisons */}
              {sec.tables && sec.tables.length > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs overflow-x-auto">
                  {sec.tables.map((t, tIdx) => (
                    <div key={tIdx} className="space-y-2">
                      <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{t.caption}</span>
                      </div>
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            {t.headers.map((h, hIdx) => (
                              <th key={hIdx} className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows.map((r, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              {r.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 text-slate-700 dark:text-slate-300">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {t.comparisonSummary && (
                        <p className="text-[11px] text-slate-500 italic pt-1">{t.comparisonSummary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 7. Conditions & Exceptions */}
              {sec.conditionsAndExceptions && sec.conditionsAndExceptions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] block">
                    Important Conditions & Exceptions:
                  </span>
                  <ul className="space-y-1 list-disc list-inside">
                    {sec.conditionsAndExceptions.map((cond, cIdx) => (
                      <li key={cIdx}>{cond}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 8. Exam Revision Checkpoint */}
              {sec.examRevisionPoints && sec.examRevisionPoints.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5 text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Key Points for Examination Revision:</span>
                  </span>
                  <div className="space-y-1 pt-0.5">
                    {sec.examRevisionPoints.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
