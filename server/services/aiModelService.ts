import { ExtractedSectionRecord, AppLanguage } from '../db/schema';
import { DifficultyLevel, GeneratedFormatResult } from './aiGeneratorService';

export interface AiPromptPayload {
  formatType: string;
  docTitle: string;
  language: AppLanguage;
  difficulty: DifficultyLevel;
  extractedContext: string;
}

export class AiModelService {
  private static geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  private static openaiApiKey = process.env.OPENAI_API_KEY || '';

  /**
   * Determine if an external LLM API key is configured
   */
  static hasExternalAiProvider(): boolean {
    return Boolean(this.geminiApiKey || this.openaiApiKey);
  }

  /**
   * System Prompt strictly enforcing:
   * 1. Ground truth fidelity - facts must come from extracted source
   * 2. Page references [Page X] or [Slide Y] for all claims
   * 3. Explanations beyond the source must be explicitly tagged [Beyond Source Context]
   * 4. Preservation of mathematical expressions and condition invariants
   */
  static getSystemPrompt(language: AppLanguage): string {
    return `You are an expert Academic Tutor and Meaning Preservation Engine for LearnLens AI.
Target Language: ${language}

CRITICAL RULES:
1. FAITHFULNESS TO SOURCE: Every key factual statement, concept, definition, and formula must be strictly grounded in the provided Source Passages.
2. PAGE CITATIONS: Append explicit page citations in format "[Page X]" or "[Slide X]" referencing where the concept appears in the source.
3. CLEAR PEDAGOGICAL BOUNDARIES: If you provide an analogy, intuition, or supplementary explanation not found in the original source, you MUST explicitly tag it with:
"[Beyond Source Context]: <your supplementary pedagogical explanation>"
4. MATHEMATICAL & EQUATION INTEGRITY: Preserve mathematical equations, normalization constants (e.g. 1/sqrt(d_k)), exponents, and invariants exactly. Do NOT drop conditions or assumptions (such as "incompressible", "finite", "non-negative", "orthonormal").
5. Return clean structured JSON where specified.`;
  }

  /**
   * Synthesize learning format using external LLM (Gemini or OpenAI) with fallback
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
      return null; // Signals caller to use deterministic synthesizer
    }

    try {
      const sourcePassages = sections.map(s => 
        `[${s.slideNumber ? `Slide ${s.slideNumber}` : `Page ${s.pageNumber}`}: ${s.title}]\n${s.content}\n${s.equations?.length ? 'Equations: ' + s.equations.map(e => e.latex).join(', ') : ''}\n${s.conditions?.length ? 'Conditions: ' + s.conditions.join('; ') : ''}`
      ).join('\n\n---\n\n');

      const userPrompt = `Document: "${docTitle}"
Requested Format: ${formatType}
Language: ${language}
Difficulty: ${difficulty}

Source Content:
${sourcePassages.slice(0, 8000)}

Generate comprehensive learning materials for "${formatType}". Keep mathematical precision, page citations, and mark any added analogy with [Beyond Source Context].`;

      if (this.geminiApiKey) {
        return await this.callGemini(documentId, userPrompt, language, formatType, difficulty, sections);
      } else if (this.openaiApiKey) {
        return await this.callOpenAI(documentId, userPrompt, language, formatType, difficulty, sections);
      }
    } catch (e) {
      console.warn('[AiModelService] External LLM call failed, falling back to deterministic synthesizer:', e);
    }

    return null;
  }

  private static async callGemini(
    documentId: string,
    prompt: string,
    language: AppLanguage,
    formatType: any,
    difficulty: DifficultyLevel,
    sections: ExtractedSectionRecord[]
  ): Promise<GeneratedFormatResult | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: this.getSystemPrompt(language) + '\n\n' + prompt }
          ]
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
      throw new Error(`Gemini API error status: ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) return null;

    return {
      formatType,
      language,
      difficultyLevel: difficulty,
      content: {
        aiGenerated: true,
        provider: 'Gemini-1.5-Flash',
        text: textOutput
      },
      hasBeyondNotesAnnotation: textOutput.includes('[Beyond Source Context]'),
      additionalContextSummary: textOutput.includes('[Beyond Source Context]')
        ? 'Supplementary intuition and analogies included with [Beyond Source Context] tags.'
        : undefined,
      sourceCitations: sections.map(s => ({
        id: `cite-${s.id}`,
        documentId,
        pageNumber: s.pageNumber,
        slideNumber: s.slideNumber,
        sectionTitle: s.title,
        exactQuote: s.content.slice(0, 100),
        contextSnippet: s.content.slice(0, 180)
      }))
    };
  }

  private static async callOpenAI(
    documentId: string,
    prompt: string,
    language: AppLanguage,
    formatType: any,
    difficulty: DifficultyLevel,
    sections: ExtractedSectionRecord[]
  ): Promise<GeneratedFormatResult | null> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.getSystemPrompt(language) },
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
      throw new Error(`OpenAI API error status: ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data?.choices?.[0]?.message?.content;
    if (!textOutput) return null;

    return {
      formatType,
      language,
      difficultyLevel: difficulty,
      content: {
        aiGenerated: true,
        provider: 'GPT-4o-mini',
        text: textOutput
      },
      hasBeyondNotesAnnotation: textOutput.includes('[Beyond Source Context]'),
      additionalContextSummary: textOutput.includes('[Beyond Source Context]')
        ? 'Supplementary intuition and analogies included with [Beyond Source Context] tags.'
        : undefined,
      sourceCitations: sections.map(s => ({
        id: `cite-${s.id}`,
        documentId,
        pageNumber: s.pageNumber,
        slideNumber: s.slideNumber,
        sectionTitle: s.title,
        exactQuote: s.content.slice(0, 100),
        contextSnippet: s.content.slice(0, 180)
      }))
    };
  }
}
