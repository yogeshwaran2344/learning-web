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
  let materials = Database.getMaterialsByDocId(doc.id);

  const neededFormats: ('map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz')[] = [
    'map', 'simplified', 'notes', 'worked', 'flashcards', 'audio', 'quiz'
  ];

  // If any format is missing, pre-generate and save it now so all tabs are populated with deep content
  for (const fmt of neededFormats) {
    if (!materials.some(m => m.formatType === fmt)) {
      try {
        const generated = AiGeneratorService.generateFormat(doc.id, doc.title, sections, fmt, 'English');
        const matRec = {
          id: `mat-${fmt}-${doc.id}`,
          documentId: doc.id,
          formatType: fmt,
          language: 'English' as const,
          content: generated,
          generatedAt: new Date().toISOString()
        };
        Database.saveMaterial(matRec);
        materials.push(matRec);
      } catch (err) {
        console.warn(`Enrichment format generation warning for ${fmt}:`, err);
      }
    }
  }

  const unwrap = (obj: any) => obj?.content !== undefined && (obj.formatType !== undefined || obj.language !== undefined) ? obj.content : obj;

  const mapMat = materials.find(m => m.formatType === 'map')?.content;
  const simplifiedMat = materials.find(m => m.formatType === 'simplified')?.content;
  const notesMat = materials.find(m => m.formatType === 'notes')?.content;
  const workedMat = materials.find(m => m.formatType === 'worked')?.content;
  const flashcardsMat = materials.find(m => m.formatType === 'flashcards')?.content;
  const audioMat = materials.find(m => m.formatType === 'audio')?.content;
  const quizMat = materials.find(m => m.formatType === 'quiz')?.content;

  const conceptMap = unwrap(mapMat) || { nodes: [], links: [] };
  const simplified = unwrap(simplifiedMat);
  const notes = unwrap(notesMat);
  const worked = unwrap(workedMat);
  const flashcards = unwrap(flashcardsMat) || [];
  const audioLesson = unwrap(audioMat) || { id: `audio-${doc.id}`, title: doc.title, totalDurationSeconds: 120, sections: [] };
  const quiz = unwrap(quizMat) || [];

  const explanations = Array.isArray(simplified) ? simplified : [simplified].filter(Boolean);

  return {
    ...doc,
    sections,
    meaningPreservation: verification || undefined,
    verificationStatus: verification ? (verification.overallFidelityScore >= 90 ? 'verified' : 'needs_review') : 'not_verified',
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
      let realExtractedSections: any[] = [];
      let extractionWarnings: string[] = [];

      if (file) {
        originalFileName = file.originalname;
        fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
        const ext = file.originalname.toLowerCase();

        if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) {
          fileType = 'pptx';
          try {
            const pptxRes = RealExtractor.extractPptx(file.path, file.originalname);
            realExtractedSections = pptxRes.sections;
            extractionWarnings.push(...pptxRes.warnings);
            textContent = pptxRes.sections.map(s => `Slide ${s.pageNumber}: ${s.title}\n${s.content}`).join('\n\n');
          } catch (err: any) {
            return res.status(400).json({
              error: `PowerPoint Extraction Failed: ${err.message}`,
              processingStatus: 'failed'
            });
          }
        } else if (file.mimetype.startsWith('image/') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
          fileType = 'scanned_notes';
          try {
            const ocrRes = await RealExtractor.extractImageOcr(file.path, file.originalname);
            realExtractedSections = ocrRes.sections;
            extractionWarnings.push(...ocrRes.warnings);
            textContent = ocrRes.sections.map(s => s.content).join('\n\n');
          } catch (err: any) {
            return res.status(400).json({
              error: `OCR Extraction Failed: ${err.message}`,
              processingStatus: 'failed'
            });
          }
        } else if (ext.endsWith('.pdf')) {
          fileType = 'pdf';
          try {
            const pdfRes = await RealExtractor.extractPdf(file.path, file.originalname);
            realExtractedSections = pdfRes.sections;
            extractionWarnings.push(...pdfRes.warnings);
            textContent = pdfRes.sections.map(s => `Page ${s.pageNumber}: ${s.title}\n${s.content}`).join('\n\n');
          } catch (err: any) {
            return res.status(400).json({
              error: `PDF Extraction Failed: ${err.message}`,
              processingStatus: 'failed'
            });
          }
        } else if (file.mimetype.includes('text') || ext.endsWith('.txt') || ext.endsWith('.md')) {
          textContent = fs.readFileSync(file.path, 'utf-8');
        }
      }

      if (!textContent.trim() && realExtractedSections.length === 0) {
        return res.status(400).json({
          error: 'No readable text content found in the uploaded file or input. Please provide a document with extractable text or legible scan.',
          processingStatus: 'failed'
        });
      }

      const docId = 'doc-' + Date.now();

      // Step 2: Extraction Service
      const extraction = ExtractionService.processDocumentContent(
        docId,
        textContent,
        fileType,
        originalFileName
      );

      // If RealExtractor parsed exact pages, slides, or scanned notes with formulas & warnings,
      // preserve real section records directly with page, slide, and section identifiers
      if (realExtractedSections.length > 0) {
        extraction.sections = realExtractedSections.map((s, idx) => {
          // Extract definitions and conditions from text
          const sentences = s.content.split(/(?<=[.?!])\s+/);
          const defs: any[] = [];
          sentences.forEach((sent: string) => {
            if (/is defined as|refers to|denotes|is the|is a mechanism|means/i.test(sent)) {
              const match = sent.split(/is defined as|refers to|denotes|is a mechanism|is a|means/i);
              if (match[0] && match[1]) {
                defs.push({ term: match[0].trim(), definition: match[1].trim() });
              }
            }
          });
          const conds: string[] = Array.isArray(s.conditions) ? [...s.conditions] : [];
          sentences.forEach((sent: string) => {
            if (/must|requires|strictly|condition|assuming|provided that|invariant|guarantee/i.test(sent) && sent.length < 240) {
              if (!conds.includes(sent.trim())) conds.push(sent.trim());
            }
          });

          return {
            id: `sec-${s.sourceType || 'gen'}-${docId}-${idx + 1}`,
            documentId: docId,
            pageNumber: s.pageNumber || idx + 1,
            slideNumber: s.slideNumber,
            chapterTitle: s.sectionIdentifier || `Section ${idx + 1}`,
            title: s.title,
            content: s.content,
            speakerNotes: s.speakerNotes,
            equations: (s.equations || []).map((e: any, eqIdx: number) => ({
              latex: e.latex,
              label: e.label || `Formula (${eqIdx + 1})`,
              meaning: e.meaning || `Extracted formula from ${s.title}`
            })),
            definitions: defs,
            conditions: conds,
            examples: [],
            uncertainSymbols: s.uncertainSymbols
          };
        });

        extraction.pageCount = Math.max(...extraction.sections.map(sec => sec.pageNumber || sec.slideNumber || 1));
        extraction.wordCount = extraction.sections.reduce((acc, sec) => acc + sec.content.split(/\s+/).filter(Boolean).length, 0);

        extraction.warnings.push(...extractionWarnings);
        extraction.qualityReport.diagnostics.push(
          ...extractionWarnings.map((w, idx) => ({
            id: `diag-real-${idx}`,
            severity: 'warning' as const,
            type: 'ocr_uncertainty' as const,
            message: w,
            recommendation: 'Verify extracted slide or scanned content.'
          }))
        );
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

      // Pre-synthesize all 7 learning formats so tabs are fully loaded with deep explanations
      const initialFormats: ('map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz')[] = [
        'map', 'simplified', 'notes', 'worked', 'flashcards', 'audio', 'quiz'
      ];
      for (const fmt of initialFormats) {
        try {
          const matResult = AiGeneratorService.generateFormat(docId, docRecord.title, extraction.sections, fmt, 'English');
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
    if (doc.ownerId !== userId && role !== 'lecturer') {
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
    if (doc.ownerId !== userId && role !== 'lecturer') {
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
    if (doc.ownerId !== userId && role !== 'lecturer') {
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
    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: You cannot rename another user\'s document.' });
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
    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: You cannot delete another user\'s document.' });
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

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (role === 'lecturer') {
      // Lecturers can clear course records
      Database.clearAll();
      return res.json({ success: true, message: 'All demo and course documents cleared.' });
    }

    // Scoped clearance for student: only clear own documents
    const userDocs = Database.getDocuments(userId, 'student');
    for (const doc of userDocs) {
      Database.deleteDocument(doc.id);
      if (doc.storagePath && fs.existsSync(doc.storagePath)) {
        try { fs.unlinkSync(doc.storagePath); } catch (e) { /* ignore */ }
      }
    }

    res.json({ success: true, message: 'All your uploaded documents have been cleared.' });
  }
}
