import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { RealExtractor } from '../../services/realExtractor';

async function runTests() {
  console.log('--- 15.4 VERIFICATION MILESTONE: REAL FILE EXTRACTION ---');

  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 1. Create a real sample PowerPoint file (.pptx is a zip with xml files)
  const pptxPath = path.join(testDir, 'sample_lecture.pptx');
  const zip = new AdmZip();
  const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>Lecture 03: Scaled Dot-Product Attention</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Formula: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Condition: Dimension d_k must be non-zero and positive</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const notes1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker Note: Emphasize scaling factor 1/sqrt(d_k) prevents vanishing gradients.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`;

  zip.addFile('ppt/slides/slide1.xml', Buffer.from(slide1Xml, 'utf-8'));
  zip.addFile('ppt/notesSlides/notesSlide1.xml', Buffer.from(notes1Xml, 'utf-8'));
  zip.writeZip(pptxPath);

  // Test 1: Real PPTX extraction
  console.log('\n[Test 1] Testing Real PowerPoint (.pptx) extraction:');
  const pptxResult = RealExtractor.extractPptx(pptxPath, 'sample_lecture.pptx');
  console.log('  - Title:', pptxResult.title);
  console.log('  - Slide count:', pptxResult.pageCount);
  console.log('  - Section identifier:', pptxResult.sections[0]?.sectionIdentifier);
  console.log('  - Content snippet:', pptxResult.sections[0]?.content.slice(0, 80));
  console.log('  - Speaker notes captured:', Boolean(pptxResult.sections[0]?.speakerNotes));
  console.log('  - Formulas captured:', pptxResult.sections[0]?.equations?.length);
  if (pptxResult.sections[0]?.sectionIdentifier === 'slide-1' && pptxResult.sections[0]?.speakerNotes) {
    console.log('  => TEST 1 PASSED: Slide references and speaker notes accurately preserved.');
  } else {
    console.error('  => TEST 1 FAILED.');
  }

  // Test 2: Unreadable / Corrupted document handling (Confirm no mock text is inserted)
  console.log('\n[Test 2] Testing Corrupted / Unreadable document rejection:');
  const corruptedPath = path.join(testDir, 'corrupted_file.pptx');
  fs.writeFileSync(corruptedPath, Buffer.from('NOT A VALID ZIP ARCHIVE'));
  try {
    RealExtractor.extractPptx(corruptedPath, 'corrupted_file.pptx');
    console.error('  => TEST 2 FAILED: Expected error but parsing succeeded.');
  } catch (err: any) {
    console.log('  - Caught expected error:', err.message);
    console.log('  => TEST 2 PASSED: Error thrown honestly without inserting sample content.');
  }

  console.log('\n--- ALL TEST SUITE CHECKS COMPLETED ---');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
