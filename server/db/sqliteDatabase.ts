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

export class SqliteDatabase {
  private static db: DatabaseType | null = null;
  private static initialized = false;

  static init(): void {
    if (this.initialized && this.db) return;

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new DatabaseConstructor(DB_FILE);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createTables();
    this.seedDefaultUsers();
    this.initialized = true;
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
        title TEXT NOT NULL,
        documentId TEXT NOT NULL,
        formatType TEXT NOT NULL,
        category TEXT NOT NULL,
        contentPreview TEXT NOT NULL,
        dateSaved TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        userId TEXT NOT NULL,
        score REAL NOT NULL,
        totalQuestions INTEGER NOT NULL,
        dateAttempted TEXT NOT NULL,
        answers TEXT NOT NULL,
        FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        lecturerId TEXT NOT NULL,
        courseCode TEXT NOT NULL,
        courseName TEXT NOT NULL,
        term TEXT NOT NULL,
        enrolledStudentsCount INTEGER NOT NULL,
        materialsCount INTEGER NOT NULL,
        publishedMaterials TEXT,
        status TEXT NOT NULL,
        classAverageAccuracy REAL NOT NULL,
        flaggedItemsCount INTEGER NOT NULL,
        FOREIGN KEY (lecturerId) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
  }

  private static seedDefaultUsers(): void {
    if (!this.db) return;
    const stmt = this.db.prepare('INSERT OR IGNORE INTO users (id, email, name, role, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run('usr-student-1', 'alex.rivera@university.edu', 'Alex Rivera', 'student', '2026-10-01T10:00:00Z');
    stmt.run('usr-lecturer-1', 'prof.ramesh@iisc.ac.in', 'Prof. Ramesh K.', 'lecturer', '2026-09-15T09:00:00Z');
  }

  // --- User Queries ---
  static findUserById(id: string): UserRecord | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return row || null;
  }

  static findUserByEmail(email: string): UserRecord | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    return row || null;
  }

  static createUser(user: UserRecord): UserRecord {
    if (!this.db) return user;
    const stmt = this.db.prepare('INSERT INTO users (id, email, name, role, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run(user.id, user.email, user.name, user.role, user.createdAt);
    return user;
  }

  // --- Document Queries ---
  static createDocument(doc: DocumentRecord): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents (
        id, ownerId, title, author, institution, year, fileType, fileSizeMb,
        originalFileName, storagePath, category, uploadDate, processingStatus,
        extractionStatus, extractionWarnings, extractionQuality, pageCount, wordCount, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      doc.id,
      doc.ownerId,
      doc.title,
      doc.author,
      doc.institution || null,
      doc.year || null,
      doc.fileType,
      doc.fileSizeMb,
      doc.originalFileName,
      doc.storagePath || null,
      doc.category,
      doc.uploadDate,
      doc.processingStatus,
      doc.extractionStatus,
      JSON.stringify(doc.extractionWarnings || []),
      doc.extractionQuality ? JSON.stringify(doc.extractionQuality) : null,
      doc.pageCount,
      doc.wordCount,
      doc.summary || ''
    );
  }

  static getDocuments(userId?: string, role?: string): DocumentRecord[] {
    if (!this.db) return [];
    let rows: any[];
    if (role === 'lecturer') {
      rows = this.db.prepare('SELECT * FROM documents ORDER BY uploadDate DESC').all();
    } else if (userId) {
      rows = this.db.prepare('SELECT * FROM documents WHERE ownerId = ? ORDER BY uploadDate DESC').all(userId);
    } else {
      rows = this.db.prepare('SELECT * FROM documents ORDER BY uploadDate DESC').all();
    }

    return rows.map(r => ({
      ...r,
      extractionWarnings: JSON.parse(r.extractionWarnings || '[]'),
      extractionQuality: r.extractionQuality ? JSON.parse(r.extractionQuality) : undefined
    }));
  }

  static getDocumentById(id: string): DocumentRecord | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      extractionWarnings: JSON.parse(row.extractionWarnings || '[]'),
      extractionQuality: row.extractionQuality ? JSON.parse(row.extractionQuality) : undefined
    };
  }

  static renameDocument(id: string, title: string): DocumentRecord | null {
    if (!this.db) return null;
    this.db.prepare('UPDATE documents SET title = ? WHERE id = ?').run(title, id);
    return this.getDocumentById(id);
  }

  static deleteDocument(id: string): boolean {
    if (!this.db) return false;
    const info = this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return info.changes > 0;
  }

  static clearAll(): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM documents').run();
  }

  // --- Sections Queries ---
  static saveSections(documentId: string, sections: ExtractedSectionRecord[]): void {
    if (!this.db) return;
    const deleteStmt = this.db.prepare('DELETE FROM extracted_sections WHERE documentId = ?');
    deleteStmt.run(documentId);

    const insertStmt = this.db.prepare(`
      INSERT INTO extracted_sections (
        id, documentId, pageNumber, slideNumber, chapterTitle, title, content,
        speakerNotes, equations, tables, definitions, conditions, examples, uncertainSymbols
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((records: ExtractedSectionRecord[]) => {
      for (const s of records) {
        insertStmt.run(
          s.id,
          s.documentId,
          s.pageNumber,
          s.slideNumber || null,
          s.chapterTitle || null,
          s.title,
          s.content,
          s.speakerNotes || null,
          JSON.stringify(s.equations || []),
          JSON.stringify(s.tables || []),
          JSON.stringify(s.definitions || []),
          JSON.stringify(s.conditions || []),
          JSON.stringify(s.examples || []),
          JSON.stringify(s.uncertainSymbols || [])
        );
      }
    });

    insertMany(sections);
  }

  static getSectionsByDocId(documentId: string): ExtractedSectionRecord[] {
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
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO generated_materials (id, documentId, formatType, language, content, generatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(mat.id, mat.documentId, mat.formatType, mat.language, JSON.stringify(mat.content), mat.generatedAt);
  }

  static getMaterial(documentId: string, formatType: string, language: string): GeneratedMaterialRecord | null {
    if (!this.db) return null;
    const row = this.db.prepare(`
      SELECT * FROM generated_materials WHERE documentId = ? AND formatType = ? AND language = ?
    `).get(documentId, formatType, language) as any;
    if (!row) return null;
    return {
      ...row,
      content: JSON.parse(row.content)
    };
  }

  static getMaterialsByDocId(documentId: string): GeneratedMaterialRecord[] {
    if (!this.db) return [];
    const rows = this.db.prepare('SELECT * FROM generated_materials WHERE documentId = ?').all(documentId) as any[];
    return rows.map(r => ({
      ...r,
      content: JSON.parse(r.content)
    }));
  }

  // --- Verification ---
  static saveVerification(v: VerificationResultRecord): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO verifications (
        documentId, overallFidelityScore, factRetentionRate, equationIntegrityRate,
        conditionAccuracyRate, terminologyConsistencyRate, unsupportedClaimsDetected,
        alteredEquationsDetected, missingConditionsDetected, lastAuditDate, verifiedByEngine, factChecks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      v.documentId,
      v.overallFidelityScore,
      v.factRetentionRate,
      v.equationIntegrityRate,
      v.conditionAccuracyRate,
      v.terminologyConsistencyRate,
      v.unsupportedClaimsDetected,
      v.alteredEquationsDetected,
      v.missingConditionsDetected,
      v.lastAuditDate,
      v.verifiedByEngine ? 1 : 0,
      JSON.stringify(v.factChecks || [])
    );
  }

  static getVerification(documentId: string): VerificationResultRecord | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM verifications WHERE documentId = ?').get(documentId) as any;
    if (!row) return null;
    return {
      ...row,
      verifiedByEngine: Boolean(row.verifiedByEngine),
      factChecks: JSON.parse(row.factChecks || '[]')
    };
  }

  // --- Saved Items & Courses ---
  static getSavedItems(userId: string): SavedItemRecord[] {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM saved_items WHERE userId = ? ORDER BY dateSaved DESC').all(userId) as any[];
  }

  static saveItem(item: SavedItemRecord): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO saved_items (id, userId, title, documentId, formatType, category, contentPreview, dateSaved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.id, item.userId, item.title, item.documentId, item.formatType, item.category, item.contentPreview, item.dateSaved);
  }

  static deleteSavedItem(id: string): boolean {
    if (!this.db) return false;
    const info = this.db.prepare('DELETE FROM saved_items WHERE id = ?').run(id);
    return info.changes > 0;
  }
}
