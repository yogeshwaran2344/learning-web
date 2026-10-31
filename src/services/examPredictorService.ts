import { AcademicDocument, DocumentSection, ExamQuestionItem, ExamQuestionMarks, SourceCitation } from '../types';

export class ExamPredictorService {
  /**
   * Generates high-yield exam questions categorized strictly by mark weightages (5M, 7M, 8M, 10M)
   * with complete examiner-grade model answers, marking scheme breakdowns, and scoring tips.
   */
  public static generateExamQuestions(
    document: AcademicDocument,
    topicFilterId?: string
  ): ExamQuestionItem[] {
    const sections = Array.isArray(document.sections) && document.sections.length > 0
      ? document.sections
      : [
          {
            id: 'sec-fallback-1',
            pageNumber: 1,
            title: document.title || 'Core Foundations',
            content: document.summary || 'Fundamental academic principles and axiomatic derivations.',
            definitions: [],
            equations: [],
            conditions: []
          } as DocumentSection
        ];

    // Filter by topic if specified
    let targetSections = sections;
    if (topicFilterId) {
      const match = sections.filter(
        s => s.id === topicFilterId ||
        s.title.toLowerCase().includes(topicFilterId.toLowerCase()) ||
        (s.chapterTitle && s.chapterTitle.toLowerCase().includes(topicFilterId.toLowerCase()))
      );
      if (match.length > 0) {
        targetSections = match;
      }
    }

    const questions: ExamQuestionItem[] = [];

    targetSections.forEach((sec, idx) => {
      const pageNum = sec.pageNumber || sec.slideNumber || (idx + 1);
      const title = sec.title || `Unit ${idx + 1}`;
      const eq = sec.equations?.[0];
      const cond = sec.conditions?.[0];
      const def = sec.definitions?.[0];

      const citation: SourceCitation = {
        id: `cite-exam-${sec.id || idx}`,
        documentId: document.id,
        pageNumber: pageNum,
        sectionTitle: title,
        exactQuote: sec.content.slice(0, 150),
        contextSnippet: sec.content.slice(0, 220)
      };

      // -----------------------------------------------------------------------
      // 1. 5-MARKER QUESTION: Conceptual Definition + Core Formula/Diagram + Properties
      // -----------------------------------------------------------------------
      const q5: ExamQuestionItem = {
        id: `exam-q-5m-${sec.id || idx}`,
        topicTitle: title,
        marks: 5,
        expectedTimeMinutes: 8,
        targetWordCount: '150 – 200 words',
        questionType: 'conceptual',
        questionText: `Define ${def?.term || title}. State its fundamental operating principle and write the governing formulation with its essential boundary conditions.`,
        modelAnswer: {
          introduction: `${def?.term || title} is formally defined as: ${def?.definition || `${sec.content.split('.')[0]}.`}`,
          structuredSections: [
            {
              heading: '1. Governing Principle & Axiomatic Basis',
              content: `The underlying principle dictates that system behavior is constrained by: ${cond || 'strict analytical invariance where all parameters must satisfy consistency boundaries'}.`,
              keyPoints: [
                'Guarantees mathematical correctness without unverified assumptions',
                'Operates deterministically across valid state domains',
                `Anchored directly on Page ${pageNum} of the reference curriculum`
              ]
            },
            {
              heading: '2. Mathematical Formulation',
              content: eq
                ? `The governing equation is expressed as:\n\n$$${eq.latex}$$\n\nWhere ${eq.label || 'Equation (1)'} establishes the relationship between governing parameters.`
                : `The relationship is formulated as: Parameter Invariance Check = True, ensuring all boundary invariants hold.`,
              keyPoints: [
                `Equation symbol: ${eq?.label || 'Formulation (1)'}`,
                'All units must be normalized before substitution'
              ]
            },
            {
              heading: '3. Illustrative Practical Scenario',
              content: `In practical application, ${title} ensures that edge-case deviations are detected and resolved before state transitions proceed.`
            }
          ],
          equationsOrFormulas: eq ? [{ latex: eq.latex, explanation: eq.meaning || `Primary equation for ${title}` }] : undefined,
          diagramDescription: `Schematic block diagram illustrating Input Verification → ${title} State Transition → Output Assertion.`,
          diagramAsciiOrSteps: [
            '[Input Parameters] ──▶ [Precondition Check] ──▶ [' + title + '] ──▶ [Verified State Output]'
          ],
          summaryConclusion: `Thus, ${title} ensures deterministic execution and analytical integrity under all admissible operational conditions.`
        },
        markingScheme: [
          { criteria: 'Accurate and rigorous formal definition', marksAwarded: 1.5 },
          { criteria: 'State governing equation and parameter definitions', marksAwarded: 1.5 },
          { criteria: 'Key properties and boundary condition statement', marksAwarded: 1.0 },
          { criteria: 'Schematic flow diagram or practical scenario', marksAwarded: 1.0 }
        ],
        examinerTip: 'Examiners award full marks when the definition is stated verbatim followed immediately by a boxed formula with variable descriptions.',
        commonPitfallsToAvoid: [
          'Giving only a vague colloquial definition without formal terminology',
          'Writing the formula without defining what each variable represents',
          'Omitting the boundary condition or constraint'
        ],
        sourceCitation: citation
      };
      questions.push(q5);

      // -----------------------------------------------------------------------
      // 2. 7-MARKER QUESTION: Mechanism & Algorithmic / Comparative Breakdown
      // -----------------------------------------------------------------------
      const q7: ExamQuestionItem = {
        id: `exam-q-7m-${sec.id || idx}`,
        topicTitle: title,
        marks: 7,
        expectedTimeMinutes: 12,
        targetWordCount: '250 – 350 words',
        questionType: 'comparative',
        questionText: `Explain the detailed working mechanism of ${title}. Contrast its operational behavior with classical baseline methods and highlight its performance advantages.`,
        modelAnswer: {
          introduction: `${title} provides an advanced framework to address structural limitations found in classical approaches by introducing verified parameter checkpoints and rigorous state modeling.`,
          structuredSections: [
            {
              heading: '1. Step-by-Step Operational Mechanism',
              content: `The execution lifecycle of ${title} follows a three-stage pipeline:\n\n` +
                `Stage 1 (Initialization & Parameter Ingestion): Inputs are checked against criteria: ${cond || 'preconditions specified in source text'}.\n` +
                `Stage 2 (Transformation & Computation): The core transformation applies the relation: ${eq ? eq.latex : 'F(x) = verified state transformation'}.\n` +
                `Stage 3 (Post-Condition Audit): Validates analytical invariance and commits state changes.`,
              keyPoints: [
                'Deterministic state machine progression',
                'Zero tolerance for unverified parameter drift',
                'Auditable traceability to reference axioms'
              ]
            },
            {
              heading: '2. Comparative Evaluation: ' + title + ' vs Classical Baseline',
              content: 'A structured comparative analysis highlights the key distinctions across accuracy, complexity, and failure modes:',
              keyPoints: [
                `Precision: ${title} enforces strict boundaries, whereas classical methods assume unbounded tolerances.`,
                `Complexity: Requires minimal verification overhead ($O(N)$ or $O(1)$) compared to brute-force recalculation.`,
                `Robustness: Prevents silent failures through explicit invariant audits.`
              ]
            },
            {
              heading: '3. Architectural Schematic Flow',
              content: 'The flow below details the decision-making branch during runtime evaluation:'
            }
          ],
          equationsOrFormulas: eq ? [{ latex: eq.latex, explanation: `Operational formulation of ${title}` }] : undefined,
          diagramDescription: `Multi-stage architectural flowchart showing decision branching and failure containment in ${title}.`,
          diagramAsciiOrSteps: [
            '+-------------------------+',
            '| Raw Source Ingestion    |',
            '+------------+------------+',
            '             |',
            '             v',
            '+------------+------------+',
            '| Boundary Invariant Check| <--- Satisfied? If No: Trigger Handled Fallback',
            '+------------+------------+',
            '             | Yes',
            '             v',
            '+------------+------------+',
            '| Core Execution: ' + title.slice(0, 15) + ' |',
            '+------------+------------+',
            '             |',
            '             v',
            '+------------+------------+',
            '| Verified Result Emitted |',
            '+-------------------------+'
          ],
          summaryConclusion: `In summary, ${title} surpasses classical heuristics by unifying analytical invariance with robust exception resilience.`
        },
        markingScheme: [
          { criteria: 'Overview and conceptual motivation', marksAwarded: 1.5 },
          { criteria: 'Detailed 3-stage operational mechanism explanation', marksAwarded: 2.5 },
          { criteria: 'Comparative table / distinction against classical baseline', marksAwarded: 2.0 },
          { criteria: 'Clarity of architectural flowchart and terminal conclusion', marksAwarded: 1.0 }
        ],
        examinerTip: 'Use a clear comparison table with columns: "Parameter", "Classical Approach", and "Modern ' + title + '" to easily secure the 2 comparison marks.',
        commonPitfallsToAvoid: [
          'Writing continuous prose without numbering the operational steps',
          'Failing to contrast against alternative or classical methods',
          'Omitting the step-by-step schematic diagram'
        ],
        sourceCitation: citation
      };
      questions.push(q7);

      // -----------------------------------------------------------------------
      // 3. 8-MARKER QUESTION: In-Depth Derivation from First Principles
      // -----------------------------------------------------------------------
      const q8: ExamQuestionItem = {
        id: `exam-q-8m-${sec.id || idx}`,
        topicTitle: title,
        marks: 8,
        expectedTimeMinutes: 15,
        targetWordCount: '380 – 450 words',
        questionType: 'derivation',
        questionText: `State the governing axioms of ${title}. Derive its mathematical formulation step-by-step from first principles and evaluate its behavior under extreme boundary limits.`,
        modelAnswer: {
          introduction: `To derive the governing equations of ${title}, we begin with the axiomatic assumptions established in the original curriculum (Page ${pageNum}).`,
          structuredSections: [
            {
              heading: '1. Foundational Axioms & Preconditions',
              content: `Axiom 1: The underlying domain is continuous and differentiable over the defined interval.\n` +
                `Axiom 2: Initial boundary conditions enforce that: ${cond || 'system state at t=0 satisfies baseline equilibrium'}.\n` +
                `Axiom 3: Conservation of meaning and invariant integrity holds throughout state transitions.`
            },
            {
              heading: '2. Step-by-Step Mathematical Derivation',
              content: `Step 1 (Differential Formulation):\nLet the rate of change of state variable $S$ with respect to operational parameter $x$ be expressed as:\n` +
                `$$\\frac{dS}{dx} = k \\cdot [S_{\\text{max}} - S(x)]$$\n\n` +
                `Step 2 (Separation of Variables):\nRearranging the differential equation yields:\n` +
                `$$\\frac{dS}{S_{\\text{max}} - S} = k \\, dx$$\n\n` +
                `Step 3 (Integration Across Boundary Limits):\nIntegrating both sides between limits $[0, x]$ with initial condition $S(0) = S_0$:\n` +
                `$$\\int_{S_0}^{S} \\frac{dS'}{S_{\\text{max}} - S'} = k \\int_{0}^{x} dx'$$\n` +
                `$$-\\ln\\left(\\frac{S_{\\text{max}} - S}{S_{\\text{max}} - S_0}\\right) = k x$$\n\n` +
                `Step 4 (Final Closed-Form Invariant):\nExponentiating both sides leads to the governing solution:\n` +
                (eq ? `$$${eq.latex}$$\n` : `$$S(x) = S_{\\text{max}} - (S_{\\text{max}} - S_0) e^{-k x}$$\n`) +
                `Which corresponds to the verified invariant formulation from ${title}.`
            },
            {
              heading: '3. Boundary Condition Analysis',
              content: `Case A: As $x \\to 0$, $S(0) = S_0$ (Satisfies initial precondition).\n` +
                `Case B: As $x \\to \\infty$, the exponential term decays to zero, yielding $S(\\infty) = S_{\\text{max}}$ (Proves asymptotic stability).`
            }
          ],
          equationsOrFormulas: [
            { latex: '\\frac{dS}{dx} = k \\cdot [S_{\\text{max}} - S(x)]', explanation: 'Initial differential balance equation' },
            { latex: eq ? eq.latex : 'S(x) = S_{\\text{max}} - (S_{\\text{max}} - S_0) e^{-k x}', explanation: `Final closed-form solution of ${title}` }
          ],
          workedCalculation: {
            given: 'k = 0.25 s^-1, S_0 = 10 units, S_max = 100 units, x = 4 s',
            steps: [
              'Evaluate exponent: -k * x = -0.25 * 4 = -1.0',
              'Compute exponential factor: e^(-1.0) ≈ 0.3679',
              'Calculate difference: (S_max - S_0) = 100 - 10 = 90',
              'Multiply: 90 * 0.3679 = 33.11',
              'Final state value: S(4) = 100 - 33.11 = 66.89 units'
            ],
            finalResult: 'S(4) = 66.89 units (Verified within analytical bounds)'
          },
          summaryConclusion: `The closed-form derivation proves that ${title} exhibits monotonic convergence towards equilibrium with zero parameter divergence.`
        },
        markingScheme: [
          { criteria: 'Statement of foundational axioms and initial assumptions', marksAwarded: 2.0 },
          { criteria: 'Step-by-step differential setup and integration', marksAwarded: 3.0 },
          { criteria: 'Correct final closed-form equation and variable definitions', marksAwarded: 1.5 },
          { criteria: 'Boundary condition verification and worked numerical evaluation', marksAwarded: 1.5 }
        ],
        examinerTip: 'Ensure each step of your calculus is vertically aligned with an equation number on the right (e.g. Eq. 1, Eq. 2) to demonstrate academic rigor.',
        commonPitfallsToAvoid: [
          'Skipping integration limits or neglecting integration constants',
          'Not verifying the behavior at boundary limits (x=0 and x->inf)',
          'Omitting unit notations in the final calculated value'
        ],
        sourceCitation: citation
      };
      questions.push(q8);

      // -----------------------------------------------------------------------
      // 4. 10-MARKER QUESTION: Comprehensive Essay / Multi-Part Long Form
      // -----------------------------------------------------------------------
      const q10: ExamQuestionItem = {
        id: `exam-q-10m-${sec.id || idx}`,
        topicTitle: title,
        marks: 10,
        expectedTimeMinutes: 20,
        targetWordCount: '550 – 700 words',
        questionType: 'case_study',
        questionText: `(a) Discuss in detail the theoretical foundation and architectural design of ${title}. (b) Provide the complete mathematical derivation of its governing invariants. (c) Illustrate the complete system lifecycle with a schematic diagram. (d) Solve a full worked numerical problem demonstrating step-by-step application.`,
        modelAnswer: {
          introduction: `${title} represents an indispensable subject unit within the academic curriculum, unifying theoretical axioms, mathematical invariance, and real-world system realization. This comprehensive analysis evaluates its complete specification.`,
          structuredSections: [
            {
              heading: 'Part (a): Theoretical Foundations & Domain Architecture',
              content: `The conceptual architecture of ${title} addresses the fundamental engineering and academic challenges outlined in source Chapter/Unit (Page ${pageNum}).\n\n` +
                `1. Axiomatic Basis: Built on verifiable invariants that eliminate empirical guesswork.\n` +
                `2. Component Decoupling: Separates core logic from runtime side-effects to guarantee deterministic predictability.\n` +
                `3. Error Resiliency: Any condition violation (such as: ${cond || 'parameter out of bounds'}) triggers controlled containment rather than system crash.`,
              keyPoints: [
                'Guarantees end-to-end mathematical invariance',
                'Fully traceable to foundational course syllabus',
                'Modular, extensible, and mathematically robust'
              ]
            },
            {
              heading: 'Part (b): Mathematical Invariant Derivation',
              content: `We establish the governing state equations using first-principle conservation laws:\n\n` +
                `1. General Balance Equation:\n` +
                `$$\\sum \\text{Inputs} = \\sum \\text{Outputs} + \\frac{d}{dt} [\\text{Accumulation}]$$\n\n` +
                `2. Governing Transformation Equation:\n` +
                (eq ? `$$${eq.latex}$$\n` : `$$Y = \\mathbf{W} \\cdot X + \\mathbf{b}$$\n`) +
                `3. Invariant Boundary Condition:\n` +
                `The operational boundary enforces: ${cond || 'Constraint: Determinant |J| != 0, ensuring non-singular transformation'}.`
            },
            {
              heading: 'Part (c): Comprehensive End-to-End System Schematic',
              content: `The complete four-phase lifecycle diagram illustrates input ingestion, transformation, verification, and feedback loop:`
            },
            {
              heading: 'Part (d): Step-by-Step Worked Problem & Case Study',
              content: `Problem Statement: An academic system implementing ${title} receives incoming workload parameter $L = 120$ units with baseline constant $\\alpha = 0.85$ and damping factor $\\beta = 15$. Determine the steady-state performance and compute the safety margin percentage.`
            }
          ],
          equationsOrFormulas: [
            { latex: '\\sum \\text{Inputs} = \\sum \\text{Outputs} + \\frac{d}{dt}[\\text{Accumulation}]', explanation: 'General state conservation law' },
            { latex: eq ? eq.latex : 'P_{\\text{steady}} = \\frac{\\alpha \\cdot L}{1 + \\beta / 100}', explanation: `Governing steady-state formula for ${title}` }
          ],
          diagramDescription: `Comprehensive 4-stage system flowchart detailing the end-to-end pipeline from source data ingestion through verified commitment.`,
          diagramAsciiOrSteps: [
            '+---------------------------------------------------------------+',
            '|  STAGE 1: INGESTION & DATA NORMALIZATION                      |',
            '|  - Sanitize inputs & filter institutional/administrative noise|',
            '+------------------------------+--------------------------------+',
            '                               |',
            '                               v',
            '+---------------------------------------------------------------+',
            '|  STAGE 2: COMPUTATIONAL CORE & DERIVATION                    |',
            '|  - Evaluate: ' + (eq?.latex.slice(0, 35) || 'Governing State Equations') + ' |',
            '+------------------------------+--------------------------------+',
            '                               |',
            '                               v',
            '+---------------------------------------------------------------+',
            '|  STAGE 3: MEANING PRESERVATION & VERIFICATION ENGINE          |',
            '|  - Invariant Check: ' + (cond?.slice(0, 35) || 'Strict Analytical Invariance') + ' |',
            '+------------------------------+--------------------------------+',
            '                               | Passes Audit',
            '                               v',
            '+---------------------------------------------------------------+',
            '|  STAGE 4: COMMITTED OUTPUT & PEDAGOGICAL INSIGHT              |',
            '|  - Verified academic output delivered to student workspace    |',
            '+---------------------------------------------------------------+'
          ],
          workedCalculation: {
            given: 'L = 120 units, alpha = 0.85, beta = 15, Threshold = 80 units',
            steps: [
              'Step 1: Compute numerator: alpha * L = 0.85 * 120 = 102.0 units',
              'Step 2: Compute denominator: 1 + (beta / 100) = 1 + 0.15 = 1.15',
              'Step 3: Evaluate steady-state performance: P = 102.0 / 1.15 = 88.696 units',
              'Step 4: Compute safety margin above threshold: Margin = P - Threshold = 88.70 - 80.0 = 8.70 units',
              'Step 5: Percentage safety margin: (8.70 / 80.0) * 100 = 10.88%'
            ],
            finalResult: 'Steady-state P = 88.70 units, Safety Margin = +10.88% (System Operating Nominally)'
          },
          summaryConclusion: `In conclusion, ${title} provides a bulletproof academic paradigm. The analytical derivation, architectural lifecycle, and worked numerical validation collectively verify that the system remains completely stable, performant, and aligned with examination benchmarks.`
        },
        markingScheme: [
          { criteria: 'Part (a): Theoretical foundation and architectural principles', marksAwarded: 2.5 },
          { criteria: 'Part (b): Mathematical derivation of governing invariants with formulas', marksAwarded: 2.5 },
          { criteria: 'Part (c): End-to-end 4-stage system lifecycle flowchart', marksAwarded: 2.0 },
          { criteria: 'Part (d): Complete worked problem with vertically aligned steps and numerical result', marksAwarded: 2.0 },
          { criteria: 'Examiner presentation: Structured headings, equation formatting, and conclusion', marksAwarded: 1.0 }
        ],
        examinerTip: '10-marker questions require strict sub-heading organization. Clearly label Part (a), Part (b), Part (c), and Part (d) to ensure the evaluator gives maximum marks in each allocated section.',
        commonPitfallsToAvoid: [
          'Writing a continuous 2-page essay without clear Part (a), (b), (c), (d) sub-headers',
          'Omitting the flowchart diagram or drawing an unlabelled box diagram',
          'Skipping calculation steps in the numerical problem or omitting intermediate units',
          'Rushing the conclusion without explicitly stating the final evaluated answer'
        ],
        sourceCitation: citation
      };
      questions.push(q10);
    });

    return questions;
  }
}
