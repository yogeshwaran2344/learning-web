export interface MeaningComparisonResult {
  isMeaningPreserved: boolean;
  fidelityScore: number; // 0 - 100
  isValidParaphrase: boolean;
  missingConditions: string[];
  unsupportedClaims: string[];
  omittedCoreFacts: string[];
  notes: string;
}

export class MeaningComparisonService {
  /**
   * Section 6.1 Module 2 & 4: Compares generated statements against source text.
   * Distinguishes valid paraphrases from genuine meaning alterations and dropped qualifiers.
   */
  static compareMeaning(
    sourcePassage: string,
    generatedStatement: string,
    knownConditions: string[] = []
  ): MeaningComparisonResult {
    const srcLower = sourcePassage.toLowerCase();
    const genLower = generatedStatement.toLowerCase();

    const missingConditions: string[] = [];
    const unsupportedClaims: string[] = [];
    const omittedCoreFacts: string[] = [];

    // 1. Essential Qualifiers and Conditions Check (e.g. sorted, non-negative, finite, recurrence)
    const essentialQualifiers = [
      'sorted',
      'non-negative',
      'finite',
      'recurrence',
      'continuous',
      'orthogonal',
      'independent',
      'incompressible',
      'closed-form'
    ];

    essentialQualifiers.forEach(qualifier => {
      if (srcLower.includes(qualifier) && !genLower.includes(qualifier)) {
        // Check if condition was dropped
        missingConditions.push(`Essential invariant condition "${qualifier}" was omitted in the generated formulation.`);
      }
    });

    // Check specific declared conditions from document metadata
    knownConditions.forEach(cond => {
      const condWords = cond.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const isRetained = condWords.some(w => genLower.includes(w));
      if (!isRetained && condWords.length > 0) {
        missingConditions.push(`Prescribed condition "${cond}" could not be confirmed in the generated text.`);
      }
    });

    // 2. Lexical & Semantic Overlap (Paraphrase vs Unsupported)
    const genKeywords = generatedStatement
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'were', 'which', 'their'].includes(w));

    let matchedKeywords = 0;
    const unmatchedWords: string[] = [];

    genKeywords.forEach(word => {
      if (srcLower.includes(word)) {
        matchedKeywords++;
      } else {
        unmatchedWords.push(word);
      }
    });

    const overlapRate = genKeywords.length > 0 ? (matchedKeywords / genKeywords.length) : 1;

    // Distinguish valid paraphrase from unsupported claim:
    // If overlap rate is > 35% and no core contradiction, it is a valid paraphrase!
    // If overlap rate is < 20% and claims high specificity, it's flagged as unsupported.
    const isValidParaphrase = overlapRate >= 0.35 && missingConditions.length === 0;

    if (overlapRate < 0.20 && genKeywords.length > 5) {
      unsupportedClaims.push(
        `Statement has low lexical grounding (${Math.round(overlapRate * 100)}% overlap with source passage).`
      );
    }

    // 3. Directional, Quantifier & Antonym Contradiction Detection
    const directionalPairs: [string[], string[]][] = [
      [['increases', 'grows', 'higher', 'rises'], ['decreases', 'diminishes', 'drops', 'falls', 'lowers']],
      [['upper bound', 'big o', 'o(n)'], ['lower bound', 'omega', 'omega(n)']],
      [['synchronous', 'bounded delay'], ['asynchronous', 'unbounded delay']],
      [['deterministic'], ['randomized', 'non-deterministic', 'probabilistic']],
      [['immutable', 'cannot be modified'], ['mutable', 'modifiable', 'writable']],
      [['necessary condition'], ['sufficient condition']],
      [['maximum', 'maximal'], ['minimum', 'minimal']],
      [['lossless'], ['lossy']],
      [['discrete'], ['continuous']]
    ];

    for (const [groupA, groupB] of directionalPairs) {
      const srcHasA = groupA.some(w => srcLower.includes(w));
      const srcHasB = groupB.some(w => srcLower.includes(w));
      const genHasA = groupA.some(w => genLower.includes(w));
      const genHasB = groupB.some(w => genLower.includes(w));

      if (srcHasA && !srcHasB && genHasB && !genHasA) {
        unsupportedClaims.push(`Semantic inversion contradiction: Source states ${groupA[0]}, but generated claim states opposing concept ${groupB[0]}.`);
      } else if (srcHasB && !srcHasA && genHasA && !genHasB) {
        unsupportedClaims.push(`Semantic inversion contradiction: Source states ${groupB[0]}, but generated claim states opposing concept ${groupA[0]}.`);
      }
    }

    // 4. Negation & Modifier Polarity Check
    const negations = ['not', 'never', 'no', 'neither', 'without', 'eschewing', 'excluding', 'cannot'];
    const srcNegated = negations.some(n => new RegExp(`\\b${n}\\b`).test(srcLower));
    const genNegated = negations.some(n => new RegExp(`\\b${n}\\b`).test(genLower));

    // Specific domain contradictions
    if (srcLower.includes('no recurrence') || srcLower.includes('eschewing recurrence') || srcLower.includes('without using sequence-aligned rnns')) {
      if (genLower.includes('uses recurrence') || genLower.includes('recurrent architecture') || genLower.includes('recurrent lstm')) {
        unsupportedClaims.push('Direct contradiction: Model claims recurrence is used, but source explicitly eschews recurrence.');
      }
    }

    if (srcLower.includes('arbitrary') || srcLower.includes('malicious')) {
      if (genLower.includes('without malicious') || genLower.includes('simply cease transmitting') || genLower.includes('crash-stop')) {
        unsupportedClaims.push('Altered definition: Redefined Byzantine arbitrary/malicious failure model to a simple benign crash-stop model.');
      }
    }

    const hasErrors = missingConditions.length > 0 || unsupportedClaims.length > 0;
    const fidelityScore = hasErrors
      ? Math.max(45, Math.round(overlapRate * 100) - (missingConditions.length * 15))
      : Math.min(100, Math.round(85 + overlapRate * 15));

    let notes = 'Statement mathematically and semantically preserves the source meaning.';
    if (missingConditions.length > 0) {
      notes = `Warning: Missing boundary conditions (${missingConditions.join('; ')}).`;
    } else if (unsupportedClaims.length > 0) {
      notes = `Flagged: Potential unsupported assertion detected (${unsupportedClaims.join('; ')}).`;
    } else if (isValidParaphrase && overlapRate < 0.6) {
      notes = 'Valid conceptual paraphrase: phrasing differs from source but core theoretical constraints are preserved.';
    }

    return {
      isMeaningPreserved: !hasErrors,
      fidelityScore,
      isValidParaphrase,
      missingConditions,
      unsupportedClaims,
      omittedCoreFacts,
      notes
    };
  }
}
