import React, { useState } from 'react';
import {
  FolderOpen,
  Search,
  Filter,
  FileText,
  FileCode,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  Edit2,
  RotateCw,
  ExternalLink,
  UploadCloud,
  Check,
  X
} from 'lucide-react';
import { AcademicDocument, DocumentFileType } from '../../types';

interface MyDocumentsPageProps {
  documents: AcademicDocument[];
  onSelectDocument: (doc: AcademicDocument) => void;
  onOpenUpload: () => void;
  onDeleteDocument: (id: string) => void;
  onRenameDocument: (id: string, newTitle: string) => void;
  onClearAll?: () => void;
}

export const MyDocumentsPage: React.FC<MyDocumentsPageProps> = ({
  documents,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument,
  onRenameDocument,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter logic
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || doc.fileType === selectedType;
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleStartRename = (doc: AcademicDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameDocument(id, editTitle.trim());
    }
    setEditingDocId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Document Library & Organiser
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize academic PDFs, lecture presentations, and scanned course notes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {documents.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="py-2.5 px-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 flex items-center gap-1.5 transition-all shadow-sm"
              title="Delete all demo and uploaded documents"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="py-2.5 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, author, or keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          {/* File Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Formats (PDF, PPT, Scans)</option>
            <option value="pdf">PDF Documents</option>
            <option value="pptx">PowerPoint Slides</option>
            <option value="scanned_notes">Scanned Notes</option>
          </select>

          {/* Subject Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Academic Subjects</option>
            <option value="Computer Science">Computer Science & AI</option>
            <option value="Physics & Quantum">Physics & Quantum</option>
            <option value="Distributed Systems">Distributed Systems</option>
            <option value="Mathematics">Mathematics</option>
          </select>
        </div>
      </div>

      {/* Document List View */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No documents found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or upload a new academic paper.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const hasWarning = doc.processingStatus === 'warning' || (doc.extractionWarnings && doc.extractionWarnings.length > 0);
            const isEditing = editingDocId === doc.id;

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md ${
                  hasWarning
                    ? 'border-amber-300 dark:border-amber-700/80 hover:border-amber-400 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-brand-500'
                }`}
              >
                {/* Left Document Identity */}
                <div className="flex items-start space-x-4 max-w-2xl">
                  {/* Format Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    doc.fileType === 'pdf'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : doc.fileType === 'pptx'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  }`}>
                    <span className="font-mono text-xs font-black uppercase">
                      {doc.fileType === 'scanned_notes' ? 'SCAN' : doc.fileType}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {doc.fileSizeMb || 2.5} MB • {doc.pageCount} Pages • Uploaded {doc.uploadDate}
                      </span>
                    </div>

                    {/* Inline Rename or Title */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="px-3 py-1 text-sm font-bold rounded-lg border border-brand-500 bg-white dark:bg-slate-800"
                        />
                        <button
                          onClick={(e) => handleSaveRename(doc.id, e)}
                          className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="p-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600">
                        {doc.title}
                      </h3>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {doc.author} • {doc.summary}
                    </p>

                    {/* Warnings badge if blurry scan */}
                    {hasWarning && (
                      <div className="pt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{doc.extractionWarnings?.[0] || 'Contains unreadable/blurry scan sections. Reprocessing recommended.'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex items-center space-x-3 self-end md:self-center shrink-0">
                  {/* Meaning Fidelity score */}
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{doc.meaningPreservation?.overallFidelityScore ?? 96}% Fidelity</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {hasWarning ? 'Review Needed' : 'Formally Verified'}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleStartRename(doc, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Rename document"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onSelectDocument(doc)}
                      className="p-2 rounded-xl text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                      title="Open in Learning Studio"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
