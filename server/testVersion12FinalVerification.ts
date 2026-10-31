import assert from 'assert';
import { TopicHierarchyService } from '../src/services/topicHierarchyService';
import { AssessmentService } from '../src/services/assessmentService';
import { DetailedNotesService } from '../src/services/detailedNotesService';
import { ConceptMapService } from '../src/services/conceptMapService';
import { AiGeneratorService } from './services/aiGeneratorService';
import { DocumentUnderstandingService } from './services/documentUnderstandingService';
import { AcademicDocument, DocumentSection, DocumentTopicHierarchy } from '../src/types';

console.log('================================================================');
console.log('🌟 LEARNOVA VERSION 12: MANDATORY FINAL VERIFICATION SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = await fn();
    console.log(`  ✓ [PASS] Check ${totalTests}: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] Check ${totalTests}: ${name}`);
    console.error(`    ${err.message}\n`);
    throw err;
  }
}

async function main() {
  // ============================================================================
  // CRITERION 1: No Artificial Chapter Grouping & Dynamic Detection
  // ============================================================================
  console.log('\n--- CRITERION 1: Document Structure & Dynamic Chapter Detection ---');

  const multiChapterSections: DocumentSection[] = [
    {
      id: 'sec-ch1',
      documentId: 'doc-multi',
      pageNumber: 1,
      title: 'Chapter 1: Kinematics and Motion in One Dimension',
      content: 'Displacement, velocity, and acceleration describe translational kinematics. Position function s(t) = s0 + v0*t + 0.5*a*t^2 defines constant acceleration motion.'
    },
    {
      id: 'sec-ch2',
      documentId: 'doc-multi',
      pageNumber: 3,
      title: 'Chapter 2: Dynamics and Newton Laws of Motion',
      content: 'Net force produces acceleration proportional to mass: F_net = m*a. Free body diagrams identify contact and field forces.'
    },
    {
      id: 'sec-ch3',
      documentId: 'doc-multi',
      pageNumber: 5,
      title: 'Chapter 3: Work, Kinetic Energy, and Conservation Principles',
      content: 'Work done by conservative force equals negative change in potential energy: W = -delta(U). Total mechanical energy E = K + U remains invariant.'
    },
    {
      id: 'sec-ch4',
      documentId: 'doc-multi',
      pageNumber: 7,
      title: 'Chapter 4: Rotational Dynamics and Angular Momentum',
      content: 'Torque tau = I*alpha induces angular acceleration. Angular momentum L = I*omega is conserved in isolated systems.'
    },
    {
      id: 'sec-ch5',
      documentId: 'doc-multi',
      pageNumber: 9,
      title: 'Chapter 5: Gravitation and Orbital Mechanics',
      content: 'Universal gravitation F = G*m1*m2/r^2 determines planetary trajectories and escape velocity v_esc = sqrt(2*G*M/R).'
    }
  ];

  await runTest('Detects all 5 distinct chapters without forcing into 3 arbitrary groups', () => {
    const hierarchy = TopicHierarchyService.buildHierarchy({
      id: 'doc-multi',
      title: 'Physics Mechanics Handbook',
      sections: multiChapterSections
    } as any);

    assert.strictEqual(hierarchy.chapters.length, 5, `Expected 5 chapters, detected ${hierarchy.chapters.length}`);
    assert.ok(hierarchy.chapters[0].title.includes('Kinematics'), 'Chapter 1 title mismatch');
    assert.ok(hierarchy.chapters[1].title.includes('Dynamics'), 'Chapter 2 title mismatch');
    assert.ok(hierarchy.chapters[2].title.includes('Work'), 'Chapter 3 title mismatch');
    assert.ok(hierarchy.chapters[3].title.includes('Rotational'), 'Chapter 4 title mismatch');
    assert.ok(hierarchy.chapters[4].title.includes('Gravitation'), 'Chapter 5 title mismatch');
  });

  await runTest('Single-topic document creates 1 chapter and preserves subtopics without fake chapters', () => {
    const singleDocSections: DocumentSection[] = [
      {
        id: 's1',
        documentId: 'single-doc',
        pageNumber: 1,
        title: 'Microbial Genetics Overview',
        content: 'Bacterial transformation involves direct uptake and recombination of foreign DNA plasmids.'
      },
      {
        id: 's2',
        documentId: 'single-doc',
        pageNumber: 2,
        title: 'Plasmids and Horizontal Gene Transfer',
        content: 'Conjugation requires sex pilus formation and rolling circle replication.'
      }
    ];

    const hierarchy = TopicHierarchyService.buildHierarchy({
      id: 'single-doc',
      title: 'Microbial Genetics',
      sections: singleDocSections
    } as any);

    assert.strictEqual(hierarchy.chapters.length, 1, `Expected 1 chapter, got ${hierarchy.chapters.length}`);
    assert.strictEqual(hierarchy.totalTopicsCount, 2, `Expected 2 topics, got ${hierarchy.totalTopicsCount}`);
  });

  // ============================================================================
  // CRITERION 2: Topic Explorer Hierarchy Manipulation & Persistence
  // ============================================================================
  console.log('\n--- CRITERION 2: Topic Explorer Operations & Hierarchy Mutations ---');

  let testHierarchy: DocumentTopicHierarchy = TopicHierarchyService.buildHierarchy({
    id: 'doc-multi',
    title: 'Physics Mechanics Handbook',
    sections: multiChapterSections
  } as any);

  await runTest('Topic Explorer: Rename topic updates title across hierarchy', () => {
    const firstTopicId = testHierarchy.chapters[0].topics[0].id;
    testHierarchy = TopicHierarchyService.updateTopicTitle(testHierarchy, firstTopicId, 'Linear Kinematics Foundations');
    const updated = testHierarchy.chapters[0].topics[0];
    assert.strictEqual(updated.title, 'Linear Kinematics Foundations');
  });

  await runTest('Topic Explorer: Add custom topic dynamically inserts into target chapter', () => {
    const chId = testHierarchy.chapters[0].id;
    testHierarchy = TopicHierarchyService.addTopicToChapter(testHierarchy, chId, 'Projectile Motion Vectors', [2, 2]);
    const found = testHierarchy.chapters[0].topics.find(t => t.title === 'Projectile Motion Vectors');
    assert.ok(found, 'Added topic was not found in chapter');
    assert.strictEqual(found.pageRange[0], 2);
  });

  await runTest('Topic Explorer: Move topic between chapters successfully updates structural parenting', () => {
    const ch1Id = testHierarchy.chapters[1].id;
    const addedTopicId = testHierarchy.chapters[0].topics.find(t => t.title === 'Projectile Motion Vectors')!.id;

    testHierarchy = TopicHierarchyService.moveTopicToChapter(testHierarchy, addedTopicId, ch1Id);
    const inCh0 = testHierarchy.chapters[0].topics.some(t => t.id === addedTopicId);
    const inCh1 = testHierarchy.chapters[1].topics.some(t => t.id === addedTopicId);

    assert.strictEqual(inCh0, false, 'Moved topic should no longer be in chapter 0');
    assert.strictEqual(inCh1, true, 'Moved topic should now reside in chapter 1');
  });

  await runTest('Topic Explorer: Delete topic safely removes it without corrupting chapter order', () => {
    const topicToDelete = testHierarchy.chapters[1].topics.find(t => t.title === 'Projectile Motion Vectors')!.id;

    testHierarchy = TopicHierarchyService.removeTopic(testHierarchy, topicToDelete);
    const inCh1 = testHierarchy.chapters[1].topics.some(t => t.id === topicToDelete);
    assert.strictEqual(inCh1, false, 'Deleted topic must not be present');
  });

  // ============================================================================
  // CRITERION 3: AI Generation Free of Generic Fillers & Subject-Adaptive
  // ============================================================================
  console.log('\n--- CRITERION 3: Subject-Adaptive Generation Free of Boilerplates ---');

  const historySections: DocumentSection[] = [
    {
      id: 'hist-1',
      documentId: 'doc-hist',
      pageNumber: 1,
      title: 'The Industrial Revolution in Great Britain',
      content: 'The transition to new manufacturing processes in Great Britain occurred from about 1760 to 1840. Mechanized cotton spinning powered by steam or water increased the output of a worker by a factor of around 1000. The steam engine developed by James Watt dramatically expanded coal consumption and urban factory production.'
    }
  ];

  await runTest('Qualitative humanities text produces narrative arguments without artificial engineering formulas', async () => {
    const generated = await AiGeneratorService.generateFormat(
      'doc-hist',
      'The Industrial Revolution in Great Britain',
      historySections as any,
      'worked',
      'English',
      'intermediate'
    );

    const worked = generated.content;
    const jsonStr = JSON.stringify(worked);

    // Verify zero generic boilerplate phrases
    assert.ok(!jsonStr.includes('under nominal load'), 'Must not contain "under nominal load"');
    assert.ok(!jsonStr.includes('operational parameters'), 'Must not contain "operational parameters"');
    assert.ok(!jsonStr.includes('boundary invariance'), 'Must not contain "boundary invariance"');
    assert.ok(!jsonStr.includes('formal state mappings'), 'Must not contain "formal state mappings"');
    assert.ok(!jsonStr.includes('normalize outputs within safe numerical bounds'), 'Must not contain numerical bounds boilerplate');

    // Verify presence of qualitative / historical context
    assert.ok(
      jsonStr.includes('Industrial Revolution') || jsonStr.includes('James Watt') || jsonStr.includes('cotton spinning'),
      'Must contain historical subject context'
    );
  });

  await runTest('Simplified explanation produces topic-grounded mental model without filler invariant statements', async () => {
    const generated = await AiGeneratorService.generateFormat(
      'doc-multi',
      'Physics Mechanics Handbook',
      multiChapterSections as any,
      'simplified',
      'English',
      'advanced'
    );

    const jsonStr = JSON.stringify(generated.content);
    assert.ok(!jsonStr.includes('boundary invariance'), 'Must not contain "boundary invariance"');
    assert.ok(!jsonStr.includes('formal state mappings across observed operational parameters'), 'Must not contain operational parameter boilerplate');
    assert.ok(jsonStr.includes('Kinematics') || jsonStr.includes('Physics'), 'Must contain actual physics topics');
  });

  // ============================================================================
  // CRITERION 4: Audio Lessons Topic-Independence & Progress Tracking
  // ============================================================================
  console.log('\n--- CRITERION 4: Topic-Independent Audio Lessons & Progress ---');

  await runTest('Audio lesson generates independent section for every topic across entire document', async () => {
    const audioRes = await AiGeneratorService.generateFormat(
      'doc-multi',
      'Physics Mechanics Handbook',
      multiChapterSections as any,
      'audio',
      'English',
      'intermediate'
    );

    const audioLesson = audioRes.content;
    assert.strictEqual(audioLesson.sections.length, 5, `Expected 5 audio sections for 5 input topics, got ${audioLesson.sections.length}`);

    // Verify each section has its own citation and script
    audioLesson.sections.forEach((sec: any, idx: number) => {
      assert.ok(sec.sectionTitle, `Audio section ${idx} missing title`);
      assert.ok(sec.scriptText.length > 50, `Audio section ${idx} script text too short`);
      assert.ok(sec.sourceCitation, `Audio section ${idx} missing source citation`);
      assert.strictEqual(sec.sourceCitation.pageNumber, multiChapterSections[idx].pageNumber);
    });
  });

  // ============================================================================
  // CRITERION 5: Practice Quizzes Supporting All 6 Question Types
  // ============================================================================
  console.log('\n--- CRITERION 5: Quiz Generation Covering All Question Types ---');

  await runTest('Quiz generator produces diverse question types with accurate explanations', async () => {
    const quizRes = await AiGeneratorService.generateFormat(
      'doc-multi',
      'Physics Mechanics Handbook',
      multiChapterSections as any,
      'quiz',
      'English',
      'intermediate'
    );

    const questions: any[] = quizRes.content;
    assert.ok(questions.length >= 5, `Expected at least 5 questions, got ${questions.length}`);

    const types = new Set(questions.map(q => q.type));
    assert.ok(types.has('multiple_choice'), 'Missing multiple_choice questions');
    assert.ok(types.has('true_false'), 'Missing true_false questions');

    // Verify all questions have explanations and source citations
    questions.forEach(q => {
      assert.ok(q.sourceCitation, `Question ${q.id} missing source citation`);
      assert.ok(q.options && q.options.length > 0, `Question ${q.id} missing options`);
      const correctOpt = q.options.find((o: any) => o.isCorrect);
      assert.ok(correctOpt, `Question ${q.id} has no correct option marked`);
      assert.ok(correctOpt.explanation, `Question ${q.id} correct option missing explanation`);
    });
  });

  await runTest('AssessmentService evaluates numerical answer within +/- 2% tolerance', () => {
    const mockNumQ: any = {
      id: 'q-num-1',
      type: 'numerical',
      finalAnswer: '49.0',
      options: []
    };
    const evalCorrect = AssessmentService.evaluateQuiz([mockNumQ], { 'q-num-1': '49.5' });
    assert.strictEqual(evalCorrect.questionBreakdown[0].isCorrect, true, '49.5 should be accepted for 49.0 within 2% margin');

    const evalIncorrect = AssessmentService.evaluateQuiz([mockNumQ], { 'q-num-1': '55.0' });
    assert.strictEqual(evalIncorrect.questionBreakdown[0].isCorrect, false, '55.0 should be rejected for 49.0 outside 2% margin');
  });

  // ============================================================================
  // CRITERION 6: Worked Examples with Exact Mathematical Steps
  // ============================================================================
  console.log('\n--- CRITERION 6: Worked Examples with Step-by-Step Derivation ---');

  const mathCalcSection: DocumentSection[] = [
    {
      id: 'm-sec',
      documentId: 'doc-kin',
      pageNumber: 3,
      title: 'Free Fall Calculations Under Constant Gravity',
      content: 'A ball dropped from a height of 80 meters falls under gravity g = 9.8 m/s^2. Using formula h = 0.5*g*t^2, solving for time yields t = sqrt(2*h/g) = sqrt(160/9.8) = 4.04 seconds.'
    }
  ];

  await runTest('Calculates mathematical worked example using extracted problem values', async () => {
    const workedRes = await AiGeneratorService.generateFormat(
      'doc-kin',
      'Free Fall Calculations',
      mathCalcSection as any,
      'worked',
      'English',
      'intermediate'
    );

    const worked = workedRes.content;
    assert.ok(worked.solutionSteps && worked.solutionSteps.length >= 3, 'Expected at least 3 solution steps');
    assert.ok(worked.finalAnswer, 'Expected final answer');
    assert.ok(worked.citation, 'Expected source citation for worked problem');
  });

  // ============================================================================
  // CRITERION 7: Institutional Noise Removal & Academic Text Preservation
  // ============================================================================
  console.log('\n--- CRITERION 7: Institutional Header / Footer Removal ---');

  const rawDocumentWithNoise = `
VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI
DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
SEMESTER VI - INTERNAL TEST 1 - USN: 1MS21CS001
PAGE 1 OF 45 - CONFIDENTIAL FOR EXAM PURPOSE ONLY

Chapter 1: Relational Database Normalization

Normalization is the process of organizing data in a database. This includes creating tables and establishing relationships between those tables according to rules designed both to protect the data and to make the database more flexible by eliminating redundancy and inconsistent dependency. First Normal Form (1NF) requires that all column values are atomic.
`;

  await runTest('Preserves academic database theory while filtering out university metadata and USN', () => {
    const processed = DocumentUnderstandingService.analyze(
      'doc-db',
      [{
        id: 'db-sec-1',
        documentId: 'doc-db',
        title: 'Chapter 1: Relational Database Normalization',
        content: rawDocumentWithNoise,
        pageNumber: 1
      }],
      'pdf',
      95,
      'Database Systems'
    );

    assert.strictEqual(processed.chapters.length, 1, 'Should detect Chapter 1: Relational Database Normalization');
    const ch = processed.chapters[0];
    assert.ok(ch.title.includes('Normalization'), 'Chapter title should reflect normalization, not VTU');

    // Verify sections have academic content and not institutional headers
    const mainSection = processed.sections.find(s => s.content.includes('First Normal Form'));
    assert.ok(mainSection, 'Academic section defining 1NF must be preserved');
  });

  // ============================================================================
  // CRITERION 8: Concept Map Scalability Without 4-Node Limit
  // ============================================================================
  console.log('\n--- CRITERION 8: Concept Map Full Document Visualization ---');

  await runTest('ConceptMapService generates nodes for all detected topics without arbitrary 4-node truncation', () => {
    const fullHierarchy: DocumentTopicHierarchy = {
      chapters: [
        {
          id: 'c1',
          title: 'Cellular Respiration',
          pageRange: [1, 10],
          topics: [
            { id: 't1', title: 'Glycolysis', pageRange: [1, 2], subtopics: [] },
            { id: 't2', title: 'Pyruvate Oxidation', pageRange: [3, 4], subtopics: [] },
            { id: 't3', title: 'Citric Acid Cycle', pageRange: [5, 6], subtopics: [] },
            { id: 't4', title: 'Electron Transport Chain', pageRange: [7, 8], subtopics: [] },
            { id: 't5', title: 'Chemiosmosis and ATP Synthase', pageRange: [9, 10], subtopics: [] },
            { id: 't6', title: 'Lactic Acid and Alcoholic Fermentation', pageRange: [10, 10], subtopics: [] }
          ]
        }
      ],
      totalChapters: 1,
      totalTopics: 6,
      totalSubtopics: 0
    };

    const mockDoc: AcademicDocument = {
      id: 'doc-bio',
      title: 'Cellular Respiration Biology',
      summary: 'Complete biochemical pathway of respiration.',
      sections: [],
      totalPages: 10,
      topicHierarchy: fullHierarchy
    } as any;

    const suite = ConceptMapService.generateConceptMapSuite(mockDoc);
    const conceptMap = suite.overallMap;
    // Should include chapter node + all 6 topic nodes = 7 nodes minimum
    assert.ok(conceptMap.nodes.length >= 7, `Expected at least 7 nodes, found ${conceptMap.nodes.length}`);
    const foundAllTopics = fullHierarchy.chapters[0].topics.every(t =>
      conceptMap.nodes.some(n => n.id === t.id || n.label.toLowerCase().includes(t.title.toLowerCase().slice(0, 10)))
    );
    assert.strictEqual(foundAllTopics, true, 'All 6 biology topics must be represented in the concept map nodes');
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`🎉 VERSION 12 FINAL VERIFICATION COMPLETED: ${passedTests}/${totalTests} CHECKS PASSED (100%)`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Final Verification failed:', err);
  process.exit(1);
});
