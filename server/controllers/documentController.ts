import { Response } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { DocumentRecord, DocumentFileType } from '../db/schema';
import { ExtractionService } from '../services/extractionService';
import { MeaningPreservationEngine } from '../services/meaningPreservationEngine';
import { AiGeneratorService } from '../services/aiGeneratorService';
import { ExtractionTestSuite } from '../services/extractionTestSuite';

export class DocumentController {
  static async upload(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      const { title, author, category, rawText } = req.body;
      const userId = req.user?.id || 'usr-student-1';

      let textContent = rawText || '';
      let originalFileName = 'pasted_text.txt';
      let fileType: DocumentFileType = 'pdf';
      let fileSizeMb = 1.0;

      if (file) {
        originalFileName = file.originalname;
        fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
        if (file.originalname.endsWith('.pptx') || file.originalname.endsWith('.ppt')) {
          fileType = 'pptx';
        } else if (file.originalname.includes('scan') || file.mimetype.startsWith('image/')) {
          fileType = 'scanned_notes';
        }

        // If user didn't provide text, read file contents if text/plain
        if (!textContent && (file.mimetype.includes('text') || file.originalname.endsWith('.txt') || file.originalname.endsWith('.md'))) {
          textContent = fs.readFileSync(file.path, 'utf-8');
        }
      }

      if (!textContent.trim()) {
        textContent = `1. Introduction & Theoretical Premises\n${title || 'Academic material'}. In this study, we formalize the fundamental transformations and boundary conditions.\n\n2. Analytical Derivations & Formulas\nLet X be the continuous domain space. Formula: Y = f(X) + C.\nCondition Invariant: Parameter C must be non-negative and finite across all evaluation bounds.`;
      }

      const docId = 'doc-' + Date.now();

      // Step 2: Extraction Service
      const extraction = ExtractionService.processDocumentContent(
        docId,
        textContent,
        fileType,
        originalFileName
      );

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
        extractionWarnings: extraction.qualityReport.diagnostics.map(d => d.message),
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

      // Pre-synthesize initial learning formats
      const initialMap = AiGeneratorService.generateFormat(docId, docRecord.title, extraction.sections, 'map', 'English');
      Database.saveMaterial({
        id: `mat-map-${docId}`,
        documentId: docId,
        formatType: 'map',
        language: 'English',
        content: initialMap,
        generatedAt: new Date().toISOString()
      });

      res.status(201).json({
        document: docRecord,
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
    res.json({ documents: docs });
  }

  static getById(req: AuthenticatedRequest, res: Response) {
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const sections = Database.getSectionsByDocId(doc.id);
    const verification = Database.getVerification(doc.id);
    res.json({ document: doc, sections, verification });
  }

  static getStatus(req: AuthenticatedRequest, res: Response) {
    const doc = Database.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
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
    const doc = Database.renameDocument(req.params.id, title.trim());
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    res.json({ document: doc });
  }

  static delete(req: AuthenticatedRequest, res: Response) {
    const success = Database.deleteDocument(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Document not found or already deleted.' });
    }
    res.json({ success: true, message: 'Document and all associated learning materials deleted.' });
  }
}
