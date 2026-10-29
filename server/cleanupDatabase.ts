/**
 * Database & Workspace Cleanup Script
 * Cleans out test artifacts, duplicate users, duplicate documents, and restores clean canonical state.
 */

import DatabaseConstructor from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { AiGeneratorService } from './services/aiGeneratorService';

const DB_PATH = path.resolve(process.cwd(), 'server', 'data', 'learnlens.db');

export function cleanupDatabase() {
  console.log('[Cleanup] Connecting to SQLite database at:', DB_PATH);
  const db = new DatabaseConstructor(DB_PATH);

  // 1. Clean test users (Keep only canonical student and lecturer)
  const delUsers = db.prepare(`DELETE FROM users WHERE id NOT IN ('usr-student-1', 'usr-lecturer-1')`).run();
  console.log(`[Cleanup] Removed ${delUsers.changes} temporary/test users.`);

  // Ensure canonical users are present
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, name, passwordHash, role, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('usr-student-1', 'alex.rivera@university.edu', 'Alex Rivera', 'sha256:student123', 'student', '2026-10-01T10:00:00Z');
  insertUser.run('usr-lecturer-1', 'prof.ramesh@iisc.ac.in', 'Prof. Ramesh K.', 'sha256:lecturer123', 'lecturer', '2026-09-15T09:00:00Z');

  // 2. Remove all test / duplicate documents
  const delDocs = db.prepare(`
    DELETE FROM documents
    WHERE id LIKE 'doc-e2e%'
       OR id LIKE 'doc-persist%'
       OR id LIKE 'doc-grace%'
       OR id LIKE 'doc-test%'
       OR id LIKE 'doc-%-%'
       OR ownerId NOT IN ('usr-student-1', 'usr-lecturer-1')
  `).run();
  console.log(`[Cleanup] Removed ${delDocs.changes} test/duplicate documents.`);

  // 3. Clean orphan extracted sections, generated materials, verifications, and quiz attempts
  db.prepare(`DELETE FROM extracted_sections WHERE documentId NOT IN (SELECT id FROM documents)`).run();
  db.prepare(`DELETE FROM generated_materials WHERE documentId NOT IN (SELECT id FROM documents)`).run();
  db.prepare(`DELETE FROM verifications WHERE documentId NOT IN (SELECT id FROM documents)`).run();
  db.prepare(`DELETE FROM quiz_attempts WHERE documentId NOT IN (SELECT id FROM documents)`).run();
  db.prepare(`DELETE FROM feedback_reports WHERE documentId NOT IN (SELECT id FROM documents)`).run();
  db.prepare(`DELETE FROM saved_items WHERE userId NOT IN ('usr-student-1', 'usr-lecturer-1')`).run();

  // 4. Seed Canonical Academic Documents
  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents (
      id, ownerId, title, author, institution, year, fileType, fileSizeMb,
      originalFileName, storagePath, category, uploadDate, processingStatus,
      extractionStatus, extractionWarnings, pageCount, wordCount, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDoc.run(
    'doc-transformer-attention',
    'usr-student-1',
    'Attention Is All You Need: Transformer Architecture',
    'Ashish Vaswani, Noam Shazeer, Niki Parmar, et al.',
    'Google Research / NeurIPS 2017',
    '2017',
    'pdf',
    2.4,
    'attention_is_all_you_need.pdf',
    null,
    'Computer Science',
    '2026-10-24',
    'completed',
    'ready',
    '[]',
    15,
    5420,
    'Proposes the Transformer network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Achieves superior translation quality while being more parallelizable.'
  );

  insertDoc.run(
    'doc-quantum-teleportation',
    'usr-student-1',
    'Quantum Teleportation & Entangled Channels',
    'Charles H. Bennett, Gilles Brassard, Claude Crépeau, et al.',
    'IBM Research / Physical Review Letters',
    '1993',
    'pptx',
    3.1,
    'quantum_teleportation_lecture.pptx',
    null,
    'Physics & Quantum',
    '2026-10-26',
    'completed',
    'ready',
    '[]',
    18,
    4100,
    'Demonstrates that an unknown quantum state can be dismantled and transmitted across a classical channel using a pre-shared Einstein-Podolsky-Rosen (EPR) entangled pair.'
  );

  insertDoc.run(
    'doc-byzantine-agreement',
    'usr-lecturer-1',
    'Practical Byzantine Fault Tolerance (PBFT)',
    'Miguel Castro and Barbara Liskov',
    'MIT Laboratory for Computer Science / OSDI',
    '1999',
    'pdf',
    1.9,
    'pbft_osdi99.pdf',
    null,
    'Distributed Systems',
    '2026-10-28',
    'completed',
    'ready',
    '[]',
    14,
    4900,
    'Presents the first practical state-machine replication protocol that tolerates Byzantine (arbitrary) faults in asynchronous networks like the Internet, preserving safety when fewer than one-third of replicas are faulty.'
  );

  // 5. Seed Extracted Sections for the canonical documents
  const insertSec = db.prepare(`
    INSERT OR REPLACE INTO extracted_sections (
      id, documentId, pageNumber, slideNumber, chapterTitle, title, content,
      equations, definitions, conditions, examples
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSec.run(
    'sec-trans-1',
    'doc-transformer-attention',
    1,
    null,
    '1. Introduction',
    'Recurrent Models vs. Self-Attention',
    'Recurrent neural networks, long short-term memory (LSTM) and gated recurrent networks generate a sequence of hidden states h_t as a function of previous state h_{t-1} and input for position t. This inherently sequential nature precludes parallelization within training examples.',
    JSON.stringify([]),
    JSON.stringify([{ term: 'Sequential Computation Bottleneck', definition: 'The constraint in recurrent networks where step t requires the result of step t-1, preventing GPU parallel processing across the sequence length.' }]),
    JSON.stringify(['Computation cannot proceed in parallel across sequence positions in standard RNNs.']),
    JSON.stringify([])
  );

  insertSec.run(
    'sec-trans-2',
    'doc-transformer-attention',
    3,
    null,
    '3. Model Architecture',
    'Scaled Dot-Product Attention Formulation',
    'We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function to obtain the weights on the values. Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V. For large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients.',
    JSON.stringify([{ latex: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V', label: 'Equation (1)', meaning: 'Matrix dot product of queries Q and transposed keys K scaled by inverse square root of key dimension d_k.' }]),
    JSON.stringify([{ term: 'Scaled Dot-Product Attention', definition: 'Attention mechanism mapping a query and a set of key-value pairs to an output.' }]),
    JSON.stringify(['Scaling factor 1/sqrt(d_k) must counteract gradient vanishing when d_k is large.']),
    JSON.stringify(['Given query vector q and key dimension d_k=64, scale dot products by 1/8 before computing softmax probabilities.'])
  );

  insertSec.run(
    'sec-quant-1',
    'doc-quantum-teleportation',
    1,
    1,
    'Slide 1',
    'Entangled Bell State Channel Preparation',
    'An unknown quantum state |psi> = alpha |0> + beta |1> cannot be measured without collapse. An EPR entangled pair is distributed between Alice and Bob: |Phi+> = (|00> + |11>) / sqrt(2).',
    JSON.stringify([{ latex: '|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)', label: 'EPR Pair', meaning: 'Maximally entangled Bell state shared between Alice and Bob.' }]),
    JSON.stringify([{ term: 'Bell State', definition: 'A maximally entangled quantum state of two qubits.' }]),
    JSON.stringify(['No-cloning theorem prevents copying the unknown state.']),
    JSON.stringify([])
  );

  insertSec.run(
    'sec-pbft-1',
    'doc-byzantine-agreement',
    3,
    null,
    'Section 3: System Model',
    'Resilience Invariant and Replica Quorums',
    'The protocol works in an asynchronous distributed system where nodes may fail by stopping or exhibiting arbitrary Byzantine behavior. A system of n nodes tolerates up to f Byzantine faults if and only if n >= 3f + 1.',
    JSON.stringify([{ latex: 'n \\ge 3f + 1', label: 'PBFT Resilience', meaning: 'Minimum total replicas n required to tolerate f arbitrary Byzantine faults.' }]),
    JSON.stringify([{ term: 'Byzantine Fault Tolerance', definition: 'The property of a distributed system to reach consensus despite malicious or arbitrarily behaving nodes.' }]),
    JSON.stringify(['Total replicas must strictly satisfy n >= 3f + 1 to guarantee intersection of quorums in at least one non-faulty replica.']),
    JSON.stringify(['To tolerate f = 1 Byzantine malicious replica, at least n = 3(1) + 1 = 4 distinct server nodes are mandatory.'])
  );

  // 6. Seed Verifications for the canonical documents
  const insertVer = db.prepare(`
    INSERT OR REPLACE INTO verifications (
      documentId, overallFidelityScore, factRetentionRate, equationIntegrityRate,
      conditionAccuracyRate, terminologyConsistencyRate, unsupportedClaimsDetected,
      alteredEquationsDetected, missingConditionsDetected, lastAuditDate, verifiedByEngine, factChecks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVer.run(
    'doc-transformer-attention',
    98, 97, 100, 98, 97, 0, 0, 0, '2026-10-29', 1,
    JSON.stringify([
      {
        id: 'fc-trans-1',
        documentId: 'doc-transformer-attention',
        originalFact: 'Scaled dot-product attention scales by 1/sqrt(d_k) to prevent vanishing gradients.',
        originalQuote: 'We scale the dot products by 1 / sqrt(d_k) to counteract pushing softmax into extremely small gradients.',
        pageNumber: 3,
        formatFound: ['notes', 'explanation', 'flashcards'],
        status: 'fully_preserved',
        confidenceScore: 0.99,
        notes: 'Grounded against Page 3 Equation 1.'
      }
    ])
  );

  insertVer.run(
    'doc-quantum-teleportation',
    96, 95, 100, 96, 95, 0, 0, 0, '2026-10-29', 1,
    JSON.stringify([
      {
        id: 'fc-quant-1',
        documentId: 'doc-quantum-teleportation',
        originalFact: 'Maximally entangled Bell state is represented as (|00> + |11>) / sqrt(2).',
        originalQuote: 'An ancillary pair of maximally entangled particles |Phi+> is shared between sender and receiver.',
        pageNumber: 1,
        formatFound: ['notes', 'map'],
        status: 'fully_preserved',
        confidenceScore: 0.98,
        notes: 'Grounded against Slide 1 EPR formulation.'
      }
    ])
  );

  insertVer.run(
    'doc-byzantine-agreement',
    99, 99, 100, 100, 98, 0, 0, 0, '2026-10-29', 1,
    JSON.stringify([
      {
        id: 'fc-pbft-1',
        documentId: 'doc-byzantine-agreement',
        originalFact: 'PBFT requires n >= 3f + 1 total replicas to withstand f Byzantine failures.',
        originalQuote: 'A system of n nodes tolerates up to f Byzantine faults if and only if n >= 3f + 1.',
        pageNumber: 3,
        formatFound: ['notes', 'explanation', 'worked'],
        status: 'fully_preserved',
        confidenceScore: 0.99,
        notes: 'Grounded against Section 3 resilience boundary condition.'
      }
    ])
  );

  // 6.5. Seed Generated Materials for all 7 formats across canonical documents
  const insertMat = db.prepare(`
    INSERT OR REPLACE INTO generated_materials (id, documentId, formatType, language, content, generatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const canonicalDocIds = ['doc-transformer-attention', 'doc-quantum-teleportation', 'doc-byzantine-agreement'];
  const allFormats: ('map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz')[] = [
    'map', 'simplified', 'notes', 'worked', 'flashcards', 'audio', 'quiz'
  ];

  for (const docId of canonicalDocIds) {
    const docRow = db.prepare('SELECT title FROM documents WHERE id = ?').get(docId) as any;
    const secRows = db.prepare('SELECT * FROM extracted_sections WHERE documentId = ?').all(docId) as any[];
    const sections = secRows.map(r => ({
      ...r,
      equations: JSON.parse(r.equations || '[]'),
      definitions: JSON.parse(r.definitions || '[]'),
      conditions: JSON.parse(r.conditions || '[]'),
      examples: JSON.parse(r.examples || '[]'),
      uncertainSymbols: JSON.parse(r.uncertainSymbols || '[]')
    }));

    for (const fmt of allFormats) {
      try {
        const generated = AiGeneratorService.generateFormat(docId, docRow.title, sections, fmt, 'English');
        insertMat.run(`mat-${fmt}-${docId}`, docId, fmt, 'English', JSON.stringify(generated), new Date().toISOString());
      } catch (err) {
        console.warn(`Failed to seed format ${fmt} for ${docId}:`, err);
      }
    }
  }

  // 7. Restore Clean Course Packs
  const updateCourse = db.prepare(`
    INSERT OR REPLACE INTO courses (id, lecturerId, code, title, studentCount, documentIds, isPublished, averageQuizScore)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  updateCourse.run('course-1', 'usr-lecturer-1', 'CS-401', 'Distributed Systems & Byzantine Fault Tolerance', 42, JSON.stringify(['doc-byzantine-agreement']), 1, 84.5);
  updateCourse.run('course-2', 'usr-lecturer-1', 'PH-202', 'Quantum Mechanics & Entangled Channels', 38, JSON.stringify(['doc-quantum-teleportation']), 1, 79.0);
  updateCourse.run('course-3', 'usr-lecturer-1', 'AI-501', 'Transformer Architectures & Attention Mechanisms', 56, JSON.stringify(['doc-transformer-attention']), 1, 91.0);

  // 8. Clean up old backup files
  const backupDir = path.resolve(process.cwd(), 'server', 'data', 'backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(backupDir, f));
      } catch (_) {}
    }
    console.log(`[Cleanup] Removed ${files.length} old backup snapshot file(s).`);
  }

  // 9. Clean up uploads dir
  const uploadsDir = path.resolve(process.cwd(), 'server', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(uploadsDir, f));
      } catch (_) {}
    }
  }

  console.log('[Cleanup] Database and files successfully cleaned. Exactly 3 canonical documents and 2 canonical users remain.');
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('cleanupDatabase')) {
  cleanupDatabase();
}
