import React, { useState, useEffect } from 'react';
import { FolderTree } from 'lucide-react';
import {
  AcademicDocument,
  NavigationPage,
  StudioTab,
  UserPreferences,
  SourceCitation,
  SavedItem,
  LecturerCourse,
  AppLanguage
} from './types';
import { StorageService } from './services/storageService';
import { ApiClient } from './services/apiClient';
import { Sidebar } from './components/Navigation/Sidebar';
import { TopBar } from './components/Navigation/TopBar';
import { ContextPanel } from './components/Navigation/ContextPanel';

// Pages
import { DashboardPage } from './components/Pages/DashboardPage';
import { MyDocumentsPage } from './components/Pages/MyDocumentsPage';
import { UploadMaterialPage } from './components/Pages/UploadMaterialPage';
import { TopicExplorerPage } from './components/Pages/TopicExplorerPage';
import { LearningStudioPage } from './components/Pages/LearningStudioPage';
import { SourceVerificationPage } from './components/Pages/SourceVerificationPage';
import { SavedMaterialsPage } from './components/Pages/SavedMaterialsPage';
import { LecturerWorkspacePage } from './components/Pages/LecturerWorkspacePage';
import { SettingsPage } from './components/Pages/SettingsPage';

// Modals
import { AccessibilityModal } from './components/AccessibilityModal';
import { FeedbackModal } from './components/FeedbackModal';
import { UsabilityTestModal } from './components/UsabilityTestModal';
import { ExtractionBenchmarkModal } from './components/ExtractionBenchmarkModal';
import { IntegrationTestModal } from './components/IntegrationTestModal';
import { SystemTestTrackerModal } from './components/SystemTestTrackerModal';
import { AuthModal } from './components/AuthModal';

export function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [documents, setDocuments] = useState<AcademicDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<AcademicDocument | null>(null);
  const [studioTab, setStudioTab] = useState<StudioTab>('map');
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(StorageService.getPreferences());

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(!ApiClient.getToken());
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Modals
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isUsabilityOpen, setIsUsabilityOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [isSystemTrackerOpen, setIsSystemTrackerOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    async function loadInitialData() {
      const isBackendLive = await ApiClient.checkHealth();
      const token = ApiClient.getToken();

      if (isBackendLive && token) {
        try {
          const user = await ApiClient.getMe();
          if (user) {
            setCurrentUser(user);
            setIsAuthOpen(false);
            if (user.role && user.role !== preferences.role) {
              setPreferences(prev => ({ ...prev, role: user.role }));
            }
            const [backendDocs, backendSaved, backendCourses] = await Promise.all([
              ApiClient.getDocuments(),
              ApiClient.getSavedItems(),
              ApiClient.getCourses()
            ]);
            setDocuments(backendDocs || []);
            setActiveDocument(backendDocs?.[0] || null);
            if (backendSaved) setSavedItems(backendSaved);
            if (backendCourses) setCourses(backendCourses);
            setIsCheckingAuth(false);
            return;
          }
        } catch (e) {
          console.warn('API auth verification failed:', e);
        }
      }

      // If no valid auth session, prompt user to log in from the beginning
      ApiClient.logout();
      setCurrentUser(null);
      setIsAuthOpen(true);
      setDocuments([]);
      setActiveDocument(null);
      setIsCheckingAuth(false);
    }

    loadInitialData();
  }, []);

  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    if (user.role) {
      handleUpdatePreferences({ role: user.role });
    }
    try {
      const [backendDocs, backendSaved, backendCourses] = await Promise.all([
        ApiClient.getDocuments(),
        ApiClient.getSavedItems(),
        ApiClient.getCourses()
      ]);
      setDocuments(backendDocs || []);
      setActiveDocument(backendDocs?.[0] || null);
      if (backendSaved) setSavedItems(backendSaved);
      if (backendCourses) setCourses(backendCourses);
    } catch (e) {
      console.warn('Post-login data fetch error:', e);
    }
  };

  const handleLogout = () => {
    ApiClient.logout();
    setCurrentUser(null);
    setDocuments([]);
    setActiveDocument(null);
    setSavedItems([]);
    setCourses([]);
    setIsAuthOpen(true);
  };

  // Sync accessibility classes to document body
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.isDyslexicFont) {
      document.body.classList.add('dyslexic-font');
    } else {
      document.body.classList.remove('dyslexic-font');
    }

    if (preferences.isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    let scale = 1.0;
    if (preferences.fontSize === 'sm') scale = 0.88;
    if (preferences.fontSize === 'lg') scale = 1.15;
    if (preferences.fontSize === 'xl') scale = 1.30;
    root.style.setProperty('--font-scale', scale.toString());
  }, [preferences]);

  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    const next = { ...preferences, ...updated };
    setPreferences(next);
    StorageService.savePreferences(next);
  };

  const handleToggleRole = () => {
    const nextRole = preferences.role === 'student' ? 'lecturer' : 'student';
    handleUpdatePreferences({ role: nextRole });
  };

  const handleSelectDocument = (doc: AcademicDocument, tab: StudioTab = 'map') => {
    setActiveDocument(doc);
    setStudioTab(tab);
    setCurrentPage('studio');
  };

  const handleDocumentCreated = (newDoc: AcademicDocument) => {
    StorageService.addDocument(newDoc);
    const updated = StorageService.getDocuments();
    setDocuments(updated);
    setActiveDocument(newDoc);
    setStudioTab('map');
    setCurrentPage('topic-explorer');
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this academic document?')) {
      try {
        await ApiClient.deleteDocument(id);
      } catch (e) {
        console.warn('API delete fallback to local storage:', e);
      }
      StorageService.deleteDocument(id);
      const remaining = StorageService.getDocuments();
      setDocuments(remaining);
      if (activeDocument?.id === id) {
        setActiveDocument(remaining[0] || null);
      }
    }
  };

  const handleClearAllDemoData = async () => {
    if (window.confirm('Clear all documents, saved materials, and courses to start fresh?')) {
      try {
        await ApiClient.clearAllDocuments();
      } catch (e) {
        console.warn('API clear all fallback:', e);
      }
      StorageService.clearAllData();
      setDocuments([]);
      setActiveDocument(null);
      setSavedItems([]);
      setCourses([]);
    }
  };

  const handleRenameDocument = async (id: string, newTitle: string) => {
    try {
      await ApiClient.renameDocument(id, newTitle);
    } catch (e) {
      console.warn('API rename fallback to local storage:', e);
    }
    StorageService.renameDocument(id, newTitle);
    const updated = StorageService.getDocuments();
    setDocuments(updated);
    if (activeDocument?.id === id) {
      setActiveDocument({ ...activeDocument, title: newTitle });
    }
  };

  const handleSaveItem = async (item: SavedItem) => {
    try {
      await ApiClient.addSavedItem(item);
    } catch (e) {
      console.warn('API save item fallback to local storage:', e);
    }
    StorageService.addSavedItem(item);
    setSavedItems(StorageService.getSavedItems());
  };

  const handleRemoveSavedItem = async (id: string) => {
    try {
      await ApiClient.removeSavedItem(id);
    } catch (e) {
      console.warn('API remove item fallback to local storage:', e);
    }
    StorageService.removeSavedItem(id);
    setSavedItems(StorageService.getSavedItems());
  };

  const handleToggleCoursePublish = async (courseId: string) => {
    try {
      await ApiClient.togglePublishCourse(courseId);
    } catch (e) {
      console.warn('API toggle course fallback to local storage:', e);
    }
    StorageService.toggleCoursePublish(courseId);
    setCourses(StorageService.getCourses());
  };

  const handleResetData = () => {
    if (window.confirm('Reset application to default research papers, courses, and saved materials?')) {
      StorageService.resetToDefault();
      const docs = StorageService.getDocuments();
      setDocuments(docs);
      setActiveDocument(docs[0] || null);
      setSavedItems(StorageService.getSavedItems());
      setCourses(StorageService.getCourses());
      setCurrentPage('dashboard');
    }
  };

  const handleUpdateFlashcardMastery = (docId: string, cardId: string, level: number) => {
    StorageService.updateFlashcardMastery(docId, cardId, level);
    const updated = StorageService.getDocuments();
    setDocuments(updated);
    if (activeDocument?.id === docId) {
      const match = updated.find(d => d.id === docId);
      if (match) setActiveDocument(match);
    }
  };

  const handleNavigateToCitation = (citation: SourceCitation) => {
    setActiveCitation(citation);
    setIsContextPanelOpen(true);
    if (currentPage !== 'studio') {
      setCurrentPage('studio');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans">
      {/* 1. Left Sidebar Navigation (Section 2.1 & 2.2) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        activeDocument={activeDocument}
        role={preferences.role}
        onToggleRole={handleToggleRole}
        onOpenUpload={() => setCurrentPage('upload')}
      />

      {/* 2. Main Center Shell */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar with Search, Language (EN, KN, HI), Notifications, User Profile */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          language={preferences.preferredLanguage}
          onLanguageChange={(lang: AppLanguage) => handleUpdatePreferences({ preferredLanguage: lang })}
          role={preferences.role}
          onToggleRole={handleToggleRole}
          isContextPanelOpen={isContextPanelOpen}
          onToggleContextPanel={() => setIsContextPanelOpen(o => !o)}
          onOpenAccessibility={() => setIsAccessibilityOpen(true)}
          onOpenBenchmark={() => setIsBenchmarkOpen(true)}
          onOpenIntegrationTest={() => setIsIntegrationOpen(true)}
          onOpenSystemTracker={() => setIsSystemTrackerOpen(true)}
          activeDocument={activeDocument}
          documents={documents}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLogin={() => setIsAuthOpen(true)}
        />

        {/* Main Workspace (The 8 Dedicated Pages) */}
        <main className="flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-950">
          {currentPage === 'dashboard' && (
            <DashboardPage
              documents={documents}
              onSelectDocument={handleSelectDocument}
              onNavigate={(page) => setCurrentPage(page)}
              onOpenUpload={() => setCurrentPage('upload')}
              userName={currentUser?.name || (preferences.role === 'student' ? 'Alex' : 'Prof. Ramesh')}
              language={preferences.preferredLanguage}
              onLanguageChange={(lang) => handleUpdatePreferences({ preferredLanguage: lang })}
            />
          )}

          {currentPage === 'documents' && (
            <MyDocumentsPage
              documents={documents}
              onSelectDocument={handleSelectDocument}
              onOpenUpload={() => setCurrentPage('upload')}
              onDeleteDocument={handleDeleteDocument}
              onRenameDocument={handleRenameDocument}
              onClearAll={handleClearAllDemoData}
            />
          )}

          {currentPage === 'upload' && (
            <UploadMaterialPage
              onDocumentCreated={handleDocumentCreated}
              onCancel={() => setCurrentPage('documents')}
              defaultLanguage={preferences.preferredLanguage}
            />
          )}

          {currentPage === 'topic-explorer' && (
            activeDocument ? (
              <TopicExplorerPage
                document={activeDocument}
                onLearnTopic={(topic, preferredFormat) => {
                  if (topic.sourceCitations && topic.sourceCitations[0]) {
                    setActiveCitation(topic.sourceCitations[0]);
                  }
                  if (preferredFormat) {
                    setStudioTab(preferredFormat);
                  }
                  setCurrentPage('studio');
                }}
                onNavigateToDocumentList={() => setCurrentPage('documents')}
                onDocumentUpdate={(updatedDoc) => {
                  setActiveDocument(updatedDoc);
                  setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh] space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FolderTree className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  Select a Document to Explore Topics
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  Choose a document from My Documents or upload new learning material to explore its extracted chapters and topics.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCurrentPage('documents')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    View My Documents
                  </button>
                  <button
                    onClick={() => setCurrentPage('upload')}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
                  >
                    Upload Material
                  </button>
                </div>
              </div>
            )
          )}

          {currentPage === 'studio' && (
            activeDocument ? (
              <LearningStudioPage
                document={activeDocument}
                allDocuments={documents}
                onSelectDocument={(doc) => setActiveDocument(doc)}
                initialTab={studioTab}
                activeCitation={activeCitation}
                onNavigateToCitation={handleNavigateToCitation}
                onUpdateFlashcardMastery={handleUpdateFlashcardMastery}
                onSaveItem={handleSaveItem}
                onOpenFeedback={() => setIsFeedbackOpen(true)}
              />
            ) : (
              <div className="p-12 text-center space-y-4">
                <p className="text-slate-400">Please choose a document from the library first.</p>
                <button
                  onClick={() => setCurrentPage('documents')}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
                >
                  Browse Library
                </button>
              </div>
            )
          )}

          {currentPage === 'verification' && (
            <SourceVerificationPage
              documents={documents}
              activeDocument={activeDocument}
              onSelectDocument={(doc) => setActiveDocument(doc)}
              onNavigateToCitation={handleNavigateToCitation}
              onNavigate={(page) => setCurrentPage(page as NavigationPage)}
            />
          )}

          {currentPage === 'saved' && (
            <SavedMaterialsPage
              savedItems={savedItems}
              documents={documents}
              onSelectDocument={handleSelectDocument}
              onRemoveItem={handleRemoveSavedItem}
            />
          )}

          {currentPage === 'lecturer' && (
            <LecturerWorkspacePage
              courses={courses}
              documents={documents}
              onToggleCoursePublish={handleToggleCoursePublish}
              onOpenDocumentReview={(doc) => handleSelectDocument(doc, 'notes')}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              preferences={preferences}
              onUpdatePreferences={handleUpdatePreferences}
              onResetData={handleResetData}
              onClearAll={handleClearAllDemoData}
            />
          )}
        </main>
      </div>

      {/* 3. Collapsible Context Panel (Source References & Document Metadata) */}
      <ContextPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        activeCitation={activeCitation}
        activeDocument={activeDocument}
        onSaveCitation={handleSaveItem}
        onJumpToCitation={handleNavigateToCitation}
      />

      {/* Floating Modals */}
      <AccessibilityModal
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        documentId={activeDocument?.id}
      />

      <UsabilityTestModal
        isOpen={isUsabilityOpen}
        onClose={() => setIsUsabilityOpen(false)}
      />

      <ExtractionBenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      <IntegrationTestModal
        isOpen={isIntegrationOpen}
        onClose={() => setIsIntegrationOpen(false)}
      />

      <SystemTestTrackerModal
        isOpen={isSystemTrackerOpen}
        onClose={() => setIsSystemTrackerOpen(false)}
      />

      {/* Step 40: Authentication & Secure Sign In Modal */}
      <AuthModal
        isOpen={isAuthOpen || !currentUser}
        onSuccess={handleLoginSuccess}
        canDismiss={Boolean(currentUser)}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}
