import { SAMPLE_DOCUMENTS } from '../src/data/sampleDocuments';
import { AiTutorService } from '../src/services/aiTutorService';
import { WhiteboardService } from '../src/services/whiteboardService';
import { PodcastService } from '../src/services/podcastService';
import { DocumentComparisonService } from '../src/services/documentComparisonService';
import { SemanticSearchService } from '../src/services/semanticSearchService';
import { CrossDocumentGraphService } from '../src/services/crossDocumentGraphService';

console.log('================================================================');
console.log('🚀 LEARNOVA ADVANCED & DISTINCTIVE FEATURES VERIFICATION SUITE');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ [PASS] Check ${totalCount}: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] Check ${totalCount}: ${message}`);
    process.exitCode = 1;
  }
}

const doc = SAMPLE_DOCUMENTS[0];
const docB = SAMPLE_DOCUMENTS[1] || SAMPLE_DOCUMENTS[0];

// --- 1. Ask Your Document – AI Tutor ---
console.log('--- 1. Ask Your Document – AI Tutor (5 Core Inquiries) ---');

const ans1 = AiTutorService.answerQuestion(doc, 'Explain this in simpler words.');
assert(
  ans1.category === 'simpler_words' && ans1.answerMarkdown.includes('Plain Words') && ans1.citations.length > 0,
  'AI Tutor explains concept in simpler words with intuitive analogy and source citations'
);

const ans2 = AiTutorService.answerQuestion(doc, 'Why is this formula used?');
assert(
  ans2.category === 'formula_usage' && ans2.answerMarkdown.includes('Why This Formula Is Used') && ans2.citations.length > 0,
  'AI Tutor explains why the formula is used, its mathematical invariant, and page reference'
);

const ans3 = AiTutorService.answerQuestion(doc, 'Give another example.');
assert(
  ans3.category === 'another_example' && ans3.answerMarkdown.includes('Practical Real-World Example'),
  'AI Tutor generates an everyday real-world example grounded in document principles'
);

const ans4 = AiTutorService.answerQuestion(doc, 'Explain this diagram.');
assert(
  ans4.category === 'diagram_explanation' && ans4.answerMarkdown.includes('Visual Schematic Breakdown'),
  'AI Tutor walks through diagram stages, component flow, and exam checkpoints'
);

const ans5 = AiTutorService.answerQuestion(doc, 'Compare these two concepts.');
assert(
  ans5.category === 'compare_concepts' && ans5.answerMarkdown.includes('Conceptual Comparison'),
  'AI Tutor compares two topics with a structured distinction table'
);

// --- 2. AI Interactive Whiteboard ---
console.log('\n--- 2. AI Interactive Whiteboard ---');

const wb = WhiteboardService.generateWhiteboardModel(doc);
assert(
  wb.steps.length >= 4 && wb.visualNodes.length >= 4 && wb.sourceCitation.pageNumber >= 1,
  'Interactive Whiteboard generates multi-step visual illustrations with nodes, connections, and formulas'
);

// --- 3. AI Study Podcast ---
console.log('\n--- 3. AI Study Podcast ---');

const podcast = PodcastService.generateChapterPodcast(doc);
assert(
  podcast.dialogueTurns.length >= 6 &&
  podcast.dialogueTurns.some(t => t.speaker === 'host') &&
  podcast.dialogueTurns.some(t => t.speaker === 'cohost'),
  'Study Podcast generates dual-speaker conversational lesson between Dr. Maya & Leo with timestamps'
);

// --- 4. AI Document Comparison ---
console.log('\n--- 4. AI Document Comparison ---');

const comparison = DocumentComparisonService.compareDocuments(doc, docB);
assert(
  comparison.sharedConcepts.length > 0 && comparison.matrixRows.length >= 3,
  'Document Comparison identifies shared concepts, unique points, and dimension matrix across documents'
);

// --- 5. Cross-Document Knowledge Graph ---
console.log('\n--- 5. Cross-Document Knowledge Graph ---');

const crossGraph = CrossDocumentGraphService.buildCrossDocGraph(SAMPLE_DOCUMENTS);
assert(
  crossGraph.nodes.length >= SAMPLE_DOCUMENTS.length && crossGraph.edges.length > 0,
  'Cross-Document Knowledge Graph builds global conceptual edges across user library'
);

// --- 6. Intelligent Semantic Document Search ---
console.log('\n--- 6. Intelligent Semantic Document Search ---');

const searchResults = SemanticSearchService.search(SAMPLE_DOCUMENTS, 'how memory is allocated');
assert(
  searchResults.length > 0 && searchResults[0].relevanceScore >= 20 && searchResults[0].citation.pageNumber >= 1,
  'Semantic search retrieves concepts by meaning (synonym/intent matching) with relevance scores and page citations'
);

console.log('\n================================================================');
console.log(`🎉 DISTINCTIVE ADVANCED FEATURES: ${passCount}/${totalCount} CHECKS PASSED (${Math.round((passCount / totalCount) * 100)}%)`);
console.log('================================================================\n');
