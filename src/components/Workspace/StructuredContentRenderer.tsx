import React from 'react';
import { Table as TableIcon, Calculator, Clock, CheckCircle2, Sigma, ArrowRight, Quote } from 'lucide-react';
import { NeuronAnatomyDiagram } from './NeuronAnatomyDiagram';

interface StructuredContentRendererProps {
  content: string;
  isQuoteMatched?: boolean;
  highlightRef?: React.RefObject<HTMLDivElement>;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
  title?: string;
}

interface ParsedCalculationBlock {
  type: 'turnaround' | 'waiting' | 'general';
  title: string;
  formula?: string;
  steps: { label: string; calculation: string; result: string }[];
  average?: { label: string; value: string };
}

export const StructuredContentRenderer: React.FC<StructuredContentRendererProps> = ({
  content,
  isQuoteMatched,
  highlightRef
}) => {
  if (!content) return null;

  // Split into paragraphs / blocks
  const blocks = content.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  // Helper: check if a text block contains a CPU scheduling / process table
  const tryParseTable = (text: string): ParsedTable | null => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    // Check for markdown table with |
    if (lines.some(l => l.includes('|'))) {
      const tableLines = lines.filter(l => l.includes('|'));
      if (tableLines.length >= 2) {
        const parseRow = (line: string) =>
          line.split('|').map(c => c.trim()).filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));

        const rawHeaders = parseRow(tableLines[0]);
        const dataLines = tableLines.slice(1).filter(l => !l.match(/^[\s\|:-]+$/));
        const rows = dataLines.map(parseRow);

        if (rawHeaders.length >= 2 && rows.length >= 1) {
          return {
            title: lines[0] && !lines[0].includes('|') ? lines[0] : undefined,
            headers: rawHeaders,
            rows
          };
        }
      }
    }

    return null;
  };

  // Helper: check if a text block represents turnaround or waiting time calculation steps
  const tryParseCalculations = (text: string): ParsedCalculationBlock | null => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    const lower = text.toLowerCase();
    const isTurnaround = lower.includes('turnaround time') || lower.includes('tat =') || lower.includes('tat:');
    const isWaiting = lower.includes('waiting time') || lower.includes('wt =') || lower.includes('wt:');

    if (!isTurnaround && !isWaiting) return null;

    const steps: { label: string; calculation: string; result: string }[] = [];
    let average: { label: string; value: string } | undefined = undefined;
    let formula: string | undefined = undefined;

    // Extract formula if present
    const formulaLine = lines.find(l => l.includes(' = ') && (l.toLowerCase().includes('time') || l.includes('CT') || l.includes('TAT')));
    if (formulaLine && !formulaLine.startsWith('P') && !formulaLine.toLowerCase().includes('average')) {
      formula = formulaLine.replace(/^[#*-]\s*/, '');
    }

    for (const line of lines) {
      if (line.toLowerCase().includes('average')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          average = {
            label: parts[0].trim().replace(/^[#*-]\s*/, ''),
            value: parts.slice(1).join('=').trim()
          };
        } else {
          average = {
            label: isTurnaround ? 'Average Turnaround Time' : 'Average Waiting Time',
            value: line.trim()
          };
        }
        continue;
      }

      // Check for process step like "P1: 4 - 0 = 4" or "Process 1: CT - AT = 4 - 0 = 4"
      const match = line.match(/^(P\d+|Process\s*\d+|Task\s*\d+)[:\s]+(.+?)\s*=\s*([^=\n]+)$/i);
      if (match) {
        steps.push({
          label: match[1].trim(),
          calculation: match[2].trim(),
          result: match[3].trim()
        });
      }
    }

    if (steps.length >= 2 || average) {
      return {
        type: isTurnaround ? 'turnaround' : 'waiting',
        title: isTurnaround ? 'Turnaround Time (TAT) Derivations' : 'Waiting Time (WT) Derivations',
        formula: formula || (isTurnaround ? 'TAT = Completion Time - Arrival Time' : 'WT = Turnaround Time - Burst Time'),
        steps,
        average
      };
    }

    return null;
  };

  return (
    <div
      ref={isQuoteMatched ? highlightRef : undefined}
      className={`space-y-4 text-xs sm:text-sm font-sans transition-all ${
        isQuoteMatched ? 'p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700' : ''
      }`}
    >
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();

        // 1. Check for Fig 1.1 Fine structure of a neuron diagram trigger
        if (trimmed.includes('Fig. 1.1') || trimmed.includes('Fine structure of a neuron')) {
          return (
            <div key={bIdx} className="my-4">
              <NeuronAnatomyDiagram />
            </div>
          );
        }

        // 2. Check for highlighted quote box (e.g. "> Neurons are the structural and functional building blocks...")
        if (trimmed.startsWith('>') || (trimmed.startsWith('"') && trimmed.includes('Neurons are the structural'))) {
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

        // 3. Try parsing as table
        const table = tryParseTable(block);
        if (table) {
          return (
            <div key={bIdx} className="my-4 font-sans space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <TableIcon className="w-4 h-4 text-brand-500" />
                <span>{table.title || 'Structured Data Table'}</span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/80 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      <tr>
                        {table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="py-2.5 px-4 font-bold border-r border-slate-200 dark:border-slate-800 last:border-r-0 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800 last:border-r-0 font-medium">
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
        }

        // 4. Try parsing as calculation block
        const calc = tryParseCalculations(block);
        if (calc) {
          return (
            <div key={bIdx} className="my-4 font-sans p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-1 border-b border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                    {calc.title}
                  </span>
                </div>
                {calc.formula && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {calc.formula}
                  </span>
                )}
              </div>

              {/* Step by step process rows */}
              {calc.steps.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                  {calc.steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between shadow-2xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{st.label}:</span>
                      <span className="text-slate-500 dark:text-slate-400">{st.calculation}</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono">= {st.result}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Average summary metric card */}
              {calc.average && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{calc.average.label}:</span>
                  </div>
                  <span className="text-sm font-black font-mono text-indigo-700 dark:text-indigo-300">
                    {calc.average.value}
                  </span>
                </div>
              )}
            </div>
          );
        }

        // 5. Two-column / textbook formatting if text has "Neurons. The cell body" or section outlines
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

        // 6. Fallback: formatted paragraph with bold leading terms
        return (
          <p key={bIdx} className="leading-7 break-words whitespace-pre-wrap select-text text-slate-800 dark:text-slate-200">
            {block}
          </p>
        );
      })}
    </div>
  );
};
