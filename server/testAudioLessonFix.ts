import assert from 'assert';
import { StorageService } from '../src/services/storageService';
import { AcademicDocument } from '../src/types';

console.log('================================================================');
console.log('🧪 LEARNOVA: Audio Lesson Error & Undefined Length Fix Test');
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

  // 1. Test StorageService.sanitizeDocument handles completely missing audioLesson
  test('StorageService: Auto-generates valid audioLesson with sections when doc.audioLesson is missing', () => {
    const rawDoc: any = {
      id: 'doc-no-audio',
      title: 'Operating Systems Scheduling',
      sections: [
        {
          id: 'sec-1',
          pageNumber: 1,
          title: 'CPU Scheduling Algorithms',
          content: 'FCFS, SJF, and Round Robin ensure CPU utilization.'
        }
      ]
    };

    const sanitized = StorageService.sanitizeDocument(rawDoc);
    assert.ok(sanitized.audioLesson, 'audioLesson must exist');
    assert.ok(Array.isArray(sanitized.audioLesson.sections), 'audioLesson.sections must be an array');
    assert.strictEqual(sanitized.audioLesson.sections.length, 1);
    assert.strictEqual(sanitized.audioLesson.sections[0].sectionTitle, '1. CPU Scheduling Algorithms');
    assert.ok(sanitized.audioLesson.sections[0].scriptText.includes('CPU Scheduling Algorithms'));
  });

  // 2. Test StorageService handles legacy doc.audioLesson with 'segments'
  test('StorageService: Safely converts legacy audioLesson.segments into modern audioLesson.sections', () => {
    const rawLegacyDoc: any = {
      id: 'doc-legacy-audio',
      title: 'Thermodynamics',
      audioLesson: {
        title: 'Thermodynamics Audio Overview',
        totalDurationSeconds: 180,
        segments: [
          {
            id: 'legacy-seg-1',
            title: 'First Law of Thermodynamics',
            durationSeconds: 90,
            narration: 'Energy can neither be created nor destroyed.',
            pageNumber: 2
          }
        ]
      }
    };

    const sanitized = StorageService.sanitizeDocument(rawLegacyDoc);
    assert.ok(sanitized.audioLesson);
    assert.ok(Array.isArray(sanitized.audioLesson.sections), 'audioLesson.sections must be an array');
    assert.strictEqual(sanitized.audioLesson.sections.length, 1);
    assert.strictEqual(sanitized.audioLesson.sections[0].sectionTitle, 'First Law of Thermodynamics');
    assert.strictEqual(sanitized.audioLesson.sections[0].scriptText, 'Energy can neither be created nor destroyed.');
    assert.strictEqual(sanitized.audioLesson.sections[0].sourceCitation.pageNumber, 2);
  });

  // 3. Test StorageService handles empty audioLesson {}
  test('StorageService: Gracefully repairs empty audioLesson: {}', () => {
    const rawEmptyDoc: any = {
      id: 'doc-empty-audio',
      title: 'Linear Algebra',
      audioLesson: {}
    };

    const sanitized = StorageService.sanitizeDocument(rawEmptyDoc);
    assert.ok(sanitized.audioLesson);
    assert.ok(Array.isArray(sanitized.audioLesson.sections));
    assert.strictEqual(sanitized.audioLesson.sections.length, 1);
    assert.ok(sanitized.audioLesson.sections[0].sectionTitle.includes('Overview'));
  });

  console.log(`\n================================================================`);
  console.log(`📊 Summary: ${passed}/${total} audio tests passed.`);
  console.log(`================================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
