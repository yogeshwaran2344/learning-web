import React, { useState } from 'react';
import { AcademicDocument, LearningFormat, SourceCitation } from '../../types';
import { WorkspaceHeader } from './WorkspaceHeader';
import { OriginalDocumentView } from './OriginalDocumentView';
import { ConceptMapView } from './ConceptMapView';
import { ExplanationView } from './ExplanationView';
import { FlashcardView } from './FlashcardView';
import { AudioLessonView } from './AudioLessonView';
import { MeaningPreservationView } from './MeaningPreservationView';

interface WorkspaceProps {
  document: AcademicDocument;
  initialFormat?: LearningFormat;
  onBackToDashboard: () => void;
  onUpdateFlashcardMastery: (docId: string, cardId: string, level: number) => void;
  onOpenFeedback: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  document,
  initialFormat = 'map',
  onBackToDashboard,
  onUpdateFlashcardMastery,
  onOpenFeedback
}) => {
  const [currentFormat, setCurrentFormat] = useState<LearningFormat>(initialFormat);
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [highlightedCitation, setHighlightedCitation] = useState<SourceCitation | null>(null);

  const handleNavigateToCitation = (citation: SourceCitation) => {
    setHighlightedCitation(citation);
    // If not in split view, toggle split view on or switch to original document so user sees the source immediately
    if (!isSplitView && currentFormat !== 'source') {
      setIsSplitView(true);
    }
  };

  const handleClearHighlight = () => {
    setHighlightedCitation(null);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Workspace Header */}
      <WorkspaceHeader
        document={document}
        currentFormat={currentFormat}
        onSelectFormat={(fmt) => setCurrentFormat(fmt)}
        isSplitView={isSplitView}
        onToggleSplitView={() => setIsSplitView(s => !s)}
        onBackToDashboard={onBackToDashboard}
        onOpenFeedback={onOpenFeedback}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Original Document (in Split View or if format is 'source') */}
        {(isSplitView || currentFormat === 'source') && (
          <div className={`${isSplitView && currentFormat !== 'source' ? 'w-1/2 hidden md:block' : 'w-full'} h-full overflow-hidden`}>
            <OriginalDocumentView
              document={document}
              highlightedCitation={highlightedCitation}
              onClearHighlight={handleClearHighlight}
            />
          </div>
        )}

        {/* Right Side: Active Learning Format */}
        {currentFormat !== 'source' && (
          <div className={`${isSplitView ? 'w-full md:w-1/2' : 'w-full'} h-full overflow-hidden border-l border-slate-200 dark:border-slate-800`}>
            {currentFormat === 'map' && (
              <ConceptMapView
                conceptMap={document.conceptMap}
                onNavigateToCitation={handleNavigateToCitation}
              />
            )}

            {currentFormat === 'explanation' && (
              <ExplanationView
                explanations={document.explanations}
                onNavigateToCitation={handleNavigateToCitation}
                onOpenFeedback={onOpenFeedback}
              />
            )}

            {currentFormat === 'flashcards' && (
              <FlashcardView
                documentId={document.id}
                flashcards={document.flashcards}
                onUpdateMastery={onUpdateFlashcardMastery}
                onNavigateToCitation={handleNavigateToCitation}
              />
            )}

            {currentFormat === 'audio' && (
              <AudioLessonView
                audioLesson={document.audioLesson}
                onNavigateToCitation={handleNavigateToCitation}
              />
            )}

            {currentFormat === 'preservation' && (
              <MeaningPreservationView
                report={document.meaningPreservation}
                documentTitle={document.title}
                documentId={document.id}
                onNavigateToCitation={handleNavigateToCitation}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
