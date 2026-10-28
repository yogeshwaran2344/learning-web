import React, { useState } from 'react';
import {
  BookmarkCheck,
  Search,
  Filter,
  Layers,
  Network,
  BookOpen,
  Award,
  Bookmark,
  ExternalLink,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { SavedItem, AcademicDocument, StudioTab } from '../../types';

interface SavedMaterialsPageProps {
  savedItems: SavedItem[];
  documents: AcademicDocument[];
  onSelectDocument: (doc: AcademicDocument, tab?: StudioTab) => void;
  onRemoveItem: (id: string) => void;
}

export const SavedMaterialsPage: React.FC<SavedMaterialsPageProps> = ({
  savedItems,
  documents,
  onSelectDocument,
  onRemoveItem
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = savedItems.filter((item) => {
    const matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.documentTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpenDocument = (docId: string, itemType: SavedItem['type']) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    let targetTab: StudioTab = 'original';
    if (itemType === 'flashcard') targetTab = 'flashcards';
    else if (itemType === 'concept_map') targetTab = 'map';
    else if (itemType === 'notes') targetTab = 'notes';
    else if (itemType === 'quiz') targetTab = 'quiz';

    onSelectDocument(doc, targetTab);
  };

  const getItemIcon = (type: SavedItem['type']) => {
    switch (type) {
      case 'concept_map': return <Network className="w-4 h-4 text-blue-500" />;
      case 'flashcard': return <Layers className="w-4 h-4 text-purple-500" />;
      case 'notes': return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'quiz': return <Award className="w-4 h-4 text-amber-500" />;
      default: return <Bookmark className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Saved Study Materials & Bookmarks
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Review your saved flashcards, concept maps, revision notes, and bookmarked academic passages.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved cards, notes, or passages..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto font-semibold">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'concept_map', label: 'Concept Maps' },
            { id: 'flashcard', label: 'Flashcards' },
            { id: 'notes', label: 'Structured Notes' },
            { id: 'source_passage', label: 'Source Passages' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                selectedFilter === f.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <BookmarkCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No saved items found</h3>
            <p className="text-xs text-slate-400">Save cards, notes, or passages while studying in the Learning Studio.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {getItemIcon(item.type)}
                    <span>{item.type.replace('_', ' ')}</span>
                  </span>

                  <span className="text-slate-400 text-[11px]">{item.savedAt}</span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {item.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3">
                  {item.content}
                </p>

                <div className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold truncate">
                  📄 {item.documentTitle}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenDocument(item.documentId, item.type)}
                  className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <span>Reopen Document</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  title="Remove saved item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
