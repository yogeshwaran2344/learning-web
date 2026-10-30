import { AcademicDocument, UserPreferences, FeedbackReport, SavedItem, LecturerCourse } from '../types';
import { SAMPLE_DOCUMENTS, INITIAL_SAVED_ITEMS, INITIAL_COURSES } from '../data/sampleDocuments';

const STORAGE_KEYS = {
  DOCUMENTS: 'learnova_documents_v2',
  PREFERENCES: 'learnova_preferences_v2',
  FEEDBACK: 'learnova_feedback_v2',
  SAVED_ITEMS: 'learnova_saved_items_v2',
  COURSES: 'learnova_courses_v2'
};

const LEGACY_STORAGE_KEYS = {
  DOCUMENTS: 'learnlens_documents_v2',
  PREFERENCES: 'learnlens_preferences_v2',
  FEEDBACK: 'learnlens_feedback_v2',
  SAVED_ITEMS: 'learnlens_saved_items_v2',
  COURSES: 'learnlens_courses_v2'
};

const DEFAULT_PREFERENCES: UserPreferences = {
  role: 'student',
  fontSize: 'md',
  isDyslexicFont: false,
  isHighContrast: false,
  preferredLanguage: 'English',
  preferredFormatsBySubject: {
    'Computer Science': ['Concept Map', 'Simplified', 'Flashcards', 'Worked Examples'],
    'Physics & Quantum': ['Concept Map', 'Original', 'Notes', 'Audio'],
    'Distributed Systems': ['Simplified', 'Flashcards', 'Practice Quiz'],
    'General': ['Simplified', 'Concept Map']
  },
  audioSpeed: 1.0,
  voiceGender: 'female',
  privacyAnalyticsConsent: true
};

export class StorageService {
  static sanitizeDocument(doc: any): AcademicDocument {
    if (!doc) return SAMPLE_DOCUMENTS[0];
    return {
      ...doc,
      title: doc.title || 'Untitled Document',
      author: doc.author || 'Academic Author',
      summary: doc.summary || 'Summary unavailable.',
      category: doc.category || 'Computer Science',
      fileType: doc.fileType || 'pdf',
      pageCount: doc.pageCount || 1,
      sections: Array.isArray(doc.sections) ? doc.sections : [],
      flashcards: Array.isArray(doc.flashcards) ? doc.flashcards : [],
      explanations: Array.isArray(doc.explanations) && doc.explanations.length > 0
        ? doc.explanations
        : [{
            title: doc.title || 'Overview',
            summary: doc.summary || '',
            intuitiveAnalogy: 'Conceptual overview of study material.',
            rigorousBreakdown: 'Detailed academic decomposition.',
            workedExample: 'Step 1: Inspect condition.\nStep 2: Apply invariant rule.',
            keyTakeaways: ['Preserve core definitions', 'Audit formulas'],
            citations: []
          }],
      extractionWarnings: Array.isArray(doc.extractionWarnings) ? doc.extractionWarnings : [],
      meaningPreservation: doc.meaningPreservation || {
        overallFidelityScore: 0,
        factRetentionRate: 0,
        equationIntegrityRate: 0,
        conditionAccuracyRate: 0,
        terminologyConsistencyRate: 0,
        unsupportedClaimsDetected: 0,
        alteredEquationsDetected: 0,
        missingConditionsDetected: 0,
        lastAuditDate: '',
        verifiedByEngine: false,
        factChecks: []
      },
      conceptMap: doc.conceptMap || {
        nodes: [{ id: 'core', label: doc.title || 'Core Concept', group: 'core' }],
        links: []
      },
      audioLesson: doc.audioLesson || {
        title: doc.title || 'Audio Lecture',
        totalDurationSeconds: 120,
        keyAuditoryTakeaway: 'Master the fundamental principles.',
        segments: []
      }
    };
  }

  static getDocuments(): AcademicDocument[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS) || localStorage.getItem(LEGACY_STORAGE_KEYS.DOCUMENTS);
      if (raw === null) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Deduplicate by ID
      const seen = new Set<string>();
      const deduped = parsed.filter(d => {
        if (!d || !d.id || seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
      return deduped.map(this.sanitizeDocument);
    } catch (e) {
      console.warn('Failed to load documents from storage:', e);
      return [];
    }
  }

  static loadSampleDocuments(): void {
    this.saveDocuments(SAMPLE_DOCUMENTS);
    this.saveSavedItems(INITIAL_SAVED_ITEMS);
    this.saveCourses(INITIAL_COURSES);
  }

  static clearAllData(): void {
    this.saveDocuments([]);
    this.saveSavedItems([]);
    this.saveCourses([]);
  }

  static saveDocuments(documents: AcademicDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents to localStorage:', e);
    }
  }

  static getDocumentById(id: string): AcademicDocument | undefined {
    const docs = this.getDocuments();
    return docs.find(d => d.id === id);
  }

  static addDocument(doc: AcademicDocument): void {
    const docs = this.getDocuments();
    const updated = [doc, ...docs.filter(d => d.id !== doc.id)];
    this.saveDocuments(updated);
  }

  static renameDocument(id: string, newTitle: string): void {
    const docs = this.getDocuments();
    const target = docs.find(d => d.id === id);
    if (target) {
      target.title = newTitle;
      this.saveDocuments(docs);
    }
  }

  static deleteDocument(id: string): void {
    const docs = this.getDocuments();
    const filtered = docs.filter(d => d.id !== id);
    this.saveDocuments(filtered);
    // Also remove from saved items
    const saved = this.getSavedItems().filter(s => s.documentId !== id);
    this.saveSavedItems(saved);
  }

  static updateFlashcardMastery(docId: string, cardId: string, newLevel: number): void {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    const card = doc.flashcards.find(c => c.id === cardId);
    if (card) {
      card.masteryLevel = newLevel;
      card.lastReviewed = new Date().toISOString();
      this.saveDocuments(docs);
    }
  }

  static getPreferences(): UserPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES) || localStorage.getItem(LEGACY_STORAGE_KEYS.PREFERENCES);
      if (!raw) return DEFAULT_PREFERENCES;
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  static savePreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }

  static getSavedItems(): SavedItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_ITEMS) || localStorage.getItem(LEGACY_STORAGE_KEYS.SAVED_ITEMS);
      if (raw === null) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      return parsed.filter(i => {
        if (!i || !i.id || seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
    } catch {
      return [];
    }
  }

  static saveSavedItems(items: SavedItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save saved items:', e);
    }
  }

  static addSavedItem(item: SavedItem): void {
    const items = this.getSavedItems();
    if (!items.some(i => i.id === item.id)) {
      items.unshift(item);
      this.saveSavedItems(items);
    }
  }

  static removeSavedItem(id: string): void {
    const items = this.getSavedItems().filter(i => i.id !== id);
    this.saveSavedItems(items);
  }

  static getCourses(): LecturerCourse[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COURSES) || localStorage.getItem(LEGACY_STORAGE_KEYS.COURSES);
      if (raw === null) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      return parsed.filter(c => {
        if (!c || !c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    } catch {
      return [];
    }
  }

  static saveCourses(courses: LecturerCourse[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    } catch (e) {
      console.error('Failed to save courses:', e);
    }
  }

  static toggleCoursePublish(courseId: string): void {
    const courses = this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.isPublished = !course.isPublished;
      this.saveCourses(courses);
    }
  }

  static getFeedbackReports(): FeedbackReport[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FEEDBACK) || localStorage.getItem(LEGACY_STORAGE_KEYS.FEEDBACK);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveFeedbackReport(report: FeedbackReport): void {
    const reports = this.getFeedbackReports();
    reports.unshift(report);
    try {
      localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to save feedback report:', e);
    }
  }

  static resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.FEEDBACK);
    localStorage.removeItem(STORAGE_KEYS.SAVED_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    this.saveDocuments(SAMPLE_DOCUMENTS);
    this.saveSavedItems(INITIAL_SAVED_ITEMS);
    this.saveCourses(INITIAL_COURSES);
  }
}
