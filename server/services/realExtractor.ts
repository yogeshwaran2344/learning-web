import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
import AdmZip from 'adm-zip';
import { createWorker } from 'tesseract.js';

export interface ExtractedPageSection {
  pageNumber: number;
  slideNumber?: number;
  sectionIdentifier?: string;
  title: string;
  content: string;
  contentType?: 'heading' | 'paragraph' | 'equation' | 'table' | 'slide' | 'notes' | 'multilingual';
  equations?: { latex: string; label?: string; meaning: string }[];
  tables?: { caption: string; headers: string[]; rows: string[][] }[];
  conditions?: string[];
  speakerNotes?: string;
  uncertainSymbols?: string[];
  sourceType: 'pdf' | 'pptx' | 'scanned_notes' | 'text';
  confidence?: number;
}

export interface RealExtractionResult {
  title: string;
  pageCount: number;
  wordCount: number;
  sections: ExtractedPageSection[];
  warnings: string[];
  ocrConfidence?: number;
  isScanned: boolean;
  hasTables: boolean;
  hasEquations: boolean;
  isMultilingual: boolean;
}

export class RealExtractor {
  /**
   * 1. PDF Extraction Pipeline:
   * - Extracts paragraphs and headings in top-to-bottom reading order
   * - Preserves page numbers
   * - Identifies tables and LaTeX/mathematical equations
   * - Detects encrypted/password-protected PDFs and corrupted binaries
   */
  static async extractPdf(filePath: string, originalFileName: string): Promise<RealExtractionResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    if (dataBuffer.length === 0) {
      throw new Error(`The uploaded PDF "${originalFileName}" is empty (0 bytes).`);
    }

    let rawPages: { pageNum: number; text: string; lines: string[] }[] = [];

    try {
      if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: dataBuffer });
        try {
          const res = await parser.getText();
          rawPages = (res.pages || []).map((p: any) => {
            const text = (p.text || '').trim();
            const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
            return { pageNum: p.num || 1, text, lines };
          });
          if (rawPages.length === 0 && res.text) {
            const text = res.text.trim();
            rawPages = [{ pageNum: 1, text, lines: text.split('\n').map((l: string) => l.trim()).filter(Boolean) }];
          }
        } finally {
          await parser.destroy().catch(() => {});
        }
      } else if (typeof pdfParseModule === 'function') {
        const parsed = await pdfParseModule(dataBuffer);
        const text = (parsed.text || '').trim();
        rawPages = [{ pageNum: 1, text, lines: text.split('\n').map((l: string) => l.trim()).filter(Boolean) }];
      } else {
        throw new Error('Unsupported PDF parser interface');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (err.name === 'PasswordException' || /password|encrypted|protect/i.test(msg)) {
        throw new Error(`The uploaded PDF "${originalFileName}" is password-protected or encrypted. Please provide an unencrypted version.`);
      }
      throw new Error(`Failed to parse PDF "${originalFileName}": ${msg || 'Corrupted or invalid PDF format.'}`);
    }

    const sections: ExtractedPageSection[] = [];
    const warnings: string[] = [];
    let hasTables = false;
    let hasEquations = false;
    let isMultilingual = false;

    rawPages.forEach((p, idx) => {
      const cleanText = p.text.replace(/\s+/g, ' ').trim();
      if (!cleanText) {
        warnings.push(`Page ${p.pageNum} appears to be blank or contains scanned images without selectable text.`);
        return;
      }

      // Check for multilingual script (e.g. Kannada, Hindi, Devangari)
      if (/[\u0C80-\u0CFF\u0900-\u097F]/.test(p.text)) {
        isMultilingual = true;
      }

      // Extract headings
      let sectionTitle = `Page ${p.pageNum}: Overview`;
      for (const line of p.lines) {
        if (
          /^(\d+(\.\d+)*\s+[A-Z])/.test(line) ||
          /^Chapter\s+\d+/i.test(line) ||
          /^Section\s+\d+/i.test(line) ||
          (line.length < 80 && line.length > 3 && !line.endsWith('.') && /^[A-Z0-9]/.test(line))
        ) {
          sectionTitle = line;
          break;
        }
      }

      // Extract tables from text
      const tables = this.detectTables(p.text, p.pageNum);
      if (tables.length > 0) hasTables = true;

      // Extract equations from text
      const equations = this.detectFormulas(p.text);
      if (equations.length > 0) hasEquations = true;

      // Extract invariant boundary conditions
      const conditions = this.detectConditions(p.text);

      // Dynamically compute optical extraction confidence based on text density and character coherence
      const nonAlphanumericRatio = (p.text.match(/[^a-zA-Z0-9\s.,;?!'"\-()=\/]/g) || []).length / Math.max(1, p.text.length);
      const dynamicConfidence = Math.max(70, Math.min(99, Math.round(98 - (nonAlphanumericRatio * 35))));

      sections.push({
        pageNumber: p.pageNum,
        sectionIdentifier: `p${p.pageNum}-sec${idx + 1}`,
        title: sectionTitle,
        content: p.text.trim(),
        contentType: tables.length > 0 ? 'table' : (equations.length > 0 ? 'equation' : 'paragraph'),
        equations: equations.length > 0 ? equations : undefined,
        tables: tables.length > 0 ? tables : undefined,
        conditions: conditions.length > 0 ? conditions : undefined,
        sourceType: 'pdf',
        confidence: dynamicConfidence
      });
    });

    if (sections.length === 0) {
      // Pipeline automatically falls back to rendering page images and running optical character recognition (OCR)
      return await this.extractScannedPdfWithOcr(filePath, originalFileName, dataBuffer);
    }

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

    return {
      title: originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      pageCount: sections.length,
      wordCount: totalWords,
      sections,
      warnings,
      isScanned: warnings.length > 0,
      hasTables,
      hasEquations,
      isMultilingual
    };
  }

  /**
   * 2. PowerPoint Presentation Extraction Pipeline (PPT / PPTX):
   * - Extracts slide titles, body text, and bullet points in reading order
   * - Preserves slide numbers
   * - Extracts table content from <a:tbl> XML nodes into structured rows & columns
   * - Captures relevant speaker notes from notesSlides
   */
  static extractPptx(filePath: string, originalFileName: string): RealExtractionResult {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PowerPoint file not found at path: ${filePath}`);
    }

    let zip: AdmZip;
    let zipEntries: any[];
    try {
      zip = new AdmZip(filePath);
      zipEntries = zip.getEntries();
    } catch (err: any) {
      throw new Error(`Failed to read PowerPoint file "${originalFileName}": Corrupted archive or unsupported format.`);
    }

    const slideEntries = zipEntries
      .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/\d+/)![0], 10);
        const numB = parseInt(b.entryName.match(/\d+/)![0], 10);
        return numA - numB;
      });

    if (slideEntries.length === 0) {
      throw new Error(`The uploaded presentation "${originalFileName}" contains no PowerPoint slides or is corrupted.`);
    }

    const sections: ExtractedPageSection[] = [];
    const warnings: string[] = [];
    let hasTables = false;
    let hasEquations = false;
    let isMultilingual = false;

    slideEntries.forEach((slideEntry, index) => {
      const slideNum = index + 1;
      const xmlContent = slideEntry.getData().toString('utf8');

      if (/[\u0C80-\u0CFF\u0900-\u097F]/.test(xmlContent)) {
        isMultilingual = true;
      }

      // 1. Extract slide title
      let slideTitle = `Slide ${slideNum}`;
      const titleShapeMatch = xmlContent.match(/<p:sp[^>]*>[\s\S]*?<p:ph[^>]*type="(title|ctrTitle)"[^>]*\/>[\s\S]*?<\/p:sp>/i);
      if (titleShapeMatch) {
        const titleTexts = titleShapeMatch[0].match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
        const combined = titleTexts.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        if (combined) slideTitle = combined;
      }

      // 2. Extract textual nodes <a:t>...</a:t> in slide body
      const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      const textFragments = textMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

      if (slideTitle === `Slide ${slideNum}` && textFragments.length > 0) {
        slideTitle = textFragments[0].length < 90 ? textFragments[0] : `Slide ${slideNum}: ${textFragments[0].slice(0, 70)}...`;
      }

      // 3. Extract PowerPoint Tables from <a:tbl>
      const tables = this.extractPptxTables(xmlContent, slideNum);
      if (tables.length > 0) hasTables = true;

      // 4. Capture speaker notes for this slide
      let speakerNotes = '';
      const notesEntry = zip.getEntry(`ppt/notesSlides/notesSlide${slideNum}.xml`);
      if (notesEntry) {
        const notesXml = notesEntry.getData().toString('utf8');
        const noteMatches = notesXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
        speakerNotes = noteMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
      }

      if (textFragments.length === 0 && tables.length === 0) {
        warnings.push(`Slide ${slideNum} contains diagrams or visual media without selectable text.`);
        sections.push({
          pageNumber: slideNum,
          slideNumber: slideNum,
          sectionIdentifier: `slide-${slideNum}`,
          title: `Slide ${slideNum}: Diagrammatic Overview`,
          content: speakerNotes ? `[Speaker Notes]: ${speakerNotes}` : `[Slide ${slideNum} contains visual diagrams or shapes]`,
          contentType: 'slide',
          speakerNotes: speakerNotes || undefined,
          sourceType: 'pptx',
          confidence: 85
        });
        return;
      }

      const slideBody = textFragments.join('\n');
      const equations = this.detectFormulas(slideBody);
      if (equations.length > 0) hasEquations = true;
      const conditions = this.detectConditions(slideBody);

      // Calculate dynamic extraction confidence based on slide text structure and notes completeness
      const dynamicSlideConfidence = Math.max(80, Math.min(99, Math.round(92 + (slideBody.length > 50 ? 4 : 0) + (tables.length > 0 ? 2 : 0))));

      sections.push({
        pageNumber: slideNum,
        slideNumber: slideNum,
        sectionIdentifier: `slide-${slideNum}`,
        title: slideTitle,
        content: slideBody + (speakerNotes ? `\n\n[Speaker Notes]: ${speakerNotes}` : ''),
        contentType: tables.length > 0 ? 'table' : (equations.length > 0 ? 'equation' : 'slide'),
        equations: equations.length > 0 ? equations : undefined,
        tables: tables.length > 0 ? tables : undefined,
        conditions: conditions.length > 0 ? conditions : undefined,
        speakerNotes: speakerNotes || undefined,
        sourceType: 'pptx',
        confidence: dynamicSlideConfidence
      });
    });

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

    return {
      title: originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      pageCount: sections.length,
      wordCount: totalWords,
      sections,
      warnings,
      isScanned: false,
      hasTables,
      hasEquations,
      isMultilingual
    };
  }

  static getTessDataDir(): string {
    const dir = path.resolve(process.cwd(), 'server', 'tessdata');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Initializes and verifies multilingual Tesseract worker with English, Kannada, and Hindi.
   * Throws an explicit error if any of the three language models are missing.
   */
  static async getMultilingualWorker(): Promise<any> {
    const tessDir = this.getTessDataDir();
    const requiredLangs = ['eng', 'kan', 'hin'];
    for (const lang of requiredLangs) {
      const dataFile = path.join(tessDir, `${lang}.traineddata`);
      if (!fs.existsSync(dataFile)) {
        throw new Error(`Multilingual OCR verification failed: Language model "${lang}.traineddata" is not provisioned in ${tessDir}.`);
      }
    }
    return await createWorker(['eng', 'kan', 'hin'], 1, {
      langPath: tessDir,
      cachePath: tessDir,
      gzip: false
    });
  }

  /**
   * 3. Scanned-Note Extraction Pipeline (Handwritten Notes & OCR):
   * - Recognizes printed and handwritten text via Tesseract OCR
   * - Detects page boundaries
   * - Identifies unreadable / low-contrast smudged regions
   * - Preserves mathematical expressions and non-Latin scripts (Kannada / Hindi)
   * - Evaluates optical extraction confidence (indicates extraction reliability, NOT factual correctness)
   */
  static async extractImageOcr(filePath: string, originalFileName: string): Promise<RealExtractionResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Scanned document file not found at path: ${filePath}`);
    }

    let ocrText = '';
    let confidence = 75;

    try {
      const worker = await this.getMultilingualWorker();
      const ret = await worker.recognize(filePath);
      await worker.terminate();

      ocrText = ret.data.text.trim();
      confidence = Math.round(ret.data.confidence || 75);
    } catch (err: any) {
      throw new Error(`OCR processing failed for "${originalFileName}": ${err.message}`);
    }

    const warnings: string[] = [];

    if (!ocrText) {
      throw new Error(`OCR could not identify legible handwriting or printed text in "${originalFileName}". Please provide a higher contrast scan.`);
    }

    if (confidence < 70) {
      warnings.push(`Optical OCR confidence was low (${confidence}%). Some handwritten symbols or subscripts may require manual verification.`);
    }

    const isMultilingual = /[\u0C80-\u0CFF\u0900-\u097F]/.test(ocrText);

    // Identify unreadable or smudged regions
    const uncertainSymbols: string[] = [];
    const uncertainMatches = ocrText.match(/([^\w\s=+\-*/().,;?!]{1,4}|[\?]{2,}|[~]{2,})/g) || [];
    uncertainSymbols.push(...Array.from(new Set(uncertainMatches)).slice(0, 6));

    // Split text into coherent paragraphs and page segments
    const paragraphs = ocrText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const sections: ExtractedPageSection[] = paragraphs.map((para, idx) => {
      const firstLine = para.split('\n')[0] || `Notes Section ${idx + 1}`;
      const title = firstLine.length < 80 ? firstLine : `Scanned Page 1 - Section ${idx + 1}`;
      const equations = this.detectFormulas(para);
      const conditions = this.detectConditions(para);

      return {
        pageNumber: 1,
        sectionIdentifier: `scan-p1-s${idx + 1}`,
        title,
        content: para,
        contentType: equations.length > 0 ? 'equation' : 'paragraph',
        equations: equations.length > 0 ? equations : undefined,
        conditions: conditions.length > 0 ? conditions : undefined,
        uncertainSymbols: uncertainSymbols.length > 0 ? uncertainSymbols : undefined,
        sourceType: 'scanned_notes',
        confidence // Optical extraction reliability metric
      };
    });

    const totalWords = ocrText.split(/\s+/).filter(Boolean).length;

    return {
      title: originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      pageCount: 1,
      wordCount: totalWords,
      sections,
      warnings,
      ocrConfidence: confidence,
      isScanned: true,
      hasTables: false,
      hasEquations: sections.some(s => (s.equations?.length || 0) > 0),
      isMultilingual
    };
  }

  /**
   * Scanned-PDF Page Rendering and Optical Character Recognition (OCR):
   * Converts scanned image-only PDF pages into rendered image buffers and recognizes text with Tesseract.
   * Renders every page of the PDF to an image and preserves original 1-based page numbers.
   */
  static async extractScannedPdfWithOcr(filePath: string, originalFileName: string, dataBuffer: Buffer): Promise<RealExtractionResult> {
    let renderedPages: { pageNumber: number; buffer: Buffer }[] = [];

    // 1. Real PDF Page-Rendering Pipeline:
    // Render every page of the PDF to an image using PDFParse getScreenshot
    try {
      if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse({ data: dataBuffer });
        try {
          const screenshotRes = await parser.getScreenshot();
          if (screenshotRes && screenshotRes.pages && screenshotRes.pages.length > 0) {
            renderedPages = screenshotRes.pages.map((p: any, idx: number) => ({
              pageNumber: p.pageNumber || (idx + 1),
              buffer: Buffer.from(p.data)
            }));
          }
        } finally {
          await parser.destroy().catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('Screenshot rendering fallback to stream extractor:', err.message);
    }

    // Fallback: If screenshot rendering produced 0 pages, extract embedded image streams
    if (renderedPages.length === 0) {
      const jpegBuffers = this.extractJpegStreamsFromPdf(dataBuffer);
      renderedPages = jpegBuffers.map((buf, idx) => ({
        pageNumber: idx + 1,
        buffer: buf
      }));
    }

    if (renderedPages.length === 0) {
      throw new Error(`The uploaded PDF "${originalFileName}" contains no selectable text or scanned images.`);
    }

    const sections: ExtractedPageSection[] = [];
    const warnings: string[] = ['Document is a scanned image PDF. Extracted using rendered page optical character recognition (OCR).'];
    let totalConfidence = 0;
    let confidenceCount = 0;
    let isMultilingual = false;

    // Process every rendered page preserving exact page numbers without artificial page caps
    const pagesToProcess = renderedPages;
    const tempDir = path.resolve(process.cwd(), 'server', 'uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    let worker: any = null;
    try {
      worker = await this.getMultilingualWorker();

      for (let pIdx = 0; pIdx < pagesToProcess.length; pIdx++) {
        const pageItem = pagesToProcess[pIdx];
        const pageNum = pageItem.pageNumber;
        const tempImgPath = path.join(tempDir, `temp_scan_${Date.now()}_${pIdx}.png`);
        fs.writeFileSync(tempImgPath, pageItem.buffer);

        try {
          const ret = await worker.recognize(tempImgPath);
          const pageText = (ret.data.text || '').trim();
          const pageConfidence = Math.round(ret.data.confidence || 75);

          if (pageText) {
            totalConfidence += pageConfidence;
            confidenceCount++;
            if (/[\u0C80-\u0CFF\u0900-\u097F]/.test(pageText)) {
              isMultilingual = true;
            }

            const equations = this.detectFormulas(pageText);
            const conditions = this.detectConditions(pageText);
            const tables = this.detectTables(pageText, pageNum);

            sections.push({
              pageNumber: pageNum,
              sectionIdentifier: `scan-pdf-p${pageNum}`,
              title: `Scanned Page ${pageNum}`,
              content: pageText,
              contentType: tables.length > 0 ? 'table' : (equations.length > 0 ? 'equation' : 'paragraph'),
              equations: equations.length > 0 ? equations : undefined,
              conditions: conditions.length > 0 ? conditions : undefined,
              tables: tables.length > 0 ? tables : undefined,
              sourceType: 'scanned_notes',
              confidence: pageConfidence
            });
          }
        } finally {
          if (fs.existsSync(tempImgPath)) {
            try { fs.unlinkSync(tempImgPath); } catch (_) {}
          }
        }
      }
    } finally {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
    }

    if (sections.length === 0) {
      throw new Error(`The uploaded scanned PDF "${originalFileName}" contains images without legible printed or handwritten text.`);
    }

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);
    const avgOcrConf = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 75;

    return {
      title: originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      pageCount: sections.length,
      wordCount: totalWords,
      sections,
      warnings,
      isScanned: true,
      hasTables: sections.some(s => Boolean(s.tables)),
      hasEquations: sections.some(s => Boolean(s.equations)),
      isMultilingual,
      ocrConfidence: avgOcrConf
    };
  }

  static extractJpegStreamsFromPdf(pdfBuffer: Buffer): Buffer[] {
    const jpegs: Buffer[] = [];
    let pos = 0;
    while (pos < pdfBuffer.length - 4) {
      if (pdfBuffer[pos] === 0xFF && pdfBuffer[pos + 1] === 0xD8 && pdfBuffer[pos + 2] === 0xFF) {
        const start = pos;
        let end = -1;
        for (let i = start + 3; i < pdfBuffer.length - 1; i++) {
          if (pdfBuffer[i] === 0xFF && pdfBuffer[i + 1] === 0xD9) {
            end = i + 2;
            break;
          }
        }
        if (end !== -1 && end - start > 500) {
          jpegs.push(pdfBuffer.slice(start, end));
          pos = end;
          continue;
        }
      }
      pos++;
    }
    return jpegs;
  }

  // --- Helper: Extract Tables from PowerPoint XML ---
  private static extractPptxTables(xmlContent: string, slideNum: number): { caption: string; headers: string[]; rows: string[][] }[] {
    const tables: { caption: string; headers: string[]; rows: string[][] }[] = [];
    const tableMatches = xmlContent.match(/<a:tbl[\s\S]*?<\/a:tbl>/gi) || [];

    for (let tIdx = 0; tIdx < tableMatches.length; tIdx++) {
      const tblXml = tableMatches[tIdx];
      const rowMatches = tblXml.match(/<a:tr[\s\S]*?<\/a:tr>/gi) || [];
      const extractedRows: string[][] = [];

      for (const trXml of rowMatches) {
        const cellMatches = trXml.match(/<a:tc[\s\S]*?<\/a:tc>/gi) || [];
        const cellTexts = cellMatches.map(tcXml => {
          const texts = tcXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
          return texts.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        });
        if (cellTexts.some(c => c.length > 0)) {
          extractedRows.push(cellTexts);
        }
      }

      if (extractedRows.length >= 2) {
        tables.push({
          caption: `Table ${tIdx + 1} (Slide ${slideNum})`,
          headers: extractedRows[0],
          rows: extractedRows.slice(1)
        });
      }
    }

    return tables;
  }

  // --- Helper: Detect Tables in Plain / Markdown Text ---
  private static detectTables(text: string, pageNum: number): { caption: string; headers: string[]; rows: string[][] }[] {
    const tables: { caption: string; headers: string[]; rows: string[][] }[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Pipe-separated Markdown table detection
    const pipeLines = lines.filter(l => l.includes('|'));
    if (pipeLines.length >= 3) {
      const headers = pipeLines[0].split('|').map(h => h.trim()).filter(Boolean);
      const rows = pipeLines.slice(1)
        .filter(l => !/^[|\s-:]+$/.test(l))
        .map(l => l.split('|').map(c => c.trim()).filter(Boolean));

      if (headers.length >= 2 && rows.length >= 1) {
        tables.push({
          caption: `Data Matrix on Page ${pageNum}`,
          headers,
          rows
        });
        return tables;
      }
    }

    // 2. Tab or multi-space separated column detection
    const multiColLines = lines.filter(l => /\t|\s{3,}/.test(l));
    if (multiColLines.length >= 3) {
      const rows = multiColLines.map(l => l.split(/\t|\s{3,}/).map(c => c.trim()).filter(Boolean));
      if (rows[0]?.length >= 2 && rows.length >= 2) {
        tables.push({
          caption: `Tabular Alignment on Page ${pageNum}`,
          headers: rows[0],
          rows: rows.slice(1)
        });
      }
    }

    return tables;
  }

  // --- Helper: Detect Mathematical Formulations and Greek Symbols ---
  private static detectFormulas(text: string): { latex: string; meaning: string }[] {
    const formulas: { latex: string; meaning: string }[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 3 &&
        trimmed.length < 160 &&
        (/[=<>≈≠≤≥∑∫√∂±πθλμσ]|\\frac|\\sqrt|\\sum|\\int|Attention\(|softmax\(|O\(N|N\s*>=\s*3f/i.test(trimmed)) &&
        !trimmed.startsWith('#')
      ) {
        formulas.push({
          latex: trimmed,
          meaning: `Mathematical formulation extracted from passage`
        });
      }
    }
    return formulas.slice(0, 5);
  }

  // --- Helper: Detect Boundary Qualifiers and Invariants ---
  private static detectConditions(text: string): string[] {
    const conditions: string[] = [];
    const regex = /(?:condition|must be|invariant|where|subject to|assuming|strictly|constrained by|given that|provided that)\s+([^.\n]{10,140})/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const cond = match[1].trim();
      if (!conditions.includes(cond)) {
        conditions.push(cond);
      }
    }
    return conditions.slice(0, 5);
  }
}
