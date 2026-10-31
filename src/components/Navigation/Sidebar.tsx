import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  FolderTree,
  Sparkles,
  ShieldCheck,
  BookmarkCheck,
  GraduationCap,
  Settings,
  UploadCloud,
  ChevronRight,
  BookOpen,
  UserCheck,
  Glasses,
  GitCompare,
  Network
} from 'lucide-react';
import { NavigationPage, Role, AcademicDocument } from '../../types';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  activeDocument: AcademicDocument | null;
  role: Role;
  onToggleRole: () => void;
  onOpenUpload: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  activeDocument,
  role,
  onToggleRole,
  onOpenUpload
}) => {
  const mainNavItems: {
    id: NavigationPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'My Documents', icon: FolderOpen },
    { id: 'topic-explorer', label: 'Topic Explorer', icon: FolderTree, badge: activeDocument?.topicHierarchy ? `${activeDocument.topicHierarchy.totalTopicsCount}` : undefined },
    { id: 'studio', label: 'Learning Studio', icon: Sparkles, badge: activeDocument ? 'Active' : undefined },
    { id: 'compare', label: 'Doc Comparison', icon: GitCompare, badge: 'Diff' },
    { id: 'graph', label: 'Knowledge Graph', icon: Network, badge: 'Cross-Doc' },
    { id: 'verification', label: 'Source Verification', icon: ShieldCheck, badge: 'Audit' },
    { id: 'saved', label: 'Saved Materials', icon: BookmarkCheck },
    { id: 'lecturer', label: 'Lecturer Workspace', icon: GraduationCap, badge: role === 'lecturer' ? 'Faculty' : undefined },
    { id: 'settings', label: 'Settings & Accessibility', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none h-screen sticky top-0 transition-colors z-30">
      {/* Top Brand */}
      <div>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  LEARN<span className="text-brand-600 dark:text-brand-400">OVA</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 rounded-md border border-brand-200 dark:border-brand-800">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                Your learning, in a new perspective.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Action Button */}
        <div className="p-4 pb-2">
          <button
            onClick={onOpenUpload}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-xs shadow-md shadow-brand-500/20 hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Material</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-3 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                      isActive
                        ? 'bg-brand-200/60 text-brand-800 dark:bg-brand-900 dark:text-brand-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile and Role Switcher Card */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        {/* Active Document Mini-Pill if selected */}
        {activeDocument && (
          <div
            onClick={() => onNavigate('studio')}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:border-brand-400 transition-colors"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Studio Topic
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {activeDocument.title}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>{activeDocument.fileType.toUpperCase()}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {activeDocument.meaningPreservation && activeDocument.meaningPreservation.overallFidelityScore > 0
                  ? `${activeDocument.meaningPreservation.overallFidelityScore}% Verified`
                  : 'Not Verified'}
              </span>
            </div>
          </div>
        )}

        {/* Role Switcher Pill */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300">
              {role === 'student' ? <UserCheck className="w-3.5 h-3.5 text-brand-600" /> : <Glasses className="w-3.5 h-3.5 text-accent-600" />}
            </div>
            <div>
              <div className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                {role} Mode
              </div>
              <div className="text-[10px] text-slate-400">
                {role === 'student' ? 'Active Learner' : 'Course Instructor'}
              </div>
            </div>
          </div>

          <button
            onClick={onToggleRole}
            className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            Switch
          </button>
        </div>
      </div>
    </aside>
  );
};
