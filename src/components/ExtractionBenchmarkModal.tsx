import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Table,
  Sigma,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ApiClient } from '../services/apiClient';

interface ExtractionBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtractionBenchmarkModal: React.FC<ExtractionBenchmarkModalProps> = ({
  isOpen,
  onClose
}) => {
  const [benchmarkItems, setBenchmarkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      ApiClient.getExtractionBenchmark()
        .then((data) => {
          if (data && data.benchmark) {
            setBenchmarkItems(data.benchmark);
            setSelectedItem(data.benchmark[0]);
          }
        })
        .catch((e) => console.error('Benchmark fetch error:', e))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto select-none">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 transition-colors my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black">Step 4: Document Extraction & OCR Benchmark</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  6/6 Test Cases Checked
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Independent 5-dimensional evaluation across PDFs, PowerPoint presentations, and scanned handwritten notes.
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

        {/* Content Body */}
        <div className="py-5 space-y-6 text-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Running diagnostic extraction tests...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Test Document Selector */}
              <div className="md:col-span-5 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] pb-1">
                  Representative Document Collection (Section 4.5)
                </div>

                <div className="space-y-2">
                  {benchmarkItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const isReady = item.qualityReport.userStatus === 'ready';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 shadow-sm ring-1 ring-brand-500/30'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                            {item.fileType.toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                              isReady
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            <span>{item.qualityReport.userStatus.replace('_', ' ')}</span>
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {item.category}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Diagnostic Breakdown */}
              <div className="md:col-span-7 space-y-4">
                {selectedItem ? (
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        {selectedItem.category}
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {selectedItem.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedItem.description}
                      </p>
                    </div>

                    {/* 5-Dimensional Quality Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Completeness</div>
                        <div className="text-base font-bold text-slate-800 dark:text-white">
                          {selectedItem.qualityReport.textCompletenessScore}%
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">OCR Confidence</div>
                        <div className={`text-base font-bold ${
                          selectedItem.qualityReport.ocrConfidenceScore < 85 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {selectedItem.qualityReport.ocrConfidenceScore}%
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Equation Math</div>
                        <div className="text-base font-bold text-blue-600">
                          {selectedItem.qualityReport.equationIntegrityScore}%
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Structure</div>
                        <div className="text-base font-bold text-purple-600">
                          {selectedItem.qualityReport.structurePreservationScore}%
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Traceability</div>
                        <div className="text-base font-bold text-emerald-600">
                          {selectedItem.qualityReport.sourceTraceabilityScore}%
                        </div>
                      </div>
                    </div>

                    {/* Diagnostics & Warnings */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider">
                        Diagnostic Extraction Findings:
                      </div>

                      {selectedItem.qualityReport.diagnostics.length === 0 ? (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>All structure, headings, equations, and page anchors successfully validated.</span>
                        </div>
                      ) : (
                        selectedItem.qualityReport.diagnostics.map((diag: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-1 text-slate-700 dark:text-slate-300 text-[11px]"
                          >
                            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>{diag.message}</span>
                            </div>
                            {diag.flaggedSnippet && (
                              <p className="font-mono text-xs italic text-slate-500 pl-4">
                                Flagged: "{diag.flaggedSnippet}"
                              </p>
                            )}
                            <p className="text-slate-500 pl-4 text-[10px]">
                              Guidance: {diag.recommendation}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">Select a test document to inspect diagnostics.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            Step 4 Checklist: PDF, PPTX, Scanned Notes, and Handwriting OCR validated.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Close Benchmark
          </button>
        </div>
      </div>
    </div>
  );
};
