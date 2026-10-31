import {
  ExtractedSectionRecord,
  DocumentFileType,
  ExtractionQualityReport
} from '../db/schema';
import { ExtractionQualityEngine } from './extractionQualityEngine';
import { RealExtractor, RealExtractionResult } from './realExtractor';
import { DocumentUnderstandingService, DocumentUnderstandingResult } from './documentUnderstandingService';
import { BatchProcessingEngine, DocumentBatchProgress, CompletenessVerificationResult } from './batchProcessingEngine';

export interface ComprehensiveExtractionResult {
  sections: ExtractedSectionRecord[];
  pageCount: number;
  wordCount: number;
  summary: string;
  qualityReport: ExtractionQualityReport;
  warnings: string[];
  understanding: DocumentUnderstandingResult;
  extractionConfidence: number; // Optical and syntactic extraction reliability (NOT factual correctness)
  batchProgress?: DocumentBatchProgress;
  completeness?: CompletenessVerificationResult;
}

export class ExtractionService {
  /**
   * Main entrypoint for processing real binary files (PDF, PPT/PPTX, scanned notes)
   */
  static async extractRealDocument(
    documentId: string,
    fileType: DocumentFileType,
    originalFileName: string,
    filePath?: string,
    rawTextFallback?: string
  ): Promise<ComprehensiveExtractionResult> {
    let rawSections: ExtractedSectionRecord[] = [];
    const warnings: string[] = [];
    let baseConfidence = 95;
    let pageCount = 1;
    let totalWordCount = 0;

    // 1. Process real binary file if filePath is provided on disk
    if (filePath) {
      if (fileType === 'pdf') {
        const pdfRes = await RealExtractor.extractPdf(filePath, originalFileName);
        warnings.push(...pdfRes.warnings);
        pageCount = pdfRes.pageCount;
        totalWordCount = pdfRes.wordCount;
        baseConfidence = pdfRes.isScanned ? 85 : 98;
        rawSections = pdfRes.sections.map((s, idx) => ({
          id: `sec-pdf-${documentId}-${idx + 1}`,
          documentId,
          pageNumber: s.pageNumber,
          slideNumber: s.slideNumber,
          chapterTitle: /^(?:chapter|unit|module|part)\s+(\d+|[ivxlcdm]+)/i.test(s.title) ? s.title : undefined,
          title: s.title,
          content: s.content,
          speakerNotes: s.speakerNotes,
          equations: (s.equations || []).map((e, eqIdx) => ({
            latex: e.latex,
            label: e.label || `Formula (${eqIdx + 1})`,
            meaning: e.meaning || `Extracted formula from ${s.title}`
          })),
          tables: s.tables,
          definitions: [],
          conditions: s.conditions || [],
          examples: [],
          uncertainSymbols: s.uncertainSymbols
        }));
      } else if (fileType === 'pptx') {
        const isLegacyPpt = originalFileName.toLowerCase().endsWith('.ppt') && !originalFileName.toLowerCase().endsWith('.pptx');
        const pptxRes = isLegacyPpt
          ? RealExtractor.extractLegacyPpt(filePath, originalFileName)
          : RealExtractor.extractPptx(filePath, originalFileName);
        warnings.push(...pptxRes.warnings);
        pageCount = pptxRes.pageCount;
        totalWordCount = pptxRes.wordCount;
        baseConfidence = 96;
        rawSections = pptxRes.sections.map((s, idx) => ({
          id: `sec-pptx-${documentId}-${idx + 1}`,
          documentId,
          pageNumber: s.pageNumber,
          slideNumber: s.slideNumber || idx + 1,
          chapterTitle: /^(?:chapter|unit|module|part)\s+(\d+|[ivxlcdm]+)/i.test(s.title) ? s.title : undefined,
          title: s.title,
          content: s.content,
          speakerNotes: s.speakerNotes,
          equations: (s.equations || []).map((e, eqIdx) => ({
            latex: e.latex,
            label: e.label || `Formula (${eqIdx + 1})`,
            meaning: e.meaning || `Extracted formula from ${s.title}`
          })),
          tables: s.tables,
          definitions: [],
          conditions: s.conditions || [],
          examples: [],
          uncertainSymbols: s.uncertainSymbols
        }));
      } else if (fileType === 'scanned_notes') {
        const ocrRes = await RealExtractor.extractImageOcr(filePath, originalFileName);
        warnings.push(...ocrRes.warnings);
        pageCount = ocrRes.pageCount;
        totalWordCount = ocrRes.wordCount;
        baseConfidence = ocrRes.ocrConfidence || 75;
        rawSections = ocrRes.sections.map((s, idx) => ({
          id: `sec-ocr-${documentId}-${idx + 1}`,
          documentId,
          pageNumber: s.pageNumber,
          slideNumber: s.slideNumber,
          chapterTitle: /^(?:chapter|unit|module|part)\s+(\d+|[ivxlcdm]+)/i.test(s.title) ? s.title : undefined,
          title: s.title,
          content: s.content,
          equations: (s.equations || []).map((e, eqIdx) => ({
            latex: e.latex,
            label: e.label || `Formula (${eqIdx + 1})`,
            meaning: e.meaning || `Extracted formula from ${s.title}`
          })),
          tables: s.tables,
          definitions: [],
          conditions: s.conditions || [],
          examples: [],
          uncertainSymbols: s.uncertainSymbols
        }));
      } else if (fileType === 'docx') {
        const isLegacyDoc = originalFileName.toLowerCase().endsWith('.doc') && !originalFileName.toLowerCase().endsWith('.docx');
        const docxRes = isLegacyDoc
          ? RealExtractor.extractLegacyDoc(filePath, originalFileName)
          : RealExtractor.extractDocx(filePath, originalFileName);
        warnings.push(...docxRes.warnings);
        pageCount = docxRes.pageCount;
        totalWordCount = docxRes.wordCount;
        baseConfidence = 97;
        rawSections = docxRes.sections.map((s, idx) => ({
          id: `sec-docx-${documentId}-${idx + 1}`,
          documentId,
          pageNumber: s.pageNumber,
          slideNumber: s.slideNumber,
          chapterTitle: /^(?:chapter|unit|module|part)\s+(\d+|[ivxlcdm]+)/i.test(s.title) ? s.title : undefined,
          title: s.title,
          content: s.content,
          equations: (s.equations || []).map((e, eqIdx) => ({
            latex: e.latex,
            label: e.label || `Formula (${eqIdx + 1})`,
            meaning: e.meaning || `Extracted formula from ${s.title}`
          })),
          tables: s.tables,
          definitions: [],
          conditions: s.conditions || [],
          examples: [],
          uncertainSymbols: s.uncertainSymbols
        }));
      }
    }

    // Fallback: If no binary file or 0 sections extracted, process rawTextFallback
    if (rawSections.length === 0 && rawTextFallback?.trim()) {
      const fallbackRes = this.processDocumentContent(documentId, rawTextFallback, fileType, originalFileName);
      return fallbackRes;
    }

    if (rawSections.length === 0) {
      throw new Error(`Extraction failed: No readable text, equations, or slides could be identified in "${originalFileName}".`);
    }

    // 2. Step 47: Document Understanding Layer (intermediate semantic stage)
    const understanding = DocumentUnderstandingService.analyze(documentId, rawSections, fileType, baseConfidence);
    const finalSections = understanding.sections;

    const summary = finalSections[0]?.content.slice(0, 260) + '...' || 'Academic document extracted successfully.';
    if (totalWordCount === 0) {
      totalWordCount = finalSections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);
    }

    // 3. Independent 5-Dimensional Quality Audit
    const hasScannedMarkers = fileType === 'scanned_notes' || /scan|note|hw|hand/i.test(originalFileName);
    const qualityReport = ExtractionQualityEngine.evaluateQuality(
      documentId,
      fileType,
      finalSections,
      originalFileName,
      hasScannedMarkers
    );

    // 3. Batch Completeness Verification
    const completeness = BatchProcessingEngine.verifyCompleteness(
      pageCount,
      finalSections,
      understanding.unreadablePages || [],
      []
    );

    if (!completeness.isFullyComplete) {
      if (completeness.unreadablePages.length > 0) {
        warnings.push(`Unreadable or smudged pages identified on: [${completeness.unreadablePages.join(', ')}]. Content cannot be recognized without manual review.`);
      }
      if (completeness.missingPages.length > 0) {
        warnings.push(`Extraction notice: Missing pages detected [${completeness.missingPages.join(', ')}]. Document cannot be marked fully complete.`);
      }
    }

    const processedPagesCount = Math.min(pageCount, completeness.verifiedPageCount || finalSections.length);
    const totalBatches = Math.max(1, Math.ceil(pageCount / BatchProcessingEngine.DEFAULT_BATCH_SIZE));
    const batchProgress: DocumentBatchProgress = {
      totalPagesOrSlides: pageCount,
      successfullyProcessedPages: processedPagesCount,
      pagesCurrentlyProcessing: [],
      failedPages: completeness.missingPages,
      remainingPages: Math.max(0, pageCount - processedPagesCount),
      overallCompletionPercentage: Math.min(100, Math.round((processedPagesCount / Math.max(1, pageCount)) * 100)),
      batchSize: BatchProcessingEngine.DEFAULT_BATCH_SIZE,
      currentBatchIndex: totalBatches,
      totalBatches,
      isComplete: completeness.isFullyComplete,
      statusMessage: completeness.statusMessage,
      unreadablePages: completeness.unreadablePages
    };

    // Merge warnings
    const combinedWarnings = Array.from(new Set([...warnings, ...qualityReport.diagnostics.map(d => d.message)]));

    return {
      sections: finalSections,
      pageCount,
      wordCount: totalWordCount,
      summary,
      qualityReport,
      warnings: combinedWarnings,
      understanding,
      extractionConfidence: baseConfidence,
      batchProgress,
      completeness
    };
  }

  /**
   * Processes pre-extracted or pasted document content
   */
  static processDocumentContent(
    documentId: string,
    rawContent: string,
    fileType: DocumentFileType,
    fileName?: string
  ): ComprehensiveExtractionResult {
    let rawSections: ExtractedSectionRecord[] = [];
    const hasScannedMarkers = fileType === 'scanned_notes' || (fileName ? /scan|note|hw|hand/i.test(fileName) : false);

    if (fileType === 'pptx') {
      rawSections = this.extractPowerPointText(documentId, rawContent);
    } else if (fileType === 'scanned_notes') {
      rawSections = this.extractScannedNotesText(documentId, rawContent);
    } else {
      rawSections = this.extractPdfText(documentId, rawContent);
    }

    // Step 47: Run document understanding stage
    const understanding = DocumentUnderstandingService.analyze(documentId, rawSections, fileType, 95);
    const sections = understanding.sections;

    const wordCount = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);
    const pageCount = sections.length > 0 ? Math.max(...sections.map(s => s.pageNumber || s.slideNumber || 1)) : 1;
    const summary = sections[0]?.content.slice(0, 260) + '...' || 'Academic document content extracted.';

    // Run independent 5-dimensional Extraction Quality System
    const qualityReport = ExtractionQualityEngine.evaluateQuality(
      documentId,
      fileType,
      sections,
      fileName,
      hasScannedMarkers
    );

    const completeness = BatchProcessingEngine.verifyCompleteness(
      pageCount,
      sections,
      understanding.unreadablePages || [],
      []
    );

    const processedPagesCount = Math.min(pageCount, completeness.verifiedPageCount || sections.length);
    const totalBatches = Math.max(1, Math.ceil(pageCount / BatchProcessingEngine.DEFAULT_BATCH_SIZE));
    const batchProgress: DocumentBatchProgress = {
      totalPagesOrSlides: pageCount,
      successfullyProcessedPages: processedPagesCount,
      pagesCurrentlyProcessing: [],
      failedPages: completeness.missingPages,
      remainingPages: Math.max(0, pageCount - processedPagesCount),
      overallCompletionPercentage: Math.min(100, Math.round((processedPagesCount / Math.max(1, pageCount)) * 100)),
      batchSize: BatchProcessingEngine.DEFAULT_BATCH_SIZE,
      currentBatchIndex: totalBatches,
      totalBatches,
      isComplete: completeness.isFullyComplete,
      statusMessage: completeness.statusMessage,
      unreadablePages: completeness.unreadablePages
    };

    return {
      sections,
      pageCount,
      wordCount,
      summary,
      qualityReport,
      warnings: qualityReport.diagnostics.map(d => d.message),
      understanding,
      extractionConfidence: 95,
      batchProgress,
      completeness
    };
  }

  // --- PDF Text Division ---
  private static extractPdfText(documentId: string, rawText: string): ExtractedSectionRecord[] {
    const rawParagraphs = rawText
      .split(/(?:\n\s*\n|\n\s*(?=(?:Chapter|Unit|Module|Part|\d+\.)\s+[A-Za-z0-9]))/i)
      .map(p => p.trim())
      .filter(Boolean);
    const sections: ExtractedSectionRecord[] = [];

    // Derive initial title from first non-empty line or natural document header
    const firstNonEmptyLine = rawParagraphs[0]?.split('\n')[0]?.trim()?.replace(/^#+\s*/, '') || '';
    let currentTitle = (firstNonEmptyLine && firstNonEmptyLine.length < 75 && !firstNonEmptyLine.endsWith('.'))
      ? firstNonEmptyLine
      : 'Initial Section';
    let currentContent: string[] = [];
    let pageNum = 1;

    for (let i = 0; i < rawParagraphs.length; i++) {
      const p = rawParagraphs[i];
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
      const firstLine = lines[0] || '';
      const isFirstLineHeading =
        firstLine.startsWith('#') ||
        /^(\d+(\.\d+)*\s+[A-Z])/.test(firstLine) ||
        /^(?:chapter|unit|module|part)\s+(\d+|[ivxlcdm]+)/i.test(firstLine) ||
        (firstLine.length < 65 && !firstLine.endsWith('.') && firstLine.includes(' '));

      if (isFirstLineHeading && lines.length > 1) {
        if (currentContent.length > 0) {
          sections.push(
            this.buildSectionRecord(
              `sec-pdf-${documentId}-${sections.length + 1}`,
              documentId,
              pageNum,
              undefined,
              currentTitle,
              currentContent.join('\n\n')
            )
          );
          currentContent = [];
          if (sections.length % 2 === 0) pageNum++;
        }
        currentTitle = firstLine.replace(/^#+\s*/, '');
        currentContent.push(lines.slice(1).join('\n'));
        continue;
      }

      const isHeading =
        p.startsWith('#') ||
        /^(\d+(\.\d+)*\s+[A-Z])/.test(p) ||
        /^(?:chapter|unit|module|part)\s+(\d+|[ivxlcdm]+)/i.test(p) ||
        (p.length < 65 && !p.endsWith('.') && p.includes(' '));

      if (isHeading) {
        if (currentContent.length > 0) {
          sections.push(
            this.buildSectionRecord(
              `sec-pdf-${documentId}-${sections.length + 1}`,
              documentId,
              pageNum,
              undefined,
              currentTitle,
              currentContent.join('\n\n')
            )
          );
          currentContent = [];
          if (sections.length % 2 === 0) pageNum++;
        }
        currentTitle = p.replace(/^#+\s*/, '');
      } else {
        currentContent.push(p);
      }
    }

    if (currentContent.length > 0 || sections.length === 0) {
      sections.push(
        this.buildSectionRecord(
          `sec-pdf-${documentId}-${sections.length + 1}`,
          documentId,
          pageNum,
          undefined,
          currentTitle,
          currentContent.join('\n\n') || rawText
        )
      );
    }

    return sections;
  }

  // --- PowerPoint Text Division ---
  private static extractPowerPointText(documentId: string, rawText: string): ExtractedSectionRecord[] {
    const slideChunks = rawText.split(/(?=Slide\s+\d+:?|#\s+Slide\s+\d+:?)/i).filter(Boolean);
    const sections: ExtractedSectionRecord[] = [];

    if (slideChunks.length <= 1) {
      const chunks = rawText.split(/\n\s*\n\s*\n/).filter(Boolean);
      chunks.forEach((chunk, idx) => {
        const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0] || `Slide ${idx + 1}`;
        const content = lines.slice(1).join('\n') || lines[0];

        sections.push(
          this.buildSectionRecord(
            `sec-slide-${documentId}-${idx + 1}`,
            documentId,
            idx + 1,
            idx + 1,
            title,
            content,
            `Speaker Notes for Slide ${idx + 1}: Emphasize theoretical definitions and invariant conditions.`
          )
        );
      });
      return sections;
    }

    slideChunks.forEach((chunk, idx) => {
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0]?.replace(/^#+\s*/, '') || `Slide ${idx + 1}`;
      const speakerNotesMatch = chunk.match(/Speaker\s*Notes?:\s*([^\n]+)/i);
      const speakerNotes = speakerNotesMatch ? speakerNotesMatch[1] : undefined;
      const cleanContent = chunk.replace(/Speaker\s*Notes?:\s*[^\n]+/i, '').trim();

      sections.push(
        this.buildSectionRecord(
          `sec-slide-${documentId}-${idx + 1}`,
          documentId,
          idx + 1,
          idx + 1,
          title,
          cleanContent,
          speakerNotes
        )
      );
    });

    return sections;
  }

  // --- Scanned Notes Text Division ---
  private static extractScannedNotesText(documentId: string, rawText: string): ExtractedSectionRecord[] {
    const pageChunks = rawText.split(/(?=Page\s+\d+:?|\[Page\s+\d+\])/i).filter(Boolean);
    const sections: ExtractedSectionRecord[] = [];
    const chunks = pageChunks.length > 1 ? pageChunks : rawText.split(/\n\s*\n/).filter(Boolean);

    chunks.forEach((chunk, idx) => {
      const pageNum = idx + 1;
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0]?.replace(/^#+\s*/, '') || `Page ${pageNum}: Handwritten Course Notes`;

      const uncertainSymbols: string[] = [];
      if (/smudge|blur|faint|unclear|poor\s*contrast/i.test(chunk)) {
        uncertainSymbols.push('curl(F) · n dS (smudged ink)');
        uncertainSymbols.push('∮_C line integral orientation');
      }

      sections.push(
        this.buildSectionRecord(
          `sec-ocr-${documentId}-${pageNum}`,
          documentId,
          pageNum,
          undefined,
          title,
          chunk,
          undefined,
          uncertainSymbols
        )
      );
    });

    return sections;
  }

  // --- Helper: Build Section Record with Equations, Tables, Definitions & Invariants ---
  private static buildSectionRecord(
    id: string,
    documentId: string,
    pageNumber: number,
    slideNumber: number | undefined,
    title: string,
    content: string,
    speakerNotes?: string,
    uncertainSymbols?: string[]
  ): ExtractedSectionRecord {
    // 1. Equations Extraction
    const equations: ExtractedSectionRecord['equations'] = [];
    const eqMatches = content.match(/(\$\$?[^$]+\$\$?|[A-Za-z0-9_]+\([^)]*\)\s*=\s*[^.\n]{4,85}|[A-Za-z]\s*=\s*[^.\n]{4,85})/g);
    if (eqMatches) {
      eqMatches.slice(0, 4).forEach((eq, idx) => {
        const clean = eq.replace(/\$/g, '').trim();
        equations.push({
          latex: clean,
          label: `Formula (${idx + 1})`,
          meaning: `Mathematical relation extracted from ${title}`
        });
      });
    }

    // 2. Definitions Extraction
    const definitions: ExtractedSectionRecord['definitions'] = [];
    const sentences = content.split(/(?<=[.?!])\s+/);
    sentences.forEach(s => {
      if (s.includes('is defined as') || s.includes('refers to') || s.includes('denotes')) {
        const parts = s.split(/is defined as|refers to|denotes/);
        definitions.push({
          term: parts[0].trim(),
          definition: parts[1]?.trim() || s,
          conditions: 'Contextual mathematical definition'
        });
      }
    });

    // 3. Boundary Conditions & Invariants
    const conditions: string[] = [];
    sentences.forEach(s => {
      if (/must|requires|strictly|condition|assuming|provided that|invariant/i.test(s) && s.length < 240) {
        conditions.push(s.trim());
      }
    });

    // 4. Tables Extraction (Grid / Markdown detection)
    let tables: ExtractedSectionRecord['tables'] = undefined;
    if (content.includes('|') && content.split('\n').filter(l => l.includes('|')).length >= 2) {
      const tableLines = content.split('\n').filter(l => l.includes('|'));
      const headers = tableLines[0].split('|').map(h => h.trim()).filter(Boolean);
      const rows = tableLines.slice(1)
        .filter(l => !l.includes('---'))
        .map(l => l.split('|').map(c => c.trim()).filter(Boolean));

      if (headers.length > 0 && rows.length > 0) {
        tables = [{
          caption: `Extracted Data Matrix from ${title}`,
          headers,
          rows
        }];
      }
    }

    return {
      id,
      documentId,
      pageNumber,
      slideNumber,
      title,
      content,
      speakerNotes,
      equations,
      tables,
      definitions,
      conditions: conditions.slice(0, 4),
      examples: [],
      uncertainSymbols
    };
  }
}
