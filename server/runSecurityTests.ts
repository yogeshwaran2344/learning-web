import { SecurityTestSuite } from './services/securityTestSuite';

const secRes = SecurityTestSuite.runSuite();
console.log('--- SECURITY AND ACCESS CONTROL TEST SUITE ---');
console.log('Total checks:', secRes.totalTests);
console.log('Passed:', secRes.passedTests);
console.log('All passed:', secRes.allPassed);
secRes.checks.forEach(c => {
  console.log('  [' + (c.passed ? 'PASS' : 'FAIL') + '] ' + c.name + ': ' + c.details);
});

process.exit(secRes.allPassed ? 0 : 1);
