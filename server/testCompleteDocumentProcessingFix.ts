import assert from 'assert';
import { BatchProcessingEngine } from './services/batchProcessingEngine';
import { ExtractionService } from './services/extractionService';
import { RealExtractor } from './services/realExtractor';
import AdmZip from 'adm-zip';

console.log('================================================================');
console.log('🧪 LEARNOVA: Complete Document Processing Fix Verification Suite');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then(() => {
            console.log(`✅ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`❌ [FAIL] ${name}:`, err.message);
          });
      } else {
        console.log(`✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Batch creation & preservation of complete page order
  test('Requirement 1 & 2: BatchProcessingEngine divides pages into batches without omission', () => {
    const totalPages = 45;
    const batchSize = 10;
    const batches = BatchProcessingEngine.createBatches(totalPages, batchSize);

    assert.strictEqual(batches.length, 5, 'Should create 5 batches for 45 pages at 10/batch');
    assert.deepStrictEqual(batches[0], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepStrictEqual(batches[4], [41, 42, 43, 44, 45]);

    // Ensure every single page from 1 to 45 is in one and only one batch
    const allPages: number[] = [];
    batches.forEach(b => {
      b.forEach(p => allPages.push(p));
    });
    assert.strictEqual(allPages.length, 45, 'All 45 pages must be present');
    assert.strictEqual(allPages[0], 1, 'First page is 1');
    assert.strictEqual(allPages[44], 45, 'Last page is 45');
  });

  // 2. Real-time progress metric calculations
  test('Requirement 3: Progress tracking computes all 6 core metrics accurately', () => {
    let progress = BatchProcessingEngine.initProgress(50, 10);
    assert.strictEqual(progress.totalPagesOrSlides, 50);
    assert.strictEqual(progress.successfullyProcessedPages, 0);
    assert.strictEqual(progress.remainingPages, 50);
    assert.strictEqual(progress.overallCompletionPercentage, 0);
    assert.strictEqual(progress.isComplete, false);

    // Update with batch 1 (pages 1 to 10)
    progress = BatchProcessingEngine.updateBatchProgress(progress, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.strictEqual(progress.successfullyProcessedPages, 10);
    assert.strictEqual(progress.remainingPages, 40);
    assert.strictEqual(progress.overallCompletionPercentage, 20);
    assert.strictEqual(progress.currentBatchIndex, 2);

    // Update with batch 2 (pages 11 to 20) with one failed page (page 14)
    progress = BatchProcessingEngine.updateBatchProgress(progress, 2, [11, 12, 13, 15, 16, 17, 18, 19, 20], [14]);
    assert.strictEqual(progress.successfullyProcessedPages, 19);
    assert.strictEqual(progress.failedPages.length, 1);
    assert.strictEqual(progress.failedPages[0], 14);
    assert.strictEqual(progress.remainingPages, 31);
  });

  // 3. Completeness verification prevents incomplete documents from being marked 'completed'
  test('Requirement 4: Completeness verification strictly detects missing & unreadable pages', () => {
    // Case A: Missing pages
    const sections10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => ({ pageNumber: p }));
    const resultMissing = BatchProcessingEngine.verifyCompleteness(20, sections10);
    assert.strictEqual(resultMissing.isFullyComplete, false, 'Incomplete document must not be marked complete');
    assert.strictEqual(resultMissing.verdict, 'failed');
    assert.strictEqual(resultMissing.missingPages.length, 10);
    assert.strictEqual(resultMissing.missingPages[0], 11);

    // Case B: Unreadable pages flagged explicitly
    const resultUnreadable = BatchProcessingEngine.verifyCompleteness(10, sections10, [4, 7]);
    assert.strictEqual(resultUnreadable.isFullyComplete, false);
    assert.strictEqual(resultUnreadable.verdict, 'warning');
    assert.deepStrictEqual(resultUnreadable.unreadablePages, [4, 7]);
    assert.ok(resultUnreadable.statusMessage.includes('4, 7'), 'Must cite exact unreadable page numbers');

    // Case C: 100% verified complete
    const resultComplete = BatchProcessingEngine.verifyCompleteness(10, sections10);
    assert.strictEqual(resultComplete.isFullyComplete, true);
    assert.strictEqual(resultComplete.verdict, 'completed');
    assert.strictEqual(resultComplete.missingPages.length, 0);
  });

  // 4. DOCX Universal Extraction
  test('Requirement 5: RealExtractor.extractDocx extracts headings, equations, and tables from DOCX archive', () => {
    // Generate a valid mock DOCX in memory
    const zip = new AdmZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <w:body>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
          <w:r><w:t>Chapter 1: Quantum Computing Foundations</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
          <w:r><w:t>1.1 Superposition and Qubits</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>A qubit can exist in a linear combination of states |0&gt; and |1&gt;.</w:t></w:r>
        </w:p>
        <w:p>
          <m:oMath><m:r><m:t>|\\psi\\rangle = \\alpha |0\\rangle + \\beta |1\\rangle</m:t></m:r></m:oMath>
        </w:p>
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Basis</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>State</w:t></w:r></w:p></w:tc>
          </w:tr>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Computational</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>|0&gt;, |1&gt;</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
        <w:p>
          <w:r><w:br w:type="page"/></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
          <w:r><w:t>1.2 Quantum Entanglement</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>Entangled states cannot be written as a tensor product of single qubit states.</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>`;
    
    zip.addFile('word/document.xml', Buffer.from(documentXml, 'utf-8'));
    const docxBuffer = zip.toBuffer();

    const result = RealExtractor.extractDocx(docxBuffer, 'quantum.docx');
    assert.ok(result.sections.length >= 2, 'Should extract multiple sections');
    assert.strictEqual(result.pageCount, 2, 'Should detect 2 pages from page break');
    assert.ok(result.sections.some(s => s.title.includes('Quantum Computing Foundations')), 'Should extract Heading1 as section title');
    assert.ok(result.sections.some(s => s.title.includes('Quantum Entanglement') || s.content.includes('Entanglement')), 'Should extract second page');
    assert.strictEqual(result.hasTables, true, 'Should detect tables in DOCX');
    assert.strictEqual(result.hasEquations, true, 'Should detect equations in DOCX');
  });

  // 5. No arbitrary formula or condition slicing
  test('Requirement 1 & 5: RealExtractor preserves all formulas and conditions without slice(0, 5) limit', () => {
    // Generate text with 8 distinct formulas
    const textWith8Formulas = `
    Equation 1: E = mc^2
    Equation 2: F = ma
    Equation 3: v = u + at
    Equation 4: s = ut + 0.5at^2
    Equation 5: v^2 = u^2 + 2as
    Equation 6: PV = nRT
    Equation 7: Delta G = Delta H - T * Delta S
    Equation 8: lambda = h / p
    `;
    const formulas = RealExtractor.detectFormulas(textWith8Formulas);
    assert.strictEqual(formulas.length, 8, `Expected all 8 formulas to be detected without slice limit, got ${formulas.length}`);
  });

  // 6. End-to-end extraction completeness and batch progress in extractionService
  await test('Requirement 6 & 7: extractionService attaches batchProgress & enforces completeness verification', async () => {
    const rawContent = `
    Chapter 1: Distributed Consensus
    1.1 Paxos and Raft
    State machine replication requires consistent ordering of log entries.
    Formula: Q = floor(N / 2) + 1
    
    Chapter 2: Byzantine Fault Tolerance
    2.1 PBFT Algorithm
    Tolerates up to f failures in a network of 3f + 1 nodes.
    `;

    const res = await ExtractionService.extractRealDocument('test-doc-123', 'pdf', 'consensus.pdf', undefined, rawContent);
    assert.ok(res.batchProgress, 'Extraction must include batchProgress');
    assert.strictEqual(res.batchProgress.isComplete, true, 'Fully processed document must have isComplete: true');
    assert.strictEqual(res.batchProgress.remainingPages, 0, 'Remaining pages must be 0 upon full extraction');
    assert.strictEqual(res.batchProgress.overallCompletionPercentage, 100);
    assert.ok(res.sections.length >= 2, 'Must extract all chapters/sections');
    assert.strictEqual(res.qualityReport.userStatus, 'ready');
  });

  console.log(`\n================================================================`);
  console.log(`📊 Summary: ${passed}/${total} checks passed.`);
  console.log(`================================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
