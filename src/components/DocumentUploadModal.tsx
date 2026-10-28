import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileCode,
  FileCheck
} from 'lucide-react';
import { AcademicDocument } from '../types';
import { DocumentProcessor } from '../services/documentProcessor';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: (doc: AcademicDocument) => void;
}

type PipelineStage = 'idle' | 'extracting' | 'structuring' | 'generating' | 'verifying' | 'done' | 'error';

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentCreated
}) => {
  const [docTitle, setDocTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<AcademicDocument['category']>('Computer Science');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file contents. Please verify file format.');
    };
    reader.readAsText(file);
  };

  const loadExampleTemplate = (type: 'quantum' | 'consensus' | 'neural') => {
    if (type === 'neural') {
      setDocTitle('Deep Residual Learning for Image Recognition');
      setAuthor('Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun (Microsoft Research)');
      setCategory('Computer Science');
      setRawText(`1. Introduction & Degradation Problem
Deeper neural networks are more difficult to train. When deeper networks are able to start converging, a degradation problem has been exposed: with the network depth increasing, accuracy gets saturated and then degrades rapidly. Unexpectedly, such degradation is not caused by overfitting, and adding more layers to a suitably deep model leads to higher training error.

2. Residual Learning Formulation
Instead of hoping each few stacked layers directly fit a desired underlying mapping H(x), we explicitly let these layers fit a residual mapping F(x) = H(x) - x. The original mapping is recast into F(x) + x. We hypothesize that it is easier to optimize the residual mapping than to optimize the original, unreferenced mapping. To the extreme, if an identity mapping were optimal, it would be easier to push the residual to zero than to fit an identity mapping by a stack of nonlinear layers.

Formula (1): y = F(x, {W_i}) + x
Here x and y are the input and output vectors of the layers considered. The function F(x, {W_i}) represents the residual mapping to be learned. The operation F + x is performed by a shortcut connection and element-wise addition.

Condition Invariant:
The dimensions of x and F must be equal in Equation (1). If this is not the case, we can perform a linear projection W_s by the shortcut connections to match dimensions: y = F(x, {W_i}) + W_s * x.`);
    } else if (type === 'quantum') {
      setDocTitle('Quantum Teleportation and Entangled Quantum Channels');
      setAuthor('Charles H. Bennett, Gilles Brassard, Claude Crépeau, et al.');
      setCategory('Physics & Quantum');
      setRawText(`1. Physical Premise & Bell States
An unknown quantum state |psi> = alpha |0> + beta |1> cannot be cloned or measured directly without collapse. However, using an ancillary pair of maximally entangled particles (an Einstein-Podolsky-Rosen or EPR pair) shared between sender Alice and receiver Bob, the exact quantum information can be transmitted completely.

2. The Teleportation Protocol
Alice performs a joint Bell-state measurement on her particle carrying |psi> and her half of the entangled pair. This measurement projects the two particles into one of four orthogonal Bell states:
|Phi^+> = (|00> + |11>) / sqrt(2)
|Phi^-> = (|00> - |11>) / sqrt(2)
|Psi^+> = (|01> + |10>) / sqrt(2)
|Psi^-> = (|01> - |10>) / sqrt(2)

3. Classical Transmission and Unitary Transformation
Alice transmits two classical bits informing Bob of which Bell state resulted from her measurement. Condition: Quantum information does not travel faster than light, because Bob cannot reconstruct |psi> until he receives the 2 classical bits over a conventional channel.`);
    } else {
      setDocTitle('Byzantine Fault Tolerant Replication: The PBFT Algorithm');
      setAuthor('Miguel Castro and Barbara Liskov (MIT Laboratory for Computer Science)');
      setCategory('Distributed Systems');
      setRawText(`1. Problem Formulation
Malicious attacks and software errors can cause faulty nodes to exhibit Byzantine (arbitrary) behavior. Previous replicated algorithms assumed fail-stop models. Practical Byzantine Fault Tolerance (PBFT) provides state machine replication under weak asynchronous assumptions.

2. Resilience Threshold & Quorum
Condition: A Byzantine fault-tolerant system can provide safety and liveness if and only if the total number of replicas N satisfies:
N >= 3f + 1
where f is the maximum number of simultaneously faulty or adversarial nodes.

3. Three-Phase Consensus Protocol
The protocol consists of three phases: Pre-Prepare, Prepare, and Commit. A replica accepts a Pre-Prepare message only if its digital signature is valid and the view number matches the current view.`);
    }
  };

  const handleStartProcessing = async () => {
    if (!rawText.trim()) {
      setErrorMessage('Please provide document text or upload a file.');
      return;
    }
    setErrorMessage('');

    try {
      // Step 1: Extracting text & equations
      setPipelineStage('extracting');
      await new Promise(r => setTimeout(r, 600));

      // Step 2: Structuring chapters, definitions, boundary conditions
      setPipelineStage('structuring');
      await new Promise(r => setTimeout(r, 700));

      // Step 3: Generating concept map, explanations, flashcards, audio
      setPipelineStage('generating');
      await new Promise(r => setTimeout(r, 800));

      // Step 4: Running Meaning Preservation Engine
      setPipelineStage('verifying');
      await new Promise(r => setTimeout(r, 700));

      // Final compilation
      const newDoc = DocumentProcessor.processText(
        docTitle.trim() || 'Untitled Academic Document',
        rawText,
        author.trim() || 'Academic Researcher',
        category
      );

      setPipelineStage('done');
      await new Promise(r => setTimeout(r, 400));
      onDocumentCreated(newDoc);
      onClose();
    } catch (err: any) {
      console.error(err);
      setPipelineStage('error');
      setErrorMessage('Processing failed: ' + (err.message || 'Unknown parsing error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 my-8 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Upload Academic Document</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phase 3 Document Processing with Automated Meaning Verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Stage Visualizer if in progress */}
        {pipelineStage !== 'idle' && (
          <div className="my-6 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-brand-700 dark:text-brand-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                Processing Academic Document Pipeline...
              </span>
              <span className="uppercase tracking-wider font-mono">{pipelineStage}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-[11px]">
              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                ['extracting', 'structuring', 'generating', 'verifying', 'done'].includes(pipelineStage)
                  ? 'bg-white dark:bg-slate-800 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 font-medium'
                  : 'bg-transparent border-transparent text-slate-400'
              }`}>
                <FileCode className="w-3.5 h-3.5" />
                <span>1. Text & Math</span>
              </div>

              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                ['structuring', 'generating', 'verifying', 'done'].includes(pipelineStage)
                  ? 'bg-white dark:bg-slate-800 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 font-medium'
                  : 'bg-transparent border-transparent text-slate-400'
              }`}>
                <FileCheck className="w-3.5 h-3.5" />
                <span>2. Theorems</span>
              </div>

              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                ['generating', 'verifying', 'done'].includes(pipelineStage)
                  ? 'bg-white dark:bg-slate-800 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 font-medium'
                  : 'bg-transparent border-transparent text-slate-400'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>3. Formats</span>
              </div>

              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                ['verifying', 'done'].includes(pipelineStage)
                  ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-medium'
                  : 'bg-transparent border-transparent text-slate-400'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>4. Audit Engine</span>
              </div>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4 my-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Scaled Attention and Transformer Architectures"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Author(s) / Research Lab
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Jane Doe et al. (Stanford AI)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Discipline
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Computer Science">Computer Science & AI</option>
                <option value="Physics & Quantum">Physics & Quantum Mechanics</option>
                <option value="Distributed Systems">Distributed Systems & Networks</option>
                <option value="Mathematics">Mathematics & Statistics</option>
                <option value="Bioinformatics">Bioinformatics & Medicine</option>
                <option value="General">General Academic Course</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quick Sample Academic Papers
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadExampleTemplate('neural')}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  ResNet Paper
                </button>
                <button
                  type="button"
                  onClick={() => loadExampleTemplate('quantum')}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  Quantum Teleport
                </button>
                <button
                  type="button"
                  onClick={() => loadExampleTemplate('consensus')}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  PBFT Protocol
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Upload Document File (PDF, TXT, MD, LaTeX)
            </label>
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/40 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all">
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-brand-500 mb-2" />
              <div className="text-xs text-slate-600 dark:text-slate-300 text-center">
                <span className="font-semibold text-brand-600 dark:text-brand-400">Click to browse file</span> or drag & drop
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {fileName ? `Selected: ${fileName}` : 'Supported: Academic PDFs, Lecture Notes, Markdown, TeX'}
              </p>
              <input
                type="file"
                accept=".txt,.md,.tex,.pdf,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Or Paste Academic Text / Lecture Notes
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {rawText ? `${rawText.split(/\s+/).filter(Boolean).length} words` : 'Empty'}
              </span>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste chapter text, research paper abstract, formulas, equations, or theorems here..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={pipelineStage !== 'idle' && pipelineStage !== 'error'}
            onClick={handleStartProcessing}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            {pipelineStage !== 'idle' && pipelineStage !== 'error' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Document...</span>
              </>
            ) : (
              <>
                <span>Process & Verify Meaning</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
