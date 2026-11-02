import assert from 'assert';
import { StorageService } from '../src/services/storageService';
import { ConceptMapService } from '../src/services/conceptMapService';
import { cleanSubtopicTitle, cleanSpokenBody } from '../src/components/Workspace/AudioLessonView';
import { AcademicDocument } from '../src/types';

console.log('--- 🧪 STARTING NIGHT-BEFORE EXAM CRAM & CONCEPT MAP TEST SUITE ---');

// Test 1: Zero length or undefined exceptions when sanitizing legacy documents
console.log('Test 1: Sanitizing legacy documents with undefined subtopics or pageRange');
const legacyCorruptedDoc: any = {
  id: 'doc-legacy-1',
  title: 'module 2 notes',
  topicHierarchy: {
    documentId: 'doc-legacy-1',
    documentTitle: 'module 2 notes',
    totalChaptersCount: 1,
    totalTopicsCount: 2,
    chapters: [
      {
        id: 'chap-1',
        chapterNumber: 1,
        title: '1. Introduction & Overview',
        // pageRange intentionally undefined
        topics: [
          {
            id: 'top-1',
            title: '1.1 Introduction & Overview',
            // subtopics intentionally undefined
            // pageRange intentionally undefined
          },
          {
            id: 'top-2',
            title: '1.2 Prerequisite Dependencies All definitions maintain bidirectional ground truth against original source references.',
            // subtopics intentionally undefined
          }
        ]
      }
    ]
  },
  audioLesson: {
    id: 'audio-legacy-1',
    title: 'Operating Systems Audio',
    totalDurationSeconds: 120,
    sections: [
      {
        id: 'sec-1',
        sectionTitle: 'Section 4: Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information',
        durationSeconds: 60,
        scriptText: "Teacher: Welcome! Today we are exploring 4. Operating Systems 24AIM51. Let's make this simple and practical. Student: What is the core idea here? Teacher: Good question! Section 4: Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information. This information includes the amount of CPU and real time used, time limits, account numbers..."
      }
    ]
  }
};

const sanitized = (StorageService as any).sanitizeDocument(legacyCorruptedDoc) as AcademicDocument;

// Verify fake topic removed
const topics = sanitized.topicHierarchy?.chapters[0]?.topics || [];
assert.strictEqual(topics.some(t => t.title.includes('Prerequisite Dependencies')), false, 'Legacy fake topic must be pruned');

// Verify pageRange and subtopics are always defined arrays
topics.forEach(t => {
  assert.ok(Array.isArray(t.pageRange), 'Topic pageRange must be array');
  assert.ok(Array.isArray(t.subtopics), 'Topic subtopics must be array');
});

// Verify audio cleaned
const audioSec = sanitized.audioLesson?.sections[0];
assert.ok(audioSec, 'Audio section should exist');
assert.strictEqual(/Teacher:/i.test(audioSec.scriptText), false, 'Audio must not contain Teacher: tag');
assert.strictEqual(/Student:/i.test(audioSec.scriptText), false, 'Audio must not contain Student: tag');
assert.strictEqual(/Department of AIML/i.test(audioSec.sectionTitle), false, 'Section title must not have department headers');
assert.strictEqual(audioSec.sectionTitle, 'Accounting information', 'Section title should be clean topic name');
console.log('✅ Test 1 Passed: Legacy documents safely repaired and sanitized.');

// Test 2: Audio cleaning functions remove dialogue and institutional tags
console.log('Test 2: Audio cleaning functions');
const rawTitle = '4. Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information';
const cleanedTitle = cleanSubtopicTitle(rawTitle);
assert.strictEqual(cleanedTitle, 'Accounting information', 'cleanSubtopicTitle must strip code and college');

const rawSpoken = "Teacher: Welcome! Today we are exploring 4. Operating Systems 24AIM51. Let's make this simple and practical. Student: What is the core idea here? Teacher: Good question! Section 4: Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information. This information includes the amount of CPU and real time used.";
const cleanedSpoken = cleanSpokenBody(rawSpoken);
assert.strictEqual(/Teacher:/i.test(cleanedSpoken), false, 'Must strip Teacher:');
assert.strictEqual(/Student:/i.test(cleanedSpoken), false, 'Must strip Student:');
assert.strictEqual(/Good question!/i.test(cleanedSpoken), false, 'Must strip Good question!');
assert.strictEqual(/NHCE/i.test(cleanedSpoken), false, 'Must strip NHCE');
console.log('✅ Test 2 Passed: cleanSubtopicTitle & cleanSpokenBody correctly purify script.');

// Test 3: Concept Map generation with missing fields does NOT crash
console.log('Test 3: Concept Map generation robustness');
const testDoc: AcademicDocument = {
  id: 'doc-test-concept',
  title: 'Operating Systems Revision',
  fileType: 'pdf',
  uploadedAt: new Date().toISOString(),
  sections: [
    {
      id: 'sec-1',
      title: 'Process Concept',
      content: 'A process is a program in execution. It contains text section, data section, heap, and stack.',
      pageNumber: 1
    }
  ],
  topicHierarchy: {
    documentId: 'doc-test-concept',
    documentTitle: 'Operating Systems Revision',
    totalChaptersCount: 1,
    totalTopicsCount: 1,
    chapters: [
      {
        id: 'chap-1',
        chapterNumber: 1,
        title: 'Process Management',
        pageRange: [1, 2],
        topics: [
          {
            id: 'top-1',
            topicNumber: '1.1',
            title: 'Process Concept',
            pageRange: [1, 1],
            description: 'A process is an active program loaded in main memory.',
            subtopics: [
              {
                id: 'sub-1',
                title: 'Process Memory Layout',
                pageRange: [1, 1],
                summary: 'Stack, heap, data and text segments.'
              }
            ]
          }
        ]
      }
    ]
  }
} as any;

const suite = ConceptMapService.generateConceptMapSuite(testDoc);
assert.ok(suite, 'Concept map suite generated');
assert.ok(suite.topicMaps.length >= 1, 'Should have at least 1 topic concept map');
const singleMap = suite.topicMaps[0];
assert.strictEqual(singleMap.branches.length > 0, true, 'Branches should be generated');
// Check process concept branches
assert.ok(singleMap.branches.some(b => b.label.includes('Process') || b.label.includes('PCB')), 'Process branches should exist');

// Test 3b: Test dynamic topic branches with explicit subtopics
const dynamicDoc: AcademicDocument = {
  id: 'doc-dynamic-ml',
  title: 'Deep Learning Architectures',
  fileType: 'pdf',
  uploadedAt: new Date().toISOString(),
  sections: [],
  topicHierarchy: {
    documentId: 'doc-dynamic-ml',
    documentTitle: 'Deep Learning Architectures',
    totalChaptersCount: 1,
    totalTopicsCount: 1,
    chapters: [
      {
        id: 'chap-ml',
        chapterNumber: 1,
        title: 'Convolutional Networks',
        pageRange: [1, 2],
        topics: [
          {
            id: 'top-ml-1',
            topicNumber: '1.1',
            title: 'Residual Connections',
            pageRange: [1, 1],
            description: 'Skip connections solving vanishing gradient problem.',
            subtopics: [
              {
                id: 'sub-ml-1',
                title: 'Identity Mapping',
                pageRange: [1, 1],
                summary: 'F(x) + x formulation preserving gradient flow.'
              }
            ]
          }
        ]
      }
    ]
  }
} as any;

const dynamicSuite = ConceptMapService.generateConceptMapSuite(dynamicDoc);
const dynamicMap = dynamicSuite.topicMaps[0];
const subBranch = dynamicMap.branches.find(b => b.label.includes('Subtopics'));
assert.ok(subBranch, 'Subtopics branch should exist in dynamic topic map');
assert.ok(subBranch.children.length >= 1, 'Subtopic children must be mapped');
console.log('✅ Test 3 Passed: Concept map suite correctly nests subtopics without crashing.');

console.log('🎉 ALL TESTS IN testNightBeforeExamCramAndConceptMapFix PASSED!');
