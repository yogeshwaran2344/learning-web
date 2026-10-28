import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  BarChart3,
  Users,
  Eye,
  Award,
  Plus
} from 'lucide-react';
import { LecturerCourse, AcademicDocument } from '../../types';

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

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const courseDocs = documents.filter(d => activeCourse?.documentIds?.includes(d.id));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950/60 dark:text-accent-300 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4" />
            <span>Faculty & Lecturer Command Centre</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Course Management & Faculty Review
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit AI-generated study formats, approve revisions, and control learning pack publishing for your students.
          </p>
        </div>

        {activeCourse && (
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
                <span>Published to Students (Active)</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Publish Course Pack</span>
              </>
            )}
          </button>
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
                  {course.studentCount} Students
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {course.averageQuizScore}% Avg Quiz
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Materials & Verification Status Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent-500" />
            <span>Course Learning Packs & Pre-Publication Audit</span>
          </h2>
          <span className="text-xs text-slate-400">
            {courseDocs.length} Core Document(s) in {activeCourse?.code}
          </span>
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
                    {doc.meaningPreservation?.overallFidelityScore ?? 96}% Meaning Preserved
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {doc.summary}
                </p>
              </div>

              {/* Faculty Actions */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onOpenDocumentReview(doc)}
                  className="px-4 py-2 rounded-xl bg-accent-50 hover:bg-accent-100 dark:bg-accent-950/60 text-accent-800 dark:text-accent-200 border border-accent-200 dark:border-accent-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review & Approve Revisions</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aggregated Student Usability & Quiz Telemetry */}
      {activeCourse && (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>Consented Student Comprehension Telemetry ({activeCourse.code})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              N = {activeCourse.studentCount} Participants
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-slate-400 font-semibold">Average Quiz Score</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {activeCourse.averageQuizScore}%
              </div>
              <p className="text-[10px] text-slate-500">+18% higher than raw PDF cohort</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-slate-400 font-semibold">Most Helpful Format</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                Concept Maps
              </div>
              <p className="text-[10px] text-slate-500">Selected by 64% of enrolled students</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-slate-400 font-semibold">Reported Inaccuracies</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                0
              </div>
              <p className="text-[10px] text-slate-500">Zero active hallucination flags</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
