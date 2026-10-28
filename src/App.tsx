import React, { useState, useEffect } from 'react';
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

export function App() {
  const initialDocs = StorageService.getDocuments();
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [documents, setDocuments] = useState<AcademicDocument[]>(initialDocs);
  const [activeDocument, setActiveDocument] = useState<AcademicDocument | null>(initialDocs[0] || null);
  const [studioTab, setStudioTab] = useState<StudioTab>('map');
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState<SavedItem[]>(StorageService.getSavedItems());
  const [courses, setCourses] = useState<LecturerCourse[]>(StorageService.getCourses());
  const [preferences, setPreferences] = useState<UserPreferences>(StorageService.getPreferences());

  // Modals
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isUsabilityOpen, setIsUsabilityOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    async function loadInitialData() {
      const isBackendLive = await ApiClient.checkHealth();
      if (isBackendLive) {
        try {
          const [backendDocs, backendSaved, backendCourses] = await Promise.all([
            ApiClient.getDocuments(),
            ApiClient.getSavedItems(),
            ApiClient.getCourses()
          ]);
          if (backendDocs && backendDocs.length > 0) {
            setDocuments(backendDocs);
            setActiveDocument(backendDocs[0]);
          } else {
            const localDocs = StorageService.getDocuments();
            setDocuments(localDocs);
            setActiveDocument(localDocs[0] || null);
          }
          if (backendSaved) setSavedItems(backendSaved);
          if (backendCourses) setCourses(backendCourses);
          return;
        } catch (e) {
          console.warn('API sync fallback to local storage:', e);
        }
      }

      // Fallback
      const docs = StorageService.getDocuments();
      setDocuments(docs);
      setActiveDocument(docs[0] || null);
      setSavedItems(StorageService.getSavedItems());
      setCourses(StorageService.getCourses());
    }

    loadInitialData();
  }, []);

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
    setCurrentPage('studio');
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
          activeDocument={activeDocument}
          documents={documents}
        />

        {/* Main Workspace (The 8 Dedicated Pages) */}
        <main className="flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-950">
          {currentPage === 'dashboard' && (
            <DashboardPage
              documents={documents}
              onSelectDocument={handleSelectDocument}
              onNavigate={(page) => setCurrentPage(page)}
              onOpenUpload={() => setCurrentPage('upload')}
              userName={preferences.role === 'student' ? 'Alex' : 'Prof. Ramesh'}
            />
          )}

          {currentPage === 'documents' && (
            <MyDocumentsPage
              documents={documents}
              onSelectDocument={handleSelectDocument}
              onOpenUpload={() => setCurrentPage('upload')}
              onDeleteDocument={handleDeleteDocument}
              onRenameDocument={handleRenameDocument}
            />
          )}

          {currentPage === 'upload' && (
            <UploadMaterialPage
              onDocumentCreated={handleDocumentCreated}
              onCancel={() => setCurrentPage('documents')}
              defaultLanguage={preferences.preferredLanguage}
            />
          )}

          {currentPage === 'studio' && (
            activeDocument ? (
              <LearningStudioPage
                document={activeDocument}
                initialTab={studioTab}
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
    </div>
  );
}
