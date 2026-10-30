import { Router } from 'express';
import { authMiddleware, requireLecturerRole } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import { aiRequestRateLimiter } from '../middleware/rateLimitMiddleware';
import { Database } from '../db/database';

import { AuthController } from '../controllers/authController';
import { DocumentController } from '../controllers/documentController';
import { LearningController } from '../controllers/learningController';
import { VerificationController } from '../controllers/verificationController';
import { SavedController, QuizController, LecturerController } from '../controllers/savedController';
import { ExportController } from '../controllers/exportController';
import { FeedbackController } from '../controllers/feedbackController';
import { IntegrationTestSuite } from '../services/integrationTestSuite';
import { SystemTestTracker } from '../services/systemTestTracker';
import { AiModelService } from '../services/aiModelService';

export const apiRouter = Router();

// 1. User & Authentication
apiRouter.post('/auth/register', (req, res) => AuthController.register(req, res));
apiRouter.post('/auth/login', (req, res) => AuthController.login(req, res));
apiRouter.get('/auth/me', authMiddleware, (req, res) => AuthController.me(req, res));

// 2. Document Upload & Library
apiRouter.post('/documents/upload', authMiddleware, uploadMiddleware.single('file'), (req, res) => DocumentController.upload(req, res));
apiRouter.get('/documents', authMiddleware, (req, res) => DocumentController.list(req, res));
apiRouter.get('/documents/:id', authMiddleware, (req, res) => DocumentController.getById(req, res));
apiRouter.get('/documents/:id/status', authMiddleware, (req, res) => DocumentController.getStatus(req, res));
apiRouter.get('/documents/:id/extraction', authMiddleware, (req, res) => DocumentController.getExtraction(req, res));
apiRouter.get('/extraction/benchmark', authMiddleware, (req, res) => DocumentController.getBenchmark(req, res));
apiRouter.put('/documents/:id/rename', authMiddleware, (req, res) => DocumentController.rename(req, res));
apiRouter.post('/documents/clear-all', authMiddleware, (req, res) => DocumentController.clearAll(req, res));
apiRouter.delete('/documents/:id', authMiddleware, (req, res) => DocumentController.delete(req, res));

// Step 38: Document Export (PDF, PPTX, CSV, JSON, Markdown, Audio Script)
apiRouter.get('/documents/:id/export', authMiddleware, (req, res) => ExportController.exportDocument(req, res));

// 3. Learning Generation & Section 5.6 Verification Suite
apiRouter.post('/documents/:id/generate', authMiddleware, aiRequestRateLimiter, (req, res) => LearningController.generate(req, res));
apiRouter.get('/documents/:id/materials', authMiddleware, (req, res) => LearningController.getMaterials(req, res));
apiRouter.get('/documents/:id/test-generator', authMiddleware, (req, res) => LearningController.testGenerator(req, res));
apiRouter.post('/documents/:id/test-generator', authMiddleware, (req, res) => LearningController.testGenerator(req, res));

// 4. Source Verification & Meaning Preservation Engine (Phase 6)
apiRouter.get('/documents/:id/verification', authMiddleware, (req, res) => VerificationController.getVerification(req, res));
apiRouter.get('/verification/benchmark', authMiddleware, (req, res) => VerificationController.getBenchmark(req, res));
apiRouter.get('/verification/deliberate-tests', authMiddleware, (req, res) => VerificationController.getDeliberateTests(req, res));
apiRouter.post('/verification/:docId/item/:factId/correct', authMiddleware, (req, res) => VerificationController.correctFact(req, res));
apiRouter.post('/verification/:docId/item/:factId/flag', authMiddleware, (req, res) => VerificationController.flagFact(req, res));
apiRouter.post('/verification/:docId/item/:factId/approve', authMiddleware, requireLecturerRole, (req, res) => VerificationController.approveFact(req, res));
apiRouter.post('/verification/:docId/item/:factId/reject', authMiddleware, requireLecturerRole, (req, res) => VerificationController.rejectFact(req, res));

// 5. Saved Materials & Bookmarks
apiRouter.get('/saved', authMiddleware, (req, res) => SavedController.list(req, res));
apiRouter.post('/saved', authMiddleware, (req, res) => SavedController.create(req, res));
apiRouter.delete('/saved/:id', authMiddleware, (req, res) => SavedController.delete(req, res));

// 6. Quizzes & Diagnostic Attempts
apiRouter.post('/quizzes/:docId/attempt', authMiddleware, (req, res) => QuizController.submitAttempt(req, res));
apiRouter.get('/quizzes/:docId/attempts', authMiddleware, (req, res) => QuizController.getAttempts(req, res));
apiRouter.get('/quizzes/:docId/analytics', authMiddleware, (req, res) => QuizController.getAnalytics(req, res));

// 7. Lecturer Workspace (Enforced via requireLecturerRole)
apiRouter.get('/lecturer/courses', authMiddleware, (req, res) => LecturerController.listCourses(req, res));
apiRouter.post('/lecturer/courses/:courseId/toggle-publish', authMiddleware, requireLecturerRole, (req, res) => LecturerController.togglePublish(req, res));
apiRouter.get('/lecturer/courses/:courseId/analytics', authMiddleware, requireLecturerRole, (req, res) => LecturerController.getCourseAnalytics(req, res));
apiRouter.post('/lecturer/courses/:courseId/documents', authMiddleware, requireLecturerRole, (req, res) => LecturerController.assignDocument(req, res));
apiRouter.delete('/lecturer/courses/:courseId/documents/:documentId', authMiddleware, requireLecturerRole, (req, res) => LecturerController.removeDocument(req, res));

// 8. Student Learning Progress (Step 37)
apiRouter.get('/student/progress', authMiddleware, (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication credentials required.' });
  const progress = Database.getStudentProgress(userId);
  res.json({ progress });
});

// 9. Feedback & Continuous Improvement (Step 39)
apiRouter.post('/feedback', authMiddleware, (req, res) => FeedbackController.submit(req, res));
apiRouter.get('/feedback', authMiddleware, (req, res) => FeedbackController.list(req, res));
apiRouter.patch('/feedback/:id', authMiddleware, requireLecturerRole, (req, res) => FeedbackController.update(req, res));

// Development-friendly system test middleware: open in development, lecturer-guarded in production
const devOrLecturerMiddleware = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  return authMiddleware(req, res, () => requireLecturerRole(req, res, next));
};

// 10. Integration & 20-Point System Test Suite
apiRouter.get('/system/integration-test', devOrLecturerMiddleware, (req, res) => {
  const result = IntegrationTestSuite.runSuite();
  res.json({ integrationSuite: result });
});

apiRouter.get('/system/test-tracker', devOrLecturerMiddleware, (req, res) => {
  const result = SystemTestTracker.runFullTracker();
  res.json({ testTracker: result });
});

// 11. AI Model Provider Status & Dynamic API Key Configuration
apiRouter.get('/system/ai-status', (req, res) => {
  res.json({ status: AiModelService.getProviderStatus() });
});

apiRouter.post('/system/ai-config', authMiddleware, requireLecturerRole, (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider || (provider !== 'gemini' && provider !== 'openai')) {
    return res.status(400).json({ error: 'Provider must be "gemini" or "openai"' });
  }
  AiModelService.setCustomApiKey(provider, apiKey || '');
  res.json({ success: true, status: AiModelService.getProviderStatus() });
});
