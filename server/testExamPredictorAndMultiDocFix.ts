import assert from 'assert';
import { ExamPredictorService } from '../src/services/examPredictorService';
import { DocumentComparisonService } from '../src/services/documentComparisonService';
import { AcademicDocument } from '../src/types';

console.log('================================================================');
console.log('🧪 LEARNOVA: Exam Question Predictor & Multi-Doc Deduplication Suite');
console.log('================================================================\n');

function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // Sample test document
  const sampleDoc1: AcademicDocument = {
    id: 'doc-os-1',
    title: 'Operating Systems: Process Management & CPU Scheduling',
    author: 'Silberschatz & Galvin',
    institution: 'University CS Dept',
    year: '2026',
    fileType: 'pdf',
    fileSizeMb: 3.5,
    category: 'Computer Science',
    uploadDate: '2026-10-31',
    pageCount: 15,
    wordCount: 4500,
    summary: 'Comprehensive analysis of process scheduling algorithms, context switching, and CPU utilization.',
    processingStatus: 'ready',
    sections: [
      {
        id: 'sec-cpu-sched',
        pageNumber: 4,
        title: 'CPU Scheduling Criteria & FCFS',
        content: 'CPU scheduling deals with selecting processes from the ready queue. First-Come, First-Served assigns the CPU to the process that requests it first.',
        equations: [
          {
            latex: 'T_{\\text{wait}} = \\frac{1}{N} \\sum_{i=1}^{N} W_i',
            label: 'Eq. 1 (Average Waiting Time)',
            meaning: 'Average waiting time calculation across N processes'
          }
        ],
        definitions: [
          {
            term: 'CPU Scheduling',
            definition: 'The process by which the scheduler allocates CPU resources among competing ready processes.',
            conditions: 'Preemptive vs non-preemptive discipline'
          }
        ],
        conditions: ['Process must reside in Ready state queue prior to dispatch']
      },
      {
        id: 'sec-round-robin',
        pageNumber: 7,
        title: 'Round Robin Scheduling with Time Quantum',
        content: 'Round Robin allocates a small unit of CPU time called a time quantum or slice. Preemption occurs when the slice expires.',
        equations: [
          {
            latex: 'q \\in [10, 100] \\text{ ms}',
            label: 'Eq. 2 (Quantum Bound)',
            meaning: 'Recommended time quantum bounds'
          }
        ],
        definitions: [
          {
            term: 'Time Quantum',
            definition: 'Fixed unit of execution time allocated to a process before preemption.',
            conditions: 'Large q approximates FCFS; small q increases context-switch overhead'
          }
        ],
        conditions: ['Context switch latency must be negligible compared to quantum q']
      }
    ],
    flashcards: [],
    explanations: []
  };

  const sampleDoc2: AcademicDocument = {
    id: 'doc-os-2',
    title: 'Advanced Systems: Multi-Core Scheduling & Concurrency',
    author: 'Tanenbaum & Bos',
    institution: 'Distributed Systems Institute',
    year: '2026',
    fileType: 'pdf',
    fileSizeMb: 4.2,
    category: 'Computer Science',
    uploadDate: '2026-10-31',
    pageCount: 20,
    wordCount: 6200,
    summary: 'Modern multi-processor scheduling, lock-free queues, and cache affinity in multi-core architectures.',
    processingStatus: 'ready',
    sections: [
      {
        id: 'sec-shared-sched',
        pageNumber: 3,
        title: 'Process Scheduling and Dispatching in Modern OS',
        content: 'Selecting ready processes and dispatching them to available CPU cores. Enforces queue discipline and fair distribution.',
        equations: [
          {
            latex: '\\eta = \\frac{T_{\\text{burst}}}{T_{\\text{burst}} + T_{\\text{switch}}}',
            label: 'Eq. S1 (CPU Efficiency)',
            meaning: 'Ratio of useful execution burst to total allocated time'
          }
        ],
        definitions: [
          {
            term: 'CPU Scheduling',
            definition: 'Operating system mechanism to allocate processor cycles fairly among ready threads.',
            conditions: 'Preemptive dispatch'
          }
        ],
        conditions: ['Dispatch latency must remain bounded']
      },
      {
        id: 'sec-multicore-unique',
        pageNumber: 12,
        title: 'Cache Affinity and NUMA Architecture Scheduling',
        content: 'In Non-Uniform Memory Access (NUMA) systems, thread migration across sockets incurs significant memory latency penalties.',
        equations: [
          {
            latex: '\\Delta L_{\\text{remote}} = 3.5 \\times L_{\\text{local}}',
            label: 'Eq. N1 (NUMA Penalty)',
            meaning: 'Memory access penalty for remote socket access'
          }
        ],
        definitions: [
          {
            term: 'NUMA Architecture',
            definition: 'Multi-processor memory architecture where memory access time depends on the memory location relative to the processor.',
            conditions: 'Socket locality must be preserved'
          }
        ],
        conditions: ['Affinity mask must pin thread to local node']
      }
    ],
    flashcards: [],
    explanations: []
  };

  // -------------------------------------------------------------------------
  // REQUIREMENT 1: Exam Question Predictor (5M, 7M, 8M, 10M)
  // -------------------------------------------------------------------------
  test('Check 1: ExamPredictorService generates questions for all 4 mark categories (5M, 7M, 8M, 10M)', () => {
    const questions = ExamPredictorService.generateExamQuestions(sampleDoc1);
    assert.ok(questions.length >= 8, `Expected at least 8 questions (4 per section), got ${questions.length}`);

    const marksFound = new Set(questions.map(q => q.marks));
    assert.ok(marksFound.has(5), 'Must include 5-marker questions');
    assert.ok(marksFound.has(7), 'Must include 7-marker questions');
    assert.ok(marksFound.has(8), 'Must include 8-marker questions');
    assert.ok(marksFound.has(10), 'Must include 10-marker questions');
  });

  test('Check 2: Marking schemes correctly sum to exactly 5, 7, 8, and 10 marks respectively', () => {
    const questions = ExamPredictorService.generateExamQuestions(sampleDoc1);

    const q5 = questions.find(q => q.marks === 5);
    const q7 = questions.find(q => q.marks === 7);
    const q8 = questions.find(q => q.marks === 8);
    const q10 = questions.find(q => q.marks === 10);

    assert.ok(q5 && q7 && q8 && q10, 'All mark tiers must be present');

    const sum5 = q5.markingScheme.reduce((acc, m) => acc + m.marksAwarded, 0);
    const sum7 = q7.markingScheme.reduce((acc, m) => acc + m.marksAwarded, 0);
    const sum8 = q8.markingScheme.reduce((acc, m) => acc + m.marksAwarded, 0);
    const sum10 = q10.markingScheme.reduce((acc, m) => acc + m.marksAwarded, 0);

    assert.strictEqual(sum5, 5, `5-marker rubric sum must equal 5, got ${sum5}`);
    assert.strictEqual(sum7, 7, `7-marker rubric sum must equal 7, got ${sum7}`);
    assert.strictEqual(sum8, 8, `8-marker rubric sum must equal 8, got ${sum8}`);
    assert.strictEqual(sum10, 10, `10-marker rubric sum must equal 10, got ${sum10}`);
  });

  test('Check 3: Model answers contain formal definitions, vertical equations, diagrams, and examiner scoring tips', () => {
    const questions = ExamPredictorService.generateExamQuestions(sampleDoc1);
    const q10 = questions.find(q => q.marks === 10)!;

    assert.ok(q10.modelAnswer.introduction.length > 30, 'Must have detailed academic introduction');
    assert.ok(q10.modelAnswer.structuredSections.length >= 3, 'Must have structured Part a/b/c sections');
    assert.ok(q10.modelAnswer.diagramAsciiOrSteps && q10.modelAnswer.diagramAsciiOrSteps.length > 0, 'Must include schematic diagram');
    assert.ok(q10.modelAnswer.workedCalculation, 'Must include numerical worked calculation');
    assert.ok(q10.examinerTip.length > 15, 'Must provide examiner tip');
    assert.ok(q10.commonPitfallsToAvoid.length >= 2, 'Must provide common pitfalls to avoid');
  });

  // -------------------------------------------------------------------------
  // REQUIREMENT 2: Multi-Document Topic Deduplication & Master Catalog (2+ Files)
  // -------------------------------------------------------------------------
  test('Check 4: Multi-document comparison unifies overlapping topics without repeating common ones', () => {
    const result = DocumentComparisonService.compareMultiDocuments([sampleDoc1, sampleDoc2]);

    assert.strictEqual(result.analyzedDocuments.length, 2);
    // Raw total sections across both docs = 2 + 2 = 4 sections.
    // "CPU Scheduling Criteria" in Doc 1 and "Process Scheduling and Dispatching" in Doc 2 share semantic topic "Scheduling".
    // Therefore, totalUniqueTopicsCount MUST be strictly less than 4!
    assert.ok(
      result.totalUniqueTopicsCount < 4,
      `Expected deduplicated topic count to be less than raw total (4), got ${result.totalUniqueTopicsCount}`
    );
    assert.ok(result.sharedTopicsCount >= 1, `Expected at least 1 shared topic, got ${result.sharedTopicsCount}`);

    // Verify deduplicated catalog has no duplicates
    const titles = result.deduplicatedTopicCatalog.map(t => t.canonicalTitle.toLowerCase());
    const uniqueTitles = new Set(titles);
    assert.strictEqual(titles.length, uniqueTitles.size, 'All topics in the deduplicated catalog must be unique');
  });

  test('Check 5: Merged shared topics cite both source documents and combine formulas', () => {
    const result = DocumentComparisonService.compareMultiDocuments([sampleDoc1, sampleDoc2]);
    const sharedTopic = result.deduplicatedTopicCatalog.find(t => t.isShared);

    assert.ok(sharedTopic, 'Shared topic must exist');
    assert.strictEqual(sharedTopic.sourceDocuments.length, 2, 'Shared topic must cite both source documents');

    const docIdsCited = sharedTopic.sourceDocuments.map(s => s.docId);
    assert.ok(docIdsCited.includes('doc-os-1'), 'Must cite doc 1');
    assert.ok(docIdsCited.includes('doc-os-2'), 'Must cite doc 2');

    // Both source documents' formulas should be merged into keyFormulas
    assert.ok(sharedTopic.keyFormulas.length >= 2, 'Should aggregate formulas from both files without dropping');
  });

  test('Check 6: Exclusive topics are properly segregated under their respective source document', () => {
    const result = DocumentComparisonService.compareMultiDocuments([sampleDoc1, sampleDoc2]);

    const exclusiveDoc2 = result.exclusiveTopicsByDocument['doc-os-2'];
    assert.ok(exclusiveDoc2 && exclusiveDoc2.length >= 1, 'Doc 2 must have its exclusive NUMA topic');
    assert.ok(
      exclusiveDoc2.some(t => t.canonicalTitle.toLowerCase().includes('numa') || t.canonicalTitle.toLowerCase().includes('affinity')),
      'Exclusive NUMA topic must be attributed to Doc 2'
    );
  });

  test('Check 7: Cross-document coverage matrix evaluates coverage levels (comprehensive/moderate/absent) across all files', () => {
    const result = DocumentComparisonService.compareMultiDocuments([sampleDoc1, sampleDoc2]);

    assert.ok(result.crossDocumentMatrix.length >= result.totalUniqueTopicsCount);
    const firstRow = result.crossDocumentMatrix[0];
    assert.ok(firstRow.coverageByDoc['doc-os-1'], 'Must have coverage rating for doc 1');
    assert.ok(firstRow.coverageByDoc['doc-os-2'], 'Must have coverage rating for doc 2');
    assert.ok(['unanimous', 'complementary', 'exclusive'].includes(firstRow.status));
  });

  console.log(`\n================================================================`);
  console.log(`📊 Summary: ${passed}/${total} checks passed.`);
  console.log(`================================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
