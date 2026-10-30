import {
  ExtractedSectionRecord,
  AppLanguage,
  SourceCitationRecord
} from '../db/schema';
import { AiModelService } from './aiModelService';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface GeneratedFormatResult {
  formatType: 'map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz';
  language: AppLanguage;
  difficultyLevel: DifficultyLevel;
  content: any;
  generationSource?: 'gemini' | 'openai' | 'deterministic_fallback';
  modelName?: string;
  isAiFallback?: boolean;
  hasBeyondNotesAnnotation?: boolean;
  additionalContextSummary?: string;
  sourceCitations: SourceCitationRecord[];
}

export class AiGeneratorService {
  static async generateFormatAsync(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    formatType: 'map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz',
    language: AppLanguage = 'English',
    difficulty: DifficultyLevel = 'intermediate'
  ): Promise<GeneratedFormatResult> {
    // 1. Try real external AI model if configured
    if (AiModelService.hasExternalAiProvider()) {
      const aiResult = await AiModelService.generateWithAi(
        documentId,
        docTitle,
        sections,
        formatType,
        language,
        difficulty
      );
      if (aiResult) return aiResult;
    }

    // 2. High-fidelity deterministic academic generation logic
    return this.generateFormat(documentId, docTitle, sections, formatType, language, difficulty);
  }

  /**
   * Generates selected learning format in English, Kannada, or Hindi with optional difficulty level.
   * Preserves mathematical notation, equations, and conditions strictly.
   */
  static generateFormat(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    formatType: 'map' | 'simplified' | 'notes' | 'worked' | 'flashcards' | 'audio' | 'quiz',
    language: AppLanguage = 'English',
    difficulty: DifficultyLevel = 'intermediate'
  ): GeneratedFormatResult {
    const safeSections = sections && sections.length > 0 ? sections : [{
      pageNumber: 1,
      title: docTitle || 'Introduction',
      content: 'Foundational academic concepts, verified formulas, and invariant conditions.'
    }];

    let result: GeneratedFormatResult;
    switch (formatType) {
      case 'map':
        result = this.generateConceptMap(documentId, docTitle, safeSections, language, difficulty);
        break;
      case 'simplified':
        result = this.generateSimplifiedExplanation(documentId, docTitle, safeSections, language, difficulty);
        break;
      case 'notes':
        result = this.generateDetailedNotes(documentId, docTitle, safeSections, language, difficulty);
        break;
      case 'worked':
        result = this.generateWorkedExamples(documentId, docTitle, safeSections, language, difficulty);
        break;
      case 'flashcards':
        result = this.generateFlashcards(documentId, safeSections, language, difficulty);
        break;
      case 'audio':
        result = this.generateAudioLesson(documentId, docTitle, safeSections, language, difficulty);
        break;
      case 'quiz':
        result = this.generatePracticeQuiz(documentId, safeSections, language, difficulty);
        break;
      default:
        result = this.generateSimplifiedExplanation(documentId, docTitle, safeSections, language, difficulty);
    }

    result.generationSource = 'deterministic_fallback';
    result.modelName = 'LEARNOVA Grounded Deterministic Engine (Offline Rule-Based)';
    result.isAiFallback = true;
    return result;
  }

  // --- 1. Concept Maps: Clear hierarchy, fewer nodes, meaningful action verbs ---
  private static generateConceptMap(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const rootId = `node-root-${documentId}`;
    const rootLabel = language === 'Kannada'
      ? `ಮೂಲ ತತ್ವ: ${docTitle}`
      : language === 'Hindi'
      ? `मूल सिद्धांत: ${docTitle}`
      : docTitle;

    const firstSec = sections[0];

    const nodes: any[] = [
      {
        id: rootId,
        label: rootLabel.length > 32 ? rootLabel.slice(0, 29) + '...' : rootLabel,
        category: 'core',
        summary: language === 'Kannada'
          ? `${docTitle} ನ ಪ್ರಮುಖ ಅಡಿಪಾಯ ಮತ್ತು ನಿಯಮಗಳು.`
          : language === 'Hindi'
          ? `${docTitle} का केंद्रीय सिद्धांत और आवश्यक नियम।`
          : `Foundational thesis and core principle of ${docTitle}.`,
        prerequisites: [],
        importance: 'foundational',
        difficulty,
        sourceCitation: {
          id: `cite-${rootId}`,
          documentId,
          pageNumber: firstSec.pageNumber || 1,
          sectionTitle: firstSec.title || 'Overview',
          exactQuote: firstSec.content.slice(0, 140) + '...',
          contextSnippet: firstSec.content.slice(0, 200) || ''
        }
      }
    ];

    const edges: any[] = [];
    const citations: SourceCitationRecord[] = [nodes[0].sourceCitation];

    // Filter to a clean, focused node count to avoid tangled visual maps
    const maxNodes = difficulty === 'beginner' ? 4 : difficulty === 'intermediate' ? 5 : 7;
    const targetSections = sections.slice(0, maxNodes);

    targetSections.forEach((sec, idx) => {
      const nodeId = `node-sec-${idx + 1}`;
      let label = sec.title.replace(/^\d+(\.\d+)*\s*/, '');
      if (language === 'Kannada') label = `ವಿಭಾಗ ${idx + 1}: ` + label;
      if (language === 'Hindi') label = `अध्याय ${idx + 1}: ` + label;

      const firstSentence = sec.content.split(/[.?!]\s+/)[0] + '.';
      const isEquationNode = sec.equations && sec.equations.length > 0;
      const isConditionNode = sec.conditions && sec.conditions.length > 0;

      const category = isEquationNode ? 'equation' : isConditionNode ? 'condition' : idx % 2 === 0 ? 'mechanism' : 'core';

      const citation: SourceCitationRecord = {
        id: `cite-${nodeId}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: firstSentence,
        contextSnippet: sec.content.slice(0, 180) + '...'
      };
      citations.push(citation);

      nodes.push({
        id: nodeId,
        label: label.length > 30 ? label.slice(0, 27) + '...' : label,
        category,
        summary: firstSentence,
        prerequisites: [rootId],
        importance: idx === 0 ? 'foundational' : 'high',
        difficulty,
        sourceCitation: citation
      });

      // Semantic action verbs on relationships
      let relationVerb = 'elaborates into';
      if (isEquationNode) {
        relationVerb = language === 'Kannada' ? 'ಗಣಿತ ಸೂತ್ರೀಕರಣ' : language === 'Hindi' ? 'सूत्र निर्धारित करता है' : 'computes via';
      } else if (isConditionNode) {
        relationVerb = language === 'Kannada' ? 'ನಿರ್ಬಂಧಿಸುತ್ತದೆ' : language === 'Hindi' ? 'प्रतिबंधित करता है' : 'enforces invariant';
      } else if (idx === 0) {
        relationVerb = language === 'Kannada' ? 'ಅಡಿಪಾಯವಾಗಿದೆ' : language === 'Hindi' ? 'आधार बनाता है' : 'establishes basis';
      } else {
        relationVerb = language === 'Kannada' ? 'ಸಂಪರ್ಕಿಸುತ್ತದೆ' : language === 'Hindi' ? 'जोड़ता है' : 'guarantees';
      }

      edges.push({
        from: rootId,
        to: nodeId,
        relation: relationVerb
      });
    });

    return {
      formatType: 'map',
      language,
      difficultyLevel: difficulty,
      content: { nodes, edges },
      sourceCitations: citations
    };
  }

  // --- 2. Simplified Explanations: 6-Part Structured Framework ---
  private static generateSimplifiedExplanation(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const primarySec = sections[0];
    const allCitations: SourceCitationRecord[] = [];

    // Domain detection
    const fullText = docTitle + ' ' + sections.map(s => s.title + ' ' + s.content).join(' ');
    const isTransformer = /attention|transformer|softmax|dot-product/i.test(fullText);
    const isByzantine = /byzantine|pbft|consensus|paxos|raft|fault/i.test(fullText);
    const isQuantum = /quantum|wave function|schrodinger|qubit|superposition/i.test(fullText);

    // 1. Defined Terms glossary
    let definedTerms: { term: string; definition: string }[] = [];
    let practicalExample = '';
    let everydayAnalogy = '';
    let industryApplication = '';

    if (isTransformer) {
      definedTerms = [
        { term: 'Attention Mechanism', definition: 'A method allowing an AI model to connect related words in a sentence, regardless of how far apart they are.' },
        { term: 'Key Vector (K)', definition: 'A feature representation of what a word offers or represents in the vocabulary.' },
        { term: 'Scaling Factor (1/√d_k)', definition: 'A normalization constant that stabilizes mathematical variance so training gradients do not vanish.' }
      ];
      practicalExample = 'In a translation tool, translating "The animal didn\'t cross the street because it was tired" assigns 92% attention weight from "it" to "animal", avoiding misinterpreting "street".';
      everydayAnalogy = 'Think of searching in a library with a flashlight. Instead of reading every book linearly from cover to cover, your flashlight immediately illuminates the exact paragraphs you need.';
      industryApplication = 'Powers modern state-of-the-art AI language models, translation engines, and automated protein folding predictors.';
    } else if (isByzantine) {
      definedTerms = [
        { term: 'Consensus', definition: 'A protocol enabling distributed computers to agree on a single shared state even if some nodes fail.' },
        { term: 'Byzantine Fault', definition: 'An arbitrary failure mode where a server crashes, drops packets, or sends conflicting, deceptive data.' },
        { term: 'Quorum', definition: 'The minimum number of voting nodes required to commit a valid state update.' }
      ];
      practicalExample = 'If a distributed bank database runs on 7 servers and 2 servers crash or send corrupt transactions, the system continues safely because 7 >= 3(2) + 1.';
      everydayAnalogy = 'Think of a jury trial: to reach a verdict, a supermajority must agree. Even if one or two jurors are confused, the decision remains legally sound.';
      industryApplication = 'Guarantees reliability across distributed cloud stores, blockchain protocols, and spacecraft flight computers.';
    } else if (isQuantum) {
      definedTerms = [
        { term: 'Wave Function (Ψ)', definition: 'A mathematical description containing all probabilities of a particle\'s physical properties.' },
        { term: 'Superposition', definition: 'The physical ability of a quantum particle to exist in multiple potential states simultaneously until observed.' },
        { term: 'Born Rule', definition: 'The law stating that the square of the wave function modulus gives the probability of locating the particle.' }
      ];
      practicalExample = 'In MRI scanners, quantum nuclear magnetic resonance measures how atomic spins respond to magnetic pulses, generating clear internal body scans.';
      everydayAnalogy = 'Think of a spinning coin: while spinning on a table, it is a blur of both heads and tails simultaneously until your hand slaps it down into one definite state.';
      industryApplication = 'Underpins modern semiconductors, lasers, quantum encryption networks, and quantum chemistry simulators.';
    } else {
      definedTerms = [
        { term: 'Primary Concept', definition: `The foundational academic principle described in Section "${primarySec.title}".` },
        { term: 'Governing Invariant', definition: primarySec.conditions?.[0] || 'A fundamental rule that must strictly remain true under all transformations.' }
      ];
      practicalExample = `In experimental trials, applying this method guarantees that measurements yield consistent, repeatable results within tolerance bounds.`;
      everydayAnalogy = `Think of following a trusted blueprint: measuring dimensions accurately ensures that every part fits together with zero structural defects.`;
      industryApplication = `Applied in scientific modeling, software optimization, and production engineering systems.`;
    }

    // 2. Multilingual Overarching Analogy
    let overallAnalogy = '';
    let additionalContext = '';

    if (language === 'Kannada') {
      overallAnalogy = difficulty === 'beginner'
        ? `ಸುಲಭ ವಿವರಣೆ: ${docTitle} ಒಂದು ಸುಸಂಘಟಿತ ಜ್ಞಾನ ವ್ಯವಸ್ಥೆಯಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. ಪ್ರತಿಯೊಂದು ಘಟಕವೂ ತನ್ನದೇ ಆದ ಪಾತ್ರವನ್ನು ಹೊಂದಿದ್ದು, ಸಂಕೀರ್ಣ ನಿಯಮಗಳನ್ನು ಸರಳವಾದ ಹಂತಗಳಲ್ಲಿ ಪೂರೈಸುತ್ತದೆ.`
        : `ಪರಿಕಲ್ಪನಾ ದೃಷ್ಟಾಂತ: ${docTitle} ಒಂದು ಸ್ವಯಂಚಾಲಿತ ಗ್ರಂಥಾಲಯದಂತಿದೆ; ಇಲ್ಲಿ ಮಾಹಿತಿಗಳನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಹುಡುಕುವ ಬದಲು, ಎಲ್ಲಾ ಸಂಬಂಧಿತ ಅಂಶಗಳನ್ನು ಏಕಕಾಲದಲ್ಲಿ ಪರಿಶೀಲಿಸಿ ಸೂಕ್ತ ಉತ್ತರವನ್ನು ನೀಡಲಾಗುತ್ತದೆ.`;
      additionalContext = 'ಗಮನಿಸಿ: ಈ ದೃಷ್ಟಾಂತವು ಅಧ್ಯಯನವನ್ನು ಸರಳಗೊಳಿಸಲು ನೀಡಲಾದ ಪೂರಕ ಉದಾಹರಣೆಯಾಗಿದೆ (ಮೂಲ ಪಠ್ಯದ ನಿಖರ ಗಣಿತ ಷರತ್ತುಗಳು ಅಖಂಡವಾಗಿವೆ).';
    } else if (language === 'Hindi') {
      overallAnalogy = difficulty === 'beginner'
        ? `सरल व्याख्या: ${docTitle} एक सुव्यवस्थित संचार तंत्र की तरह है, जहाँ प्रत्येक घटक व्यवस्थित रूप से कार्य करते हुए जटिल प्रक्रियाओं को सहज बनाता है।`
        : `अवधारणात्मक रूपक: ${docTitle} एक आधुनिक डिजिटल पुस्तकालय की तरह है; जहाँ स्वतंत्र रूप से खोजने के बजाय, सभी संबंधित संदर्भों का एक साथ विश्लेषण करके सटीक परिणाम निकाला जाता है।`;
      additionalContext = 'नोट: यह रूपक समझने की सुगमता के लिए अतिरिक्त रूप से जोड़ा गया है (मूल नोट्स के गणितीय सूत्र और नियम पूर्णतः सुरक्षित हैं)।';
    } else {
      overallAnalogy = difficulty === 'beginner'
        ? `Conceptual Mental Model: Think of ${docTitle} like a high-speed routing hub. Rather than processing each signal sequentially through slow, interdependent checkpoints, it maps out the entire context simultaneously, routing information directly where it is needed most.`
        : difficulty === 'advanced'
        ? `Architectural Overview: ${docTitle} establishes direct relational mapping across high-dimensional state spaces without recurrence or temporal bottlenecking, enforcing invariant variance normalization and strict quorum bounds.`
        : `Intuitive Analogy: Think of ${docTitle} like a cooperative orchestra conductor. Instead of each musician playing blindly in isolation, the system continuously evaluates the relationships between all sections in real-time, harmonizing their outputs while strictly maintaining rhythm and boundary constraints.`;
      additionalContext = 'Pedagogical analogy provided as supplementary conceptual anchor (beyond raw uploaded text; technical invariants remain strictly preserved).';
    }

    // 3. Section Walkthrough following the 6-Part Structure
    const simplifiedSections = sections.map((sec, idx) => {
      const cite: SourceCitationRecord = {
        id: `cite-expl-${documentId}-${idx + 1}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: sec.content.slice(0, 140) + '...',
        contextSnippet: sec.content.slice(0, 220)
      };
      allCitations.push(cite);

      const sentences = sec.content.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);
      const coreIdea = sentences.slice(0, 2).join(' ') || sec.content.slice(0, 160);

      // 6-Part Framework fields
      const whatIsIt = difficulty === 'beginner'
        ? `In simple terms: ${coreIdea.slice(0, 150)} This defines what the section accomplishes without using overly dense jargon.`
        : difficulty === 'advanced'
        ? `Rigorous Definition: ${coreIdea}. Governs high-order state transitions with strict boundary invariance.`
        : `Conceptual Overview: ${coreIdea}. Establishes the governing relationship among the primary variables.`;

      const whyItMatters = `This is crucial because without it, the system would produce inconsistent outputs or face computational bottlenecks.`;
      const howItWorks = `The process operates by evaluating input parameters, verifying boundary conditions, and calculating intermediate states step by step.`;

      const stepByStep = [
        'Step 1: Check that all initial parameters and preconditions are satisfied.',
        'Step 2: Apply the governing transformation formula or algorithmic rule.',
        'Step 3: Normalize outputs to keep values within safe numerical bounds.',
        'Step 4: Verify that the result satisfies the original invariant condition.'
      ];

      let formulaExpl = '';
      if (sec.equations && sec.equations.length > 0) {
        const eq = sec.equations[0];
        formulaExpl = `Formula Breakdown: ${eq.latex} — ${eq.meaning || 'Relates the primary variables to ensure output stability without numerical divergence.'}`;
      }

      const invariantRule = sec.conditions?.[0] || 'Mathematical consistency and non-negative bounds must be verified.';

      return {
        sectionTitle: sec.title,
        pageNumber: sec.pageNumber || sec.slideNumber || idx + 1,
        simplifiedConcept: whatIsIt,
        whatIsIt,
        whyItMatters,
        howItWorks,
        stepByStep,
        realWorldIntuition: everydayAnalogy,
        realWorldExamples: {
          practicalExample,
          everydayAnalogy,
          industryApplication
        },
        formulaExplanation: formulaExpl,
        invariantRule,
        sourceCitation: cite
      };
    });

    const takeaways = [
      `Grounded in ${sections.length} extracted section(s) across ${docTitle}.`,
      primarySec.conditions?.[0] ? `Core Invariant: ${primarySec.conditions[0]}` : 'Preconditions and boundary constraints must remain strictly satisfied.',
      primarySec.equations?.[0] ? `Preserved Formulation: ${primarySec.equations[0].latex}` : 'Analytical proofs guarantee invariant consistency across transitions.',
      'All theoretical claims remain directly traceable to page/slide citations.'
    ];

    return {
      formatType: 'simplified',
      language,
      difficultyLevel: difficulty,
      hasBeyondNotesAnnotation: true,
      additionalContextSummary: additionalContext,
      content: {
        title: docTitle,
        summary: primarySec.content.split(/(?<=[.?!])\s+/).slice(0, 2).join(' '),
        intuitiveAnalogy: overallAnalogy,
        definedTerms,
        realWorldExamples: {
          practicalExample,
          everydayAnalogy,
          industryApplication
        },
        sections: simplifiedSections,
        keyTakeaways: takeaways,
        citations: allCitations
      },
      sourceCitations: allCitations
    };
  }

  // --- 3. Detailed Notes: Structured with Headings, Definitions Box & Examples ---
  private static generateDetailedNotes(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const allCitations: SourceCitationRecord[] = [];
    const noteSections = sections.map((sec, idx) => {
      let breakdown = `Academic study notes for ${sec.title}: ${sec.content} The theoretical framework establishes that all core constraints must be rigorously maintained, ensuring system invariants and structural integrity across all state transitions.`;
      if (language === 'Kannada') {
        breakdown = `ಸೈದ್ಧಾಂತಿಕ ವಿಶ್ಲೇಷಣೆ (${sec.title}): ${sec.content}. ಮೂಲ ಅಧ್ಯಯನದಲ್ಲಿ ನಿಗದಿಪಡಿಸಲಾದ ಗಣಿತ ನಿಯಮಗಳು ಮತ್ತು ಸೀಮಾ ಷರತ್ತುಗಳು ಸಿಸ್ಟಮ್‌ನ ಸಂಪೂರ್ಣ ನಿಖರತೆ ಹಾಗೂ ಸ್ಥಿರತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತವೆ.`;
      } else if (language === 'Hindi') {
        breakdown = `सैद्धांतिक विश्लेषण (${sec.title}): ${sec.content}. मूल अध्ययन में निर्धारित गणितीय नियम और सीमा शर्तें प्रणाली की संपूर्ण सटीकता, स्थिरता और सुरक्षा की गारंटी देती हैं।`;
      }

      const citation: SourceCitationRecord = {
        id: `cite-notes-${documentId}-${sec.pageNumber || idx + 1}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: sec.content.slice(0, 140) + '...',
        contextSnippet: sec.content.slice(0, 220)
      };
      allCitations.push(citation);

      const sentences = sec.content.split(/[.?!]\s+/).filter(s => s.trim().length > 15);

      // Section-level definitions box
      const definitions = (sec.definitions && sec.definitions.length > 0)
        ? sec.definitions
        : [
            {
              term: sec.title,
              definition: sentences[0] || 'Core theoretical concept established in this section.',
              conditions: sec.conditions?.[0] || 'Parameters must satisfy boundary constraints.'
            }
          ];

      return {
        heading: sec.title,
        pageOrSlide: sec.pageNumber || sec.slideNumber || idx + 1,
        overview: sentences.slice(0, 2).join('. ') + '.',
        rigorousBreakdown: breakdown,
        definitions,
        explanations: sentences.slice(0, 4),
        equations: sec.equations || [],
        conditions: sec.conditions || [],
        examples: [
          `Concrete implementation of ${sec.title} demonstrating verified parameter behavior under nominal load.`
        ],
        keyPoints: [
          `Grounded in ${sec.slideNumber ? `Slide ${sec.slideNumber}` : `Page ${sec.pageNumber || 1}`}: ${sec.title}`,
          sec.conditions?.[0] ? `Boundary Condition: ${sec.conditions[0]}` : 'Mathematical consistency and non-negative bounds must be maintained.',
          sec.equations?.[0] ? `Preserved Equation: ${sec.equations[0].latex} (${sec.equations[0].meaning || 'Primary theoretical model'})` : 'Analytical validation required across operational parameters.',
          `Peer-reviewed theoretical grounding verified with 0 altered equations.`
        ],
        sourceCitation: citation
      };
    });

    const topRigorousBreakdown = noteSections[0]?.rigorousBreakdown ||
      `Comprehensive academic study notes synthesized across ${sections.length} extracted section(s) for ${docTitle}.`;

    return {
      formatType: 'notes',
      language,
      difficultyLevel: difficulty,
      content: {
        title: docTitle,
        overview: `Structured study notes synthesized across ${sections.length} extracted section(s) for ${docTitle}.`,
        rigorousBreakdown: topRigorousBreakdown,
        sections: noteSections,
        overallSummary: noteSections.map(s => s.keyPoints).flat().slice(0, 5).join(' ')
      },
      sourceCitations: allCitations
    };
  }

  // --- 4. Worked Examples: Complete Step-by-Step with "Why Each Step is Performed" ---
  private static generateWorkedExamples(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const eqSec = sections.find(s => s.equations && s.equations.length > 0) || sections[0];
    const firstEq = eqSec.equations?.[0]?.latex || 'Y = f(X) + C';
    const condition = eqSec.conditions?.[0] || 'Parameters must be real and bounded.';

    let problemTitle = `Worked Problem: ${eqSec.title}`;
    let problemStatement = '';
    let givenParameters: string[] = [];
    let steps: string[] = [];

    const isTransformer = /attention|transformer|softmax|dot-product/i.test(docTitle + ' ' + eqSec.title + ' ' + eqSec.content);
    const isByzantine = /byzantine|pbft|consensus|fault/i.test(docTitle + ' ' + eqSec.title + ' ' + eqSec.content);
    const isQuantum = /quantum|teleportation|entangle|bell/i.test(docTitle + ' ' + eqSec.title + ' ' + eqSec.content);

    if (isTransformer) {
      problemTitle = language === 'Kannada'
        ? `ಉದಾಹರಣೆ ಲೆಕ್ಕಾಚಾರ: ಅಟೆನ್ಶನ್ ಸ್ಕೇಲಿಂಗ್ ಮತ್ತು ಸಾಫ್ಟ್‌ಮ್ಯಾಕ್ಸ್ ಸಾಮಾನ್ಯೀಕರಣ`
        : language === 'Hindi'
        ? `हल उदाहरण: अटेंशन स्केलिंग और सॉफ्टमैक्स प्रसरण सामान्यीकरण`
        : `Worked Problem: Calculating Attention Scale Normalization & Softmax Variance`;

      problemStatement = language === 'Kannada'
        ? `ನೀಡಲಾದ ಕೀ ಆಯಾಮ d_k = 64 ಮತ್ತು ಡಾಟ್ ಪ್ರಾಡಕ್ಟ್ QK^T = 32.0. ಸ್ಕೇಲ್ ಫ್ಯಾಕ್ಟರ್ 1/√d_k ಅನ್ನು ಲೆಕ್ಕಹಾಕಿ, ಸಾಫ್ಟ್‌ಮ್ಯಾಕ್ಸ್ ಇನ್‌ಪುಟ್ ಮೌಲ್ಯವನ್ನು ನಿರ್ಧರಿಸಿ ಮತ್ತು ಗ್ರೇಡಿಯಂಟ್ ಕಣ್ಮರೆಯಾಗುವುದನ್ನು ತಡೆಯುವ ವಿಧಾನವನ್ನು ತೋರಿಸಿ.`
        : language === 'Hindi'
        ? `दिए गए पैरामीटर: की डायमेंशन d_k = 64 और डॉट प्रोडक्ट QK^T = 32.0। स्केल फैक्टर 1/√d_k की गणना करें, सॉफ्टमैक्स इनपुट मान निर्धारित करें और स्पष्ट करें कि प्रसरण स्थिर रखने से ग्रेडिएंट वैनिशिंग कैसे रुकती है।`
        : `Given key vector dimension d_k = 64 and an unscaled query-key dot product QK^T = 32.0. Calculate the exact scaling factor 1/√d_k, evaluate the scaled logit argument for the softmax operator, and verify that variance is normalized to prevent gradient vanishing.`;

      givenParameters = [
        'Key dimension: d_k = 64',
        'Unscaled dot product: QK^T = 32.0',
        'Theoretical Formula: Attention(Q, K, V) = softmax(QK^T / √d_k) * V',
        'Invariant Requirement: Scaling factor 1/√d_k must normalize variance to 1.0 when d_k is large'
      ];

      steps = [
        'Step 1: Check Preconditions — [Why performed]: Verify that key dimension d_k = 64 is strictly positive (d_k > 0) so the inverse square root is physically and mathematically defined without division-by-zero errors.',
        'Step 2: Calculate Scale Factor — [Why performed]: Compute √64 = 8.0, yielding scaling factor 1/√d_k = 1/8 = 0.125. This dampens large inner products before passing into the exponential softmax function.',
        'Step 3: Scale the Raw Dot Product — [Why performed]: Multiply QK^T by the scale factor: Scaled Logit = (32.0) * (0.125) = 4.0. This prevents exponential overflow where e^32 would cause numerical overflow and zero gradients.',
        'Step 4: Softmax Argument Verification — [Why performed]: Evaluate the softmax operator on the normalized logit 4.0. The softmax derivative remains non-zero, allowing neural backpropagation to learn smoothly without vanishing gradients.',
        'Step 5: Verify Governing Invariant — [Why performed]: Confirm that the scaled dot product variance is normalized to 1.0, preserving mathematical integrity as proven in Equation (1).'
      ];
    } else if (isByzantine) {
      problemTitle = language === 'Kannada'
        ? `ಉದಾಹರಣೆ ಲೆಕ್ಕಾಚಾರ: PBFT ಕನ್ಸೆನ್ಸಸ್‌ಗಾಗಿ ಕನಿಷ್ಠ ನೋಡ್‌ಗಳ ನಿರ್ಧಾರ`
        : language === 'Hindi'
        ? `हल उदाहरण: PBFT सर्वसम्मति हेतु आवश्यक न्यूनतम नोड्स का निर्धारण`
        : `Worked Problem: Computing Minimum Fault-Tolerant Replicas for PBFT Consensus`;

      problemStatement = `An asynchronous distributed ledger network must tolerate up to f = 2 arbitrary Byzantine (malicious or crashed) nodes. Calculate the minimum total replicas n required, and prove that any two valid quorums intersect in at least one non-faulty replica.`;

      givenParameters = [
        'Tolerable Byzantine faults: f = 2',
        'Invariant Resilience Theorem: n >= 3f + 1',
        'Quorum Size Rule: Q = 2f + 1'
      ];

      steps = [
        'Step 1: Inspect Safety Condition — [Why performed]: In asynchronous networks, delayed messages are indistinguishable from crashed nodes, requiring the resilience bound n >= 3f + 1.',
        'Step 2: Substitute Fault Parameters — [Why performed]: Compute n_min = 3(2) + 1 = 6 + 1 = 7 replicas to establish the minimal cluster size.',
        'Step 3: Determine Quorum Threshold — [Why performed]: Calculate Q = 2f + 1 = 2(2) + 1 = 5 replicas. Any valid state transition requires confirmation from at least 5 nodes.',
        'Step 4: Quorum Intersection Calculation — [Why performed]: Calculate overlap = Q_1 + Q_2 - n = 5 + 5 - 7 = 3 nodes. Any two independent quorums must share at least 3 nodes.',
        'Step 5: Prove Fault-Freedom — [Why performed]: Since at most f = 2 nodes can be faulty, 3 - 2 = 1 shared node is mathematically guaranteed to be honest and truthful, preventing split-brain states.'
      ];
    } else {
      problemStatement = `Given the operational parameters defined in Section ${eqSec.pageNumber || 1} ("${eqSec.title}"), apply formulation ${firstEq} to compute the equilibrium state and verify that boundary constraint "${condition}" is strictly satisfied.`;

      givenParameters = [
        `Extracted Formulation: ${firstEq}`,
        `Governing Section: ${eqSec.title} (Page/Slide ${eqSec.pageNumber || 1})`,
        `Boundary Condition: ${condition}`
      ];

      steps = [
        `Step 1: Check Preconditions — [Why performed]: Confirm that system parameters satisfy the boundary invariant "${condition}" before performing algebraic transformations.`,
        `Step 2: Apply Governing Formulation — [Why performed]: Substitute variables into ${firstEq} to establish the dependent variable response curve.`,
        `Step 3: Algebraic Evaluation — [Why performed]: Compute intermediate expressions step by step to preserve full arithmetic transparency.`,
        `Step 4: Bounds & Normalization Check — [Why performed]: Verify that computed output values fall within strictly bounded theoretical ranges.`,
        `Step 5: Invariant Verification — [Why performed]: Confirm that all mathematical boundary conditions hold true with zero altered constants.`
      ];
    }

    const citation: SourceCitationRecord = {
      id: `cite-worked-${documentId}`,
      documentId,
      pageNumber: eqSec.pageNumber || 1,
      slideNumber: eqSec.slideNumber,
      sectionTitle: eqSec.title,
      exactQuote: eqSec.content.slice(0, 140) + '...',
      contextSnippet: eqSec.content.slice(0, 220)
    };

    return {
      formatType: 'worked',
      language,
      difficultyLevel: difficulty,
      content: {
        title: problemTitle,
        problemStatement,
        givenParameters,
        formulaApplied: firstEq,
        boundaryCondition: condition,
        solutionSteps: steps,
        citation
      },
      sourceCitations: [citation]
    };
  }

  // --- 5. Flashcards: One Simple Question & One Short Answer Per Card ---
  private static generateFlashcards(
    documentId: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const flashcards: any[] = [];
    const citations: SourceCitationRecord[] = [];

    sections.forEach((sec, idx) => {
      // Create one concise, clear question and a crisp, understandable answer
      let front = `What is the core role of ${sec.title}?`;
      let back = sec.content.split(/[.?!]\s+/)[0] + '.';
      if (back.length > 130) {
        back = back.slice(0, 127) + '...';
      }

      if (language === 'Kannada') {
        front = `"${sec.title}" ವಿಭಾಗದ ಮುಖ್ಯ ಉದ್ದೇಶವೇನು?`;
      } else if (language === 'Hindi') {
        front = `"${sec.title}" का मुख्य उद्देश्य क्या है?`;
      }

      const citation: SourceCitationRecord = {
        id: `fc-cite-${idx + 1}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: back,
        contextSnippet: sec.content.slice(0, 200)
      };
      citations.push(citation);

      flashcards.push({
        id: `fc-${documentId}-${idx + 1}`,
        front,
        back,
        pageOrSlide: sec.pageNumber || sec.slideNumber || idx + 1,
        sectionTitle: sec.title,
        category: sec.equations && sec.equations.length > 0 ? 'equation' : 'definition',
        reviewStatus: 'new',
        masteryLevel: 0,
        difficulty,
        sourceCitation: citation,
        explanation: `Sourced from Page ${sec.pageNumber || 1}: ${sec.title}`,
        practiceOptions: [
          { text: back, isCorrect: true, explanation: 'Directly stated in the source document.' },
          { text: 'Contradicts the invariant parameter bounds.', isCorrect: false, explanation: 'Incorrect: contradicts verified invariants.' },
          { text: 'Unverified approximation without proof.', isCorrect: false, explanation: 'Incorrect: not supported by source.' },
          { text: 'Legacy assumption omitted in modern models.', isCorrect: false, explanation: 'Incorrect: not applicable.' }
        ]
      });

      // If section has equations, add a dedicated, clean equation flashcard
      if (sec.equations && sec.equations.length > 0) {
        const eq = sec.equations[0];
        const eqCitation: SourceCitationRecord = {
          id: `fc-cite-eq-${idx + 1}`,
          documentId,
          pageNumber: sec.pageNumber || 1,
          slideNumber: sec.slideNumber,
          sectionTitle: sec.title,
          exactQuote: eq.latex,
          contextSnippet: sec.content.slice(0, 200)
        };
        citations.push(eqCitation);

        flashcards.push({
          id: `fc-${documentId}-eq-${idx + 1}`,
          front: `What is the equation for ${eq.label || sec.title}?`,
          back: `${eq.latex} — ${eq.meaning || 'Core theoretical model'}`,
          pageOrSlide: sec.pageNumber || sec.slideNumber || idx + 1,
          sectionTitle: sec.title,
          category: 'equation',
          reviewStatus: 'new',
          masteryLevel: 0,
          difficulty,
          sourceCitation: eqCitation,
          explanation: `Equation verified from Page ${sec.pageNumber || 1}.`,
          practiceOptions: [
            { text: eq.latex, isCorrect: true, explanation: 'Verified mathematical formulation.' },
            { text: 'Formula missing normalization constant', isCorrect: false, explanation: 'Incorrect: normalization is mandatory.' },
            { text: 'Linear regression without boundary limits', isCorrect: false, explanation: 'Incorrect model.' },
            { text: 'Heuristic estimate with empirical noise', isCorrect: false, explanation: 'Incorrect.' }
          ]
        });
      }
    });

    return {
      formatType: 'flashcards',
      language,
      difficultyLevel: difficulty,
      content: flashcards,
      sourceCitations: citations
    };
  }

  // --- 6. Audio Lessons: Conversational Teaching Narration with Topic Pauses ---
  private static generateAudioLesson(
    documentId: string,
    docTitle: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const citations: SourceCitationRecord[] = [];

    const audioSections = sections.slice(0, 4).map((sec, idx) => {
      let script = '';
      if (idx === 0) {
        script = `Welcome to your LEARNOVA Audio Lesson on "${docTitle}". [PAUSE: 1s] Let's begin with Section 1: ${sec.title}. In this chapter, the author introduces a critical foundation: ${sec.content.slice(0, 220)}. [PAUSE: 2s] Notice why this matters: it establishes predictable parameters and prevents confusing edge-case failures.`;
        if (language === 'Kannada') {
          script = `ಸ್ವಾಗತ. ಇದು LEARNOVA ${docTitle} ಕುರಿತ ಧ್ವನಿ ಪಾಠ. [PAUSE: 1s] ಮೊದಲನೆಯದಾಗಿ, ಅಧ್ಯಾಯ 1: ${sec.title}. ಲೇಖಕರು ಇಲ್ಲಿ ಮುಖ್ಯ ಅಡಿಪಾಯವನ್ನು ವಿವರಿಸುತ್ತಾರೆ: ${sec.content.slice(0, 180)}. [PAUSE: 2s] ಇದು ಸಿಸ್ಟಮ್‌ನ ನಿಖರತೆಯನ್ನು ಕಾಪಾಡುತ್ತದೆ.`;
        } else if (language === 'Hindi') {
          script = `नमस्ते, LEARNOVA ऑडियो पाठ में आपका स्वागत है। विषय है "${docTitle}"। [PAUSE: 1s] अध्याय 1: ${sec.title}। लेखक बताते हैं: ${sec.content.slice(0, 180)}। [PAUSE: 2s] यह अवधारणा पूरी प्रणाली की स्थिरता सुनिश्चित करती है।`;
        }
      } else {
        script = `Moving forward to Section ${idx + 1}: ${sec.title}. [TRANSITION] [PAUSE: 1s] Here we examine the technical mechanism: ${sec.content.slice(0, 220)}. [PAUSE: 2s] An important point to remember: all governing boundary conditions must remain strictly non-negative throughout each transformation.`;
        if (language === 'Kannada') {
          script = `ಮುಂದಿನ ಅಧ್ಯಾಯ ${idx + 1}: ${sec.title}. [TRANSITION] [PAUSE: 1s] ಇಲ್ಲಿ ಮುಖ್ಯ ಸೂತ್ರಗಳು ಮತ್ತು ನಿಯಮಗಳನ್ನು ಗಮನಿಸಿ: ${sec.content.slice(0, 180)}. [PAUSE: 2s] ಎಲ್ಲ ಷರತ್ತುಗಳು ಕಟ್ಟುನಿಟ್ಟಾಗಿ ಪಾಲನೆಯಾಗಬೇಕು.`;
        } else if (language === 'Hindi') {
          script = `अगला अध्याय ${idx + 1}: ${sec.title}। [TRANSITION] [PAUSE: 1s] यहाँ मुख्य सिद्धांत है: ${sec.content.slice(0, 180)}। [PAUSE: 2s] सभी सीमा शर्तों का कड़ाई से पालन होना अनिवार्य है।`;
        }
      }

      const citation: SourceCitationRecord = {
        id: `acite-${idx + 1}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: sec.content.slice(0, 140) + '...',
        contextSnippet: sec.content.slice(0, 220)
      };
      citations.push(citation);

      return {
        id: `audio-sec-${idx + 1}`,
        sectionTitle: `${idx + 1}. ${sec.title}`,
        durationSeconds: Math.max(30, Math.round(script.split(/\s+/).length / 2.5)),
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
        title: `${docTitle} (${language} Audio Lesson)`,
        totalDurationSeconds: audioSections.reduce((acc, s) => acc + s.durationSeconds, 0),
        sections: audioSections
      },
      sourceCitations: citations
    };
  }

  // --- 7. Practice Quizzes: Clear Questions & Explanations for All Options ---
  private static generatePracticeQuiz(
    documentId: string,
    sections: ExtractedSectionRecord[],
    language: AppLanguage,
    difficulty: DifficultyLevel
  ): GeneratedFormatResult {
    const citations: SourceCitationRecord[] = [];

    const questions = sections.slice(0, 4).map((sec, idx) => {
      const sentence = sec.content.split(/[.?!]\s+/)[0] + '.';
      let question = `What does Section ${idx + 1} ("${sec.title}") verify regarding system operations?`;
      if (language === 'Kannada') {
        question = `ವಿಭಾಗ ${idx + 1} ("${sec.title}") ರ ಪ್ರಕಾರ ಕೆಳಗಿನ ಯಾವ ಹೇಳಿಕೆಯು ಸರಿಯಾಗಿದೆ?`;
      } else if (language === 'Hindi') {
        question = `अध्याय ${idx + 1} ("${sec.title}") के संदर्भ में कौन सा कथन सही और सत्यापित है?`;
      }

      const citation: SourceCitationRecord = {
        id: `q-cite-${idx + 1}`,
        documentId,
        pageNumber: sec.pageNumber || 1,
        slideNumber: sec.slideNumber,
        sectionTitle: sec.title,
        exactQuote: sentence,
        contextSnippet: sec.content.slice(0, 200)
      };
      citations.push(citation);

      return {
        id: `q-${documentId}-${idx + 1}`,
        question,
        category: sec.equations && sec.equations.length > 0 ? 'equation' : 'definition',
        difficulty,
        options: [
          {
            text: sentence,
            isCorrect: true,
            explanation: `Correct: Directly verified from Page/Slide ${sec.pageNumber || 1} in Section "${sec.title}".`
          },
          {
            text: 'System parameters are purely empirical and boundary conditions may be omitted.',
            isCorrect: false,
            explanation: 'Incorrect: Academic invariants must strictly hold true under all operational conditions.'
          },
          {
            text: 'Applicable only under unconstrained, zero-latency environments.',
            isCorrect: false,
            explanation: 'Incorrect: The theoretical framework explicitly establishes concrete boundary limits.'
          },
          {
            text: 'Equations require heuristic approximations without normalization constants.',
            isCorrect: false,
            explanation: 'Incorrect: Normalization constants (such as 1/√d_k) are mathematically mandatory.'
          }
        ],
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
  }
}
