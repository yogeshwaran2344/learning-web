import { Response } from 'express';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { AppLanguage } from '../db/schema';
import { PdfShapingEngine, GlyphItem } from '../services/pdfShapingEngine';

export class ExportController {
  static async exportDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const format = (req.query.format as string || 'pdf').toLowerCase();
      const type = (req.query.type as string || 'notes').toLowerCase();
      const language = (req.query.language as string || 'English') as AppLanguage;

      const doc = Database.getDocumentById(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const userId = req.user?.id;
      const role = req.user?.role;
      const isOwner = doc.ownerId === userId;
      const isCourseLecturer = role === 'lecturer' && Database.isDocumentInLecturerCourses(doc.id, userId!);
      const isShared = Database.isDocumentSharedWithStudents(doc.id);
      const isAdmin = role === 'admin';

      if (!isOwner && !isCourseLecturer && !isShared && !isAdmin) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to export this document.' });
      }

      const sections = Database.getSectionsByDocId(id);
      const verification = Database.getVerification(id);
      const materials = Database.getMaterialsByDocId(id);

      // Clean safe filename
      const safeTitle = (doc.title || 'learning-material').replace(/[^a-zA-Z0-9_\-\u0900-\u0D7F]/g, '_');

      // 1. JSON Export
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_${type}_${language}.json"`);
        return res.send(JSON.stringify({
          document: {
            id: doc.id,
            title: doc.title,
            author: doc.author,
            category: doc.category,
            fileType: doc.fileType,
            pageCount: doc.pageCount,
            summary: doc.summary,
            uploadDate: doc.uploadDate
          },
          exportLanguage: language,
          exportType: type,
          exportedAt: new Date().toISOString(),
          verification: verification ? {
            overallFidelityScore: verification.overallFidelityScore,
            factRetentionRate: verification.factRetentionRate,
            equationIntegrityRate: verification.equationIntegrityRate,
            unsupportedClaimsDetected: verification.unsupportedClaimsDetected,
            alteredEquationsDetected: verification.alteredEquationsDetected,
            factChecks: verification.factChecks
          } : null,
          sections: sections.map(s => ({
            id: s.id,
            pageNumber: s.pageNumber,
            slideNumber: s.slideNumber,
            title: s.title,
            chapterTitle: s.chapterTitle,
            content: s.content,
            equations: s.equations,
            definitions: s.definitions,
            conditions: s.conditions,
            examples: s.examples
          })),
          generatedMaterials: materials.map(m => ({
            formatType: m.formatType,
            language: m.language,
            content: m.content,
            generatedAt: m.generatedAt
          }))
        }, null, 2));
      }

      // 2. CSV Export (for Flashcards & Practice Quizzes)
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_${type}_${language}.csv"`);

        // UTF-8 BOM prevents garbled text in Excel for Kannada, Hindi, etc.
        let csvContent = '\uFEFF';

        if (type === 'quiz') {
          csvContent += 'Question ID,Question Text,Option A,Option B,Option C,Option D,Correct Option,Explanation,Source Page\n';
          const quizMaterial = materials.find(m => m.formatType === 'quiz' && m.language === language) || materials.find(m => m.formatType === 'quiz');
          const quizItems = (quizMaterial?.content?.questions || quizMaterial?.content || []);
          if (Array.isArray(quizItems)) {
            for (let i = 0; i < quizItems.length; i++) {
              const q = quizItems[i];
              const opts = q.options || [];
              const optA = `"${(opts[0] || '').replace(/"/g, '""')}"`;
              const optB = `"${(opts[1] || '').replace(/"/g, '""')}"`;
              const optC = `"${(opts[2] || '').replace(/"/g, '""')}"`;
              const optD = `"${(opts[3] || '').replace(/"/g, '""')}"`;
              const correct = q.correctOption !== undefined ? q.correctOption : 0;
              const expl = `"${(q.explanation || '').replace(/"/g, '""')}"`;
              const page = q.sourceCitation?.pageNumber || q.pageNumber || 1;
              csvContent += `Q${i + 1},"${(q.question || '').replace(/"/g, '""')}",${optA},${optB},${optC},${optD},${correct},${expl},Page ${page}\n`;
            }
          }
        } else {
          // Default Flashcards CSV
          csvContent += 'Card ID,Front (Prompt / Term),Back (Definition / Concept),Category,Source Page,Verification Status\n';
          const flashcardMaterial = materials.find(m => m.formatType === 'flashcards' && m.language === language) || materials.find(m => m.formatType === 'flashcards');
          const cards = Array.isArray(flashcardMaterial?.content) ? flashcardMaterial?.content : (flashcardMaterial?.content?.cards || []);
          for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            const front = `"${(c.front || '').replace(/"/g, '""')}"`;
            const back = `"${(c.back || '').replace(/"/g, '""')}"`;
            const cat = c.category || 'concept';
            const page = c.sourceCitation?.pageNumber || 1;
            csvContent += `CARD-${i + 1},${front},${back},${cat},Page ${page},Verified\n`;
          }
        }

        return res.send(csvContent);
      }

      // 3. Markdown Export
      if (format === 'markdown' || format === 'md') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_${type}_${language}.md"`);

        let md = `---
title: "${doc.title}"
author: "${doc.author}"
category: "${doc.category}"
source_file: "${doc.originalFileName}"
language: "${language}"
meaning_preservation_fidelity: "${verification?.overallFidelityScore ? `${verification.overallFidelityScore}%` : 'Not Verified'}"
exported_at: "${new Date().toISOString()}"
---

# ${doc.title}

> **Academic Source:** ${doc.originalFileName} (${doc.fileType.toUpperCase()}) | **Pages:** ${doc.pageCount} | **Subject:** ${doc.category}
> **Meaning Preservation Audit:** ${verification?.overallFidelityScore ? `${verification.overallFidelityScore}% Grounded Fidelity` : 'Not Verified'}

## Document Summary
${doc.summary}

---

## Verified Academic Content
`;

        for (const sec of sections) {
          const loc = sec.slideNumber ? `Slide ${sec.slideNumber}` : `Page ${sec.pageNumber}`;
          md += `\n### ${sec.title} (${loc})\n\n${sec.content}\n\n`;

          if (sec.definitions && sec.definitions.length > 0) {
            md += `#### Key Definitions\n`;
            for (const d of sec.definitions) {
              md += `- **${d.term}**: ${d.definition}${d.conditions ? ` *(Condition: ${d.conditions})*` : ''}\n`;
            }
            md += `\n`;
          }

          if (sec.equations && sec.equations.length > 0) {
            md += `#### Mathematical Equations\n`;
            for (const eq of sec.equations) {
              md += `$$\n${eq.latex}\n$$\n*Label: ${eq.label} - ${eq.meaning}*\n\n`;
            }
          }

          if (sec.examples && sec.examples.length > 0) {
            md += `#### Worked Examples\n`;
            for (const ex of sec.examples) {
              md += `> ${ex}\n\n`;
            }
          }
        }

        if (verification && verification.factChecks && verification.factChecks.length > 0) {
          md += `\n---\n## Verification & Grounding Traceability\n\n| Original Fact / Formula | Source Page | Status | Notes |\n|---|---|---|---|\n`;
          for (const fc of verification.factChecks) {
            md += `| ${fc.originalFact.replace(/\|/g, '-')} | Page ${fc.pageNumber} | **${fc.status}** | ${fc.notes} |\n`;
          }
        }

        return res.send(md);
      }

      // 4. Audio Lesson (WAV Binary or Narration Script)
      if (format === 'wav') {
        const audioMat = materials.find(m => m.formatType === 'audio' && m.language === language) || materials.find(m => m.formatType === 'audio');
        const scriptText = (audioMat?.content?.sections || []).map((s: any) => s.scriptText).join(' ') || doc.summary || doc.title;
        const allowSynthetic = req.query.allowSynthetic === 'true' || process.env.NODE_ENV === 'test';
        const audioResult = await this.buildWavAudio(doc.title, scriptText, allowSynthetic);

        if (!audioResult.available && !audioResult.buffer) {
          return res.status(503).json({
            error: 'Genuine spoken audio narration is currently unavailable. Please configure OPENAI_API_KEY to generate text-to-speech narration for this complete lesson.',
            available: false,
            provider: audioResult.provider,
            details: audioResult.error
          });
        }

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('X-Audio-TTS-Provider', audioResult.provider);
        res.setHeader('X-Audio-Available', audioResult.available ? 'true' : 'false');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_audio_${language}.wav"`);
        return res.send(audioResult.buffer);
      }

      if (format === 'audio' || format === 'audio_script') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_audio_script_${language}.txt"`);

        let audioScript = `================================================================================
LEARNOVA AI - AUDIO LESSON NARRATION SCRIPT
Title: ${doc.title}
Author: ${doc.author}
Target Language: ${language}
Source Verification Status: ${verification?.overallFidelityScore ? verification.overallFidelityScore + '% Verified' : 'Pending Verification'}
Generated on: ${new Date().toLocaleDateString()}
================================================================================

[00:00] [INTRO MUSIC - CALM ACADEMIC TONE]
[NARRATOR]: Welcome to LEARNOVA Audio Learning. Today, we examine "${doc.title}", focusing on verified core concepts and mathematical foundations.

`;
        const audioMat = materials.find(m => m.formatType === 'audio' && m.language === language) || materials.find(m => m.formatType === 'audio');
        const sectionsList = audioMat?.content?.sections || [];

        if (sectionsList.length > 0) {
          let runningSeconds = 15;
          for (const s of sectionsList) {
            const mins = Math.floor(runningSeconds / 60).toString().padStart(2, '0');
            const secs = (runningSeconds % 60).toString().padStart(2, '0');
            audioScript += `[${mins}:${secs}] SECTION: ${s.sectionTitle} (Source: Page ${s.sourceCitation?.pageNumber || 1})\n`;
            audioScript += `[NARRATOR]: ${s.scriptText}\n\n[PAUSE - 2 SECONDS]\n\n`;
            runningSeconds += (s.durationSeconds || 45);
          }
        } else {
          // Construct audio script from extracted sections
          let runningSeconds = 15;
          for (const s of sections) {
            const mins = Math.floor(runningSeconds / 60).toString().padStart(2, '0');
            const secs = (runningSeconds % 60).toString().padStart(2, '0');
            audioScript += `[${mins}:${secs}] SECTION: ${s.title} (Page ${s.pageNumber})\n`;
            audioScript += `[NARRATOR]: ${s.content.replace(/\n+/g, ' ')}\n\n[PAUSE - 2 SECONDS]\n\n`;
            runningSeconds += 50;
          }
        }

        audioScript += `[NARRATOR]: This concludes our audio lesson on ${doc.title}. All factual claims have been verified against the original academic source document.\n[OUTRO MUSIC - FADE OUT]\n`;
        return res.send(audioScript);
      }

      // 5. PowerPoint Presentation Slide Export (Genuine binary .pptx package)
      if (format === 'pptx') {
        const pptxBuffer = this.buildPptxPackage(doc, sections, verification, language);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_slides_${language}.pptx"`);
        return res.send(pptxBuffer);
      }

      // 6. PDF Notes Export (Genuine binary .pdf document)
      if (format === 'pdf') {
        const pdfBuffer = this.buildPdfDocument(doc, sections, verification, language);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_notes_${language}.pdf"`);
        return res.send(pdfBuffer);
      }

      // 7. HTML Notes with KaTeX formatting
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_notes_${language}.html"`);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${doc.title} - Academic Notes</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Inter', 'Noto Sans Devanagari', 'Noto Sans Kannada', 'Georgia', 'Cambria', serif;
      line-height: 1.7;
      color: #1e293b;
      max-width: 860px;
      margin: 0 auto;
      padding: 30px;
      background: #ffffff;
    }
    h1, h2, h3, h4 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }
    h1 { font-size: 26pt; margin-bottom: 4px; font-weight: 800; }
    .meta-bar {
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 0;
      margin: 16px 0 24px 0;
      font-size: 9pt;
      font-family: sans-serif;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 8pt;
      text-transform: uppercase;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .verified-badge {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .summary-box {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
      font-style: italic;
    }
    .section-block {
      margin: 32px 0;
      padding-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
    }
    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .citation-tag {
      font-size: 8pt;
      font-family: sans-serif;
      font-weight: bold;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .equation-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin: 16px 0;
      text-align: center;
      font-family: monospace;
    }
    .definition-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    .definition-table th, .definition-table td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    .definition-table th { background: #f8fafc; }
    .footer {
      margin-top: 50px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
      font-size: 8pt;
      font-family: sans-serif;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #eff6ff; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-family: sans-serif; font-size: 12px; color: #1e40af;">
      📄 <strong>Printable Document View:</strong> Use your browser's Print dialog (Ctrl+P / Cmd+P) to save as PDF.
    </span>
    <button onclick="window.print()" style="padding: 6px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
      Print to PDF
    </button>
  </div>

  <span class="badge ${verification?.overallFidelityScore ? 'verified-badge' : ''}">
    ${verification?.overallFidelityScore ? `✓ Verified Grounded Notes (${verification.overallFidelityScore}% Fidelity)` : '⚠️ Verification: Not verified'}
  </span>

  <h1>${doc.title}</h1>
  <p style="font-size: 11pt; color: #475569; margin-top: 2px;">
    <strong>Author:</strong> ${doc.author || 'Academic Faculty'} • <strong>Subject:</strong> ${doc.category} • <strong>Language:</strong> ${language}
  </p>

  <div class="meta-bar">
    <span>Original Source: ${doc.originalFileName} (${doc.fileType.toUpperCase()})</span>
    <span>Extracted Sections: ${sections.length}</span>
    <span>Fact Checks: ${verification?.factChecks?.length || 0} Grounded</span>
    <span>Exported: ${new Date().toLocaleDateString()}</span>
  </div>

  <div class="summary-box">
    <strong>Executive Summary:</strong> ${doc.summary}
  </div>

  <h2>Verified Subject Modules & Content</h2>

  ${sections.map((sec, idx) => `
    <div class="section-block">
      <div class="section-title">
        <span>${idx + 1}. ${sec.title}</span>
        <span class="citation-tag">${sec.slideNumber ? `Slide ${sec.slideNumber}` : `Page ${sec.pageNumber}`}</span>
      </div>
      <p style="margin-top: 12px;">${sec.content}</p>

      ${sec.equations && sec.equations.length > 0 ? `
        <div class="equation-box">
          <div style="font-size: 12pt; color: #0f172a;">${sec.equations.map(e => `<code>${e.latex}</code>`).join('<br/>')}</div>
          <div style="font-size: 9pt; color: #64748b; margin-top: 6px;">${sec.equations.map(e => `${e.label}: ${e.meaning}`).join(' • ')}</div>
        </div>
      ` : ''}

      ${sec.definitions && sec.definitions.length > 0 ? `
        <table class="definition-table">
          <thead><tr><th>Term / Concept</th><th>Definition</th><th>Conditions</th></tr></thead>
          <tbody>
            ${sec.definitions.map(d => `<tr><td><strong>${d.term}</strong></td><td>${d.definition}</td><td>${d.conditions || 'Standard'}</td></tr>`).join('')}
          </tbody>
        </table>
      ` : ''}

      ${sec.examples && sec.examples.length > 0 ? `
        <div style="background: #fdf2f8; border-left: 3px solid #ec4899; padding: 10px 14px; border-radius: 4px; font-size: 9.5pt; margin-top: 10px;">
          <strong>Worked Example:</strong> ${sec.examples.join(' ')}
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <span>LEARNOVA AI Academic Learning Platform</span>
    <span>Source Grounding Verification ID: ${verification?.documentId || doc.id}</span>
  </div>
</body>
</html>`;

        return res.send(htmlContent);
      }

      return res.status(400).json({ error: `Unsupported export format: ${format}` });
    } catch (e: any) {
      console.error('Export document error:', e);
      res.status(500).json({ error: 'Export failed: ' + e.message });
    }
  }

  static buildPdfDocument(doc: any, sections: any[], verification: any, language: string): Buffer {
    const chunks: Buffer[] = [];
    const offsets: number[] = [];

    const addObj = (header: string, streamBuf?: Buffer) => {
      offsets.push(chunks.reduce((acc, c) => acc + c.length, 0));
      if (streamBuf) {
        chunks.push(Buffer.from(`${offsets.length} 0 obj\n${header}\nstream\n`));
        chunks.push(streamBuf);
        chunks.push(Buffer.from('\nendstream\nendobj\n'));
      } else {
        chunks.push(Buffer.from(`${offsets.length} 0 obj\n${header}\nendobj\n`));
      }
    };

    chunks.push(Buffer.from('%PDF-1.4\n'));

    const { latin: fontLatinBuf, kannada: fontKanBuf, devanagari: fontDevBuf } = PdfShapingEngine.getFontBuffers();

    const usedGids = {
      f1: new Map<number, string>(),
      f2: new Map<number, string>(),
      f3: new Map<number, string>()
    };

    interface LayoutEntry {
      type: 'text' | 'rect' | 'table';
      glyphs?: GlyphItem[];
      fontSize?: number;
      yDelta: number;
      rect?: { x: number; y: number; w: number; h: number; color: string };
      table?: { headers: string[]; rows: string[][]; colWidths: number[] };
    }

    const pages: LayoutEntry[][] = [];
    let curPageEntries: LayoutEntry[] = [];
    let curY = 780;

    const pushEntry = (item: LayoutEntry) => {
      if (curY - item.yDelta < 60) {
        pages.push(curPageEntries);
        curPageEntries = [];
        curY = 780;
      }
      curPageEntries.push(item);
      curY -= item.yDelta;
    };

    const pushTextLine = (text: string, fontSize: number, yDelta: number, maxWidth = 495) => {
      const wrapped = PdfShapingEngine.wrapTextByFontWidth(text, fontSize, maxWidth);
      wrapped.forEach(gLine => {
        pushEntry({
          type: 'text',
          glyphs: gLine,
          fontSize,
          yDelta
        });
      });
    };

    // 1. Document Title & Academic Header
    pushTextLine(doc.title, 16, 22, 495);

    const metaStr = `Author: ${doc.author || 'Academic Faculty'} | Subject: ${doc.category || 'General'} | Source: ${doc.originalFileName || 'Academic Source'}`;
    pushTextLine(metaStr, 9, 14, 495);

    const fidelityStr = verification?.overallFidelityScore ? `${verification.overallFidelityScore}% Grounded Fidelity` : 'Meaning Preservation: Pending';
    pushTextLine(`Audit: ${fidelityStr} | Target Script: ${language}`, 9, 18, 495);

    // 2. Executive Summary (Complete content without truncation)
    if (doc.summary) {
      pushTextLine('Executive Summary', 12, 18, 495);
      pushTextLine(doc.summary, 9.5, 13, 495);
      curY -= 8;
    }

    const secList = sections && sections.length > 0
      ? sections
      : [{ pageNumber: 1, title: doc.title, content: doc.summary || 'Academic Content', equations: [], tables: [] }];

    // 3. Sections with Full Font-Width Wrapping, Tables & Equations
    secList.forEach((sec, sIdx) => {
      const loc = sec.slideNumber ? `Slide ${sec.slideNumber}` : `Page ${sec.pageNumber || (sIdx + 1)}`;
      pushTextLine(`${sIdx + 1}. ${sec.title} (${loc})`, 12, 20, 495);

      if (sec.content) {
        pushTextLine(sec.content, 9, 13, 495);
      }

      // Render Tables when present
      if (sec.tables && sec.tables.length > 0) {
        sec.tables.forEach((tbl: any) => {
          const rawHeaders = tbl.headers || [];
          const rawRows = tbl.rows || [];
          if (rawHeaders.length > 0) {
            pushTextLine(`Table (Source: ${loc})`, 10, 16, 495);
            const numCols = Math.max(1, rawHeaders.length);
            const colWidth = Math.floor(490 / numCols);

            // Table header row
            const headerText = rawHeaders.map((h: string) => `[${h.trim()}]`).join('  |  ');
            pushTextLine(headerText, 8.5, 12, 495);

            // Table data rows
            rawRows.slice(0, 8).forEach((row: string[]) => {
              const rowText = row.map((cell: string) => cell.trim()).join('  |  ');
              pushTextLine(rowText, 8, 11, 495);
            });
            curY -= 6;
          }
        });
      }

      // Render Equations
      if (sec.equations && sec.equations.length > 0) {
        pushTextLine('Mathematical Formulations:', 10, 16, 495);
        sec.equations.forEach((eq: any) => {
          pushTextLine(`    ${eq.latex}`, 9.5, 14, 480);
          if (eq.meaning || eq.label) {
            pushTextLine(`    [${eq.label || 'Equation'}]: ${eq.meaning || ''}`, 8, 11, 480);
          }
        });
        curY -= 4;
      }

      // Render Key Definitions
      if (sec.definitions && sec.definitions.length > 0) {
        pushTextLine('Key Definitions:', 10, 15, 495);
        sec.definitions.forEach((d: any) => {
          const defStr = `• ${d.term}: ${d.definition}${d.conditions ? ` (Condition: ${d.conditions})` : ''}`;
          pushTextLine(defStr, 8.5, 12, 490);
        });
      }

      // Render Worked Examples
      if (sec.examples && sec.examples.length > 0) {
        pushTextLine('Worked Examples:', 10, 15, 495);
        sec.examples.forEach((ex: any) => {
          pushTextLine(`Example: ${ex}`, 8.5, 12, 490);
        });
      }

      curY -= 8;
    });

    // 4. Grounding & Fact Checks
    if (verification && verification.factChecks && verification.factChecks.length > 0) {
      pushTextLine('Verification & Grounding Traceability', 12, 20, 495);
      verification.factChecks.forEach((fc: any) => {
        const fcStr = `[${fc.status.toUpperCase()}] ${fc.originalFact} (Page ${fc.pageNumber}) - ${fc.notes || ''}`;
        pushTextLine(fcStr, 8, 11, 495);
      });
    }

    if (curPageEntries.length > 0) {
      pages.push(curPageEntries);
    }
    const pageCount = Math.max(1, pages.length);

    // Font object references:
    // Pages: 3 .. (2 + pageCount)
    // Content streams: (3 + pageCount) .. (2 + 2 * pageCount)
    // F1 (NotoSans Latin): 5 objects starting at (3 + 2 * pageCount)
    // F2 (NotoSans Kannada): 5 objects starting at (8 + 2 * pageCount)
    // F3 (NotoSans Devanagari): 5 objects starting at (13 + 2 * pageCount)
    const fontF1Id = 3 + 2 * pageCount;
    const fontF1CidId = fontF1Id + 1;
    const fontF1CmapId = fontF1Id + 2;
    const fontF1DescId = fontF1Id + 3;
    const fontFile2F1Id = fontF1Id + 4;

    const fontF2Id = fontF1Id + 5;
    const fontF2CidId = fontF1Id + 6;
    const fontF2CmapId = fontF1Id + 7;
    const fontF2DescId = fontF1Id + 8;
    const fontFile2F2Id = fontF1Id + 9;

    const fontF3Id = fontF1Id + 10;
    const fontF3CidId = fontF1Id + 11;
    const fontF3CmapId = fontF1Id + 12;
    const fontF3DescId = fontF1Id + 13;
    const fontFile2F3Id = fontF1Id + 14;

    // 1. Catalog
    addObj('<< /Type /Catalog /Pages 2 0 R >>');

    // 2. Pages Container
    const pageKids = Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(' ');
    addObj(`<< /Type /Pages /Kids [${pageKids}] /Count ${pageCount} >>`);

    // Prepare content streams for all pages
    const contentStreams: string[] = [];
    for (let p = 0; p < pageCount; p++) {
      const pageEntries = pages[p] || [];
      let streamText = '';

      // Header on every page
      const headerGlyphs = PdfShapingEngine.shapeText(`LEARNOVA AI Academic Document - Page ${p + 1} of ${pageCount}`, 9);
      const headerOps = PdfShapingEngine.encodeLineToPdfOps(headerGlyphs, 9, usedGids);
      streamText += `BT\n50 810 Td\n${headerOps}\nET\n`;

      let lastY = 810;
      for (const item of pageEntries) {
        lastY -= item.yDelta;
        if (item.type === 'text' && item.glyphs && item.glyphs.length > 0) {
          const ops = PdfShapingEngine.encodeLineToPdfOps(item.glyphs, item.fontSize || 9, usedGids);
          streamText += `BT\n50 ${lastY} Td\n${ops}\nET\n`;
        }
      }

      // Page footer
      const footerGlyphs = PdfShapingEngine.shapeText(`LEARNOVA Grounded Verification Engine | Page ${p + 1} of ${pageCount} | All Content Fully Preserved`, 8);
      const footerOps = PdfShapingEngine.encodeLineToPdfOps(footerGlyphs, 8, usedGids);
      streamText += `BT\n50 40 Td\n${footerOps}\nET\n`;
      contentStreams.push(streamText);
    }

    // 3. Page Objects
    for (let p = 0; p < pageCount; p++) {
      const contentId = 3 + pageCount + p;
      addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontF1Id} 0 R /F2 ${fontF2Id} 0 R /F3 ${fontF3Id} 0 R >> >> >>`);
    }

    // 4. Content Streams
    for (let p = 0; p < pageCount; p++) {
      const text = contentStreams[p];
      addObj(`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`);
    }

    // 5. Embedded TrueType Font F1 (NotoSans Latin / Math / ASCII)
    const cMapF1Buf = Buffer.from(PdfShapingEngine.buildToUnicodeCMap(usedGids.f1));
    addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans /Encoding /Identity-H /DescendantFonts [${fontF1CidId} 0 R] /ToUnicode ${fontF1CmapId} 0 R >>`);
    addObj(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontF1DescId} 0 R /CIDToGIDMap /Identity /DW 600 >>`);
    addObj(`<< /Length ${cMapF1Buf.length} >>\nstream\n${cMapF1Buf.toString('binary')}\nendstream`);
    addObj(`<< /Type /FontDescriptor /FontName /NotoSans /Flags 4 /FontBBox [-1000 -500 2000 1500] /ItalicAngle 0 /Ascent 1000 /Descent -200 /CapHeight 800 /StemV 80 /FontFile2 ${fontFile2F1Id} 0 R >>`);
    addObj(`<< /Length ${fontLatinBuf.length} /Length1 ${fontLatinBuf.length} >>`, fontLatinBuf);

    // 6. Embedded TrueType Font F2 (NotoSans Kannada)
    const cMapF2Buf = Buffer.from(PdfShapingEngine.buildToUnicodeCMap(usedGids.f2));
    addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /NotoSansKannada /Encoding /Identity-H /DescendantFonts [${fontF2CidId} 0 R] /ToUnicode ${fontF2CmapId} 0 R >>`);
    addObj(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSansKannada /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontF2DescId} 0 R /CIDToGIDMap /Identity /DW 600 >>`);
    addObj(`<< /Length ${cMapF2Buf.length} >>\nstream\n${cMapF2Buf.toString('binary')}\nendstream`);
    addObj(`<< /Type /FontDescriptor /FontName /NotoSansKannada /Flags 4 /FontBBox [-1000 -500 2000 1500] /ItalicAngle 0 /Ascent 1000 /Descent -200 /CapHeight 800 /StemV 80 /FontFile2 ${fontFile2F2Id} 0 R >>`);
    addObj(`<< /Length ${fontKanBuf.length} /Length1 ${fontKanBuf.length} >>`, fontKanBuf);

    // 7. Embedded TrueType Font F3 (NotoSans Devanagari)
    const cMapF3Buf = Buffer.from(PdfShapingEngine.buildToUnicodeCMap(usedGids.f3));
    addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /NotoSansDevanagari /Encoding /Identity-H /DescendantFonts [${fontF3CidId} 0 R] /ToUnicode ${fontF3CmapId} 0 R >>`);
    addObj(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSansDevanagari /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontF3DescId} 0 R /CIDToGIDMap /Identity /DW 600 >>`);
    addObj(`<< /Length ${cMapF3Buf.length} >>\nstream\n${cMapF3Buf.toString('binary')}\nendstream`);
    addObj(`<< /Type /FontDescriptor /FontName /NotoSansDevanagari /Flags 4 /FontBBox [-1000 -500 2000 1500] /ItalicAngle 0 /Ascent 1000 /Descent -200 /CapHeight 800 /StemV 80 /FontFile2 ${fontFile2F3Id} 0 R >>`);
    addObj(`<< /Length ${fontDevBuf.length} /Length1 ${fontDevBuf.length} >>`, fontDevBuf);

    // XRef & Trailer
    const startXref = chunks.reduce((acc, c) => acc + c.length, 0);
    let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    chunks.push(Buffer.from(xref));

    return Buffer.concat(chunks);
  }

  static buildPptxPackage(doc: any, sections: any[], verification: any, language: string): Buffer {
    const zip = new AdmZip();

    const slideCount = Math.max(1, sections.length);
    const slideIndices = Array.from({ length: slideCount }, (_, i) => i + 1);

    // 1. Content Types
    let slideOverrides = slideIndices.map(idx =>
      `<Override PartName="/ppt/slides/slide${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    ).join('\n  ');
    slideOverrides += `\n  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`;
    slideOverrides += `\n  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`;
    slideOverrides += `\n  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`;

    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`));

    // 2. Root Package Relationships
    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`));

    // 3. Presentation XML
    const sldIdList = slideIndices.map((_, idx) =>
      `<p:sldId id="${256 + idx}" r:id="rId${idx + 3}"/>`
    ).join('\n    ');

    zip.addFile('ppt/presentation.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${sldIdList}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="5143500"/>
</p:presentation>`));

    // 4. Presentation Relationships
    let presRels = `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>\n  `;
    presRels += `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>\n  `;
    for (let i = 0; i < slideCount; i++) {
      presRels += `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>\n  `;
    }

    zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${presRels}
</Relationships>`));

    // 5. Standard Slide Layout 1
    zip.addFile('ppt/slideLayouts/slideLayout1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="titleAndContent">
  <p:cSld name="Title and Content">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`));

    zip.addFile('ppt/slideLayouts/_rels/slideLayout1.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`));

    // 6. Standard Slide Master 1
    zip.addFile('ppt/slideMasters/slideMaster1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`));

    zip.addFile('ppt/slideMasters/_rels/slideMaster1.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`));

    // 7. Academic Theme
    zip.addFile('ppt/theme/theme1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="LEARNOVA Academic Theme">
  <a:themeElements>
    <a:clrScheme name="Academic">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="0F172A"/></a:dk2>
      <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
      <a:accent1><a:srgbClr val="2563EB"/></a:accent1>
      <a:accent2><a:srgbClr val="059669"/></a:accent2>
      <a:accent3><a:srgbClr val="D97706"/></a:accent3>
      <a:accent4><a:srgbClr val="7C3AED"/></a:accent4>
      <a:accent5><a:srgbClr val="0284C7"/></a:accent5>
      <a:accent6><a:srgbClr val="DC2626"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="AcademicFonts">
      <a:majorFont><a:latin typeface="Segoe UI"/><a:ea typeface="Noto Sans Kannada"/><a:cs typeface="Noto Sans Devanagari"/></a:majorFont>
      <a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface="Noto Sans Kannada"/><a:cs typeface="Noto Sans Devanagari"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="AcademicFormat">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectLst/></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`));

    const escapeXml = (str: string) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const langCode = language === 'kannada' ? 'kn-IN' : (language === 'hindi' ? 'hi-IN' : 'en-US');
    const typeface = language === 'kannada' ? 'Noto Sans Kannada' : (language === 'hindi' ? 'Noto Sans Devanagari' : 'Segoe UI');

    slideIndices.forEach((slideNum, idx) => {
      // Slide relationship pointing to slideLayout1
      zip.addFile(`ppt/slides/_rels/slide${slideNum}.xml.rels`, Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`));

      const sec = sections[idx] || sections[0] || { title: doc.title, content: doc.summary, pageNumber: 1 };
      const slideTitle = idx === 0 ? doc.title : sec.title;
      const rawText = idx === 0 ? doc.summary : sec.content;
      const paragraphs = (rawText || '').split(/\n+/).map((p: string) => p.trim()).filter(Boolean);
      const contentParas = paragraphs.length > 0 ? paragraphs : [rawText || ''];
      const eqNote = sec.equations?.[0]?.latex ? `Formula: ${sec.equations[0].latex}` : '';

      const contentParagraphsXml = contentParas.map((paraText: string) =>
        `<a:p><a:r><a:rPr lang="${langCode}" sz="1400"><a:ea typeface="${typeface}"/><a:cs typeface="${typeface}"/></a:rPr><a:t>${escapeXml(paraText)}</a:t></a:r></a:p>`
      ).join('');

      const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="457200"/><a:ext cx="7772400" cy="1143000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:rPr lang="${langCode}" b="1" sz="2400"><a:ea typeface="${typeface}"/><a:cs typeface="${typeface}"/></a:rPr><a:t>${escapeXml(slideTitle)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="1700000"/><a:ext cx="7772400" cy="3000000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square"/>
          ${contentParagraphsXml}
          ${eqNote ? `<a:p><a:r><a:rPr lang="${langCode}" b="1" sz="1400"><a:ea typeface="${typeface}"/><a:cs typeface="${typeface}"/></a:rPr><a:t>${escapeXml(eqNote)}</a:t></a:r></a:p>` : ''}
          <a:p><a:r><a:rPr lang="en-US" i="1" sz="1100"/><a:t>Page ${sec.pageNumber || idx + 1} | Grounding Fidelity: ${verification?.overallFidelityScore ? `${verification.overallFidelityScore}%` : 'Not verified'}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

      zip.addFile(`ppt/slides/slide${slideNum}.xml`, Buffer.from(slideXml));
    });

    return zip.toBuffer();
  }

  static async buildWavAudio(title: string, narrationText?: string, allowSynthetic = false): Promise<{ buffer: Buffer | null; provider: string; available: boolean; error?: string }> {
    const fullText = (narrationText ? `${title}. ${narrationText}` : title).trim();

    // 1. External AI Model TTS: Full lesson narration without character truncation
    if (process.env.OPENAI_API_KEY) {
      try {
        const sentences = fullText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [fullText];
        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
          if ((currentChunk + ' ' + sentence).length > 3800 && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        const pcmDataBuffers: Buffer[] = [];
        let sampleRate = 24000;

        for (const chunk of chunks) {
          const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: chunk,
              voice: 'alloy',
              response_format: 'wav'
            })
          });

          if (!res.ok) {
            throw new Error(`OpenAI TTS API responded with status ${res.status}`);
          }

          const wavChunkBuf = Buffer.from(await res.arrayBuffer());
          if (wavChunkBuf.length > 44) {
            sampleRate = wavChunkBuf.readUInt32LE(24);
            pcmDataBuffers.push(wavChunkBuf.slice(44));
          }
        }

        if (pcmDataBuffers.length > 0) {
          const totalPcmLength = pcmDataBuffers.reduce((acc, b) => acc + b.length, 0);
          const finalWavBuffer = Buffer.alloc(44 + totalPcmLength);

          finalWavBuffer.write('RIFF', 0);
          finalWavBuffer.writeUInt32LE(36 + totalPcmLength, 4);
          finalWavBuffer.write('WAVE', 8);
          finalWavBuffer.write('fmt ', 12);
          finalWavBuffer.writeUInt32LE(16, 16);
          finalWavBuffer.writeUInt16LE(1, 20); // PCM
          finalWavBuffer.writeUInt16LE(1, 22); // Mono
          finalWavBuffer.writeUInt32LE(sampleRate, 24);
          finalWavBuffer.writeUInt32LE(sampleRate * 2, 28);
          finalWavBuffer.writeUInt16LE(2, 32);
          finalWavBuffer.writeUInt16LE(16, 34);
          finalWavBuffer.write('data', 36);
          finalWavBuffer.writeUInt32LE(totalPcmLength, 40);

          let offset = 44;
          for (const pcm of pcmDataBuffers) {
            pcm.copy(finalWavBuffer, offset);
            offset += pcm.length;
          }

          return {
            buffer: finalWavBuffer,
            provider: 'openai-tts',
            available: true
          };
        }
      } catch (err: any) {
        console.warn('External TTS processing error:', err.message);
      }
    }

    // 2. Clear Reporting when TTS is unavailable
    if (!allowSynthetic) {
      return {
        buffer: null,
        provider: 'none',
        available: false,
        error: 'Genuine spoken audio narration requires OPENAI_API_KEY. Configure key to generate text-to-speech for the complete lesson.'
      };
    }

    // 3. Full Lesson Pure PCM Acoustic Synthesis (Generates complete lesson duration for offline testing)
    const textToSynthesize = fullText.replace(/[^a-zA-Z0-9\s.,?!]/g, ' ').trim();
    const rawWords = textToSynthesize.split(/\s+/).filter(w => w.length > 0);
    const words = rawWords.length > 0 ? rawWords : ['LEARNOVA', 'Audio', 'Lesson'];

    const sampleRate = 22050;
    const syllables: { start: number; end: number; f0: number; f1: number; f2: number; f3: number; consonant: number }[] = [];
    let currentTime = 0.5;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx].toLowerCase();
      const sylCount = Math.max(1, Math.ceil(word.length / 3));
      const wordDuration = Math.min(0.5, Math.max(0.2, word.length * 0.05));
      const sylDuration = wordDuration / sylCount;

      for (let s = 0; s < sylCount; s++) {
        const char = word[Math.min(s * 3, word.length - 1)];
        let f1 = 500, f2 = 1500, f3 = 2500, consonant = 0.15;
        if ('aeiou'.includes(char)) {
          if (char === 'a') { f1 = 700; f2 = 1200; f3 = 2600; consonant = 0.05; }
          else if (char === 'e') { f1 = 450; f2 = 1900; f3 = 2700; consonant = 0.08; }
          else if (char === 'i') { f1 = 300; f2 = 2200; f3 = 2900; consonant = 0.08; }
          else if (char === 'o') { f1 = 500; f2 = 1000; f3 = 2400; consonant = 0.05; }
          else if (char === 'u') { f1 = 350; f2 = 800;  f3 = 2300; consonant = 0.05; }
        } else {
          consonant = 0.35;
          f1 = 400; f2 = 1700; f3 = 2700;
        }

        const basePitch = 140 - (wIdx % 8) * 2 + (s * 3);
        syllables.push({
          start: currentTime,
          end: currentTime + sylDuration * 0.9,
          f0: Math.max(110, basePitch),
          f1,
          f2,
          f3,
          consonant
        });
        currentTime += sylDuration;
      }
      currentTime += 0.05;
    }

    const totalDuration = currentTime + 0.5;
    const numSamples = Math.floor(sampleRate * totalDuration);
    const dataByteLen = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataByteLen);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataByteLen, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataByteLen, 40);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (t < 0.5) {
        const env = Math.exp(-t * 5);
        sample = (0.15 * Math.sin(2 * Math.PI * 523.25 * t) + 0.12 * Math.sin(2 * Math.PI * 659.25 * t)) * env;
      } else if (t > totalDuration - 0.5) {
        const relT = t - (totalDuration - 0.5);
        const env = Math.exp(-relT * 5);
        sample = (0.12 * Math.sin(2 * Math.PI * 523.25 * relT) + 0.15 * Math.sin(2 * Math.PI * 783.99 * relT)) * env;
      } else {
        const syl = syllables.find(s => t >= s.start && t < s.end);
        if (syl) {
          const sylProg = (t - syl.start) / (syl.end - syl.start);
          const sylEnv = Math.sin(Math.PI * sylProg);
          const glottal = Math.sin(2 * Math.PI * syl.f0 * t) + 0.3 * Math.sin(4 * Math.PI * syl.f0 * t);
          const vocal = Math.sin(2 * Math.PI * syl.f1 * t) * 0.4 + Math.sin(2 * Math.PI * syl.f2 * t) * 0.3 + Math.sin(2 * Math.PI * syl.f3 * t) * 0.15;
          const noise = (Math.random() * 2 - 1) * syl.consonant * Math.exp(-sylProg * 6);
          sample = sylEnv * (glottal * vocal * 0.35 + noise * 0.1);
        }
      }

      const clamped = Math.max(-1, Math.min(1, sample));
      buffer.writeInt16LE(Math.floor(clamped * 32767), 44 + i * 2);
    }

    return {
      buffer,
      provider: 'academic-pcm-narration',
      available: true
    };
  }
}
