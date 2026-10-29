import { MeaningComparisonService } from '../services/meaningComparisonService';
import { EquationValidatorService } from '../services/equationValidatorService';

export interface DeliberateTestCase {
  id: string;
  type:
    | 'correct_paraphrase'
    | 'altered_definition'
    | 'contradicting_answer'
    | 'missing_condition'
    | 'altered_equation'
    | 'insufficient_evidence';
  title: string;
  sourcePassage: string;
  candidateClaim: string;
  equations?: { latex: string; label?: string }[];
  knownConditions?: string[];
  expectedStatus: 'verified' | 'needs_review' | 'unable_to_verify';
  expectedFlagReason?: 'unsupported_claim' | 'omitted_fact' | 'altered_equation' | 'terminology_mismatch';
}

export const DELIBERATE_TEST_COLLECTION: DeliberateTestCase[] = [
  // 1. Correct Paraphrase: Should be accepted (VERIFIED)
  {
    id: 'test-case-1-paraphrase',
    type: 'correct_paraphrase',
    title: 'Valid Paraphrase of Scaled Dot-Product Attention',
    sourcePassage: 'We compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are packed into matrices K and V. We compute the matrix of outputs as: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V.',
    candidateClaim: 'Scaled Dot-Product Attention calculates attention scores by multiplying query and key matrices, dividing by the square root of the key dimension, applying softmax, and multiplying by value matrix V.',
    equations: [{ latex: 'Attention(Q, K, V) = softmax(QK^T / \\sqrt{d_k}) V' }],
    knownConditions: ['square root of key dimension'],
    expectedStatus: 'verified'
  },

  // 2. Altered Definition: Should be flagged (NEEDS_REVIEW)
  {
    id: 'test-case-2-altered-def',
    type: 'altered_definition',
    title: 'Altered Definition of Byzantine Fault Tolerance',
    sourcePassage: 'A Byzantine fault refers to arbitrary failure modes where faulty components can crash, send contradictory messages to different peers, or act deliberately malicious.',
    candidateClaim: 'A Byzantine fault is strictly defined as a crash-stop network partition where nodes simply cease transmitting without malicious or adversarial actions.',
    expectedStatus: 'needs_review',
    expectedFlagReason: 'unsupported_claim'
  },

  // 3. Contradicting Answer: Should be flagged (NEEDS_REVIEW)
  {
    id: 'test-case-3-contradiction',
    type: 'contradicting_answer',
    title: 'Direct Contradiction of Recurrence in Transformers',
    sourcePassage: 'The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution. It eschews recurrence entirely.',
    candidateClaim: 'The Transformer architecture integrates an essential recurrent LSTM layer at each block to perform sequential alignment.',
    expectedStatus: 'needs_review',
    expectedFlagReason: 'unsupported_claim'
  },

  // 4. Missing Condition / Qualification: Should be flagged (NEEDS_REVIEW)
  {
    id: 'test-case-4-missing-cond',
    type: 'missing_condition',
    title: 'Dropped Essential Condition in Navier-Stokes',
    sourcePassage: 'The incompressible Navier-Stokes equations describe viscous fluid substances under the invariant condition that the fluid density is constant and divergence div(u) = 0.',
    candidateClaim: 'Navier-Stokes equations describe fluid dynamics across all velocities without any divergence-free or incompressibility restrictions.',
    knownConditions: ['incompressible', 'div(u) = 0'],
    expectedStatus: 'needs_review',
    expectedFlagReason: 'omitted_fact'
  },

  // 5. Equation with Altered Symbol: Should be flagged (NEEDS_REVIEW)
  {
    id: 'test-case-5-altered-eq',
    type: 'altered_equation',
    title: 'Altered Equation Operator and Factor',
    sourcePassage: 'Attention is computed as Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V.',
    candidateClaim: 'The derivation applies the attention formula Attention(Q, K, V) = sigmoid((Q * K^T) / d_k) * V where d_k is linear.',
    equations: [{ latex: 'Attention(Q, K, V) = softmax(QK^T / \\sqrt{d_k}) V' }],
    expectedStatus: 'needs_review',
    expectedFlagReason: 'altered_equation'
  },

  // 6. Insufficient Evidence / Fabricated Claim: (NEEDS_REVIEW / UNABLE_TO_VERIFY)
  {
    id: 'test-case-6-no-evidence',
    type: 'insufficient_evidence',
    title: 'Assertion with Insufficient Grounding in Source',
    sourcePassage: 'The ResNet paper demonstrates that 152-layer networks can be trained effectively on ImageNet classification.',
    candidateClaim: 'ResNet achieves 99.9% top-1 accuracy on clinical brain tumor MRI detection using specialized quantum superconducting circuits.',
    expectedStatus: 'needs_review',
    expectedFlagReason: 'unsupported_claim'
  }
];

export class DeliberateTestRunner {
  static evaluateCollection(): {
    total: number;
    passed: number;
    missedErrors: number;
    falseAlarms: number;
    accuracyPercent: number;
    results: any[];
  } {
    let missedErrors = 0;
    let falseAlarms = 0;
    let passed = 0;
    const results: any[] = [];

    for (const test of DELIBERATE_TEST_COLLECTION) {
      let status: 'verified' | 'needs_review' | 'unable_to_verify' = 'verified';
      let flagReason: string | undefined = undefined;
      const reasons: string[] = [];

      // 1. Meaning & condition check
      const meaningComp = MeaningComparisonService.compareMeaning(
        test.sourcePassage,
        test.candidateClaim,
        test.knownConditions || []
      );

      if (meaningComp.unsupportedClaims.length > 0) {
        status = 'needs_review';
        flagReason = 'unsupported_claim';
        reasons.push(...meaningComp.unsupportedClaims);
      }
      if (meaningComp.missingConditions.length > 0) {
        status = 'needs_review';
        flagReason = 'omitted_fact';
        reasons.push(...meaningComp.missingConditions);
      }

      // 2. Equation check
      if (test.equations && test.equations.length > 0) {
        const eqValidation = EquationValidatorService.validateEquations(test.equations, [test.candidateClaim]);
        if (!eqValidation.isValid) {
          status = 'needs_review';
          flagReason = 'altered_equation';
          reasons.push(...eqValidation.droppedFactors, ...eqValidation.syntaxErrors);
        }
      }

      const isCorrectVerdict = status === test.expectedStatus;
      if (isCorrectVerdict) {
        passed++;
      } else {
        if (test.expectedStatus === 'needs_review' && status === 'verified') {
          missedErrors++;
        } else if (test.expectedStatus === 'verified' && status !== 'verified') {
          falseAlarms++;
        }
      }

      results.push({
        id: test.id,
        type: test.type,
        title: test.title,
        expectedStatus: test.expectedStatus,
        actualStatus: status,
        isCorrectVerdict,
        flagReason,
        reasons
      });
    }

    const total = DELIBERATE_TEST_COLLECTION.length;
    const accuracyPercent = Number(((passed / total) * 100).toFixed(1));

    return {
      total,
      passed,
      missedErrors,
      falseAlarms,
      accuracyPercent,
      results
    };
  }
}
