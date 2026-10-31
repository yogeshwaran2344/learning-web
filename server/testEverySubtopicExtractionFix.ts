import assert from 'assert';
import { TopicHierarchyService } from '../src/services/topicHierarchyService';
import { DocumentSection } from '../src/types';

console.log('🧪 Starting "Show Every Subtopic in File" Verification Suite...\n');

let passed = 0;

// Test 1: Extract every bullet point as a real subtopic
console.log('Test 1: Verifying every bullet point in section content is extracted as an explicit subtopic');
const pcbSection: DocumentSection = {
  id: 'sec-pcb-1',
  title: 'Process Control Block (PCB)',
  pageNumber: 4,
  content: `Each process is represented in the operating system by a Process Control Block (PCB).
It contains the following key components:
- Process state
- Program counter
- CPU registers
- CPU-scheduling information
- Memory-management information
- Accounting information
- I/O status information`
};

const subtopics1 = TopicHierarchyService.extractEvidenceSubtopics(pcbSection, 'Process Control Block (PCB)', 4);
console.log(`   Extracted ${subtopics1.length} subtopics from PCB bullet list:`);
subtopics1.forEach(s => console.log(`   • ${s.title}`));

assert.strictEqual(subtopics1.length >= 7, true, `Expected at least 7 subtopics, got ${subtopics1.length}`);
const titles = subtopics1.map(s => s.title.toLowerCase());
assert.strictEqual(titles.includes('accounting information'), true, 'Should include Accounting information');
assert.strictEqual(titles.includes('cpu registers'), true, 'Should include CPU registers');
assert.strictEqual(titles.includes('process state'), true, 'Should include Process state');
assert.strictEqual(titles.some(t => t.includes('principles')), false, 'Must NOT contain fake "Principles" suffix');
passed++;
console.log('   ✅ Passed Test 1\n');

// Test 2: Extract numbered / colon definition subtopics (e.g., Process States)
console.log('Test 2: Verifying numbered and colon-separated state definitions are extracted as distinct subtopics');
const statesSection: DocumentSection = {
  id: 'sec-states-1',
  title: 'Process States',
  pageNumber: 5,
  content: `As a process executes, it changes state:
1. New: The process is being created.
2. Ready: The process is waiting to be assigned to a processor.
3. Running: Instructions are being executed.
4. Waiting: The process is waiting for some event to occur.
5. Terminated: The process has finished execution.`
};

const subtopics2 = TopicHierarchyService.extractEvidenceSubtopics(statesSection, 'Process States', 5);
console.log(`   Extracted ${subtopics2.length} subtopics from Process States:`);
subtopics2.forEach(s => console.log(`   • ${s.title}`));

assert.strictEqual(subtopics2.length >= 5, true, `Expected at least 5 subtopics, got ${subtopics2.length}`);
const titles2 = subtopics2.map(s => s.title.toLowerCase());
assert.strictEqual(titles2.some(t => t.includes('new')), true, 'Should include New state');
assert.strictEqual(titles2.some(t => t.includes('ready')), true, 'Should include Ready state');
assert.strictEqual(titles2.some(t => t.includes('running')), true, 'Should include Running state');
assert.strictEqual(titles2.some(t => t.includes('waiting')), true, 'Should include Waiting state');
assert.strictEqual(titles2.some(t => t.includes('terminated')), true, 'Should include Terminated state');
passed++;
console.log('   ✅ Passed Test 2\n');

// Test 3: Complete Hierarchy contains real chapter and all real subtopics
console.log('Test 3: Verifying full DocumentTopicHierarchy builds multi-subtopic tree without generic filler');
const docHierarchy = TopicHierarchyService.buildHierarchy({
  id: 'doc-module2-notes',
  title: 'module 2 notes',
  pageCount: 5,
  sections: [
    {
      id: 's1',
      title: 'Chapter 1: Process Management',
      pageNumber: 1,
      content: `A process is a program in execution.
Key attributes:
- Text section
- Program counter
- Stack pointer
- Data section`
    },
    pcbSection,
    statesSection
  ]
});

console.log(`   Hierarchy chapters count: ${docHierarchy.chapters.length}`);
console.log(`   Total topics count:       ${docHierarchy.totalTopicsCount}`);
console.log(`   Total subtopics count:    ${docHierarchy.totalSubtopicsCount}`);

assert.strictEqual(docHierarchy.chapters.length > 0, true, 'Should have chapters');
assert.strictEqual(docHierarchy.totalSubtopicsCount >= 12, true, `Expected at least 12 subtopics across document, got ${docHierarchy.totalSubtopicsCount}`);

// Verify no fake "1.2 Prerequisite Dependencies" exists
const allTopicTitles = docHierarchy.chapters.flatMap(c => c.topics).map(t => t.title);
console.log('   Topics detected:');
allTopicTitles.forEach(t => console.log(`     - ${t}`));

assert.strictEqual(allTopicTitles.some(t => t.includes('Prerequisite Dependencies')), false, 'Must NOT contain fake Prerequisite Dependencies');
assert.strictEqual(allTopicTitles.some(t => t.includes('Foundational Architecture')), false, 'Must NOT contain fake Foundational Architecture');
passed++;
console.log('   ✅ Passed Test 3\n');

// Test 4: Auth middleware allows seamless student access without 401
console.log('Test 4: Verifying authMiddleware permits unauthenticated student uploads gracefully');
import { authMiddleware } from '../server/middleware/authMiddleware';
let nextCalled = false;
const mockReq: any = { headers: {} };
const mockRes: any = {
  status: (code: number) => ({
    json: (body: any) => { throw new Error(`Unexpected status ${code}: ${JSON.stringify(body)}`); }
  })
};

authMiddleware(mockReq, mockRes, () => { nextCalled = true; });
assert.strictEqual(nextCalled, true, 'authMiddleware must call next() for student guest access');
assert.strictEqual(mockReq.user?.role, 'student', 'Guest student user must be assigned');
passed++;
console.log('   ✅ Passed Test 4\n');

console.log(`🎉 ALL ${passed}/${passed} "SHOW EVERY SUBTOPIC IN FILE" TESTS PASSED SUCCESSFULLY!`);
