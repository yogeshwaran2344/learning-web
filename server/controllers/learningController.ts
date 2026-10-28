import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { AiGeneratorService, DifficultyLevel } from '../services/aiGeneratorService';
import { MeaningPreservationEngine } from '../services/meaningPreservationEngine';
import { AiGeneratorTestSuite } from '../services/aiGeneratorTestSuite';
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

      if (doc.ownerId !== userId && role !== 'lecturer') {
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
    if (doc.ownerId !== userId && role !== 'lecturer') {
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

      const sections = Database.getSectionsByDocId(id);
      const testResult = AiGeneratorTestSuite.runFullSuite(id, doc.title, sections);

      res.json({ testResult });
    } catch (e: any) {
      console.error('Generator test suite error:', e);
      res.status(500).json({ error: 'Test suite error: ' + e.message });
    }
  }
}
