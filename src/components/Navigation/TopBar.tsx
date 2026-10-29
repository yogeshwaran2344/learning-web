import React, { useState } from 'react';
import {
  Search,
  Globe,
  Bell,
  PanelRight,
  ShieldCheck,
  AlertTriangle,
  User,
  Sliders,
  Check,
  FileCheck2,
  Zap,
  LogOut
} from 'lucide-react';
import { AppLanguage, Role, UserPreferences, AcademicDocument } from '../../types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  role: Role;
  onToggleRole: () => void;
  isContextPanelOpen: boolean;
  onToggleContextPanel: () => void;
  onOpenAccessibility: () => void;
  onOpenBenchmark?: () => void;
  onOpenIntegrationTest?: () => void;
  onOpenSystemTracker?: () => void;
  activeDocument: AcademicDocument | null;
  documents: AcademicDocument[];
  currentUser?: any;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  language,
  onLanguageChange,
  role,
  onToggleRole,
  isContextPanelOpen,
  onToggleContextPanel,
  onOpenAccessibility,
  onOpenBenchmark,
  onOpenIntegrationTest,
  onOpenSystemTracker,
  activeDocument,
  documents,
  currentUser,
  onLogout,
  onOpenLogin
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Compute unread warnings and alerts
  const warningsList = documents.flatMap(d =>
    (d.extractionWarnings || []).map(w => ({ docTitle: d.title, warning: w, docId: d.id }))
  );

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Global Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search concepts, equations, documents, or citations..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Right Actions & Utilities */}
      <div className="flex items-center space-x-3">
        {/* Language Selection Dropdown (English, Kannada, Hindi) */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all"
            title="Language Selection"
          >
            <Globe className="w-3.5 h-3.5 text-brand-500" />
            <span>{language === 'English' ? 'EN' : language === 'Kannada' ? 'ಕನ್ನಡ' : 'हिन्दी'}</span>
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Display Language
              </div>
              {(['English', 'Kannada', 'Hindi'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    onLanguageChange(lang);
                    setIsLangDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${
                    language === lang
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>
                    {lang === 'English' && 'English (US)'}
                    {lang === 'Kannada' && 'Kannada (ಕನ್ನಡ)'}
                    {lang === 'Hindi' && 'Hindi (हिन्दी)'}
                  </span>
                  {language === lang && <Check className="w-3.5 h-3.5 text-brand-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Accessibility Modal Trigger */}
        <button
          onClick={onOpenAccessibility}
          className="p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          title="Accessibility & Text Controls"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Step 4 Extraction & OCR Benchmark Trigger */}
        {onOpenBenchmark && (
          <button
            onClick={onOpenBenchmark}
            className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            title="Step 4: Document Extraction & OCR Benchmark Suite"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-500" />
          </button>
        )}

        {/* Step 7 System Integration Test Runner */}
        {onOpenIntegrationTest && (
          <button
            onClick={onOpenIntegrationTest}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            title="Step 7: 10-Point System Integration Test Suite"
          >
            <Zap className="w-4 h-4 text-indigo-500" />
          </button>
        )}

        {/* Step 34: 20-Feature System Verification Suite */}
        {onOpenSystemTracker && (
          <button
            onClick={onOpenSystemTracker}
            className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            title="Step 34: 20-Feature System Test Tracker & Failure Baselines"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </button>
        )}

        {/* Notifications & Warning Alerts Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 relative"
            title="Processing Alerts & Content Warnings"
          >
            <Bell className="w-4 h-4" />
            {warningsList.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 absolute top-1 right-1" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Content & Extraction Alerts
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                  {warningsList.length} Items
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                {warningsList.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">All documents cleanly extracted.</p>
                ) : (
                  warningsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-slate-700 dark:text-slate-300 space-y-1"
                    >
                      <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="truncate">{item.docTitle}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{item.warning}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Context Panel Button */}
        <button
          onClick={onToggleContextPanel}
          className={`p-2 rounded-xl transition-all border ${
            isContextPanelOpen
              ? 'bg-brand-50 border-brand-300 text-brand-600 dark:bg-brand-950 dark:border-brand-700 dark:text-brand-300'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
          }`}
          title="Toggle Context & Citation Panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>

        {/* User Profile Avatar Pill with Sign Out */}
        {currentUser ? (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center text-white text-xs font-bold">
              {currentUser.role === 'student' ? 'ST' : 'PR'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {currentUser.name || (currentUser.role === 'student' ? 'Alex Rivera' : 'Prof. Ramesh')}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {currentUser.role || role} Account
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out of LearnLens"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="py-1.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
