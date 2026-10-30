import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { FeedbackReportRecord } from '../db/schema';

export class FeedbackController {
  static submit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userName = req.user?.name;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication credentials required.' });
      }

      const {
        documentId,
        formatType,
        itemIdentifier,
        reason,
        userComment,
        sourcePassage
      } = req.body;

      if (!documentId || !userComment) {
        return res.status(400).json({ error: 'Document ID and user comment are required.' });
      }

      // Authorization Check: Verify that the document exists and user has authorized access
      const doc = Database.getDocumentById(documentId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const isOwner = doc.ownerId === userId;
      const isLecturerCourseDoc = Database.isDocumentInLecturerCourses(doc.id, userId);
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isLecturerCourseDoc && !isAdmin) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to submit feedback for this document.' });
      }

      const report: FeedbackReportRecord = {
        id: 'fb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        documentId,
        userId,
        userName,
        formatType: formatType || 'general',
        itemIdentifier: itemIdentifier || 'unspecified-item',
        reason: reason || 'other',
        userComment: userComment.trim(),
        sourcePassage: sourcePassage ? String(sourcePassage).slice(0, 500) : undefined,
        status: 'pending',
        reportedAt: new Date().toISOString()
      };

      Database.createFeedbackReport(report);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully. Recorded for faculty and verification audit.',
        report
      });
    } catch (e: any) {
      console.error('Feedback submit error:', e);
      res.status(500).json({ error: 'Failed to submit feedback: ' + e.message });
    }
  }

  static list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication credentials required.' });
      }

      const { documentId, status } = req.query;
      let reports = Database.getFeedbackReports(
        documentId as string | undefined,
        status as string | undefined
      );

      if (role === 'student') {
        // Privacy Enforcement: Students are restricted to their own submitted feedback reports
        reports = reports.filter(r => r.userId === userId);
      } else if (role === 'lecturer') {
        // Privacy Enforcement: Lecturers only see reports regarding documents they own or courses they teach
        const lecturerCourses = Database.getCourses(userId);
        const managedDocIds = new Set(lecturerCourses.flatMap(c => c.documentIds || []));
        const ownedDocs = new Set(Database.getDocuments(userId, 'lecturer').map(d => d.id));
        reports = reports.filter(r => ownedDocs.has(r.documentId) || managedDocIds.has(r.documentId) || r.userId === userId);
      }

      res.json({ reports });
    } catch (e: any) {
      console.error('Feedback list error:', e);
      res.status(500).json({ error: 'Failed to retrieve feedback reports: ' + e.message });
    }
  }

  static update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication credentials required.' });
      }

      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'Valid status (pending, reviewed, resolved) is required.' });
      }

      const report = Database.getFeedbackReportById(id);
      if (!report) {
        return res.status(404).json({ error: 'Feedback report not found.' });
      }

      // Security Authorization: Confirm lecturer actually manages or owns the associated document
      if (role !== 'admin') {
        const doc = Database.getDocumentById(report.documentId);
        const isOwner = doc && doc.ownerId === userId;
        const isCourseLecturer = Database.isDocumentInLecturerCourses(report.documentId, userId);

        if (!isOwner && !isCourseLecturer) {
          return res.status(403).json({
            error: 'Access denied: You can only review and resolve feedback for documents you own or manage in your assigned courses.'
          });
        }
      }

      const success = Database.updateFeedbackReportStatus(
        id,
        status as 'pending' | 'reviewed' | 'resolved',
        resolutionNotes
      );

      if (!success) {
        return res.status(404).json({ error: 'Feedback report not found.' });
      }

      res.json({ success: true, message: `Feedback status updated to ${status}.` });
    } catch (e: any) {
      console.error('Feedback update error:', e);
      res.status(500).json({ error: 'Failed to update feedback: ' + e.message });
    }
  }
}
