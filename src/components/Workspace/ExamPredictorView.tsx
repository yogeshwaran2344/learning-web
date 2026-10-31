import React, { useState, useMemo } from 'react';
import {
  Award,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Filter,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { AcademicDocument, ExamQuestionItem, ExamQuestionMarks, SourceCitation } from '../../types';
import { ExamPredictorService } from '../../services/examPredictorService';

interface ExamPredictorViewProps {
  document: AcademicDocument;
  initialTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const ExamPredictorView: React.FC<ExamPredictorViewProps> = ({
  document,
  initialTopicId,
  onNavigateToCitation
}) => {
  const [selectedMarksFilter, setSelectedMarksFilter] = useState<'all' | ExamQuestionMarks>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate questions
  const allQuestions = useMemo(() => {
    return ExamPredictorService.generateExamQuestions(document, initialTopicId);
  }, [document, initialTopicId]);

  // Counts by marks
  const counts = useMemo(() => {
    return {
      all: allQuestions.length,
      5: allQuestions.filter(q => q.marks === 5).length,
      7: allQuestions.filter(q => q.marks === 7).length,
      8: allQuestions.filter(q => q.marks === 8).length,
      10: allQuestions.filter(q => q.marks === 10).length
    };
  }, [allQuestions]);

  // Filtered list
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchesMarks = selectedMarksFilter === 'all' || q.marks === selectedMarksFilter;
      const matchesSearch = !searchQuery.trim() ||
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topicTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.modelAnswer.introduction.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMarks && matchesSearch;
    });
  }, [allQuestions, selectedMarksFilter, searchQuery]);

  const toggleAnswer = (id: string) => {
    setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRubric = (id: string) => {
    setExpandedRubrics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyModelAnswer = (q: ExamQuestionItem) => {
    const formatted = `QUESTION (${q.marks} MARKS) - ${q.topicTitle}\n` +
      `Q: ${q.questionText}\n\n` +
      `MODEL ANSWER:\n` +
      `${q.modelAnswer.introduction}\n\n` +
      q.modelAnswer.structuredSections.map(s => `${s.heading}\n${s.content}`).join('\n\n') +
      (q.modelAnswer.workedCalculation ? `\n\nWORKED CALCULATION:\n${q.modelAnswer.workedCalculation.steps.join('\n')}\nFinal: ${q.modelAnswer.workedCalculation.finalResult}` : '') +
      `\n\nCONCLUSION:\n${q.modelAnswer.summaryConclusion}\n\n` +
      `EXAMINER TIP: ${q.examinerTip}\n`;

    navigator.clipboard.writeText(formatted);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getMarkBadgeStyle = (marks: ExamQuestionMarks) => {
    switch (marks) {
      case 5:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 7:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 8:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 10:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Predicted Exam Question Bank & Model Answers
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Exam Blueprint
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Predicted university & board examination questions categorized by mark weightage (5M, 7M, 8M, 10M) with complete examiner model answers and grading rubrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{allQuestions.length} Predicted Questions</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Marks Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedMarksFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMarksFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Questions ({counts.all})
          </button>
          <button
            onClick={() => setSelectedMarksFilter(5)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMarksFilter === 5
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span>5 Markers</span>
            <span className="text-[10px] opacity-80">({counts[5]})</span>
          </button>
          <button
            onClick={() => setSelectedMarksFilter(7)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMarksFilter === 7
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            <span>7 Markers</span>
            <span className="text-[10px] opacity-80">({counts[7]})</span>
          </button>
          <button
            onClick={() => setSelectedMarksFilter(8)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMarksFilter === 8
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60'
            }`}
          >
            <span>8 Markers</span>
            <span className="text-[10px] opacity-80">({counts[8]})</span>
          </button>
          <button
            onClick={() => setSelectedMarksFilter(10)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMarksFilter === 10
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/60'
            }`}
          >
            <span>10 Markers</span>
            <span className="text-[10px] opacity-80">({counts[10]})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or keywords..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No questions found matching your filter criteria.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isAnswerOpen = expandedAnswers[q.id] !== false; // Open by default
            const isRubricOpen = expandedRubrics[q.id] || false;

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Question Card Top Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${getMarkBadgeStyle(q.marks)}`}>
                        {q.marks} MARKS
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        • {q.topicTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {q.expectedTimeMinutes} mins
                      </span>
                      <span>•</span>
                      <span className="font-mono">{q.targetWordCount}</span>
                      <span>•</span>
                      <button
                        onClick={() => onNavigateToCitation(q.sourceCitation)}
                        className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline font-medium"
                      >
                        <span>P. {q.sourceCitation.pageNumber}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-sm md:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    <span className="text-amber-600 dark:text-amber-400 mr-1.5">Q:</span>
                    {q.questionText}
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAnswer(q.id)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{isAnswerOpen ? 'Hide Model Answer' : 'View Model Answer'}</span>
                        {isAnswerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => toggleRubric(q.id)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{isRubricOpen ? 'Hide Marking Rubric' : `Marking Scheme (${q.marks}M)`}</span>
                        {isRubricOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => copyModelAnswer(q)}
                      className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      {copiedId === q.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Model Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Marking Scheme Drawer (Collapsible) */}
                {isRubricOpen && (
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/80 dark:border-amber-800/60 text-xs space-y-3">
                    <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600" />
                        Examiner's Marking Scheme ({q.marks} Marks Breakdown)
                      </span>
                      <span className="font-mono text-[11px] text-amber-800 dark:text-amber-300">
                        Total: {q.marks} Marks
                      </span>
                    </div>

                    <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 overflow-hidden bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-100/60 dark:bg-amber-950/60 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          <tr>
                            <th className="p-2.5">Grading Criteria & Performance Deliverable</th>
                            <th className="p-2.5 text-right w-24">Marks Awarded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {q.markingScheme.map((item, mIdx) => (
                            <tr key={mIdx}>
                              <td className="p-2.5 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{item.criteria}</span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                                {item.marksAwarded} M
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Examiner's Scoring Tip:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {q.examinerTip}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/60">
                        <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Common Examiner Pitfalls to Avoid:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                          {q.commonPitfallsToAvoid.map((pitfall, pIdx) => (
                            <li key={pIdx}>{pitfall}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Model Answer Body */}
                {isAnswerOpen && (
                  <div className="p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/50 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200">
                        Examiner's Full Model Answer (Top Score Structure)
                      </span>
                    </div>

                    {/* Introduction */}
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide text-brand-600 dark:text-brand-400">
                        Formal Academic Definition & Overview:
                      </div>
                      <p className="leading-relaxed bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 font-serif text-slate-800 dark:text-slate-200">
                        {q.modelAnswer.introduction}
                      </p>
                    </div>

                    {/* Structured Sections */}
                    <div className="space-y-4">
                      {q.modelAnswer.structuredSections.map((sec, sIdx) => (
                        <div key={sIdx} className="space-y-1.5">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            <span>{sec.heading}</span>
                          </h4>
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-2">
                            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                              {sec.content}
                            </p>
                            {sec.keyPoints && sec.keyPoints.length > 0 && (
                              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-400 font-sans">
                                {sec.keyPoints.map((pt, ptIdx) => (
                                  <li key={ptIdx}>{pt}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Diagram or Flow Steps (if present) */}
                    {q.modelAnswer.diagramAsciiOrSteps && q.modelAnswer.diagramAsciiOrSteps.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                          <span>Architectural Diagram / Flow Schema:</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-snug">
                          {q.modelAnswer.diagramAsciiOrSteps.map((line, lIdx) => (
                            <div key={lIdx}>{line}</div>
                          ))}
                        </div>
                        {q.modelAnswer.diagramDescription && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Figure: {q.modelAnswer.diagramDescription}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Worked Calculation (if present) */}
                    {q.modelAnswer.workedCalculation && (
                      <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 space-y-2">
                        <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                          <span>Step-by-Step Problem Solving & Calculations:</span>
                          <span className="font-mono text-[10px] uppercase text-emerald-700 dark:text-emerald-400">
                            Numerical Validation
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-mono space-y-1">
                          <div className="text-slate-500 text-[11px]">
                            Given: {q.modelAnswer.workedCalculation.given}
                          </div>
                          {q.modelAnswer.workedCalculation.steps.map((step, stIdx) => (
                            <div key={stIdx} className="pl-2 border-l-2 border-emerald-400">
                              {step}
                            </div>
                          ))}
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 font-bold text-emerald-800 dark:text-emerald-300 mt-2 border border-emerald-200 dark:border-emerald-800">
                            Final Answer: {q.modelAnswer.workedCalculation.finalResult}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conclusion */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 italic">
                      <span className="font-bold not-italic text-slate-800 dark:text-slate-200 mr-1">
                        Examiner Synthesis:
                      </span>
                      {q.modelAnswer.summaryConclusion}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
