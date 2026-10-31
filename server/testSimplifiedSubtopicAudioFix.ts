import assert from 'assert';
import { cleanSubtopicTitle, cleanSpokenBody } from '../src/components/Workspace/AudioLessonView';
import { StorageService } from '../src/services/storageService';
import { TopicHierarchyService } from '../src/services/topicHierarchyService';

console.log('🧪 Starting Simplified Subtopic Audio & Unhandled Exception Fix Test Suite...\n');

let passedTests = 0;

// Test 1: cleanSubtopicTitle removes course codes, department headers, slide numbers, bullets
console.log('Test 1: Verifying cleanSubtopicTitle removes institutional noise and extracts pure subtopic');
const dirtyTitle = '4. Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information';
const cleanedTitle = cleanSubtopicTitle(dirtyTitle);
console.log(`   Dirty:   "${dirtyTitle}"`);
console.log(`   Cleaned: "${cleanedTitle}"`);
assert.strictEqual(cleanedTitle.includes('24AIM51'), false, 'Should strip course code');
assert.strictEqual(cleanedTitle.includes('Department of AIML'), false, 'Should strip department banner');
assert.strictEqual(cleanedTitle.includes('NHCE'), false, 'Should strip college abbreviation');
assert.strictEqual(cleanedTitle.includes('•'), false, 'Should strip bullet');
assert.strictEqual(cleanedTitle.toLowerCase().includes('accounting information'), true, 'Should retain true subtopic name');
passedTests++;
console.log('   ✅ Passed Test 1\n');

// Test 2: cleanSpokenBody removes "Teacher:", "Student:", "Good question!" and dialogue roleplay
console.log('Test 2: Verifying cleanSpokenBody removes teacher-student dialogue tags and filler');
const dirtyScript = `Teacher: Welcome! Today we are exploring 4. Operating Systems 24AIM51. Let's make this simple and practical. Student: What is the core idea here? Teacher: Good question! Section 4: Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information. This information includes the amount of CPU and real time used, time limits, account numbers... Student: That clarifies the idea! How should I remember this for the exam? Teacher: Remember, everything is grounded in Page 4. Keep up the great work!`;
const cleanedScript = cleanSpokenBody(dirtyScript);
console.log(`   Cleaned script: "${cleanedScript.slice(0, 160)}..."`);
assert.strictEqual(/Teacher:/i.test(cleanedScript), false, 'Should not contain Teacher: tag');
assert.strictEqual(/Student:/i.test(cleanedScript), false, 'Should not contain Student: tag');
assert.strictEqual(/Good question!/i.test(cleanedScript), false, 'Should not contain Good question! filler');
assert.strictEqual(/24AIM51/i.test(cleanedScript), false, 'Should not contain course code');
assert.strictEqual(/Department of AIML/i.test(cleanedScript), false, 'Should not contain department info');
assert.strictEqual(cleanedScript.includes('CPU and real time used'), true, 'Should preserve core academic content');
passedTests++;
console.log('   ✅ Passed Test 2\n');

// Test 3: Multiple college course header formats are sanitized
console.log('Test 3: Sanitizing various course codes, syllabus tags, and slide headers');
const testCases = [
  { raw: 'Section 3: Database Management Systems 21CS33. Module 2 • B-Tree Indexing', expected: 'B-Tree Indexing' },
  { raw: 'Slide 12: Computer Networks 18CS51 - Dept of CSE, VTU • Congestion Control in TCP', expected: 'Congestion Control in TCP' },
  { raw: '1. Machine Learning BCS401 • Gradient Descent Optimization', expected: 'Gradient Descent Optimization' },
  { raw: 'Virtual Memory & Page Replacement', expected: 'Virtual Memory & Page Replacement' }
];

testCases.forEach(({ raw, expected }) => {
  const res = cleanSubtopicTitle(raw);
  console.log(`   Input: "${raw}" -> "${res}"`);
  assert.strictEqual(res.toLowerCase().includes(expected.toLowerCase()), true, `Expected "${res}" to include "${expected}"`);
  assert.strictEqual(/21CS33|18CS51|BCS401|Dept of CSE|VTU/i.test(res), false, 'Should not contain institutional code');
});
passedTests++;
console.log('   ✅ Passed Test 3\n');

// Test 4: StorageService defensive normalization against undefined arrays (No crashes on .length)
console.log('Test 4: StorageService prevents unhandled interface exceptions from undefined properties');
const malformedDoc: any = {
  id: 'test-malformed-doc',
  title: 'Test Document',
  conceptMap: { nodes: null, branches: undefined },
  topicHierarchy: {
    chapters: [
      { id: 'ch-1', title: 'Chapter 1', topics: undefined }
    ]
  },
  audioLesson: {
    sections: undefined,
    segments: undefined
  }
};

const sanitized = StorageService.sanitizeDocument(malformedDoc);
assert.strictEqual(Array.isArray(sanitized.conceptMap.nodes), true, 'conceptMap.nodes must be an array');
assert.strictEqual(Array.isArray((sanitized.conceptMap as any).branches), true, 'conceptMap.branches must be an array');
assert.strictEqual(Array.isArray(sanitized.topicHierarchy?.chapters), true, 'topicHierarchy.chapters must be an array');
assert.strictEqual(Array.isArray(sanitized.topicHierarchy?.chapters[0].topics), true, 'chapter.topics must be an array');
assert.strictEqual(Array.isArray(sanitized.audioLesson.sections), true, 'audioLesson.sections must be an array');
assert.strictEqual(sanitized.audioLesson.sections.length > 0, true, 'audioLesson.sections must not be empty');
passedTests++;
console.log('   ✅ Passed Test 4\n');

// Test 5: Verify buildHierarchy sanitizes and structures topics without crashes
console.log('Test 5: Verifying TopicHierarchyService builds clean hierarchy without institutional junk');
const hierarchy = TopicHierarchyService.buildHierarchy({
  id: 'doc-os-unit2',
  title: 'Operating Systems',
  pageCount: 10,
  sections: [
    {
      id: 's1',
      title: '4. Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information',
      pageNumber: 4,
      content: 'This information includes the amount of CPU and real time used, time limits, account numbers, and process numbers.'
    }
  ]
});
assert.strictEqual(hierarchy.chapters.length > 0, true, 'Should create chapters');
const allTopics = hierarchy.chapters.flatMap(c => c.topics);
assert.strictEqual(allTopics.length > 0, true, 'Should extract topics');
assert.strictEqual(allTopics[0].title.includes('24AIM51'), false, 'Topic title should not have course code');
assert.strictEqual(allTopics[0].title.includes('Department of AIML'), false, 'Topic title should not have dept');
passedTests++;
console.log('   ✅ Passed Test 5\n');

console.log(`🎉 ALL ${passedTests}/${passedTests} SIMPLIFIED SUBTOPIC AUDIO & DEFENSIVE LENGTH TESTS PASSED SUCCESSFULLY!`);
