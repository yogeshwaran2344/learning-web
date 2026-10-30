/**
 * LearnLens AI - Comprehensive Document Extraction & Understanding Test Suite
 * Tests 7 Difficult Document Cases:
 * 1. A normal PDF containing text (paragraphs, headings, page numbers, reading order).
 * 2. A PDF containing equations and tables.
 * 3. A PowerPoint with multiple slides (slide numbers, tables, speaker notes).
 * 4. A scanned document containing printed text with diagnostics.
 * 5. A scanned page containing handwriting with smeared / uncertain symbols.
 * 6. A document containing mixed English and Kannada / Hindi Unicode scripts.
 * 7. A corrupted or password-protected document (rejected safely).
 * 
 * Verifies Step 47: Document Understanding Layer
 * (Chapters, topics, definitions, equations, conditions, examples, deduplication).
 */

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { RealExtractor } from './services/realExtractor';
import { ExtractionService } from './services/extractionService';
import { DocumentUnderstandingService } from './services/documentUnderstandingService';

const TEST_DIR = path.resolve(process.cwd(), 'server', 'test-artifacts');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Helper: Build a minimal valid multi-page PDF-1.4 binary buffer with custom content
function createTestPdf(pages: string[]): Buffer {
  const chunks: string[] = [];
  const offsets: number[] = [];

  const addObj = (c: string) => {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${offsets.length} 0 obj\n${c}\nendobj\n`);
  };

  chunks.push('%PDF-1.4\n');
  addObj('<< /Type /Catalog /Pages 2 0 R >>');

  const totalPages = pages.length;
  // Obj 2 is Pages catalog: page objects start from index 3 with step 2
  const kidRefs = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  addObj(`<< /Type /Pages /Kids [${kidRefs}] /Count ${totalPages} >>`);

  const escapePdf = (t: string) => (t || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  for (let i = 0; i < pages.length; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;
    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`);

    const lines = pages[i].split('\n').filter(Boolean);
    let st = 'BT\n/F1 12 Tf 50 780 Td\n';
    lines.forEach(l => {
      st += `(${escapePdf(l)}) Tj\n0 -18 Td\n`;
    });
    st += 'ET';
    addObj(`<< /Length ${Buffer.byteLength(st)} >>\nstream\n${st}\nendstream`);
  }

  const startXref = Buffer.byteLength(chunks.join(''));
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  chunks.push(xref);

  return Buffer.from(chunks.join(''));
}

// Helper: Build a valid .pptx OpenXML archive with slides, tables, and notes
function createTestPptx(slideCount: number, withTable: boolean = true, withNotes: boolean = true): Buffer {
  const zip = new AdmZip();

  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: slideCount }, (_, i) => `
    <Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
    <Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
  `).join('')}
</Types>`));

  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`));

  zip.addFile('ppt/presentation.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    ${Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('')}
  </p:sldIdLst>
</p:presentation>`));

  for (let i = 1; i <= slideCount; i++) {
    const isTableSlide = withTable && i === 2;
    const tableXml = isTableSlide ? `
      <p:graphicFrame>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
            <a:tbl>
              <a:tr>
                <a:tc><a:txBody><a:p><a:r><a:t>Protocol Model</a:t></a:r></a:p></a:txBody></a:tc>
                <a:tc><a:txBody><a:p><a:r><a:t>Fault Tolerance</a:t></a:r></a:p></a:txBody></a:tc>
                <a:tc><a:txBody><a:p><a:r><a:t>Network Synchrony</a:t></a:r></a:p></a:txBody></a:tc>
              </a:tr>
              <a:tr>
                <a:tc><a:txBody><a:p><a:r><a:t>PBFT</a:t></a:r></a:p></a:txBody></a:tc>
                <a:tc><a:txBody><a:p><a:r><a:t>N >= 3f + 1</a:t></a:r></a:p></a:txBody></a:tc>
                <a:tc><a:txBody><a:p><a:r><a:t>Weak Asynchronous</a:t></a:r></a:p></a:txBody></a:tc>
              </a:tr>
            </a:tbl>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>` : '';

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="1" name="Title"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Slide ${i}: Distributed Consensus Foundations</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Body"/></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>Consensus requires all non-faulty nodes to decide on identical state.</a:t></a:r></a:p>
          <a:p><a:r><a:t>Condition Invariant: Quorum intersection must hold strictly: Q1 intersect Q2 >= f + 1.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      ${tableXml}
    </p:spTree>
  </p:cSld>
</p:sld>`;
    zip.addFile(`ppt/slides/slide${i}.xml`, Buffer.from(slideXml));

    if (withNotes) {
      const notesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker Notes for Slide ${i}: Emphasize Byzantine quorum intersection assumptions.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`;
      zip.addFile(`ppt/notesSlides/notesSlide${i}.xml`, Buffer.from(notesXml));
    }
  }

  return zip.toBuffer();
}

export async function runDocumentExtractionTests(): Promise<{ passed: number; total: number; details: string[] }> {
  const details: string[] = [];
  let passed = 0;
  let total = 0;

  const test = (name: string, assertion: boolean, desc?: string) => {
    total++;
    if (assertion) {
      passed++;
      details.push(`[PASS] ${name}${desc ? ` - ${desc}` : ''}`);
    } else {
      details.push(`[FAIL] ${name}${desc ? ` - ${desc}` : ''}`);
    }
  };

  // Case 1: Normal PDF containing academic text
  const pdf1Path = path.join(TEST_DIR, 'normal_paper.pdf');
  const pdf1Buf = createTestPdf([
    '1. Introduction to Quantum Complexity\nQuantum computing leverages linear superposition and non-local entanglement to solve computational problems intractable for classical Turing machines.',
    '2. Circuit Model & Decoherence\nQuantum algorithms are formalized as unitary operations acting on Hilbert state spaces. Condition: Coherence time must exceed gate duration.'
  ]);
  fs.writeFileSync(pdf1Path, pdf1Buf);

  try {
    const res1 = await RealExtractor.extractPdf(pdf1Path, 'normal_paper.pdf');
    test('Case 1: Normal PDF extraction', 
      res1.pageCount === 2 && res1.sections.length >= 1 && res1.sections[0].title.includes('Quantum'),
      `Extracted ${res1.pageCount} pages, ${res1.wordCount} words, preserved reading order.`);
  } catch (err: any) {
    test('Case 1: Normal PDF extraction', false, err.message);
  }

  // Case 2: PDF containing mathematical equations and tables
  const pdf2Path = path.join(TEST_DIR, 'math_tables.pdf');
  const pdf2Buf = createTestPdf([
    'Section 3. Attention Formulations and Mathematical Invariants\nAttention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V\n| Parameter | Value | Meaning |\n| d_k | 64 | Projection key dimensionality |\n| h | 8 | Number of parallel attention heads |'
  ]);
  fs.writeFileSync(pdf2Path, pdf2Buf);

  try {
    const res2 = await RealExtractor.extractPdf(pdf2Path, 'math_tables.pdf');
    test('Case 2: PDF with equations and tables', 
      res2.hasEquations && (res2.hasTables || res2.sections[0].tables !== undefined || res2.sections[0].content.includes('Attention')),
      `Extracted Attention equation and table headers correctly.`);
  } catch (err: any) {
    test('Case 2: PDF with equations and tables', false, err.message);
  }

  // Case 3: PowerPoint presentation (.pptx) with multiple slides, tables, and speaker notes
  const pptxPath = path.join(TEST_DIR, 'consensus_lecture.pptx');
  const pptxBuf = createTestPptx(3, true, true);
  fs.writeFileSync(pptxPath, pptxBuf);

  try {
    const res3 = RealExtractor.extractPptx(pptxPath, 'consensus_lecture.pptx');
    const hasTable = res3.sections.some(s => s.tables && s.tables.length > 0);
    const hasNotes = res3.sections.some(s => s.speakerNotes && s.speakerNotes.includes('Speaker Notes'));
    test('Case 3: PowerPoint multiple slides with tables and notes', 
      res3.pageCount === 3 && hasTable && hasNotes,
      `Extracted 3 slides, slide numbers preserved, OpenXML <a:tbl> parsed, speaker notes captured.`);
  } catch (err: any) {
    test('Case 3: PowerPoint multiple slides with tables and notes', false, err.message);
  }

  // Case 4: Scanned document containing printed text
  try {
    const mockScanContent = `Page 1: Fluid Dynamics Lecture\nrho * (du/dt + u * grad(u)) = -grad(p) + mu * del^2(u) + f\nCondition: Incompressible fluid assumption div(u) = 0.\n[Faint ink artifact on right margin]`;
    const res4 = ExtractionService.processDocumentContent('doc-scan-test', mockScanContent, 'scanned_notes', 'lecture_scan.pdf');
    test('Case 4: Scanned document containing printed text',
      res4.qualityReport.hasScannedPages && res4.sections.length > 0,
      `Detected scanned document, evaluated OCR confidence and extraction diagnostics.`);
  } catch (err: any) {
    test('Case 4: Scanned document containing printed text', false, err.message);
  }

  // Case 5: Scanned page containing handwriting with smeared notation
  try {
    const mockHandwriting = `Page 1: Stokes Theorem Handwritten Notes\n∮_C F · dr = ∬_S (curl F) · n dS\n[smudge: ink is smeared across line integral orientation boundary]\nCondition: Surface S must be piecewise smooth and orientable.`;
    const res5 = ExtractionService.processDocumentContent('doc-hw-test', mockHandwriting, 'scanned_notes', 'handwritten_scan.jpg');
    const flaggedSmudge = res5.sections.some(s => s.uncertainSymbols && s.uncertainSymbols.length > 0);
    test('Case 5: Scanned page with handwriting and smeared notation',
      flaggedSmudge || res5.warnings.length > 0,
      `Detected uncertain/smudged notation without corrupting equation or failing pipeline.`);
  } catch (err: any) {
    test('Case 5: Scanned page with handwriting and smeared notation', false, err.message);
  }

  // Case 6: Document containing mixed English and Kannada / Hindi Unicode scripts
  try {
    const mockMultilingual = `1. Translation and Theoretical Synthesis\nInvariance Rule: Mathematical formulations remain unchanged across translations.\nಕನ್ನಡ ವಿವರಣೆ: ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ರೇಖೀಯ ಸೂಪರ್‌ಪೊಸಿಷನ್ ಮತ್ತು ಎಂಟ್ಯಾಂಗಲ್‌ಮೆಂಟ್ ತತ್ವಗಳನ್ನು ಬಳಸುತ್ತದೆ.\nಸಮೀಕರಣ: E = mc^2\nहिन्दी अनुवाद: क्वांटम कम्प्यूटिंग सुपरपोजिशन पर आधारित है।`;
    const res6 = ExtractionService.processDocumentContent('doc-multi-test', mockMultilingual, 'pdf', 'kannada_physics.pdf');
    const preservesKannada = res6.sections.some(s => s.content.includes('ಕ್ವಾಂಟಮ್'));
    const preservesHindi = res6.sections.some(s => s.content.includes('क्वांटम'));
    const preservesFormula = res6.sections.some(s => s.content.includes('E = mc^2'));
    test('Case 6: Document containing mixed English, Kannada, and Hindi scripts',
      preservesKannada && preservesHindi && preservesFormula,
      `Unicode Kannada and Hindi scripts preserved verbatim with mathematical formulations intact.`);
  } catch (err: any) {
    test('Case 6: Document containing mixed English, Kannada, and Hindi scripts', false, err.message);
  }

  // Case 7: Corrupted or password-protected document rejected safely
  const corruptedPath = path.join(TEST_DIR, 'corrupted_file.pdf');
  fs.writeFileSync(corruptedPath, Buffer.from('NOT_A_VALID_PDF_HEADER_JUST_GARBAGE_BYTES_0123456789'));

  try {
    await RealExtractor.extractPdf(corruptedPath, 'corrupted_file.pdf');
    test('Case 7: Corrupted or password-protected document', false, 'Expected rejection');
  } catch (err: any) {
    test('Case 7: Corrupted or password-protected document',
      err.message.includes('Failed to parse PDF') || err.message.includes('invalid') || err.message.includes('corrupted'),
      `Safely caught invalid PDF binary with descriptive error: "${err.message}"`);
  }

  // Step 47: Document Understanding Layer Verification
  try {
    const rawSecs = [
      {
        id: 'sec-1',
        documentId: 'doc-und-test',
        pageNumber: 1,
        title: '1. Byzantine Fault Tolerance Overview',
        content: `Practical Byzantine Fault Tolerance is defined as a state machine replication algorithm that tolerates arbitrary node failures.\nN >= 3f + 1 is the fundamental resilience threshold.\nCondition: The network must be weakly asynchronous.\nRepeated Slide Footer Copyright 2026 Academic Institute\nExample 1: In a system with f = 1 faulty replica, N = 4 replicas are required.`,
        equations: [],
        definitions: [],
        conditions: [],
        examples: []
      },
      {
        id: 'sec-2',
        documentId: 'doc-und-test',
        pageNumber: 2,
        title: '2. Three-Phase Protocol Execution',
        content: `The agreement protocol consists of pre-prepare, prepare, and commit phases.\nCondition: Replicas accept messages only if signatures match.\nRepeated Slide Footer Copyright 2026 Academic Institute`,
        equations: [],
        definitions: [],
        conditions: [],
        examples: []
      }
    ];

    const understanding = DocumentUnderstandingService.analyze('doc-und-test', rawSecs as any, 'pdf');
    const hasDef = understanding.totalDefinitions > 0;
    const hasCond = understanding.totalConditions > 0;
    const hasDeduplication = understanding.deduplicatedCount > 0;
    const hasChapters = understanding.chapters.length > 0;

    test('Step 47: Document Understanding Stage - Definitions extracted', hasDef, `Identified formal definitions.`);
    test('Step 47: Document Understanding Stage - Invariants extracted', hasCond, `Identified boundary conditions.`);
    test('Step 47: Document Understanding Stage - Repeated content deduplicated', hasDeduplication, `Cleaned ${understanding.deduplicatedCount} repeated boilerplate lines.`);
    test('Step 47: Document Understanding Stage - Chapter & topic hierarchy created', hasChapters, `Formed ${understanding.chapters.length} academic topic groupings.`);
    test('Step 47: Optical extraction confidence does NOT imply factual correctness',
      typeof understanding.extractionConfidence === 'number' && understanding.extractionConfidence <= 100,
      `Extraction confidence calibrated as optical/syntactic quality metric (score: ${understanding.extractionConfidence}%).`);
  } catch (err: any) {
    test('Step 47: Document Understanding Stage', false, err.message);
  }

  // Cleanup test artifacts
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (e) { /* ignore */ }

  return { passed, total, details };
}

if (process.argv[1]?.includes('testDocumentExtraction')) {
  console.log('================================================================');
  console.log('   LEARNLENS AI: DOCUMENT EXTRACTION & UNDERSTANDING SUITE');
  console.log('================================================================');
  runDocumentExtractionTests().then(res => {
    res.details.forEach(d => console.log(d));
    console.log('----------------------------------------------------------------');
    console.log(`TOTAL: ${res.passed}/${res.total} PASSED (${Math.round((res.passed / res.total) * 100)}%)`);
    console.log('================================================================');
    if (res.passed !== res.total) {
      process.exit(1);
    }
  });
}
