import DatabaseConstructor, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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
const DB_FILE = path.join(DB_DIR, 'learnlens.db');
const JSON_BACKUP_FILE = path.join(DB_DIR, 'database.json');

export interface ProcessingJobRecord {
  id: string;
  documentId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export class Database {
  private static db: DatabaseType | null = null;
  private static initialized = false;

  static init(): void {
    if (this.initialized && this.db) return;

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    try {
      this.db = new DatabaseConstructor(DB_FILE);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      this.createTables();
      this.migrateFromJsonIfEmpty();
      this.seedDefaultUsers();
      this.initialized = true;
    } catch (err) {
      console.error('[Database] Failed initializing SQLite database:', err);
      throw err;
    }
  }

  private static createTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        ownerId TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        institution TEXT,
        year TEXT,
        fileType TEXT NOT NULL,
        fileSizeMb REAL NOT NULL,
        originalFileName TEXT NOT NULL,
        storagePath TEXT,
        category TEXT NOT NULL,
        uploadDate TEXT NOT NULL,
        processingStatus TEXT NOT NULL,
        extractionStatus TEXT NOT NULL,
        extractionWarnings TEXT,
        extractionQuality TEXT,
        pageCount INTEGER NOT NULL,
        wordCount INTEGER NOT NULL,
        summary TEXT,
        FOREIGN KEY (ownerId) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS extracted_sections (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        pageNumber INTEGER NOT NULL,
        slideNumber INTEGER,
        chapterTitle TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        speakerNotes TEXT,
        equations TEXT,
        tables TEXT,
        definitions TEXT,
        conditions TEXT,
        examples TEXT,
        uncertainSymbols TEXT,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS generated_materials (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        formatType TEXT NOT NULL,
        language TEXT NOT NULL,
        content TEXT NOT NULL,
        generatedAt TEXT NOT NULL,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS verifications (
        documentId TEXT PRIMARY KEY,
        overallFidelityScore REAL NOT NULL,
        factRetentionRate REAL NOT NULL,
        equationIntegrityRate REAL NOT NULL,
        conditionAccuracyRate REAL NOT NULL,
        terminologyConsistencyRate REAL NOT NULL,
        unsupportedClaimsDetected INTEGER NOT NULL,
        alteredEquationsDetected INTEGER NOT NULL,
        missingConditionsDetected INTEGER NOT NULL,
        lastAuditDate TEXT NOT NULL,
        verifiedByEngine INTEGER NOT NULL,
        factChecks TEXT,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS saved_items (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        documentId TEXT NOT NULL,
        documentTitle TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        savedAt TEXT NOT NULL,
        citation TEXT,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        documentId TEXT NOT NULL,
        score REAL NOT NULL,
        totalQuestions INTEGER NOT NULL,
        answers TEXT NOT NULL,
        attemptedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        lecturerId TEXT NOT NULL,
        code TEXT NOT NULL,
        title TEXT NOT NULL,
        studentCount INTEGER NOT NULL,
        documentIds TEXT,
        isPublished INTEGER NOT NULL,
        averageQuizScore REAL NOT NULL,
        FOREIGN KEY (lecturerId) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS processing_jobs (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        lastError TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Section 19.4: Safe migration from existing JSON file to SQLite database.
   * Preserves existing keys, IDs, and keeps the original JSON file as a backup.
   */
  private static migrateFromJsonIfEmpty(): void {
    if (!this.db) return;
    const userCount = (this.db.prepare('SELECT count(*) as count FROM users').get() as any)?.count || 0;
    if (userCount > 0) return; // Already populated

    if (fs.existsSync(JSON_BACKUP_FILE)) {
      try {
        console.log('[Database] Migrating existing JSON records into SQLite...');
        const rawJson = fs.readFileSync(JSON_BACKUP_FILE, 'utf-8');
        const jsonStore = JSON.parse(rawJson);

        // 1. Users
        const insertUser = this.db.prepare('INSERT OR IGNORE INTO users (id, email, name, role, createdAt) VALUES (?, ?, ?, ?, ?)');
        for (const u of jsonStore.users || []) {
          insertUser.run(u.id, u.email, u.name, u.role, u.createdAt);
        }

        // 2. Documents
        const insertDoc = this.db.prepare(`
          INSERT OR IGNORE INTO documents (
            id, ownerId, title, author, institution, year, fileType, fileSizeMb,
            originalFileName, storagePath, category, uploadDate, processingStatus,
            extractionStatus, extractionWarnings, extractionQuality, pageCount, wordCount, summary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const d of jsonStore.documents || []) {
          insertDoc.run(
            d.id, d.ownerId, d.title, d.author, d.institution || null, d.year || null,
            d.fileType, d.fileSizeMb || 1.0, d.originalFileName || 'document.pdf', d.storagePath || null,
            d.category || 'Computer Science', d.uploadDate, d.processingStatus, d.extractionStatus || 'ready',
            JSON.stringify(d.extractionWarnings || []), d.extractionQuality ? JSON.stringify(d.extractionQuality) : null,
            d.pageCount || 1, d.wordCount || 100, d.summary || ''
          );
        }

        // 3. Extracted sections
        const insertSec = this.db.prepare(`
          INSERT OR IGNORE INTO extracted_sections (
            id, documentId, pageNumber, slideNumber, chapterTitle, title, content,
            speakerNotes, equations, tables, definitions, conditions, examples, uncertainSymbols
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of jsonStore.extractedSections || []) {
          insertSec.run(
            s.id, s.documentId, s.pageNumber, s.slideNumber || null, s.chapterTitle || null,
            s.title, s.content, s.speakerNotes || null,
            JSON.stringify(s.equations || []), JSON.stringify(s.tables || []),
            JSON.stringify(s.definitions || []), JSON.stringify(s.conditions || []),
            JSON.stringify(s.examples || []), JSON.stringify(s.uncertainSymbols || [])
          );
        }

        // 4. Generated materials
        const insertMat = this.db.prepare(`
          INSERT OR IGNORE INTO generated_materials (id, documentId, formatType, language, content, generatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const m of jsonStore.generatedMaterials || []) {
          insertMat.run(m.id, m.documentId, m.formatType, m.language, JSON.stringify(m.content), m.generatedAt);
        }

        // 5. Verifications
        const insertVer = this.db.prepare(`
          INSERT OR IGNORE INTO verifications (
            documentId, overallFidelityScore, factRetentionRate, equationIntegrityRate,
            conditionAccuracyRate, terminologyConsistencyRate, unsupportedClaimsDetected,
            alteredEquationsDetected, missingConditionsDetected, lastAuditDate, verifiedByEngine, factChecks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const v of jsonStore.verificationResults || []) {
          insertVer.run(
            v.documentId, v.overallFidelityScore, v.factRetentionRate, v.equationIntegrityRate,
            v.conditionAccuracyRate, v.terminologyConsistencyRate, v.unsupportedClaimsDetected,
            v.alteredEquationsDetected, v.missingConditionsDetected, v.lastAuditDate,
            v.verifiedByEngine ? 1 : 0, JSON.stringify(v.factChecks || [])
          );
        }

        // 6. Saved items
        const insertSaved = this.db.prepare(`
          INSERT OR IGNORE INTO saved_items (id, userId, documentId, documentTitle, type, title, content, savedAt, citation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const it of jsonStore.savedItems || []) {
          insertSaved.run(
            it.id, it.userId, it.documentId, it.documentTitle, it.type, it.title,
            it.content, it.savedAt, it.citation ? JSON.stringify(it.citation) : null
          );
        }

        // 7. Quiz attempts
        const insertQuiz = this.db.prepare(`
          INSERT OR IGNORE INTO quiz_attempts (id, userId, documentId, score, totalQuestions, answers, attemptedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const q of jsonStore.quizAttempts || []) {
          insertQuiz.run(q.id, q.userId, q.documentId, q.score, q.totalQuestions, JSON.stringify(q.answers || []), q.attemptedAt);
        }

        // 8. Courses
        const insertCourse = this.db.prepare(`
          INSERT OR IGNORE INTO courses (id, lecturerId, code, title, studentCount, documentIds, isPublished, averageQuizScore)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of jsonStore.courses || []) {
          insertCourse.run(
            c.id, c.lecturerId, c.code, c.title, c.studentCount,
            JSON.stringify(c.documentIds || []), c.isPublished ? 1 : 0, c.averageQuizScore
          );
        }

        console.log('[Database] JSON migration to SQLite completed successfully. Original JSON preserved as backup.');
      } catch (e) {
        console.warn('[Database] JSON migration error:', e);
      }
    }
  }

  private static seedDefaultUsers(): void {
    if (!this.db) return;
    const stmt = this.db.prepare('INSERT OR IGNORE INTO users (id, email, name, role, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run('usr-student-1', 'alex.rivera@university.edu', 'Alex Rivera', 'student', '2026-10-01T10:00:00Z');
    stmt.run('usr-lecturer-1', 'prof.ramesh@iisc.ac.in', 'Prof. Ramesh K.', 'lecturer', '2026-09-15T09:00:00Z');
  }

  // --- Users ---
  static findUserById(id: string): UserRecord | null {
    this.init();
    if (!this.db) return null;
    return (this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord) || null;
  }

  static findUserByEmail(email: string): UserRecord | null {
    this.init();
    if (!this.db) return null;
    return (this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRecord) || null;
  }

  static createUser(user: UserRecord): UserRecord {
    this.init();
    if (this.db) {
      const stmt = this.db.prepare('INSERT OR REPLACE INTO users (id, email, name, role, createdAt) VALUES (?, ?, ?, ?, ?)');
      stmt.run(user.id, user.email, user.name, user.role, user.createdAt);
    }
    return user;
  }

  // --- Documents ---
  static createDocument(doc: DocumentRecord): DocumentRecord {
    this.init();
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO documents (
          id, ownerId, title, author, institution, year, fileType, fileSizeMb,
          originalFileName, storagePath, category, uploadDate, processingStatus,
          extractionStatus, extractionWarnings, extractionQuality, pageCount, wordCount, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        doc.id, doc.ownerId, doc.title, doc.author, doc.institution || null, doc.year || null,
        doc.fileType, doc.fileSizeMb, doc.originalFileName, doc.storagePath || null,
        doc.category, doc.uploadDate, doc.processingStatus, doc.extractionStatus,
        JSON.stringify(doc.extractionWarnings || []), doc.extractionQuality ? JSON.stringify(doc.extractionQuality) : null,
        doc.pageCount, doc.wordCount, doc.summary || ''
      );
    }
    return doc;
  }

  static getDocuments(ownerId?: string, role?: string): DocumentRecord[] {
    this.init();
    if (!this.db) return [];
    let rows: any[];
    if (role === 'lecturer') {
      rows = this.db.prepare('SELECT * FROM documents ORDER BY uploadDate DESC').all();
    } else if (ownerId) {
      rows = this.db.prepare('SELECT * FROM documents WHERE ownerId = ? ORDER BY uploadDate DESC').all(ownerId);
    } else {
      rows = this.db.prepare('SELECT * FROM documents ORDER BY uploadDate DESC').all();
    }

    return rows.map(r => ({
      ...r,
      extractionWarnings: JSON.parse(r.extractionWarnings || '[]'),
      extractionQuality: r.extractionQuality ? JSON.parse(r.extractionQuality) : undefined
    }));
  }

  static getDocumentById(id: string): DocumentRecord | undefined {
    this.init();
    if (!this.db) return undefined;
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      extractionWarnings: JSON.parse(row.extractionWarnings || '[]'),
      extractionQuality: row.extractionQuality ? JSON.parse(row.extractionQuality) : undefined
    };
  }

  static renameDocument(id: string, newTitle: string): DocumentRecord | undefined {
    this.init();
    if (!this.db) return undefined;
    this.db.prepare('UPDATE documents SET title = ? WHERE id = ?').run(newTitle, id);
    return this.getDocumentById(id);
  }

  static deleteDocument(id: string): boolean {
    this.init();
    if (!this.db) return false;
    const info = this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return info.changes > 0;
  }

  static clearAll(): void {
    this.init();
    if (!this.db) return;
    this.db.prepare('DELETE FROM documents').run();
  }

  // --- Extracted Sections ---
  static saveSections(documentId: string, sections: ExtractedSectionRecord[]): void {
    this.init();
    if (!this.db) return;
    this.db.prepare('DELETE FROM extracted_sections WHERE documentId = ?').run(documentId);

    const insertStmt = this.db.prepare(`
      INSERT INTO extracted_sections (
        id, documentId, pageNumber, slideNumber, chapterTitle, title, content,
        speakerNotes, equations, tables, definitions, conditions, examples, uncertainSymbols
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = this.db.transaction((recs: ExtractedSectionRecord[]) => {
      for (const s of recs) {
        insertStmt.run(
          s.id, s.documentId, s.pageNumber, s.slideNumber || null, s.chapterTitle || null,
          s.title, s.content, s.speakerNotes || null,
          JSON.stringify(s.equations || []), JSON.stringify(s.tables || []),
          JSON.stringify(s.definitions || []), JSON.stringify(s.conditions || []),
          JSON.stringify(s.examples || []), JSON.stringify(s.uncertainSymbols || [])
        );
      }
    });

    insertTransaction(sections);
  }

  static getSectionsByDocId(documentId: string): ExtractedSectionRecord[] {
    this.init();
    if (!this.db) return [];
    const rows = this.db.prepare('SELECT * FROM extracted_sections WHERE documentId = ? ORDER BY pageNumber ASC').all(documentId) as any[];
    return rows.map(r => ({
      ...r,
      equations: JSON.parse(r.equations || '[]'),
      tables: JSON.parse(r.tables || '[]'),
      definitions: JSON.parse(r.definitions || '[]'),
      conditions: JSON.parse(r.conditions || '[]'),
      examples: JSON.parse(r.examples || '[]'),
      uncertainSymbols: JSON.parse(r.uncertainSymbols || '[]')
    }));
  }

  // --- Generated Materials ---
  static saveMaterial(mat: GeneratedMaterialRecord): void {
    this.init();
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO generated_materials (id, documentId, formatType, language, content, generatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(mat.id, mat.documentId, mat.formatType, mat.language, JSON.stringify(mat.content), mat.generatedAt);
  }

  static getMaterial(documentId: string, formatType: string, language: string): GeneratedMaterialRecord | undefined {
    this.init();
    if (!this.db) return undefined;
    const row = this.db.prepare(`
      SELECT * FROM generated_materials WHERE documentId = ? AND formatType = ? AND language = ?
    `).get(documentId, formatType, language) as any;
    if (!row) return undefined;
    return {
      ...row,
      content: JSON.parse(row.content)
    };
  }

  static getMaterialsByDocId(documentId: string): GeneratedMaterialRecord[] {
    this.init();
    if (!this.db) return [];
    const rows = this.db.prepare('SELECT * FROM generated_materials WHERE documentId = ?').all(documentId) as any[];
    return rows.map(r => ({
      ...r,
      content: JSON.parse(r.content)
    }));
  }

  // --- Verifications ---
  static saveVerification(v: VerificationResultRecord): void {
    this.init();
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO verifications (
        documentId, overallFidelityScore, factRetentionRate, equationIntegrityRate,
        conditionAccuracyRate, terminologyConsistencyRate, unsupportedClaimsDetected,
        alteredEquationsDetected, missingConditionsDetected, lastAuditDate, verifiedByEngine, factChecks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      v.documentId, v.overallFidelityScore, v.factRetentionRate, v.equationIntegrityRate,
      v.conditionAccuracyRate, v.terminologyConsistencyRate, v.unsupportedClaimsDetected,
      v.alteredEquationsDetected, v.missingConditionsDetected, v.lastAuditDate,
      v.verifiedByEngine ? 1 : 0, JSON.stringify(v.factChecks || [])
    );
  }

  static getVerification(documentId: string): VerificationResultRecord | undefined {
    this.init();
    if (!this.db) return undefined;
    const row = this.db.prepare('SELECT * FROM verifications WHERE documentId = ?').get(documentId) as any;
    if (!row) return undefined;
    return {
      ...row,
      verifiedByEngine: Boolean(row.verifiedByEngine),
      factChecks: JSON.parse(row.factChecks || '[]')
    };
  }

  // --- Saved Items ---
  static getSavedItems(userId: string): SavedItemRecord[] {
    this.init();
    if (!this.db) return [];
    const rows = this.db.prepare('SELECT * FROM saved_items WHERE userId = ? ORDER BY savedAt DESC').all(userId) as any[];
    return rows.map(r => ({
      ...r,
      citation: r.citation ? JSON.parse(r.citation) : undefined
    }));
  }

  static addSavedItem(item: SavedItemRecord): void {
    this.init();
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO saved_items (id, userId, documentId, documentTitle, type, title, content, savedAt, citation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id, item.userId, item.documentId, item.documentTitle, item.type,
      item.title, item.content, item.savedAt, item.citation ? JSON.stringify(item.citation) : null
    );
  }

  static removeSavedItem(id: string, userId: string): boolean {
    this.init();
    if (!this.db) return false;
    const info = this.db.prepare('DELETE FROM saved_items WHERE id = ? AND userId = ?').run(id, userId);
    return info.changes > 0;
  }

  // --- Quiz Attempts ---
  static recordQuizAttempt(attempt: QuizAttemptRecord): void {
    this.init();
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO quiz_attempts (id, userId, documentId, score, totalQuestions, answers, attemptedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(attempt.id, attempt.userId, attempt.documentId, attempt.score, attempt.totalQuestions, JSON.stringify(attempt.answers || []), attempt.attemptedAt);
  }

  static getQuizAttempts(userId: string, documentId?: string): QuizAttemptRecord[] {
    this.init();
    if (!this.db) return [];
    let rows: any[];
    if (documentId) {
      rows = this.db.prepare('SELECT * FROM quiz_attempts WHERE userId = ? AND documentId = ? ORDER BY attemptedAt DESC').all(userId, documentId);
    } else {
      rows = this.db.prepare('SELECT * FROM quiz_attempts WHERE userId = ? ORDER BY attemptedAt DESC').all(userId);
    }
    return rows.map(r => ({
      ...r,
      answers: JSON.parse(r.answers || '[]')
    }));
  }

  // --- Courses ---
  static getCourses(lecturerId?: string): CourseSharingRecord[] {
    this.init();
    if (!this.db) return [];
    let rows: any[];
    if (lecturerId) {
      rows = this.db.prepare('SELECT * FROM courses WHERE lecturerId = ?').all(lecturerId);
    } else {
      rows = this.db.prepare('SELECT * FROM courses').all();
    }
    return rows.map(r => ({
      ...r,
      documentIds: JSON.parse(r.documentIds || '[]'),
      isPublished: Boolean(r.isPublished)
    }));
  }

  static toggleCoursePublish(courseId: string): CourseSharingRecord | undefined {
    this.init();
    if (!this.db) return undefined;
    const course = this.db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as any;
    if (course) {
      const newStatus = course.isPublished ? 0 : 1;
      this.db.prepare('UPDATE courses SET isPublished = ? WHERE id = ?').run(newStatus, courseId);
      return {
        ...course,
        documentIds: JSON.parse(course.documentIds || '[]'),
        isPublished: Boolean(newStatus)
      };
    }
    return undefined;
  }

  // --- Processing Jobs (Section 19.1) ---
  static createJob(documentId: string): ProcessingJobRecord {
    this.init();
    const job: ProcessingJobRecord = {
      id: 'job-' + Date.now(),
      documentId,
      status: 'queued',
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (this.db) {
      this.db.prepare(`
        INSERT INTO processing_jobs (id, documentId, status, attempts, lastError, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(job.id, job.documentId, job.status, job.attempts, null, job.createdAt, job.updatedAt);
    }
    return job;
  }

  static updateJob(jobId: string, status: ProcessingJobRecord['status'], lastError?: string): void {
    this.init();
    if (this.db) {
      this.db.prepare(`
        UPDATE processing_jobs
        SET status = ?, attempts = attempts + 1, lastError = ?, updatedAt = ?
        WHERE id = ?
      `).run(status, lastError || null, new Date().toISOString(), jobId);
    }
  }

  // --- Backup & Recovery (Section 19.3) ---
  static createBackup(): string {
    this.init();
    const backupDir = path.join(DB_DIR, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `backup-${Date.now()}.db`);
    if (this.db) {
      // Sync WAL changes into main database before snapshot
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      fs.copyFileSync(DB_FILE, backupPath);
    }
    return backupPath;
  }
}
