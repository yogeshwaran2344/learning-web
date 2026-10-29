import { DeliberateTestRunner } from './services/deliberateTestCollection';

const res = DeliberateTestRunner.evaluateCollection();
console.log('--- DELIBERATE ERROR TEST COLLECTION EVALUATION ---');
console.log('Total tests:', res.total);
console.log('Passed:', res.passed);
console.log('Accuracy:', res.accuracyPercent + '%');
console.log('Missed errors:', res.missedErrors);
console.log('False alarms:', res.falseAlarms);
res.results.forEach(r => {
  console.log('  [' + (r.isCorrectVerdict ? 'PASS' : 'FAIL') + '] ' + r.title + ' -> ' + r.actualStatus + ' (expected ' + r.expectedStatus + ')');
});

process.exit(res.missedErrors === 0 && res.falseAlarms === 0 ? 0 : 1);
