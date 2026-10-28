import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import AdmZip from 'adm-zip';
import { createWorker } from 'tesseract.js';

export interface ExtractedPageSection {
  pageNumber: number;
  title: string;
  content: string;
  equations?: { latex: string; meaning: string }[];
  conditions?: string[];
  speakerNotes?: string;
  sourceType: 'pdf' | 'pptx' | 'scanned_notes' | 'text';
}

export interface RealExtractionResult {
  title: string;
  pageCount: number;
  wordCount: number;
  sections: ExtractedPageSection[];
  warnings: string[];
  ocrConfidence?: number;
  isScanned: boolean;
}

export class RealExtractor {
  /**
   * Extract text from real binary PDF using pdf-parse with page-level division
   */
  static async extractPdf(filePath: string, originalFileName: string): Promise<RealExtractionResult> {
    const dataBuffer = fs.readFileSync(filePath);
    
    // Custom page render function to capture page numbers accurately
    const pageTexts: { pageNum: number; text: string }[] = [];
    let currentPage = 1;

    const options = {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | null = null;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === null || Math.abs(lastY - item.transform[5]) < 5) {
              text += item.str + ' ';
            } else {
              text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
          }
          const pageNum = currentPage++;
          pageTexts.push({ pageNum, text: text.trim() });
          return text;
        });
      }
    };

    const parsed = await pdfParse(dataBuffer, options);
    const rawPages = pageTexts.length > 0 ? pageTexts : [{ pageNum: 1, text: parsed.text.trim() }];

    const sections: ExtractedPageSection[] = [];
    const warnings: string[] = [];

    rawPages.forEach((p, idx) => {
      const cleanText = p.text.replace(/\s+/g, ' ').trim();
      if (!cleanText) {
        warnings.push(`Page ${p.pageNum} appears to be blank or contains scanned images without selectable text.`);
        return;
      }

      // Detect potential heading from first line
      const lines = p.text.split('\n').map(l => l.trim()).filter(Boolean);
      const firstLine = lines[0] || `Section ${idx + 1}`;
      const title = firstLine.length < 90 ? firstLine : `Page ${p.pageNum}: ${firstLine.slice(0, 70)}...`;

      // Extract equations and conditions from page text
      const equations = this.detectFormulas(p.text);
      const conditions = this.detectConditions(p.text);

      sections.push({
        pageNumber: p.pageNum,
        title,
        content: p.text.trim(),
        equations,
        conditions,
        sourceType: 'pdf'
      });
    });

    if (sections.length === 0) {
      throw new Error(`The uploaded PDF "${originalFileName}" contains no readable text. It may be an un-OCR'd scanned document or encrypted.`);
    }

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

    return {
      title: originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      pageCount: sections.length,
      wordCount: totalWords,
      sections,
      warnings,
      isScanned: warnings.length > 0
    };
  }

  /**
   * Extract actual slides, titles, bullet points, and speaker notes from PowerPoint .pptx
   */
  static extractPptx(filePath: string, originalFileName: string): RealExtractionResult {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();

    const slideEntries = zipEntries
      .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/\d+/)![0], 10);
        const numB = parseInt(b.entryName.match(/\d+/)![0], 10);
        return numA - numB;
      });

    if (slideEntries.length === 0) {
      throw new Error(`The uploaded presentation "${originalFileName}" contains no valid PowerPoint slides or is corrupted.`);
    }

    const sections: ExtractedPageSection[] = [];
    const warnings: string[] = [];

    slideEntries.forEach((slideEntry, index) => {
      const slideNum = index + 1;
      const xmlContent = slideEntry.getData().toString('utf8');

      // Extract textual nodes <a:t>...</a:t>
      const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      const textFragments = textMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

      // Attempt to extract speaker notes for this slide
      let speakerNotes = '';
      const notesEntry = zip.getEntry(`ppt/notesSlides/notesSlide${slideNum}.xml`);
      if (notesEntry) {
        const notesXml = notesEntry.getData().toString('utf8');
        const noteMatches = notesXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
        speakerNotes = noteMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
      }

      if (textFragments.length === 0) {
        warnings.push(`Slide ${slideNum} contains diagrams or images without extractable text.`);
        sections.push({
          pageNumber: slideNum,
          title: `Slide ${slideNum}: Visual Content`,
          content: speakerNotes ? `[Speaker Notes]: ${speakerNotes}` : `[Slide ${slideNum} contains visual diagrams or shapes]`,
          speakerNotes: speakerNotes || undefined,
          sourceType: 'pptx'
        });
        return;
      }

      const slideTitle = textFragments[0].length < 100 ? textFragments[0] : `Slide ${slideNum}`;
      const slideBody = textFragments.join('\n');
      const equations = this.detectFormulas(slideBody);
      const conditions = this.detectConditions(slideBody);

      sections.push({
        pageNumber: slideNum,
        title: slideTitle,
        content: slideBody + (speakerNotes ? `\n\n[Speaker Notes]: ${speakerNotes}` : ''),
        equations,
        conditions,
        speakerNotes: speakerNotes || undefined,
        sourceType: 'pptx'
      });
    });

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

    return {
      title: originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      pageCount: sections.length,
      wordCount: totalWords,
      sections,
      warnings,
      isScanned: false
    };
  }

  /**
   * Extract real text from scanned handwritten notes or image files using Tesseract OCR
   */
  static async extractImageOcr(filePath: string, originalFileName: string): Promise<RealExtractionResult> {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();

    const ocrText = ret.data.text.trim();
    const confidence = ret.data.confidence || 75;
    const warnings: string[] = [];

    if (!ocrText) {
      throw new Error(`OCR processing could not identify legible handwriting or printed text in "${originalFileName}". Please provide a higher contrast scan.`);
    }

    if (confidence < 70) {
      warnings.push(`Optical OCR confidence was low (${confidence}%). Some handwritten symbols or subscripts may require lecturer verification.`);
    }

    // Split text into coherent paragraphs
    const paragraphs = ocrText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const sections: ExtractedPageSection[] = paragraphs.map((para, idx) => {
      const firstLine = para.split('\n')[0] || `Notes Section ${idx + 1}`;
      const title = firstLine.length < 80 ? firstLine : `Scanned Page 1 - Section ${idx + 1}`;
      return {
        pageNumber: 1,
        title,
        content: para,
        equations: this.detectFormulas(para),
        conditions: this.detectConditions(para),
        sourceType: 'scanned_notes'
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
      isScanned: true
    };
  }

  /**
   * Helper: Detect mathematical formulations and symbols
   */
  private static detectFormulas(text: string): { latex: string; meaning: string }[] {
    const formulas: { latex: string; meaning: string }[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (/[=<>≈≠≤≥∑∫√∂±]/.test(line) && line.length < 150) {
        formulas.push({
          latex: line.trim(),
          meaning: `Mathematical formulation extracted from source passage`
        });
      }
    }
    return formulas.slice(0, 4);
  }

  /**
   * Helper: Detect boundary qualifiers and invariant conditions
   */
  private static detectConditions(text: string): string[] {
    const conditions: string[] = [];
    const regex = /(?:condition|must be|invariant|where|subject to|assuming|constrained by|given that)\s+([^.\n]{10,120})/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      conditions.push(match[1].trim());
    }
    return conditions.slice(0, 4);
  }
}
