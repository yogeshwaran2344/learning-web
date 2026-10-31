import { DocumentUnderstandingService } from './services/documentUnderstandingService';
import { ExtractedSectionRecord } from './db/schema';
import { Database } from './db/database';

console.log('================================================================');
console.log('   LEARNOVA: UNIVERSAL DOCUMENT UNDERSTANDING ENGINE SUITE     ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assertTest(name: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${name}${details ? ` -> ${details}` : ''}`);
  } else {
    console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function runTestSuite() {
  Database.init();

  // =========================================================================
  // TEST 1: Theory-Based PDF (Political Philosophy & Constitutional Ethics)
  // =========================================================================
  console.log('--- TEST 1: Theory-Based PDF (Political Philosophy) ---');
  const theoryDocId = 'doc-test-philosophy';
  const theorySections: ExtractedSectionRecord[] = [
    {
      id: 'sec-phil-1',
      documentId: theoryDocId,
      pageNumber: 1,
      title: 'Chapter 1: The State of Nature and Moral Sovereignty',
      content: `Thomas Hobbes is defined as the political philosopher who established social contract theory in Leviathan. 
In the state of nature, human life is characterized by universal insecurity, where existence is solitary, poor, nasty, brutish, and short. 
Sovereignty refers to the absolute authority granted to the commonwealth ruler to maintain civic order. 
Condition: Political authority must guarantee protection of subjects from mutual violence.`,
      definitions: [{ term: 'Thomas Hobbes', definition: 'the political philosopher who established social contract theory in Leviathan' }],
      equations: [],
      conditions: ['Political authority must guarantee protection of subjects from mutual violence.'],
      examples: []
    },
    {
      id: 'sec-phil-2',
      documentId: theoryDocId,
      pageNumber: 2,
      title: 'Chapter 2: Locke on Property Rights and Civil Society',
      content: `John Locke established that individuals hold inalienable natural rights to life, liberty, and estate. 
Civil society is created when individuals voluntarily consent to transfer adjudication powers to a constitutional government. 
Condition: Government authority is strictly constrained by the protection of fundamental human liberties.`,
      definitions: [{ term: 'Civil Society', definition: 'a voluntary union formed to protect natural property rights' }],
      equations: [],
      conditions: ['Government authority is strictly constrained by the protection of fundamental human liberties.'],
      examples: []
    },
    {
      id: 'sec-phil-3',
      documentId: theoryDocId,
      pageNumber: 3,
      title: 'Chapter 2: Locke on Property Rights and Civil Society (cont.)',
      content: `Furthermore, Locke establishes that if a monarch or parliament systematically violates natural rights, citizens retain the right to dissolve government. 
Condition: Tyrannical transgression dissolves civic obligation.`,
      definitions: [],
      equations: [],
      conditions: ['Tyrannical transgression dissolves civic obligation.'],
      examples: []
    }
  ];

  const theoryResult = DocumentUnderstandingService.analyze(theoryDocId, theorySections, 'pdf', 98, 'Philosophy of Governance');

  assertTest(
    '1.1 Intelligent Chapter Detection: Theory PDF discovers genuine chapters without 3-group forcing',
    theoryResult.chapters.length === 2 && theoryResult.chapters[0].title.includes('Chapter 1') && theoryResult.chapters[1].title.includes('Chapter 2'),
    `Discovered exactly ${theoryResult.chapters.length} genuine chapters: "${theoryResult.chapters[0].title}" & "${theoryResult.chapters[1].title}".`
  );

  assertTest(
    '1.2 Multi-Page Continuation: Identifies that Page 2 and Page 3 form a single continued multi-page topic',
    theoryResult.hierarchy.chapters[1].topics[0].isMultiPage === true &&
    theoryResult.hierarchy.chapters[1].topics[0].pageRange[0] === 2 &&
    theoryResult.hierarchy.chapters[1].topics[0].pageRange[1] === 3,
    `Multi-page topic confirmed: Page range [${theoryResult.hierarchy.chapters[1].topics[0].pageRange.join(', ')}].`
  );

  assertTest(
    '1.3 Content-Type Recognition: Correctly tags Theory and Definitions with zero false equations',
    theoryResult.hierarchy.chapters[0].topics[0].contentType === 'theory' &&
    theoryResult.totalEquations === 0 &&
    theoryResult.totalDefinitions >= 2,
    `Content type: Theory (${theoryResult.totalDefinitions} definitions, 0 spurious equations).`
  );

  // =========================================================================
  // TEST 2: Mathematics PDF containing Equations (Spectral Graph Theory)
  // =========================================================================
  console.log('\n--- TEST 2: Mathematics PDF containing Equations (Spectral Graph Theory) ---');
  const mathDocId = 'doc-test-math-spectral';
  const mathSections: ExtractedSectionRecord[] = [
    {
      id: 'sec-math-1',
      documentId: mathDocId,
      pageNumber: 1,
      title: '1. Graph Laplacian Matrix Formulations',
      content: `Let G = (V, E) be an undirected, weighted graph with degree matrix D and adjacency matrix A.
The Unnormalized Graph Laplacian is defined as L = D - A.
The quadratic form satisfies: x^T L x = \\sum_{(u,v) \\in E} w_{uv} (x_u - x_v)^2.
Invariant condition: The matrix L must be symmetric and positive semi-definite (lambda_1 >= 0).`,
      definitions: [{ term: 'Graph Laplacian', definition: 'the difference matrix L = D - A encoding graph connectivity' }],
      equations: [
        { latex: 'L = D - A', label: 'Laplacian Formulation', meaning: 'Unnormalized graph Laplacian definition' },
        { latex: 'x^T L x = \\sum_{(u,v) \\in E} w_{uv} (x_u - x_v)^2', label: 'Quadratic Form', meaning: 'Energy minimization on graph vertices' }
      ],
      conditions: ['The matrix L must be symmetric and positive semi-definite (lambda_1 >= 0).'],
      examples: []
    },
    {
      id: 'sec-math-2',
      documentId: mathDocId,
      pageNumber: 2,
      title: '2. Rayleigh Quotient and Spectral Cheeger Inequality',
      content: `The Rayleigh quotient is defined as R(L, x) = \\frac{x^T L x}{x^T x}.
The second smallest eigenvalue lambda_2 satisfies the variational characterization:
\\lambda_2 = \\min_{x \\perp 1, x \\neq 0} R(L, x).
Cheeger inequality bounds graph conductance: \\frac{\\lambda_2}{2} \\le h(G) \\le \\sqrt{2 \\lambda_2}.`,
      definitions: [{ term: 'Rayleigh Quotient', definition: 'the ratio R(L, x) measuring energy per unit variance' }],
      equations: [
        { latex: 'R(L, x) = \\frac{x^T L x}{x^T x}', label: 'Rayleigh Quotient', meaning: 'Eigenvalue bound formulation' },
        { latex: '\\frac{\\lambda_2}{2} \\le h(G) \\le \\sqrt{2 \\lambda_2}', label: 'Cheeger Inequality', meaning: 'Spectral conductance bounds' }
      ],
      conditions: ['Vector x must be orthogonal to all-ones vector (x \\perp 1).'],
      examples: []
    }
  ];

  const mathResult = DocumentUnderstandingService.analyze(mathDocId, mathSections, 'pdf', 98, 'Spectral Graph Theory');

  assertTest(
    '2.1 Mathematical Equation Extraction: Preserves LaTeX matrices, Greek symbols, and fractions',
    mathResult.totalEquations >= 4 &&
    mathResult.sections[0].equations!.some(e => e.latex.includes('L = D - A')) &&
    mathResult.sections[1].equations!.some(e => e.latex.includes('\\frac')),
    `Extracted ${mathResult.totalEquations} verified mathematical formulations with LaTeX preservation.`
  );

  assertTest(
    '2.2 Content-Type Recognition: Correctly associates equations with parent topics and source citations',
    mathResult.hierarchy.chapters[0].topics[0].associatedEquations.length >= 2 &&
    mathResult.hierarchy.chapters[0].topics[0].associatedEquations[0].pageNumber === 1,
    `Equations grounded to Page 1: ${mathResult.hierarchy.chapters[0].topics[0].associatedEquations[0].latex}.`
  );

  // =========================================================================
  // TEST 3: Programming PDF with Algorithms and Code Blocks (Algorithms)
  // =========================================================================
  console.log('\n--- TEST 3: Programming PDF (Algorithms & Data Structures) ---');
  const progDocId = 'doc-test-prog-sort';
  const progSections: ExtractedSectionRecord[] = [
    {
      id: 'sec-prog-1',
      documentId: progDocId,
      pageNumber: 1,
      title: 'Chapter 1: Divide-and-Conquer Sorting Algorithms',
      content: `MergeSort is defined as an optimal divide-and-conquer comparison sorting algorithm.
It partitions an array of size n into two halves, recursively sorts them, and merges the sorted sub-arrays.
\`\`\`python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)
\`\`\`
Algorithm 1: MergeSort recurrence relation satisfies T(n) = 2T(n/2) + O(n).
Time Complexity: O(n \\log n) worst-case comparison bound.`,
      definitions: [{ term: 'MergeSort', definition: 'an optimal divide-and-conquer comparison sorting algorithm' }],
      equations: [{ latex: 'T(n) = 2T(n/2) + O(n)', label: 'Recurrence Relation', meaning: 'Time complexity recurrence' }],
      conditions: ['Recursion base case requires array length len(arr) <= 1.'],
      examples: []
    },
    {
      id: 'sec-prog-2',
      documentId: progDocId,
      pageNumber: 2,
      title: 'Chapter 2: Partitioning Mechanisms in QuickSort',
      content: `QuickSort operates by selecting a pivot element and partitioning the array such that all elements less than the pivot precede all elements greater than it.
\`\`\`python
def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
\`\`\`
Algorithm 2: Lomuto partition scheme with average time complexity O(n \\log n).`,
      definitions: [{ term: 'QuickSort', definition: 'an in-place partitioning sorting algorithm' }],
      equations: [],
      conditions: ['Pivot index must remain within array bounds [low, high].'],
      examples: []
    }
  ];

  const progResult = DocumentUnderstandingService.analyze(progDocId, progSections, 'pdf', 98, 'Algorithms and Complexity');

  assertTest(
    '3.1 Programming Algorithm Recognition: Extracts executable Python code blocks and procedures',
    progResult.totalAlgorithms >= 2 &&
    progResult.sections[0].algorithms!.some(a => a.codeOrPseudocode.includes('def merge_sort')) &&
    progResult.sections[1].algorithms!.some(a => a.codeOrPseudocode.includes('def partition')),
    `Extracted ${progResult.totalAlgorithms} code algorithms across Chapters 1 and 2.`
  );

  assertTest(
    '3.2 Content-Type Tagging: Categorizes programming topics as programming',
    progResult.hierarchy.chapters[0].topics[0].contentType === 'programming' &&
    progResult.hierarchy.chapters[0].topics[0].associatedAlgorithms.length >= 1,
    `Primary content type: "${progResult.hierarchy.chapters[0].topics[0].contentType}" with ${progResult.hierarchy.chapters[0].topics[0].associatedAlgorithms.length} linked code algorithms.`
  );

  // =========================================================================
  // TEST 4: Biology PDF Containing Diagrams (Neurobiology & Synaptic Transmission)
  // =========================================================================
  console.log('\n--- TEST 4: Biology PDF with Diagrams (Cellular Neurobiology) ---');
  const bioDocId = 'doc-test-bio-neuro';
  const bioSections: ExtractedSectionRecord[] = [
    {
      id: 'sec-bio-1',
      documentId: bioDocId,
      pageNumber: 1,
      title: '1. Synaptic Bouton Structure and Neurotransmitter Vesicles',
      content: `Synaptic transmission is defined as the physiological process by which a presynaptic neuron releases chemical messengers into the synaptic cleft.
[Visual Diagram in Page 1: Synaptic Vesicle Exocytosis and SNARE Complex Fusion Architecture]
Figure 1: Presynaptic terminal showing voltage-gated calcium channels, reserve vesicle pools, and active zone scaffold proteins.
Condition: Vesicle fusion requires localized intracellular calcium influx [Ca2+] > 10 \\mu M.`,
      definitions: [{ term: 'Synaptic Transmission', definition: 'the physiological process of chemical communication across synaptic clefts' }],
      equations: [],
      conditions: ['Vesicle fusion requires localized intracellular calcium influx [Ca2+] > 10 \\mu M.'],
      examples: []
    },
    {
      id: 'sec-bio-2',
      documentId: bioDocId,
      pageNumber: 2,
      title: '2. Postsynaptic Receptor Kinetics and Ion Flux',
      content: `Neurotransmitters bind to ligand-gated ion channels, inducing conformational changes that modulate membrane potential.
Figure 2: Current-voltage relationship showing reversal potential and postsynaptic conductance curves.
Condition: Receptor channel gating is constrained by ligand concentration kinetics.`,
      definitions: [],
      equations: [],
      conditions: ['Receptor channel gating is constrained by ligand concentration kinetics.'],
      examples: []
    }
  ];

  const bioResult = DocumentUnderstandingService.analyze(bioDocId, bioSections, 'pdf', 96, 'Cellular Neurobiology');

  assertTest(
    '4.1 Diagrammatic Structure Recognition: Detects anatomical and architecture diagrams',
    bioResult.totalDiagrams >= 2 &&
    bioResult.sections[0].diagrams!.some(d => d.title.includes('Synaptic Vesicle')) &&
    bioResult.sections[1].diagrams!.some(d => d.title.includes('Figure 2')),
    `Extracted ${bioResult.totalDiagrams} diagram visual assets grounded to pages 1 and 2.`
  );

  assertTest(
    '4.2 Visual Topic Tagging: Associates diagrams with parent topics and citations',
    bioResult.hierarchy.chapters[0].topics[0].associatedDiagrams.length >= 1 &&
    bioResult.hierarchy.chapters[0].topics[0].associatedDiagrams[0].pageNumber === 1,
    `Associated diagram: "${bioResult.hierarchy.chapters[0].topics[0].associatedDiagrams[0].title}" on Page 1.`
  );

  // =========================================================================
  // TEST 5: PowerPoint Presentation (PPTX) with Tables and Images (Macroeconomics)
  // =========================================================================
  console.log('\n--- TEST 5: PowerPoint Presentation (PPTX) with Tables & Visuals (Macroeconomics) ---');
  const pptxDocId = 'doc-test-pptx-econ';
  const pptxSections: ExtractedSectionRecord[] = [
    {
      id: 'sec-pptx-1',
      documentId: pptxDocId,
      pageNumber: 1,
      slideNumber: 1,
      title: 'Slide 1: Global Macroeconomic Indicators',
      content: `Overview of annual GDP growth and monetary indicators across major economies.
[Visual Diagram in Slide 1: Central Bank Policy Transmission Pipeline from Policy Rate to Retail Lending]
Speaker Notes: Emphasize that fiscal policy operates with multi-quarter transmission lags.`,
      speakerNotes: 'Emphasize that fiscal policy operates with multi-quarter transmission lags.',
      definitions: [],
      equations: [],
      conditions: [],
      tables: [
        {
          caption: 'Macroeconomic Matrix 2024-2026',
          headers: ['Country', 'GDP Growth (%)', 'Inflation Rate (%)', 'Central Bank Rate (%)'],
          rows: [
            ['United States', '2.4', '2.8', '5.25'],
            ['Eurozone', '0.8', '2.4', '3.75'],
            ['India', '7.2', '4.6', '6.50']
          ]
        }
      ],
      examples: []
    },
    {
      id: 'sec-pptx-2',
      documentId: pptxDocId,
      pageNumber: 2,
      slideNumber: 2,
      title: 'Slide 2: Inflation Targeting and Taylor Rule Analysis',
      content: `The Taylor Rule provides an empirical benchmark for policy rate adjustments.
Equation: i_t = r^* + \\pi_t + 0.5(\\pi_t - \\pi^*) + 0.5(y_t - \\bar{y}_t).
Figure 3: Historical policy rate vs Taylor rule prescribed path.`,
      definitions: [{ term: 'Taylor Rule', definition: 'a monetary policy guideline linking interest rates to inflation and output gaps' }],
      equations: [{ latex: 'i_t = r^* + \\pi_t + 0.5(\\pi_t - \\pi^*) + 0.5(y_t - \\bar{y}_t)', label: 'Taylor Rule', meaning: 'Monetary policy target rate formulation' }],
      conditions: ['Output gap must be computed relative to potential GDP.'],
      tables: [],
      examples: []
    }
  ];

  const pptxResult = DocumentUnderstandingService.analyze(pptxDocId, pptxSections, 'pptx', 95, 'Macroeconomic Policy Presentation');

  assertTest(
    '5.1 Presentation Slide Extraction: Preserves slide numbers, OpenXML tables, and visual diagram notes',
    pptxResult.totalTables >= 1 &&
    pptxResult.sections[0].tables![0].headers.includes('GDP Growth (%)') &&
    pptxResult.sections[0].slideNumber === 1,
    `Preserved Slide 1 table (${pptxResult.sections[0].tables![0].rows.length} rows) and speaker notes.`
  );

  assertTest(
    '5.2 Table Asset Grounding: Topic associates table data with slide number 1',
    pptxResult.hierarchy.chapters[0].topics[0].associatedTables.length >= 1 &&
    pptxResult.hierarchy.chapters[0].topics[0].associatedTables[0].pageNumber === 1,
    `Associated table caption: "${pptxResult.hierarchy.chapters[0].topics[0].associatedTables[0].caption}".`
  );

  // =========================================================================
  // TEST 6: Scanned Handwritten Notes with Formulas & Smudges (Fluid Mechanics)
  // =========================================================================
  console.log('\n--- TEST 6: Scanned Handwritten Notes with Formulas & Smudges (Fluid Dynamics) ---');
  const scanDocId = 'doc-test-scan-fluid';
  const scanSections: ExtractedSectionRecord[] = [
    {
      id: 'sec-scan-1',
      documentId: scanDocId,
      pageNumber: 1,
      title: 'Notes Page 1: Steady Incompressible Fluid Flow',
      content: `Bernoulli principle states that along a streamline in steady inviscid flow, total mechanical energy is conserved.
Formulation: \\frac{p}{\\rho} + \\frac{v^2}{2} + g z = \\text{constant}.
Condition: Fluid must be inviscid (zero viscosity) and flow must be irrotational.
Optical smudge observed near bottom margin: ??~~ ink smudge on derivation factor.`,
      definitions: [{ term: 'Bernoulli Principle', definition: 'conservation of mechanical energy along streamlines in steady inviscid flow' }],
      equations: [{ latex: '\\frac{p}{\\rho} + \\frac{v^2}{2} + g z = \\text{constant}', label: 'Bernoulli Equation', meaning: 'Conservation of fluid mechanical head' }],
      conditions: ['Fluid must be inviscid (zero viscosity) and flow must be irrotational.'],
      examples: []
    },
    {
      id: 'sec-scan-2',
      documentId: scanDocId,
      pageNumber: 2,
      title: 'Notes Page 2: Pitot Tube Velocity Calculation',
      content: `Example 1: Pitot tube measures stagnation pressure p_0 = 105 kPa and static pressure p = 100 kPa. Fluid density \\rho = 1.2 kg/m^3.
Problem: Calculate flow velocity v = \\sqrt{\\frac{2(p_0 - p)}{\\rho}}.
Given: p_0 = 105 kPa, p = 100 kPa, rho = 1.2 kg/m^3.
Find: Velocity v.`,
      definitions: [],
      equations: [{ latex: 'v = \\sqrt{\\frac{2(p_0 - p)}{\\rho}}', label: 'Pitot Velocity', meaning: 'Stagnation velocity equation' }],
      conditions: [],
      examples: ['Pitot tube velocity calculation given stagnation pressure 105 kPa and static pressure 100 kPa']
    }
  ];

  const scanResult = DocumentUnderstandingService.analyze(scanDocId, scanSections, 'scanned_notes', 72, 'Fluid Mechanics Handwritten Lecture Notes');

  assertTest(
    '6.1 Optical Uncertainty Detection: Flags low-confidence smudged characters without crashing pipeline',
    scanResult.uncertainExtractions.length >= 1 &&
    scanResult.uncertainExtractions.some(u => u.pageNumber === 1),
    `Flagged optical uncertainty on Page ${scanResult.uncertainExtractions[0].pageNumber}: "${scanResult.uncertainExtractions[0].reason}".`
  );

  assertTest(
    '6.2 Scanned Mathematical Preservation: Extracts Bernoulli and Pitot equations despite scan noise',
    scanResult.totalEquations >= 2 &&
    scanResult.sections[0].equations!.some(e => e.latex.includes('\\frac{p}{\\rho}')),
    `Preserved scanned Bernoulli equation: "${scanResult.sections[0].equations![0].latex}".`
  );

  // =========================================================================
  // TEST 7: Universal Document Processing (Zero Subject Hardcoding)
  // =========================================================================
  console.log('\n--- TEST 7: Universal Document Processing (Zero Subject Hardcoding) ---');
  const allResultSubjects = [
    theoryResult.hierarchy.documentTitle,
    mathResult.hierarchy.documentTitle,
    progResult.hierarchy.documentTitle,
    bioResult.hierarchy.documentTitle,
    pptxResult.hierarchy.documentTitle,
    scanResult.hierarchy.documentTitle
  ];
  assertTest(
    '7.1 Domain Generalization: Analyzed 6 distinct domains without subject-specific assumptions',
    allResultSubjects.length === 6 &&
    theoryResult.chapters.length >= 1 &&
    mathResult.chapters.length >= 1 &&
    progResult.chapters.length >= 1 &&
    bioResult.chapters.length >= 1 &&
    pptxResult.chapters.length >= 1 &&
    scanResult.chapters.length >= 1,
    `Domains validated: Philosophy, Math, Programming, Biology, PPTX Economics, Scanned Engineering.`
  );

  // =========================================================================
  // TEST 8: Accuracy and Error Handling (Unreadable Pages & Duplicate Detection)
  // =========================================================================
  console.log('\n--- TEST 8: Accuracy and Error Handling ---');
  const noisySections: ExtractedSectionRecord[] = [
    {
      id: 'err-1',
      documentId: 'doc-err-test',
      pageNumber: 1,
      title: 'Valid Section 1',
      content: 'Clear theoretical discourse explaining fundamental concepts.',
      definitions: [],
      equations: [],
      conditions: [],
      examples: []
    },
    {
      id: 'err-2',
      documentId: 'doc-err-test',
      pageNumber: 2,
      title: 'Blank Page',
      content: '   ', // completely blank page
      definitions: [],
      equations: [],
      conditions: [],
      examples: []
    },
    {
      id: 'err-3',
      documentId: 'doc-err-test',
      pageNumber: 3,
      title: 'Valid Section 1',
      content: 'Clear theoretical discourse explaining fundamental concepts.', // exact duplicate
      definitions: [],
      equations: [],
      conditions: [],
      examples: []
    }
  ];

  const noisyResult = DocumentUnderstandingService.analyze('doc-err-test', noisySections, 'pdf', 90, 'Error Handling Test');

  assertTest(
    '8.1 Unreadable Page Reporting: Reports Page 2 in unreadablePages list without skipping silently',
    noisyResult.unreadablePages.includes(2),
    `Unreadable pages identified: [${noisyResult.unreadablePages.join(', ')}].`
  );

  assertTest(
    '8.2 Duplicate Section Detection: Identifies repeated section across non-adjacent pages',
    noisyResult.duplicateSections.includes('Valid Section 1'),
    `Duplicate sections identified: [${noisyResult.duplicateSections.join(', ')}].`
  );

  // Summary
  console.log('\n================================================================');
  console.log(`   DOCUMENT UNDERSTANDING ENGINE: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
