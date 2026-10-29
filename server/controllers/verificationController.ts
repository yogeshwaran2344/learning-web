import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { MeaningPreservationEngine } from '../services/meaningPreservationEngine';
import { VerificationBenchmarkSuite } from '../services/verificationBenchmarkSuite';
import { DeliberateTestRunner } from '../services/deliberateTestCollection';

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

  static getDeliberateTests(req: AuthenticatedRequest, res: Response) {
    const result = DeliberateTestRunner.evaluateCollection();
    res.json({ deliberateTests: result });
  }

  static flagFact(req: AuthenticatedRequest, res: Response) {
    const { docId, factId } = req.params;
    const { reason, userComment } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    const doc = Database.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: You cannot flag items on another user\'s document.' });
    }

    const report = Database.getVerification(docId);
    if (!report) {
      return res.status(404).json({ error: 'Verification report not found.' });
    }

    const fact = report.factChecks.find(f => f.id === factId);
    if (!fact) {
      return res.status(404).json({ error: 'Fact check item not found.' });
    }

    fact.status = 'needs_review';
    fact.flagReason = reason || 'unsupported_claim';
    fact.notes = `Flagged for Faculty Review by Student: ${userComment || 'Potential discrepancy with source passage.'}`;

    // Recalculate dynamic fidelity metrics
    const preservedCount = report.factChecks.filter(f => f.status === 'fully_preserved').length;
    report.factRetentionRate = Math.round((preservedCount / report.factChecks.length) * 100);
    report.unsupportedClaimsDetected = report.factChecks.filter(f => f.status !== 'fully_preserved').length;
    report.overallFidelityScore = Math.min(100, Math.round((preservedCount / report.factChecks.length) * 100));

    Database.saveVerification(report);

    res.json({
      success: true,
      message: 'Item flagged for lecturer review.',
      updatedFact: fact,
      auditReport: report
    });
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

  static approveFact(req: AuthenticatedRequest, res: Response) {
    const { docId, factId } = req.params;
    const { facultyNotes } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    const doc = Database.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: Lecturer privileges required to approve groundings.' });
    }

    const note = facultyNotes || 'Verified & Grounded by Faculty Review.';
    const result = Database.updateFactCheckStatus(docId, factId, 'fully_preserved', note);
    if (!result) {
      return res.status(404).json({ error: 'Fact item or verification report not found.' });
    }

    res.json({
      success: true,
      message: 'Fact item approved and verified.',
      updatedFact: result.fact,
      auditReport: result.report
    });
  }

  static rejectFact(req: AuthenticatedRequest, res: Response) {
    const { docId, factId } = req.params;
    const { facultyNotes } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    const doc = Database.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (doc.ownerId !== userId && role !== 'lecturer') {
      return res.status(403).json({ error: 'Access denied: Lecturer privileges required to reject groundings.' });
    }

    const note = facultyNotes || 'Rejected by Faculty: Not sufficiently grounded in source passage.';
    const result = Database.updateFactCheckStatus(docId, factId, 'needs_review', note);
    if (!result) {
      return res.status(404).json({ error: 'Fact item or verification report not found.' });
    }

    res.json({
      success: true,
      message: 'Fact item marked as rejected/unsupported.',
      updatedFact: result.fact,
      auditReport: result.report
    });
  }
}
