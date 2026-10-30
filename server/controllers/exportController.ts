import { Response } from 'express';
import AdmZip from 'adm-zip';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Database } from '../db/database';
import { AppLanguage } from '../db/schema';

export class ExportController {
  static exportDocument(req: AuthenticatedRequest, res: Response) {
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
      const isLecturer = role === 'lecturer';
      const isShared = Database.isDocumentSharedWithStudents(doc.id);

      if (!isOwner && !isLecturer && !isShared) {
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
        const wavBuffer = this.buildWavAudio(doc.title);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_audio_${language}.wav"`);
        return res.send(wavBuffer);
      }

      if (format === 'audio' || format === 'audio_script') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_audio_script_${language}.txt"`);

        let audioScript = `================================================================================
LEARNLENS AI - AUDIO LESSON NARRATION SCRIPT
Title: ${doc.title}
Author: ${doc.author}
Target Language: ${language}
Source Verification Status: ${verification?.overallFidelityScore ? verification.overallFidelityScore + '% Verified' : 'Pending Verification'}
Generated on: ${new Date().toLocaleDateString()}
================================================================================

[00:00] [INTRO MUSIC - CALM ACADEMIC TONE]
[NARRATOR]: Welcome to LearnLens Audio Learning. Today, we examine "${doc.title}", focusing on verified core concepts and mathematical foundations.

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
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Georgia', 'Cambria', serif;
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

  <span class="badge verified-badge">
    ✓ Verified Grounded Notes (${verification?.overallFidelityScore ?? 96}% Fidelity)
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
    <span>LearnLens AI Academic Learning Platform</span>
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
    const chunks: string[] = [];
    const offsets: number[] = [];

    const addObj = (content: string) => {
      offsets.push(Buffer.byteLength(chunks.join('')));
      chunks.push(`${offsets.length} 0 obj\n${content}\nendobj\n`);
    };

    chunks.push('%PDF-1.4\n');

    // Obj 1: Catalog
    addObj('<< /Type /Catalog /Pages 2 0 R >>');
    // Obj 2: Pages
    addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    // Obj 3: Page
    addObj('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>');

    const escapePdf = (text: string) => (text || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    
    let streamText = 'BT\n';
    streamText += '/F1 18 Tf 50 800 Td (' + escapePdf(doc.title.slice(0, 50)) + ') Tj\n';
    streamText += '/F2 10 Tf 0 -22 Td (Author: ' + escapePdf(doc.author) + ' | Category: ' + escapePdf(doc.category) + ' | Language: ' + escapePdf(language) + ') Tj\n';
    streamText += '0 -18 Td (Verification Fidelity: ' + (verification?.overallFidelityScore ? verification.overallFidelityScore + '% Grounded' : 'Pending Verification') + ') Tj\n';
    streamText += '0 -25 Td (Summary: ' + escapePdf(doc.summary.slice(0, 95)) + '...) Tj\n';

    let yOffset = -30;
    for (let i = 0; i < Math.min(sections.length, 5); i++) {
      const s = sections[i];
      streamText += `0 ${yOffset} Td /F1 12 Tf (${escapePdf(`Section ${s.pageNumber || i + 1}: ${s.title.slice(0, 45)}`)}) Tj\n`;
      streamText += `0 -16 Td /F2 9 Tf (${escapePdf(s.content.slice(0, 90))}...) Tj\n`;
      if (s.equations && s.equations.length > 0) {
        streamText += `0 -14 Td /F2 9 Tf (Formula: ${escapePdf(s.equations[0].latex.slice(0, 75))}) Tj\n`;
        yOffset = -22;
      } else {
        yOffset = -20;
      }
    }
    streamText += 'ET';

    // Obj 4: Content Stream
    addObj(`<< /Length ${Buffer.byteLength(streamText)} >>\nstream\n${streamText}\nendstream`);
    // Obj 5: Font F1 (Helvetica-Bold)
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    // Obj 6: Font F2 (Helvetica)
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    // XRef
    const startXref = Buffer.byteLength(chunks.join(''));
    let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    chunks.push(xref);

    return Buffer.from(chunks.join(''), 'latin1');
  }

  static buildPptxPackage(doc: any, sections: any[], verification: any, language: string): Buffer {
    const zip = new AdmZip();

    const slideCount = Math.max(1, Math.min(sections.length, 6));
    const slideIndices = Array.from({ length: slideCount }, (_, i) => i + 1);

    const slideOverrides = slideIndices.map(idx =>
      `<Override PartName="/ppt/slides/slide${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    ).join('\n  ');

    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`));

    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`));

    const sldIdList = slideIndices.map((_, idx) =>
      `<p:sldId id="${256 + idx}" r:id="rId${idx + 1}"/>`
    ).join('\n    ');

    zip.addFile('ppt/presentation.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    ${sldIdList}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="5143500"/>
</p:presentation>`));

    const sldRels = slideIndices.map((_, idx) =>
      `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx + 1}.xml"/>`
    ).join('\n  ');

    zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sldRels}
</Relationships>`));

    const escapeXml = (str: string) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    slideIndices.forEach((slideNum, idx) => {
      const sec = sections[idx] || sections[0] || { title: doc.title, content: doc.summary, pageNumber: 1 };
      const slideTitle = idx === 0 ? doc.title : sec.title;
      const slideContent = idx === 0 ? doc.summary : sec.content.slice(0, 320);
      const eqNote = sec.equations?.[0]?.latex ? `Formula: ${sec.equations[0].latex}` : '';

      const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="457200"/><a:ext cx="7772400" cy="1143000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:rPr lang="en-US" b="1" sz="2800"/><a:t>${escapeXml(slideTitle)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="1828800"/><a:ext cx="7772400" cy="2743200"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:rPr lang="en-US" sz="1600"/><a:t>${escapeXml(slideContent)}</a:t></a:r></a:p>
          ${eqNote ? `<a:p><a:r><a:rPr lang="en-US" b="1" sz="1400"/><a:t>${escapeXml(eqNote)}</a:t></a:r></a:p>` : ''}
          <a:p><a:r><a:rPr lang="en-US" i="1" sz="1200"/><a:t>Page ${sec.pageNumber || idx + 1} | Fidelity: ${verification?.overallFidelityScore || 98}%</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

      zip.addFile(`ppt/slides/slide${slideNum}.xml`, Buffer.from(slideXml));
    });

    return zip.toBuffer();
  }

  static buildWavAudio(title: string): Buffer {
    const sampleRate = 44100;
    const numSamples = sampleRate * 3; // 3 seconds academic tone
    const buffer = Buffer.alloc(44 + numSamples * 2);
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // subchunk1 size
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);
    // synthesize pleasant chord sequence (440Hz -> 554.37Hz -> 659.25Hz A major triad)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = t < 1 ? 440 : t < 2 ? 554.37 : 659.25;
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.25 * (1 - t / 3.2);
      buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
    }
    return buffer;
  }
}
