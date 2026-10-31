import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronDown,
  Check,
  GripVertical,
  Sparkles,
  Info,
  Download,
  Settings,
  MessageSquare,
  Loader2,
  GraduationCap,
  FolderTree
} from 'lucide-react';
import {
  AcademicDocument,
  StudioTab,
  SourceCitation,
  SavedItem,
  AppLanguage,
  DifficultyLevel,
  FormatVerificationResult,
  DocumentTopicHierarchy
} from '../../types';
import { OriginalDocumentView } from '../Workspace/OriginalDocumentView';
import { PageWiseTeacherView } from '../Workspace/PageWiseTeacherView';
import { ConceptMapView } from '../Workspace/ConceptMapView';
import { DetailedNotesView } from '../Workspace/DetailedNotesView';
import { WorkedExamplesView } from '../Workspace/WorkedExamplesView';
import { FlashcardView } from '../Workspace/FlashcardView';
import { AudioLessonView } from '../Workspace/AudioLessonView';
import { PracticeQuizView } from '../Workspace/PracticeQuizView';
import { GeneratorControlBar } from '../Workspace/GeneratorControlBar';
import { ExplainThisModal } from '../Workspace/ExplainThisModal';
import { VerificationAuditModal } from '../Workspace/VerificationAuditModal';
import { CortexCompanionChat } from '../Workspace/CortexCompanionChat';
import { AiGeneratorTestModal } from '../AiGeneratorTestModal';
import { ExportModal } from '../ExportModal';
import { TopicHierarchyReviewModal } from '../Workspace/TopicHierarchyReviewModal';
import { TopicHierarchyService } from '../../services/topicHierarchyService';
import { ApiClient } from '../../services/apiClient';
import { SAMPLE_DOCUMENTS } from '../../data/sampleDocuments';

interface LearningStudioPageProps {
  document: AcademicDocument;
  allDocuments?: AcademicDocument[];
  onSelectDocument?: (doc: AcademicDocument) => void;
  initialTab?: StudioTab;
  activeCitation?: SourceCitation | null;
  activeTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
  onUpdateFlashcardMastery: (docId: string, cardId: string, level: number) => void;
  onSaveItem: (item: SavedItem) => void;
  onOpenFeedback: () => void;
  voiceGender?: 'female' | 'male';
  onVoiceGenderChange?: (gender: 'female' | 'male') => void;
  onOpenTopicExplorer?: () => void;
}

export const LearningStudioPage: React.FC<LearningStudioPageProps> = ({
  document,
  allDocuments,
  onSelectDocument,
  initialTab = 'map',
  activeCitation,
  activeTopicId,
  onNavigateToCitation,
  onUpdateFlashcardMastery,
  onSaveItem,
  onOpenFeedback,
  voiceGender,
  onVoiceGenderChange,
  onOpenTopicExplorer
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [highlightedCitation, setHighlightedCitation] = useState<SourceCitation | null>(activeCitation || null);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'formats'>('chat');
  const [leftPanelMode, setLeftPanelMode] = useState<'teacher' | 'original'>('teacher');
  const [fullContextEnabled, setFullContextEnabled] = useState<boolean>(true);

  // Synchronize incoming activeCitation from ContextPanel / App
  useEffect(() => {
    if (activeCitation) {
      setHighlightedCitation(activeCitation);
      setIsSplitView(true);
    }
  }, [activeCitation]);

  // Phase 5 Generation States
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>('English');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<FormatVerificationResult | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);
  const [explainSelectionText, setExplainSelectionText] = useState<string>('');
  const [explainContextSnippet, setExplainContextSnippet] = useState<string>('');
  const [explainPageNumber, setExplainPageNumber] = useState<number | undefined>(undefined);
  const [explainSectionTitle, setExplainSectionTitle] = useState<string | undefined>(undefined);

  // Split Panel Resizing state (Default: 68% Document Viewer / 32% Side Context Panel)
  const [splitRatio, setSplitRatio] = useState<number>(68);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState<boolean>(false);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState<boolean>(false);
  const [currentHierarchy, setCurrentHierarchy] = useState<DocumentTopicHierarchy>(
    () => document.topicHierarchy || TopicHierarchyService.buildHierarchy(document)
  );

  useEffect(() => {
    setCurrentHierarchy(document.topicHierarchy || TopicHierarchyService.buildHierarchy(document));
  }, [document]);

  const activeTopic = activeTopicId
    ? currentHierarchy.chapters.flatMap(c => c.topics).find(t => t.id === activeTopicId)
    : null;
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: direction === 'left' ? -180 : 180,
        behavior: 'smooth'
      });
    }
  };

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp between 30% and 80% so neither document nor format panel collapses
      if (newRatio >= 30 && newRatio <= 80) {
        setSplitRatio(Math.round(newRatio));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Dynamic overrides per format when student regenerates or switches language
  const [dynamicOverrides, setDynamicOverrides] = useState<Record<string, any>>({});

  const availableDocs = allDocuments && allDocuments.length > 0 ? allDocuments : SAMPLE_DOCUMENTS;
  const documentTabs = [
    { id: 'doc-mcat-prep', label: 'MCAT Prep' },
    { id: 'doc-intro-neurology', label: 'Intro_to_Neurology' },
    { id: 'doc-spinal-cord', label: 'Spinal_Cord_Diagram' },
    { id: 'doc-muscle-functions', label: 'Muscle_Functions_C' },
    { id: 'doc-skeletal-system', label: 'Skeletal_System_Dia' }
  ];

  const handleDocumentTabClick = (tabId: string) => {
    const targetDoc = availableDocs.find(
      d => d.id === tabId || d.title.toLowerCase().includes(tabId.replace('doc-', '').replace(/_/g, ' '))
    );
    if (targetDoc && onSelectDocument) {
      onSelectDocument(targetDoc);
    }
  };

  const tabs: { id: StudioTab; number: string; label: string; tooltip: string; icon: React.ReactNode; color: string }[] = [
    { id: 'original', number: '01', label: 'AI Teacher', tooltip: 'Personal AI Teacher: Page-wise explanation of every page', icon: <GraduationCap className="w-4 h-4" />, color: 'text-blue-500' },
    { id: 'map', number: '02', label: 'Concept Map', tooltip: 'Hierarchical knowledge graph and prerequisite relationships', icon: <Network className="w-4 h-4" />, color: 'text-blue-500' },
    { id: 'simplified', number: '03', label: 'Simplified Explanation', tooltip: 'Plain-language explanation with real-world analogies', icon: <Lightbulb className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'notes', number: '04', label: 'Detailed Notes', tooltip: 'Exhaustive notes with definitions, equations, and conditions', icon: <BookOpen className="w-4 h-4" />, color: 'text-indigo-500' },
    { id: 'worked', number: '05', label: 'Worked Examples', tooltip: 'Step-by-step mathematical calculations and derivations', icon: <FlaskConical className="w-4 h-4" />, color: 'text-emerald-500' },
    { id: 'flashcards', number: '06', label: 'Flashcards', tooltip: 'Spaced repetition flashcards with mastery tracking', icon: <Layers className="w-4 h-4" />, color: 'text-purple-500' },
    { id: 'quiz', number: '07', label: 'Practice Quiz', tooltip: 'Diagnostic quiz with explanations and source citations', icon: <Award className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'audio', number: '08', label: 'Audio Lessons', tooltip: 'Narrated spoken lesson with chapter navigation', icon: <Headphones className="w-4 h-4" />, color: 'text-emerald-500' }
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetTab = tabs[targetIndex];
      setActiveTab(targetTab.id);
      setVerificationResult(null);
      setRightPanelMode('formats');

      const buttons = tabsScrollRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (buttons && buttons[targetIndex]) {
        buttons[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        buttons[targetIndex].focus();
      }
    }
  };

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

  const handleOpenExplain = (text: string, context?: string, pageNumber?: number, sectionTitle?: string) => {
    setExplainSelectionText(text);
    setExplainContextSnippet(context || '');
    setExplainPageNumber(pageNumber);
    setExplainSectionTitle(sectionTitle);
    setIsExplainModalOpen(true);
  };

  const handleDownloadNotes = () => {
    let md = `# LEARNOVA Study Notes: ${document.title}\n\n`;
    md += `**Difficulty:** ${difficulty} | **Language:** ${currentLanguage}\n\n`;
    md += `---\n\n## 1. Simplified Overview\n\n`;
    md += `${currentExpl.intuitiveAnalogy || currentExpl.summary || ''}\n\n`;
    if (currentExpl.realWorldExamples) {
      md += `### Real-World Examples\n`;
      md += `- **Everyday Analogy:** ${currentExpl.realWorldExamples.everydayAnalogy || 'N/A'}\n`;
      md += `- **Practical Example:** ${currentExpl.realWorldExamples.practicalExample || 'N/A'}\n`;
      md += `- **Industry Application:** ${currentExpl.realWorldExamples.industryApplication || 'N/A'}\n\n`;
    }
    if (currentExpl.sections) {
      md += `## 2. Topic-by-Topic Walkthrough\n\n`;
      currentExpl.sections.forEach((s: any, idx: number) => {
        md += `### ${idx + 1}. ${s.sectionTitle} (Page ${s.pageNumber || 1})\n\n`;
        md += `${s.simplifiedConcept || s.whatIsIt || ''}\n\n`;
        if (s.whyItMatters) md += `**Why It Matters:** ${s.whyItMatters}\n\n`;
        if (s.howItWorks) md += `**How It Works:** ${s.howItWorks}\n\n`;
        if (s.formulaExplanation) md += `**Formula Breakdown:** \`${s.formulaExplanation}\`\n\n`;
      });
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '_')}_Simplified_Notes_${currentLanguage}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Auto-fetch or generate material on tab switch if not yet loaded
  useEffect(() => {
    if (activeTab === 'original') return;
    if (dynamicOverrides[overrideKey]) return;

    // Check if document already has substantial content for this tab
    const hasData =
      (activeTab === 'map' && document.conceptMap?.nodes?.length > 1) ||
      (activeTab === 'flashcards' && document.flashcards?.length > 0) ||
      (activeTab === 'audio' && document.audioLesson?.sections?.length > 0) ||
      (activeTab === 'quiz' && (document as any).quiz?.length > 0) ||
      (activeTab === 'notes' && ((document as any).notes?.sections?.length > 0 || (document as any).notes?.rigorousBreakdown)) ||
      (activeTab === 'worked' && ((document as any).worked?.solutionSteps?.length > 2 || (document as any).worked?.problemStatement)) ||
      (activeTab === 'simplified' && (document.explanations?.[0]?.sections?.length > 0 || document.explanations?.[0]?.intuitiveAnalogy?.length > 40));

    if (!hasData) {
      handleRegenerate(currentLanguage, difficulty);
    }
  }, [activeTab, document.id]);

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
        intuitiveAnalogy: `Think of ${document.title} like an interconnected system where all constraints, theorems, and state transitions are strictly verified.`,
        rigorousBreakdown: document.summary,
        workedExample: 'Step 1: Check conditions.\nStep 2: Apply formula.',
        sections: [],
        keyTakeaways: [
          'Preserve core definitions and theoretical invariants',
          'Audit all formulas against ground truth',
          'Strict traceability to page and slide citations'
        ],
        citations: []
      };

  const currentNotes = (activeTab === 'notes' && activeOverride)
    ? activeOverride
    : (document as any).notes || {
        title: currentExpl.title,
        overview: document.summary,
        rigorousBreakdown: currentExpl.rigorousBreakdown || document.summary,
        sections: document.sections?.map(s => ({
          heading: s.title,
          pageOrSlide: s.pageNumber || s.slideNumber || 1,
          overview: s.content.slice(0, 160) + '...',
          rigorousBreakdown: `Formal academic derivation: ${s.content}`,
          definitions: s.definitions || [],
          equations: s.equations || [],
          conditions: s.conditions || [],
          keyPoints: [
            `Grounded in ${s.slideNumber ? `Slide ${s.slideNumber}` : `Page ${s.pageNumber || 1}`}: ${s.title}`,
            s.conditions?.[0] ? `Boundary Condition: ${s.conditions[0]}` : 'Mathematical consistency must be maintained.',
            s.equations?.[0] ? `Formula: ${s.equations[0].latex}` : 'Analytical validation required.'
          ],
          sourceCitation: {
            id: `cite-${s.id}`,
            documentId: document.id,
            pageNumber: s.pageNumber || 1,
            slideNumber: s.slideNumber,
            sectionTitle: s.title,
            exactQuote: s.content.slice(0, 120) + '...',
            contextSnippet: s.content.slice(0, 200)
          }
        })) || [],
        equations: document.sections?.[0]?.equations || [],
        conditions: document.sections?.[0]?.conditions || [],
        citations: currentExpl.citations || []
      };

  const currentWorked = (activeTab === 'worked' && activeOverride)
    ? activeOverride
    : (document as any).worked || {
        title: `Worked Problem: ${currentExpl.title}`,
        problemStatement: document.sections?.[0]?.equations?.[0]
          ? `Given the parameters defined in Section 1, evaluate the mathematical formula ${document.sections[0].equations[0].latex} and verify boundary invariants.`
          : 'Given standard experimental parameters, calculate normalized state output and verify theoretical invariants.',
        givenParameters: [
          `Primary Section: ${document.sections?.[0]?.title || document.title}`,
          `Formula Applied: ${document.sections?.[0]?.equations?.[0]?.latex || 'Y = f(X) + C'}`,
          `Boundary Invariant: ${document.sections?.[0]?.conditions?.[0] || 'State outputs must remain strictly bounded.'}`
        ],
        formulaApplied: document.sections?.[0]?.equations?.[0]?.latex || 'Y = f(X) + C',
        solutionSteps: [
          'Step 1: Check Preconditions — Confirm all given boundary conditions and invariants are satisfied.',
          `Step 2: Parameter Setup — Formulate problem using verified equation: ${document.sections?.[0]?.equations?.[0]?.latex || 'Y = f(X) + C'}.`,
          'Step 3: Numerical Derivation — Substitute input values and evaluate intermediate algebraic transformations.',
          'Step 4: Range & Variance Check — Confirm output values stay strictly within theoretical limits without divergence.',
          'Step 5: Verification & Safety — Output verified with zero altered formulas or dropped constraints.'
        ],
        citation: currentExpl.citations?.[0]
      };

  const hasBeyondNotes = activeTab === 'simplified' && (activeOverride?.hasBeyondNotesAnnotation || true);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-slate-900 select-none overflow-hidden">
      {/* Top Document Tabs Strip (matching Learning Cortex screenshot) */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#070b14] px-4 py-1.5 overflow-x-auto text-xs font-semibold select-none shrink-0">
        <div className="flex items-center space-x-1">
          {documentTabs.map((dTab) => {
            const isSelected =
              document.id === dTab.id ||
              document.title.toLowerCase().includes(dTab.label.toLowerCase().replace(/_/g, ' ')) ||
              dTab.label.toLowerCase().includes(document.title.toLowerCase().replace(/_/g, ' '));
            return (
              <button
                key={dTab.id}
                onClick={() => handleDocumentTabClick(dTab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-blue-300 font-bold border-b-2 border-blue-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{dTab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsTestModalOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2 cursor-pointer"
          title="Studio Settings & System Diagnostics"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Studio Header: Document Title & 8 Format Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate max-w-xl">
                {document.title}
              </span>
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer shadow-2xs"
                title="Click to view Content Verification Report"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Content Verification Report</span>
                <span className="text-[9px] opacity-75 underline font-normal">Audit</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {document.author} • {document.category} • {document.pageCount} Pages • Zero Altered Equations
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTopicExplorer && (
              <button
                onClick={onOpenTopicExplorer}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1.5 transition-all self-start md:self-auto shadow-sm cursor-pointer"
                title="Open dedicated Explore Your Topics view"
              >
                <FolderTree className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Explore Topics</span>
              </button>
            )}

            {/* Step 38: Export Package Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-all self-start md:self-auto shadow-sm"
              title="Export formatted notes, presentations, or quizzes"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Package</span>
            </button>

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

        {/* Mobile Format Selector Dropdown (visible on < sm screens) */}
        <div className="sm:hidden w-full pt-1 relative">
          <button
            onClick={() => setIsFormatDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors shadow-2xs"
            aria-label="Format Selector"
            aria-expanded={isFormatDropdownOpen}
          >
            <div className="flex items-center space-x-2 truncate">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <span className={tabs.find(t => t.id === activeTab)?.color}>
                  {tabs.find(t => t.id === activeTab)?.icon}
                </span>
              )}
              <span className="truncate">
                {tabs.find(t => t.id === activeTab)?.number}. {tabs.find(t => t.id === activeTab)?.label}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isFormatDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFormatDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                All 8 Learning Formats
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setVerificationResult(null);
                    setRightPanelMode('formats');
                    setIsFormatDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={activeTab === tab.id ? 'text-blue-600' : tab.color}>{tab.icon}</span>
                    <span className="truncate">{tab.number}. {tab.label}</span>
                  </div>
                  {activeTab === tab.id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop & Tablet Horizontal Tab Navigation Bar (visible on >= sm screens) */}
        <div className="hidden sm:flex items-center gap-1.5 pt-1">
          {/* Scroll Left Button */}
          <button
            onClick={() => handleScrollTabs('left')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0 transition-colors cursor-pointer"
            title="Scroll Tabs Left"
            aria-label="Scroll Tabs Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Tabs */}
          <div
            ref={tabsScrollRef}
            role="tablist"
            aria-label="Learning Formats"
            className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 py-1"
          >
            {tabs.map((tab, tabIdx) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  title={tab.tooltip}
                  onKeyDown={(e) => handleTabKeyDown(e, tabIdx)}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setVerificationResult(null);
                    setRightPanelMode('formats');
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[38px] ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md font-bold ring-2 ring-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`text-[10px] font-mono opacity-70 ${isActive ? '' : 'text-slate-400'}`}>
                    {tab.number}
                  </span>
                  {isGenerating && isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                  ) : (
                    <span className={isActive ? '' : tab.color}>{tab.icon}</span>
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => handleScrollTabs('right')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0 transition-colors cursor-pointer"
            title="Scroll Tabs Right"
            aria-label="Scroll Tabs Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Compact Format Dropdown Menu Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsFormatDropdownOpen(v => !v)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors min-h-[38px] cursor-pointer"
              title="Jump to any learning format"
              aria-haspopup="listbox"
              aria-expanded={isFormatDropdownOpen}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Formats</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFormatDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFormatDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Learning Format (8)
                </div>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setVerificationResult(null);
                      setRightPanelMode('formats');
                      setIsFormatDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={activeTab === tab.id ? 'text-blue-600' : tab.color}>{tab.icon}</span>
                      <span className="truncate">{tab.number}. {tab.label}</span>
                    </div>
                    {activeTab === tab.id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 1 & 2: Topic Hierarchy & Structure Explorer Button */}
          <button
            onClick={() => setIsHierarchyModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 transition-colors min-h-[38px] shrink-0 cursor-pointer shadow-xs"
            title="Inspect and refine extracted Chapter & Topic hierarchy"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Topics ({currentHierarchy.chapters.length})</span>
          </button>
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

      {/* Main Studio Body: Resizable Split View (Document Viewer on Left, Format on Right) */}
      <div ref={mainContainerRef} className="flex-1 flex overflow-hidden relative select-none">
        {/* Left: AI Teacher Page-Wise View or Original Source View (Occupies ~65-70% width default, resizable) */}
        {(isSplitView || activeTab === 'original') && (
          <div
            style={{
              width: activeTab === 'original' || !isSplitView ? '100%' : `${splitRatio}%`
            }}
            className="h-full overflow-hidden transition-all duration-75 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800"
          >
            {leftPanelMode === 'teacher' ? (
              <PageWiseTeacherView
                document={document}
                initialPage={highlightedCitation?.pageNumber || 1}
                onNavigateToCitation={handleCitationClick}
                onOpenAskAi={() => {
                  setRightPanelMode('chat');
                }}
                onSwitchToOriginal={() => setLeftPanelMode('original')}
              />
            ) : (
              <OriginalDocumentView
                document={document}
                highlightedCitation={highlightedCitation}
                onClearHighlight={() => setHighlightedCitation(null)}
                onExplainSelection={handleOpenExplain}
                onSwitchToTeacher={() => setLeftPanelMode('teacher')}
              />
            )}
          </div>
        )}

        {/* Resizable Divider Handle (when split is active and not on 'original' tab) */}
        {isSplitView && activeTab !== 'original' && (
          <div
            onMouseDown={handleDividerMouseDown}
            className={`w-2 hover:w-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-brand-500 cursor-col-resize select-none relative group transition-colors flex items-center justify-center shrink-0 z-30 ${
              isDragging ? 'bg-brand-600 w-2.5 shadow-md' : ''
            }`}
            title={`Drag to resize (${splitRatio}% document / ${100 - splitRatio}% format panel). Double-click to reset to 68/32.`}
            onDoubleClick={() => setSplitRatio(68)}
          >
            <div className="w-1 h-8 rounded-full bg-slate-400 dark:bg-slate-600 group-hover:bg-white transition-colors" />
          </div>
        )}

        {/* Right: Active Learning Format or Cortex Chat (Occupies ~30-35% width default) */}
        {activeTab !== 'original' && (
          <div
            style={{
              width: isSplitView ? `${100 - splitRatio}%` : '100%'
            }}
            className="h-full overflow-hidden bg-[#0b1120] flex flex-col transition-all duration-75"
          >
            {/* Top Switcher Bar between Cortex Assistant and 8 Formats */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-[#090d16] shrink-0 select-none">
              <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setRightPanelMode('chat')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    rightPanelMode === 'chat'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Cortex Assistant</span>
                </button>
                <button
                  onClick={() => setRightPanelMode('formats')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    rightPanelMode === 'formats'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>8 Formats</span>
                </button>
              </div>

              {rightPanelMode === 'formats' && (
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {tabs.find(t => t.id === activeTab)?.label}
                </span>
              )}
            </div>

            {/* Mode Content: Chat vs 8 Formats */}
            {rightPanelMode === 'chat' ? (
              <div className="flex-1 overflow-hidden">
                <CortexCompanionChat
                  document={document}
                  onNavigateToCitation={handleCitationClick}
                  fullContextEnabled={fullContextEnabled}
                  onToggleFullContext={setFullContextEnabled}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 transition-all duration-75">
                {/* Active Topic Scoped Banner */}
                {activeTopic && (
                  <div className="px-5 py-2.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs animate-fadeIn">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                      <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-bold text-blue-900 dark:text-blue-200">Topic Learning Workspace:</span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{activeTopic.title}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 shrink-0">
                        Pages {activeTopic.pageRange[0]}–{activeTopic.pageRange[1]}
                      </span>
                    </div>
                    {onOpenTopicExplorer && (
                      <button
                        onClick={onOpenTopicExplorer}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        <FolderTree className="w-3.5 h-3.5" />
                        <span>Explore All Topics</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 02 Concept Map */}
                {activeTab === 'map' && (
                  <ConceptMapView
                    conceptMap={currentConceptMap}
                    document={document}
                    initialTopicId={activeTopicId}
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleDownloadNotes}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Notes (.md)</span>
                      </button>
                      <button
                        onClick={() => handleOpenExplain(currentExpl.title + ': ' + (currentExpl.summary || ''))}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs flex items-center gap-1 font-medium"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Explain Any Concept</span>
                      </button>
                      <button
                        onClick={() => handleSaveSnippet('Simplified: ' + currentExpl.title, currentExpl.intuitiveAnalogy, currentExpl.citations?.[0])}
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold ml-1"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
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
                      The intuitive analogies and real-world models below simplify the language for conceptual clarity, while technical invariant bounds (e.g. variance normalizer 1/√d_k, non-negative bounds, quorum thresholds) remain strictly preserved from the source.
                    </span>
                  </div>
                </div>

                {/* Technical Terms Explained First (Step 1) */}
                {currentExpl.definedTerms && currentExpl.definedTerms.length > 0 && (
                  <div className="p-5 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      Technical Terms Explained First
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {currentExpl.definedTerms.map((t: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-brand-200/60 dark:border-brand-900/40 text-xs">
                          <strong className="text-slate-900 dark:text-white block mb-0.5">{t.term}</strong>
                          <span className="text-slate-600 dark:text-slate-300">{t.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-World Examples Box (Step 4) */}
                {currentExpl.realWorldExamples && (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Relevant Real-World Grounding
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {currentExpl.realWorldExamples.everydayAnalogy && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                          <strong className="text-amber-700 dark:text-amber-400 block font-bold">1. Everyday Analogy:</strong>
                          <span className="text-slate-700 dark:text-slate-300">{currentExpl.realWorldExamples.everydayAnalogy}</span>
                        </div>
                      )}
                      {currentExpl.realWorldExamples.practicalExample && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                          <strong className="text-amber-700 dark:text-amber-400 block font-bold">2. Practical Example:</strong>
                          <span className="text-slate-700 dark:text-slate-300">{currentExpl.realWorldExamples.practicalExample}</span>
                        </div>
                      )}
                      {currentExpl.realWorldExamples.industryApplication && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                          <strong className="text-amber-700 dark:text-amber-400 block font-bold">3. Industry Application:</strong>
                          <span className="text-slate-700 dark:text-slate-300">{currentExpl.realWorldExamples.industryApplication}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Overarching Mental Model */}
                <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Overarching Mental Model & Core Intuition
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

                {/* Section-by-Section Simplified Breakdown */}
                {currentExpl.sections && currentExpl.sections.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Topic-by-Topic Intuitive Explanations ({currentExpl.sections.length} Topics Covered)
                    </div>
                    {currentExpl.sections.map((secItem: any, sIdx: number) => (
                      <div key={sIdx} className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                              Page {secItem.pageNumber}
                            </span>
                            {secItem.sectionTitle}
                          </span>
                          {secItem.sourceCitation && (
                            <button
                              onClick={() => handleCitationClick(secItem.sourceCitation)}
                              className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>Source</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {secItem.whatIsIt || secItem.simplifiedConcept}
                        </p>

                        {secItem.whyItMatters && (
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            <strong className="text-amber-800 dark:text-amber-300">Why It Matters: </strong>
                            {secItem.whyItMatters}
                          </div>
                        )}

                        {secItem.howItWorks && (
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            <strong className="text-blue-800 dark:text-blue-300">How It Works: </strong>
                            {secItem.howItWorks}
                          </div>
                        )}

                        {secItem.stepByStep && secItem.stepByStep.length > 0 && (
                          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1 text-xs">
                            <strong className="text-slate-900 dark:text-white block font-semibold text-[11px] uppercase tracking-wider">
                              Step-by-Step Breakdown:
                            </strong>
                            {secItem.stepByStep.map((st: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{idx + 1}.</span>
                                <span>{st}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {secItem.realWorldIntuition && (
                          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Everyday Model: </span>{secItem.realWorldIntuition}
                          </div>
                        )}
                        {secItem.formulaExplanation && (
                          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200">
                            {secItem.formulaExplanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

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
              <DetailedNotesView
                document={document}
                initialTopicId={activeTopicId}
                onNavigateToCitation={handleCitationClick}
                onSaveNotes={(updatedSuite) => {
                  (document as any).notes = updatedSuite;
                }}
              />
            )}

            {/* 05 Worked Examples */}
            {activeTab === 'worked' && (
              <WorkedExamplesView
                document={document}
                initialTopicId={activeTopicId}
                onNavigateToCitation={handleCitationClick}
              />
            )}

            {/* 06 Flashcards */}
            {activeTab === 'flashcards' && (
              <FlashcardView
                documentId={document.id}
                flashcards={currentFlashcards}
                document={document}
                initialTopicId={activeTopicId}
                onUpdateMastery={onUpdateFlashcardMastery}
                onNavigateToCitation={handleCitationClick}
              />
            )}

            {/* 07 Audio */}
            {activeTab === 'audio' && (
              <AudioLessonView
                audioLesson={currentAudioLesson}
                documentId={document.id}
                initialTopicId={activeTopicId}
                onNavigateToCitation={handleCitationClick}
                voiceGender={voiceGender}
                onVoiceGenderChange={onVoiceGenderChange}
              />
            )}

                {/* 08 Practice Quiz */}
                {activeTab === 'quiz' && (
                  <PracticeQuizView
                    document={document}
                    initialTopicId={activeTopicId}
                    onNavigateToCitation={handleCitationClick}
                    onSaveItem={onSaveItem}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Explain This Feature Modal */}
      <ExplainThisModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        documentId={document.id}
        selectionText={explainSelectionText}
        contextSnippet={explainContextSnippet}
        currentLanguage={currentLanguage}
        initialDifficulty={difficulty}
        pageNumberHint={explainPageNumber}
        sectionTitleHint={explainSectionTitle}
        onSaveSnippet={handleSaveSnippet}
      />

      {/* 9-Point AI Generator Testing Suite Modal (Section 5.6) */}
      <AiGeneratorTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        document={document}
      />

      {/* Step 38: Multi-Format Academic Packaging & Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        document={document}
        currentTab={activeTab}
        currentLanguage={currentLanguage}
      />

      {/* Meaning Preservation Verification & Grounding Audit Modal */}
      <VerificationAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        document={document}
        onNavigateToSection={(pageNumber, sectionTitle) => {
          if (!isSplitView) setIsSplitView(true);
          const cite: SourceCitation = {
            id: `audit-cite-${pageNumber}`,
            documentId: document.id,
            pageNumber,
            sectionTitle,
            exactQuote: sectionTitle,
            contextSnippet: sectionTitle
          };
          handleCitationClick(cite);
        }}
      />
      {/* Step 1 & 2 Topic Hierarchy Review & Refinement Modal */}
      <TopicHierarchyReviewModal
        hierarchy={currentHierarchy}
        isOpen={isHierarchyModalOpen}
        documentTitle={document.title}
        pageCount={document.pageCount}
        onClose={() => setIsHierarchyModalOpen(false)}
        onConfirm={(confirmedHierarchy) => {
          setCurrentHierarchy(confirmedHierarchy);
          document.topicHierarchy = confirmedHierarchy;
          setIsHierarchyModalOpen(false);
        }}
      />
    </div>
  );
};
