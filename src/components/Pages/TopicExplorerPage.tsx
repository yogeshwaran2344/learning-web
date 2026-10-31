import React, { useState } from 'react';
import {
  FolderTree,
  CheckCircle2,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  FileText,
  Calculator,
  Network,
  Table as TableIcon,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  GraduationCap,
  Headphones,
  Award,
  FlaskConical,
  Zap,
  ArrowLeftRight,
  FolderPlus,
  MoveRight,
  Info,
  ExternalLink,
  GitBranch,
  FolderInput,
  Clock
} from 'lucide-react';
import {
  AcademicDocument,
  DocumentTopicHierarchy,
  DocumentTopic,
  DocumentSubtopic,
  DocumentChapter,
  StudioTab,
  SourceCitation
} from '../../types';
import { TopicHierarchyService } from '../../services/topicHierarchyService';
import { StorageService } from '../../services/storageService';
import { ApiClient } from '../../services/apiClient';

interface TopicExplorerPageProps {
  document: AcademicDocument;
  onLearnTopic: (topic: DocumentTopic, preferredFormat?: StudioTab) => void;
  onNavigateToDocumentList: () => void;
  onDocumentUpdate?: (updatedDoc: AcademicDocument) => void;
  onNavigateToPage?: (pageNumber: number) => void;
  onNavigateToCitation?: (citation: SourceCitation) => void;
}

export const TopicExplorerPage: React.FC<TopicExplorerPageProps> = ({
  document,
  onLearnTopic,
  onNavigateToDocumentList,
  onDocumentUpdate,
  onNavigateToPage,
  onNavigateToCitation
}) => {
  // Ensure we always have an active topic hierarchy
  const [hierarchy, setHierarchy] = useState<DocumentTopicHierarchy>(() => {
    return document.topicHierarchy || TopicHierarchyService.buildHierarchy(document);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    (document.topicHierarchy?.chapters || []).forEach(c => {
      map[c.id] = true;
    });
    return map;
  });

  // Section 2.3: Topic Selection State
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(() => {
    // Default: all topics selected
    const allIds = new Set<string>();
    (document.topicHierarchy?.chapters || []).forEach(c => {
      c.topics.forEach(t => allIds.add(t.id));
    });
    return allIds;
  });

  // Section 2.5: Correction Modals & Inline Edits
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState<string>('');

  // Add Subtopic State
  const [addSubtopicTopicId, setAddSubtopicTopicId] = useState<string | null>(null);
  const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
  const [newSubtopicStartPage, setNewSubtopicStartPage] = useState(1);
  const [newSubtopicEndPage, setNewSubtopicEndPage] = useState(1);

  // Move Subtopic State
  const [moveSubtopicData, setMoveSubtopicData] = useState<{
    sourceTopicId: string;
    subtopicId: string;
    subtopicTitle: string;
  } | null>(null);
  const [targetTopicIdForMove, setTargetTopicIdForMove] = useState<string>('');

  // Merge Topics State
  const [mergeSourceTopicId, setMergeSourceTopicId] = useState<string | null>(null);
  const [mergeTargetTopicId, setMergeTargetTopicId] = useState<string>('');

  // Move Topic to Chapter State
  const [moveTopicData, setMoveTopicData] = useState<{
    topicId: string;
    topicTitle: string;
    currentChapterTitle: string;
  } | null>(null);
  const [targetChapterIdForMoveTopic, setTargetChapterIdForMoveTopic] = useState<string>('');

  // Split Topic State
  const [splitTopicData, setSplitTopicData] = useState<{
    topic: DocumentTopic;
  } | null>(null);
  const [selectedSubtopicIdsToSplit, setSelectedSubtopicIdsToSplit] = useState<Set<string>>(new Set());
  const [newSplitTopicTitle, setNewSplitTopicTitle] = useState('');

  // Add Topic to Chapter State
  const [addTopicChapterId, setAddTopicChapterId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicStartPage, setNewTopicStartPage] = useState(1);
  const [newTopicEndPage, setNewTopicEndPage] = useState(1);

  // Learn Selected Topics Format Selector Modal
  const [isLearnSelectedModalOpen, setIsLearnSelectedModalOpen] = useState(false);

  // Topic Learning Progress State (Feature 3)
  type TopicProgressStatus = 'not_started' | 'in_progress' | 'completed';

  const [topicProgress, setTopicProgress] = useState<Record<string, TopicProgressStatus>>(() => {
    try {
      const saved = localStorage.getItem(`learnova_progress_${document.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const updateTopicProgress = (topicId: string, status: TopicProgressStatus) => {
    setTopicProgress(prev => {
      const next = { ...prev, [topicId]: status };
      try {
        localStorage.setItem(`learnova_progress_${document.id}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleCycleProgress = (topicId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const current = topicProgress[topicId] || 'not_started';
    const nextStatus: TopicProgressStatus =
      current === 'not_started' ? 'in_progress' :
      current === 'in_progress' ? 'completed' : 'not_started';
    updateTopicProgress(topicId, nextStatus);
  };

  const handleMarkSelectedCompleted = () => {
    setTopicProgress(prev => {
      const next = { ...prev };
      selectedTopicIds.forEach(id => {
        next[id] = 'completed';
      });
      try {
        localStorage.setItem(`learnova_progress_${document.id}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const syncHierarchyUpdate = (newHierarchy: DocumentTopicHierarchy) => {
    setHierarchy(newHierarchy);
    const updatedDoc: AcademicDocument = {
      ...document,
      topicHierarchy: newHierarchy
    };
    StorageService.saveDocuments([
      updatedDoc,
      ...StorageService.getDocuments().filter(d => d.id !== document.id)
    ]);
    // Persist to backend SQLite store
    ApiClient.updateDocumentHierarchy(document.id, newHierarchy).catch(() => {});
    if (onDocumentUpdate) {
      onDocumentUpdate(updatedDoc);
    }
  };

  // Toggle single topic expanded
  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  // Toggle chapter expand
  const toggleChapterExpand = (chapterId: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  // Section 2.3: Topic Selection Handlers
  const allTopicIds: string[] = hierarchy.chapters.flatMap(c => c.topics.map(t => t.id));
  const isAllSelected = allTopicIds.length > 0 && allTopicIds.every(id => selectedTopicIds.has(id));
  const isNoneSelected = selectedTopicIds.size === 0;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(allTopicIds));
    }
  };

  const handleToggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleToggleChapter = (chapter: DocumentChapter) => {
    const chapterTopicIds = chapter.topics.map(t => t.id);
    const isChapterAllSelected = chapterTopicIds.every(id => selectedTopicIds.has(id));

    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (isChapterAllSelected) {
        chapterTopicIds.forEach(id => next.delete(id));
      } else {
        chapterTopicIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Section 2.5: Edit Topic Title
  const handleStartEditTopic = (topic: DocumentTopic) => {
    setEditingTopicId(topic.id);
    setEditingTopicTitle(topic.title);
  };

  const handleSaveTopicTitle = (topicId: string) => {
    if (editingTopicTitle.trim()) {
      const updated = TopicHierarchyService.updateTopicTitle(hierarchy, topicId, editingTopicTitle);
      syncHierarchyUpdate(updated);
    }
    setEditingTopicId(null);
  };

  const handleRemoveTopic = (topicId: string) => {
    if (confirm('Are you sure you want to remove this detected topic from the hierarchy?')) {
      const updated = TopicHierarchyService.removeTopic(hierarchy, topicId);
      syncHierarchyUpdate(updated);
      setSelectedTopicIds(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  };

  // Section 2.5: Add Subtopic Submit
  const handleAddSubtopicSubmit = (topicId: string) => {
    if (newSubtopicTitle.trim()) {
      const updated = TopicHierarchyService.addSubtopicToTopic(
        hierarchy,
        topicId,
        newSubtopicTitle,
        [newSubtopicStartPage, newSubtopicEndPage]
      );
      syncHierarchyUpdate(updated);
      setNewSubtopicTitle('');
      setAddSubtopicTopicId(null);
    }
  };

  // Section 2.5: Move Subtopic Submit
  const handleMoveSubtopicSubmit = () => {
    if (moveSubtopicData && targetTopicIdForMove) {
      const updated = TopicHierarchyService.moveSubtopic(
        hierarchy,
        moveSubtopicData.sourceTopicId,
        targetTopicIdForMove,
        moveSubtopicData.subtopicId
      );
      syncHierarchyUpdate(updated);
      setMoveSubtopicData(null);
      setTargetTopicIdForMove('');
    }
  };

  // Section 2.5: Merge Topics Submit
  const handleMergeTopicsSubmit = () => {
    if (mergeSourceTopicId && mergeTargetTopicId) {
      const updated = TopicHierarchyService.mergeTopics(hierarchy, mergeSourceTopicId, mergeTargetTopicId);
      syncHierarchyUpdate(updated);
      setMergeSourceTopicId(null);
      setMergeTargetTopicId('');
    }
  };

  // Section 2.5: Move Topic to Chapter Submit
  const handleMoveTopicToChapterSubmit = () => {
    if (moveTopicData && targetChapterIdForMoveTopic) {
      const updated = TopicHierarchyService.moveTopicToChapter(
        hierarchy,
        moveTopicData.topicId,
        targetChapterIdForMoveTopic
      );
      syncHierarchyUpdate(updated);
      setMoveTopicData(null);
      setTargetChapterIdForMoveTopic('');
    }
  };

  // Section 2.5: Split Topic Submit
  const handleSplitTopicSubmit = () => {
    if (splitTopicData && selectedSubtopicIdsToSplit.size > 0 && newSplitTopicTitle.trim()) {
      const updated = TopicHierarchyService.splitTopic(
        hierarchy,
        splitTopicData.topic.id,
        Array.from(selectedSubtopicIdsToSplit),
        newSplitTopicTitle
      );
      syncHierarchyUpdate(updated);
      setSplitTopicData(null);
      setSelectedSubtopicIdsToSplit(new Set());
      setNewSplitTopicTitle('');
    }
  };

  // Section 2.5: Add Topic to Chapter Submit
  const handleAddTopicToChapterSubmit = (chapterId: string) => {
    if (newTopicTitle.trim()) {
      const updated = TopicHierarchyService.addTopicToChapter(
        hierarchy,
        chapterId,
        newTopicTitle,
        [newTopicStartPage, newTopicEndPage]
      );
      syncHierarchyUpdate(updated);
      setNewTopicTitle('');
      setAddTopicChapterId(null);
    }
  };

  // Section 2.7: Learn Selected Topics Trigger
  const handleLearnSelected = (preferredFormat?: StudioTab) => {
    const firstSelected = hierarchy.chapters
      .flatMap(c => c.topics)
      .find(t => selectedTopicIds.has(t.id));
    if (firstSelected) {
      onLearnTopic(firstSelected, preferredFormat);
    }
    setIsLearnSelectedModalOpen(false);
  };

  // Filtering topics based on search
  const filteredChapters = hierarchy.chapters.map(chapter => {
    const matchesChapter = chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchingTopics = chapter.topics.filter(t => {
      const matchTitle = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchConcepts = t.importantConcepts.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSub = t.subtopics.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchTitle || matchConcepts || matchSub || matchesChapter;
    });
    return {
      ...chapter,
      topics: matchingTopics
    };
  }).filter(c => c.topics.length > 0);

  const totalFilteredTopics = filteredChapters.reduce((acc, c) => acc + c.topics.length, 0);

  const allTopicsList = hierarchy.chapters.flatMap(c => c.topics);
  const completedTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'completed').length;
  const inProgressTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'in_progress').length;
  const progressPercent = allTopicsList.length > 0 ? Math.round((completedTopicsCount / allTopicsList.length) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 select-none animate-fadeIn">
      {/* 2.1 Top Banner: Explore Your Topics & Document Analysed Status */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-950 border border-blue-500/20 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Document Analysed</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Explore Your Topics</span>
            </h1>

            <p className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <span className="text-white font-bold">{document.title}</span>
              <span>•</span>
              <span className="text-blue-300 font-bold">{hierarchy.totalTopicsCount} main topics detected</span>
              <span>•</span>
              <span>{hierarchy.chapters.length} Chapters</span>
              <span>•</span>
              <span>{document.pageCount} Pages</span>
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                const firstSelected = hierarchy.chapters
                  .flatMap(c => c.topics)
                  .find(t => selectedTopicIds.has(t.id));
                if (firstSelected) {
                  onLearnTopic(firstSelected);
                } else if (hierarchy.chapters[0]?.topics[0]) {
                  onLearnTopic(hierarchy.chapters[0].topics[0]);
                }
              }}
              disabled={selectedTopicIds.size === 0}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Learn Selected ({selectedTopicIds.size})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Learning Progress Summary Bar (Feature 3) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Learning Mastery Progress:
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {completedTopicsCount} of {allTopicsList.length} Topics Mastered ({progressPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              ✅ {completedTopicsCount} Mastered
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
              ⏳ {inProgressTopicsCount} In Progress
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              ⚪ {allTopicsList.length - completedTopicsCount - inProgressTopicsCount} Not Started
            </span>
            {selectedTopicIds.size > 0 && (
              <button
                type="button"
                onClick={handleMarkSelectedCompleted}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                title="Mark all selected topics as mastered"
              >
                Mark Selected Mastered
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2.3 Selection & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Left: Global Select All Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select All ({allTopicIds.length})</span>
          </button>

          <span className="text-xs text-slate-500 font-medium">
            <strong className="text-blue-600 dark:text-blue-400">{selectedTopicIds.size}</strong> of {allTopicIds.length} topics selected for learning
          </span>
        </div>

        {/* Right: Search Filter */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search topics, concepts, formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* 2.1 & 2.2 Hierarchical Chapters & Topics List */}
      <div className="space-y-6">
        {filteredChapters.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <FolderTree className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No matching topics found
            </h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or reset the filter.
            </p>
          </div>
        ) : (
          filteredChapters.map((chapter) => {
            const isChapterExpanded = expandedChapters[chapter.id] !== false;
            const chapterTopicIds = chapter.topics.map(t => t.id);
            const isChapterSelected = chapterTopicIds.length > 0 && chapterTopicIds.every(id => selectedTopicIds.has(id));
            const isChapterPartiallySelected = !isChapterSelected && chapterTopicIds.some(id => selectedTopicIds.has(id));

            const allTopicsList = hierarchy.chapters.flatMap(c => c.topics);
  const completedTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'completed').length;
  const inProgressTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'in_progress').length;
  const progressPercent = allTopicsList.length > 0 ? Math.round((completedTopicsCount / allTopicsList.length) * 100) : 0;

  return (
              <div
                key={chapter.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all"
              >
                {/* Chapter Banner Header */}
                <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Chapter Select Checkbox */}
                    <button
                      onClick={() => handleToggleChapter(chapter)}
                      className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      title={isChapterSelected ? 'Deselect Chapter' : 'Select Chapter'}
                    >
                      {isChapterSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : isChapterPartiallySelected ? (
                        <div className="w-4 h-4 rounded-sm border-2 border-blue-600 bg-blue-100 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-blue-600" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleChapterExpand(chapter.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {isChapterExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                      0{chapter.chapterNumber}.
                    </span>

                    <h2
                      onClick={() => toggleChapterExpand(chapter.id)}
                      className="text-sm md:text-base font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {chapter.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddTopicChapterId(chapter.id);
                        setNewTopicStartPage(chapter.pageRange[0]);
                        setNewTopicEndPage(chapter.pageRange[1]);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors shadow-2xs"
                      title="Add a new topic under this chapter"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Topic</span>
                    </button>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Pages {chapter.pageRange[0]}–{chapter.pageRange[1]}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {chapter.topics.length} topic{chapter.topics.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Topics in Chapter */}
                {isChapterExpanded && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {chapter.topics.map((topic) => {
                      const isSelected = selectedTopicIds.has(topic.id);
                      const isExpanded = expandedTopics[topic.id] === true;
                      const isEditing = editingTopicId === topic.id;

                      // Determine Content Type badge
                      const contentType = topic.contentType
                        ? (topic.contentType.charAt(0).toUpperCase() + topic.contentType.slice(1))
                        : (topic.associatedNumericalExamples && topic.associatedNumericalExamples.length > 0
                          ? 'Numerical'
                          : topic.associatedDiagrams && topic.associatedDiagrams.length > 0
                          ? 'Diagram'
                          : topic.associatedAlgorithms && topic.associatedAlgorithms.length > 0
                          ? 'Programming'
                          : topic.title.toLowerCase().includes('vs') || topic.title.toLowerCase().includes('comparison')
                          ? 'Comparison'
                          : 'Theory');

                      const allTopicsList = hierarchy.chapters.flatMap(c => c.topics);
  const completedTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'completed').length;
  const inProgressTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'in_progress').length;
  const progressPercent = allTopicsList.length > 0 ? Math.round((completedTopicsCount / allTopicsList.length) * 100) : 0;

  return (
                        <div
                          key={topic.id}
                          className={`p-5 transition-colors ${
                            isSelected
                              ? 'bg-blue-50/20 dark:bg-blue-950/10'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                          }`}
                        >
                          {/* Main Topic Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Individual Topic Checkbox */}
                              <button
                                onClick={() => handleToggleTopic(topic.id)}
                                className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                                title="Toggle topic selection for learning"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() => toggleTopicExpand(topic.id)}
                                className="mt-0.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>

                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                {topic.topicNumber}
                              </span>

                              {isEditing ? (
                                <div className="flex items-center gap-1.5 flex-1 max-w-md">
                                  <input
                                    type="text"
                                    value={editingTopicTitle}
                                    onChange={(e) => setEditingTopicTitle(e.target.value)}
                                    className="px-2.5 py-1 text-xs rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full outline-hidden"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveTopicTitle(topic.id)}
                                    className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                    title="Save Title"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingTopicId(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <h3
                                    onClick={() => toggleTopicExpand(topic.id)}
                                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                                  >
                                    {topic.title}
                                  </h3>
                                  <button
                                    onClick={() => handleStartEditTopic(topic)}
                                    className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                    title="Rename topic (keeps source references)"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Right Action: Progress Status Pill & Learn This Topic Button */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => handleCycleProgress(topic.id, e)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                  (topicProgress[topic.id] || 'not_started') === 'completed'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                    : (topicProgress[topic.id] || 'not_started') === 'in_progress'
                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                                title="Click to cycle progress: Not Started -> In Progress -> Mastered"
                              >
                                {(topicProgress[topic.id] || 'not_started') === 'completed' ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Mastered</span>
                                  </>
                                ) : (topicProgress[topic.id] || 'not_started') === 'in_progress' ? (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span>In Progress</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                    <span>Not Started</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => onLearnTopic(topic)}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                title="Open this topic's dedicated learning workspace"
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Learn This Topic</span>
                              </button>
                            </div>
                          </div>

                          {/* 2.4 Topic Information Table / Cards Strip */}
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1">
                            {/* 1. Topic Name */}
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topic Name</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{topic.title}</span>
                            </div>

                            {/* 2. Subtopics Count */}
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtopics</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {topic.subtopics.length} subtopic{topic.subtopics.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* 3. Source Pages */}
                            <div
                              onClick={() => {
                                if (onNavigateToPage) {
                                  onNavigateToPage(topic.pageRange[0]);
                                } else if (topic.sourceCitations?.[0] && onNavigateToCitation) {
                                  onNavigateToCitation(topic.sourceCitations[0]);
                                } else {
                                  onLearnTopic(topic, 'original');
                                }
                              }}
                              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all"
                              title="Click to navigate to original document page"
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Source Pages</span>
                                <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                              </span>
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                Pages {topic.pageRange[0]}–{topic.pageRange[1]}
                              </span>
                            </div>

                            {/* 4. Content Type */}
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Content Type</span>
                              <span className="font-semibold text-purple-600 dark:text-purple-400">{contentType}</span>
                            </div>

                            {/* 5. Extraction Status */}
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Extraction Status</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Successfully analysed</span>
                              </span>
                            </div>
                          </div>

                          {/* 2.2 Expandable Subtopics & Learning Material Counts */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-3 animate-fadeIn">
                              {/* Short Topic Description / Purpose */}
                              <div className="text-xs text-slate-600 dark:text-slate-300 bg-blue-50/30 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                                <strong className="text-slate-800 dark:text-slate-200">Core Purpose: </strong>
                                Formalizes {topic.title.toLowerCase()} across Pages {topic.pageRange[0]}–{topic.pageRange[1]}. All definitions, equations, and invariant boundary conditions are preserved for student study.
                              </div>

                              {/* Available Learning Formats Count */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-bold text-slate-500">Available Formats:</span>
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                                  💡 Short Explanation
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                                  🗺️ Concept Map
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                                  🎧 Audio Lesson
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                                  🗂️ Flashcards
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                                  📝 Practice Quiz
                                </span>
                                {topic.associatedNumericalExamples.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold">
                                    🔢 Worked Examples
                                  </span>
                                )}
                              </div>

                              {/* Subtopics Detail List */}
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>Subtopics ({topic.subtopics.length})</span>
                                  <button
                                    onClick={() => {
                                      setAddSubtopicTopicId(topic.id);
                                      setNewSubtopicStartPage(topic.pageRange[0]);
                                      setNewSubtopicEndPage(topic.pageRange[1]);
                                    }}
                                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Subtopic</span>
                                  </button>
                                </div>

                                {topic.subtopics.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No subtopics added yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {topic.subtopics.map((sub) => (
                                      <div
                                        key={sub.id}
                                        className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 shadow-2xs hover:border-blue-400 transition-colors"
                                      >
                                        <div className="space-y-1 min-w-0 flex-1">
                                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {sub.title}
                                          </div>
                                          <div
                                            onClick={() => {
                                              if (onNavigateToPage) {
                                                onNavigateToPage(sub.pageRange[0]);
                                              } else {
                                                onLearnTopic(topic, 'original');
                                              }
                                            }}
                                            className="text-[10px] text-slate-500 font-mono hover:text-blue-600 cursor-pointer flex items-center gap-1"
                                            title="Click to jump to original page"
                                          >
                                            <span>Source: Page {sub.pageRange[0]}</span>
                                            <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                          </div>
                                          {sub.importantConcepts.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                              {sub.importantConcepts.map((c, i) => (
                                                <span key={i} className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                                                  {c}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {/* Move Subtopic */}
                                          <button
                                            onClick={() => {
                                              setMoveSubtopicData({
                                                sourceTopicId: topic.id,
                                                subtopicId: sub.id,
                                                subtopicTitle: sub.title
                                              });
                                              setTargetTopicIdForMove('');
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                            title="Move subtopic under another topic"
                                          >
                                            <MoveRight className="w-3.5 h-3.5" />
                                          </button>

                                          {/* Remove Subtopic */}
                                          <button
                                            onClick={() => {
                                              const updated = TopicHierarchyService.removeSubtopic(hierarchy, topic.id, sub.id);
                                              syncHierarchyUpdate(updated);
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                            title="Remove subtopic"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Source Citations to Original Document */}
                              {topic.sourceCitations && topic.sourceCitations.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Source Citations (Original Document):
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {topic.sourceCitations.map((cite, idx) => (
                                      <button
                                        key={cite.id || idx}
                                        onClick={() => {
                                          if (onNavigateToPage) onNavigateToPage(cite.pageNumber);
                                          else if (onNavigateToCitation) onNavigateToCitation(cite);
                                          else onLearnTopic(topic, 'original');
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition-colors"
                                        title={cite.exactQuote}
                                      >
                                        <span>Page {cite.pageNumber}: {cite.sectionTitle || 'Source anchor'}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Uncertainty / Warning notice if unclassified */}
                              {topic.isUncertain && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                  <span>Unclassified / Uncertain section: {topic.uncertaintyReason || 'Heading detection confidence below threshold. You can rename or reorganize this topic.'}</span>
                                </div>
                              )}

                              {/* Topic Management Toolbar (Reorganize, Move, Split, Merge & Remove) */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Move Topic to Another Chapter */}
                                  <button
                                    onClick={() => {
                                      setMoveTopicData({
                                        topicId: topic.id,
                                        topicTitle: topic.title,
                                        currentChapterTitle: topic.chapterTitle
                                      });
                                      setTargetChapterIdForMoveTopic('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Move this topic into another chapter"
                                  >
                                    <FolderInput className="w-3 h-3 text-indigo-500" />
                                    <span>Move to Chapter</span>
                                  </button>

                                  {/* Split Topic */}
                                  {topic.subtopics.length > 1 && (
                                    <button
                                      onClick={() => {
                                        setSplitTopicData({ topic });
                                        setSelectedSubtopicIdsToSplit(new Set());
                                        setNewSplitTopicTitle('');
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Split this topic into two separate topics"
                                    >
                                      <GitBranch className="w-3 h-3 text-amber-500" />
                                      <span>Split Topic</span>
                                    </button>
                                  )}

                                  {/* Merge Duplicate Topics */}
                                  <button
                                    onClick={() => {
                                      setMergeSourceTopicId(topic.id);
                                      setMergeTargetTopicId('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Merge duplicate topics"
                                  >
                                    <ArrowLeftRight className="w-3 h-3 text-purple-500" />
                                    <span>Merge Duplicate</span>
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleRemoveTopic(topic.id)}
                                  className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Remove incorrectly detected heading"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove Heading</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Add Missing Subtopic */}
      {addSubtopicTopicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Missing Subtopic
              </h3>
              <button onClick={() => setAddSubtopicTopicId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Subtopic Title</label>
                <input
                  type="text"
                  placeholder="e.g. PCB Context Switch Mechanism"
                  value={newSubtopicTitle}
                  onChange={(e) => setNewSubtopicTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Start Page</label>
                  <input
                    type="number"
                    min="1"
                    value={newSubtopicStartPage}
                    onChange={(e) => setNewSubtopicStartPage(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">End Page</label>
                  <input
                    type="number"
                    min={newSubtopicStartPage}
                    value={newSubtopicEndPage}
                    onChange={(e) => setNewSubtopicEndPage(parseInt(e.target.value, 10) || newSubtopicStartPage)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddSubtopicTopicId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddSubtopicSubmit(addSubtopicTopicId)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Add Subtopic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Move Subtopic Under Another Topic */}
      {moveSubtopicData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Move Subtopic Under Another Topic
              </h3>
              <button onClick={() => setMoveSubtopicData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Moving subtopic: <strong className="text-blue-600">{moveSubtopicData.subtopicTitle}</strong>
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Target Topic</label>
              <select
                value={targetTopicIdForMove}
                onChange={(e) => setTargetTopicIdForMove(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
              >
                <option value="">-- Choose destination topic --</option>
                {hierarchy.chapters.flatMap(c => c.topics)
                  .filter(t => t.id !== moveSubtopicData.sourceTopicId)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.topicNumber} {t.title} ({t.chapterTitle})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMoveSubtopicData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveSubtopicSubmit}
                disabled={!targetTopicIdForMove}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-40"
              >
                Move Subtopic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Merge Duplicate Topics */}
      {mergeSourceTopicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Merge Duplicate Topics
              </h3>
              <button onClick={() => setMergeSourceTopicId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Combine this topic with another topic, uniting all subtopics and source references.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Target Topic to Merge Into</label>
              <select
                value={mergeTargetTopicId}
                onChange={(e) => setMergeTargetTopicId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
              >
                <option value="">-- Choose target topic --</option>
                {hierarchy.chapters.flatMap(c => c.topics)
                  .filter(t => t.id !== mergeSourceTopicId)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.topicNumber} {t.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMergeSourceTopicId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeTopicsSubmit}
                disabled={!mergeTargetTopicId}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-40"
              >
                Merge Topics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Move Topic to Chapter */}
      {moveTopicData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-indigo-500" />
                <span>Move Topic to Chapter</span>
              </h3>
              <button onClick={() => setMoveTopicData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Moving topic <strong className="text-blue-600">{moveTopicData.topicTitle}</strong> from current chapter ({moveTopicData.currentChapterTitle}) to another chapter.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Destination Chapter</label>
              <select
                value={targetChapterIdForMoveTopic}
                onChange={(e) => setTargetChapterIdForMoveTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
              >
                <option value="">-- Choose target chapter --</option>
                {hierarchy.chapters.map(c => (
                  <option key={c.id} value={c.id}>
                    0{c.chapterNumber}. {c.title} (Pages {c.pageRange[0]}–{c.pageRange[1]})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMoveTopicData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveTopicToChapterSubmit}
                disabled={!targetChapterIdForMoveTopic}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-40"
              >
                Move Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Split Topic into Two Topics */}
      {splitTopicData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-amber-500" />
                <span>Split Topic into Two</span>
              </h3>
              <button onClick={() => setSplitTopicData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Splitting topic: <strong className="text-blue-600">{splitTopicData.topic.title}</strong>. Select which subtopics should branch off into the new topic.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">New Topic Title</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Scheduling Algorithms"
                  value={newSplitTopicTitle}
                  onChange={(e) => setNewSplitTopicTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Select Subtopics to Move into New Topic ({selectedSubtopicIdsToSplit.size} selected)
                </label>
                <div className="mt-1 max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {splitTopicData.topic.subtopics.map(sub => {
                    const isSelected = selectedSubtopicIdsToSplit.has(sub.id);
                    const allTopicsList = hierarchy.chapters.flatMap(c => c.topics);
  const completedTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'completed').length;
  const inProgressTopicsCount = allTopicsList.filter(t => topicProgress[t.id] === 'in_progress').length;
  const progressPercent = allTopicsList.length > 0 ? Math.round((completedTopicsCount / allTopicsList.length) * 100) : 0;

  return (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSubtopicIdsToSplit(prev => {
                              const next = new Set(prev);
                              if (next.has(sub.id)) next.delete(sub.id);
                              else next.add(sub.id);
                              return next;
                            });
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.title}</span>
                        <span className="text-[10px] text-slate-400 ml-auto font-mono">Page {sub.pageRange[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSplitTopicData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitTopicSubmit}
                disabled={!newSplitTopicTitle.trim() || selectedSubtopicIdsToSplit.size === 0}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-40"
              >
                Split Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Add Missing Topic to Chapter */}
      {addTopicChapterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Add Missing Topic</span>
              </h3>
              <button onClick={() => setAddTopicChapterId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Topic Title</label>
                <input
                  type="text"
                  placeholder="e.g. Multilevel Feedback Queue Scheduling"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Start Page</label>
                  <input
                    type="number"
                    min="1"
                    value={newTopicStartPage}
                    onChange={(e) => setNewTopicStartPage(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">End Page</label>
                  <input
                    type="number"
                    min={newTopicStartPage}
                    value={newTopicEndPage}
                    onChange={(e) => setNewTopicEndPage(parseInt(e.target.value, 10) || newTopicStartPage)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddTopicChapterId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddTopicToChapterSubmit(addTopicChapterId)}
                disabled={!newTopicTitle.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-40"
              >
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Choose Learning Format for Selected Topics */}
      {isLearnSelectedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <span>Learn Selected Topics ({selectedTopicIds.size})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a format to begin learning with your {selectedTopicIds.size} selected topic{selectedTopicIds.size > 1 ? 's' : ''}.
                </p>
              </div>
              <button onClick={() => setIsLearnSelectedModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {[
                { id: 'map', label: 'Concept Map', icon: '🗺️', desc: 'Visual knowledge hierarchy' },
                { id: 'notes', label: 'Detailed Notes', icon: '📖', desc: 'Definitions, formulas, key points' },
                { id: 'flashcards', label: 'Flashcards', icon: '🗂️', desc: 'Active recall & mastery tracking' },
                { id: 'quiz', label: 'Practice Quiz', icon: '📝', desc: 'Self-assessment with rationale' },
                { id: 'audio', label: 'Audio Lesson', icon: '🎧', desc: 'Spoken lecture with chapter jumps' },
                { id: 'worked', label: 'Worked Examples', icon: '🔢', desc: 'Step-by-step math derivations' },
                { id: 'simplified', label: 'Simplified Story', icon: '💡', desc: 'Everyday analogies & intuition' },
                { id: 'original', label: 'Original Source', icon: '📄', desc: 'Verified pages with highlights' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLearnSelected(item.id as StudioTab)}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-left transition-all cursor-pointer group"
                >
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-400">{item.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsLearnSelectedModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
