export interface EquationValidationResult {
  isValid: boolean;
  score: number; // 0 - 100
  alteredEquationsDetected: number;
  syntaxErrors: string[];
  droppedFactors: string[];
  recommendation?: string;
}

export class EquationValidatorService {
  /**
   * Section 6.1 Module 3: Independently validates mathematical symbols, operators,
   * variables, brackets, and calculations without relying solely on language-model judgment.
   */
  static validateEquations(
    originalEquations: { latex: string; label?: string; meaning?: string }[],
    generatedTextOrSteps: string[]
  ): EquationValidationResult {
    const syntaxErrors: string[] = [];
    const droppedFactors: string[] = [];
    let alteredCount = 0;

    const combinedGeneratedText = generatedTextOrSteps.join(' ');

    originalEquations.forEach((eq, idx) => {
      const latex = eq.latex;

      // 1. Check bracket balance (parentheses, braces, brackets)
      if (!this.areBracketsBalanced(latex)) {
        syntaxErrors.push(`Equation ${idx + 1} (${latex}): Unbalanced LaTeX braces or parentheses detected.`);
        alteredCount++;
      }

      // 2. Check for division by zero or NaN / undefined
      if (latex.includes('/0') || combinedGeneratedText.includes('NaN') || combinedGeneratedText.includes('undefined')) {
        syntaxErrors.push(`Equation ${idx + 1}: Indeterminate or undefined calculation step detected.`);
        alteredCount++;
      }

      // 3. Check for essential mathematical factors (e.g. sqrt, d_k, softmax, exp, PE)
      const keyFactors = this.extractMathematicalTokens(latex);
      keyFactors.forEach(factor => {
        // If the original has a specific normalization factor like \sqrt{d_k} or 10000,
        // ensure it was not dropped or altered in the generated derivation steps
        if (factor.includes('sqrt') || factor.includes('d_k') || factor.includes('10000')) {
          const simplifiedFactor = factor.replace(/[\\{}]/g, '');
          const matchFound = combinedGeneratedText.toLowerCase().includes(simplifiedFactor.toLowerCase()) ||
            combinedGeneratedText.includes('√') ||
            combinedGeneratedText.includes('sqrt');
          if (!matchFound && combinedGeneratedText.length > 50) {
            droppedFactors.push(`Potential dropped normalization factor: "${factor}" from ${latex}`);
            alteredCount++;
          }
        }
      });
    });

    const totalEqs = Math.max(1, originalEquations.length);
    const score = Math.max(0, Math.round(100 - (alteredCount / totalEqs) * 35));

    return {
      isValid: alteredCount === 0 && syntaxErrors.length === 0,
      score,
      alteredEquationsDetected: alteredCount,
      syntaxErrors,
      droppedFactors,
      recommendation: alteredCount > 0
        ? 'Mathematical notation contains possible symbol alteration or dropped normalization factors. Review against source.'
        : undefined
    };
  }

  private static areBracketsBalanced(str: string): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '{' || char === '(' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ')' || char === ']') {
        if (stack.length === 0 || stack.pop() !== pairs[char]) {
          return false;
        }
      }
    }
    return stack.length === 0;
  }

  private static extractMathematicalTokens(latex: string): string[] {
    return latex.split(/[\s=+*^_-]+/).filter(t => t.length > 2);
  }
}
