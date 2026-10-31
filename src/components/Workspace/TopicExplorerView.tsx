import React from 'react';
import { TopicExplorerPage } from '../Pages/TopicExplorerPage';
import { AcademicDocument, DocumentTopic, StudioTab, SourceCitation } from '../../types';

interface TopicExplorerViewProps {
  document: AcademicDocument;
  onLearnTopic: (topic: DocumentTopic, preferredFormat?: StudioTab) => void;
  onNavigateToCitation?: (citation: SourceCitation) => void;
  onNavigateToPage?: (pageNumber: number) => void;
  onDocumentUpdate?: (updatedDoc: AcademicDocument) => void;
}

export const TopicExplorerView: React.FC<TopicExplorerViewProps> = ({
  document,
  onLearnTopic,
  onNavigateToCitation,
  onNavigateToPage,
  onDocumentUpdate
}) => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900/60 p-2 sm:p-4">
      <TopicExplorerPage
        document={document}
        onLearnTopic={onLearnTopic}
        onNavigateToDocumentList={() => {}}
        onDocumentUpdate={onDocumentUpdate}
        onNavigateToCitation={onNavigateToCitation}
        onNavigateToPage={onNavigateToPage}
      />
    </div>
  );
};
