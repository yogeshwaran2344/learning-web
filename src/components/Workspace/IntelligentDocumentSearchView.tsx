import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  ExternalLink,
  BookOpen,
  Filter,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AcademicDocument, SemanticSearchResult, SourceCitation } from '../../types';
import { SemanticSearchService } from '../../services/semanticSearchService';

interface IntelligentDocumentSearchViewProps {
  document: AcademicDocument;
  allDocuments: AcademicDocument[];
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const IntelligentDocumentSearchView: React.FC<IntelligentDocumentSearchViewProps> = ({
  document,
  allDocuments,
  onNavigateToCitation
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('how memory is allocated');
  const [scope, setScope] = useState<'current' | 'all'>('current');

  const targetDocs = useMemo(() => {
    return scope === 'current' ? [document] : allDocuments;
  }, [scope, document, allDocuments]);

  const searchResults: SemanticSearchResult[] = useMemo(() => {
    return SemanticSearchService.search(targetDocs, searchQuery);
  }, [targetDocs, searchQuery]);

  const sampleSearches = [
    'how memory is allocated',
    'why is boundary condition checked',
    'derivation of governing formula',
    'state transition failure and recovery',
    'difference between concepts'
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Search className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Intelligent Semantic Document Search
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Meaning-Based Retrieval
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search by meaning, not just exact keywords. Finds conceptual relationships even when different terminology is used in the text.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start lg:self-auto">
          <button
            onClick={() => setScope('current')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              scope === 'current'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Current Document
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              scope === 'all'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Library Docs ({allDocuments.length})
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type your question or concept (e.g. 'how memory is allocated', 'invariant conditions')..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Suggested Quick Queries */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <span>Try searching:</span>
          </span>
          {sampleSearches.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setSearchQuery(s)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
            >
              "{s}"
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>Found {searchResults.length} semantic matches for "{searchQuery}"</span>
        <span>Ranked by conceptual relevance</span>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {searchResults.length === 0 ? (
          <div className="p-8 text-center text-slate-400 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            No semantic matches found for this query. Try a broader concept phrase or switch scope to "All Library Docs".
          </div>
        ) : (
          searchResults.map((res) => (
            <div
              key={res.id}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 transition-all hover:border-blue-400 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                    Page {res.pageNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {res.documentTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {res.relevanceScore}% Relevance
                  </span>
                  <button
                    onClick={() => onNavigateToCitation(res.citation)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-500 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View Page {res.pageNumber}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {res.sectionTitle}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {res.matchedText}
                </p>
              </div>

              {/* Relevance Rationale & Matched Concepts */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-slate-500 dark:text-slate-400 italic">
                  <strong>Rationale:</strong> {res.relevanceReason}
                </div>
                <div className="flex items-center gap-1">
                  {res.matchedConcepts.map((c, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono text-[10px]">
                      #{c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
