import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { MeaningPreservationEngine } from '../services/meaningPreservationEngine';
import { VerificationBenchmarkSuite } from '../services/verificationBenchmarkSuite';

export class VerificationController {
  static getVerification(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const doc = Database.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: You do not have permission to view verification results for this document.' });
    }

    let report = Database.getVerification(id);

    if (!report) {
      const sections = Database.getSectionsByDocId(id);
      report = MeaningPreservationEngine.auditDocument(
        id,
        sections,
        doc.processingStatus === 'warning'
      );
      Database.saveVerification(report);
    }

    res.json({ verification: report });
  }

  static getBenchmark(req: AuthenticatedRequest, res: Response) {
    const benchmarkResult = VerificationBenchmarkSuite.runBenchmark();
    res.json({ benchmark: benchmarkResult });
  }

  static correctFact(req: AuthenticatedRequest, res: Response) {
    const { docId, factId } = req.params;
    const { correctedText, userNotes } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    const doc = Database.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: You cannot alter verification audit entries for another user\'s document.' });
    }

    if (!correctedText) {
      return res.status(400).json({ error: 'Corrected statement text is required.' });
    }

    const result = MeaningPreservationEngine.correctAndReverify(
      docId,
      factId,
      correctedText,
      userNotes
    );

    if (!result.success) {
      return res.status(404).json({ error: 'Fact item or document verification report not found.' });
    }

    res.json({
      success: true,
      updatedFact: result.updatedFact,
      auditReport: result.newAuditReport
    });
  }
}
