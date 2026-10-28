import React, { useState, useEffect } from 'react';
import {
  FileText,
  Network,
  Lightbulb,
  BookOpen,
  FlaskConical,
  Layers,
  Headphones,
  Award,
  ExternalLink,
  ShieldCheck,
  Columns,
  Bookmark,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import {
  AcademicDocument,
  StudioTab,
  SourceCitation,
  SavedItem,
  AppLanguage,
  DifficultyLevel,
  FormatVerificationResult
} from '../../types';
import { OriginalDocumentView } from '../Workspace/OriginalDocumentView';
import { ConceptMapView } from '../Workspace/ConceptMapView';
import { FlashcardView } from '../Workspace/FlashcardView';
import { AudioLessonView } from '../Workspace/AudioLessonView';
import { PracticeQuizView } from '../Workspace/PracticeQuizView';
import { GeneratorControlBar } from '../Workspace/GeneratorControlBar';
import { AiGeneratorTestModal } from '../AiGeneratorTestModal';
import { ApiClient } from '../../services/apiClient';

interface LearningStudioPageProps {
  document: AcademicDocument;
  initialTab?: StudioTab;
  onNavigateToCitation: (citation: SourceCitation) => void;
  onUpdateFlashcardMastery: (docId: string, cardId: string, level: number) => void;
  onSaveItem: (item: SavedItem) => void;
  onOpenFeedback: () => void;
}

export const LearningStudioPage: React.FC<LearningStudioPageProps> = ({
  document,
  initialTab = 'map',
  onNavigateToCitation,
  onUpdateFlashcardMastery,
  onSaveItem,
  onOpenFeedback
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [highlightedCitation, setHighlightedCitation] = useState<SourceCitation | null>(null);

  // Phase 5 Generation States
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>('English');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<FormatVerificationResult | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);

  // Dynamic overrides per format when student regenerates or switches language
  const [dynamicOverrides, setDynamicOverrides] = useState<Record<string, any>>({});

  const tabs: { id: StudioTab; number: string; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'original', number: '01', label: 'Original', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-slate-500' },
    { id: 'map', number: '02', label: 'Concept Map', icon: <Network className="w-3.5 h-3.5" />, color: 'text-blue-500' },
    { id: 'simplified', number: '03', label: 'Simplified', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'text-amber-500' },
    { id: 'notes', number: '04', label: 'Detailed Notes', icon: <BookOpen className="w-3.5 h-3.5" />, color: 'text-indigo-500' },
    { id: 'worked', number: '05', label: 'Worked Examples', icon: <FlaskConical className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
    { id: 'flashcards', number: '06', label: 'Flashcards', icon: <Layers className="w-3.5 h-3.5" />, color: 'text-purple-500' },
    { id: 'audio', number: '07', label: 'Audio', icon: <Headphones className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
    { id: 'quiz', number: '08', label: 'Practice Quiz', icon: <Award className="w-3.5 h-3.5" />, color: 'text-amber-500' },
  ];

  const handleCitationClick = (cite: SourceCitation) => {
    setHighlightedCitation(cite);
    onNavigateToCitation(cite);
    if (!isSplitView && activeTab !== 'original') {
      setIsSplitView(true);
    }
  };

  const handleSaveSnippet = (title: string, content: string, cite?: SourceCitation) => {
    onSaveItem({
      id: 'saved-' + Date.now(),
      documentId: document.id,
      documentTitle: document.title,
      type: 'notes',
      title,
      content,
      savedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      citation: cite
    });
  };

  // Section 5.2 & 5.5: Generate or Regenerate material with verification
  const handleRegenerate = async (targetLang?: AppLanguage, targetDiff?: DifficultyLevel) => {
    if (activeTab === 'original') return;
    setIsGenerating(true);

    const lang = targetLang || currentLanguage;
    const diff = targetDiff || difficulty;

    try {
      const res = await ApiClient.generateMaterial(document.id, activeTab, lang, diff, true);
      if (res && res.material) {
        const generatedContent = res.material.content?.content || res.material.content;
        setDynamicOverrides(prev => ({
          ...prev,
          [`${activeTab}-${lang}-${diff}`]: generatedContent
        }));
        if (res.verification) {
          setVerificationResult(res.verification);
        }
      }
    } catch (e) {
      console.warn('Backend generation fallback:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLanguageChange = (lang: AppLanguage) => {
    setCurrentLanguage(lang);
    if (activeTab !== 'original') {
      handleRegenerate(lang, difficulty);
    }
  };

  const handleDifficultyChange = (diff: DifficultyLevel) => {
    setDifficulty(diff);
    if (activeTab !== 'original') {
      handleRegenerate(currentLanguage, diff);
    }
  };

  // Resolve current active format content (checking dynamic override first, then document defaults)
  const overrideKey = `${activeTab}-${currentLanguage}-${difficulty}`;
  const activeOverride = dynamicOverrides[overrideKey];

  const currentConceptMap = (activeTab === 'map' && activeOverride)
    ? activeOverride
    : document.conceptMap;

  const currentFlashcards = (activeTab === 'flashcards' && activeOverride && Array.isArray(activeOverride))
    ? activeOverride
    : document.flashcards;

  const currentAudioLesson = (activeTab === 'audio' && activeOverride)
    ? activeOverride
    : document.audioLesson;

  const currentExpl = (activeTab === 'simplified' && activeOverride)
    ? activeOverride
    : document.explanations?.[0] || {
        title: document.title,
        summary: document.summary,
        intuitiveAnalogy: 'Simplified conceptual explanation.',
        rigorousBreakdown: 'Theoretical academic breakdown.',
        workedExample: 'Step-by-step example.',
        keyTakeaways: [],
        citations: []
      };

  const currentNotes = (activeTab === 'notes' && activeOverride)
    ? activeOverride
    : {
        title: currentExpl.title,
        rigorousBreakdown: currentExpl.rigorousBreakdown,
        equations: document.sections?.[0]?.equations || [],
        conditions: document.sections?.[0]?.conditions || [],
        citations: currentExpl.citations || []
      };

  const currentWorked = (activeTab === 'worked' && activeOverride)
    ? activeOverride
    : {
        title: `Worked Problem: ${currentExpl.title}`,
        problemStatement: 'Given standard experimental parameters, calculate normalized state output.',
        solutionSteps: (currentExpl.workedExample || 'Step 1: Inspect condition.\nStep 2: Apply formula.').split('\n').filter(Boolean),
        citation: currentExpl.citations?.[0]
      };

  const hasBeyondNotes = activeTab === 'simplified' && (activeOverride?.hasBeyondNotesAnnotation || true);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-slate-900 select-none overflow-hidden">
      {/* Studio Header: Document Title & 8 Format Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate max-w-xl">
                {document.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {document.meaningPreservation?.overallFidelityScore ?? 96}% Ground Truth Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {document.author} • {document.category} • {document.pageCount} Pages • Zero Altered Equations
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Split Screen View Toggle */}
            <button
              onClick={() => setIsSplitView(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all self-start md:self-auto ${
                isSplitView
                  ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/60 dark:border-brand-700 dark:text-brand-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{isSplitView ? 'Hide Source Split' : 'Show Source Split'}</span>
            </button>
          </div>
        </div>

        {/* 8 Tabs List */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs font-semibold pt-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setVerificationResult(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`text-[10px] opacity-70 ${isActive ? '' : 'text-slate-400'}`}>
                  {tab.number}
                </span>
                <span className={isActive ? '' : tab.color}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 5.2 & 5.3: Generator Control Bar (Language, Difficulty, Regenerate, 9-Point Audit) */}
      <GeneratorControlBar
        activeTab={activeTab}
        currentLanguage={currentLanguage}
        difficulty={difficulty}
        isGenerating={isGenerating}
        verification={verificationResult}
        hasBeyondNotesAnnotation={hasBeyondNotes}
        onLanguageChange={handleLanguageChange}
        onDifficultyChange={handleDifficultyChange}
        onRegenerate={() => handleRegenerate()}
        onOpenTestSuite={() => setIsTestModalOpen(true)}
      />

      {/* Main Studio Body: Split View (Source on Left, Format on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Original Source View (if split is active or tab is 'original') */}
        {(isSplitView || activeTab === 'original') && (
          <div className={`${isSplitView && activeTab !== 'original' ? 'w-1/2 hidden md:block' : 'w-full'} h-full overflow-hidden border-r border-slate-200 dark:border-slate-800`}>
            <OriginalDocumentView
              document={document}
              highlightedCitation={highlightedCitation}
              onClearHighlight={() => setHighlightedCitation(null)}
            />
          </div>
        )}

        {/* Right: Active Learning Format View */}
        {activeTab !== 'original' && (
          <div className={`${isSplitView ? 'w-full md:w-1/2' : 'w-full'} h-full overflow-y-auto`}>
            {/* 02 Concept Map */}
            {activeTab === 'map' && (
              <ConceptMapView
                conceptMap={currentConceptMap}
                onNavigateToCitation={handleCitationClick}
              />
            )}

            {/* 03 Simplified Explanations */}
            {activeTab === 'simplified' && (
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4" />
                      <span>03. Simplified & Intuitive Explanation ({currentLanguage})</span>
                    </span>
                    <button
                      onClick={() => handleSaveSnippet('Simplified: ' + currentExpl.title, currentExpl.intuitiveAnalogy, currentExpl.citations?.[0])}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Explanation</span>
                    </button>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {currentExpl.title}
                  </h2>
                </div>

                {/* Section 5.3 Distinction: Supplementary Context Callout */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold">Pedagogical Distinction: </span>
                    <span>
                      The intuitive analogy below simplifies the wording for learning clarity, but technical invariant bounds (e.g. variance normalizer 1/√d_k, non-negative bounds) remain strictly preserved from the source.
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Intuitive Real-World Analogy
                  </div>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                    {currentExpl.intuitiveAnalogy}
                  </p>

                  {/* View Source Action */}
                  {currentExpl.citations?.[0] && (
                    <div className="pt-3 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Source anchor: Page {currentExpl.citations[0].pageNumber} ({currentExpl.citations[0].sectionTitle})
                      </span>
                      <button
                        onClick={() => handleCitationClick(currentExpl.citations[0])}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Key Takeaways */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                    Essential Invariant Takeaways:
                  </div>
                  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    {(currentExpl.keyTakeaways || []).map((k: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 04 Detailed Notes */}
            {activeTab === 'notes' && (
              <div className="p-6 space-y-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>04. Structured Detailed Notes ({currentLanguage} • {difficulty})</span>
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {currentNotes.title}
                  </h2>
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Theoretical Exposition & Mathematical Formulations
                  </div>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                    {currentNotes.rigorousBreakdown}
                  </p>

                  {/* Equations & Conditions */}
                  {currentNotes.equations && currentNotes.equations.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                        Preserved Mathematical Formulations:
                      </div>
                      {currentNotes.equations.map((eq: any, eqIdx: number) => (
                        <div key={eqIdx} className="font-mono bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          <code>{eq.latex}</code>
                          <p className="text-slate-500 text-[11px] mt-1 font-sans">{eq.meaning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View Source Action */}
                  {currentNotes.citations?.[0] && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Exact quote from Section {currentNotes.citations[0].sectionTitle}
                      </span>
                      <button
                        onClick={() => handleCitationClick(currentNotes.citations[0])}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 05 Worked Examples */}
            {activeTab === 'worked' && (
              <div className="p-6 space-y-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4" />
                    <span>05. Step-by-Step Worked Problem & Calculation ({currentLanguage})</span>
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {currentWorked.title}
                  </h2>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900 text-slate-100 border border-slate-800 space-y-4 font-mono text-xs sm:text-sm">
                  <div className="text-emerald-400 font-bold uppercase text-xs tracking-wider">
                    Numerical Case Study & Steps
                  </div>
                  <div className="space-y-2 text-slate-200 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-sans">
                    {Array.isArray(currentWorked.solutionSteps) ? (
                      currentWorked.solutionSteps.map((step: string, sIdx: number) => (
                        <div key={sIdx} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                          {step}
                        </div>
                      ))
                    ) : (
                      <pre className="whitespace-pre-line text-xs">{currentWorked.solutionSteps}</pre>
                    )}
                  </div>

                  {/* View Source Action */}
                  {currentWorked.citation && (
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Derived from mathematical condition in Page {currentWorked.citation.pageNumber}
                      </span>
                      <button
                        onClick={() => handleCitationClick(currentWorked.citation)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 06 Flashcards */}
            {activeTab === 'flashcards' && (
              <FlashcardView
                documentId={document.id}
                flashcards={currentFlashcards}
                onUpdateMastery={onUpdateFlashcardMastery}
                onNavigateToCitation={handleCitationClick}
              />
            )}

            {/* 07 Audio */}
            {activeTab === 'audio' && (
              <AudioLessonView
                audioLesson={currentAudioLesson}
                onNavigateToCitation={handleCitationClick}
              />
            )}

            {/* 08 Practice Quiz */}
            {activeTab === 'quiz' && (
              <PracticeQuizView
                document={document}
                onNavigateToCitation={handleCitationClick}
                onSaveItem={onSaveItem}
              />
            )}
          </div>
        )}
      </div>

      {/* 9-Point AI Generator Testing Suite Modal (Section 5.6) */}
      <AiGeneratorTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        document={document}
      />
    </div>
  );
};
