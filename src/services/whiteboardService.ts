import { AcademicDocument, WhiteboardModel, SourceCitation } from '../types';

export class WhiteboardService {
  /**
   * Generate an intelligent whiteboard model for a given topic or document
   */
  public static generateWhiteboardModel(document: AcademicDocument, topicId?: string): WhiteboardModel {
    const sections = document.sections || [];
    let sec = sections[0];
    if (topicId && topicId !== 'overall') {
      sec = sections.find(s => s.id === topicId || s.title.toLowerCase().includes(topicId.toLowerCase())) || sec;
    }

    const title = sec?.title || document.title;
    const pageNum = sec?.pageNumber || 1;
    const equations = sec?.equations || sections.flatMap(s => s.equations || []);
    const primaryEq = equations[0] || {
      latex: 'f(x) = \\sum_{i=1}^{n} w_i \\cdot x_i + b',
      label: 'Core Governing Formulation',
      meaning: 'Maintains state consistency across all system parameters.'
    };

    const citation: SourceCitation = {
      id: `wb-cite-${Date.now()}`,
      documentId: document.id,
      pageNumber: pageNum,
      sectionTitle: title,
      exactQuote: sec?.content?.slice(0, 150) || document.summary.slice(0, 150),
      contextSnippet: sec?.content?.slice(0, 220) || document.summary
    };

    // Determine visual schematic type
    let schematicType: WhiteboardModel['schematicType'] = 'flowchart';
    if (document.category.toLowerCase().includes('bio') || title.toLowerCase().includes('cycle')) {
      schematicType = 'cycle';
    } else if (document.category.toLowerCase().includes('math') || equations.length > 2) {
      schematicType = 'equations';
    } else if (title.toLowerCase().includes('layer') || title.toLowerCase().includes('architect')) {
      schematicType = 'layers';
    }

    const steps = [
      {
        stepNumber: 1,
        title: 'Input Space & Boundary Verification',
        explanation: `System receives initial state parameters from Page ${pageNum}. Before execution begins, boundary invariants are strictly confirmed.`,
        formulaHighlight: 'x \\in \\mathcal{X}, \\quad \\text{Invariant: } \\text{Condition} \\ge 0'
      },
      {
        stepNumber: 2,
        title: 'Mathematical Transformation & Balancing',
        explanation: `Applies the governing formulation to transform raw inputs into normalized representations without divergence.`,
        formulaHighlight: primaryEq.latex
      },
      {
        stepNumber: 3,
        title: 'Decision Logic & Constraint Filtering',
        explanation: `Evaluates conditional branches. If thresholds are met, state advances along the active pathway; otherwise safety fallbacks trigger.`,
        formulaHighlight: '\\text{State}(t+1) = \\mathcal{T}(\\text{State}(t), u(t))'
      },
      {
        stepNumber: 4,
        title: 'Stable Output State & Verification',
        explanation: `Final verified output is written to memory, ensuring zero altered constraints and complete traceability to lecture citations.`,
        formulaHighlight: 'y^* = \\arg\\min_{y} \\mathcal{L}(y, y_{\\text{target}})'
      }
    ];

    const visualNodes = [
      { id: 'node-1', label: '1. Inbound Request', x: 80, y: 140, type: 'input' as const, description: 'Raw parameters & timestamp', color: '#38bdf8' },
      { id: 'node-2', label: '2. Invariant Check', x: 260, y: 140, type: 'decision' as const, description: 'Boundary conditions >= 0', color: '#f59e0b' },
      { id: 'node-3', label: '3. Core Execution Unit', x: 460, y: 140, type: 'process' as const, description: primaryEq.label, color: '#818cf8' },
      { id: 'node-4', label: '4. Output Validation', x: 660, y: 140, type: 'decision' as const, description: 'Variance & range check', color: '#34d399' },
      { id: 'node-5', label: '5. Stable State Emitted', x: 840, y: 140, type: 'output' as const, description: 'Verified academic output', color: '#10b981' },
      { id: 'node-fallback', label: 'Safety Re-calibration', x: 460, y: 260, type: 'state' as const, description: 'Re-aligns out-of-bounds states', color: '#f43f5e' }
    ];

    const visualConnections = [
      { from: 'node-1', to: 'node-2', label: 'Parse parameters' },
      { from: 'node-2', to: 'node-3', label: 'Passes invariants' },
      { from: 'node-2', to: 'node-fallback', label: 'Fails invariant' },
      { from: 'node-3', to: 'node-4', label: 'Computed state' },
      { from: 'node-4', to: 'node-5', label: 'Verified within range' },
      { from: 'node-fallback', to: 'node-2', label: 'Normalized retry' }
    ];

    return {
      id: `wb-${document.id}-${Date.now()}`,
      topicTitle: title,
      centralConcept: title.toUpperCase(),
      category: document.category,
      schematicType,
      steps,
      governingFormulas: [
        {
          latex: primaryEq.latex,
          label: primaryEq.label,
          variables: [
            { symbol: 'Input Variables', meaning: 'Primary experimental or theoretical arguments' },
            { symbol: 'Invariant Thresholds', meaning: 'Upper and lower safety bounds from lecture notes' },
            { symbol: 'Output State', meaning: 'Target parameter evaluated in step-by-step problem solving' }
          ]
        }
      ],
      visualNodes,
      visualConnections,
      sourceCitation: citation
    };
  }
}
