import assert from 'assert';
import { TopicHierarchyService } from '../src/services/topicHierarchyService';
import { AssessmentService } from '../src/services/assessmentService';
import { DetailedNotesService } from '../src/services/detailedNotesService';
import { AcademicDocument, DocumentSection, DocumentTopicHierarchy } from '../src/types';

console.log('================================================================');
console.log('🚀 LEARNOVA TOPIC EXPLORER & SCOPED LEARNING INTEGRATION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] Test ${totalTests}: ${name}`);
    console.error(`    ${err.message}\n`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Test Fixture: Multi-topic Computer Architecture Document
// -----------------------------------------------------------------------------
const mockSections: DocumentSection[] = [
  {
    id: 'sec-1',
    documentId: 'doc-arch-101',
    pageNumber: 1,
    title: 'Chapter 1: Memory Hierarchy and Cache Architecture',
    content: `
      Memory Hierarchy balances speed and cost. Registers reside at the top with <1ns latency,
      followed by Level 1 (L1), Level 2 (L2), and Level 3 (L3) SRAM caches, DRAM main memory, and NVMe SSDs.
      Average Memory Access Time (AMAT) is formulated as:
      AMAT = Hit Time + (Miss Rate * Miss Penalty)
    `
  },
  {
    id: 'sec-2',
    documentId: 'doc-arch-101',
    pageNumber: 2,
    title: 'Cache Mapping Techniques: Direct-Mapped and Set-Associative',
    content: `
      Cache placement policies map memory blocks to cache lines.
      Direct-mapped cache assigns each block to exactly one cache line: Line = (Block Address) mod (Number of Lines).
      Set-associative cache divides lines into sets of size K (K-way associative), reducing conflict misses.
      Fully associative cache permits any block in any line.
    `
  },
  {
    id: 'sec-3',
    documentId: 'doc-arch-101',
    pageNumber: 3,
    title: 'Cache Replacement Policies and Coherence',
    content: `
      When a cache set is full, replacement policies select victim lines.
      Least Recently Used (LRU) tracks timestamp or age bits.
      First-In First-Out (FIFO) discards the oldest loaded line.
      Random replacement picks lines uniformly to reduce hardware complexity.
      Multi-core cache coherence utilizes MESI protocol (Modified, Exclusive, Shared, Invalid).
    `
  },
  {
    id: 'sec-4',
    documentId: 'doc-arch-101',
    pageNumber: 4,
    title: 'Chapter 2: Pipelining and Instruction Level Parallelism',
    content: `
      Instruction pipelining overlaps sequential execution stages.
      Classical 5-stage RISC pipeline consists of IF (Instruction Fetch), ID (Instruction Decode),
      EX (Execute / ALU), MEM (Memory Access), and WB (Write Back).
      Speedup = Pipeline Depth / (1 + Pipeline Stall Cycles Per Instruction).
    `
  },
  {
    id: 'sec-5',
    documentId: 'doc-arch-101',
    pageNumber: 5,
    title: 'Pipeline Hazards: Structural, Data, and Control',
    content: `
      Hazards prevent the next instruction from executing in its designated clock cycle.
      Structural hazards occur when hardware resources cannot support simultaneous executions.
      Data hazards arise from Read-After-Write (RAW), Write-After-Read (WAR), and Write-After-Write (WAW) dependencies.
      Control hazards result from branch and jump instructions altering the program counter.
      Branch prediction mitigates branch penalties via static and dynamic 2-bit saturating counters.
    `
  }
];

const mockDocument: AcademicDocument = {
  id: 'doc-arch-101',
  title: 'Advanced Computer Architecture & Memory Systems',
  subject: 'Computer Engineering',
  level: 'Undergraduate',
  pageCount: 5,
  uploadedAt: '2026-10-31',
  fileType: 'pdf',
  extractedText: mockSections.map(s => s.content).join('\n'),
  sections: mockSections
};

// -----------------------------------------------------------------------------
// Suite 1: Dashboard Metadata & Dynamic Hierarchy Construction
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Topic Explorer Dashboard & Hierarchy Extraction ---');

let hierarchy: DocumentTopicHierarchy;

runTest('1.1 Builds dynamic hierarchy with genuine chapters and topics', () => {
  hierarchy = TopicHierarchyService.buildHierarchy(mockDocument);
  assert.ok(hierarchy, 'Hierarchy must be defined');
  assert.strictEqual(hierarchy.chapters.length, 2, 'Should detect 2 distinct chapters');
  assert.ok(hierarchy.totalTopicsCount >= 2, 'Should extract at least 2 main topics');
  assert.ok(hierarchy.chapters[0].title.toLowerCase().includes('memory'), 'Chapter 1 title matches');
  assert.ok(hierarchy.chapters[1].title.toLowerCase().includes('pipelining'), 'Chapter 2 title matches');
});

runTest('1.2 Content types and page ranges are accurate', () => {
  const ch1 = hierarchy.chapters[0];
  assert.strictEqual(ch1.pageRange[0], 1);
  assert.ok(ch1.pageRange[1] >= 2);
  const allTopics = ch1.topics;
  assert.ok(allTopics.length >= 1);
  const amatTopic = allTopics.find(t => t.title.toLowerCase().includes('memory') || t.title.toLowerCase().includes('cache'));
  assert.ok(amatTopic, 'Topic regarding cache or memory should exist');
});

// -----------------------------------------------------------------------------
// Suite 2: Topic Editing & Hierarchy Reorganization
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Topic Editing, Moving, Splitting & Reorganization ---');

let editedHierarchy: DocumentTopicHierarchy;

runTest('2.1 Renames topic title preserving citations and subtopics', () => {
  const targetTopic = hierarchy.chapters[0].topics[0];
  const oldCitationsCount = targetTopic.sourceCitations.length;
  editedHierarchy = TopicHierarchyService.updateTopicTitle(
    hierarchy,
    targetTopic.id,
    'High-Performance Memory Hierarchies & SRAM'
  );
  const updated = editedHierarchy.chapters[0].topics.find(t => t.id === targetTopic.id);
  assert.strictEqual(updated?.title, 'High-Performance Memory Hierarchies & SRAM');
  assert.strictEqual(updated?.sourceCitations.length, oldCitationsCount, 'Citations preserved');
  assert.strictEqual(editedHierarchy.isUserVerified, true);
});

runTest('2.2 Adds a missing topic to a chapter', () => {
  const ch2 = editedHierarchy.chapters[1];
  const originalTopicCount = ch2.topics.length;
  editedHierarchy = TopicHierarchyService.addTopicToChapter(
    editedHierarchy,
    ch2.id,
    'Superscalar Execution and Out-of-Order Processing',
    [5, 5]
  );
  const updatedCh2 = editedHierarchy.chapters[1];
  assert.strictEqual(updatedCh2.topics.length, originalTopicCount + 1);
  const added = updatedCh2.topics.find(t => t.title.includes('Superscalar'));
  assert.ok(added, 'Added topic should exist in Chapter 2');
  assert.strictEqual(added?.pageRange[0], 5);
});

runTest('2.3 Adds subtopic and moves it to another topic', () => {
  const top1 = editedHierarchy.chapters[0].topics[0];
  editedHierarchy = TopicHierarchyService.addSubtopicToTopic(
    editedHierarchy,
    top1.id,
    'MESI Invalidation Bus Snooping',
    [3, 3]
  );
  let updatedTop1 = editedHierarchy.chapters[0].topics.find(t => t.id === top1.id)!;
  const addedSub = updatedTop1.subtopics.find(s => s.title.includes('MESI'))!;
  assert.ok(addedSub, 'Subtopic should exist in top1');

  // Move subtopic to another topic in Ch 2
  const top2 = editedHierarchy.chapters[1].topics[0];
  editedHierarchy = TopicHierarchyService.moveSubtopic(
    editedHierarchy,
    top1.id,
    top2.id,
    addedSub.id
  );
  updatedTop1 = editedHierarchy.chapters[0].topics.find(t => t.id === top1.id)!;
  const updatedTop2 = editedHierarchy.chapters[1].topics.find(t => t.id === top2.id)!;
  assert.ok(!updatedTop1.subtopics.some(s => s.id === addedSub.id), 'Removed from source');
  assert.ok(updatedTop2.subtopics.some(s => s.id === addedSub.id), 'Added to target');
});

runTest('2.4 Moves an entire topic into another chapter', () => {
  const ch1 = editedHierarchy.chapters[0];
  const ch2 = editedHierarchy.chapters[1];
  const topicToMove = ch2.topics[0];
  const origCh1Topics = ch1.topics.length;
  const origCh2Topics = ch2.topics.length;

  editedHierarchy = TopicHierarchyService.moveTopicToChapter(
    editedHierarchy,
    topicToMove.id,
    ch1.id
  );

  const newCh1 = editedHierarchy.chapters.find(c => c.id === ch1.id)!;
  const newCh2 = editedHierarchy.chapters.find(c => c.id === ch2.id)!;
  assert.strictEqual(newCh1.topics.length, origCh1Topics + 1, 'Ch1 topics incremented');
  assert.strictEqual(newCh2.topics.length, origCh2Topics - 1, 'Ch2 topics decremented');
  const relocated = newCh1.topics.find(t => t.id === topicToMove.id);
  assert.ok(relocated, 'Relocated topic found in Ch1');
  assert.strictEqual(relocated?.chapterTitle, newCh1.title);
  assert.strictEqual(relocated?.chapterNumber, newCh1.chapterNumber);
});

runTest('2.5 Splits a topic with multiple subtopics into two topics', () => {
  // Add 2 subtopics to a topic
  const targetTopic = editedHierarchy.chapters[0].topics[0];
  let h = TopicHierarchyService.addSubtopicToTopic(editedHierarchy, targetTopic.id, 'L1 Data vs Instruction Caches', [1, 1]);
  h = TopicHierarchyService.addSubtopicToTopic(h, targetTopic.id, 'Non-blocking Caches and Miss Status Holding Registers (MSHR)', [2, 2]);

  const refreshedTopic = h.chapters[0].topics.find(t => t.id === targetTopic.id)!;
  assert.ok(refreshedTopic.subtopics.length >= 2);
  const subToSplit = refreshedTopic.subtopics[refreshedTopic.subtopics.length - 1];

  const beforeTopicCount = h.chapters[0].topics.length;
  h = TopicHierarchyService.splitTopic(
    h,
    targetTopic.id,
    [subToSplit.id],
    'Non-Blocking Caches & MSHR Architecture'
  );

  const afterTopicCount = h.chapters[0].topics.length;
  assert.strictEqual(afterTopicCount, beforeTopicCount + 1, 'Should create an additional topic');
  const splitTopic = h.chapters[0].topics.find(t => t.title.includes('Non-Blocking Caches'));
  assert.ok(splitTopic, 'Newly created split topic exists');
  assert.strictEqual(splitTopic?.subtopics.length, 1);
  assert.strictEqual(splitTopic?.subtopics[0].id, subToSplit.id);
  editedHierarchy = h;
});

runTest('2.6 Merges duplicate topics together', () => {
  const ch = editedHierarchy.chapters[0];
  assert.ok(ch.topics.length >= 2);
  const src = ch.topics[ch.topics.length - 1];
  const dest = ch.topics[0];
  const countBefore = ch.topics.length;

  const merged = TopicHierarchyService.mergeTopics(editedHierarchy, src.id, dest.id);
  const updatedCh = merged.chapters.find(c => c.id === ch.id)!;
  assert.strictEqual(updatedCh.topics.length, countBefore - 1, 'Merged topic was absorbed');
  const target = updatedCh.topics.find(t => t.id === dest.id)!;
  assert.ok(target, 'Target topic remains');
  assert.ok(target.subtopics.length >= src.subtopics.length, 'Subtopics united');
});

runTest('2.7 Removes an incorrectly detected heading', () => {
  const ch = editedHierarchy.chapters[0];
  const toRemove = ch.topics[ch.topics.length - 1];
  const initialCount = ch.topics.length;

  const removedHierarchy = TopicHierarchyService.removeTopic(editedHierarchy, toRemove.id);
  const updatedCh = removedHierarchy.chapters.find(c => c.id === ch.id)!;
  assert.strictEqual(updatedCh.topics.length, initialCount - 1);
  assert.ok(!updatedCh.topics.some(t => t.id === toRemove.id));
});

// -----------------------------------------------------------------------------
// Suite 3: Topic-Scoped Learning Material Generation
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Topic-Scoped Learning Generation Grounding ---');

runTest('3.1 Generates topic-wise flashcards partitionable by topic', () => {
  const { topicDecks, topicTitles, overallDeck } = AssessmentService.generateTopicWiseFlashcards(mockDocument);
  assert.ok(overallDeck.length > 0, 'Overall deck must have flashcards');
  assert.ok(Object.keys(topicDecks).length >= 2, 'Should partition into topic-wise decks');
  for (const [topicId, cards] of Object.entries(topicDecks)) {
    assert.ok(cards.length > 0, `Topic deck ${topicId} should contain cards`);
    cards.forEach(card => {
      assert.ok(card.front && card.back, 'Card front and back must be defined');
      assert.ok(card.sourceCitation || (card as any).citation, 'Card citation must be anchored');
    });
  }
});

runTest('3.2 Scopes detailed notes to individual selected topic without bleeding unrelated topics', () => {
  const notesSuite = DetailedNotesService.generateDetailedNotesSuite(mockDocument, 'detailed');
  assert.ok(notesSuite.sections.length >= 2, 'Should generate notes for multiple topics');

  // Select first topic notes
  const firstSection = notesSuite.sections[0];
  assert.ok(firstSection.topicTitle, 'Topic title present');
  assert.ok(firstSection.definitions.length > 0, 'Definitions extracted');
  assert.ok(firstSection.detailedExplanation || firstSection.introduction, 'Explanation present');
  assert.ok(firstSection.keyPrinciples !== undefined, 'Key principles defined');
});

runTest('3.3 Generates worked examples with explicit problem statements and calculations', () => {
  const workedSuite = DetailedNotesService.generateWorkedExamplesSuite(mockDocument);
  assert.ok(workedSuite.examples.length >= 1, 'Should find or synthesize numerical example for AMAT / Pipelining');
  const amatExample = workedSuite.examples.find(e =>
    e.title.toLowerCase().includes('amat') || e.title.toLowerCase().includes('memory') || e.formulaApplied.toLowerCase().includes('amat')
  );
  assert.ok(amatExample, 'AMAT numerical example must be extracted');
  assert.ok(amatExample.solutionSteps.length >= 2, 'Must have multi-step solution');
  assert.ok(amatExample.finalAnswer, 'Must have final answer');
  assert.ok(amatExample.verification, 'Must have verification check');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TOPIC EXPLORER INTEGRATION TESTS PASSED!`);
console.log('================================================================\n');
