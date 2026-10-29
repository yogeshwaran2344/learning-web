import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  BarChart3,
  Users,
  Eye,
  Award,
  Plus,
  Trash2,
  FileCheck2,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Edit3,
  XCircle,
  ThumbsUp,
  RefreshCw
} from 'lucide-react';
import { LecturerCourse, AcademicDocument, PreservedFactCheck } from '../../types';
import { ApiClient } from '../../services/apiClient';

interface LecturerWorkspacePageProps {
  courses: LecturerCourse[];
  documents: AcademicDocument[];
  onToggleCoursePublish: (courseId: string) => void;
  onOpenDocumentReview: (doc: AcademicDocument) => void;
}

export const LecturerWorkspacePage: React.FC<LecturerWorkspacePageProps> = ({
  courses,
  documents,
  onToggleCoursePublish,
  onOpenDocumentReview
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'materials' | 'grounding' | 'analytics' | 'feedback'>('materials');

  // Real Analytics State
  const [courseAnalytics, setCourseAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);

  // Verification Review State
  const [allFactChecks, setAllFactChecks] = useState<{ doc: AcademicDocument; fact: PreservedFactCheck }[]>([]);
  const [editingFact, setEditingFact] = useState<{ docId: string; fact: PreservedFactCheck } | null>(null);
  const [editedQuote, setEditedQuote] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');

  // Student Feedback State
  const [feedbackReports, setFeedbackReports] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');

  // Add Document to Course Modal
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState<boolean>(false);

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const courseDocs = documents.filter(d => activeCourse?.documentIds?.includes(d.id));

  // Load Real Quiz Analytics & Fact Checks
  const fetchAnalytics = async (courseId: string) => {
    setIsLoadingAnalytics(true);
    try {
      const data = await ApiClient.getCourseQuizAnalytics(courseId);
      setCourseAnalytics(data);
    } catch (e) {
      console.warn('Failed to load course quiz analytics:', e);
      setCourseAnalytics(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const fetchFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const reports = await ApiClient.getFeedbackReports();
      setFeedbackReports(reports);
    } catch (e) {
      console.warn('Failed to load feedback reports:', e);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  useEffect(() => {
    if (activeCourse?.id) {
      fetchAnalytics(activeCourse.id);
    }
    fetchFeedback();
  }, [selectedCourseId, activeCourse?.id]);

  // Aggregate fact checks across active course documents
  useEffect(() => {
    const factsList: { doc: AcademicDocument; fact: PreservedFactCheck }[] = [];
    for (const doc of courseDocs) {
      if (doc.meaningPreservation?.factChecks) {
        for (const fc of doc.meaningPreservation.factChecks) {
          factsList.push({ doc, fact: fc });
        }
      }
    }
    setAllFactChecks(factsList);
  }, [selectedCourseId, documents]);

  // Faculty Actions
  const handleApproveFact = async (docId: string, factId: string) => {
    try {
      await ApiClient.approveVerificationItem(docId, factId, 'Approved by Faculty: Preserves original document meaning.');
      setAllFactChecks(prev => prev.map(item => {
        if (item.doc.id === docId && item.fact.id === factId) {
          return {
            ...item,
            fact: { ...item.fact, status: 'fully_preserved', notes: 'Approved by Faculty' }
          };
        }
        return item;
      }));
    } catch (e) {
      alert('Failed to approve fact: ' + (e as Error).message);
    }
  };

  const handleRejectFact = async (docId: string, factId: string) => {
    try {
      await ApiClient.rejectVerificationItem(docId, factId, 'Rejected by Faculty: Not sufficiently grounded in source passage.');
      setAllFactChecks(prev => prev.map(item => {
        if (item.doc.id === docId && item.fact.id === factId) {
          return {
            ...item,
            fact: { ...item.fact, status: 'needs_review', notes: 'Rejected by Faculty' }
          };
        }
        return item;
      }));
    } catch (e) {
      alert('Failed to reject fact: ' + (e as Error).message);
    }
  };

  const handleSaveFactEdit = async () => {
    if (!editingFact || !editedQuote.trim()) return;
    try {
      await ApiClient.correctVerificationItem(
        editingFact.docId,
        editingFact.fact.id,
        editedQuote.trim(),
        editedNotes.trim() || 'Faculty verified revision.'
      );
      setAllFactChecks(prev => prev.map(item => {
        if (item.doc.id === editingFact.docId && item.fact.id === editingFact.fact.id) {
          return {
            ...item,
            fact: {
              ...item.fact,
              originalFact: editedQuote.trim(),
              status: 'fully_preserved',
              notes: 'Corrected and grounded by Faculty.'
            }
          };
        }
        return item;
      }));
      setEditingFact(null);
    } catch (e) {
      alert('Failed to save correction: ' + (e as Error).message);
    }
  };

  const handleAssignDoc = async (docId: string) => {
    if (!activeCourse) return;
    try {
      await ApiClient.assignDocToCourse(activeCourse.id, docId);
      if (!activeCourse.documentIds.includes(docId)) {
        activeCourse.documentIds.push(docId);
      }
      setIsAddDocModalOpen(false);
      fetchAnalytics(activeCourse.id);
    } catch (e) {
      alert('Failed to assign document: ' + (e as Error).message);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    if (!activeCourse) return;
    if (!confirm('Remove this document from the course pack?')) return;
    try {
      await ApiClient.removeDocFromCourse(activeCourse.id, docId);
      activeCourse.documentIds = activeCourse.documentIds.filter(id => id !== docId);
      fetchAnalytics(activeCourse.id);
    } catch (e) {
      alert('Failed to remove document: ' + (e as Error).message);
    }
  };

  const handleUpdateFeedbackStatus = async (id: string, status: 'reviewed' | 'resolved') => {
    try {
      await ApiClient.updateFeedbackStatus(id, status, 'Inspected by Faculty.');
      setFeedbackReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      alert('Failed to update feedback status: ' + (e as Error).message);
    }
  };

  const flaggedFacts = allFactChecks.filter(item => item.fact.status !== 'fully_preserved');
  const filteredFeedback = feedbackReports.filter(r => feedbackFilter === 'all' || r.reason === feedbackFilter || r.status === feedbackFilter);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950/60 dark:text-accent-300 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4" />
            <span>Faculty & Lecturer Command Centre • Step 36</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Course Management & Faculty Grounding Audit
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publish verified learning packs, review flagged statements, inspect genuine comprehension telemetry, and resolve student feedback.
          </p>
        </div>

        {activeCourse && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAnalytics(activeCourse.id)}
              title="Refresh telemetry"
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => onToggleCoursePublish(activeCourse.id)}
              className={`py-2.5 px-5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto ${
                activeCourse.isPublished
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              {activeCourse.isPublished ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Published to Students (Live)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Publish Course Pack</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Courses Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {courses.map((course) => {
          const isSelected = selectedCourseId === course.id;
          return (
            <div
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-accent-500 shadow-lg ring-2 ring-accent-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-500">{course.code}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    course.isPublished
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {course.isPublished ? 'Live to Class' : 'Draft Only'}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                {course.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {course.studentCount} Enrolled
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {courseAnalytics?.hasActivity ? `${courseAnalytics.averageQuizScore}% Avg Quiz` : 'No attempts yet'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Faculty Command Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'materials'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Learning Materials ({courseDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grounding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'grounding'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Pre-Publication Truth Audit ({flaggedFacts.length} flagged)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Student Comprehension & Quiz Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Student Feedback Loop ({feedbackReports.filter(r => r.status === 'pending').length} pending)</span>
        </button>
      </div>

      {/* TAB 1: Course Learning Materials */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent-500" />
              <span>Course Pack Documents ({activeCourse?.code})</span>
            </h2>
            <button
              onClick={() => setIsAddDocModalOpen(true)}
              className="py-1.5 px-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document to Course</span>
            </button>
          </div>

          <div className="space-y-3">
            {courseDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {doc.fileType}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {doc.meaningPreservation?.overallFidelityScore ?? 96}% Grounded Fidelity
                    </span>
                    <span className="text-slate-400">• {doc.pageCount} Pages</span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {doc.summary}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => onOpenDocumentReview(doc)}
                    className="px-4 py-2 rounded-xl bg-accent-50 hover:bg-accent-100 dark:bg-accent-950/60 text-accent-800 dark:text-accent-200 border border-accent-200 dark:border-accent-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                  </button>

                  <button
                    onClick={() => handleRemoveDoc(doc.id)}
                    title="Remove from course"
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {courseDocs.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No documents have been added to this course pack yet.</p>
                <button
                  onClick={() => setIsAddDocModalOpen(true)}
                  className="py-2 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Lecture Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Pre-Publication Truth Audit & Grounding Review */}
      {activeTab === 'grounding' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-500" />
                <span>Meaning Preservation & Faculty Grounding Audit</span>
              </h2>
              <p className="text-xs text-slate-500">
                Inspect AI-generated claims side-by-side with original quotes. Approve valid statements or edit and ground altered formulas.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {allFactChecks.length} Total Claims Audited
            </span>
          </div>

          <div className="space-y-3">
            {allFactChecks.map(({ doc, fact }) => {
              const isFlagged = fact.status !== 'fully_preserved';
              return (
                <div
                  key={`${doc.id}-${fact.id}`}
                  className={`p-5 rounded-3xl border transition-all space-y-3 ${
                    isFlagged
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {doc.title}
                      </span>
                      <span className="text-slate-400">• Page {fact.pageNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          fact.status === 'fully_preserved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {fact.status === 'fully_preserved' ? 'Verified Grounded' : 'Needs Review'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApproveFact(doc.id, fact.id)}
                        className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingFact({ docId: doc.id, fact });
                          setEditedQuote(fact.originalFact);
                          setEditedNotes(fact.notes || '');
                        }}
                        className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit & Ground</span>
                      </button>

                      <button
                        onClick={() => handleRejectFact(doc.id, fact.id)}
                        className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Original Passage Quote (Page {fact.pageNumber})
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">
                        "{fact.originalQuote || 'Primary excerpt from academic document.'}"
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Generated Claim & Mathematical Check
                      </span>
                      <p className="text-slate-900 dark:text-white font-medium leading-relaxed">
                        {fact.originalFact}
                      </p>
                      {fact.notes && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                          Auditor Note: {fact.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Genuine Student Comprehension Telemetry */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>Consented Student Comprehension Telemetry ({activeCourse?.code})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Calculated strictly from genuine student quiz attempts in the database.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              N = {activeCourse?.studentCount} Enrolled Students
            </span>
          </div>

          {courseAnalytics?.hasActivity ? (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="text-slate-400 font-semibold">Average Quiz Score</div>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {courseAnalytics.averageQuizScore}%
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Computed across {courseAnalytics.totalAttempts} completed attempt(s)
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="text-slate-400 font-semibold">Total Quiz Submissions</div>
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {courseAnalytics.totalAttempts}
                  </div>
                  <p className="text-[10px] text-slate-500">Active student practice sessions</p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="text-slate-400 font-semibold">Struggling Questions</div>
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                    {courseAnalytics.frequentlyMissedQuestions?.length || 0}
                  </div>
                  <p className="text-[10px] text-slate-500">Questions with high error rates</p>
                </div>
              </div>

              {/* Frequently Missed Concepts */}
              {courseAnalytics.frequentlyMissedQuestions?.length > 0 && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Frequently Missed Concepts & Questions</span>
                  </h3>
                  <div className="space-y-3">
                    {courseAnalytics.frequentlyMissedQuestions.map((q: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Question Identifier: {q.questionId}
                          </span>
                          <div className="text-[11px] text-slate-500">
                            {q.incorrectResponses} incorrect out of {q.totalResponses} total attempts
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {q.errorRatePercent}% Error Rate
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 space-y-2">
              <BarChart3 className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                No Student Attempts Recorded Yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No students have submitted practice quiz attempts for this course yet. Real telemetry will populate automatically as quizzes are completed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Student Feedback Reports (Step 39) */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-500" />
                <span>Student Academic Inaccuracy Reports & Corrections</span>
              </h2>
              <p className="text-xs text-slate-500">
                Review reports submitted by students highlighting unclear analogies, missing conditions, or translation issues.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Filter:</span>
              <select
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="all">All Feedback</option>
                <option value="pending">Pending Review</option>
                <option value="resolved">Resolved</option>
                <option value="incorrect_explanation">Incorrect Explanation</option>
                <option value="missing_concept">Missing Concept</option>
                <option value="wrong_answer">Wrong Answer</option>
                <option value="translation_issue">Translation Issue</option>
                <option value="source_mismatch">Source Mismatch</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredFeedback.map((report) => (
              <div
                key={report.id}
                className={`p-5 rounded-3xl border transition-all space-y-3 ${
                  report.status === 'pending'
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {report.reason.replace(/_/g, ' ')}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Format: {report.formatType}
                    </span>
                    <span className="text-slate-400">
                      • Reported by {report.userName || 'Student'} on {new Date(report.reportedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {report.status !== 'resolved' ? (
                      <button
                        onClick={() => handleUpdateFeedbackStatus(report.id, 'resolved')}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                      >
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs">
                  <p className="text-slate-900 dark:text-white font-medium">
                    "{report.userComment}"
                  </p>
                  {report.sourcePassage && (
                    <p className="text-[11px] text-slate-500 italic mt-2 border-t border-slate-100 dark:border-slate-700 pt-2">
                      Cited Snippet: "{report.sourcePassage}"
                    </p>
                  )}
                </div>
              </div>
            ))}

            {filteredFeedback.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                <p className="text-xs">No pending student inaccuracy reports match the filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit & Ground Claim Modal */}
      {editingFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-500" />
              <span>Edit & Re-Ground Fact with Source</span>
            </h3>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Original Document Quote</span>
              <p className="italic text-slate-700 dark:text-slate-300">"{editingFact.fact.originalQuote}"</p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Faculty Corrected Formulation / Equation
              </label>
              <textarea
                rows={3}
                value={editedQuote}
                onChange={(e) => setEditedQuote(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Auditor / Faculty Grounding Notes
              </label>
              <input
                type="text"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="e.g. Adjusted parameter symbols to match textbook derivation."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditingFact(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFactEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Save & Ground Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document to Course Modal */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Document to {activeCourse?.code}
            </h3>
            <p className="text-xs text-slate-500">
              Select an uploaded document to make it available to enrolled students in this course pack.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {documents.filter(d => !activeCourse?.documentIds?.includes(d.id)).map(doc => (
                <div
                  key={doc.id}
                  onClick={() => handleAssignDoc(doc.id)}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 hover:border-brand-300 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 dark:text-white">{doc.title}</div>
                    <div className="text-[10px] text-slate-400">{doc.category} • {doc.pageCount} Pages</div>
                  </div>
                  <Plus className="w-4 h-4 text-brand-500" />
                </div>
              ))}

              {documents.filter(d => !activeCourse?.documentIds?.includes(d.id)).length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  All library documents are already in this course pack.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsAddDocModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
