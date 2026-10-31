import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  ArrowRight,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';
import { AcademicDocument, DocumentComparisonResult, SourceCitation } from '../../types';
import { DocumentComparisonService } from '../../services/documentComparisonService';

interface DocumentComparisonPageProps {
  documents: AcademicDocument[];
  onNavigateToStudio: (docId: string, pageNumber?: number) => void;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const DocumentComparisonPage: React.FC<DocumentComparisonPageProps> = ({
  documents,
  onNavigateToStudio,
  onNavigateToCitation
}) => {
  const [docAId, setDocAId] = useState<string>(documents[0]?.id || '');
  const [docBId, setDocBId] = useState<string>(documents[1]?.id || documents[0]?.id || '');

  const docA = useMemo(() => documents.find(d => d.id === docAId) || documents[0], [documents, docAId]);
  const docB = useMemo(() => documents.find(d => d.id === docBId) || documents[1] || documents[0], [documents, docBId]);

  const comparison: DocumentComparisonResult | null = useMemo(() => {
    if (!docA || !docB) return null;
    return DocumentComparisonService.compareDocuments(docA, docB);
  }, [docA, docB]);

  if (!comparison) {
    return (
      <div className="p-8 text-center text-slate-400">
        Please upload at least two documents to enable AI Document Comparison.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <GitCompare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              AI Document Comparison
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Multi-Document Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare two uploaded materials to uncover shared concepts, curriculum gaps, unique formulations, and divergent perspectives with page citations.
          </p>
        </div>
      </div>

      {/* Document Selector Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Document A (Reference Material):</span>
          </label>
          <select
            value={docAId}
            onChange={(e) => setDocAId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500"
          >
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title} ({d.category})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Document B (Comparison Material):</span>
          </label>
          <select
            value={docBId}
            onChange={(e) => setDocBId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title} ({d.category})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Comparison Callout */}
      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
        <span className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[10px] block">
          Executive Comparative Synthesis:
        </span>
        <p>{comparison.summaryComparison}</p>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Dimension Matrix:</span>
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                <th className="p-3 font-bold w-1/4">Evaluation Dimension</th>
                <th className="p-3 font-bold w-3/8 text-blue-700 dark:text-blue-300">{comparison.docA.title}</th>
                <th className="p-3 font-bold w-3/8 text-indigo-700 dark:text-indigo-300">{comparison.docB.title}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.matrixRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{row.concept}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{row.docAValue}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{row.docBValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Concepts */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Shared Concepts & Common Foundations:</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {comparison.sharedConcepts.map((sc, sIdx) => (
            <div key={sIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">{sc.name}</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{sc.description}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onNavigateToCitation(sc.citationA)}
                  className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Doc A p.{sc.citationA.pageNumber}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => onNavigateToCitation(sc.citationB)}
                  className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Doc B p.{sc.citationB.pageNumber}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conflicting / Divergent Points */}
      {comparison.conflictingOrDivergentPoints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Conflicting Explanations & Discrepancy Resolution:</span>
          </h3>
          <div className="space-y-3">
            {comparison.conflictingOrDivergentPoints.map((conf, cIdx) => (
              <div key={cIdx} className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs block">{conf.topic}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40">
                    <strong className="text-blue-600 dark:text-blue-400 block mb-1">{comparison.docA.title} Formulation:</strong>
                    <span className="text-slate-700 dark:text-slate-300">{conf.docAPerspective}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40">
                    <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">{comparison.docB.title} Formulation:</strong>
                    <span className="text-slate-700 dark:text-slate-300">{conf.docBPerspective}</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                  <strong>Academic Resolution:</strong> {conf.resolution}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
