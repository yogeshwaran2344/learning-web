import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Network,
  Info,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Filter,
  Eye,
  Layers,
  GraduationCap,
  Calculator,
  Compass,
  ArrowRight,
  FolderTree,
  ListTree,
  Zap
} from 'lucide-react';
import {
  ConceptMapData,
  ConceptNode,
  ConceptEdge,
  SourceCitation,
  AcademicDocument,
  TopicConceptMap,
  IntelligentConceptBranch,
  IntelligentConceptChild,
  ConceptMapViewLevel
} from '../../types';
import { ConceptMapService } from '../../services/conceptMapService';

interface ConceptMapViewProps {
  conceptMap?: ConceptMapData;
  document?: AcademicDocument;
  initialTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const ConceptMapView: React.FC<ConceptMapViewProps> = ({
  conceptMap,
  document,
  initialTopicId,
  onNavigateToCitation
}) => {
  // 1. Build or retrieve the intelligent concept map suite
  const mapSuite = useMemo(() => {
    if (document) {
      return ConceptMapService.generateConceptMapSuite(document);
    }
    // Fallback if only conceptMap was supplied
    return null;
  }, [document]);

  // Topic Selection State (Section 3.5: One overall document map, one for each main topic)
  const [activeTopicId, setActiveTopicId] = useState<string>(() => {
    if (initialTopicId && initialTopicId !== 'overall') return initialTopicId;
    if (mapSuite?.topicMaps?.[0]) return mapSuite.topicMaps[0].topicId;
    return 'overall';
  });

  // When initialTopicId changes externally (e.g. clicked Learn This Topic), sync it
  useEffect(() => {
    if (initialTopicId) {
      setActiveTopicId(initialTopicId);
    }
  }, [initialTopicId]);

  // View Level State (Section 3.3: Overview, Detailed, Revision)
  const [viewLevel, setViewLevel] = useState<ConceptMapViewLevel>('detailed');

  // Display Mode: Interactive Graphical Map vs What-Comes-Under-What Hierarchy vs 1-Night-Before Cram
  const [displayMode, setDisplayMode] = useState<'graph' | 'tree' | 'cram'>('graph');

  // Interactive Branch Collapse State (Section 3.4)
  const [collapsedBranchIds, setCollapsedBranchIds] = useState<Set<string>>(new Set());

  // Zoom Level
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Selected item for the explanation side-panel (Section 3.6)
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    title: string;
    category: string;
    summary: string;
    formula?: string;
    importance?: string;
    sourceCitation: SourceCitation;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Determine currently active TopicConceptMap
  const activeMap: TopicConceptMap = useMemo(() => {
    let raw: TopicConceptMap;
    if (!mapSuite) {
      // Fallback: build a mock TopicConceptMap from conceptMap
      const nodes = Array.isArray(conceptMap?.nodes) ? conceptMap.nodes : [];
      const edges = Array.isArray(conceptMap?.edges) ? conceptMap.edges : [];
      raw = {
        id: 'map-legacy',
        topicId: 'overall',
        topicTitle: 'Document Concept Map',
        pageRange: [1, document?.pageCount || 1],
        centralConcept: document?.title?.toUpperCase() || 'CORE CONCEPTS',
        branches: [],
        nodes,
        edges
      };
    } else if (activeTopicId === 'overall') {
      raw = mapSuite.overallMap || {
        id: 'map-overall',
        topicId: 'overall',
        topicTitle: 'Overall Map',
        pageRange: [1, document?.pageCount || 1],
        centralConcept: document?.title?.toUpperCase() || 'CORE CONCEPTS',
        branches: [],
        nodes: [],
        edges: []
      };
    } else {
      const topicMaps = Array.isArray(mapSuite.topicMaps) ? mapSuite.topicMaps : [];
      const found = topicMaps.find(m => m.topicId === activeTopicId);
      raw = found || mapSuite.overallMap || {
        id: 'map-overall',
        topicId: 'overall',
        topicTitle: 'Overall Map',
        pageRange: [1, document?.pageCount || 1],
        centralConcept: document?.title?.toUpperCase() || 'CORE CONCEPTS',
        branches: [],
        nodes: [],
        edges: []
      };
    }

    return {
      ...raw,
      branches: Array.isArray(raw?.branches)
        ? raw.branches.map(b => ({
            ...b,
            children: Array.isArray(b?.children) ? b.children : []
          }))
        : [],
      nodes: Array.isArray(raw?.nodes) ? raw.nodes : [],
      edges: Array.isArray(raw?.edges) ? raw.edges : []
    };
  }, [mapSuite, activeTopicId, conceptMap, document]);

  // Initialize selected entity when active map changes
  useEffect(() => {
    if ((activeMap.branches || []).length > 0) {
      const firstBranch = activeMap.branches[0];
      const firstChild = (firstBranch?.children || [])[0];
      if (firstChild) {
        setSelectedEntity({
          id: firstChild.id,
          title: firstChild.label,
          category: firstChild.category || firstBranch?.category || 'general',
          summary: firstChild.explanation,
          formula: firstChild.formula,
          importance: firstChild.isImportant ? 'High Priority' : 'Core Concept',
          sourceCitation: firstChild.sourceCitation
        });
      } else if (firstBranch) {
        setSelectedEntity({
          id: firstBranch.id,
          title: firstBranch.label,
          category: firstBranch.category,
          summary: firstBranch.summary,
          sourceCitation: firstBranch.sourceCitation
        });
      }
    } else if ((activeMap.nodes || []).length > 0) {
      const first = activeMap.nodes[0];
      setSelectedEntity({
        id: first.id,
        title: first.label,
        category: first.category,
        summary: first.summary,
        importance: first.importance,
        sourceCitation: first.sourceCitation
      });
    }
  }, [activeMap]);

  // Section 3.3: Filter map based on View Level
  const { visibleBranches } = useMemo(() => {
    return ConceptMapService.filterMapByViewLevel(activeMap, viewLevel, collapsedBranchIds);
  }, [activeMap, viewLevel, collapsedBranchIds]);

  // Toggle Branch Collapse
  const handleToggleBranchCollapse = (branchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedBranchIds(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  // Section 3.4: Download Map as Image (PNG)
  const handleDownloadImage = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    try {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgEl);

      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = window.document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a'; // modern slate-900 background
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = window.document.createElement('a');
          downloadLink.download = `learnova_concept_map_${activeMap.topicTitle.replace(/\s+/g, '_').toLowerCase()}.png`;
          downloadLink.href = pngUrl;
          downloadLink.click();
          URL.revokeObjectURL(url);
        }
      };
      image.src = url;
    } catch (err) {
      console.warn('Image download fallback:', err);
    }
  };

  // Section 3.4: Download Map as PDF / Printable Summary
  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const branchesHtml = activeMap.branches.map(b => `
      <div style="margin-bottom: 18px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 14px;">${b.label} <span style="font-size: 11px; color: #64748b;">(${b.category.toUpperCase()})</span></h3>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #334155;">${b.summary}</p>
        <div style="margin-left: 12px;">
          ${b.children.map(c => `
            <div style="margin-top: 6px; font-size: 12px;">
              <strong>• ${c.label}</strong>: ${c.explanation}
              ${c.formula ? `<div style="font-family: monospace; background: #f8fafc; padding: 3px 6px; border-radius: 4px; margin-top: 2px; color: #0f766e;">Formula: ${c.formula}</div>` : ''}
              <div style="font-size: 10px; color: #94a3b8; margin-top: 1px;">Source: Page ${c.sourceCitation.pageNumber}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeMap.centralConcept} - LEARNOVA Concept Map</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0f172a; max-width: 800px; margin: auto; }
            h1 { font-size: 22px; color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 6px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${activeMap.centralConcept}</h1>
          <div class="meta">
            Document: <strong>${document?.title || 'Academic Notes'}</strong> |
            Topic: <strong>${activeMap.topicTitle}</strong> |
            Source Pages: <strong>${activeMap.pageRange ? `Pages ${activeMap.pageRange[0]}–${activeMap.pageRange[1]}` : 'Pages 1–1'}</strong>
          </div>
          ${branchesHtml}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Node Color Helper
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'core':
        return {
          bg: 'fill-blue-500',
          stroke: 'stroke-blue-400',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300',
          border: 'border-blue-500',
          text: 'text-blue-600 dark:text-blue-400',
          color: '#3b82f6'
        };
      case 'mechanism':
        return {
          bg: 'fill-purple-500',
          stroke: 'stroke-purple-400',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300',
          border: 'border-purple-500',
          text: 'text-purple-600 dark:text-purple-400',
          color: '#a855f7'
        };
      case 'equation':
        return {
          bg: 'fill-emerald-500',
          stroke: 'stroke-emerald-400',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
          border: 'border-emerald-500',
          text: 'text-emerald-600 dark:text-emerald-400',
          color: '#10b981'
        };
      case 'condition':
        return {
          bg: 'fill-amber-500',
          stroke: 'stroke-amber-400',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
          border: 'border-amber-500',
          text: 'text-amber-600 dark:text-amber-400',
          color: '#f59e0b'
        };
      default:
        return {
          bg: 'fill-indigo-500',
          stroke: 'stroke-indigo-400',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300',
          border: 'border-indigo-500',
          text: 'text-indigo-600 dark:text-indigo-400',
          color: '#6366f1'
        };
    }
  };

  // Compute Layout Positions for Radial / Hierarchical Branches
  // Center is at (180, canvasHeight / 2)
  const canvasWidth = 1000;
  const branchCount = Math.max(1, visibleBranches.length);
  const totalChildrenCount = visibleBranches.reduce((acc, b) => acc + (b.children?.length || 0), 0);
  const canvasHeight = Math.max(540, Math.max(branchCount * 95, totalChildrenCount * 55));

  const centerX = 160;
  const centerY = canvasHeight / 2;

  // Position branches vertically with smooth curved connectors
  const branchLayout = useMemo(() => {
    return visibleBranches.map((branch, bIdx) => {
      // Spread branches smoothly across vertical height
      const branchSpacing = (canvasHeight - 100) / (branchCount + 1);
      const branchY = 60 + (bIdx + 1) * branchSpacing;
      const branchX = 420;

      // Children layout
      const children = branch.children || [];
      const isCollapsed = collapsedBranchIds.has(branch.id);

      const childrenPositions = children.map((child, cIdx) => {
        const totalC = children.length;
        const cOffset = (cIdx - (totalC - 1) / 2) * 44;
        const childY = branchY + cOffset;
        const childX = 720;
        return {
          child,
          x: childX,
          y: childY
        };
      });

      return {
        branch,
        x: branchX,
        y: branchY,
        isCollapsed,
        childrenPositions
      };
    });
  }, [visibleBranches, branchCount, canvasHeight, collapsedBranchIds]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden select-none animate-fadeIn">
      {/* 3.5 Top Bar: Topic-by-Topic Selector */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Topic Focus:
          </span>
        </div>

        {/* Topic Pills Switcher (Desktop) & Select (Mobile) */}
        {mapSuite && (mapSuite.topicMaps || []).length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
            {/* Overall Document Map */}
            <button
              onClick={() => setActiveTopicId('overall')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTopicId === 'overall'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overall Document Map</span>
            </button>

            {/* Individual Topic Maps */}
            {mapSuite.topicMaps.map((tm, idx) => {
              const isActive = activeTopicId === tm.topicId;
              return (
                <button
                  key={tm.id}
                  onClick={() => setActiveTopicId(tm.topicId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                  title={tm.topicTitle}
                >
                  <span className="font-mono text-[10px] opacity-75">0{idx + 1}.</span>
                  <span className="max-w-[140px] truncate">{tm.topicTitle}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500">
            {activeMap.topicTitle}
          </span>
        )}
      </div>

      {/* 3.3 & 3.4 Controls Toolbar: Mode (Graph, Hierarchy Tree, Cram Sheet) + Views + Exports */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 text-xs">
        {/* Main Display Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setDisplayMode('graph')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              displayMode === 'graph'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Interactive Graphical Map"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Map Graph</span>
          </button>
          <button
            onClick={() => setDisplayMode('tree')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              displayMode === 'tree'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Syllabus Breakdown: What Subtopic Comes Under What"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Hierarchy (What Comes Under What)</span>
          </button>
          <button
            onClick={() => setDisplayMode('cram')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              displayMode === 'cram'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 font-bold'
            }`}
            title="High-Yield 1-Night-Before Exam Revision Sheet"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ 1-Night-Before Cram</span>
          </button>
        </div>

        {/* 3.3 View Level Switcher (shown in graph mode) */}
        {displayMode === 'graph' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              View:
            </span>
            <button
              onClick={() => setViewLevel('overview')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewLevel === 'overview'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Overview: Main topic and major branches"
            >
              Overview
            </button>
            <button
              onClick={() => setViewLevel('detailed')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewLevel === 'detailed'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Detailed: Main points and subtopics"
            >
              Detailed
            </button>
            <button
              onClick={() => setViewLevel('revision')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                viewLevel === 'revision'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Revision: Important keywords, formulas and definitions"
            >
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Revision</span>
            </button>
          </div>
        )}

        {/* Zoom & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3.4 & Checklist item 9: Image & PDF Export */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadImage}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download concept map as high-resolution image"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">PNG Image</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download structured concept map report as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span className="hidden sm:inline">PDF Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Hierarchy Tree View: Explicit "What Comes Under What" */}
      {displayMode === 'tree' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>What Comes Under What: Syllabus & Topic Hierarchy</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Every chapter, main topic, and nested subtopic mapped directly to original lecture slides and pages.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold font-mono shrink-0">
              {(document?.topicHierarchy?.chapters || []).length} Chapters • {(document?.topicHierarchy?.totalTopicsCount || 0)} Topics
            </span>
          </div>

          {(document?.topicHierarchy?.chapters || []).map((chap, cIdx) => (
            <div key={chap.id || cIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                    Chapter {chap.chapterNumber || cIdx + 1}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {chap.title}
                  </h4>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Pages {chap.pageRange?.[0] || 1}–{chap.pageRange?.[1] || 1} • {(chap.topics || []).length} Topics
                </span>
              </div>

              <div className="space-y-4 pl-2">
                {(chap.topics || []).map((topic, tIdx) => (
                  <div key={topic.id || tIdx} className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {topic.topicNumber ? `${topic.topicNumber} ` : ''}{topic.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-semibold">
                        Pages {topic.pageRange?.[0] || 1}–{topic.pageRange?.[1] || 1}
                      </span>
                    </div>

                    {topic.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pl-4 border-l-2 border-slate-200 dark:border-slate-700 leading-relaxed">
                        {topic.description}
                      </p>
                    )}

                    {/* Subtopics under this topic ("What comes under what") */}
                    <div className="pl-4 border-l-2 border-emerald-500/50 space-y-2 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Subtopics under {topic.title} ({(topic.subtopics || []).length}):
                      </div>
                      {(topic.subtopics || []).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(topic.subtopics || []).map((sub, sIdx) => (
                            <div key={sub.id || sIdx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  🔹 {sub.title}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  p. {sub.pageRange?.[0] || topic.pageRange?.[0] || 1}
                                </span>
                              </div>
                              {sub.summary && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                  {sub.summary}
                                </p>
                              )}
                              {(sub.importantConcepts || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {(sub.importantConcepts || []).map((c, i) => (
                                    <span key={i} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Foundational single-concept topic.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Night-Before Exam Cram View */}
      {displayMode === 'cram' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="bg-linear-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-300 dark:border-amber-800/60 rounded-3xl p-6">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-base">
              <Zap className="w-5 h-5 fill-current" />
              <span>⚡ 1-Night-Before Exam Cram Sheet: High-Yield Fast Scoring</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Exam-tested definitions, intuitive everyday analogies, mandatory diagrams, and exact point checklists examiners look for to award full marks.
            </p>
          </div>

          {(document?.topicHierarchy?.chapters || []).flatMap(c => c.topics || []).map((topic, tIdx) => {
            const cleanTitle = topic.title;
            const subList = (topic.subtopics || []).map(s => s.title).join(', ');
            return (
              <div key={topic.id || tIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Topic #{tIdx + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {cleanTitle}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                    Pages {topic.pageRange?.[0] || 1}–{topic.pageRange?.[1] || 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
                    <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>1. Core Definition (Write this first):</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                      {topic.description || `${cleanTitle} is a governing academic concept formalized across Pages ${topic.pageRange?.[0] || 1}–${topic.pageRange?.[1] || 1}.`}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 space-y-1.5">
                    <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>2. Everyday Analogy (To understand instantly):</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic">
                      "Think of this like an essential coordinator: it maintains system rules and state transitions so processes execute without resource conflict or data corruption."
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <FolderTree className="w-3.5 h-3.5" />
                      <span>3. Subtopics & Concepts Under This:</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                      {subList ? subList : 'Preserves verified core formulations and invariant boundary constraints.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 space-y-1.5">
                    <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>4. Exam Full Marks Checklist:</span>
                    </span>
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                      <li>State formal definition and purpose clearly in 2 lines.</li>
                      <li>Draw the architecture block diagram / state flow.</li>
                      <li>List all mathematical formulas and boundary conditions.</li>
                      <li>Write step-by-step working if numerical values are given.</li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Main Graphical Map Diagram Area & 3.6 Branch Explanation Side Panel */}
      {displayMode === 'graph' && (
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* SVG Diagram Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 flex items-center justify-center">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out'
            }}
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              className="overflow-visible select-none"
            >
              <defs>
                <linearGradient id="centralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Curve connections from Center to Branches */}
              {branchLayout.map(({ branch, x, y }) => {
                const isSelected = selectedEntity?.id === branch.id;
                const theme = getCategoryTheme(branch.category);
                const dx = x - centerX;
                const pathD = `M ${centerX + 80} ${centerY} C ${centerX + 80 + dx * 0.5} ${centerY}, ${x - dx * 0.4} ${y}, ${x} ${y}`;

                return (
                  <path
                    key={`edge-center-${branch.id}`}
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? '#3b82f6' : theme.color}
                    strokeWidth={isSelected ? '2.5' : '1.75'}
                    strokeDasharray={branch.category === 'condition' ? '4 2' : 'none'}
                    opacity={isSelected ? 1 : 0.65}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* Curve connections from Branches to Children */}
              {branchLayout.map(({ branch, x: bX, y: bY, childrenPositions, isCollapsed }) => {
                if (isCollapsed || viewLevel === 'overview') return null;

                const theme = getCategoryTheme(branch.category);

                return childrenPositions.map(({ child, x: cX, y: cY }) => {
                  const isSelected = selectedEntity?.id === child.id;
                  const dx = cX - bX;
                  const pathD = `M ${bX + 80} ${bY} C ${bX + 80 + dx * 0.5} ${bY}, ${cX - dx * 0.4} ${cY}, ${cX} ${cY}`;

                  return (
                    <path
                      key={`edge-child-${child.id}`}
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? '#3b82f6' : theme.color}
                      strokeWidth={isSelected ? '2' : '1.25'}
                      strokeDasharray={child.formula ? '3 2' : 'none'}
                      opacity={isSelected ? 1 : 0.45}
                      className="transition-all duration-300"
                    />
                  );
                });
              })}

              {/* 1. Central Concept Node */}
              <g
                transform={`translate(${centerX}, ${centerY})`}
                onClick={() => {
                  const pStart = activeMap.pageRange?.[0] || 1;
                  const pEnd = activeMap.pageRange?.[1] || pStart;
                  const bLen = (activeMap.branches || []).length;
                  setSelectedEntity({
                    id: activeMap.id,
                    title: activeMap.centralConcept || 'Central Concept',
                    category: 'core',
                    summary: `Central topic encompassing pages ${pStart}–${pEnd}. Formulates ${bLen} primary conceptual branches.`,
                    importance: 'Main Topic',
                    sourceCitation: activeMap.branches?.[0]?.sourceCitation || {
                      id: `cite-${activeMap.id}`,
                      documentId: document?.id || '',
                      pageNumber: pStart,
                      sectionTitle: activeMap.topicTitle || 'Central Concept',
                      exactQuote: activeMap.centralConcept || 'Central Concept',
                      contextSnippet: 'Central concept map focus'
                    }
                  });
                }}
                className="cursor-pointer group"
              >
                {/* Glow ring */}
                <rect
                  x="-85"
                  y="-34"
                  width="170"
                  height="68"
                  rx="20"
                  fill="#2563eb"
                  opacity="0.25"
                  className="animate-pulse"
                />

                {/* Main Central Card */}
                <rect
                  x="-80"
                  y="-30"
                  width="160"
                  height="60"
                  rx="18"
                  fill="url(#centralGradient)"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  className="drop-shadow-xl transition-transform group-hover:scale-105"
                />

                <text
                  textAnchor="middle"
                  dy="-4"
                  fill="#93c5fd"
                  fontSize="9"
                  fontWeight="bold"
                  letterSpacing="1"
                >
                  MAIN CONCEPT
                </text>

                <text
                  textAnchor="middle"
                  dy="15"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="900"
                  className="tracking-tight"
                >
                  {activeMap.centralConcept.length > 20
                    ? activeMap.centralConcept.slice(0, 18) + '...'
                    : activeMap.centralConcept}
                </text>
              </g>

              {/* 2. Main Branches (4–7 Primary Branches) */}
              {branchLayout.map(({ branch, x, y, isCollapsed, childrenPositions }) => {
                const isSelected = selectedEntity?.id === branch.id;
                const theme = getCategoryTheme(branch.category);
                const childrenCount = branch.children?.length || 0;

                return (
                  <g
                    key={branch.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => {
                      setSelectedEntity({
                        id: branch.id,
                        title: branch.label,
                        category: branch.category,
                        summary: branch.summary,
                        importance: 'Major Branch',
                        sourceCitation: branch.sourceCitation
                      });
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Active Halo */}
                    {isSelected && (
                      <rect
                        x="-10"
                        y="-22"
                        width="180"
                        height="44"
                        rx="14"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        filter="url(#glow)"
                      />
                    )}

                    {/* Branch Pill Box */}
                    <rect
                      x="0"
                      y="-18"
                      width="160"
                      height="36"
                      rx="12"
                      fill="#1e293b"
                      stroke={theme.color}
                      strokeWidth={isSelected ? '2' : '1.5'}
                      className="transition-transform group-hover:scale-102"
                    />

                    {/* Category indicator icon bubble */}
                    <circle
                      cx="14"
                      cy="0"
                      r="6"
                      fill={theme.color}
                    />

                    {/* Branch Label */}
                    <text
                      x="26"
                      y="4"
                      fill="#f8fafc"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {branch.label.length > 18 ? branch.label.slice(0, 16) + '...' : branch.label}
                    </text>

                    {/* Expand/Collapse Toggle Button for Children (3.4) */}
                    {childrenCount > 0 && viewLevel !== 'overview' && (
                      <g
                        transform="translate(142, 0)"
                        onClick={(e) => handleToggleBranchCollapse(branch.id, e)}
                        className="hover:opacity-100 transition-opacity"
                      >
                        <circle
                          r="9"
                          fill="#334155"
                          stroke={isCollapsed ? '#f59e0b' : '#64748b'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          fill={isCollapsed ? '#fbbf24' : '#cbd5e1'}
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {isCollapsed ? `+${childrenCount}` : '−'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 3. Subtopics / Child Nodes (Section 3.1 & 3.2: Short Keywords, Formulas) */}
              {branchLayout.map(({ branch, childrenPositions, isCollapsed }) => {
                if (isCollapsed || viewLevel === 'overview') return null;

                const theme = getCategoryTheme(branch.category);

                return childrenPositions.map(({ child, x, y }) => {
                  const isSelected = selectedEntity?.id === child.id;
                  const isFormula = Boolean(child.formula);

                  return (
                    <g
                      key={child.id}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => {
                        setSelectedEntity({
                          id: child.id,
                          title: child.label,
                          category: child.category || branch.category,
                          summary: child.explanation,
                          formula: child.formula,
                          importance: child.isImportant ? 'High Yield' : 'Subtopic',
                          sourceCitation: child.sourceCitation
                        });
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Active Halo */}
                      {isSelected && (
                        <rect
                          x="-6"
                          y="-17"
                          width="212"
                          height="34"
                          rx="10"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          filter="url(#glow)"
                        />
                      )}

                      {/* Child Card Box */}
                      <rect
                        x="0"
                        y="-14"
                        width="200"
                        height="28"
                        rx="8"
                        fill={isFormula ? '#064e3b' : '#0f172a'}
                        stroke={isFormula ? '#10b981' : isSelected ? '#38bdf8' : '#334155'}
                        strokeWidth="1"
                        className="transition-transform group-hover:scale-102"
                      />

                      {/* Small Category Dot */}
                      <circle
                        cx="10"
                        cy="0"
                        r="3.5"
                        fill={isFormula ? '#34d399' : theme.color}
                      />

                      {/* Child Short Keyword Label */}
                      <text
                        x="20"
                        y="4"
                        fill={isFormula ? '#a7f3d0' : '#e2e8f0'}
                        fontSize="10"
                        fontWeight={isFormula ? 'bold' : '600'}
                      >
                        {child.label.length > 26 ? child.label.slice(0, 24) + '...' : child.label}
                      </text>
                    </g>
                  );
                });
              })}
            </svg>
          </div>
        </div>

        {/* 3.6 Simple Explanation Side Panel for Selected Branch / Node */}
        {selectedEntity && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 overflow-y-auto shrink-0 shadow-lg">
            {/* Header with Category Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getCategoryTheme(selectedEntity.category).badge}`}>
                {selectedEntity.category}
              </span>

              {selectedEntity.importance && (
                <span className="text-[11px] font-mono font-semibold text-slate-400">
                  {selectedEntity.importance}
                </span>
              )}
            </div>

            {/* Concept Title */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Concept Node
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                {selectedEntity.title}
              </h3>
            </div>

            {/* 3.6 Simple Explanation Box */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Simple Explanation:</span>
              </span>
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {selectedEntity.summary}
              </div>
            </div>

            {/* Mathematical Formula / Calculation (if present) */}
            {selectedEntity.formula && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Governing Formula / Evaluation:</span>
                </span>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200 select-all">
                  {selectedEntity.formula}
                </div>
              </div>
            )}

            {/* 3.4 & 3.6 Source Citation Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Original Lecture Source</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                  Page {selectedEntity.sourceCitation.pageNumber}
                </span>
              </div>

              <blockquote className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs italic text-slate-600 dark:text-slate-300">
                "{selectedEntity.sourceCitation.exactQuote}"
              </blockquote>

              <button
                onClick={() => onNavigateToCitation(selectedEntity.sourceCitation)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Jump to Page {selectedEntity.sourceCitation.pageNumber} in Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
