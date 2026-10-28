import { ExtractionService } from './extractionService';
import { ExtractionQualityReport } from '../db/schema';

export interface ExtractionBenchmarkItem {
  id: string;
  category: string;
  title: string;
  fileType: 'pdf' | 'pptx' | 'scanned_notes';
  description: string;
  expectedHeadingsCount: number;
  expectedEquationsCount: number;
  expectedTablesCount: number;
  qualityReport: ExtractionQualityReport;
  extractedSectionsCount: number;
  manualCheckPassed: boolean;
}

export class ExtractionTestSuite {
  /**
   * Evaluates the 6 representative test document categories specified in Section 4.5
   */
  static runBenchmark(): ExtractionBenchmarkItem[] {
    const testCases = [
      {
        id: 'test-doc-1-pdf-math',
        category: 'Text-based PDF with Headings & Equations',
        title: 'Attention Is All You Need (Scaled Dot-Product)',
        fileType: 'pdf' as const,
        description: 'Standard academic two-column PDF with equations and hierarchical numbering.',
        raw: `1. Introduction
Recurrent sequence models factor computation along positions.
Attention mechanisms allow modeling of dependencies without regard to distance.

3.2.1 Scaled Dot-Product Attention
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
Condition: Scaling factor 1/sqrt(d_k) prevents vanishing gradients in softmax when d_k is large.`,
        expectedHeadings: 2,
        expectedEquations: 1,
        expectedTables: 0
      },
      {
        id: 'test-doc-2-pptx-slides',
        category: 'PowerPoint with Text, Tables, and Diagrams',
        title: 'Lecture 12: Distributed Consensus & Raft Slides',
        fileType: 'pptx' as const,
        description: 'Presentation deck with slide numbers, bullet lists, and diagram text box.',
        raw: `Slide 1: Raft Consensus Foundations
* Problem: Maintaining replicated logs across untrusted network nodes.
* Primary metric: Understandability over Paxos complexity.
Speaker Notes: Emphasize that Raft elects at most one leader per numbered term.

Slide 2: Raft Role States Matrix
| Role | Action | Replicate Log |
| Leader | Handle client queries | Yes |
| Follower | Passive responder | No |
| Candidate | Request votes | No |

Slide 3: Quorum Architecture Diagram
[Diagram: 5-Node cluster showing overlapping majority quorum overlap of 3 nodes].`,
        expectedHeadings: 3,
        expectedEquations: 0,
        expectedTables: 1
      },
      {
        id: 'test-doc-3-clean-scan',
        category: 'Clean Scanned Notes Page',
        title: 'Multivariable Calculus: Line Integrals (Clean Scan)',
        fileType: 'scanned_notes' as const,
        description: 'Clean scanned notes with high contrast print and legible handwriting.',
        raw: `Page 1: Green Theorem in the Plane
Let C be a simple, piecewise smooth closed curve.
Line integral formula:
∮_C (P dx + Q dy) = ∬_D (∂Q/∂x - ∂P/∂y) dA
Condition: Region D must be bounded and orientation counter-clockwise.`,
        expectedHeadings: 1,
        expectedEquations: 1,
        expectedTables: 0
      },
      {
        id: 'test-doc-4-blurry-scan',
        category: 'Blurry Scanned Page with Low Contrast',
        title: 'Navier-Stokes Equations (Blurry Scan Warning)',
        fileType: 'scanned_notes' as const,
        description: 'Low-resolution page with faint pencil ink and boundary smudge.',
        raw: `Page 1: Viscous Fluid Flow
[Low contrast: Optical contrast 38%].
Equation: rho * (du/dt + u grad u) = -grad p + mu del^2 u
[Smudge detected near boundary shear stress formulation on page 1].`,
        expectedHeadings: 1,
        expectedEquations: 1,
        expectedTables: 0
      },
      {
        id: 'test-doc-5-handwritten-math',
        category: 'Page Containing Handwritten Equations',
        title: 'Schrödinger Wave Derivation (Handwritten Symbols)',
        fileType: 'scanned_notes' as const,
        description: 'Contains complex Greek mathematical symbols (hbar, Psi, del^2).',
        raw: `Page 1: Time-Dependent Schrödinger Equation
Handwritten symbols: i * hbar * dPsi/dt = H_hat * Psi
Hamiltonian formulation: H_hat = -hbar^2 / (2m) del^2 + V(r, t)
Condition: Wave function Psi must be square-integrable over all volume space.`,
        expectedHeadings: 1,
        expectedEquations: 2,
        expectedTables: 0
      },
      {
        id: 'test-doc-6-multi-column-table',
        category: 'Document with Tables & Multi-Column Layout',
        title: 'Byzantine Fault Tolerance Benchmark Report',
        fileType: 'pdf' as const,
        description: 'Multi-column technical document with throughput comparison tables.',
        raw: `1. Throughput Comparison Across Protocols
Table 1: Consensus Benchmark Results
| Algorithm | Fault Model | Quorum Size | Max Faults |
| Paxos | Fail-Stop | (N/2) + 1 | (N-1)/2 |
| PBFT | Byzantine | 2f + 1 | f = (N-1)/3 |
| Raft | Fail-Stop | floor(N/2) + 1 | (N-1)/2 |

Condition: PBFT requires cryptographic signatures for view change messages.`,
        expectedHeadings: 1,
        expectedEquations: 0,
        expectedTables: 1
      }
    ];

    return testCases.map((tc) => {
      const result = ExtractionService.processDocumentContent(
        tc.id,
        tc.raw,
        tc.fileType,
        tc.title
      );

      return {
        id: tc.id,
        category: tc.category,
        title: tc.title,
        fileType: tc.fileType,
        description: tc.description,
        expectedHeadingsCount: tc.expectedHeadings,
        expectedEquationsCount: tc.expectedEquations,
        expectedTablesCount: tc.expectedTables,
        qualityReport: result.qualityReport,
        extractedSectionsCount: result.sections.length,
        manualCheckPassed: result.qualityReport.userStatus !== 'failed'
      };
    });
  }
}
