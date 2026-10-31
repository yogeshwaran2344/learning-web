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
  HelpCircle,
  Hash
} from 'lucide-react';
import { DocumentTopicHierarchy, DocumentTopic, DocumentChapter } from '../../types';
import { TopicHierarchyService } from '../../services/topicHierarchyService';

interface TopicHierarchyReviewModalProps {
  hierarchy: DocumentTopicHierarchy;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmedHierarchy: DocumentTopicHierarchy) => void;
  documentTitle?: string;
  pageCount?: number;
}

export const TopicHierarchyReviewModal: React.FC<TopicHierarchyReviewModalProps> = ({
  hierarchy: initialHierarchy,
  isOpen,
  onClose,
  onConfirm,
  documentTitle,
  pageCount
}) => {
  const [hierarchy, setHierarchy] = useState<DocumentTopicHierarchy>(initialHierarchy);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState<string>('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState<string>('');

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialHierarchy.chapters.forEach(c => {
      map[c.id] = true;
    });
    return map;
  });

  const [showAddModal, setShowAddModal] = useState<string | null>(null); // chapterId to add topic to
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newTopicStartPage, setNewTopicStartPage] = useState<number>(1);
  const [newTopicEndPage, setNewTopicEndPage] = useState<number>(1);

  if (!isOpen) return null;

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleStartEditTopic = (topic: DocumentTopic) => {
    setEditingTopicId(topic.id);
    setEditingTopicTitle(topic.title);
  };

  const handleSaveTopicTitle = (topicId: string) => {
    if (editingTopicTitle.trim()) {
      const updated = TopicHierarchyService.updateTopicTitle(hierarchy, topicId, editingTopicTitle);
      setHierarchy(updated);
    }
    setEditingTopicId(null);
  };

  const handleStartEditChapter = (chapter: DocumentChapter) => {
    setEditingChapterId(chapter.id);
    setEditingChapterTitle(chapter.title);
  };

  const handleSaveChapterTitle = (chapterId: string) => {
    if (editingChapterTitle.trim()) {
      const updated = TopicHierarchyService.updateChapterTitle(hierarchy, chapterId, editingChapterTitle);
      setHierarchy(updated);
    }
    setEditingChapterId(null);
  };

  const handleRemoveTopic = (topicId: string) => {
    const updated = TopicHierarchyService.removeTopic(hierarchy, topicId);
    setHierarchy(updated);
  };

  const handleAddTopicSubmit = (chapterId: string) => {
    if (newTopicTitle.trim()) {
      const updated = TopicHierarchyService.addTopicToChapter(
        hierarchy,
        chapterId,
        newTopicTitle,
        [newTopicStartPage, newTopicEndPage]
      );
      setHierarchy(updated);
      setNewTopicTitle('');
      setShowAddModal(null);
    }
  };

  const handleConfirmAll = () => {
    const verified = TopicHierarchyService.markVerified(hierarchy);
    onConfirm(verified);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FolderTree className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Extracted Topic Hierarchy
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Evidence Grounded</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              LEARNOVA analyzed the document structure. Review chapters, topics, and subtopics below or correct any heading before generating learning materials.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="px-6 py-3 bg-blue-50/40 dark:bg-blue-950/20 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-3">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Document: <strong className="text-blue-600 dark:text-blue-400">{documentTitle || hierarchy.documentTitle}</strong>
            </span>
            <span>•</span>
            <span><strong>{hierarchy.chapters.length}</strong> Chapters</span>
            <span>•</span>
            <span><strong>{hierarchy.totalTopicsCount}</strong> Topics</span>
            <span>•</span>
            <span><strong>{hierarchy.totalSubtopicsCount}</strong> Subtopics</span>
            {pageCount && (
              <>
                <span>•</span>
                <span><strong>{pageCount}</strong> Total Pages</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-500 italic">
            Tip: Click any heading to edit or correct detected titles
          </div>
        </div>

        {/* Main Hierarchy Tree Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {hierarchy.chapters.map((chapter) => {
            const isExpanded = expandedChapters[chapter.id] !== false;
            const isEditingChapter = editingChapterId === chapter.id;

            return (
              <div
                key={chapter.id}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs"
              >
                {/* Chapter Bar */}
                <div className="px-4 py-3 bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold shrink-0">
                      Chapter {chapter.chapterNumber}
                    </span>

                    {isEditingChapter ? (
                      <div className="flex items-center gap-1.5 flex-1 max-w-md">
                        <input
                          type="text"
                          value={editingChapterTitle}
                          onChange={(e) => setEditingChapterTitle(e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg border border-blue-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full outline-hidden"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveChapterTitle(chapter.id)}
                          className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                          title="Save chapter heading"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingChapterId(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3
                          onClick={() => handleStartEditChapter(chapter)}
                          className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                          title="Click to edit chapter title"
                        >
                          {chapter.title}
                        </h3>
                        <button
                          onClick={() => handleStartEditChapter(chapter)}
                          className="text-slate-400 hover:text-blue-500 p-0.5 cursor-pointer opacity-70 hover:opacity-100"
                          title="Edit Chapter Title"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      Pages {chapter.pageRange[0]} – {chapter.pageRange[1]}
                    </span>
                    <button
                      onClick={() => {
                        setShowAddModal(chapter.id);
                        setNewTopicStartPage(chapter.pageRange[0]);
                        setNewTopicEndPage(chapter.pageRange[1]);
                      }}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Topic</span>
                    </button>
                  </div>
                </div>

                {/* Topics List within Chapter */}
                {isExpanded && (
                  <div className="p-3 space-y-3">
                    {chapter.topics.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        No topics detected in this chapter. Click "Add Topic" above to specify one.
                      </div>
                    ) : (
                      chapter.topics.map((topic) => {
                        const isEditingTopic = editingTopicId === topic.id;

                        return (
                          <div
                            key={topic.id}
                            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:border-blue-300 dark:hover:border-blue-800/80 transition-colors space-y-2.5"
                          >
                            {/* Topic Heading Row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                  {topic.topicNumber}
                                </span>

                                {isEditingTopic ? (
                                  <div className="flex items-center gap-1.5 flex-1 max-w-lg">
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
                                      title="Save topic title"
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
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span
                                      onClick={() => handleStartEditTopic(topic)}
                                      className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                                      title="Click to correct topic heading"
                                    >
                                      {topic.title}
                                    </span>
                                    <button
                                      onClick={() => handleStartEditTopic(topic)}
                                      className="text-slate-400 hover:text-blue-500 p-0.5 cursor-pointer opacity-70 hover:opacity-100"
                                      title="Edit Topic Heading"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Right Topic Badges */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    topic.isMultiPage
                                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {topic.isMultiPage
                                    ? `Pages ${topic.pageRange[0]}–${topic.pageRange[1]} (Multi-page)`
                                    : `Page ${topic.pageRange[0]}`}
                                </span>

                                <button
                                  onClick={() => handleRemoveTopic(topic.id)}
                                  className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                  title="Remove topic"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Associated Detected Assets Strip */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                              {topic.associatedEquations.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300">
                                  <Calculator className="w-3 h-3" />
                                  <span>{topic.associatedEquations.length} Equation{topic.associatedEquations.length > 1 ? 's' : ''}</span>
                                </span>
                              )}

                              {topic.associatedDiagrams.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300">
                                  <Network className="w-3 h-3" />
                                  <span>{topic.associatedDiagrams.length} Diagram{topic.associatedDiagrams.length > 1 ? 's' : ''}</span>
                                </span>
                              )}

                              {topic.associatedTables.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300">
                                  <TableIcon className="w-3 h-3" />
                                  <span>{topic.associatedTables.length} Table{topic.associatedTables.length > 1 ? 's' : ''}</span>
                                </span>
                              )}

                              {topic.associatedNumericalExamples.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300">
                                  <Hash className="w-3 h-3" />
                                  <span>{topic.associatedNumericalExamples.length} Worked Problem{topic.associatedNumericalExamples.length > 1 ? 's' : ''}</span>
                                </span>
                              )}

                              {topic.subtopics.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  <Layers className="w-3 h-3" />
                                  <span>{topic.subtopics.length} Subtopic{topic.subtopics.length > 1 ? 's' : ''}</span>
                                </span>
                              )}
                            </div>

                            {/* Subtopics Checklist / Bullets */}
                            {topic.subtopics.length > 0 && (
                              <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                {topic.subtopics.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                      <span className="truncate">{sub.title}</span>
                                    </div>
                                    <span className="text-slate-400 shrink-0 text-[10px]">
                                      p. {sub.pageRange[0]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Topic Inline Modal */}
        {showAddModal && (
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border-t border-b border-blue-200 dark:border-blue-800 space-y-3">
            <div className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
              <span>Add Custom Topic to Chapter</span>
              <button onClick={() => setShowAddModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Topic Title (e.g., Critical Section & Semaphores)"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="flex-1 min-w-[240px] px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <div className="flex items-center gap-1.5 text-xs">
                <span>Start Page:</span>
                <input
                  type="number"
                  min="1"
                  value={newTopicStartPage}
                  onChange={(e) => setNewTopicStartPage(parseInt(e.target.value, 10) || 1)}
                  className="w-14 px-2 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span>End Page:</span>
                <input
                  type="number"
                  min={newTopicStartPage}
                  value={newTopicEndPage}
                  onChange={(e) => setNewTopicEndPage(parseInt(e.target.value, 10) || newTopicStartPage)}
                  className="w-14 px-2 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={() => handleAddTopicSubmit(showAddModal)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Add Topic
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              All 7 learning formats will be generated strictly around this verified hierarchy.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAll}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Confirm Hierarchy & Learn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
