import React, { useState, useMemo } from 'react';
import {
  Network,
  ExternalLink,
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { AcademicDocument, CrossDocumentKnowledgeGraphData, CrossDocGraphNode, SourceCitation } from '../../types';
import { CrossDocumentGraphService } from '../../services/crossDocumentGraphService';

interface CrossDocumentKnowledgeGraphPageProps {
  documents: AcademicDocument[];
  onNavigateToStudio: (docId: string, pageNumber?: number) => void;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const CrossDocumentKnowledgeGraphPage: React.FC<CrossDocumentKnowledgeGraphPageProps> = ({
  documents,
  onNavigateToStudio,
  onNavigateToCitation
}) => {
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<CrossDocGraphNode | null>(null);

  const graphData: CrossDocumentKnowledgeGraphData = useMemo(() => {
    return CrossDocumentGraphService.buildCrossDocGraph(documents);
  }, [documents]);

  const filteredNodes = useMemo(() => {
    if (selectedDocFilter === 'all') return graphData.nodes;
    return graphData.nodes.filter(n => n.documentId === selectedDocFilter);
  }, [graphData.nodes, selectedDocFilter]);

  // Set initial selected node
  if (!selectedNode && filteredNodes.length > 0) {
    setSelectedNode(filteredNodes[0]);
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Network className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">
              Cross-Document Knowledge Graph
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-900/60 text-blue-300 border border-blue-700/60">
              Global Library Synthesis
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Interconnected graph bridging concepts across all {documents.length} uploaded study materials in your academic library.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Uploaded Documents ({documents.length})</option>
              {documents.map(d => (
                <option key={d.id} value={d.id} className="bg-slate-900">{d.title}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.15))}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace: SVG Graph + Side Inspector Panel */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* SVG Graph Canvas */}
        <div className="flex-1 rounded-3xl bg-[#070b14] border border-slate-800 p-4 relative overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 960 520"
            className="w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing transition-transform"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <defs>
              <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Inter-Document Edges */}
            {graphData.edges.slice(0, 36).map((edge, idx) => {
              const srcIdx = graphData.nodes.findIndex(n => n.id === edge.sourceId);
              const tgtIdx = graphData.nodes.findIndex(n => n.id === edge.targetId);
              if (srcIdx === -1 || tgtIdx === -1) return null;

              // Calculate radial layout coordinates
              const total = Math.max(1, graphData.nodes.length);
              const angleSrc = (srcIdx / total) * 2 * Math.PI;
              const angleTgt = (tgtIdx / total) * 2 * Math.PI;
              const r = 180;
              const cx = 480;
              const cy = 260;

              const x1 = cx + r * Math.cos(angleSrc);
              const y1 = cy + r * Math.sin(angleSrc);
              const x2 = cx + r * Math.cos(angleTgt);
              const y2 = cy + r * Math.sin(angleTgt);

              const isSelected = selectedNode && (selectedNode.id === edge.sourceId || selectedNode.id === edge.targetId);

              return (
                <line
                  key={edge.id || idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isSelected ? '#38bdf8' : '#334155'}
                  strokeWidth={isSelected ? '2' : '1'}
                  strokeDasharray={edge.relationshipType === 'shares_formula' ? '4 2' : undefined}
                  opacity={isSelected ? 0.9 : 0.4}
                />
              );
            })}

            {/* Concept Nodes in Circle */}
            {filteredNodes.map((node, idx) => {
              const total = Math.max(1, filteredNodes.length);
              const angle = (idx / total) * 2 * Math.PI;
              const r = 180;
              const cx = 480;
              const cy = 260;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedNode(node)}
                >
                  {isSelected && (
                    <circle r="22" fill="url(#nodeGlow)" />
                  )}
                  <circle
                    r="12"
                    fill={isSelected ? '#38bdf8' : '#1e293b'}
                    stroke={isSelected ? '#ffffff' : '#64748b'}
                    strokeWidth="2"
                    className="transition-all group-hover:scale-125"
                  />
                  <text
                    x="16"
                    y="4"
                    fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                    fontSize="10"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Details Inspector */}
        {selectedNode && (
          <div className="w-full lg:w-96 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shrink-0 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                  {selectedNode.category}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Page {selectedNode.pageNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Document: {selectedNode.documentTitle}
                </span>
                <h3 className="text-base font-black text-white leading-snug mt-1">
                  {selectedNode.label}
                </h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {selectedNode.summary}
              </div>

              {selectedNode.citation && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 italic">
                  "{selectedNode.citation.exactQuote}"
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => onNavigateToCitation(selectedNode.citation)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Jump to Page {selectedNode.pageNumber} in Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigateToStudio(selectedNode.documentId, selectedNode.pageNumber)}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open in Learning Studio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
