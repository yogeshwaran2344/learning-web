import { ExtractedSectionRecord, AppLanguage, SourceCitationRecord } from '../db/schema';
import { DifficultyLevel, GeneratedFormatResult } from './aiGeneratorService';

export interface DetailedNotesOutput {
  title: string;
  overview: string;
  sections: {
    heading: string;
    pageOrSlide: number;
    definitions: { term: string; definition: string; conditions?: string }[];
    explanations: string[];
    equations?: { latex: string; meaning: string }[];
    conditions?: string[];
    keyPoints: string[];
    sourceCitation: SourceCitationRecord;
  }[];
  overallSummary: string;
}

export interface FlashcardOutputItem {
  id: string;
  front: string; // Question
  back: string;  // Answer
  pageOrSlide: number;
  sectionTitle: string;
  category: 'definition' | 'equation' | 'concept' | 'condition';
  reviewStatus: 'new' | 'learning' | 'mastered';
  sourceCitation: SourceCitationRecord;
  explanation: string;
}

export class AiModelService {
  private static geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  private static openaiApiKey = process.env.OPENAI_API_KEY || '';

  static hasExternalAiProvider(): boolean {
    return Boolean(this.geminiApiKey || this.openaiApiKey);
  }

  static getProviderStatus() {
    return {
      geminiConfigured: Boolean(this.geminiApiKey),
      openaiConfigured: Boolean(this.openaiApiKey),
      activeProvider: this.geminiApiKey ? 'gemini' : (this.openaiApiKey ? 'openai' : 'deterministic-grounded'),
      mode: this.hasExternalAiProvider() ? 'external_model_backed' : 'deterministic_high_fidelity',
      modelName: this.geminiApiKey ? 'Gemini 1.5 Flash' : (this.openaiApiKey ? 'GPT-4o mini' : 'LearnLens Grounded Engine')
    };
  }

  static setCustomApiKey(provider: 'gemini' | 'openai', key: string) {
    if (provider === 'gemini') {
      this.geminiApiKey = key.trim();
    } else if (provider === 'openai') {
      this.openaiApiKey = key.trim();
    }
  }

  static getSystemPrompt(language: AppLanguage, formatType: string): string {
    return `You are an expert Academic Tutor and Meaning Preservation Engine for LearnLens AI.
Target Language: ${language}
Format to Generate: ${formatType}

STRICT ACADEMIC FIDELITY RULES:
1. FAITHFULNESS TO SOURCE: Every statement, equation, condition, and definition MUST be strictly grounded in the extracted source text provided. DO NOT hallucinate facts, variables, or constants.
2. SOURCE REFERENCES: You must attach the exact page number (or slide number) and section title to every heading, concept, and flashcard.
3. CLEAR PEDAGOGICAL BOUNDARIES: If you provide an intuition, metaphor, or analogy not directly present in the source, you MUST explicitly prepend it with:
"[Beyond Source Context]: <your pedagogical explanation>"
4. MATHEMATICAL & EQUATION INTEGRITY: Maintain exact mathematical precision. Preserve normalization factors (such as 1/sqrt(d_k), 10000, 2*pi), variables, exponents, and invariant boundary conditions (e.g. "incompressible", "finite", "non-negative", "orthonormal").
5. STRUCTURED JSON OUTPUT: Always return valid, well-formed JSON matching the requested schema.`;
  }

  /**
   * Main entry point: Generates structured learning materials with section-by-section chunking
   * for large documents, strict schema enforcement, and fallback.
   */
  static async generateWithAi(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    formatType: 'map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz',
    language: AppLanguage = 'English',
    difficulty: DifficultyLevel = 'intermediate'
  ): Promise<GeneratedFormatResult | null> {
    if (!this.hasExternalAiProvider()) {
      return null; // Signals caller to use high-fidelity deterministic generator
    }

    try {
      if (formatType === 'notes') {
        return await this.generateStructuredNotes(documentId, docTitle, sections, language, difficulty);
      } else if (formatType === 'flashcards') {
        return await this.generateStructuredFlashcards(documentId, docTitle, sections, language, difficulty);
      } else if (formatType === 'map') {
        return await this.generateStructuredConceptMap(documentId, docTitle, sections, language, difficulty);
      } else if (formatType === 'simplified') {
        return await this.generateStructuredSimplified(documentId, docTitle, sections, language, difficulty);
      } else if (formatType === 'worked') {
        return await this.generateStructuredWorked(documentId, docTitle, sections, language, difficulty);
      } else if (formatType === 'audio') {
        return await this.generateStructuredAudio(documentId, docTitle, sections, language, difficulty);
      } else if (formatType === 'quiz') {
        return await this.generateStructuredQuiz(documentId, docTitle, sections, language, difficulty);
      } else {
        return null;
      }
    } catch (err: any) {
      console.warn(`[AiModelService] External AI generation failed: ${err.message}. Falling back to deterministic generator.`);
      return null;
    }
  }

  /**
   * Section-by-section generator for Detailed Notes (Section 16.2 & 16.3)
   */
  private static async generateStructuredNotes(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const CHUNK_SIZE = 3; // Process in chunks of max 3 sections to prevent truncation & handle large docs
    const noteSections: DetailedNotesOutput['sections'] = [];
    const allCitations: SourceCitationRecord[] = [];

    for (let i = 0; i < sections.length; i += CHUNK_SIZE) {
      const sectionChunk = sections.slice(i, i + CHUNK_SIZE);
      const promptContext = sectionChunk.map(s => `
[Section ${s.pageNumber || s.slideNumber || 1}: "${s.title}"]
Content: ${s.content}
${s.equations?.length ? 'Equations: ' + s.equations.map(e => e.latex).join('; ') : ''}
${s.conditions?.length ? 'Conditions: ' + s.conditions.join('; ') : ''}
`).join('\n---\n');

      const userPrompt = `Document: "${docTitle}"
Language: ${language}
Difficulty: ${difficulty}
Generate detailed structured academic notes for the following sections in JSON format:
{
  "sections": [
    {
      "heading": "Section Heading",
      "pageOrSlide": 1,
      "definitions": [{"term": "...", "definition": "...", "conditions": "..."}],
      "explanations": ["Sentence 1...", "Sentence 2..."],
      "equations": [{"latex": "...", "meaning": "..."}],
      "conditions": ["Invariant 1..."],
      "keyPoints": ["Point 1...", "Point 2..."]
    }
  ]
}

Source Passages:
${promptContext}`;

      const rawJson = await this.callLlmRaw(userPrompt, language, 'notes');
      if (rawJson) {
        try {
          const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
          if (parsed.sections && Array.isArray(parsed.sections)) {
            for (let idx = 0; idx < parsed.sections.length; idx++) {
              const secItem = parsed.sections[idx];
              const matchingSource = sectionChunk[idx] || sectionChunk[0];
              const pageNum = secItem.pageOrSlide || matchingSource.pageNumber || matchingSource.slideNumber || 1;
              const citation: SourceCitationRecord = {
                id: `cite-notes-${documentId}-${secItem.pageOrSlide || idx + 1}`,
                documentId,
                pageNumber: pageNum,
                slideNumber: matchingSource.slideNumber,
                sectionTitle: secItem.heading || matchingSource.title,
                exactQuote: (secItem.explanations?.[0] || matchingSource.content).slice(0, 120),
                contextSnippet: matchingSource.content.slice(0, 200)
              };
              secItem.sourceCitation = citation;
              noteSections.push(secItem);
              allCitations.push(citation);
            }
          }
        } catch (e) {
          console.warn('[AiModelService] Failed parsing notes chunk JSON:', e);
        }
      }
    }

    if (noteSections.length === 0) return null;

    const notesOutput: DetailedNotesOutput = {
      title: docTitle,
      overview: `Comprehensive academic study notes synthesized from ${sections.length} extracted section(s).`,
      sections: noteSections,
      overallSummary: noteSections.map(s => s.keyPoints).flat().slice(0, 5).join(' ')
    };

    return {
      formatType: 'notes',
      language,
      difficultyLevel: difficulty,
      content: notesOutput,
      sourceCitations: allCitations
    };
  }

  /**
   * Section-by-section generator for Flashcards (Section 16.2 & 16.3)
   */
  private static async generateStructuredFlashcards(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const flashcards: FlashcardOutputItem[] = [];
    const allCitations: SourceCitationRecord[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const userPrompt = `Document: "${docTitle}"
Section: [Page ${sec.pageNumber || sec.slideNumber || 1}: ${sec.title}]
Content: ${sec.content}
${sec.equations?.length ? 'Equations: ' + sec.equations.map(e => e.latex).join('; ') : ''}
${sec.conditions?.length ? 'Conditions: ' + sec.conditions.join('; ') : ''}

Generate 2 to 3 targeted academic flashcards from this section in JSON format:
{
  "flashcards": [
    {
      "front": "Specific question about theorem, definition, or formula?",
      "back": "Accurate, source-grounded answer adhering strictly to conditions.",
      "category": "definition",
      "explanation": "Evidence from original source text."
    }
  ]
}`;

      const rawJson = await this.callLlmRaw(userPrompt, language, 'flashcards');
      if (rawJson) {
        try {
          const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
          if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
            parsed.flashcards.forEach((fc: any, fcIdx: number) => {
              const citation: SourceCitationRecord = {
                id: `fc-cite-${documentId}-${sec.pageNumber}-${fcIdx + 1}`,
                documentId,
                pageNumber: sec.pageNumber || 1,
                slideNumber: sec.slideNumber,
                sectionTitle: sec.title,
                exactQuote: fc.back.slice(0, 120),
                contextSnippet: sec.content.slice(0, 180)
              };
              allCitations.push(citation);
              flashcards.push({
                id: `fc-${documentId}-${sec.pageNumber}-${fcIdx + 1}`,
                front: fc.front,
                back: fc.back,
                pageOrSlide: sec.pageNumber || sec.slideNumber || 1,
                sectionTitle: sec.title,
                category: fc.category || (sec.equations?.length ? 'equation' : 'concept'),
                reviewStatus: 'new',
                sourceCitation: citation,
                explanation: fc.explanation || `Derived from Page ${sec.pageNumber}: ${sec.title}`
              });
            });
          }
        } catch (e) {
          console.warn('[AiModelService] Failed parsing flashcard JSON chunk:', e);
        }
      }
    }

    if (flashcards.length === 0) return null;

    return {
      formatType: 'flashcards',
      language,
      difficultyLevel: difficulty,
      content: flashcards,
      sourceCitations: allCitations
    };
  }

  /**
   * Structured generator for Concept Maps (Section 16.2 & 16.3)
   */
  private static async generateStructuredConceptMap(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const promptContext = sections.slice(0, 6).map((s, idx) => `
[Section ${idx + 1} (Page/Slide ${s.pageNumber || s.slideNumber || idx + 1}): "${s.title}"]
Content: ${s.content}
${s.equations?.length ? 'Equations: ' + s.equations.map(e => e.latex).join('; ') : ''}
${s.conditions?.length ? 'Conditions: ' + s.conditions.join('; ') : ''}
`).join('\n---\n');

    const userPrompt = `Document: "${docTitle}"
Language: ${language}
Difficulty: ${difficulty}

Synthesize a connected concept map DAG from the following sections in JSON format:
{
  "nodes": [
    {
      "id": "node-1",
      "label": "Concept Label (max 28 chars)",
      "category": "core", // choose from: "core", "mechanism", "equation", "condition", "application"
      "summary": "Core definition or theorem summary grounded in source.",
      "prerequisites": [],
      "importance": "foundational", // "foundational", "high", or "medium"
      "pageOrSlide": 1
    }
  ],
  "edges": [
    {
      "from": "node-1",
      "to": "node-2",
      "relation": "descriptive relationship"
    }
  ]
}

Source Passages:
${promptContext}`;

    const rawJson = await this.callLlmRaw(userPrompt, language, 'map');
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
      if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
        return null;
      }

      const citations: SourceCitationRecord[] = [];
      const nodes = parsed.nodes.map((node: any, idx: number) => {
        const pageNum = node.pageOrSlide || sections[idx]?.pageNumber || 1;
        const matchingSec = sections.find(s => s.pageNumber === pageNum) || sections[idx] || sections[0];
        const citation: SourceCitationRecord = {
          id: `cite-${node.id || idx + 1}`,
          documentId,
          pageNumber: pageNum,
          slideNumber: matchingSec?.slideNumber,
          sectionTitle: matchingSec?.title || node.label,
          exactQuote: (node.summary || matchingSec?.content || '').slice(0, 140),
          contextSnippet: (matchingSec?.content || '').slice(0, 200)
        };
        citations.push(citation);
        return {
          id: node.id || `node-${idx + 1}`,
          label: node.label,
          category: node.category || 'core',
          summary: node.summary,
          prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites : [],
          importance: node.importance || 'high',
          difficulty,
          sourceCitation: citation
        };
      });

      return {
        formatType: 'map',
        language,
        difficultyLevel: difficulty,
        content: { nodes, edges: parsed.edges || [] },
        sourceCitations: citations
      };
    } catch (e) {
      console.warn('[AiModelService] Failed parsing concept map JSON:', e);
      return null;
    }
  }

  /**
   * Structured generator for Simplified Explanations (3 tiers + key takeaways + beyond context)
   */
  private static async generateStructuredSimplified(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const sec = sections[0] || { pageNumber: 1, title: docTitle, content: 'Academic exposition.' };
    const promptContext = sections.slice(0, 3).map(s => `[Page ${s.pageNumber}: ${s.title}]\n${s.content}`).join('\n---\n');

    const userPrompt = `Document: "${docTitle}"
Language: ${language}
Difficulty: ${difficulty}

Synthesize a 3-tier academic explanation in JSON format:
{
  "title": "${sec.title}",
  "summary": "Core 2-3 sentence academic summary directly grounded in the source.",
  "intuitiveAnalogy": "[Beyond Source Context]: Pedagogical analogy or metaphor explaining the mechanism clearly.",
  "rigorousBreakdown": "Formal mathematical and theoretical breakdown preserving all technical terms and qualifiers.",
  "workedExample": "Concrete calculation or example step maintaining exact invariants.",
  "keyTakeaways": [
    "Core takeaway 1...",
    "Boundary condition takeaway 2...",
    "Verified application takeaway 3..."
  ]
}

Source Passages:
${promptContext}`;

    const rawJson = await this.callLlmRaw(userPrompt, language, 'simplified');
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
      const citation: SourceCitationRecord = {
        id: `cite-expl-${documentId}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: (sec.content || '').slice(0, 140),
        contextSnippet: (sec.content || '').slice(0, 220)
      };

      const hasBeyond = Boolean(parsed.intuitiveAnalogy && parsed.intuitiveAnalogy.includes('[Beyond Source Context]'));

      return {
        formatType: 'simplified',
        language,
        difficultyLevel: difficulty,
        hasBeyondNotesAnnotation: hasBeyond,
        additionalContextSummary: hasBeyond
          ? 'Supplementary intuition and analogies included with [Beyond Source Context] tags.'
          : undefined,
        content: {
          title: parsed.title || sec.title,
          summary: parsed.summary || sec.content.slice(0, 200),
          intuitiveAnalogy: parsed.intuitiveAnalogy || 'Conceptual pedagogical model.',
          rigorousBreakdown: parsed.rigorousBreakdown || sec.content,
          workedExample: parsed.workedExample || 'Standard derivation step.',
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
          citations: [citation]
        },
        sourceCitations: [citation]
      };
    } catch (e) {
      console.warn('[AiModelService] Failed parsing simplified explanation JSON:', e);
      return null;
    }
  }

  /**
   * Structured generator for Worked Examples
   */
  private static async generateStructuredWorked(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const sec = sections[0] || { pageNumber: 1, title: docTitle, content: 'Problem statement and derivation.' };
    const eq = sec.equations?.[0]?.latex || 'f(x) = y';

    const userPrompt = `Document: "${docTitle}"
Language: ${language}
Difficulty: ${difficulty}
Primary Equation: ${eq}

Generate a step-by-step mathematical worked example in JSON format:
{
  "title": "Worked Problem: ${sec.title}",
  "problemStatement": "Clear problem formulation under verified boundary conditions.",
  "solutionSteps": [
    "Step 1: Identify given input values and confirm boundary conditions.",
    "Step 2: Apply primary formulation ${eq}.",
    "Step 3: Evaluate operations and normalize variance.",
    "Step 4: Verify computed bounds adhere strictly to theoretical requirements."
  ]
}

Source Passages:
${sec.content.slice(0, 2500)}`;

    const rawJson = await this.callLlmRaw(userPrompt, language, 'worked');
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
      const citation: SourceCitationRecord = {
        id: `cite-worked-${documentId}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: (sec.content || '').slice(0, 140),
        contextSnippet: (sec.content || '').slice(0, 220)
      };

      return {
        formatType: 'worked',
        language,
        difficultyLevel: difficulty,
        content: {
          title: parsed.title || `Worked Problem: ${sec.title}`,
          problemStatement: parsed.problemStatement || `Calculate output under formula ${eq}.`,
          solutionSteps: Array.isArray(parsed.solutionSteps) ? parsed.solutionSteps : [],
          citation
        },
        sourceCitations: [citation]
      };
    } catch (e) {
      console.warn('[AiModelService] Failed parsing worked example JSON:', e);
      return null;
    }
  }

  /**
   * Structured generator for Audio Lessons
   */
  private static async generateStructuredAudio(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const targetSections = sections.slice(0, 4);
    const promptContext = targetSections.map((s, idx) => `
[Section ${idx + 1} (Page ${s.pageNumber || s.slideNumber || idx + 1}): "${s.title}"]
${s.content}
`).join('\n---\n');

    const userPrompt = `Document: "${docTitle}"
Language: ${language}
Difficulty: ${difficulty}

Generate an engaging spoken audio lecture script across sections in JSON format:
{
  "title": "${docTitle} (${language} Audio Lesson)",
  "sections": [
    {
      "sectionTitle": "1. Introduction to ...",
      "scriptText": "Clear spoken narrative explaining this section with exact definitions and invariant conditions.",
      "pageOrSlide": 1
    }
  ]
}

Source Passages:
${promptContext}`;

    const rawJson = await this.callLlmRaw(userPrompt, language, 'audio');
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
      if (!parsed.sections || !Array.isArray(parsed.sections)) return null;

      const citations: SourceCitationRecord[] = [];
      const audioSections = parsed.sections.map((secItem: any, idx: number) => {
        const matchingSec = targetSections[idx] || targetSections[0];
        const pageNum = secItem.pageOrSlide || matchingSec.pageNumber || 1;
        const citation: SourceCitationRecord = {
          id: `acite-${idx + 1}`,
          documentId,
          pageNumber: pageNum,
          slideNumber: matchingSec.slideNumber,
          sectionTitle: secItem.sectionTitle || matchingSec.title,
          exactQuote: (secItem.scriptText || matchingSec.content).slice(0, 140),
          contextSnippet: matchingSec.content.slice(0, 200)
        };
        citations.push(citation);
        const script = secItem.scriptText || '';
        const durationSeconds = Math.max(30, Math.round(script.split(/\s+/).length / 2.5));

        return {
          id: `audio-sec-${idx + 1}`,
          sectionTitle: secItem.sectionTitle || `${idx + 1}. ${matchingSec.title}`,
          durationSeconds,
          scriptText: script,
          sourceCitation: citation
        };
      });

      return {
        formatType: 'audio',
        language,
        difficultyLevel: difficulty,
        content: {
          id: `audio-${documentId}`,
          title: parsed.title || `${docTitle} (${language} Audio Lesson)`,
          totalDurationSeconds: audioSections.reduce((acc: number, s: any) => acc + s.durationSeconds, 0),
          sections: audioSections
        },
        sourceCitations: citations
      };
    } catch (e) {
      console.warn('[AiModelService] Failed parsing audio lesson JSON:', e);
      return null;
    }
  }

  /**
   * Structured generator for Practice Quizzes
   */
  private static async generateStructuredQuiz(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): Promise<GeneratedFormatResult | null> {
    const targetSections = sections.slice(0, 4);
    const promptContext = targetSections.map((s, idx) => `
[Section ${idx + 1} (Page ${s.pageNumber || s.slideNumber || idx + 1}): "${s.title}"]
${s.content}
${s.equations?.length ? 'Equations: ' + s.equations.map(e => e.latex).join('; ') : ''}
${s.conditions?.length ? 'Conditions: ' + s.conditions.join('; ') : ''}
`).join('\n---\n');

    const userPrompt = `Document: "${docTitle}"
Language: ${language}
Difficulty: ${difficulty}

Generate targeted multiple-choice practice questions in JSON format:
{
  "questions": [
    {
      "question": "Which statement is mathematically and conceptually verified for <topic>?",
      "category": "definition", // "definition", "equation", or "condition"
      "pageOrSlide": 1,
      "options": [
        { "text": "Correct option directly stated in source", "isCorrect": true, "explanation": "Grounded in source text." },
        { "text": "Distractor violating condition or parameter", "isCorrect": false, "explanation": "False claim." },
        { "text": "Distractor omitting essential invariant", "isCorrect": false, "explanation": "Inaccurate." }
      ]
    }
  ]
}

Source Passages:
${promptContext}`;

    const rawJson = await this.callLlmRaw(userPrompt, language, 'quiz');
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(this.cleanJsonBlock(rawJson));
      if (!parsed.questions || !Array.isArray(parsed.questions)) return null;

      const citations: SourceCitationRecord[] = [];
      const questions = parsed.questions.map((q: any, idx: number) => {
        const matchingSec = targetSections[idx] || targetSections[0];
        const pageNum = q.pageOrSlide || matchingSec.pageNumber || 1;
        const citation: SourceCitationRecord = {
          id: `q-cite-${idx + 1}`,
          documentId,
          pageNumber: pageNum,
          slideNumber: matchingSec.slideNumber,
          sectionTitle: matchingSec.title,
          exactQuote: (q.options?.find((o: any) => o.isCorrect)?.text || matchingSec.content).slice(0, 140),
          contextSnippet: matchingSec.content.slice(0, 200)
        };
        citations.push(citation);

        return {
          id: `q-${documentId}-${idx + 1}`,
          question: q.question,
          category: q.category || 'definition',
          difficulty,
          options: q.options || [],
          sourceCitation: citation
        };
      });

      return {
        formatType: 'quiz',
        language,
        difficultyLevel: difficulty,
        content: questions,
        sourceCitations: citations
      };
    } catch (e) {
      console.warn('[AiModelService] Failed parsing quiz JSON:', e);
      return null;
    }
  }

  private static async callLlmRaw(prompt: string, language: AppLanguage, formatType: string): Promise<string | null> {
    if (this.geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: this.getSystemPrompt(language, formatType) + '\n\n' + prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned HTTP status ${response.status}`);
      }

      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } else if (this.openaiApiKey) {
      const url = 'https://api.openai.com/v1/chat/completions';
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.getSystemPrompt(language, formatType) },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API returned HTTP status ${response.status}`);
      }

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || null;
    }

    return null;
  }

  private static cleanJsonBlock(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith('```json')) {
      return trimmed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    if (trimmed.startsWith('```')) {
      return trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return trimmed;
  }
}
