import React from 'react';
import {
  Table as TableIcon,
  Calculator,
  Clock,
  CheckCircle2,
  Sigma,
  ArrowRight,
  Quote,
  Hash,
  ListOrdered,
  List,
  AlertTriangle,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';
import { NeuronAnatomyDiagram } from './NeuronAnatomyDiagram';

export interface StructuredContentRendererProps {
  content: string;
  tables?: { caption?: string; headers: string[]; rows: string[][] }[];
  equations?: { latex: string; meaning?: string; label?: string }[];
  conditions?: string[];
  isQuoteMatched?: boolean;
  highlightRef?: React.RefObject<HTMLDivElement>;
  pageNumber?: number;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  title?: string;
}

export interface ParsedCalculationBlock {
  type: 'turnaround' | 'waiting' | 'general';
  title: string;
  formula?: string;
  variableDefinitions?: { abbr: string; name: string }[];
  given?: string[];
  steps: { label: string; calculation: string; result: string }[];
  mathSteps?: string[];
  average?: { label: string; value: string };
  finalAnswer?: string;
}

/**
 * Clean unwanted single line-breaks caused by PDF column wrapping while
 * preserving legitimate paragraph boundaries, headings, bullet lists, tables, and math equations.
 */
export function cleanPdfLineBreaks(rawText: string): string {
  if (!rawText) return '';

  const paragraphs = rawText.split(/\n\s*\n/);

  const cleanedParagraphs = paragraphs.map(para => {
    const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return para.trim();

    // If it's a table (contains |), preserve exact line breaks
    if (lines.some(l => l.includes('|'))) {
      return lines.join('\n');
    }

    // If it's a list or calculation step lines, preserve line breaks
    const isListOrStep = lines.every(l =>
      /^([-*•–]|\d+[\.)]|Step\s*\d+:|P\d+:|Given:|Calculation:|Final answer:)/i.test(l) ||
      l.startsWith('\\[') || l.endsWith('\\]') || l.startsWith('$$')
    );
    if (isListOrStep) {
      return lines.join('\n');
    }

    // Otherwise merge broken lines inside a normal narrative sentence
    let merged = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        merged = line;
      } else {
        const prev = lines[i - 1];
        // If previous line ends with hyphen, remove hyphen and join directly
        if (prev.endsWith('-')) {
          merged = merged.slice(0, -1) + line;
        } else if (
          // If current line starts a list item or equation, keep on new line
          /^([-*•–]|\d+[\.)]|Step\s*\d+:|P\d+:|Given:|Calculation:)/i.test(line) ||
          line.startsWith('\\[') || line.startsWith('$$')
        ) {
          merged += '\n' + line;
        } else {
          merged += ' ' + line;
        }
      }
    }
    return merged;
  });

  return cleanedParagraphs.filter(p => p.length > 0).join('\n\n');
}

/**
 * Render LaTeX / Math tokens with real vertically aligned fractions,
 * superscripts, subscripts, Greek letters, and mathematical symbols.
 */
export const MathFormulaView: React.FC<{ formula: string; isBlock?: boolean }> = ({ formula, isBlock = false }) => {
  // Strip out display delimiters \[ ... \] or $$ ... $$
  let cleaned = formula.trim();
  if (cleaned.startsWith('\\[') && cleaned.endsWith('\\]')) {
    cleaned = cleaned.slice(2, -2).trim();
    isBlock = true;
  } else if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
    cleaned = cleaned.slice(2, -2).trim();
    isBlock = true;
  } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Helper to parse fractions like \frac{A}{B} into vertically stacked visual elements
  const renderFraction = (numeratorStr: string, denominatorStr: string, key: string | number) => (
    <span key={key} className="inline-flex flex-col items-center justify-center align-middle mx-1.5 my-1 font-mono text-xs sm:text-sm">
      <span className="border-b-2 border-slate-700 dark:border-slate-300 px-1.5 text-center font-bold pb-0.5">
        {renderMathTokens(numeratorStr)}
      </span>
      <span className="px-1.5 text-center font-bold pt-0.5">
        {renderMathTokens(denominatorStr)}
      </span>
    </span>
  );

  const renderMathTokens = (text: string): React.ReactNode => {
    // Check for \frac{...}{...}
    const fracRegex = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = fracRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderSimpleMathTokens(text.substring(lastIndex, match.index), `txt-${lastIndex}`));
      }
      parts.push(renderFraction(match[1], match[2], `frac-${match.index}`));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderSimpleMathTokens(text.substring(lastIndex), `txt-end`));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderSimpleMathTokens = (text: string, keyPrefix: string): React.ReactNode => {
    // Replace \text{...}
    let formatted = text.replace(/\\text\{([^{}]+)\}/g, '$1');
    // Common Greek and math symbols
    formatted = formatted
      .replace(/\\sum/g, '∑')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\pm/g, '±')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\cdot/g, '·')
      .replace(/\\rightarrow/g, '→');

    // Parse subscripts and superscripts
    // e.g., P1, x^2, e^{-x}, d_k
    const tokenRegex = /([A-Za-z0-9]+)\^\{?([A-Za-z0-9\-]+)\}?|([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?/g;
    const tokens: React.ReactNode[] = [];
    let curIdx = 0;
    let m: RegExpExecArray | null;

    while ((m = tokenRegex.exec(formatted)) !== null) {
      if (m.index > curIdx) {
        tokens.push(formatted.substring(curIdx, m.index));
      }
      if (m[1] && m[2]) {
        // superscript
        tokens.push(
          <span key={`${keyPrefix}-sup-${m.index}`}>
            {m[1]}<sup>{m[2]}</sup>
          </span>
        );
      } else if (m[3] && m[4]) {
        // subscript
        tokens.push(
          <span key={`${keyPrefix}-sub-${m.index}`}>
            {m[3]}<sub>{m[4]}</sub>
          </span>
        );
      }
      curIdx = m.index + m[0].length;
    }

    if (curIdx < formatted.length) {
      tokens.push(formatted.substring(curIdx));
    }

    return <span key={keyPrefix}>{tokens}</span>;
  };

  if (isBlock) {
    return (
      <div className="my-2.5 p-3.5 sm:p-4 rounded-2xl bg-slate-900 text-blue-200 border border-slate-800 font-mono text-xs sm:text-sm flex flex-col items-center justify-center shadow-xs overflow-x-auto w-full select-text">
        <div className="flex items-center justify-center text-center w-full py-1">
          {renderMathTokens(cleaned)}
        </div>
      </div>
    );
  }

  return (
    <span className="font-mono text-blue-600 dark:text-blue-300 font-semibold px-1 py-0.5 rounded bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 inline-flex items-center align-middle">
      {renderMathTokens(cleaned)}
    </span>
  );
};

/**
 * Dedicated renderer for tables with proper headers, monospace rows, and horizontal scroll
 */
export const StructuredTableRenderer: React.FC<{ table: ParsedTable }> = ({ table }) => {
  return (
    <div className="my-4 space-y-2 font-sans">
      {table.title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <TableIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{table.title}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Data Table ({table.rows.length} rows)</span>
        </div>
      )}

      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/90 font-bold border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
              <tr>
                {table.headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="py-3 px-4 font-bold border-r border-slate-200 dark:border-slate-700 last:border-r-0 whitespace-nowrap text-[11px] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
              {table.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors ${
                    rIdx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800 last:border-r-0 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Dedicated renderer for step-by-step multi-line derivations, calculations, and final answers
 */
export const MathematicalCalculationView: React.FC<{ calc: ParsedCalculationBlock }> = ({ calc }) => {
  return (
    <div className="my-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-md space-y-4 font-sans select-text">
      {/* Title & Governing Equation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/50 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {calc.title}
            </h3>
            {calc.formula && (
              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold pt-0.5">
                {calc.formula}
              </div>
            )}
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
          Step-by-Step Derivation
        </span>
      </div>

      {/* Variable Definitions Legend */}
      {calc.variableDefinitions && calc.variableDefinitions.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {calc.variableDefinitions.map((v, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
            >
              <strong>{v.abbr}</strong> = {v.name}
            </span>
          ))}
        </div>
      )}

      {/* Given Parameters Card */}
      {calc.given && calc.given.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Given Parameters:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 font-mono">
            {calc.given.map((item, gIdx) => (
              <div
                key={gIdx}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between"
              >
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Process Calculation Steps Grid */}
      {calc.steps && calc.steps.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Individual Process Steps:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
            {calc.steps.map((st, sIdx) => (
              <div
                key={sIdx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs"
              >
                <span className="font-bold text-slate-900 dark:text-slate-100">{st.label}:</span>
                <span className="text-slate-500 dark:text-slate-400">{st.calculation}</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono">= {st.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-step Vertically Aligned Math Equations */}
      {calc.mathSteps && calc.mathSteps.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Calculation Steps:
          </div>
          <div className="p-4 rounded-xl bg-slate-950 text-blue-200 border border-slate-800 space-y-2 font-mono flex flex-col items-center justify-center">
            {calc.mathSteps.map((mStep, mIdx) => (
              <div key={mIdx} className="w-full flex items-center justify-center text-sm sm:text-base py-1">
                <MathFormulaView formula={mStep} isBlock={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average / Summary Card */}
      {calc.average && !calc.finalAnswer && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{calc.average.label}:</span>
          </div>
          <span className="text-sm font-black font-mono text-indigo-700 dark:text-indigo-300">
            {calc.average.value}
          </span>
        </div>
      )}

      {/* Final Answer Highlight Badge */}
      {calc.finalAnswer && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Final Answer:</span>
          </div>
          <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-mono font-black text-sm sm:text-base shadow-sm">
            {calc.finalAnswer}
          </span>
        </div>
      )}
    </div>
  );
};

export const StructuredContentRenderer: React.FC<StructuredContentRendererProps> = ({
  content,
  tables = [],
  equations = [],
  conditions = [],
  isQuoteMatched,
  highlightRef,
  pageNumber
}) => {
  if (!content && tables.length === 0 && equations.length === 0) return null;

  // Clean unneeded PDF line breaks while keeping paragraph separation
  const cleanedText = cleanPdfLineBreaks(content);
  const blocks = cleanedText.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  // Helper to parse markdown pipe table
  const tryParseTable = (text: string): ParsedTable | null => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    if (lines.some(l => l.includes('|'))) {
      const tableLines = lines.filter(l => l.includes('|'));
      if (tableLines.length >= 2) {
        const parseRow = (line: string) =>
          line
            .split('|')
            .map(c => c.trim())
            .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));

        const rawHeaders = parseRow(tableLines[0]);
        const dataLines = tableLines.slice(1).filter(l => !l.match(/^[\s\|:-]+$/));
        const rows = dataLines.map(parseRow);

        if (rawHeaders.length >= 2 && rows.length >= 1) {
          const titleLine = lines[0] && !lines[0].includes('|') ? lines[0] : undefined;
          return {
            title: titleLine,
            headers: rawHeaders,
            rows
          };
        }
      }
    }

    return null;
  };

  // Helper to parse multi-step calculation blocks (e.g. Turnaround Time, Waiting Time, Average Waiting Time)
  const tryParseCalculations = (text: string): ParsedCalculationBlock | null => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    const lower = text.toLowerCase();
    const isTurnaround = lower.includes('turnaround time') || lower.includes('tat =') || lower.includes('tat:');
    const isWaiting = lower.includes('waiting time') || lower.includes('wt =') || lower.includes('wt:');
    const isAverageWaiting = lower.includes('average waiting time') || (lower.includes('average') && lower.includes('given:'));

    if (!isTurnaround && !isWaiting && !isAverageWaiting) return null;

    const steps: { label: string; calculation: string; result: string }[] = [];
    const given: string[] = [];
    const mathSteps: string[] = [];
    let average: { label: string; value: string } | undefined = undefined;
    let finalAnswer: string | undefined = undefined;
    let formula: string | undefined = undefined;

    // Detect given parameters (e.g., "- P1 = 4 ms")
    let inGiven = false;
    for (const line of lines) {
      if (line.toLowerCase().startsWith('given:')) {
        inGiven = true;
        continue;
      }
      if (inGiven) {
        if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
          given.push(line.replace(/^[-•*]\s*/, ''));
        } else if (line.toLowerCase().startsWith('calculation:') || line.startsWith('\\[') || line.startsWith('$$')) {
          inGiven = false;
        }
      }
    }

    // Extract vertical math steps (e.g. \[ \text{Average}=\frac{4+6+8}{3} \] or = \frac{18}{3} = 6 ms)
    for (const line of lines) {
      if (line.startsWith('\\[') || line.startsWith('$$')) {
        mathSteps.push(line);
      } else if (line.startsWith('=') && line.includes('\\frac')) {
        mathSteps.push(line);
      }
    }

    // Extract formula
    const formulaLine = lines.find(
      l => l.includes(' = ') && (l.toLowerCase().includes('time') || l.includes('CT') || l.includes('TAT') || l.includes('WT'))
    );
    if (formulaLine && !formulaLine.startsWith('P') && !formulaLine.toLowerCase().includes('average')) {
      formula = formulaLine.replace(/^[#*-]\s*/, '');
    }

    // Extract final answer or average
    for (const line of lines) {
      if (line.toLowerCase().startsWith('final answer:')) {
        finalAnswer = line.replace(/^final answer:\s*/i, '').trim();
      } else if (line.toLowerCase().includes('average')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const val = parts.slice(1).join('=').trim();
          average = {
            label: parts[0].trim().replace(/^[#*-]\s*/, ''),
            value: val
          };
          if (!finalAnswer && val.length > 0) {
            // e.g. "5.2 ms" or "8.4 ms" or "6 ms"
            const finalNumMatch = val.match(/([0-9.]+\s*ms|[0-9.]+)$/);
            if (finalNumMatch) {
              finalAnswer = finalNumMatch[1];
            }
          }
        }
      }

      // Check for process steps like "P1: 5 - 0 = 5"
      const match = line.match(/^(P\d+|Process\s*\d+|Task\s*\d+)[:\s]+(.+?)\s*=\s*([^=\n]+)$/i);
      if (match) {
        steps.push({
          label: match[1].trim(),
          calculation: match[2].trim(),
          result: match[3].trim()
        });
      }
    }

    const varDefs = isTurnaround
      ? [
          { abbr: 'TAT', name: 'Turnaround Time' },
          { abbr: 'CT', name: 'Completion Time' },
          { abbr: 'AT', name: 'Arrival Time' }
        ]
      : [
          { abbr: 'WT', name: 'Waiting Time' },
          { abbr: 'TAT', name: 'Turnaround Time' },
          { abbr: 'BT', name: 'Burst Time' }
        ];

    let calcTitle = 'Mathematical Derivation';
    if (isAverageWaiting || lower.includes('average waiting time')) {
      calcTitle = 'Average Waiting Time';
    } else if (isTurnaround) {
      calcTitle = 'Turnaround Time (TAT) Derivations';
    } else if (isWaiting) {
      calcTitle = 'Waiting Time (WT) Derivations';
    }

    if (steps.length > 0 || mathSteps.length > 0 || given.length > 0 || average) {
      return {
        type: isTurnaround ? 'turnaround' : isWaiting ? 'waiting' : 'general',
        title: calcTitle,
        formula: formula || (isTurnaround ? 'TAT = Completion Time - Arrival Time' : 'WT = Turnaround Time - Burst Time'),
        variableDefinitions: varDefs,
        given: given.length > 0 ? given : undefined,
        steps,
        mathSteps: mathSteps.length > 0 ? mathSteps : undefined,
        average,
        finalAnswer
      };
    }

    return null;
  };

  // Helper to parse bullet or numbered lists
  const tryParseList = (text: string): { isOrdered: boolean; items: string[] } | null => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    const isAllBullet = lines.every(l => /^[-*•–]/.test(l));
    const isAllNumbered = lines.every(l => /^\d+[\.)]/.test(l) || /^Step\s*\d+:/i.test(l));

    if (isAllBullet) {
      return {
        isOrdered: false,
        items: lines.map(l => l.replace(/^[-*•–]\s*/, ''))
      };
    }

    if (isAllNumbered) {
      return {
        isOrdered: true,
        items: lines.map(l => l.replace(/^\d+[\.)]\s*|^Step\s*\d+:\s*/i, ''))
      };
    }

    return null;
  };

  // Helper to check for heading line
  const tryParseHeading = (text: string): { text: string; level: number } | null => {
    const trimmed = text.trim();
    if (trimmed.startsWith('### ')) {
      return { text: trimmed.slice(4).trim(), level: 3 };
    }
    if (trimmed.startsWith('## ')) {
      return { text: trimmed.slice(3).trim(), level: 2 };
    }
    if (trimmed.startsWith('# ')) {
      return { text: trimmed.slice(2).trim(), level: 1 };
    }

    // Standalone heading lines ending with colon or short title-cased lines
    if (
      trimmed.length < 60 &&
      !trimmed.includes('\n') &&
      !trimmed.endsWith('.') &&
      (trimmed.endsWith(':') || /^[A-Z][A-Za-z0-9\s–—\-]{3,}$/.test(trimmed)) &&
      !trimmed.includes('|') &&
      !trimmed.includes('=') &&
      !trimmed.startsWith('-')
    ) {
      return { text: trimmed.replace(/:$/, ''), level: 2 };
    }

    return null;
  };

  return (
    <div
      ref={isQuoteMatched ? highlightRef : undefined}
      className={`space-y-4 text-xs sm:text-sm font-sans transition-all select-text ${
        isQuoteMatched
          ? 'p-3.5 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 shadow-sm'
          : ''
      }`}
    >
      {/* 1. Explicit Tables Passed from Section */}
      {tables && tables.length > 0 && (
        <div className="space-y-3">
          {tables.map((t, tIdx) => (
            <StructuredTableRenderer
              key={`prop-tbl-${tIdx}`}
              table={{
                title: t.caption || 'Extracted Document Table',
                headers: t.headers,
                rows: t.rows
              }}
            />
          ))}
        </div>
      )}

      {/* 2. Text Blocks Parsed Structurally */}
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();

        // Diagram trigger: Fig 1.1 Neuron Anatomy
        if (trimmed.includes('Fig. 1.1') || trimmed.includes('Fine structure of a neuron')) {
          return (
            <div key={bIdx} className="my-4">
              <NeuronAnatomyDiagram />
            </div>
          );
        }

        // Highlighted quote / definition box
        if (trimmed.startsWith('>') || (trimmed.startsWith('"') && trimmed.includes('structural and functional'))) {
          const quoteText = trimmed.replace(/^>\s*/, '').replace(/^"|"$/g, '');
          return (
            <div
              key={bIdx}
              className="my-3 p-4 rounded-xl border-l-4 border-pink-500 bg-pink-50/70 dark:bg-pink-950/30 text-pink-950 dark:text-pink-100 font-sans shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <Quote className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                  {quoteText}
                </p>
              </div>
            </div>
          );
        }

        // Calculation block (CPU scheduling, derivations, average waiting time)
        const calc = tryParseCalculations(block);
        if (calc) {
          return <MathematicalCalculationView key={bIdx} calc={calc} />;
        }

        // Table block parsed from markdown pipes
        const table = tryParseTable(block);
        if (table) {
          return <StructuredTableRenderer key={bIdx} table={table} />;
        }

        // Display math equation block (\[ ... \] or $$ ... $$)
        if (
          (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) ||
          (trimmed.startsWith('$$') && trimmed.endsWith('$$'))
        ) {
          return <MathFormulaView key={bIdx} formula={trimmed} isBlock={true} />;
        }

        // Lists: Unordered or Numbered steps
        const list = tryParseList(block);
        if (list) {
          if (list.isOrdered) {
            return (
              <ol key={bIdx} className="space-y-2 my-3 pl-1 font-sans">
                {list.items.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                      {iIdx + 1}
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            );
          } else {
            return (
              <ul key={bIdx} className="space-y-1.5 my-3 pl-1 font-sans">
                {list.items.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0 mt-2" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            );
          }
        }

        // Heading block
        const heading = tryParseHeading(block);
        if (heading) {
          return (
            <div key={bIdx} className="pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {heading.text}
              </h3>
            </div>
          );
        }

        // 1 Fundamentals Outline block
        if (trimmed.startsWith('1 Fundamentals')) {
          const lines = trimmed.split('\n');
          return (
            <div key={bIdx} className="my-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-pink-600 text-white font-bold text-xs">
                  1 Fundamentals
                </span>
              </div>
              <div className="pl-4 border-l-2 border-pink-200 dark:border-pink-900 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                {lines.slice(1).map((ln, idx) => (
                  <div key={idx} className="font-mono">{ln}</div>
                ))}
              </div>
            </div>
          );
        }

        // Standard narrative paragraph with proper spacing and high contrast
        return (
          <p
            key={bIdx}
            className="leading-relaxed sm:leading-7 text-slate-800 dark:text-slate-200 break-words mb-3 text-justify sm:text-left"
          >
            {block}
          </p>
        );
      })}

      {/* 3. Explicit Equations Passed from Section Object */}
      {equations && equations.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sigma className="w-3.5 h-3.5 text-blue-600" />
            <span>Recognized Mathematical Formulations ({equations.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {equations.map((eq, eIdx) => (
              <div
                key={eIdx}
                className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 font-mono text-xs overflow-x-auto space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] text-blue-300">
                  <span className="font-bold">{eq.label || `Equation ${eIdx + 1}`}</span>
                  <span className="text-[10px] text-emerald-400 font-sans font-semibold">Preserved LaTeX</span>
                </div>
                <div className="text-sm text-blue-200 py-1 font-semibold">
                  <MathFormulaView formula={eq.latex} isBlock={false} />
                </div>
                {eq.meaning && (
                  <div className="text-[11px] text-slate-400 font-sans italic pt-0.5">
                    {eq.meaning}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Boundary Conditions / Invariants Alert */}
      {conditions && conditions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Boundary Invariant Conditions:</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {conditions.map((cond, cIdx) => (
              <li key={cIdx}>{cond}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
