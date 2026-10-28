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

      // 3. Symbolic token & normalization factor validation (AST/token-based)
      const keyFactors = this.extractMathematicalTokens(latex);
      keyFactors.forEach(factor => {
        // Normalization factors like \sqrt{d_k}, \frac{1}{\sqrt{d_k}}, 1/\sqrt{d_k}, 10000, 2\pi
        if (factor.includes('sqrt') || factor.includes('d_k') || factor.includes('10000') || factor.includes('\\frac')) {
          const simplifiedFactor = factor.replace(/[\\{}]/g, '');
          const matchFound = combinedGeneratedText.toLowerCase().includes(simplifiedFactor.toLowerCase()) ||
            combinedGeneratedText.includes('√') ||
            combinedGeneratedText.includes('sqrt') ||
            combinedGeneratedText.includes('d_k') ||
            combinedGeneratedText.includes('dk');
          if (!matchFound && combinedGeneratedText.length > 50) {
            droppedFactors.push(`Dropped mathematical normalization factor: "${factor}" from equation ${latex}`);
            alteredCount++;
          }
        }
      });

      // 4. Operator and exponent integrity verification
      if (latex.includes('^2') && !combinedGeneratedText.includes('^2') && !combinedGeneratedText.includes('squared') && !combinedGeneratedText.includes('²')) {
        droppedFactors.push(`Missing quadratic exponent (^2) from equation: ${latex}`);
        alteredCount++;
      }
      if (latex.includes('\\sum') || latex.includes('∑')) {
        if (!combinedGeneratedText.includes('sum') && !combinedGeneratedText.includes('∑') && !combinedGeneratedText.includes('\\sum')) {
          droppedFactors.push(`Missing summation operator (∑) from equation: ${latex}`);
          alteredCount++;
        }
      }
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
