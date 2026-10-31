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
  Download,
  Filter,
  CheckSquare,
  Square,
  Search,
  Files,
  Award
} from 'lucide-react';
import { AcademicDocument, MultiDocumentComparisonResult, ConsolidatedTopicItem, SourceCitation } from '../../types';
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
  // Support 2 or more documents simultaneously
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => {
    if (documents.length >= 2) return [documents[0].id, documents[1].id];
    if (documents.length === 1) return [documents[0].id];
    return [];
  });

  const [topicFilter, setTopicFilter] = useState<'all' | 'shared' | string>('all');
  const [topicSearchQuery, setTopicSearchQuery] = useState('');

  const selectedDocs = useMemo(() => {
    return documents.filter(d => selectedDocIds.includes(d.id));
  }, [documents, selectedDocIds]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least 1
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllDocs = () => {
    setSelectedDocIds(documents.map(d => d.id));
  };

  // Run Multi-Document Comparison & Deduplication
  const multiComparison: MultiDocumentComparisonResult = useMemo(() => {
    return DocumentComparisonService.compareMultiDocuments(selectedDocs);
  }, [selectedDocs]);

  // Filtered Deduplicated Topics
  const filteredCatalog = useMemo(() => {
    return multiComparison.deduplicatedTopicCatalog.filter(topic => {
      let matchesFilter = true;
      if (topicFilter === 'shared') {
        matchesFilter = topic.isShared;
      } else if (topicFilter !== 'all') {
        matchesFilter = !topic.isShared && topic.sourceDocuments.some(s => s.docId === topicFilter);
      }

      const matchesSearch = !topicSearchQuery.trim() ||
        topic.canonicalTitle.toLowerCase().includes(topicSearchQuery.toLowerCase()) ||
        topic.mergedSummary.toLowerCase().includes(topicSearchQuery.toLowerCase()) ||
        topic.keyFormulas.some(f => f.toLowerCase().includes(topicSearchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [multiComparison, topicFilter, topicSearchQuery]);

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        Please upload documents to the library to enable Multi-Document Comparison & Deduplicated Syllabus Catalog.
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
              Multi-File Topic Comparison & Deduplication
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {selectedDocs.length} Files Compared
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare 2 or more files simultaneously. Identifies and lists every single topic from all uploaded materials, intelligently merging common topics into a unified curriculum without repetition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectAllDocs}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
          >
            <Files className="w-3.5 h-3.5 text-blue-500" />
            <span>Select All Files ({documents.length})</span>
          </button>
        </div>
      </div>

      {/* Multi-File Selection Ribbon */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Active Files in Comparative Scope (Toggle to compare):</span>
        </label>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDocSelection(doc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[200px]">{doc.title}</span>
                <span className="text-[10px] opacity-75">({doc.pageCount}p)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Executive Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Total Unique Master Topics
          </div>
          <div className="text-2xl font-black font-mono text-blue-900 dark:text-blue-100 mt-1">
            {multiComparison.totalUniqueTopicsCount}
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-300/80 mt-0.5">
            Consolidated syllabus across {selectedDocs.length} files
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Shared Topics (Merged & Non-Repeating)
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-100 mt-1">
            {multiComparison.sharedTopicsCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80 mt-0.5">
            Covered by 2+ files with combined summaries
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            Exclusive Topics (Document-Specific)
          </div>
          <div className="text-2xl font-black font-mono text-purple-900 dark:text-purple-100 mt-1">
            {multiComparison.exclusiveTopicsCount}
          </div>
          <div className="text-[11px] text-purple-600/80 dark:text-purple-300/80 mt-0.5">
            Unique topics found only in one specific material
          </div>
        </div>
      </div>

      {/* SECTION: Deduplicated Master Topic Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Consolidated Master Topic Catalog (Zero Common Topic Repetition)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every topic from all uploaded materials is listed here. Common topics shared across files are unified into single rich entries with multi-source page anchors.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              placeholder="Search consolidated topics..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setTopicFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              topicFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Topics ({multiComparison.totalUniqueTopicsCount})
          </button>
          <button
            onClick={() => setTopicFilter('shared')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              topicFilter === 'shared'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span>Shared Across Files</span>
            <span className="text-[10px] opacity-80 font-mono">({multiComparison.sharedTopicsCount})</span>
          </button>

          {selectedDocs.map(doc => {
            const exclusiveCount = multiComparison.exclusiveTopicsByDocument[doc.id]?.length || 0;
            return (
              <button
                key={doc.id}
                onClick={() => setTopicFilter(doc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  topicFilter === doc.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/60'
                }`}
              >
                <span className="truncate max-w-[140px]">Exclusive: {doc.title}</span>
                <span className="text-[10px] opacity-80 font-mono">({exclusiveCount})</span>
              </button>
            );
          })}
        </div>

        {/* Catalog Items Grid */}
        <div className="grid grid-cols-1 gap-3">
          {filteredCatalog.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No topics found matching your filter or search query.
            </div>
          ) : (
            filteredCatalog.map((topic) => (
              <div
                key={topic.id}
                className={`p-4 rounded-2xl border transition-all ${
                  topic.isShared
                    ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {topic.canonicalTitle}
                    </h4>

                    {topic.isShared ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Shared Across {topic.sourceDocuments.length} Files (Unified)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                        Exclusive to {topic.sourceDocuments[0]?.docTitle || 'Source File'}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {topic.contentType}
                    </span>
                  </div>

                  {/* Source Document Reference Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {topic.sourceDocuments.map((src, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => onNavigateToStudio(src.docId, src.pageNumber)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
                        title={`Open ${src.docTitle} Page ${src.pageNumber}`}
                      >
                        <span className="truncate max-w-[130px]">{src.docTitle}</span>
                        <span>p.{src.pageNumber}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merged Synthesis Summary */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-2.5">
                  {topic.mergedSummary}
                </p>

                {/* Extracted Formulas if present */}
                {topic.keyFormulas.length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase text-brand-600 dark:text-brand-400 shrink-0">
                      Formulation:
                    </span>
                    <span className="truncate">{topic.keyFormulas.join('  •  ')}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cross-Document Matrix */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Curriculum Coverage Matrix Across Files:</span>
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                <th className="p-3 font-bold w-1/3">Canonical Topic</th>
                {selectedDocs.map(d => (
                  <th key={d.id} className="p-3 font-bold text-blue-700 dark:text-blue-300">
                    {d.title}
                  </th>
                ))}
                <th className="p-3 font-bold text-right w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {multiComparison.crossDocumentMatrix.slice(0, 15).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    {row.topic}
                  </td>
                  {selectedDocs.map(d => {
                    const cov = row.coverageByDoc[d.id] || 'absent';
                    return (
                      <td key={d.id} className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          cov === 'comprehensive'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : cov === 'moderate'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`}>
                          {cov}
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      row.status === 'unanimous'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : row.status === 'complementary'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Divergences & Synthesis Recommendations */}
      {multiComparison.divergencesAndGaps.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Curriculum Synthesis & Study Recommendations:</span>
          </h3>
          <div className="space-y-3">
            {multiComparison.divergencesAndGaps.map((div, dIdx) => (
              <div key={dIdx} className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs block">
                  {div.topic}
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  <strong>Integrated Learning Advice: </strong>
                  {div.synthesisRecommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
