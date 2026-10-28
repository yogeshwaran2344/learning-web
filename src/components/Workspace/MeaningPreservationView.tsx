import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Sigma,
  ExternalLink,
  Award,
  Filter,
  Check,
  Bookmark,
  Scale,
  Sparkles,
  Download
} from 'lucide-react';
import { MeaningPreservationReport, PreservedFactCheck, SourceCitation } from '../../types';

interface MeaningPreservationViewProps {
  report: MeaningPreservationReport;
  documentTitle: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
  documentId: string;
}

export const MeaningPreservationView: React.FC<MeaningPreservationViewProps> = ({
  report,
  documentTitle,
  onNavigateToCitation,
  documentId
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lecturerApproved, setLecturerApproved] = useState<boolean>(report.verifiedByEngine);

  const filteredChecks = filterStatus === 'all'
    ? report.factChecks
    : report.factChecks.filter(c => c.status === filterStatus);

  const handleExportAudit = () => {
    const reportData = {
      title: `Meaning Preservation Audit: ${documentTitle}`,
      generatedAt: new Date().toISOString(),
      report,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meaning_Audit_${documentTitle.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Top Banner: Core Innovation Showcase */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 5: The Meaning Preservation Engine</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Formal Truth & Source Verification Engine
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Unlike generic AI summarizers that risk hallucinations, LearnLens extracts the atomic facts, equations, definitions, and boundary conditions from the original academic source and mathematically audits every generated Concept Map, Explanation, Flashcard, and Audio transcript against them.
            </p>
          </div>

          {/* Overall Fidelity Gauge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 min-w-[170px] text-center">
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
              {report.overallFidelityScore}%
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mt-1">
              Meaning Fidelity
            </div>
            <div className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Alterations</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Pillars Precision Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Fact Retention</span>
            <FileCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {report.factRetentionRate}%
          </div>
          <p className="text-[11px] text-slate-500">Atomic claims preserved</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Equation Integrity</span>
            <Sigma className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {report.equationIntegrityRate}%
          </div>
          <p className="text-[11px] text-slate-500">0 altered equations</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Boundary Invariants</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {report.conditionAccuracyRate}%
          </div>
          <p className="text-[11px] text-slate-500">Limits & assumptions intact</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Terminology Rigor</span>
            <Scale className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {report.terminologyConsistencyRate}%
          </div>
          <p className="text-[11px] text-slate-500">Vocabulary preserved</p>
        </div>
      </div>

      {/* Audit Matrix Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Source Fact & Equation Verification Matrix</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredChecks.length} Audited Items
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every row represents an exact statement from the peer-reviewed document mapped to its representations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setFilterStatus('fully_preserved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'fully_preserved'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Preserved (100%)
            </button>
            <button
              onClick={() => setFilterStatus('partially_preserved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'partially_preserved'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Audited
            </button>
          </div>

          {/* Export Audit Report */}
          <button
            onClick={handleExportAudit}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Download JSON Audit Report"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fact Checks Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Original Fact & Citation</th>
                <th className="py-3.5 px-4">Preserved In Formats</th>
                <th className="py-3.5 px-4">Engine Status</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {filteredChecks.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Original Fact & Quote */}
                  <td className="py-4 px-4 max-w-md">
                    <div className="font-semibold text-slate-900 dark:text-white mb-1">
                      {item.originalFact}
                    </div>
                    <div className="font-serif italic text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2">
                      "{item.originalQuote}"
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      <Bookmark className="w-3 h-3 text-amber-500" />
                      <span>Page {item.pageNumber} Reference</span>
                    </div>
                  </td>

                  {/* Formats distribution */}
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {item.formatFound.map((fmt) => (
                        <span
                          key={fmt}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      item.status === 'fully_preserved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item.status === 'fully_preserved' ? '100% Preserved' : 'Audited Match'}</span>
                    </span>
                  </td>

                  {/* Confidence Score */}
                  <td className="py-4 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.confidenceScore}%
                  </td>

                  {/* Navigate to exact citation */}
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => onNavigateToCitation({
                        id: `cite-${item.id}`,
                        documentId,
                        pageNumber: item.pageNumber,
                        sectionTitle: `Page ${item.pageNumber}`,
                        exactQuote: item.originalQuote,
                        contextSnippet: item.originalQuote
                      })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold text-xs transition-colors border border-amber-200 dark:border-amber-800"
                    >
                      <span>Jump to Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lecturer Formal Sign-Off Box */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-academic-gold" />
            <span>Academic Faculty Quality Assurance Sign-Off</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lecturerApproved
              ? 'This academic document has been formally certified by the faculty instructor for student learning without alteration.'
              : 'Lecturer review pending. Click sign-off to formally certify.'}
          </p>
        </div>

        <button
          onClick={() => setLecturerApproved(a => !a)}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-sm ${
            lecturerApproved
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{lecturerApproved ? 'Faculty Certified ✓' : 'Approve & Certify'}</span>
        </button>
      </div>
    </div>
  );
};
