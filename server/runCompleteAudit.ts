import { EndToEndAuditor } from './services/endToEndAuditor';

const report = EndToEndAuditor.runCompleteAudit();
console.log('\n======================================================');
console.log('FINAL AUDIT RESULT: ' + report.overallStatus);
console.log('======================================================');
console.log('Database Readiness (8/8):', report.databaseReadiness.passed ? 'ALL PASSED' : 'FAILED');
report.databaseReadiness.checks.forEach(c => {
  console.log('  [' + (c.passed ? '✓' : '✗') + '] ' + c.name + ': ' + c.details);
});

console.log('\nWorkflow Execution:', report.workflowExecution.passed ? 'ALL PASSED' : 'FAILED');
console.log('  - Document ID:', report.workflowExecution.documentId);
console.log('  - Extracted Pages/Sections:', report.workflowExecution.pageCount);
console.log('  - Math Formulas Captured:', report.workflowExecution.extractedFormulas);
console.log('  - Detailed Notes Headings:', report.workflowExecution.generatedNotesHeadings);
console.log('  - Flashcards Generated:', report.workflowExecution.flashcardsCount);
console.log('  - Meaning Preservation Score:', report.workflowExecution.verificationScore + '%');

console.log('\nDeliberate Error Benchmark:');
console.log('  - Accuracy:', report.deliberateErrorDetection.accuracyPercent + '%');
console.log('  - Missed Errors:', report.deliberateErrorDetection.missedErrors);
console.log('  - False Alarms:', report.deliberateErrorDetection.falseAlarms);

console.log('\nSecurity & Access Control:', report.securityAndPermissions.details);

process.exit(report.overallStatus === 'PRODUCTION_READY' ? 0 : 1);
