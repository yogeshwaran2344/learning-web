export type Role = 'student' | 'lecturer';
export type AppLanguage = 'English' | 'Kannada' | 'Hindi';
export type DocumentFileType = 'pdf' | 'pptx' | 'scanned_notes';
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'warning';
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

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: Role;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  ownerId: string;
  title: string;
  author: string;
  institution?: string;
  year?: string;
  fileType: DocumentFileType;
  fileSizeMb: number;
  originalFileName: string;
  storagePath?: string;
  category: 'Computer Science' | 'Physics & Quantum' | 'Distributed Systems' | 'Mathematics' | 'Bioinformatics' | 'General';
  uploadDate: string;
  processingStatus: ProcessingStatus;
  extractionStatus: ExtractionUserStatus;
  extractionWarnings: string[];
  extractionQuality?: ExtractionQualityReport;
  pageCount: number;
  wordCount: number;
  summary: string;
}

export interface ExtractedSectionRecord {
  id: string;
  documentId: string;
  pageNumber: number;
  slideNumber?: number;
  chapterTitle?: string;
  title: string;
  content: string;
  speakerNotes?: string;
  equations: { latex: string; label: string; meaning: string; isFlagged?: boolean }[];
  tables?: { caption: string; headers: string[]; rows: string[][] }[];
  definitions: { term: string; definition: string; conditions?: string }[];
  conditions: string[];
  examples: string[];
  uncertainSymbols?: string[];
}

export interface SourceCitationRecord {
  id: string;
  documentId: string;
  pageNumber: number;
  slideNumber?: number;
  sectionTitle: string;
  exactQuote: string;
  contextSnippet: string;
}

export interface GeneratedMaterialRecord {
  id: string;
  documentId: string;
  formatType: 'map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz';
  language: AppLanguage;
  content: any;
  generatedAt: string;
}

export interface PreservedFactCheckRecord {
  id: string;
  documentId: string;
  originalFact: string;
  originalQuote: string;
  pageNumber: number;
  formatFound: string[];
  status: 'fully_preserved' | 'partially_preserved' | 'needs_review' | 'unable_to_verify';
  confidenceScore: number;
  notes: string;
  flagReason?: 'unsupported_claim' | 'omitted_fact' | 'altered_equation' | 'terminology_mismatch';
}

export interface VerificationResultRecord {
  documentId: string;
  overallFidelityScore: number;
  factRetentionRate: number;
  equationIntegrityRate: number;
  conditionAccuracyRate: number;
  terminologyConsistencyRate: number;
  unsupportedClaimsDetected: number;
  alteredEquationsDetected: number;
  missingConditionsDetected: number;
  lastAuditDate: string;
  verifiedByEngine: boolean;
  factChecks: PreservedFactCheckRecord[];
}

export interface SavedItemRecord {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  type: 'flashcard' | 'concept_map' | 'notes' | 'quiz' | 'source_passage';
  title: string;
  content: string;
  savedAt: string;
  citation?: SourceCitationRecord;
}

export interface QuizAttemptRecord {
  id: string;
  userId: string;
  documentId: string;
  score: number;
  totalQuestions: number;
  answers: { questionId: string; selectedOption: number; isCorrect: boolean }[];
  attemptedAt: string;
}

export interface CourseSharingRecord {
  id: string;
  lecturerId: string;
  code: string;
  title: string;
  studentCount: number;
  documentIds: string[];
  isPublished: boolean;
  averageQuizScore: number;
}
