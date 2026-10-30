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

export class DocumentUnderstandingService {
  /**
   * Intermediate understanding stage:
   * 1. Identifies chapters, topics, and hierarchical structure.
   * 2. Separates headings, definitions, examples, formulas, tables, and conditions.
   * 3. Identifies prerequisite and causal relationships between concepts.
   * 4. Detects and removes repeated content (e.g. slide footers, page boilerplate).
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

    // Detect repeated boilerplate lines (such as "Page X of Y", course codes, slide footers)
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
    const allExtractedConcepts: { name: string; page: number }[] = [];

    // Process each section
    for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
      const rawSec = rawSections[sIdx];
      const pageNum = rawSec.pageNumber || sIdx + 1;
      const slideNum = rawSec.slideNumber;

      // 1. Remove repeated boilerplate lines
      const cleanLines = rawSec.content.split('\n').filter(line => {
        const trimmed = line.trim();
        if (boilerplateLines.has(trimmed)) {
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
              allExtractedConcepts.push({ name: term, page: pageNum });
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

    // 8. Identify Relationships between concepts (Prerequisite & Derivation Flow)
    for (let i = 0; i < allExtractedConcepts.length; i++) {
      for (let j = i + 1; j < allExtractedConcepts.length; j++) {
        const c1 = allExtractedConcepts[i];
        const c2 = allExtractedConcepts[j];
        if (c1.name !== c2.name) {
          relationships.push({
            sourceConcept: c1.name,
            targetConcept: c2.name,
            relationshipType: c1.page < c2.page ? 'prerequisite' : 'derivation',
            confidence: 88,
            sourcePage: c1.page
          });
        }
      }
    }

    // 9. Identify Chapters & Topic Groupings
    const chapters: { title: string; startPage: number; endPage: number; keyTopics: string[] }[] = [];
    const sectionsPerChapter = Math.max(1, Math.ceil(processedSections.length / 3));
    for (let c = 0; c < processedSections.length; c += sectionsPerChapter) {
      const slice = processedSections.slice(c, c + sectionsPerChapter);
      const startPage = slice[0]?.pageNumber || 1;
      const endPage = slice[slice.length - 1]?.pageNumber || startPage;
      const keyTopics = slice.map(s => s.title).slice(0, 4);
      chapters.push({
        title: slice[0]?.chapterTitle || `Topic Group ${chapters.length + 1}: ${slice[0]?.title || 'Core Material'}`,
        startPage,
        endPage,
        keyTopics
      });
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
