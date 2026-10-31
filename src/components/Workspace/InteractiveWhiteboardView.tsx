import React, { useState, useMemo } from 'react';
import {
  PenTool,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Download,
  Sigma,
  GitBranch,
  Layers,
  ArrowRight,
  Info,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { AcademicDocument, SourceCitation, WhiteboardModel } from '../../types';
import { WhiteboardService } from '../../services/whiteboardService';

interface InteractiveWhiteboardViewProps {
  document: AcademicDocument;
  initialTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const InteractiveWhiteboardView: React.FC<InteractiveWhiteboardViewProps> = ({
  document,
  initialTopicId,
  onNavigateToCitation
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || 'overall');
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [promptInput, setPromptInput] = useState<string>('');
  const [customPromptActive, setCustomPromptActive] = useState<boolean>(false);

  const whiteboard: WhiteboardModel = useMemo(() => {
    return WhiteboardService.generateWhiteboardModel(document, selectedTopicId);
  }, [document, selectedTopicId]);

  const totalSteps = whiteboard.steps.length;
  const activeStep = whiteboard.steps[currentStepIdx] || whiteboard.steps[0];

  const handleNextStep = () => {
    setCurrentStepIdx(prev => Math.min(totalSteps - 1, prev + 1));
  };

  const handlePrevStep = () => {
    setCurrentStepIdx(prev => Math.max(0, prev - 1));
  };

  const handleCustomVisualPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setCustomPromptActive(true);
    setCurrentStepIdx(0);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <PenTool className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">
              AI Interactive Whiteboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-900/60 text-purple-300 border border-purple-700/60">
              Visual Conceptual Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual explanation canvas: dynamic diagrams, equations, flowcharts and step-by-step visual illustrations grounded in original lecture notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToCitation(whiteboard.sourceCitation)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 border border-purple-500/30 transition-all cursor-pointer"
            title="Inspect original source page"
          >
            <span>Jump to Page {whiteboard.sourceCitation.pageNumber}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Prompt Input Bar */}
      <form onSubmit={handleCustomVisualPrompt} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask AI to explain a concept visually (e.g. 'Explain the state transitions', 'Draw the formula breakdown')..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <Sparkles className="w-4 h-4 text-purple-400 absolute right-3.5 top-3" />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          <span>Illustrate</span>
        </button>
      </form>

      {/* Whiteboard Interactive Canvas Box */}
      <div className="rounded-3xl border border-slate-800 bg-[#070b14] p-6 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Whiteboard Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {whiteboard.topicTitle}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
              Step {currentStepIdx + 1} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIdx === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStepIdx === totalSteps - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStepIdx(0)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Reset Whiteboard"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Explanation Banner */}
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {activeStep.stepNumber}
              </span>
              <h4 className="text-sm font-bold text-purple-200">
                {activeStep.title}
              </h4>
            </div>
            <p className="text-xs text-slate-300 pl-8 leading-relaxed">
              {activeStep.explanation}
            </p>
          </div>

          {activeStep.formulaHighlight && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-purple-900 text-xs font-mono text-purple-300 shrink-0">
              $${activeStep.formulaHighlight}$$
            </div>
          )}
        </div>

        {/* SVG Flowchart & Diagram Canvas */}
        <div className="w-full overflow-x-auto py-4">
          <svg
            viewBox="0 0 960 340"
            className="w-full min-w-[760px] h-64 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-inner"
          >
            <defs>
              <marker
                id="wb-arrow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
            </defs>

            {/* Render Connections */}
            {whiteboard.visualConnections.map((conn, idx) => {
              const fromNode = whiteboard.visualNodes.find(n => n.id === conn.from);
              const toNode = whiteboard.visualNodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              return (
                <g key={idx}>
                  <line
                    x1={fromNode.x + 80}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#475569"
                    strokeWidth="2"
                    markerEnd="url(#wb-arrow)"
                    strokeDasharray="4 2"
                  />
                  {conn.label && (
                    <text
                      x={(fromNode.x + toNode.x) / 2 + 30}
                      y={(fromNode.y + toNode.y) / 2 - 8}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Nodes */}
            {whiteboard.visualNodes.map((node, nIdx) => {
              const isCurrentStepNode = nIdx <= currentStepIdx;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y - 28})`}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setCurrentStepIdx(Math.min(totalSteps - 1, nIdx))}
                >
                  <rect
                    width="140"
                    height="56"
                    rx="12"
                    fill={isCurrentStepNode ? '#0f172a' : '#020617'}
                    stroke={isCurrentStepNode ? node.color || '#a855f7' : '#334155'}
                    strokeWidth={isCurrentStepNode ? '2' : '1'}
                  />
                  <circle
                    cx="14"
                    cy="16"
                    r="4"
                    fill={node.color || '#a855f7'}
                  />
                  <text
                    x="24"
                    y="19"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>
                  {node.description && (
                    <text
                      x="14"
                      y="38"
                      fill="#94a3b8"
                      fontSize="9"
                    >
                      {node.description.length > 22 ? node.description.slice(0, 20) + '...' : node.description}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Governing Formulas Variable Breakdown */}
        {whiteboard.governingFormulas.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Sigma className="w-4 h-4 text-purple-400" />
              <span>Governing Equation & Component Variables:</span>
            </div>

            {whiteboard.governingFormulas.map((gf, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-purple-300">
                  $${gf.latex}$$
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                  {gf.variables.map((v, vIdx) => (
                    <div key={vIdx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="font-bold text-purple-300 block">{v.symbol}</span>
                      <span className="text-[11px] text-slate-400">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
