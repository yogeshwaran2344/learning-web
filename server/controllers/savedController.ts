import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { SavedItemRecord } from '../db/schema';

export class SavedController {
  static list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || 'usr-student-1';
    const items = Database.getSavedItems(userId);
    res.json({ savedItems: items });
  }

  static create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || 'usr-student-1';
    const { documentId, documentTitle, type, title, content, citation } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const item: SavedItemRecord = {
      id: 'saved-' + Date.now(),
      userId,
      documentId: documentId || 'general',
      documentTitle: documentTitle || 'Academic Material',
      type: type || 'notes',
      title,
      content,
      savedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      citation
    };

    Database.addSavedItem(item);
    res.status(201).json({ item });
  }

  static delete(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || 'usr-student-1';
    const success = Database.removeSavedItem(req.params.id, userId);
    if (!success) {
      return res.status(404).json({ error: 'Saved item not found.' });
    }
    res.json({ success: true });
  }
}

export class QuizController {
  static submitAttempt(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || 'usr-student-1';
    const { docId } = req.params;
    const { answers, totalQuestions } = req.body;

    // Evaluate answers
    const correctCount = (answers || []).filter((a: any) => a.isCorrect).length;
    const score = Math.round((correctCount / Math.max(1, totalQuestions || answers.length)) * 100);

    const attempt = {
      id: 'attempt-' + Date.now(),
      userId,
      documentId: docId,
      score,
      totalQuestions: totalQuestions || answers.length,
      answers: answers || [],
      attemptedAt: new Date().toISOString()
    };

    Database.recordQuizAttempt(attempt);
    res.status(201).json({ attempt, score, correctCount });
  }

  static getAttempts(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || 'usr-student-1';
    const attempts = Database.getQuizAttempts(userId, req.params.docId);
    res.json({ attempts });
  }
}

export class LecturerController {
  static listCourses(req: AuthenticatedRequest, res: Response) {
    const lecturerId = req.user?.role === 'lecturer' ? req.user.id : undefined;
    const courses = Database.getCourses(lecturerId);
    res.json({ courses });
  }

  static togglePublish(req: AuthenticatedRequest, res: Response) {
    const { courseId } = req.params;
    const course = Database.toggleCoursePublish(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    res.json({ course });
  }
}
