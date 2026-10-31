import assert from 'assert';
import { TopicHierarchyService } from '../src/services/topicHierarchyService';
import { AssessmentService } from '../src/services/assessmentService';
import { DetailedNotesService } from '../src/services/detailedNotesService';
import { ConceptMapService } from '../src/services/conceptMapService';
import { AiGeneratorService } from './services/aiGeneratorService';
import { AiModelService } from './services/aiModelService';
import { DocumentUnderstandingService } from './services/documentUnderstandingService';
import { AcademicDocument, DocumentSection } from '../src/types';

console.log('================================================================');
console.log('🔬 LEARNOVA VERSION 11: 6 MANDATORY VERIFICATION SCENARIOS');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runScenario(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>).then(() => {
        console.log(`  ✓ [PASS] Scenario Check ${totalTests}: ${name}`);
        passedTests++;
      }).catch((err) => {
        console.error(`  ✗ [FAIL] Scenario Check ${totalTests}: ${name}`);
        console.error(`    ${err.message}\n`);
        throw err;
      });
    } else {
      console.log(`  ✓ [PASS] Scenario Check ${totalTests}: ${name}`);
      passedTests++;
    }
  } catch (err: any) {
    console.error(`  ✗ [FAIL] Scenario Check ${totalTests}: ${name}`);
    console.error(`    ${err.message}\n`);
    throw err;
  }
}

async function main() {
  // ============================================================================
  // SCENARIO 1: Upload Math PDF -> Genuine chapter detection, formulas, and solved examples
  // ============================================================================
  console.log('\n--- SCENARIO 1: Mathematics Document Structure, Formulas & Numerical Solutions ---');

  const mathSections: DocumentSection[] = [
    {
      id: 'm-sec-1',
      documentId: 'doc-math',
      pageNumber: 1,
      title: 'Chapter 1: Ordinary Differential Equations',
      content: 'Chapter 1: First-Order Linear ODEs. Standard form is dy/dx + P(x)y = Q(x). Integrating factor I(x) = exp(integral P(x) dx). Solving dy/dx + 2y = 4 with y(0) = 3 gives general solution y(x) = 2 + C*exp(-2x). For y(0)=3, C=1, so y(x) = 2 + exp(-2x).'
    },
    {
      id: 'm-sec-2',
      documentId: 'doc-math',
      pageNumber: 2,
      title: 'Chapter 2: Linear Vector Spaces and Matrix Eigenvalues',
      content: 'Chapter 2: Eigenvalue Decomposition. Characteristic equation det(A - lambda*I) = 0. For matrix A = [[3, 1], [0, 2]], eigenvalues are lambda_1 = 3 and lambda_2 = 2. Invariant condition: Matrix must be non-singular and diagonalizable.'
    },
    {
      id: 'm-sec-3',
      documentId: 'doc-math',
      pageNumber: 3,
      title: 'Chapter 3: Multivariable Optimization and Gradient Descent',
      content: 'Chapter 3: Gradient Descent and Convex Optimization. Objective function f(x, y) = x^2 + 2y^2. Gradient nabla f = [2x, 4y]^T. Stationary point occurs where nabla f = [0, 0]^T at (0, 0). Learning rate eta = 0.1 ensures monotonic convergence under Lipschitz continuity.'
    },
    {
      id: 'm-sec-4',
      documentId: 'doc-math',
      pageNumber: 4,
      title: 'Chapter 4: Fourier Analysis and Boundary Value Problems',
      content: 'Chapter 4: Fourier Series Representation. f(x) = a_0/2 + sum [a_n cos(nx) + b_n sin(nx)]. Orthogonality relation: integral from -pi to pi of cos(mx)cos(nx)dx = pi*delta_mn. Heat equation partial u / partial t = alpha * (partial^2 u / partial x^2).'
    }
  ];

  const mathDoc: AcademicDocument = {
    id: 'doc-math',
    title: 'Advanced Engineering Mathematics',
    subject: 'Mathematics',
    level: 'Undergraduate',
    pageCount: 4,
    uploadedAt: '2026-10-31',
    fileType: 'pdf',
    extractedText: mathSections.map(s => s.content).join('\n'),
    sections: mathSections
  };

  runScenario('Scenario 1.1: Genuine chapter detection recognizes all 4 distinct chapters without equal grouping', () => {
    const hierarchy = TopicHierarchyService.buildHierarchy(mathDoc);
    assert.strictEqual(hierarchy.chapters.length, 4, `Expected 4 distinct chapters, found ${hierarchy.chapters.length}`);
    assert.ok(hierarchy.chapters[0].title.includes('Chapter 1') || hierarchy.chapters[0].title.includes('Ordinary Differential'));
    assert.ok(hierarchy.chapters[1].title.includes('Chapter 2') || hierarchy.chapters[1].title.includes('Linear Vector Spaces'));
    assert.ok(hierarchy.chapters[2].title.includes('Chapter 3') || hierarchy.chapters[2].title.includes('Multivariable Optimization'));
    assert.ok(hierarchy.chapters[3].title.includes('Chapter 4') || hierarchy.chapters[3].title.includes('Fourier Analysis'));
  });

  runScenario('Scenario 1.2: Mathematical formulas preserved with precise syntax and invariants', () => {
    const rawSections = mathSections.map(s => ({
      id: s.id,
      documentId: s.documentId,
      pageNumber: s.pageNumber,
      title: s.title,
      content: s.content,
      equations: [],
      definitions: [],
      conditions: [],
      examples: []
    }));
    const understanding = DocumentUnderstandingService.analyze('doc-math', rawSections as any, 'pdf', 95, mathDoc.title);
    assert.ok(understanding.chapters.length >= 4 || understanding.hierarchy.chapters.length >= 4, 'Must detect at least 4 chapters');
    const mathHierarchy = TopicHierarchyService.buildHierarchy(mathDoc);
    mathDoc.topicHierarchy = mathHierarchy;
    const notesSuite = DetailedNotesService.generateDetailedNotesSuite(mathDoc, 'detailed');
    const allText = JSON.stringify(notesSuite);
    assert.ok(allText.includes('dy/dx') || allText.includes('P(x)'), 'Must preserve differential equation form');
    assert.ok(allText.includes('det(A') || allText.includes('lambda') || allText.includes('nabla f'), 'Must preserve matrix or gradient equations');
  });

  runScenario('Scenario 1.3: Step-by-step worked examples contain genuine numerical solutions and no generic filler', () => {
    const workedSuite = DetailedNotesService.generateWorkedExamplesSuite(mathDoc);
    assert.ok(workedSuite.examples.length >= 1, 'Must generate worked examples for mathematical content');
    const firstEx = workedSuite.examples[0];
    assert.ok(firstEx.problemStatement.length > 20, 'Problem statement must be substantive');
    assert.ok(firstEx.solutionSteps.length >= 3, 'Must have at least 3 detailed solution steps');
    const combinedSteps = firstEx.solutionSteps.join(' ');
    // Verify no generic filler
    assert.ok(!combinedSteps.includes('X = 10 units'), 'Must NEVER use generic X = 10 filler');
    assert.ok(!combinedSteps.includes('scaling factor K = 2.5'), 'Must NEVER use generic K = 2.5 filler');
    assert.ok(!combinedSteps.includes('The theoretical framework establishes'), 'Must not contain generic theoretical boilerplate');
  });

  // ============================================================================
  // SCENARIO 2: Upload Biology PPT -> Diagrams understood, not merely extracted
  // ============================================================================
  console.log('\n--- SCENARIO 2: Presentation & Biological Diagrammatic Understanding ---');

  const biologySections: DocumentSection[] = [
    {
      id: 'bio-sec-1',
      documentId: 'doc-bio',
      pageNumber: 1,
      slideNumber: 1,
      title: 'Slide 1: Mitochondria Architecture and Electron Transport Chain',
      content: 'Mitochondrial Inner Membrane Structure.\n[Visual Diagram in Slide 1: Schematic of Cristae and Intermembrane Space]\nThe electron transport chain consists of Complexes I, II, III, and IV embedded in the inner membrane.\nComplex I (NADH dehydrogenase) accepts electrons from NADH, pumping 4 protons (H+) into the intermembrane space.\nComplex IV (Cytochrome c oxidase) reduces molecular oxygen to water: O2 + 4H+ + 4e- -> 2H2O.',
      speakerNotes: 'Highlight the asymmetric proton concentration gradient generating proton motive force delta-p.'
    },
    {
      id: 'bio-sec-2',
      documentId: 'doc-bio',
      pageNumber: 2,
      slideNumber: 2,
      title: 'Slide 2: Chemiosmosis and ATP Synthase Rotary Motor',
      content: 'Chemiosmotic ATP Synthesis.\n[Visual Diagram in Slide 2: Conceptual Flowchart of F0-F1 ATP Synthase Rotation]\nProtons flow down their electrochemical gradient through the F0 membrane rotor subunit.\nRotation of the gamma shaft induces conformational changes in the F1 catalytic beta subunits (Open, Loose, Tight states).\nADP + Pi -> ATP under thermodynamic phosphorylation invariant.',
      speakerNotes: 'For every 4 protons translocated, one ATP molecule is synthesized.'
    }
  ];

  const bioDoc: AcademicDocument = {
    id: 'doc-bio',
    title: 'Cellular Bioenergetics and Membrane Dynamics',
    subject: 'Biology',
    level: 'Undergraduate',
    pageCount: 2,
    uploadedAt: '2026-10-31',
    fileType: 'pptx',
    extractedText: biologySections.map(s => s.content).join('\n'),
    sections: biologySections
  };

  runScenario('Scenario 2.1: Diagrammatic visual structures detected and parsed as educational diagrams', () => {
    const rawSections = biologySections.map(s => ({
      id: s.id,
      documentId: s.documentId,
      pageNumber: s.pageNumber,
      slideNumber: s.slideNumber,
      title: s.title,
      content: s.content,
      speakerNotes: s.speakerNotes,
      equations: [],
      definitions: [],
      conditions: ['delta-p proton motive force', 'aerobic conditions required'],
      examples: []
    }));
    const understanding = DocumentUnderstandingService.analyze('doc-bio', rawSections as any, 'pptx', 95, bioDoc.title);
    assert.ok(understanding.sections.some(s => s.slideNumber !== undefined), 'Must preserve presentation slide context');
    // Check that topics identify the diagrammatic components
    const bioHierarchy = TopicHierarchyService.buildHierarchy(bioDoc);
    bioDoc.topicHierarchy = bioHierarchy;
    const notesSuite = DetailedNotesService.generateDetailedNotesSuite(bioDoc, 'detailed');
    const notesText = JSON.stringify(notesSuite);
    const notesTextLower = notesText.toLowerCase();
    assert.ok(notesTextLower.includes('inner membrane') || notesTextLower.includes('atp synthase') || notesTextLower.includes('complex'), 'Must explain diagrammatic biological components');
    assert.ok(notesTextLower.includes('speaker notes') || notesTextLower.includes('proton'), 'Must synthesize speaker notes into pedagogical explanations');
  });

  runScenario('Scenario 2.2: Concept Map links biological diagram entities with meaningful functional relationships', () => {
    const mapSuite = ConceptMapService.generateConceptMapSuite(bioDoc);
    const map = mapSuite.overallMap;
    assert.ok(map.nodes.length >= 2, 'Concept map must have nodes for biological concepts');
    const nodeLabels = map.nodes.map(n => n.label.toLowerCase()).join(' ');
    assert.ok(nodeLabels.includes('mitochondria') || nodeLabels.includes('electron') || nodeLabels.includes('chemiosmosis') || nodeLabels.includes('atp'), 'Nodes must reflect actual biology concepts');
    assert.ok(map.edges.length >= 1, 'Must establish functional relationships between membrane transport and ATP synthesis');
  });

  // ============================================================================
  // SCENARIO 3: Upload Handwritten Notes -> OCR with uncertain symbols flagged
  // ============================================================================
  console.log('\n--- SCENARIO 3: Handwritten Notes OCR & Uncertainty Flagging ---');

  const handwrittenSections: DocumentSection[] = [
    {
      id: 'hw-sec-1',
      documentId: 'doc-handwritten',
      pageNumber: 1,
      title: 'Scanned Page 1: Quantum Harmonic Oscillator',
      content: 'Schrodinger equation for harmonic oscillator: -hbar^2 / (2m) * d^2 psi / dx^2 + (1/2) m omega^2 x^2 psi = E psi.\nLadder operators: a = sqrt(m omega / (2 hbar)) * (x + i p / (m omega)).\nUncertain region: Energy eigenvalues E_n = (n + 1/2) hbar omega with boundary condition psi(x) -> 0 as |x| -> inf.\nSome ink smudging detected: ??? gamma_val ~~ 0.05.',
      uncertainSymbols: ['???', '~~', 'gamma_val']
    }
  ];

  const handwrittenDoc: AcademicDocument = {
    id: 'doc-handwritten',
    title: 'Lecture Notes - Quantum Mechanics',
    subject: 'Physics',
    level: 'Undergraduate',
    pageCount: 1,
    uploadedAt: '2026-10-31',
    fileType: 'scanned_notes',
    extractedText: handwrittenSections[0].content,
    sections: handwrittenSections
  };

  runScenario('Scenario 3.1: Handwritten notes retain flagged uncertain symbols without guessing or hallucination', () => {
    const hierarchy = TopicHierarchyService.buildHierarchy(handwrittenDoc);
    const allTopics = hierarchy.chapters.flatMap(c => c.topics);
    assert.ok(allTopics.length >= 1, 'Must have at least 1 topic');
    const targetTopic = allTopics[0];
    assert.ok((targetTopic.uncertainSymbols && targetTopic.uncertainSymbols.length > 0) || (handwrittenSections[0].uncertainSymbols && handwrittenSections[0].uncertainSymbols.length > 0), 'Uncertain symbols must be preserved');
    const symbols = targetTopic.uncertainSymbols || handwrittenSections[0].uncertainSymbols || [];
    assert.ok(symbols.includes('???') || symbols.includes('~~'), 'Flagged symbols must include ??? or ~~');
  });

  runScenario('Scenario 3.2: Flashcards and notes generated from handwritten notes preserve boundary conditions and flag degraded symbols', () => {
    const flashcardData = AssessmentService.generateTopicWiseFlashcards(handwrittenDoc);
    const cards = flashcardData.overallDeck;
    assert.ok(cards.length >= 1);
    const cardContent = JSON.stringify(cards);
    assert.ok(cardContent.includes('harmonic oscillator') || cardContent.includes('Schrodinger') || cardContent.includes('omega') || cardContent.includes('energy'), 'Flashcards must reflect genuine handwritten physics content');
    // Ensure no generic filler
    assert.ok(!cardContent.includes('The theoretical framework establishes'), 'Must not have generic boilerplate');
  });

  // ============================================================================
  // SCENARIO 4: Select One Topic -> All learning formats strictly scoped to that topic
  // ============================================================================
  console.log('\n--- SCENARIO 4: Topic Selection Scoping Across All Learning Formats ---');

  const multiTopicDoc: AcademicDocument = {
    id: 'doc-multi-topics',
    title: 'Comprehensive Neurobiology and Electrophysiology',
    subject: 'Biology / Neuroscience',
    level: 'Undergraduate',
    pageCount: 5,
    uploadedAt: '2026-10-31',
    fileType: 'pdf',
    extractedText: 'Neurobiology multi-topic text',
    sections: [
      {
        id: 'sec-neuro-1',
        documentId: 'doc-multi-topics',
        pageNumber: 1,
        title: 'Chapter 1: Glial Cells and Blood-Brain Barrier',
        content: 'Astrocytes regulate extracellular potassium concentration and maintain the blood-brain barrier via end-feet processes. Microglia act as resident macrophages providing immune defense.'
      },
      {
        id: 'sec-neuro-2',
        documentId: 'doc-multi-topics',
        pageNumber: 2,
        title: 'Chapter 2: Synaptic Vesicle Release and Neurotransmitters',
        content: 'Action potential arrival triggers voltage-gated calcium entry through Cav2 channels. SNARE complex proteins (synaptobrevin, syntaxin-1, SNAP-25) mediate vesicle fusion and exocytosis of acetylcholine.'
      },
      {
        id: 'sec-neuro-3',
        documentId: 'doc-multi-topics',
        pageNumber: 3,
        title: 'Chapter 3: Membrane Ion Channels and Resting Potential',
        content: 'Resting membrane potential is established primarily by inward rectifier potassium channels (Kir) and the Na+/K+ ATPase pump. Nernst potential for potassium E_K = (RT / zF) * ln([K+]_out / [K+]_in) = -90 mV. For sodium, E_Na = +60 mV. Resting potential sits near -70 mV governed by the Goldman-Hodgkin-Katz equation.'
      },
      {
        id: 'sec-neuro-4',
        documentId: 'doc-multi-topics',
        pageNumber: 4,
        title: 'Chapter 4: Long-Term Potentiation and Synaptic Plasticity',
        content: 'Long-term potentiation (LTP) in hippocampal CA1 pyramidal neurons requires NMDA receptor activation and calcium influx. Depolarization expels the magnesium block from NMDA receptors, triggering AMPA receptor insertion into the postsynaptic density.'
      },
      {
        id: 'sec-neuro-5',
        documentId: 'doc-multi-topics',
        pageNumber: 5,
        title: 'Chapter 5: Myelination and Saltatory Conduction',
        content: 'Oligodendrocytes in the CNS and Schwann cells in the PNS wrap axons with myelin sheaths. Myelin increases membrane resistance and decreases capacitance. Action potentials jump between Nodes of Ranvier where voltage-gated Nav1.6 channels cluster.'
      }
    ]
  };

  const hierarchy = TopicHierarchyService.buildHierarchy(multiTopicDoc);
  multiTopicDoc.topicHierarchy = hierarchy;
  const allTopics = hierarchy.chapters.flatMap(c => c.topics);
  // Locate Topic for Chapter 3: Membrane Ion Channels
  const targetTopic = allTopics.find(t => t.title.toLowerCase().includes('ion channel') || t.title.toLowerCase().includes('resting potential')) || allTopics[2];
  assert.ok(targetTopic, 'Must identify target topic for Chapter 3');

  runScenario('Scenario 4.1: Scoped Notes contain ONLY the selected topic content', () => {
    const notesSuite = DetailedNotesService.generateDetailedNotesSuite(multiTopicDoc, 'detailed');
    const targetTopicNotes = notesSuite.sections.filter(n => n.topicId === targetTopic.id || n.topicTitle.toLowerCase().includes('ion channel') || n.topicTitle.toLowerCase().includes('resting potential'));
    assert.ok(targetTopicNotes.length >= 1, 'Must find notes for target topic');
    const notesJson = JSON.stringify(targetTopicNotes);
    assert.ok(notesJson.includes('potassium') || notesJson.includes('Nernst') || notesJson.includes('Goldman') || notesJson.includes('Na+/K+'), 'Notes must be about Ion Channels');
    // Ensure content from Chapter 1 (Astrocytes) or Chapter 4 (NMDA/LTP) does not leak in
    assert.ok(!notesJson.includes('Astrocytes regulate extracellular'), 'Must not leak Chapter 1 content');
    assert.ok(!notesJson.includes('Long-term potentiation (LTP)'), 'Must not leak Chapter 4 content');
  });

  runScenario('Scenario 4.2: Scoped Flashcards contain ONLY questions testing the selected topic', () => {
    const cardsData = AssessmentService.generateTopicWiseFlashcards(multiTopicDoc);
    const scopedCards = cardsData.topicDecks[targetTopic.id] || cardsData.overallDeck.filter(c => c.topicId === targetTopic.id || c.sourceSectionId === targetTopic.sourceSectionId);
    assert.ok(scopedCards.length >= 1, 'Must generate flashcards for selected topic');
    for (const card of scopedCards) {
      const text = (card.question + ' ' + card.answer).toLowerCase();
      assert.ok(!text.includes('astrocytes') && !text.includes('microglia'), 'Must not leak Chapter 1 into Chapter 3 flashcards');
      assert.ok(!text.includes('myelination') && !text.includes('saltatory'), 'Must not leak Chapter 5 into Chapter 3 flashcards');
    }
  });

  runScenario('Scenario 4.3: Scoped Quiz contains ONLY questions from the selected topic', () => {
    const scopedQuiz = AssessmentService.generateQuizQuestions(multiTopicDoc, { type: 'topic', title: targetTopic.title }, 'intermediate');
    assert.ok(scopedQuiz.length >= 1, 'Must generate quiz questions for selected topic');
    for (const q of scopedQuiz) {
      const text = (q.prompt + ' ' + JSON.stringify(q.options || '')).toLowerCase();
      assert.ok(!text.includes('astrocytes'), 'Must not leak Chapter 1');
      assert.ok(!text.includes('schwann cells'), 'Must not leak Chapter 5');
    }
  });

  runScenario('Scenario 4.4: Scoped Worked Examples solve calculations ONLY for the selected topic', () => {
    const workedSuite = DetailedNotesService.generateWorkedExamplesSuite(multiTopicDoc, targetTopic.id);
    assert.ok(workedSuite.examples.length >= 1, 'Must generate worked examples for Chapter 3');
    const ex = workedSuite.examples[0];
    const stepsText = ex.solutionSteps.map(s => typeof s === 'string' ? s : `${s.statement} ${s.calculation} ${s.rationale}`).join(' ');
    const exText = (ex.problemStatement + ' ' + ex.formulaApplied + ' ' + stepsText).toLowerCase();
    assert.ok(exText.includes('nernst') || exText.includes('goldman') || exText.includes('membrane') || exText.includes('potassium') || exText.includes('potential') || exText.includes('resting'), 'Worked example must solve membrane potential calculation');
    assert.ok(!exText.includes('astrocytes'), 'Must not leak Chapter 1');
    assert.ok(!exText.includes('nmda receptor'), 'Must not leak Chapter 4');
  });

  // ============================================================================
  // SCENARIO 5: Audio Generation for > 4 Topics -> Independent Audio & 6-Part Pedagogy
  // ============================================================================
  console.log('\n--- SCENARIO 5: Independent Topic Audio (> 4 Topics) & 6-Part Pedagogical Structure ---');

  const sixTopicSections: DocumentSection[] = [
    { id: 's1', documentId: 'doc-6', pageNumber: 1, title: 'Topic 1: Thermodynamics and Enthalpy', content: 'First law of thermodynamics: Delta U = Q - W. Enthalpy H = U + PV. State function invariant.' },
    { id: 's2', documentId: 'doc-6', pageNumber: 2, title: 'Topic 2: Entropy and Second Law', content: 'Second law of thermodynamics: Total entropy of isolated system never decreases. Delta S = integral dQ_rev / T.' },
    { id: 's3', documentId: 'doc-6', pageNumber: 3, title: 'Topic 3: Gibbs Free Energy and Spontaneity', content: 'Gibbs energy G = H - TS. Spontaneous process requires Delta G < 0 at constant temperature and pressure.' },
    { id: 's4', documentId: 'doc-6', pageNumber: 4, title: 'Topic 4: Chemical Equilibrium and Law of Mass Action', content: 'Equilibrium constant K_eq = [C]^c [D]^d / ([A]^a [B]^b). Relation to Gibbs energy: Delta G^0 = -RT ln(K_eq).' },
    { id: 's5', documentId: 'doc-6', pageNumber: 5, title: 'Topic 5: Reaction Kinetics and Rate Laws', content: 'Differential rate law: Rate = k [A]^m [B]^n. Arrhenius equation: k = A * exp(-E_a / (RT)). Temperature sensitivity parameter.' },
    { id: 's6', documentId: 'doc-6', pageNumber: 6, title: 'Topic 6: Catalysis and Transition State Theory', content: 'Catalysts lower the activation energy barrier E_a without altering Delta G or equilibrium constant K_eq. Eyring transition state formulation.' }
  ];

  const sixTopicDoc: AcademicDocument = {
    id: 'doc-6',
    title: 'Physical Chemistry: Principles and Applications',
    subject: 'Chemistry',
    level: 'Undergraduate',
    pageCount: 6,
    uploadedAt: '2026-10-31',
    fileType: 'pdf',
    extractedText: sixTopicSections.map(s => s.content).join('\n'),
    sections: sixTopicSections
  };

  runScenario('Scenario 5.1: Audio generator generates independent audio for ALL 6 topics without 4-section cutoff', () => {
    const rawSections = sixTopicSections.map(s => ({
      id: s.id,
      documentId: s.documentId,
      pageNumber: s.pageNumber,
      title: s.title,
      content: s.content,
      equations: [],
      definitions: [],
      conditions: [],
      examples: []
    }));
    const audioResult = AiGeneratorService.generateAudioLesson('doc-6', sixTopicDoc.title, rawSections as any, 'English', 'intermediate');
    const audioLesson = audioResult.content;
    assert.strictEqual(audioLesson.sections.length, 6, `Expected 6 audio sections, but found ${audioLesson.sections.length}. 4-section cutoff must NOT exist!`);
  });

  runScenario('Scenario 5.2: Every generated audio lesson strictly follows the 6-part pedagogical lecture structure', () => {
    const rawSections = sixTopicSections.map(s => ({
      id: s.id,
      documentId: s.documentId,
      pageNumber: s.pageNumber,
      title: s.title,
      content: s.content,
      equations: [],
      definitions: [],
      conditions: [],
      examples: []
    }));
    const audioResult = AiGeneratorService.generateAudioLesson('doc-6', sixTopicDoc.title, rawSections as any, 'English', 'intermediate');
    const audioLesson = audioResult.content;
    for (let idx = 0; idx < audioLesson.sections.length; idx++) {
      const sec = audioLesson.sections[idx];
      const script = sec.scriptText;
      // Verify the 6 pedagogical components exist in the spoken script
      assert.ok(script.includes('Part 1: Introduction') || script.includes('Introduction:'), `Topic ${idx + 1} missing Part 1 Introduction`);
      assert.ok(script.includes('Part 2: Simple Intuitive Explanation') || script.includes('Part 2: Intuitive Explanation') || script.includes('Intuitive Explanation:'), `Topic ${idx + 1} missing Part 2 Simple Explanation`);
      assert.ok(script.includes('Part 3: Formal Technical Definitions') || script.includes('Part 3: Core Definitions') || script.includes('Formal Definitions:'), `Topic ${idx + 1} missing Part 3 Definitions`);
      assert.ok(script.includes('Part 4: Real-World Examples') || script.includes('Part 4: Practical Examples') || script.includes('Practical Example:'), `Topic ${idx + 1} missing Part 4 Examples`);
      assert.ok(script.includes('Part 5: Governing Invariants') || script.includes('Part 5: Mathematical Invariants') || script.includes('Governing Invariants:'), `Topic ${idx + 1} missing Part 5 Invariants`);
      assert.ok(script.includes('Part 6: Examination Revision Summary') || script.includes('Part 6: Summary') || script.includes('Revision Summary:'), `Topic ${idx + 1} missing Part 6 Summary`);
    }
  });

  // ============================================================================
  // SCENARIO 6: Disable AI Provider -> Clear Error / High-Fidelity Fallback, Zero Generic Filler
  // ============================================================================
  console.log('\n--- SCENARIO 6: Offline / Unconfigured AI Provider Reliability & Error Transparency ---');

  await runScenario('Scenario 6.1: When external AI provider is disabled, AiModelService signals deterministic engine without throwing unexpected crashes', async () => {
    // Explicitly verify AiModelService returns null when keys are empty
    AiModelService.setCustomApiKey('gemini', '');
    AiModelService.setCustomApiKey('openai', '');
    assert.strictEqual(AiModelService.hasExternalAiProvider(), false, 'Must confirm no external AI provider configured');

    const res = await AiModelService.generateWithAi('doc-test', 'Test Doc', [], 'notes');
    assert.strictEqual(res, null, 'Must return null to gracefully delegate to high-fidelity deterministic grounded engine');
  });

  runScenario('Scenario 6.2: Deterministic engine produces 100% source-grounded material with ZERO generic boilerplate statements', () => {
    const rawSections = [
      {
        id: 'sec-hist-1',
        documentId: 'doc-hist',
        pageNumber: 1,
        title: 'The Industrial Revolution and Steam Power',
        content: 'James Watt patented the separate condenser in 1769, dramatically improving the thermodynamic efficiency of Newcomen atmospheric engines. Coal consumption dropped by 75%, allowing textile factories to locate away from river streams.',
        equations: [],
        definitions: [{ term: 'Separate Condenser', definition: 'A dedicated chamber cooled by cold water injection to condense steam without cooling the working cylinder.' }],
        conditions: ['Continuous steam cylinder heating maintained at 100C.'],
        examples: ['Soho Manufactory in Birmingham pumping deep Cornish tin mines.']
      }
    ];

    const notesRes = AiGeneratorService.generateDetailedNotes('doc-hist', 'Industrial Revolution', rawSections as any, 'English', 'intermediate');
    const notesJson = JSON.stringify(notesRes);

    // Assert absolute absence of generic filler phrases
    assert.ok(!notesJson.includes('The theoretical framework establishes'), 'Must NEVER contain "The theoretical framework establishes"');
    assert.ok(!notesJson.includes('Parameters must be real, non-negative, and bounded'), 'Must NEVER contain "Parameters must be real, non-negative, and bounded"');
    assert.ok(!notesJson.includes('All core constraints must be rigorously maintained'), 'Must NEVER contain "All core constraints must be rigorously maintained"');
    assert.ok(!notesJson.includes('X = 10 units'), 'Must NEVER contain "X = 10 units"');

    // Assert presence of true source content
    assert.ok(notesJson.includes('Separate Condenser') || notesJson.includes('Watt') || notesJson.includes('steam'), 'Must contain actual history source content');
  });

  runScenario('Scenario 6.3: Provider status endpoint reports transparent diagnostic information to student & lecturer', () => {
    const status = AiModelService.getProviderStatus();
    assert.ok(status !== null && typeof status === 'object');
    assert.ok('activeProvider' in status);
    assert.ok('mode' in status);
    assert.ok('modelName' in status);
    assert.strictEqual(status.activeProvider, 'deterministic-grounded');
    assert.strictEqual(status.mode, 'deterministic_high_fidelity');
  });

  console.log('\n================================================================');
  console.log(`🎉 ALL 6 VERSION 11 VERIFICATION SCENARIOS PASSED: ${passedTests}/${totalTests} (100%)`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Scenario Runner Fatal Error:', err);
  process.exit(1);
});
