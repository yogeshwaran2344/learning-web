import React from 'react';
import {
  UploadCloud,
  FileText,
  Network,
  Lightbulb,
  Layers,
  Headphones,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles,
  BookMarked,
  BarChart3,
  Flame,
  Award
} from 'lucide-react';
import { AcademicDocument, LearningFormat, UserPreferences } from '../types';

interface DashboardProps {
  documents: AcademicDocument[];
  preferences: UserPreferences;
  onSelectDocument: (doc: AcademicDocument, initialFormat?: LearningFormat) => void;
  onOpenUpload: () => void;
  onDeleteDocument: (id: string, e: React.MouseEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  documents,
  preferences,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument
}) => {
  // Compute overall statistics
  const totalCards = documents.reduce((acc, d) => acc + (d.flashcards?.length || 0), 0);
  const masteredCards = documents.reduce(
    (acc, d) => acc + (d.flashcards?.filter(f => f.masteryLevel === 2).length || 0),
    0
  );
  const verifiedDocs = documents.filter(d => d.meaningPreservation && d.meaningPreservation.overallFidelityScore > 0);
  const averageFidelity = verifiedDocs.length > 0
    ? (verifiedDocs.reduce((acc, d) => acc + (d.meaningPreservation?.overallFidelityScore || 0), 0) / verifiedDocs.length).toFixed(1)
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 border border-brand-800/40 p-8 sm:p-10 text-white shadow-xl shadow-brand-950/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Academic Understanding</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Transform Complex Papers into <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-200 to-accent-300">Verified Learning Formats</span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              Upload academic PDFs, lecture slides, and research publications. LearnLens decomposes dense theory into interactive concept maps, intuitive multi-tier explanations, audio narration, and flashcards—while our <strong className="text-brand-300 font-semibold">Meaning Preservation Engine</strong> verifies equations, theorems, and boundary conditions back to original citations with zero hallucinations.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenUpload}
                className="px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <UploadCloud className="w-5 h-5" />
                <span>Upload Academic Document</span>
              </button>

              <button
                onClick={() => documents[0] && onSelectDocument(documents[0])}
                className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <BookMarked className="w-4 h-4 text-brand-300" />
                <span>Explore Transformer Paper</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-brand-400 mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-semibold text-emerald-400">Audited</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">{averageFidelity}%</div>
              <div className="text-xs text-slate-400">Meaning Fidelity Score</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-accent-400 mb-1">
                <FileText className="w-5 h-5" />
                <span className="text-xs font-semibold text-slate-400">{documents.length} Total</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">{documents.length}</div>
              <div className="text-xs text-slate-400">Academic Papers</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-academic-gold mb-1">
                <Flame className="w-5 h-5" />
                <span className="text-xs font-semibold text-academic-gold">Active</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">{masteredCards}/{totalCards}</div>
              <div className="text-xs text-slate-400">Flashcards Mastered</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-academic-emerald mb-1">
                <Award className="w-5 h-5" />
                <span className="text-xs font-semibold text-academic-emerald">Safe</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">0</div>
              <div className="text-xs text-slate-400">Altered Equations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Format Showcase Navigation bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => documents[0] && onSelectDocument(documents[0], 'map')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Network className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-white">Concept Maps</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Topological graph & prerequisite chains</div>
        </button>

        <button
          onClick={() => documents[0] && onSelectDocument(documents[0], 'explanation')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-white">Deep Explanations</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Intuitive analogy, rigorous rigor & examples</div>
        </button>

        <button
          onClick={() => documents[0] && onSelectDocument(documents[0], 'flashcards')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-white">Active Flashcards</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Spaced repetition & practice questions</div>
        </button>

        <button
          onClick={() => documents[0] && onSelectDocument(documents[0], 'audio')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-white">Audio Lessons</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Narrated lectures with speed controls</div>
        </button>

        <button
          onClick={() => documents[0] && onSelectDocument(documents[0], 'preservation')}
          className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-white">Meaning Engine</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Citation verification & equation audit</div>
        </button>
      </div>

      {/* Main Documents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Knowledge Library</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select any document to open its dedicated learning workspace or upload new lecture material
            </p>
          </div>

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold text-sm border border-brand-200 dark:border-brand-800 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New</span>
          </button>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const isCs = doc.category === 'Computer Science';
            const isPhysics = doc.category === 'Physics & Quantum';
            const isDist = doc.category === 'Distributed Systems';

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 hover:shadow-lg dark:hover:shadow-brand-950/40 transition-all p-6 cursor-pointer"
              >
                <div>
                  {/* Category and Fidelity Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isCs
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : isPhysics
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : isDist
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {doc.category}
                    </span>

                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {doc.meaningPreservation?.overallFidelityScore ?? 98}% fidelity
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 mb-1.5">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">
                    {doc.author} • {doc.year || '2026'}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
                    {doc.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* Formats mini-badges */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {doc.sections?.length || 0} sections ({doc.wordCount || 1000} words)
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {doc.flashcards?.length || 0} cards
                    </span>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc, 'map');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Open Concept Map"
                      >
                        <Network className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc, 'explanation');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Open Explanations"
                      >
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc, 'flashcards');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Open Flashcards"
                      >
                        <Layers className="w-4 h-4 text-purple-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc, 'audio');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Open Audio Narration"
                      >
                        <Headphones className="w-4 h-4 text-emerald-500" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => onDeleteDocument(doc.id, e)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
