import { Response } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { DocumentRecord, DocumentFileType } from '../db/schema';
import { ExtractionService } from '../services/extractionService';
import { RealExtractor } from '../services/realExtractor';
import { MeaningPreservationEngine } from '../services/meaningPreservationEngine';
import { AiGeneratorService } from '../services/aiGeneratorService';
import { ExtractionTestSuite } from '../services/extractionTestSuite';

export function enrichDocumentWithMaterials(doc: DocumentRecord): any {
  const sections = Database.getSectionsByDocId(doc.id);
  const verification = Database.getVerification(doc.id);
  const materials = Database.getMaterialsByDocId(doc.id);

  const unwrap = (obj: any) => obj?.content !== undefined && (obj.formatType !== undefined || obj.language !== undefined) ? obj.content : obj;

  const mapMat = materials.find(m => m.formatType === 'map')?.content;
  const simplifiedMat = materials.find(m => m.formatType === 'simplified')?.content;
  const notesMat = materials.find(m => m.formatType === 'notes')?.content;
  const workedMat = materials.find(m => m.formatType === 'worked')?.content;
  const flashcardsMat = materials.find(m => m.formatType === 'flashcards')?.content;
  const audioMat = materials.find(m => m.formatType === 'audio')?.content;
  const quizMat = materials.find(m => m.formatType === 'quiz')?.content;

  const conceptMap = unwrap(mapMat) || null;
  const simplified = unwrap(simplifiedMat) || null;
  const notes = unwrap(notesMat) || null;
  const worked = unwrap(workedMat) || null;
  const flashcards = unwrap(flashcardsMat) || [];
  const audioLesson = unwrap(audioMat) || null;
  const quiz = unwrap(quizMat) || [];

  const explanations = simplified ? (Array.isArray(simplified) ? simplified : [simplified]) : [];

  return {
    ...doc,
    sections,
    materials,
    meaningPreservation: verification || undefined,
    verificationStatus: verification && verification.overallFidelityScore > 0 ? (verification.overallFidelityScore >= 90 ? 'verified' : 'needs_review') : 'not_verified',
    conceptMap,
    explanations,
    flashcards,
    audioLesson,
    notes,
    worked,
    quiz
  };
}

export class DocumentController {
  static async upload(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      const { title, author, category, rawText } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
      }

      let textContent = rawText || '';
      let originalFileName = 'pasted_text.txt';
      let fileType: DocumentFileType = 'pdf';
      let fileSizeMb = 1.0;

      if (file) {
        // Enforce consistent 25 MB limit
        if (file.size > 25 * 1024 * 1024) {
          if (fs.existsSync(file.path)) { try { fs.unlinkSync(file.path); } catch (_) {} }
          return res.status(400).json({ error: 'File size exceeds maximum 25 MB upload limit.' });
        }

        originalFileName = file.originalname;
        fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
        const ext = file.originalname.toLowerCase();

        // 1. Verify file signature (magic bytes) to prevent spoofing
        const bufferHeader = Buffer.alloc(8);
        try {
          const fd = fs.openSync(file.path, 'r');
          fs.readSync(fd, bufferHeader, 0, 8, 0);
          fs.closeSync(fd);
        } catch (readErr) {
          return res.status(400).json({ error: 'Failed reading uploaded file header.' });
        }

        if (ext.endsWith('.ppt') && !ext.endsWith('.pptx')) {
          if (fs.existsSync(file.path)) { try { fs.unlinkSync(file.path); } catch (_) {} }
          return res.status(400).json({
            error: 'Legacy binary .ppt files are not supported. Please upload modern .pptx or export as PDF.',
            processingStatus: 'failed'
          });
        } else if (ext.endsWith('.pptx')) {
          if (!bufferHeader.slice(0, 2).equals(Buffer.from([0x50, 0x4B]))) { // PK
            if (fs.existsSync(file.path)) { try { fs.unlinkSync(file.path); } catch (_) {} }
            return res.status(400).json({ error: 'Invalid file signature: Content is not a genuine PPTX presentation.' });
          }
          fileType = 'pptx';
        } else if (file.mimetype.startsWith('image/') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
          if (ext.endsWith('.png') && !bufferHeader.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]))) {
            if (fs.existsSync(file.path)) { try { fs.unlinkSync(file.path); } catch (_) {} }
            return res.status(400).json({ error: 'Invalid file signature: Content is not a genuine PNG image.' });
          }
          if ((ext.endsWith('.jpg') || ext.endsWith('.jpeg')) && !bufferHeader.slice(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
            if (fs.existsSync(file.path)) { try { fs.unlinkSync(file.path); } catch (_) {} }
            return res.status(400).json({ error: 'Invalid file signature: Content is not a genuine JPEG image.' });
          }
          fileType = 'scanned_notes';
        } else if (ext.endsWith('.pdf')) {
          if (!bufferHeader.slice(0, 4).equals(Buffer.from('%PDF'))) {
            if (fs.existsSync(file.path)) { try { fs.unlinkSync(file.path); } catch (_) {} }
            return res.status(400).json({ error: 'Invalid file signature: Content is not a genuine PDF document.' });
          }
          fileType = 'pdf';
        } else if (file.mimetype.includes('text') || ext.endsWith('.txt') || ext.endsWith('.md')) {
          textContent = fs.readFileSync(file.path, 'utf-8');
        }
      }

      if (!textContent.trim() && !file) {
        return res.status(400).json({
          error: 'No readable text content found in the uploaded file or input. Please provide a document with extractable text or legible scan.',
          processingStatus: 'failed'
        });
      }

      const docId = 'doc-' + Date.now();

      // Step 2: Execute real format-specific extraction & Step 47 understanding pipeline
      let extraction: any;
      try {
        extraction = await ExtractionService.extractRealDocument(
          docId,
          fileType,
          originalFileName,
          file?.path,
          textContent
        );
      } catch (extractErr: any) {
        return res.status(400).json({
          error: extractErr.message || 'Document extraction failed.',
          processingStatus: 'failed'
        });
      }

      const hasWarning = extraction.qualityReport.diagnostics.length > 0;
      const docRecord: DocumentRecord = {
        id: docId,
        ownerId: userId,
        title: title || originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        author: author || 'Academic Researcher',
        category: category || 'Computer Science',
        fileType,
        fileSizeMb,
        originalFileName,
        storagePath: file?.path,
        uploadDate: new Date().toISOString().split('T')[0],
        processingStatus: hasWarning ? 'warning' : 'completed',
        extractionStatus: extraction.qualityReport.userStatus,
        extractionWarnings: extraction.qualityReport.diagnostics.map((d: any) => d.message),
        extractionQuality: extraction.qualityReport,
        pageCount: extraction.pageCount,
        wordCount: extraction.wordCount,
        summary: extraction.summary
      };

      // Save document & extracted sections
      Database.createDocument(docRecord);
      Database.saveSections(docId, extraction.sections);

      // Step 3 & 4: Run Meaning Preservation Engine audit
      const auditReport = MeaningPreservationEngine.auditDocument(docId, extraction.sections, hasWarning);
      Database.saveVerification(auditReport);

      // Pre-synthesize all 7 learning formats using async AI generation (Gemini / OpenAI / Deterministic Grounded)
      const initialFormats: ('map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz')[] = [
        'map', 'simplified', 'notes', 'worked', 'flashcards', 'audio', 'quiz'
      ];
      for (const fmt of initialFormats) {
        try {
          const matResult = await AiGeneratorService.generateFormatAsync(docId, docRecord.title, extraction.sections, fmt, 'English');
          Database.saveMaterial({
            id: `mat-${fmt}-${docId}`,
            documentId: docId,
            formatType: fmt,
            language: 'English',
            content: matResult,
            generatedAt: new Date().toISOString()
          });
        } catch (genErr) {
          console.warn(`Format pre-generation warning for ${fmt}:`, genErr);
        }
      }

      const enriched = enrichDocumentWithMaterials(docRecord);

      res.status(201).json({
        document: enriched,
        extraction,
        verification: auditReport
      });
    } catch (e: any) {
      console.error('Upload processing error:', e);
      res.status(500).json({ error: 'Processing error: ' + e.message });
    }
  }

  static list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const role = req.user?.role;
    const docs = Database.getDocuments(userId, role);
    const enriched = docs.map(d => enrichDocumentWithMaterials(d));
    res.json({ documents: enriched });
  }

  static getById(req: AuthenticatedRequest, res: Response) {
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const userId = req.user?.id;
    const role = req.user?.role;
    const isOwner = doc.ownerId === userId;
    const isCourseLecturer = role === 'lecturer' && Database.isDocumentInLecturerCourses(doc.id, userId!);
    const isShared = Database.isDocumentSharedWithStudents(doc.id);
    const isAdmin = role === 'admin';

    if (!isOwner && !isCourseLecturer && !isShared && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to view this document.' });
    }
    const enriched = enrichDocumentWithMaterials(doc);
    res.json({ document: enriched, sections: enriched.sections, verification: enriched.meaningPreservation });
  }

  static getStatus(req: AuthenticatedRequest, res: Response) {
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const userId = req.user?.id;
    const role = req.user?.role;
    const isOwner = doc.ownerId === userId;
    const isCourseLecturer = role === 'lecturer' && Database.isDocumentInLecturerCourses(doc.id, userId!);
    const isShared = Database.isDocumentSharedWithStudents(doc.id);
    const isAdmin = role === 'admin';

    if (!isOwner && !isCourseLecturer && !isShared && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to check this document.' });
    }
    res.json({
      status: doc.processingStatus,
      extractionStatus: doc.extractionStatus || (doc.extractionWarnings.length > 0 ? 'needs_review' : 'ready'),
      warnings: doc.extractionWarnings,
      pageCount: doc.pageCount,
      wordCount: doc.wordCount
    });
  }

  static getExtraction(req: AuthenticatedRequest, res: Response) {
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const userId = req.user?.id;
    const role = req.user?.role;
    const isOwner = doc.ownerId === userId;
    const isCourseLecturer = role === 'lecturer' && Database.isDocumentInLecturerCourses(doc.id, userId!);
    const isShared = Database.isDocumentSharedWithStudents(doc.id);
    const isAdmin = role === 'admin';

    if (!isOwner && !isCourseLecturer && !isShared && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to inspect this extraction.' });
    }
    const sections = Database.getSectionsByDocId(doc.id);
    res.json({
      document: doc,
      extractionQuality: doc.extractionQuality,
      sections
    });
  }

  static getBenchmark(req: AuthenticatedRequest, res: Response) {
    const results = ExtractionTestSuite.runBenchmark();
    res.json({ benchmark: results });
  }

  static rename(req: AuthenticatedRequest, res: Response) {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const userId = req.user?.id;
    const role = req.user?.role;
    const isOwner = doc.ownerId === userId;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You can only rename documents you own.' });
    }
    const updated = Database.renameDocument(req.params.id, title.trim());
    res.json({ document: updated });
  }

  static delete(req: AuthenticatedRequest, res: Response) {
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or already deleted.' });
    }
    const userId = req.user?.id;
    const role = req.user?.role;
    const isOwner = doc.ownerId === userId;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You can only delete documents you own.' });
    }
    const success = Database.deleteDocument(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Document not found or already deleted.' });
    }
    // Delete physical uploaded file if present
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (err) {
        console.warn('Failed unlinking storage file:', err);
      }
    }
    res.json({ success: true, message: 'Document and all associated learning materials deleted.' });
  }

  static clearAll(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { confirmation, courseId } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Safety guard: Must provide explicit confirmation string
    if (confirmation !== 'CONFIRM_DELETE_MY_DOCUMENTS') {
      return res.status(400).json({
        error: 'Dangerous operation: Deletion requires explicit confirmation payload { confirmation: "CONFIRM_DELETE_MY_DOCUMENTS" }.'
      });
    }

    const userDocs = Database.getDocuments(userId, role);
    let targetDocs = userDocs.filter(d => d.ownerId === userId);

    if (courseId && (role === 'lecturer' || role === 'admin')) {
      targetDocs = targetDocs.filter(d => Database.isDocumentInLecturerCourses(d.id, userId));
    }

    for (const doc of targetDocs) {
      Database.deleteDocument(doc.id);
      if (doc.storagePath && fs.existsSync(doc.storagePath)) {
        try { fs.unlinkSync(doc.storagePath); } catch (e) { /* ignore */ }
      }
    }

    res.json({ success: true, message: `Successfully cleared ${targetDocs.length} personal documents.` });
  }
}
