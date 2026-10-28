import fs from 'fs';
import path from 'path';
import {
  UserRecord,
  DocumentRecord,
  ExtractedSectionRecord,
  GeneratedMaterialRecord,
  VerificationResultRecord,
  SavedItemRecord,
  QuizAttemptRecord,
  CourseSharingRecord
} from './schema';

const DB_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

interface DatabaseStore {
  users: UserRecord[];
  documents: DocumentRecord[];
  extractedSections: ExtractedSectionRecord[];
  generatedMaterials: GeneratedMaterialRecord[];
  verificationResults: VerificationResultRecord[];
  savedItems: SavedItemRecord[];
  quizAttempts: QuizAttemptRecord[];
  courses: CourseSharingRecord[];
}

export class Database {
  private static store: DatabaseStore = {
    users: [],
    documents: [],
    extractedSections: [],
    generatedMaterials: [],
    verificationResults: [],
    savedItems: [],
    quizAttempts: [],
    courses: []
  };

  private static initialized = false;

  static init(): void {
    if (this.initialized) return;

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.store = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed reading database file, initializing seeds:', e);
        this.seedInitialData();
        this.persist();
      }
    } else {
      this.seedInitialData();
      this.persist();
    }

    this.initialized = true;
  }

  private static persist(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Database persist error:', e);
    }
  }

  private static seedInitialData(): void {
    // 1. Seed Users
    this.store.users = [
      {
        id: 'usr-student-1',
        email: 'alex.rivera@university.edu',
        name: 'Alex Rivera',
        role: 'student',
        createdAt: '2026-10-01T10:00:00Z'
      },
      {
        id: 'usr-lecturer-1',
        email: 'prof.ramesh@iisc.ac.in',
        name: 'Prof. Ramesh K.',
        role: 'lecturer',
        createdAt: '2026-09-15T09:00:00Z'
      }
    ];

    // 2. Seed Documents
    this.store.documents = [
      {
        id: 'doc-transformer-attention',
        ownerId: 'usr-student-1',
        title: 'Attention Is All You Need',
        author: 'Ashish Vaswani et al. (Google Brain & Research)',
        institution: 'Google Research / NeurIPS 2017',
        year: '2017',
        fileType: 'pdf',
        fileSizeMb: 2.4,
        originalFileName: 'transformer_attention.pdf',
        category: 'Computer Science',
        uploadDate: '2026-10-24',
        processingStatus: 'completed',
        extractionStatus: 'ready',
        extractionWarnings: [],
        extractionQuality: {
          userStatus: 'ready',
          textCompletenessScore: 100,
          ocrConfidenceScore: 100,
          equationIntegrityScore: 100,
          structurePreservationScore: 100,
          sourceTraceabilityScore: 100,
          diagnostics: [],
          hasScannedPages: false,
          scannedPageNumbers: [],
          testedAgainstBenchmark: true
        },
        pageCount: 15,
        wordCount: 5420,
        summary: 'Proposes the Transformer network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.'
      },
      {
        id: 'doc-quantum-schrodinger',
        ownerId: 'usr-student-1',
        title: 'Wave Mechanics and Schrödinger Formulation',
        author: 'Erwin Schrödinger',
        institution: 'University of Zurich / Physical Foundations',
        year: '1926',
        fileType: 'pptx',
        fileSizeMb: 5.1,
        originalFileName: 'quantum_wave_mechanics.pptx',
        category: 'Physics & Quantum',
        uploadDate: '2026-10-22',
        processingStatus: 'completed',
        extractionStatus: 'ready',
        extractionWarnings: [],
        extractionQuality: {
          userStatus: 'ready',
          textCompletenessScore: 100,
          ocrConfidenceScore: 100,
          equationIntegrityScore: 100,
          structurePreservationScore: 98,
          sourceTraceabilityScore: 100,
          diagnostics: [],
          hasScannedPages: false,
          scannedPageNumbers: [],
          testedAgainstBenchmark: true
        },
        pageCount: 18,
        wordCount: 6100,
        summary: 'Derivation of the non-relativistic time-dependent wave equation, establishing state vectors and the Born probability interpretation.'
      },
      {
        id: 'doc-raft-consensus',
        ownerId: 'usr-student-1',
        title: 'In Search of an Understandable Consensus Algorithm (Raft)',
        author: 'Diego Ongaro & John Ousterhout',
        institution: 'Stanford University / USENIX ATC',
        year: '2014',
        fileType: 'pdf',
        fileSizeMb: 1.8,
        originalFileName: 'raft_consensus.pdf',
        category: 'Distributed Systems',
        uploadDate: '2026-10-18',
        processingStatus: 'completed',
        extractionWarnings: [],
        pageCount: 18,
        wordCount: 7800,
        summary: 'Consensus algorithm dividing replicated log agreement into Leader Election, Log Replication, and Safety.'
      },
      {
        id: 'doc-scanned-calculus-notes',
        ownerId: 'usr-student-1',
        title: 'Lecture 04: Vector Fields & Multivariable Calculus (Handwritten)',
        author: 'Prof. Ramesh K. (IISc Bangalore)',
        institution: 'Department of Mathematics',
        year: '2026',
        fileType: 'scanned_notes',
        fileSizeMb: 8.9,
        originalFileName: 'calculus_lecture_notes.pdf',
        category: 'Mathematics',
        uploadDate: '2026-10-27',
        processingStatus: 'warning',
        extractionStatus: 'needs_review',
        extractionWarnings: [
          'Page 4: Low optical resolution on handwritten boundary formulas. Contrast: 42%.',
          'Page 5: Surface equation curl(F) · n dS smudged; flagged for lecturer review.'
        ],
        extractionQuality: {
          userStatus: 'needs_review',
          textCompletenessScore: 92,
          ocrConfidenceScore: 76,
          equationIntegrityScore: 84,
          structurePreservationScore: 90,
          sourceTraceabilityScore: 95,
          diagnostics: [
            {
              id: 'diag-ocr-calc-1',
              pageNumber: 4,
              type: 'low_contrast',
              severity: 'warning',
              message: 'Low optical resolution on handwritten boundary formulas. Contrast: 42%.',
              flaggedSnippet: 'Handwritten line integral boundary orientation ∮_C',
              recommendation: 'Verify equation in Source Verification tab before student review.'
            },
            {
              id: 'diag-ocr-calc-2',
              pageNumber: 5,
              type: 'broken_equation',
              severity: 'warning',
              message: 'Surface integral curl(F) · n dS contains partial smudge.',
              flaggedSnippet: '∬_S (∇ × F) · dS',
              recommendation: 'Check equation against standard textbook definition.'
            }
          ],
          hasScannedPages: true,
          scannedPageNumbers: [1, 2, 3, 4, 5, 6],
          testedAgainstBenchmark: true
        },
        pageCount: 6,
        wordCount: 1840,
        summary: 'Handwritten course notes covering Green theorem, curl, and flux divergence in R^3.'
      }
    ];

    // 3. Seed Extracted Sections
    this.store.extractedSections = [
      {
        id: 'sec-1',
        documentId: 'doc-transformer-attention',
        pageNumber: 3,
        title: '3.2.1 Scaled Dot-Product Attention',
        content: 'Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V. Scaling by 1/sqrt(d_k) prevents vanishing gradients in softmax.',
        equations: [
          {
            latex: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
            label: 'Equation (1)',
            meaning: 'Scaled dot-product attention calculation.'
          }
        ],
        definitions: [
          {
            term: 'Scaled Dot-Product Attention',
            definition: 'Attention mechanism computing normalized scalar compatibility weights between queries and keys.'
          }
        ],
        conditions: [
          'Keys and queries must have identical dimension d_k.',
          'Scaling factor 1 / sqrt(d_k) is mandatory when d_k is large to prevent vanishing softmax gradients.'
        ],
        examples: [
          'If d_k = 64, divisor is 8.0, scaling dot product down before exponentiation.'
        ]
      },
      {
        id: 'sec-quantum-1',
        documentId: 'doc-quantum-schrodinger',
        slideNumber: 1,
        pageNumber: 1,
        title: 'Slide 1: Postulates of Quantum Mechanics',
        content: 'The state of a physical system is completely specified by a state vector |psi> in a complex Hilbert space H. Measurable physical quantities correspond to Hermitian operators.',
        speakerNotes: 'Remind students that normalization <psi|psi> = 1 is strictly required.',
        equations: [
          {
            latex: 'i\\hbar \\frac{\\partial}{\\partial t} |\\psi(t)\\rangle = \\hat{H} |\\psi(t)\\rangle',
            label: 'Schrodinger Equation',
            meaning: 'Time evolution of quantum state vector.'
          }
        ],
        conditions: [
          'State vector must remain normalized to 1 across unitary time evolution.',
          'Hamiltonian operator H must be Hermitian to ensure real energy eigenvalues.'
        ],
        definitions: [
          {
            term: 'Hermitian Operator',
            definition: 'A linear operator that is equal to its own conjugate transpose.'
          }
        ]
      },
      {
        id: 'sec-calc-1',
        documentId: 'doc-scanned-calculus-notes',
        pageNumber: 2,
        title: '2. Vector Fields & Green Theorem',
        content: 'Let C be a positively oriented, piecewise-smooth, simple closed curve in a plane, and let D be the region bounded by C. Then line integral ∮_C (P dx + Q dy) = ∬_D (dQ/dx - dP/dy) dA.',
        conditions: [
          'Curve C must be simple, closed, and oriented counter-clockwise.',
          'P and Q must have continuous first-order partial derivatives on open region containing D.'
        ]
      }
    ];

    // 4. Seed Verification Results
    this.store.verificationResults = [
      {
        documentId: 'doc-transformer-attention',
        overallFidelityScore: 99.1,
        factRetentionRate: 100,
        equationIntegrityRate: 100,
        conditionAccuracyRate: 98.2,
        terminologyConsistencyRate: 99.5,
        unsupportedClaimsDetected: 0,
        alteredEquationsDetected: 0,
        missingConditionsDetected: 0,
        lastAuditDate: '2026-10-28 19:30 UTC',
        verifiedByEngine: true,
        factChecks: [
          {
            id: 'chk-1',
            documentId: 'doc-transformer-attention',
            originalFact: 'Scaled Dot-Product formula requires division by sqrt(d_k) to prevent vanishing softmax gradients.',
            originalQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax into regions with extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).',
            pageNumber: 3,
            formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards', 'Audio'],
            status: 'fully_preserved',
            confidenceScore: 100,
            notes: 'Equation formula and causal condition preserved without alteration.'
          },
          {
            id: 'chk-2',
            documentId: 'doc-transformer-attention',
            originalFact: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.',
            originalQuote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.',
            pageNumber: 4,
            formatFound: ['Concept Map', 'Notes', 'Flashcards', 'Quiz'],
            status: 'fully_preserved',
            confidenceScore: 98,
            notes: 'Multi-perspective projection mechanism grounded verbatim in Section 3.2.2.'
          },
          {
            id: 'chk-3',
            documentId: 'doc-transformer-attention',
            originalFact: 'Positional encodings must share the exact dimension d_model with token embeddings so they can be summed directly.',
            originalQuote: 'The positional encodings have the same dimension d_model as the embeddings, so that the two can be summed.',
            pageNumber: 6,
            formatFound: ['Notes', 'Flashcards', 'Worked Examples'],
            status: 'fully_preserved',
            confidenceScore: 100,
            notes: 'Dimensionality invariant verified across Equation (3) and (4).'
          },
          {
            id: 'chk-4',
            documentId: 'doc-transformer-attention',
            originalFact: 'The Transformer architecture eschews recurrence and convolutions entirely, enabling sequence parallelization on GPU.',
            originalQuote: 'We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies.',
            pageNumber: 2,
            formatFound: ['Concept Map', 'Simplified', 'Notes', 'Audio'],
            status: 'fully_preserved',
            confidenceScore: 99,
            notes: 'Non-recurrent architectural thesis verified.'
          }
        ]
      },
      {
        documentId: 'doc-scanned-calculus-notes',
        overallFidelityScore: 91.2,
        factRetentionRate: 91,
        equationIntegrityRate: 84,
        conditionAccuracyRate: 88.0,
        terminologyConsistencyRate: 94.0,
        unsupportedClaimsDetected: 1,
        alteredEquationsDetected: 1,
        missingConditionsDetected: 1,
        lastAuditDate: '2026-10-28 20:00 UTC',
        verifiedByEngine: false,
        factChecks: [
          {
            id: 'chk-calc-1',
            documentId: 'doc-scanned-calculus-notes',
            originalFact: 'Green Theorem relates line integrals around closed boundary curve C to double integrals over plane region D.',
            originalQuote: 'Let C be a positively oriented, piecewise-smooth, simple closed curve in a plane, and let D be the region bounded by C.',
            pageNumber: 2,
            formatFound: ['Notes', 'Flashcards'],
            status: 'fully_preserved',
            confidenceScore: 95,
            notes: 'Orientation and smoothness conditions verified in handwritten notes.'
          },
          {
            id: 'chk-calc-2',
            documentId: 'doc-scanned-calculus-notes',
            originalFact: 'Surface integral curl(F) · n dS requires smooth boundary orientation along vector normal n.',
            originalQuote: 'Surface integral equation curl(F) · n dS flagged: optical contrast on handwritten script was 42%.',
            pageNumber: 4,
            formatFound: ['Notes', 'Worked Examples'],
            status: 'needs_review',
            confidenceScore: 76,
            notes: 'Flagged: Optical character recognition uncertainty on handwritten vector curl symbol. Lecturer review recommended.',
            flagReason: 'altered_equation'
          }
        ]
      },
      {
        documentId: 'doc-quantum-schrodinger',
        overallFidelityScore: 98.7,
        factRetentionRate: 99,
        equationIntegrityRate: 100,
        conditionAccuracyRate: 98.0,
        terminologyConsistencyRate: 99.0,
        unsupportedClaimsDetected: 0,
        alteredEquationsDetected: 0,
        missingConditionsDetected: 0,
        lastAuditDate: '2026-10-28 20:15 UTC',
        verifiedByEngine: true,
        factChecks: [
          {
            id: 'chk-q-1',
            documentId: 'doc-quantum-schrodinger',
            originalFact: 'Time-dependent wave function evolution is governed by i * hbar * d(Psi)/dt = H * Psi.',
            originalQuote: 'The fundamental postulate represents state evolution via unitary Hamiltonian operator H.',
            pageNumber: 2,
            formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards'],
            status: 'fully_preserved',
            confidenceScore: 100,
            notes: 'Planck constant factor and imaginary unit verified.'
          }
        ]
      },
      {
        documentId: 'doc-raft-consensus',
        overallFidelityScore: 99.4,
        factRetentionRate: 100,
        equationIntegrityRate: 100,
        conditionAccuracyRate: 99.0,
        terminologyConsistencyRate: 99.2,
        unsupportedClaimsDetected: 0,
        alteredEquationsDetected: 0,
        missingConditionsDetected: 0,
        lastAuditDate: '2026-10-28 20:30 UTC',
        verifiedByEngine: true,
        factChecks: [
          {
            id: 'chk-raft-1',
            documentId: 'doc-raft-consensus',
            originalFact: 'Leader election uses randomized election timeouts to prevent split votes.',
            originalQuote: 'Raft uses randomized election timeouts to ensure that split-vote scenarios are resolved quickly.',
            pageNumber: 4,
            formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards', 'Quiz'],
            status: 'fully_preserved',
            confidenceScore: 100,
            notes: 'Leader election safety verified against source specifications.'
          }
        ]
      }
    ];

    // 5. Seed Saved Items
    this.store.savedItems = [
      {
        id: 'saved-item-1',
        userId: 'usr-student-1',
        documentId: 'doc-transformer-attention',
        documentTitle: 'Attention Is All You Need',
        type: 'flashcard',
        title: 'Why divide by √d_k in Attention?',
        content: 'For large key dimension d_k, dot products grow large pushing softmax into regions with vanishing gradients.',
        savedAt: '2026-10-27 16:10',
        citation: {
          id: 'cite-s1',
          documentId: 'doc-transformer-attention',
          pageNumber: 3,
          sectionTitle: '3.2.1 Scaled Dot-Product Attention',
          exactQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude...',
          contextSnippet: 'To counteract this effect, we scale by 1 / sqrt(d_k).'
        }
      }
    ];

    // 6. Seed Courses
    this.store.courses = [
      {
        id: 'course-cs482',
        lecturerId: 'usr-lecturer-1',
        code: 'CS 482 / 682',
        title: 'Deep Learning & Neural Architectures',
        studentCount: 142,
        documentIds: ['doc-transformer-attention'],
        isPublished: true,
        averageQuizScore: 88.5
      },
      {
        id: 'course-phys301',
        lecturerId: 'usr-lecturer-1',
        code: 'PHYS 301',
        title: 'Quantum Mechanics & Hilbert Spaces',
        studentCount: 86,
        documentIds: ['doc-quantum-schrodinger'],
        isPublished: true,
        averageQuizScore: 91.2
      }
    ];
  }

  // --- Users Operations ---
  static findUserById(id: string): UserRecord | undefined {
    this.init();
    return this.store.users.find(u => u.id === id);
  }

  static findUserByEmail(email: string): UserRecord | undefined {
    this.init();
    return this.store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static createUser(user: UserRecord): UserRecord {
    this.init();
    this.store.users.push(user);
    this.persist();
    return user;
  }

  // --- Document Operations ---
  static getDocuments(ownerId?: string, role?: string): DocumentRecord[] {
    this.init();
    if (role === 'lecturer') {
      return this.store.documents; // Lecturers have course-wide review access
    }
    if (ownerId) {
      return this.store.documents.filter(d => d.ownerId === ownerId);
    }
    return this.store.documents;
  }

  static getDocumentById(id: string): DocumentRecord | undefined {
    this.init();
    return this.store.documents.find(d => d.id === id);
  }

  static createDocument(doc: DocumentRecord): DocumentRecord {
    this.init();
    this.store.documents.unshift(doc);
    this.persist();
    return doc;
  }

  static updateDocumentStatus(id: string, status: DocumentRecord['processingStatus'], warnings: string[] = []): void {
    this.init();
    const doc = this.store.documents.find(d => d.id === id);
    if (doc) {
      doc.processingStatus = status;
      if (warnings.length > 0) {
        doc.extractionWarnings = warnings;
      }
      this.persist();
    }
  }

  static renameDocument(id: string, newTitle: string): DocumentRecord | undefined {
    this.init();
    const doc = this.store.documents.find(d => d.id === id);
    if (doc) {
      doc.title = newTitle;
      this.persist();
      return doc;
    }
    return undefined;
  }

  static deleteDocument(id: string): boolean {
    this.init();
    const initialLen = this.store.documents.length;
    this.store.documents = this.store.documents.filter(d => d.id !== id);
    if (this.store.documents.length < initialLen) {
      // Cascade delete associated records
      this.store.extractedSections = this.store.extractedSections.filter(s => s.documentId !== id);
      this.store.generatedMaterials = this.store.generatedMaterials.filter(m => m.documentId !== id);
      this.store.verificationResults = this.store.verificationResults.filter(v => v.documentId !== id);
      this.store.savedItems = this.store.savedItems.filter(s => s.documentId !== id);
      this.store.quizAttempts = this.store.quizAttempts.filter(q => q.documentId !== id);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Extracted Sections ---
  static getSectionsByDocId(documentId: string): ExtractedSectionRecord[] {
    this.init();
    return this.store.extractedSections.filter(s => s.documentId === documentId);
  }

  static saveSections(documentId: string, sections: ExtractedSectionRecord[]): void {
    this.init();
    this.store.extractedSections = this.store.extractedSections.filter(s => s.documentId !== documentId);
    this.store.extractedSections.push(...sections);
    this.persist();
  }

  // --- Generated Materials ---
  static getMaterialsByDocId(documentId: string): GeneratedMaterialRecord[] {
    this.init();
    return this.store.generatedMaterials.filter(m => m.documentId === documentId);
  }

  static getMaterial(documentId: string, formatType: string, language: string): GeneratedMaterialRecord | undefined {
    this.init();
    return this.store.generatedMaterials.find(
      m => m.documentId === documentId && m.formatType === formatType && m.language === language
    );
  }

  static saveMaterial(mat: GeneratedMaterialRecord): void {
    this.init();
    this.store.generatedMaterials = this.store.generatedMaterials.filter(
      m => !(m.documentId === mat.documentId && m.formatType === mat.formatType && m.language === mat.language)
    );
    this.store.generatedMaterials.push(mat);
    this.persist();
  }

  // --- Verification Results ---
  static getVerification(documentId: string): VerificationResultRecord | undefined {
    this.init();
    return this.store.verificationResults.find(v => v.documentId === documentId);
  }

  static saveVerification(result: VerificationResultRecord): void {
    this.init();
    this.store.verificationResults = this.store.verificationResults.filter(v => v.documentId !== result.documentId);
    this.store.verificationResults.push(result);
    this.persist();
  }

  // --- Saved Items ---
  static getSavedItems(userId: string): SavedItemRecord[] {
    this.init();
    return this.store.savedItems.filter(s => s.userId === userId);
  }

  static addSavedItem(item: SavedItemRecord): void {
    this.init();
    if (!this.store.savedItems.some(i => i.id === item.id)) {
      this.store.savedItems.unshift(item);
      this.persist();
    }
  }

  static removeSavedItem(id: string, userId: string): boolean {
    this.init();
    const len = this.store.savedItems.length;
    this.store.savedItems = this.store.savedItems.filter(s => !(s.id === id && s.userId === userId));
    if (this.store.savedItems.length < len) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Quiz Attempts ---
  static recordQuizAttempt(attempt: QuizAttemptRecord): void {
    this.init();
    this.store.quizAttempts.unshift(attempt);
    this.persist();
  }

  static getQuizAttempts(userId: string, documentId?: string): QuizAttemptRecord[] {
    this.init();
    return this.store.quizAttempts.filter(
      q => q.userId === userId && (!documentId || q.documentId === documentId)
    );
  }

  // --- Course Sharing (Lecturer) ---
  static getCourses(lecturerId?: string): CourseSharingRecord[] {
    this.init();
    if (lecturerId) {
      return this.store.courses.filter(c => c.lecturerId === lecturerId);
    }
    return this.store.courses;
  }

  static toggleCoursePublish(courseId: string): CourseSharingRecord | undefined {
    this.init();
    const course = this.store.courses.find(c => c.id === courseId);
    if (course) {
      course.isPublished = !course.isPublished;
      this.persist();
      return course;
    }
    return undefined;
  }
}
