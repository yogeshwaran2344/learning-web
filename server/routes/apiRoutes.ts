import { Router } from 'express';
import { authMiddleware, requireLecturerRole } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/uploadMiddleware';

import { AuthController } from '../controllers/authController';
import { DocumentController } from '../controllers/documentController';
import { LearningController } from '../controllers/learningController';
import { VerificationController } from '../controllers/verificationController';
import { SavedController, QuizController, LecturerController } from '../controllers/savedController';
import { IntegrationTestSuite } from '../services/integrationTestSuite';

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
apiRouter.get('/extraction/benchmark', (req, res) => DocumentController.getBenchmark(req, res));
apiRouter.put('/documents/:id/rename', authMiddleware, (req, res) => DocumentController.rename(req, res));
apiRouter.delete('/documents/:id', authMiddleware, (req, res) => DocumentController.delete(req, res));

// 3. Learning Generation & Section 5.6 Verification Suite
apiRouter.post('/documents/:id/generate', authMiddleware, (req, res) => LearningController.generate(req, res));
apiRouter.get('/documents/:id/materials', authMiddleware, (req, res) => LearningController.getMaterials(req, res));
apiRouter.get('/documents/:id/test-generator', (req, res) => LearningController.testGenerator(req, res));
apiRouter.post('/documents/:id/test-generator', (req, res) => LearningController.testGenerator(req, res));

// 4. Source Verification & Meaning Preservation Engine (Phase 6)
apiRouter.get('/documents/:id/verification', authMiddleware, (req, res) => VerificationController.getVerification(req, res));
apiRouter.get('/verification/benchmark', (req, res) => VerificationController.getBenchmark(req, res));
apiRouter.post('/verification/:docId/item/:factId/correct', authMiddleware, (req, res) => VerificationController.correctFact(req, res));

// 5. Saved Materials & Bookmarks
apiRouter.get('/saved', authMiddleware, (req, res) => SavedController.list(req, res));
apiRouter.post('/saved', authMiddleware, (req, res) => SavedController.create(req, res));
apiRouter.delete('/saved/:id', authMiddleware, (req, res) => SavedController.delete(req, res));

// 6. Quizzes & Diagnostic Attempts
apiRouter.post('/quizzes/:docId/attempt', authMiddleware, (req, res) => QuizController.submitAttempt(req, res));
apiRouter.get('/quizzes/:docId/attempts', authMiddleware, (req, res) => QuizController.getAttempts(req, res));

// 7. Lecturer Workspace (Enforced via requireLecturerRole)
apiRouter.get('/lecturer/courses', authMiddleware, (req, res) => LecturerController.listCourses(req, res));
apiRouter.post('/lecturer/courses/:courseId/toggle-publish', authMiddleware, requireLecturerRole, (req, res) => LecturerController.togglePublish(req, res));

// 8. Integration Test Suite (Section 7.5)
apiRouter.get('/system/integration-test', (req, res) => {
  const result = IntegrationTestSuite.runSuite();
  res.json({ integrationSuite: result });
});
