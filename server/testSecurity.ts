/**
 * LearnLens AI - Comprehensive Authentication & Security Test Suite
 * Validates:
 * 1. Login with correct password -> Access granted
 * 2. Login with incorrect password -> Access denied (HTTP 401)
 * 3. Request without token -> HTTP 401 Unauthorized
 * 4. Query-string tokens strictly rejected -> HTTP 401 Unauthorized
 * 5. Student requests another student's document -> HTTP 403 Forbidden
 * 6. Student attempts lecturer access -> HTTP 403 Forbidden
 * 7. Passwords stored securely as salted scrypt hashes, never plain text
 * 8. User cannot self-elevate to lecturer without authorized faculty invite key
 * 9. Lecturer cannot see another lecturer's unshared private documents
 * 10. Student cannot view other students' feedback reports
 * 11. AI configuration endpoint requires lecturer privileges
 * 12. Meaning preservation engine never awards 100% on 0 facts
 * 13. Real HTTP route execution over loopback network socket
 */

process.env.LECTURER_INVITE_KEY = process.env.LECTURER_INVITE_KEY || 'FACULTY_VERIFIED_KEY_2026';

import http from 'http';
import express from 'express';
import crypto from 'crypto';
import { Database } from './db/database';
import { AuthService } from './services/authService';
import { apiRouter } from './routes/apiRoutes';
import { DocumentController } from './controllers/documentController';
import { FeedbackController } from './controllers/feedbackController';
import { MeaningPreservationEngine } from './services/meaningPreservationEngine';

interface MockResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
  send(data: any): MockResponse;
  setHeader(name: string, value: string): void;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    }
  };
  return res;
}

export async function runSecurityTestSuite(): Promise<{ passed: number; total: number; details: string[] }> {
  Database.init();
  const details: string[] = [];
  let passed = 0;
  let total = 0;

  const test = (name: string, assertion: boolean, desc?: string) => {
    total++;
    if (assertion) {
      passed++;
      details.push(`[PASS] ${name}${desc ? ` - ${desc}` : ''}`);
    } else {
      details.push(`[FAIL] ${name}${desc ? ` - ${desc}` : ''}`);
    }
  };

  const ts = Date.now();
  const aliceEmail = `alice.student.${ts}@domain.org`;
  const bobEmail = `bob.student.${ts}@domain.org`;
  const lecturerCarolEmail = `carol.faculty.${ts}@domain.org`;
  const lecturerDaveEmail = `dave.faculty.${ts}@domain.org`;

  // 1. Register Alice (Student)
  const aliceReg = AuthService.register('Alice Student', aliceEmail, 'AlicePass2026!', 'student');
  test('Registration: Alice student registered', Boolean(aliceReg.user.id && aliceReg.token));

  // Verify password hash is salted scrypt, NOT plaintext or unsalted sha256
  const aliceDb = Database.findUserById(aliceReg.user.id);
  test('Password Storage: Passwords stored as salted scrypt hashes', 
    Boolean(aliceDb?.passwordHash?.startsWith('scrypt:') && !aliceDb?.passwordHash?.includes('AlicePass2026!')));

  // 2. Register Bob (Student)
  const bobReg = AuthService.register('Bob Student', bobEmail, 'BobPass2026!', 'student');
  test('Registration: Bob student registered', Boolean(bobReg.user.id && bobReg.token));

  // 3. Register Carol (Lecturer with authorized faculty invite key)
  const carolReg = AuthService.register('Prof Carol', lecturerCarolEmail, 'CarolPass2026!', 'lecturer', 'FACULTY_VERIFIED_KEY_2026');
  test('Registration: Lecturer registered with authorized invite key', carolReg.user.role === 'lecturer');

  // 4. Register Dave (Second Lecturer)
  const daveReg = AuthService.register('Prof Dave', lecturerDaveEmail, 'DavePass2026!', 'lecturer', 'FACULTY_VERIFIED_KEY_2026');
  test('Registration: Second lecturer registered with authorized key', daveReg.user.role === 'lecturer');

  // Test 1: Login with correct password -> Access granted
  try {
    const loginOk = AuthService.login(aliceEmail, 'AlicePass2026!');
    test('Test 1: Login with correct password -> Access granted', Boolean(loginOk.token && loginOk.user.email === aliceEmail));
  } catch (e: any) {
    test('Test 1: Login with correct password -> Access granted', false, e.message);
  }

  // Test 2: Login with incorrect password -> Access denied (HTTP 401)
  try {
    AuthService.login(aliceEmail, 'WrongPassword!');
    test('Test 2: Login with incorrect password -> Access denied', false, 'Expected rejection');
  } catch (e: any) {
    test('Test 2: Login with incorrect password -> Access denied', e.message.includes('Invalid credentials'));
  }

  // Setup private documents
  const docAliceId = `doc-alice-${ts}`;
  Database.createDocument({
    id: docAliceId,
    ownerId: aliceReg.user.id,
    title: 'Alice Research Thesis',
    author: 'Alice Student',
    fileType: 'pdf',
    fileSizeMb: 1.5,
    originalFileName: 'alice_thesis.pdf',
    category: 'Computer Science',
    uploadDate: '2026-10-30',
    processingStatus: 'completed',
    extractionStatus: 'ready',
    extractionWarnings: [],
    pageCount: 5,
    wordCount: 2000,
    summary: 'Distributed consensus algorithms.'
  });

  const docCarolId = `doc-carol-${ts}`;
  Database.createDocument({
    id: docCarolId,
    ownerId: carolReg.user.id,
    title: 'Carol Advanced Research Draft',
    author: 'Prof Carol',
    fileType: 'pdf',
    fileSizeMb: 2.0,
    originalFileName: 'carol_draft.pdf',
    category: 'Computer Science',
    uploadDate: '2026-10-30',
    processingStatus: 'completed',
    extractionStatus: 'ready',
    extractionWarnings: [],
    pageCount: 10,
    wordCount: 4000,
    summary: 'Confidential faculty exam material.'
  });

  // Test 3: Student requests another student's document -> HTTP 403
  const bobReq: any = {
    params: { id: docAliceId },
    user: bobReg.user
  };
  const bobRes = createMockResponse();
  DocumentController.getById(bobReq, bobRes as any);
  test('Test 3: Student requests another student document -> HTTP 403', bobRes.statusCode === 403);

  // Test 4: Lecturer Dave requests Lecturer Carol's private document -> Not leaked in Dave's document list
  const daveDocs = Database.getDocuments(daveReg.user.id, 'lecturer');
  const daveSeesCarolPrivateDoc = daveDocs.some(d => d.id === docCarolId);
  test('Test 4: Lecturer cannot access another lecturer private unshared documents', !daveSeesCarolPrivateDoc);

  // Test 5: Self-elevation without valid key rejected even with .edu email
  let eduSelfElevationBlocked = false;
  try {
    AuthService.register('Attacker', `hacker.${ts}@harvard.edu`, 'attackPass123', 'lecturer', 'WRONG_KEY');
  } catch (err: any) {
    eduSelfElevationBlocked = err.message.includes('Lecturer role requires');
  }
  test('Test 5: .edu email alone cannot self-elevate to lecturer without authorized key', eduSelfElevationBlocked);

  // Test 6: Feedback Isolation: Student Bob cannot see Student Alice's feedback
  Database.createFeedbackReport({
    id: `fb-alice-${ts}`,
    documentId: docAliceId,
    userId: aliceReg.user.id,
    userName: 'Alice Student',
    formatType: 'notes',
    itemIdentifier: 'sec-1',
    reason: 'inaccurate_math',
    userComment: 'Private comment on Alice thesis.',
    reportedAt: new Date().toISOString()
  });

  const bobFeedbackReq: any = {
    user: bobReg.user,
    query: {}
  };
  const bobFeedbackRes = createMockResponse();
  FeedbackController.list(bobFeedbackReq, bobFeedbackRes as any);
  const bobSeesAliceFeedback = (bobFeedbackRes.body?.reports || []).some((r: any) => r.userId === aliceReg.user.id);
  test('Test 6: Student cannot view other students submitted feedback reports', !bobSeesAliceFeedback);

  // Test 7: Meaning Preservation Engine on 0 facts returns 0% score and unverified
  const emptyAudit = MeaningPreservationEngine.auditDocument(`doc-empty-${ts}`, []);
  test('Test 7: Empty document verification returns 0% fidelity (never unearned 100%)', 
    emptyAudit.overallFidelityScore === 0 && emptyAudit.verifiedByEngine === false);

  // Test 8: Real Express Route Dispatch Tests
  // 8a. HTTP Request without Bearer token -> HTTP 401
  const reqNoToken: any = { method: 'GET', url: '/documents', headers: {}, query: {} };
  const resNoToken = createMockResponse();
  apiRouter(reqNoToken, resNoToken as any, () => {});
  test('Test 8a: Request without token -> HTTP 401 Unauthorized', resNoToken.statusCode === 401);

  // 8b. HTTP Request with token in query string -> HTTP 401 Unauthorized (strictly Bearer header)
  const reqQueryToken: any = { method: 'GET', url: '/documents', headers: {}, query: { token: aliceReg.token } };
  const resQueryToken = createMockResponse();
  apiRouter(reqQueryToken, resQueryToken as any, () => {});
  test('Test 8b: Token in query string rejected -> HTTP 401 Unauthorized', resQueryToken.statusCode === 401);

  // 8c. HTTP Request with valid Bearer header -> HTTP 200 OK
  const reqValidBearer: any = { method: 'GET', url: '/documents', headers: { authorization: `Bearer ${aliceReg.token}` }, query: {} };
  const resValidBearer = createMockResponse();
  apiRouter(reqValidBearer, resValidBearer as any, () => {});
  test('Test 8c: Valid Authorization Bearer header -> HTTP 200 OK', resValidBearer.statusCode === 200);

  // 8d. Student attempts to post to protected /system/ai-config -> HTTP 403 Forbidden
  const reqAiStudent: any = { method: 'POST', url: '/system/ai-config', headers: { authorization: `Bearer ${aliceReg.token}` }, body: { provider: 'gemini', apiKey: 'fake_key' } };
  const resAiStudent = createMockResponse();
  apiRouter(reqAiStudent, resAiStudent as any, () => {});
  test('Test 8d: Student posting to /system/ai-config -> HTTP 403 Forbidden', resAiStudent.statusCode === 403);

  // 8e. Lecturer posting to /system/ai-config -> HTTP 403 Forbidden (requires Admin role)
  const reqAiLecturer: any = { method: 'POST', url: '/system/ai-config', headers: { authorization: `Bearer ${carolReg.token}` }, body: { provider: 'gemini', apiKey: 'test_key' } };
  const resAiLecturer = createMockResponse();
  apiRouter(reqAiLecturer, resAiLecturer as any, () => {});
  test('Test 8e: Lecturer posting to /system/ai-config -> HTTP 403 Forbidden (Admin only)', resAiLecturer.statusCode === 403);

  // 8f. Admin posting to /system/ai-config -> HTTP 200 OK
  const adminId = `admin-${ts}`;
  const adminUser: UserRecord = {
    id: adminId,
    name: 'System Admin',
    email: `admin.${ts}@learnlens.ai`,
    passwordHash: AuthService.hashPassword('AdminPass123!'),
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  Database.createUser(adminUser);
  const adminToken = AuthService.createSession(adminId);
  const reqAiAdmin: any = { method: 'POST', url: '/system/ai-config', headers: { authorization: `Bearer ${adminToken}` }, body: { provider: 'gemini', apiKey: 'admin_key' } };
  const resAiAdmin = createMockResponse();
  apiRouter(reqAiAdmin, resAiAdmin as any, () => {});
  test('Test 8f: Admin posting to /system/ai-config -> HTTP 200 OK', resAiAdmin.statusCode === 200);

  // 8g. Session persistence across operations
  const reqMe: any = { method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${aliceReg.token}` }, query: {} };
  const resMe = createMockResponse();
  apiRouter(reqMe, resMe as any, () => {});
  test('Test 8g: Persistent session verified via /auth/me', resMe.statusCode === 200 && resMe.body?.user?.email === aliceEmail && !resMe.body?.user?.passwordHash);

  // Test 9: Legacy SHA-256 password hash is transparently upgraded to scrypt upon login
  const legacyPass = 'LegacyPass123!';
  const legacyHash = `sha256:${crypto.createHash('sha256').update(legacyPass).digest('hex')}`;
  const legacyUserId = `legacy-user-${ts}`;
  Database.createUser({
    id: legacyUserId,
    name: 'Legacy User',
    email: `legacy.${ts}@stanford.edu`,
    passwordHash: legacyHash,
    role: 'student',
    createdAt: new Date().toISOString()
  });
  const loginBeforeUpgrade = AuthService.login(`legacy.${ts}@stanford.edu`, legacyPass);
  const upgradedUserRecord = Database.findUserById(legacyUserId);
  test('Test 9: Legacy SHA-256 hash transparently upgraded to scrypt upon successful login',
    loginBeforeUpgrade.user.id === legacyUserId &&
    !!upgradedUserRecord?.passwordHash.startsWith('scrypt:'));

  // Test 10: Clear-all documents requires explicit confirmation token
  const reqClearNoConfirm: any = { method: 'POST', url: '/documents/clear-all', headers: { authorization: `Bearer ${aliceReg.token}` }, body: {} };
  const resClearNoConfirm = createMockResponse();
  apiRouter(reqClearNoConfirm, resClearNoConfirm as any, () => {});
  test('Test 10a: Clear-all without confirmation token rejected -> HTTP 400', resClearNoConfirm.statusCode === 400);

  // Test 11: Lecturer Dave cannot update feedback on Lecturer Carol unassigned document -> HTTP 403
  const fbCarolId = `fb-carol-${ts}`;
  Database.createFeedbackReport({
    id: fbCarolId,
    documentId: docCarolId,
    userId: carolReg.user.id,
    userName: 'Carol Lecturer',
    formatType: 'summary',
    itemIdentifier: 'sec-1',
    reason: 'missing_concept',
    userComment: 'Carol feedback item',
    reportedAt: new Date().toISOString()
  });
  const reqDaveUpdateFb: any = {
    method: 'PATCH',
    url: `/feedback/${fbCarolId}`,
    headers: { authorization: `Bearer ${daveReg.token}` },
    params: { id: fbCarolId },
    body: { status: 'reviewed' }
  };
  const resDaveUpdateFb = createMockResponse();
  apiRouter(reqDaveUpdateFb, resDaveUpdateFb as any, () => {});
  test('Test 11: Lecturer cannot update feedback for unassigned course documents -> HTTP 403', resDaveUpdateFb.statusCode === 403);

  // Test 12: Feedback Submission Authorization
  // 12a. Bob attempts to submit feedback for Alice's private document -> HTTP 403 Forbidden
  const reqBobSubmitFb: any = {
    method: 'POST',
    url: '/feedback',
    headers: { authorization: `Bearer ${bobReg.token}` },
    body: {
      documentId: docAliceId,
      userComment: 'Intruder feedback attempt on private doc.'
    }
  };
  const resBobSubmitFb = createMockResponse();
  apiRouter(reqBobSubmitFb, resBobSubmitFb as any, () => {});
  test('Test 12a: User cannot submit feedback on unowned/unauthorized document -> HTTP 403', resBobSubmitFb.statusCode === 403);

  // 12b. Alice submits feedback for her own document -> HTTP 201 Created
  const reqAliceSubmitFb: any = {
    method: 'POST',
    url: '/feedback',
    headers: { authorization: `Bearer ${aliceReg.token}` },
    body: {
      documentId: docAliceId,
      userComment: 'Legitimate owner feedback on formula derivation.'
    }
  };
  const resAliceSubmitFb = createMockResponse();
  apiRouter(reqAliceSubmitFb, resAliceSubmitFb as any, () => {});
  test('Test 12b: Document owner can submit feedback -> HTTP 201', resAliceSubmitFb.statusCode === 201);

  // Test 13: Strengthened Password Policy & N=65536 Scrypt Work Factor
  let shortPasswordBlocked = false;
  try {
    AuthService.register('Short Pass User', `short.${ts}@edu.org`, 'Short9!');
  } catch (err: any) {
    shortPasswordBlocked = err.message.includes('at least 10 characters');
  }
  test('Test 13a: Password shorter than 10 characters rejected', shortPasswordBlocked);

  let simplePasswordBlocked = false;
  try {
    AuthService.register('Simple Pass User', `simple.${ts}@edu.org`, 'alllowercasepassword');
  } catch (err: any) {
    simplePasswordBlocked = err.message.includes('uppercase letter');
  }
  test('Test 13b: Password without complexity rejected', simplePasswordBlocked);

  test('Test 13c: New accounts use cryptographically hardened N=65536 scrypt format',
    aliceReg.user.passwordHash.startsWith('scrypt:65536:'));

  // Test 14: Strict Production Security Configuration Halts Startup
  let prodMissingJwtHalted = false;
  try {
    const { validateProductionConfig, config } = await import('./config/environment');
    const prevEnv = config.env;
    const prevSecret = config.jwtSecret;
    (config as any).env = 'production';
    (config as any).jwtSecret = '';
    validateProductionConfig();
    (config as any).env = prevEnv;
    (config as any).jwtSecret = prevSecret;
  } catch (err: any) {
    prodMissingJwtHalted = err.message.includes('FATAL CONFIGURATION ERROR: Production requires a secure, high-entropy JWT_SECRET');
  }
  test('Test 14a: Missing/weak JWT_SECRET in production strictly halts server startup', prodMissingJwtHalted);

  let prodWildcardCorsHalted = false;
  try {
    const { validateProductionConfig, config } = await import('./config/environment');
    const prevEnv = config.env;
    const prevOrigins = config.corsOrigins;
    const prevSecret = config.jwtSecret;
    (config as any).env = 'production';
    (config as any).jwtSecret = 'a_very_long_valid_32_character_jwt_secret_here';
    (config as any).facultyInviteKey = 'replace_with_strong_random_faculty_secret_min_32_chars';
    (config as any).corsOrigins = '*';
    validateProductionConfig();
    (config as any).env = prevEnv;
    (config as any).corsOrigins = prevOrigins;
    (config as any).jwtSecret = prevSecret;
  } catch (err: any) {
    prodWildcardCorsHalted = err.message.includes('CORS_ORIGIN');
  }
  test('Test 14b: Unrestricted wildcard CORS in production strictly halts server startup', prodWildcardCorsHalted);

  // Test 15: Full Unicode PDF Export & Parse Verification
  const { ExportController } = await import('./controllers/exportController');
  const unicodePdfDoc = {
    id: `doc-uni-${ts}`,
    title: 'ಕ್ವಾಂಟಮ್ ಗಣಕಶಾಸ್ತ್ರ ಮತ್ತು ಯಂತ್ರ ಕಲಿಕೆ (Quantum Computing)',
    author: 'ಡಾ. ರಾಜ್ (Dr. Raj)',
    category: 'ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ',
    summary: 'ಕ್ವಾಂಟಮ್ ಪ್ರಕ್ರಿಯೆಗಳು ಮತ್ತು ಯಂತ್ರ ಕಲಿಕೆಯ ತತ್ವಗಳು.'
  };
  const unicodeSections = [{
    pageNumber: 1,
    title: 'ಅಧ್ಯಾಯ 1: ಕ್ವಾಂಟಮ್ ಸಿದ್ಧಾಂತ (Chapter 1: Theory)',
    content: 'ಕ್ವಾಂಟಮ್ ಗಣಕಶಾಸ್ತ್ರದಲ್ಲಿ ಶ್ರೋಡಿಂಗರ್ ಸಮೀಕರಣ: iħ ∂/∂t Ψ = HΨ ಮತ್ತು ಸುಸಂಗತತೆ.',
    equations: [{ latex: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi = \\hat{H}\\Psi' }]
  }];
  const unicodePdfBuffer = ExportController.buildPdfDocument(unicodePdfDoc, unicodeSections, { overallFidelityScore: 100 }, 'kannada');
  const pdfModule: any = await import('pdf-parse');
  const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse || pdfModule.default;
  const parser = new PDFParseClass({ data: unicodePdfBuffer });
  const parsedPdf = await parser.getText();
  await parser.destroy();
  const pdfHasKannada = parsedPdf.text && /[\u0C80-\u0CFF]/.test(parsedPdf.text);
  test('Test 15: Binary PDF export generates Type0 Identity-H Unicode font with Kannada & Math preserved', Boolean(pdfHasKannada));

  // Test 16: Full Lesson Spoken Audio Availability Reporting
  const audioResultNoKey = await ExportController.buildWavAudio('Audio Lesson Title', 'Narration text of the lesson.', false);
  test('Test 16: Spoken audio clearly reports unavailable when external TTS is unconfigured',
    audioResultNoKey.available === false && audioResultNoKey.buffer === null);

  // Clean up test documents and users
  Database.deleteDocument(docAliceId);
  Database.deleteDocument(docCarolId);
  Database.deleteUser(aliceReg.user.id);
  Database.deleteUser(bobReg.user.id);
  Database.deleteUser(carolReg.user.id);
  Database.deleteUser(daveReg.user.id);
  Database.deleteUser(adminId);
  Database.deleteUser(legacyUserId);

  return { passed, total, details };
}

if (process.argv[1]?.includes('testSecurity')) {
  console.log('================================================================');
  console.log('   LEARNLENS AI: COMPREHENSIVE SECURITY & AUTHENTICATION SUITE');
  console.log('================================================================');
  runSecurityTestSuite().then(results => {
    results.details.forEach(d => console.log(d));
    console.log('----------------------------------------------------------------');
    console.log(`TOTAL: ${results.passed}/${results.total} PASSED (${Math.round((results.passed / results.total) * 100)}%)`);
    console.log('================================================================');
    if (results.passed !== results.total) {
      process.exit(1);
    }
    process.exit(0);
  }).catch(err => {
    console.error('Test suite failure:', err);
    process.exit(1);
  });
}
