export type Role = 'student' | 'lecturer';

export type NavigationPage =
  | 'dashboard'
  | 'documents'
  | 'studio'
  | 'topic-explorer'
  | 'verification'
  | 'saved'
  | 'lecturer'
  | 'settings'
  | 'upload';

export type StudioTab =
  | 'original'
  | 'map'
  | 'simplified'
  | 'notes'
  | 'worked'
  | 'flashcards'
  | 'audio'
  | 'quiz';

export type LearningFormat =
  | StudioTab
  | 'explanation'
  | 'preservation'
  | 'source';

export type AppLanguage = 'English' | 'Kannada' | 'Hindi';

export type DocumentFileType = 'pdf' | 'pptx' | 'scanned_notes';
export type ExtractionUserStatus = 'ready' | 'needs_review' | 'failed';

export interface ExtractionDiagnosticWarning {
  id: string;
  pageNumber?: number;
  slideNumber?: number;
  type: 'missing_text' | 'ocr_uncertainty' | 'broken_equation' | 'broken_structure' | 'unreadable_image' | 'low_contrast';
  severity: 'error' | 'warning' | 'info';
  message: string;
  flaggedSnippet?: string;
  recommendation: string;
}

export interface ExtractionQualityReport {
  userStatus: ExtractionUserStatus;
  textCompletenessScore: number;
  ocrConfidenceScore: number;
  equationIntegrityScore: number;
  structurePreservationScore: number;
  sourceTraceabilityScore: number;
  diagnostics: ExtractionDiagnosticWarning[];
  hasScannedPages: boolean;
  scannedPageNumbers: number[];
  testedAgainstBenchmark: boolean;
}

export interface SourceCitation {
  id: string;
  documentId: string;
  pageNumber: number;
  sectionTitle: string;
  exactQuote: string;
  contextSnippet: string;
  charStart?: number;
  charEnd?: number;
}

export interface DocumentSection {
  id: string;
  pageNumber: number;
  slideNumber?: number;
  chapterTitle?: string;
  title: string;
  content: string;
  speakerNotes?: string;
  equations?: { latex: string; label: string; meaning: string; isFlagged?: boolean }[];
  tables?: { caption: string; headers: string[]; rows: string[][] }[];
  definitions?: { term: string; definition: string; conditions?: string }[];
  conditions?: string[];
  examples?: string[];
  uncertainSymbols?: string[];
}

export interface DocumentSubtopic {
  id: string;
  title: string;
  level: number;
  pageRange: [number, number];
  summary?: string;
  importantConcepts: string[];
  equationsCount: number;
  diagramsCount: number;
  tablesCount: number;
  numericalExamplesCount: number;
}

export interface DocumentTopic {
  id: string;
  topicNumber: string;
  title: string;
  chapterTitle: string;
  chapterNumber: number;
  pageRange: [number, number];
  isMultiPage: boolean;
  contentType?: PageContentType;
  description?: string;
  subtopics: DocumentSubtopic[];
  importantConcepts: string[];
  associatedEquations: { latex: string; label: string; meaning: string; pageNumber: number }[];
  associatedDiagrams: { title: string; description: string; pageNumber: number }[];
  associatedTables: { caption: string; headers: string[]; rows: string[][]; pageNumber: number }[];
  associatedNumericalExamples: { problem: string; solutionSteps: string[]; finalAnswer: string; pageNumber: number }[];
  sourceCitations: SourceCitation[];
}

export interface DocumentChapter {
  id: string;
  chapterNumber: number;
  title: string;
  pageRange: [number, number];
  topics: DocumentTopic[];
}

export interface DocumentTopicHierarchy {
  documentId: string;
  documentTitle: string;
  chapters: DocumentChapter[];
  totalTopicsCount: number;
  totalSubtopicsCount: number;
  isUserVerified: boolean;
  userAdjustmentsCount?: number;
  extractionEvidenceLevel: 'high' | 'medium' | 'sparse';
  unresolvedWarnings?: string[];
}

export type PageContentType = 'theory' | 'numerical' | 'diagram' | 'comparison' | 'continuation' | 'unreadable';

export interface PageWiseExplanation {
  pageNumber: number;
  topicTitle: string;
  contentType: PageContentType;
  status?: 'explained' | 'needs_review' | 'unreadable';
  shortExplanation: string; // 4-6 crisp sentences
  detailedExplanation: string; // expanded breakdown with practical examples
  whatIsIt: string; // "What is [Concept]?"
  thinkOfItThisWay: string; // Relatable real-world analogy
  importantThingsToUnderstand: string[]; // 3-5 bulleted principles
  rememberThis: {
    rule: string;
    keyDifference?: string;
  };
  numericalDetails?: {
    problemStatement: string;
    givenValues: { parameter: string; value: string }[];
    formulaUsed: string;
    calculationSteps: { stepNumber: number; description: string; mathExpr?: string }[];
    finalAnswer: string;
  };
  diagramDetails?: {
    diagramTitle: string;
    components: { name: string; role: string }[];
    workflowSteps: string[];
  };
  comparisonDetails?: {
    comparisonTitle: string;
    headers: string[]; // e.g. ["Feature", "Program", "Process"]
    rows: string[][];
    contrastSummary: string;
  };
  isContinuation?: boolean;
  continuationOfTopic?: string;
  isUnreadableOrBlank?: boolean;
  unreadableReason?: string;
  sourceCitation: SourceCitation;
}

export interface ConceptNode {
  id: string;
  label: string;
  category: 'core' | 'mechanism' | 'equation' | 'condition' | 'application';
  summary: string;
  prerequisites: string[];
  sourceCitation: SourceCitation;
  importance: 'high' | 'medium' | 'foundational';
}

export interface ConceptEdge {
  from: string;
  to: string;
  relation: string;
}

export interface ConceptMapData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface ExplanationLevel {
  title: string;
  summary: string;
  intuitiveAnalogy: string;
  rigorousBreakdown: string;
  workedExample: string;
  keyTakeaways: string[];
  citations: SourceCitation[];
  hasBeyondNotesAnnotation?: boolean;
  additionalContextSummary?: string;
  sections?: {
    sectionTitle: string;
    pageNumber: number;
    simplifiedConcept: string;
    realWorldIntuition?: string;
    formulaExplanation?: string;
    invariantRule?: string;
    sourceCitation?: SourceCitation;
  }[];
}

export interface Flashcard {
  id: string;
  conceptId?: string;
  front: string;
  back: string;
  category: 'definition' | 'equation' | 'condition' | 'practice_question';
  sourceCitation: SourceCitation;
  masteryLevel: number; // 0: unlearned, 1: learning, 2: mastered
  lastReviewed?: string;
  isMarkedForReview?: boolean;
  practiceOptions?: { text: string; isCorrect: boolean; explanation: string }[];
}

export interface AudioLesson {
  id: string;
  title: string;
  totalDurationSeconds: number;
  sections: {
    id: string;
    sectionTitle: string;
    durationSeconds: number;
    scriptText: string;
    sourceCitation: SourceCitation;
  }[];
}

export interface PreservedFactCheck {
  id: string;
  originalFact: string;
  originalQuote: string;
  pageNumber: number;
  formatFound: string[];
  status: 'fully_preserved' | 'partially_preserved' | 'needs_review' | 'unable_to_verify';
  confidenceScore: number;
  notes: string;
  flagReason?: 'unsupported_claim' | 'omitted_fact' | 'altered_equation' | 'terminology_mismatch';
}

export interface MeaningPreservationReport {
  overallFidelityScore: number;
  factRetentionRate: number;
  equationIntegrityRate: number;
  conditionAccuracyRate: number;
  terminologyConsistencyRate: number;
  unsupportedClaimsDetected: number;
  alteredEquationsDetected: number;
  missingConditionsDetected: number;
  factChecks: PreservedFactCheck[];
  lastAuditDate: string;
  verifiedByEngine: boolean;
}

export interface AcademicDocument {
  id: string;
  title: string;
  author: string;
  institution?: string;
  year?: string;
  fileType: DocumentFileType;
  fileSizeMb?: number;
  category: 'Computer Science' | 'Physics & Quantum' | 'Distributed Systems' | 'Mathematics' | 'Bioinformatics' | 'General';
  uploadDate: string;
  pageCount: number;
  wordCount: number;
  summary: string;
  processingStatus: 'idle' | 'extracting' | 'structuring' | 'verifying' | 'ready' | 'error' | 'warning';
  extractionStatus?: ExtractionUserStatus;
  extractionWarnings?: string[];
  extractionQuality?: ExtractionQualityReport;
  sections: DocumentSection[];
  topicHierarchy?: DocumentTopicHierarchy;
  conceptMap: ConceptMapData;
  explanations: ExplanationLevel[];
  pageWiseExplanations?: PageWiseExplanation[];
  flashcards: Flashcard[];
  audioLesson: AudioLesson;
  meaningPreservation: MeaningPreservationReport;
  lastStudiedAt?: string;
  studyProgressPercent?: number;
}

export interface SavedItem {
  id: string;
  documentId: string;
  documentTitle: string;
  type: 'flashcard' | 'concept_map' | 'notes' | 'quiz' | 'source_passage';
  title: string;
  content: string;
  savedAt: string;
  citation?: SourceCitation;
}

export interface LecturerCourse {
  id: string;
  code: string;
  title: string;
  studentCount: number;
  documentIds: string[];
  isPublished: boolean;
  averageQuizScore: number;
}

export interface UserPreferences {
  role: Role;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  isDyslexicFont: boolean;
  isHighContrast: boolean;
  preferredLanguage: AppLanguage;
  preferredFormatsBySubject: Record<string, string[]>;
  audioSpeed: number;
  voiceGender: 'male' | 'female';
  privacyAnalyticsConsent: boolean;
}

export interface FeedbackReport {
  id: string;
  documentId: string;
  formatType: string;
  itemIdentifier: string;
  reason: 'altered_equation' | 'missing_condition' | 'unclear_explanation' | 'hallucination' | 'other';
  userComment: string;
  reportedAt: string;
  status: 'pending' | 'resolved';
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface FormatVerificationResult {
  formatType: string;
  language: AppLanguage;
  status: 'verified' | 'needs_review' | 'unable_to_verify';
  overallScore: number;
  totalElementsChecked: number;
  verifiedElementsCount: number;
  unsupportedClaimsCount: number;
  alteredEquationsCount: number;
  omittedConditionsCount: number;
  itemizedChecks: {
    elementId: string;
    label: string;
    claimText: string;
    matchedSourcePage: number;
    matchedSourceSection: string;
    status: 'verified' | 'needs_review' | 'unable_to_verify';
    explanation: string;
    citationId: string;
    isExternalContext?: boolean;
  }[];
  auditTimestamp: string;
}

export interface GeneratorTestCheckItem {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  score: number;
  details: string;
  targetFormat: string;
  testedLanguages: string[];
}

export interface GeneratorTestSuiteResult {
  documentId: string;
  documentTitle: string;
  overallPassed: boolean;
  passedChecksCount: number;
  totalChecksCount: number;
  scorePercent: number;
  executedAt: string;
  checks: GeneratorTestCheckItem[];
}

export interface VerificationMetricReport {
  errorDetectionRate: number;
  falseAlarmRate: number;
  sourceLinkAccuracy: number;
  equationDetectionPerformance: number;
  coverage: number;
  totalTestCases: number;
  annotatedBreakdown: {
    language: 'English' | 'Kannada' | 'Hindi';
    category: 'altered_equation' | 'omitted_condition' | 'valid_paraphrase' | 'unsupported_claim' | 'grounded_statement';
    testPrompt: string;
    expectedFlagged: boolean;
    systemFlagged: boolean;
    isCorrectVerdict: boolean;
    notes: string;
  }[];
  checklist: {
    id: string;
    title: string;
    passed: boolean;
    details: string;
  }[];
  executedAt: string;
}

export interface IntegrationCheckItem {
  id: string;
  stepNumber: number;
  name: string;
  description: string;
  passed: boolean;
  latencyMs: number;
  details: string;
}

export interface IntegrationSuiteResult {
  overallPassed: boolean;
  passedCount: number;
  totalCount: number;
  scorePercent: number;
  executedAt: string;
  checks: IntegrationCheckItem[];
}
