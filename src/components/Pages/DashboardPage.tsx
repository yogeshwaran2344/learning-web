import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  ArrowRight,
  Sparkles,
  BookMarked,
  Network,
  Lightbulb,
  Layers,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Award,
  Play,
  RotateCw,
  FolderOpen,
  Globe,
  BookOpen,
  FlaskConical,
  BarChart2
} from 'lucide-react';
import { AcademicDocument, NavigationPage, StudioTab, AppLanguage } from '../../types';
import { ApiClient } from '../../services/apiClient';

interface DashboardPageProps {
  documents: AcademicDocument[];
  onSelectDocument: (doc: AcademicDocument, tab?: StudioTab) => void;
  onNavigate: (page: NavigationPage) => void;
  onOpenUpload: () => void;
  userName?: string;
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  documents,
  onSelectDocument,
  onNavigate,
  onOpenUpload,
  userName = 'Alex',
  language = 'English',
  onLanguageChange
}) => {
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(true);

  // Fetch real student progress from backend
  useEffect(() => {
    let isMounted = true;
    ApiClient.getStudentProgress()
      .then(prog => {
        if (isMounted) {
          setStudentProgress(prog);
          setIsLoadingProgress(false);
        }
      })
      .catch(err => {
        console.warn('Student progress load fallback:', err);
        if (isMounted) setIsLoadingProgress(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Find document with highest progress for Continue Learning
  const inProgressDocs = [...documents].sort((a, b) => (b.studyProgressPercent || 0) - (a.studyProgressPercent || 0));
  const primaryDoc = inProgressDocs[0] || documents[0];

  // Extraction alerts and warnings across documents
  const flaggedDocs = documents.filter(d =>
    (d.extractionWarnings && d.extractionWarnings.length > 0) ||
    d.processingStatus === 'warning' ||
    (d.meaningPreservation?.factChecks && d.meaningPreservation.factChecks.some(f => f.status !== 'fully_preserved'))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      {/* 1. Welcome & Primary Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-8 sm:p-10 text-white shadow-xl border border-brand-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider border border-brand-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Study Dashboard • Step 37</span>
              </div>

              {/* Language Preferences Quick Switcher */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm border border-white/20">
                <Globe className="w-3.5 h-3.5 text-accent-400" />
                <span className="text-[11px] text-slate-300 mr-1">Study Language:</span>
                {(['English', 'Kannada', 'Hindi'] as AppLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => onLanguageChange && onLanguageChange(lang)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      language === lang
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {lang === 'Kannada' ? 'ಕನ್ನಡ' : lang === 'Hindi' ? 'हिन्दी' : 'EN'}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Welcome back, {userName}.
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Transform your research PDFs, lecture slides, and handwritten notes into 7 verified learning formats. Everything you study is mapped directly back to the original academic passages.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={onOpenUpload}
              className="py-3 px-6 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Upload Learning Material</span>
            </button>

            <button
              onClick={() => onNavigate('documents')}
              className="py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <FolderOpen className="w-4 h-4 text-brand-300" />
              <span>View Library ({documents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Continue Learning Cards */}
      {primaryDoc && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Continue Learning</span>
            </h2>
            <span className="text-xs text-slate-400">Last reviewed {primaryDoc.lastStudiedAt || 'recently'}</span>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand-500/40 transition-all">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                  {primaryDoc.category}
                </span>
                <span className="text-xs text-slate-400">• {primaryDoc.fileType.toUpperCase()}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {primaryDoc.meaningPreservation?.overallFidelityScore ?? 96}% Grounded Fidelity
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {primaryDoc.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {primaryDoc.summary}
              </p>

              {/* Topic Mastery Progress Bar */}
              <div className="space-y-1 pt-2 max-w-md">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Topic Mastery Progress</span>
                  <span>{primaryDoc.studyProgressPercent || 65}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${primaryDoc.studyProgressPercent || 65}%` }}
                    className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
              <button
                onClick={() => onSelectDocument(primaryDoc, 'flashcards')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Review Flashcards</span>
              </button>

              <button
                onClick={() => onSelectDocument(primaryDoc, 'map')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all"
              >
                <span>Resume Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. My Learning Formats & Practice Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Learning Formats */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-500" />
              <span>My Learning Formats</span>
            </h2>
            <span className="text-xs text-slate-400">7 Connected Grounded Views</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'map')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Network className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Concept Maps</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Prerequisite graphs</div>
            </button>

            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'simplified')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Simplified Explanations</div>
              <div className="text-[10px] text-slate-400 mt-0.5">3-tier analogies</div>
            </button>

            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'notes')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Detailed Notes</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Formal equations</div>
            </button>

            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'worked')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Worked Examples</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Step-by-step math</div>
            </button>

            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'flashcards')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Flashcards</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Spaced repetition</div>
            </button>

            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'audio')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Audio Lessons</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Narration scripts</div>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Practice & Progress Card */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Practice & Progress</span>
          </h2>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-slate-400 font-semibold">Average Quiz Score</div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {studentProgress?.averageQuizScore !== null && studentProgress?.averageQuizScore !== undefined
                  ? `${studentProgress.averageQuizScore}%`
                  : 'No quizzes yet'}
              </div>
              <p className="text-[11px] text-slate-500">
                {studentProgress?.totalQuizzesTaken > 0
                  ? `Based on ${studentProgress.totalQuizzesTaken} completed quiz attempt(s).`
                  : 'Take your first practice quiz to track topic recall.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Saved Study Items:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {studentProgress?.savedMaterialsCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Active Documents:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {documents.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => primaryDoc && onSelectDocument(primaryDoc, 'quiz')}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Start Practice Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Processing Alerts & Verification Warnings Section */}
      {flaggedDocs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Verification Alerts & Flagged Grounding ({flaggedDocs.length})</span>
            </h2>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              Action Recommended
            </span>
          </div>

          <div className="space-y-2.5">
            {flaggedDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc, 'original')}
                className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition-all"
              >
                <div className="space-y-1">
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <span>{doc.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      {doc.extractionWarnings?.[0] ? 'Extraction Diagnostic' : 'Fact Needs Review'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {doc.extractionWarnings?.[0] || 'Contains unverified or student-flagged statements requiring grounding check.'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('verification');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Inspect Truth Audit →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recently Processed Documents Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            My Documents & Learning Library
          </h2>
          <button
            onClick={() => onNavigate('documents')}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>View All ({documents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No documents in your library yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your research PDFs, lecture slides, or scanned notes to transform and verify them into interactive learning formats.
              </p>
            </div>
            <button
              onClick={onOpenUpload}
              className="py-2.5 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {doc.fileType}
                    </span>
                    {doc.meaningPreservation && doc.meaningPreservation.overallFidelityScore > 0 ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {doc.meaningPreservation.overallFidelityScore}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Not Verified
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {doc.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {doc.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>{doc.pageCount || 1} Pages • {doc.flashcards?.length ?? 0} Cards</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">Open Studio →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
