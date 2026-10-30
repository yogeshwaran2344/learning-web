import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { AiGeneratorService, DifficultyLevel } from '../services/aiGeneratorService';
import { MeaningPreservationEngine } from '../services/meaningPreservationEngine';
import { AiGeneratorTestSuite } from '../services/aiGeneratorTestSuite';
import { ExplainThisService } from '../services/explainThisService';
import { AppLanguage } from '../db/schema';

export class LearningController {
  static async generate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { formatType, language = 'English', difficulty = 'intermediate', forceRegenerate = false } = req.body;
      const userId = req.user?.id;
      const role = req.user?.role;

      const doc = Database.getDocumentById(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const isOwner = doc.ownerId === userId;
      const isCourseLecturer = role === 'lecturer' && Database.isDocumentInLecturerCourses(doc.id, userId!);
      const isShared = Database.isDocumentSharedWithStudents(doc.id);
      const isAdmin = role === 'admin';

      if (!isOwner && !isCourseLecturer && !isShared && !isAdmin) {
        return res.status(403).json({ error: 'Access denied: You cannot generate learning materials for another user\'s document.' });
      }

      const sections = Database.getSectionsByDocId(id);
      const hasWarnings = (doc.extractionWarnings && doc.extractionWarnings.length > 0) || false;

      // Check cache if not forcing regeneration
      if (!forceRegenerate) {
        const existing = Database.getMaterial(id, formatType, language as AppLanguage);
        if (existing) {
          const verification = MeaningPreservationEngine.auditGeneratedFormat(
            id,
            existing.content,
            sections,
            hasWarnings
          );
          return res.json({ material: existing, verification, cached: true });
        }
      }

      // Step 5.2: Generate format using relevant extracted content (AI model or deterministic fallback)
      const generated = await AiGeneratorService.generateFormatAsync(
        id,
        doc.title,
        sections,
        formatType,
        language as AppLanguage,
        difficulty as DifficultyLevel
      );

      // Step 5.5: Meaning Preservation Engine audits generated output independently
      const verification = MeaningPreservationEngine.auditGeneratedFormat(
        id,
        generated,
        sections,
        hasWarnings
      );

      const record = {
        id: `mat-${formatType}-${language}-${Date.now()}`,
        documentId: id,
        formatType,
        language: language as AppLanguage,
        content: generated,
        generationSource: generated.generationSource || 'deterministic_fallback',
        modelName: generated.modelName || 'Deterministic Engine',
        isAiFallback: generated.isAiFallback ?? true,
        verificationStatus: verification.status,
        generatedAt: new Date().toISOString()
      };

      Database.saveMaterial(record);
      res.status(201).json({ material: record, verification, cached: false });
    } catch (e: any) {
      console.error('Learning generation error:', e);
      res.status(500).json({ error: 'Generation error: ' + e.message });
    }
  }

  static getMaterials(req: AuthenticatedRequest, res: Response) {
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
      return res.status(403).json({ error: 'Access denied: You cannot view materials for another user\'s document.' });
    }
    const materials = Database.getMaterialsByDocId(req.params.id);
    res.json({ materials });
  }

  static testGenerator(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const doc = Database.getDocumentById(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const userId = req.user?.id;
      const role = req.user?.role;
      const isOwner = doc.ownerId === userId;
      const isCourseLecturer = role === 'lecturer' && Database.isDocumentInLecturerCourses(doc.id, userId!);
      const isAdmin = role === 'admin';

      if (!isOwner && !isCourseLecturer && !isAdmin) {
        return res.status(403).json({ error: 'Access denied: You cannot run generator tests for another user\'s document.' });
      }

      const sections = Database.getSectionsByDocId(id);
      const testResult = AiGeneratorTestSuite.runFullSuite(id, doc.title, sections);

      res.json({ testResult });
    } catch (e: any) {
      console.error('Generator test suite error:', e);
      res.status(500).json({ error: 'Test suite error: ' + e.message });
    }
  }

  /**
   * Step 3: Explain This Feature
   * Explains any confusing sentence, paragraph, or concept in simpler language
   * while preserving mathematical and theoretical invariants.
   */
  static async explainThis(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        documentId,
        selectionText,
        contextSnippet,
        difficulty = 'beginner',
        language = 'English',
        pageNumber,
        sectionTitle
      } = req.body;
      if (!documentId || !selectionText) {
        return res.status(400).json({ error: 'documentId and selectionText are required.' });
      }

      const doc = Database.getDocumentById(documentId);
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
        return res.status(403).json({ error: 'Access denied: You cannot access explanations for another user\'s document.' });
      }

      const result = await ExplainThisService.explainSelection(
        documentId,
        selectionText,
        contextSnippet || '',
        difficulty as DifficultyLevel,
        language as AppLanguage,
        pageNumber ? Number(pageNumber) : undefined,
        sectionTitle
      );

      res.json({ explanation: result });
    } catch (e: any) {
      console.error('ExplainThis error:', e);
      res.status(500).json({ error: 'Explain error: ' + e.message });
    }
  }

  /**
   * Step 7: Ask Follow-up Question
   * Allows students to ask clarifying questions about a document or section.
   */
  static async askQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        documentId,
        question,
        currentSectionTitle,
        difficulty = 'intermediate',
        language = 'English',
        pageNumber
      } = req.body;
      if (!documentId || !question) {
        return res.status(400).json({ error: 'documentId and question are required.' });
      }

      const doc = Database.getDocumentById(documentId);
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
        return res.status(403).json({ error: 'Access denied: You cannot ask questions about another user\'s document.' });
      }

      const result = await ExplainThisService.answerFollowUp(
        documentId,
        question,
        currentSectionTitle,
        difficulty as DifficultyLevel,
        language as AppLanguage,
        pageNumber ? Number(pageNumber) : undefined
      );

      res.json({ response: result });
    } catch (e: any) {
      console.error('AskQuestion error:', e);
      res.status(500).json({ error: 'Question answering error: ' + e.message });
    }
  }
}
