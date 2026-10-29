import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { SavedItemRecord } from '../db/schema';

export class SavedController {
  static list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication credentials required.' });
    }
    const items = Database.getSavedItems(userId);
    res.json({ savedItems: items });
  }

  static create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication credentials required.' });
    }
    const { documentId, documentTitle, type, title, content, citation } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    // Check if duplicate item already exists to prevent duplication on repeated requests
    const existingItems = Database.getSavedItems(userId);
    const isDuplicate = existingItems.some(
      it => it.documentId === documentId && it.title === title && it.type === type
    );
    if (isDuplicate) {
      const match = existingItems.find(it => it.documentId === documentId && it.title === title);
      return res.status(200).json({ item: match, message: 'Existing bookmark retrieved (no duplicate created).' });
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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication credentials required.' });
    }
    const success = Database.removeSavedItem(req.params.id, userId);
    if (!success) {
      return res.status(404).json({ error: 'Saved item not found or unauthorized.' });
    }
    res.json({ success: true });
  }
}

export class QuizController {
  static submitAttempt(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication credentials required.' });
    }
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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication credentials required.' });
    }
    const attempts = Database.getQuizAttempts(userId, req.params.docId);
    res.json({ attempts });
  }

  static getAnalytics(req: AuthenticatedRequest, res: Response) {
    const { docId } = req.params;
    const analytics = Database.getDocumentQuizAnalytics(docId);
    res.json({ analytics });
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

  static getCourseAnalytics(req: AuthenticatedRequest, res: Response) {
    const { courseId } = req.params;
    const analytics = Database.getCourseQuizAnalytics(courseId);
    if (!analytics) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    res.json({ analytics });
  }

  static assignDocument(req: AuthenticatedRequest, res: Response) {
    const { courseId } = req.params;
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required.' });
    }
    const success = Database.assignDocumentToCourse(courseId, documentId);
    if (!success) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    res.json({ success: true, message: 'Document added to course learning pack.' });
  }

  static removeDocument(req: AuthenticatedRequest, res: Response) {
    const { courseId, documentId } = req.params;
    const success = Database.removeDocumentFromCourse(courseId, documentId);
    if (!success) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    res.json({ success: true, message: 'Document removed from course learning pack.' });
  }
}
