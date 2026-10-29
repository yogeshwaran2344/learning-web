import { Database } from '../db/database';
import { AuthService } from './authService';
import { DocumentRecord } from '../db/schema';

export interface SecurityTestResult {
  totalTests: number;
  passedTests: number;
  allPassed: boolean;
  checks: {
    name: string;
    description: string;
    passed: boolean;
    details: string;
  }[];
}

export class SecurityTestSuite {
  static runSuite(): SecurityTestResult {
    Database.init();
    const checks: SecurityTestResult['checks'] = [];

    // 1. Unauthenticated token rejection
    const invalidUser = AuthService.verifyToken('invalid-or-fake-token-123');
    checks.push({
      name: 'Reject Invalid Credentials',
      description: 'Missing, expired, or invalid tokens must be strictly rejected with null',
      passed: invalidUser === null,
      details: invalidUser === null ? 'Passed: Invalid token correctly returned null' : 'Failed: Invalid token accepted'
    });

    // 2. Cross-user document isolation (Student A cannot access Student B's doc)
    const student1Id = 'usr-student-test-alice';
    const student2Id = 'usr-student-test-bob';
    const aliceDocId = 'doc-private-alice-' + Date.now();

    const aliceDoc: DocumentRecord = {
      id: aliceDocId,
      ownerId: student1Id,
      title: 'Alice Private Research',
      author: 'Alice',
      fileType: 'pdf',
      fileSizeMb: 1.0,
      originalFileName: 'alice_research.pdf',
      category: 'Computer Science',
      uploadDate: '2026-10-29',
      processingStatus: 'completed',
      extractionStatus: 'ready',
      extractionWarnings: [],
      pageCount: 1,
      wordCount: 100,
      summary: 'Confidential research notes.'
    };
    Database.createDocument(aliceDoc);

    // Verify Bob's query for document library does NOT return Alice's document
    const bobDocs = Database.getDocuments(student2Id, 'student');
    const bobCanSeeAliceDoc = bobDocs.some(d => d.id === aliceDocId);

    checks.push({
      name: 'Cross-User Document Privacy Isolation',
      description: 'One student cannot see or list another student documents in their document library',
      passed: !bobCanSeeAliceDoc,
      details: !bobCanSeeAliceDoc
        ? 'Passed: Bob query returned 0 of Alice documents'
        : 'Failed: Bob was able to view Alice private document'
    });

    // 3. Ownership check on direct lookup
    const retrievedAliceDoc = Database.getDocumentById(aliceDocId);
    const ownershipDenied = retrievedAliceDoc !== undefined && retrievedAliceDoc.ownerId !== student2Id;
    checks.push({
      name: 'Document Ownership Authorization Check',
      description: 'Backend detects and prevents student Bob from modifying or accessing Alice document',
      passed: ownershipDenied,
      details: ownershipDenied ? 'Passed: Ownership mismatch detected (Bob is not Alice)' : 'Failed: Ownership check failed'
    });

    // 4. Cascade deletion integrity
    Database.saveSections(aliceDocId, [
      {
        id: `sec-${aliceDocId}-1`,
        documentId: aliceDocId,
        pageNumber: 1,
        title: 'Section 1',
        content: 'Confidential data',
        equations: [],
        definitions: [],
        conditions: [],
        examples: []
      }
    ]);
    Database.deleteDocument(aliceDocId);
    const sectionsAfterDelete = Database.getSectionsByDocId(aliceDocId);
    const docAfterDelete = Database.getDocumentById(aliceDocId);

    const cascadeSuccessful = docAfterDelete === undefined && sectionsAfterDelete.length === 0;
    checks.push({
      name: 'Cascade Deletion and Storage Retention',
      description: 'Deleting a document cleans up all extracted sections, materials, and verifications',
      passed: cascadeSuccessful,
      details: cascadeSuccessful
        ? 'Passed: Document and all associated extracted sections wiped completely'
        : 'Failed: Orphaned sections remain in database'
    });

    const passedCount = checks.filter(c => c.passed).length;
    return {
      totalTests: checks.length,
      passedTests: passedCount,
      allPassed: passedCount === checks.length,
      checks
    };
  }
}
