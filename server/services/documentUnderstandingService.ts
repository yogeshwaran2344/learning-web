import { ExtractedSectionRecord, DocumentFileType } from '../db/schema';

export interface SemanticElement {
  id: string;
  type: 'heading' | 'definition' | 'equation' | 'condition' | 'example' | 'table' | 'paragraph';
  pageNumber: number;
  slideNumber?: number;
  sectionTitle: string;
  content: string;
  metadata?: Record<string, any>;
  confidence: number; // Extraction confidence (0 - 100), NOT factual correctness
}

export interface ConceptRelationship {
  sourceConcept: string;
  targetConcept: string;
  relationshipType: 'prerequisite' | 'derivation' | 'applies_to' | 'constrained_by' | 'generalizes';
  confidence: number;
  sourcePage: number;
}

export interface DocumentUnderstandingResult {
  documentId: string;
  chapters: { title: string; startPage: number; endPage: number; keyTopics: string[] }[];
  elements: SemanticElement[];
  sections: ExtractedSectionRecord[];
  conceptRelationships: ConceptRelationship[];
  deduplicatedCount: number;
  totalEquations: number;
  totalDefinitions: number;
  totalTables: number;
  totalConditions: number;
  extractionConfidence: number; // Optical & syntactic reliability score
}

// Comprehensive institutional and administrative noise classifier
const INSTITUTION_NOISE_PATTERNS = [
  /^(?:college|university|institute|school|department|dept\.?|faculty)\s+of\b/i,
  /\b(?:institute of technology|autonomous college|affiliated to|deemed to be university)\b/i,
  /\b(?:internal assessment|semester examination|mid-term|end-semester|model question paper)\b/i,
  /\b(?:course code|subject code|scheme|branch|sub code|usn|roll no|reg(?:istration)?\.?\s*no)\s*[:.\-]/i,
  /\b(?:maximum marks|max marks|time limit|duration\s*:\s*\d+\s*(?:hours|hrs|mins?))\b/i,
  /\b(?:prepared by|guided by|presented by|submitted by|submitted to|instructor\s*:|faculty\s*:)\b/i,
  /\b(?:lecture notes for\s+\w+|for internal circulation only|confidential|all rights reserved)\b/i,
  /\b(?:copyright\s*©?|downloaded from|visit\s*:\s*www\.|www\.[a-z0-9-]+\.[a-z]{2,})\b/i,
  /^(?:page\s*\d+\s*of\s*\d+|slide\s*\d+\s*of\s*\d+)$/i
];

function isAdministrativeNoise(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return false;
  // Guard: Never remove formulas, equations, definitions, or academic content
  if (/^(\$\$?[^$]+\$\$?|[a-z]\s*=|def(inition)?\b|theorem\b|lemma\b|algorithm\b|proof\b)/i.test(trimmed)) {
    return false;
  }
  return INSTITUTION_NOISE_PATTERNS.some(pat => pat.test(trimmed));
}

export class DocumentUnderstandingService {
  /**
   * Intermediate understanding stage:
   * 1. Identifies genuine chapters, topics, and hierarchical structure.
   * 2. Separates headings, definitions, examples, formulas, tables, and conditions.
   * 3. Identifies evidenced prerequisite and derivation relationships between concepts.
   * 4. Detects and removes administrative metadata, college headers, and repeated boilerplate.
   * 5. Divides document into pedagogically meaningful sections with exact source anchors.
   */
  static analyze(
    documentId: string,
    rawSections: ExtractedSectionRecord[],
    fileType: DocumentFileType,
    baseConfidence: number = 95
  ): DocumentUnderstandingResult {
    const elements: SemanticElement[] = [];
    const relationships: ConceptRelationship[] = [];
    let deduplicatedCount = 0;

    // Detect repeated boilerplate lines (such as "Page X of Y", slide footers)
    const lineFrequency: Record<string, number> = {};
    for (const sec of rawSections) {
      const lines = sec.content.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l.length < 80);
      for (const line of lines) {
        lineFrequency[line] = (lineFrequency[line] || 0) + 1;
      }
    }
    const boilerplateLines = new Set<string>();
    const sectionThreshold = Math.max(2, Math.floor(rawSections.length * 0.6));
    for (const [line, count] of Object.entries(lineFrequency)) {
      if (count >= sectionThreshold && !/formula|equation|theorem|definition/i.test(line)) {
        boilerplateLines.add(line);
      }
    }

    const processedSections: ExtractedSectionRecord[] = [];
    const allExtractedConcepts: { name: string; page: number; contextSnippet: string }[] = [];

    // Process each section
    for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
      const rawSec = rawSections[sIdx];
      const pageNum = rawSec.pageNumber || sIdx + 1;
      const slideNum = rawSec.slideNumber;

      // 1. Remove repeated boilerplate lines AND administrative institutional noise
      const cleanLines = rawSec.content.split('\n').filter(line => {
        const trimmed = line.trim();
        if (boilerplateLines.has(trimmed) || isAdministrativeNoise(trimmed)) {
          deduplicatedCount++;
          return false;
        }
        return true;
      });
      const cleanContent = cleanLines.join('\n').trim();

      // 2. Extract Headings
      elements.push({
        id: `elem-heading-${sIdx + 1}`,
        type: 'heading',
        pageNumber: pageNum,
        slideNumber: slideNum,
        sectionTitle: rawSec.title,
        content: rawSec.title,
        confidence: baseConfidence
      });

      // 3. Extract Definitions
      const definitions = [...(rawSec.definitions || [])];

      // Seed pre-existing definitions from raw section into allExtractedConcepts
      (rawSec.definitions || []).forEach(d => {
        if (!allExtractedConcepts.some(c => c.name.toLowerCase() === d.term.toLowerCase())) {
          allExtractedConcepts.push({ name: d.term, page: pageNum, contextSnippet: cleanContent });
        }
      });

      const sentences = cleanContent.split(/(?<=[.?!])\s+/);
      sentences.forEach((sent, idx) => {
        if (/is defined as|refers to|denotes|is defined by|is called|is a mechanism|means/i.test(sent)) {
          const match = sent.split(/is defined as|refers to|denotes|is defined by|is called|is a mechanism|means/i);
          if (match[0] && match[1] && match[0].length < 60) {
            const term = match[0].replace(/^(A|An|The)\s+/i, '').trim();
            const defText = match[1].trim();
            if (!definitions.some(d => d.term.toLowerCase() === term.toLowerCase())) {
              definitions.push({
                term,
                definition: defText,
                conditions: 'Extracted academic definition'
              });
              if (!allExtractedConcepts.some(c => c.name.toLowerCase() === term.toLowerCase())) {
                allExtractedConcepts.push({ name: term, page: pageNum, contextSnippet: sent });
              }
              elements.push({
                id: `elem-def-${sIdx + 1}-${idx}`,
                type: 'definition',
                pageNumber: pageNum,
                slideNumber: slideNum,
                sectionTitle: rawSec.title,
                content: `${term}: ${defText}`,
                metadata: { term, definition: defText },
                confidence: baseConfidence
              });
            }
          }
        }
      });

      // 4. Extract Equations with mathematical integrity
      const equations = [...(rawSec.equations || [])];
      const eqMatches = cleanContent.match(/(\$\$?[^$]+\$\$?|[A-Za-z0-9_]+\([^)]*\)\s*=\s*[^.\n]{4,85}|[A-Za-z]\s*=\s*[^.\n]{4,85})/g);
      if (eqMatches) {
        eqMatches.forEach((eqStr, eqIdx) => {
          const cleanEq = eqStr.replace(/\$/g, '').trim();
          if (!equations.some(e => e.latex === cleanEq)) {
            const eqObj = {
              latex: cleanEq,
              label: `Equation (${equations.length + 1})`,
              meaning: `Mathematical relation extracted from ${rawSec.title}`
            };
            equations.push(eqObj);
            elements.push({
              id: `elem-eq-${sIdx + 1}-${eqIdx}`,
              type: 'equation',
              pageNumber: pageNum,
              slideNumber: slideNum,
              sectionTitle: rawSec.title,
              content: cleanEq,
              metadata: eqObj,
              confidence: baseConfidence
            });
          }
        });
      }

      // 5. Extract Boundary Conditions & Invariants
      const conditions = [...(rawSec.conditions || [])];
      sentences.forEach(sent => {
        if (/must|requires|strictly|condition|assuming|provided that|invariant|guarantee|constrained by/i.test(sent) && sent.length < 240) {
          const condTrim = sent.trim();
          if (!conditions.includes(condTrim)) {
            conditions.push(condTrim);
            elements.push({
              id: `elem-cond-${sIdx + 1}-${conditions.length}`,
              type: 'condition',
              pageNumber: pageNum,
              slideNumber: slideNum,
              sectionTitle: rawSec.title,
              content: condTrim,
              confidence: baseConfidence
            });
          }
        }
      });

      // 6. Extract Worked Examples
      const examples = [...(rawSec.examples || [])];
      const exampleBlocks = cleanContent.split(/(?=Example\s*\d*:?|Worked\s*Example:?|For\s+example,)/i);
      if (exampleBlocks.length > 1) {
        exampleBlocks.slice(1).forEach((exBlock, exIdx) => {
          const snippet = exBlock.slice(0, 400).trim();
          if (snippet && !examples.includes(snippet)) {
            examples.push(snippet);
            elements.push({
              id: `elem-ex-${sIdx + 1}-${exIdx}`,
              type: 'example',
              pageNumber: pageNum,
              slideNumber: slideNum,
              sectionTitle: rawSec.title,
              content: snippet,
              confidence: baseConfidence
            });
          }
        });
      }

      // 7. Extract Tables
      const tables = rawSec.tables ? [...rawSec.tables] : [];
      if (tables.length > 0) {
        tables.forEach((tbl, tIdx) => {
          elements.push({
            id: `elem-tbl-${sIdx + 1}-${tIdx}`,
            type: 'table',
            pageNumber: pageNum,
            slideNumber: slideNum,
            sectionTitle: rawSec.title,
            content: `Table: ${tbl.caption} (${tbl.headers.join(' | ')})`,
            metadata: tbl,
            confidence: baseConfidence
          });
        });
      }

      // Reconstruct clean, enriched section
      processedSections.push({
        ...rawSec,
        content: cleanContent,
        definitions,
        equations,
        conditions,
        examples,
        tables: tables.length > 0 ? tables : undefined
      });
    }

    // 8. Identify Relationships between concepts with genuine lexical/semantic evidence
    // Never assume arbitrary prerequisite based merely on page numbers!
    const DEPENDENCY_KEYWORDS = [
      'requires', 'depends on', 'utilizes', 'uses', 'builds upon', 'extends',
      'is derived from', 'derived from', 'governed by', 'constrained by',
      'prerequisite', 'is an instance of', 'is based on', 'derives'
    ];

    for (let i = 0; i < allExtractedConcepts.length; i++) {
      for (let j = 0; j < allExtractedConcepts.length; j++) {
        if (i === j) continue;
        const c1 = allExtractedConcepts[i];
        const c2 = allExtractedConcepts[j];
        if (c1.name.toLowerCase() === c2.name.toLowerCase()) continue;

        // Check if c2 context explicitly mentions c1 outside c2's own name occurrence
        const c2Text = c2.contextSnippet.toLowerCase();
        const c1Term = c1.name.toLowerCase();
        const c2WithoutSelf = c2Text.split(c2.name.toLowerCase()).join('');
        if (c2WithoutSelf.includes(c1Term)) {
          const isDerivation = c2Text.includes('derived from') || c2Text.includes('derives') || c2Text.includes('derivation');
          const isPrerequisite = DEPENDENCY_KEYWORDS.some(kw => c2Text.includes(kw));

          relationships.push({
            sourceConcept: c1.name,
            targetConcept: c2.name,
            relationshipType: isDerivation ? 'derivation' : isPrerequisite ? 'prerequisite' : 'applies_to',
            confidence: 92,
            sourcePage: c1.page,
            targetPage: c2.page,
            evidence: `Textual evidence linking ${c1.name} with ${c2.name}`
          });
        }
      }
    }

    // 9. Identify Genuine Chapters & Topic Groupings Grounded in Actual Document Structure
    // Never arbitrarily divide sections into equal-sized chunks or fixed slices of 3.
    // If a document has no explicit chapters, group topics by genuine section headings or mark as Unclassified.
    const chapters: { title: string; startPage: number; endPage: number; keyTopics: string[] }[] = [];
    let currentChapter: { title: string; startPage: number; endPage: number; keyTopics: string[] } | null = null;

    for (const sec of processedSections) {
      const title = (sec.title || '').trim();
      const explicitChapter = (sec.chapterTitle || '').trim();

      // Check for explicit chapter / unit / module or top-level numbered headings (e.g. "1. ", "Chapter 1", "Module 2")
      const chapterMatch = title.match(/^(?:chapter|module|unit|part)\s+(\d+|[ivxlcdm]+)[:.\s\-–—]+(.+)/i);
      const majorHeadingMatch = title.match(/^(\d+)\.\s+([A-Z][^.\n]+)/);
      const isSubtopicMatch = Boolean(title.match(/^\d+\.\d+/)); // e.g. "2.1 Process Concept" -> subtopic, not new chapter

      const isNewChapterExplicit = explicitChapter && (!currentChapter || currentChapter.title !== explicitChapter);
      const isNewChapterDetected = Boolean(chapterMatch || (majorHeadingMatch && !isSubtopicMatch));

      if (isNewChapterExplicit || isNewChapterDetected) {
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        const chapterTitle = explicitChapter || (chapterMatch ? title : (majorHeadingMatch ? title : title));
        currentChapter = {
          title: chapterTitle,
          startPage: sec.pageNumber || 1,
          endPage: sec.pageNumber || 1,
          keyTopics: [title]
        };
      } else if (!currentChapter) {
        // First chapter title: use explicitChapter, or section title, or "Unclassified Section"
        const initialTitle = explicitChapter || (chapterMatch ? title : (majorHeadingMatch ? title : (title || 'Unclassified Section')));
        currentChapter = {
          title: initialTitle,
          startPage: sec.pageNumber || 1,
          endPage: sec.pageNumber || 1,
          keyTopics: [title]
        };
      } else {
        // Topic belongs to current chapter or continues previous topic
        currentChapter.endPage = Math.max(currentChapter.endPage, sec.pageNumber || currentChapter.startPage);
        if (currentChapter.keyTopics.length < 12 && !currentChapter.keyTopics.includes(title)) {
          currentChapter.keyTopics.push(title);
        }
      }
    }

    if (currentChapter) {
      chapters.push(currentChapter);
    }

    const totalEquations = processedSections.reduce((acc, s) => acc + (s.equations?.length || 0), 0);
    const totalDefinitions = processedSections.reduce((acc, s) => acc + (s.definitions?.length || 0), 0);
    const totalTables = processedSections.reduce((acc, s) => acc + (s.tables?.length || 0), 0);
    const totalConditions = processedSections.reduce((acc, s) => acc + (s.conditions?.length || 0), 0);

    return {
      documentId,
      chapters,
      elements,
      sections: processedSections,
      conceptRelationships: relationships.slice(0, 15),
      deduplicatedCount,
      totalEquations,
      totalDefinitions,
      totalTables,
      totalConditions,
      extractionConfidence: baseConfidence
    };
  }
}
