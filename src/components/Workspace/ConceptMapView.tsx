import React, { useState } from 'react';
import {
  Network,
  Info,
  ExternalLink,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ConceptMapData, ConceptNode, SourceCitation } from '../../types';

interface ConceptMapViewProps {
  conceptMap: ConceptMapData;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const ConceptMapView: React.FC<ConceptMapViewProps> = ({
  conceptMap,
  onNavigateToCitation
}) => {
  const nodes = Array.isArray(conceptMap?.nodes) ? conceptMap.nodes : [];
  const edges = Array.isArray(conceptMap?.edges) ? conceptMap.edges : [];
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(nodes[0] || null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const categories = [
    { id: 'all', label: 'All Elements', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'core', label: 'Core Principles', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
    { id: 'mechanism', label: 'Mechanisms', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
    { id: 'equation', label: 'Formulas', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
    { id: 'condition', label: 'Boundary Conditions', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
    { id: 'application', label: 'Architecture', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  ];

  const filteredNodes = activeCategory === 'all'
    ? nodes
    : nodes.filter(n => n.category === activeCategory);

  // Layout node positions dynamically in a responsive hierarchical layout
  const totalNodes = nodes.length;
  const nodePositions = nodes.reduce((acc, node, index) => {
    // Arrange in 2-3 visual layers
    let x = 160;
    let y = 140;

    if (node.category === 'core') {
      x = 160;
      y = 200;
    } else if (node.category === 'condition') {
      x = 420;
      y = 120 + (index % 2) * 160;
    } else if (node.category === 'equation' || node.category === 'mechanism') {
      x = 420;
      y = 280 + (index % 2) * 140;
    } else {
      x = 700;
      y = 220 + (index % 2) * 140;
    }

    acc[node.id] = { x, y };
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  const getNodeColor = (cat: ConceptNode['category']) => {
    switch (cat) {
      case 'core': return { bg: 'fill-blue-500', stroke: 'stroke-blue-600', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
      case 'mechanism': return { bg: 'fill-purple-500', stroke: 'stroke-purple-600', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'equation': return { bg: 'fill-emerald-500', stroke: 'stroke-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'condition': return { bg: 'fill-amber-500', stroke: 'stroke-amber-600', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
      default: return { bg: 'fill-rose-500', stroke: 'stroke-rose-600', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(z => Math.min(1.4, z + 0.1))}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Graph Area and Node Inspector split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive SVG Canvas */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="transition-transform duration-200"
          >
            <svg
              width="900"
              height="480"
              className="overflow-visible select-none"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Edge Connections with Prerequisite Labels */}
              {edges.map((edge, idx) => {
                const start = nodePositions[edge.from] || { x: 150, y: 150 };
                const end = nodePositions[edge.to] || { x: 450, y: 150 };

                // Draw smooth bezier curve
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const mx = (start.x + end.x) / 2;
                const my = (start.y + end.y) / 2;

                return (
                  <g key={idx} className="cursor-pointer group">
                    <path
                      d={`M ${start.x} ${start.y} C ${start.x + dx / 2} ${start.y}, ${end.x - dx / 2} ${end.y}, ${end.x} ${end.y}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      markerEnd="url(#arrow)"
                      className="group-hover:stroke-brand-500 transition-colors"
                    />
                    <rect
                      x={mx - 45}
                      y={my - 10}
                      width="90"
                      height="20"
                      rx="4"
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      className="dark:fill-slate-900 dark:stroke-slate-700"
                    />
                    <text
                      x={mx}
                      y={my + 3}
                      textAnchor="middle"
                      className="text-[9px] fill-slate-500 dark:fill-slate-400 font-sans font-medium pointer-events-none"
                    >
                      {edge.relation}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const pos = nodePositions[node.id] || { x: 200, y: 200 };
                const isSelected = selectedNode?.id === node.id;
                const colors = getNodeColor(node.category);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    {/* Shadow / selection halo */}
                    {isSelected && (
                      <circle
                        r="38"
                        className="fill-brand-500/20 stroke-brand-500 stroke-2 animate-pulse"
                      />
                    )}

                    {/* Main Node Bubble */}
                    <circle
                      r="30"
                      className={`${colors.bg} stroke-white dark:stroke-slate-900 stroke-2 transition-transform duration-200 group-hover:scale-110 shadow-lg`}
                    />

                    {/* Inner Icon Indicator */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      className="fill-white font-bold text-xs pointer-events-none"
                    >
                      {node.category === 'equation' ? 'Σ' : node.category === 'condition' ? '!' : '●'}
                    </text>

                    {/* Node Label Text */}
                    <text
                      textAnchor="middle"
                      dy="46"
                      className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-200 pointer-events-none select-none max-w-[120px]"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Node Details & Citation Inspector */}
        {selectedNode && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getNodeColor(selectedNode.category).badge}`}>
                {selectedNode.category}
              </span>

              <span className="text-xs text-slate-400 font-mono">
                {selectedNode.importance} priority
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedNode.label}
            </h3>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                Concept Synthesis
              </div>
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {selectedNode.summary}
              </p>
            </div>

            {/* Prerequisites */}
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-brand-500" />
                <span>Prerequisites to Understand First</span>
              </div>
              {selectedNode.prerequisites.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.prerequisites.map((pId) => {
                    const req = conceptMap.nodes.find(n => n.id === pId);
                    return (
                      <span
                        key={pId}
                        onClick={() => req && setSelectedNode(req)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        {req ? req.label : pId}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 italic">Foundational concept (No prerequisites required).</p>
              )}
            </div>

            {/* Source Reference & Navigation */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Source Citation Traceability</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-semibold">
                  <span>Page {selectedNode.sourceCitation.pageNumber}</span>
                  <span className="truncate max-w-[160px]">{selectedNode.sourceCitation.sectionTitle}</span>
                </div>

                <blockquote className="font-serif italic text-slate-700 dark:text-slate-300 border-l-2 border-amber-400 pl-2">
                  "{selectedNode.sourceCitation.exactQuote}"
                </blockquote>

                <button
                  onClick={() => onNavigateToCitation(selectedNode.sourceCitation)}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Jump & Highlight in Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
