import { AcademicDocument, SemanticSearchResult, SourceCitation } from '../types';

export class SemanticSearchService {
  private static SYNONYM_MAP: Record<string, string[]> = {
    'memory': ['malloc', 'heap', 'stack', 'ram', 'allocation', 'paging', 'virtual memory', 'buffer'],
    'allocate': ['malloc', 'calloc', 'reserve', 'assign', 'provision', 'partition'],
    'speed': ['throughput', 'latency', 'velocity', 'rate', 'performance', 'delay'],
    'error': ['fault', 'exception', 'invariance violation', 'divergence', 'overflow', 'underflow'],
    'formula': ['equation', 'formulation', 'derivation', 'theorem', 'identity'],
    'diagram': ['schematic', 'figure', 'architecture', 'flowchart', 'illustration'],
    'compare': ['difference', 'distinction', 'contrast', 'tradeoff', 'versus'],
    'safety': ['invariant', 'boundary', 'constraint', 'precondition', 'verification']
  };

  /**
   * Performs semantic meaning-based search over one or more documents
   */
  public static search(documents: AcademicDocument[], query: string): SemanticSearchResult[] {
    const qTrim = query.trim().toLowerCase();
    if (!qTrim) return [];

    const queryTokens = qTrim.split(/\s+/).filter(t => t.length > 2);
    // Expand tokens with semantic synonyms
    const expandedKeywords = new Set<string>(queryTokens);
    for (const token of queryTokens) {
      for (const [key, syns] of Object.entries(this.SYNONYM_MAP)) {
        if (token.includes(key) || key.includes(token)) {
          syns.forEach(s => expandedKeywords.add(s));
        }
        for (const s of syns) {
          if (token.includes(s) || s.includes(token)) {
            expandedKeywords.add(key);
            syns.forEach(syn => expandedKeywords.add(syn));
          }
        }
      }
    }

    const results: SemanticSearchResult[] = [];

    for (const doc of documents) {
      const sections = doc.sections || [];
      for (const sec of sections) {
        const textToSearch = `${sec.title} ${sec.content} ${sec.equations?.map(e => `${e.latex} ${e.label} ${e.meaning}`).join(' ') || ''}`.toLowerCase();

        let directHits = 0;
        let semanticHits = 0;
        const matchedConcepts: string[] = [];

        for (const token of queryTokens) {
          if (textToSearch.includes(token)) {
            directHits++;
            matchedConcepts.push(token);
          }
        }

        for (const exp of expandedKeywords) {
          if (!queryTokens.includes(exp) && textToSearch.includes(exp)) {
            semanticHits++;
            matchedConcepts.push(exp);
          }
        }

        const totalScore = Math.min(100, (directHits * 35) + (semanticHits * 15) + (directHits > 0 ? 30 : 0));

        if (totalScore >= 20 || directHits > 0) {
          const pageNum = sec.pageNumber || 1;
          const citation: SourceCitation = {
            id: `search-cite-${doc.id}-${sec.id}`,
            documentId: doc.id,
            pageNumber: pageNum,
            sectionTitle: sec.title,
            exactQuote: sec.content.slice(0, 160),
            contextSnippet: sec.content.slice(0, 240)
          };

          let relevanceReason = '';
          if (directHits > 0 && semanticHits > 0) {
            relevanceReason = `Direct match on query terms with related concepts: "${Array.from(new Set(matchedConcepts)).slice(0, 4).join(', ')}"`;
          } else if (directHits > 0) {
            relevanceReason = `Exact conceptual match on: "${Array.from(new Set(matchedConcepts)).slice(0, 3).join(', ')}"`;
          } else {
            relevanceReason = `Semantic synonym match (inferred meaning): "${Array.from(new Set(matchedConcepts)).slice(0, 4).join(', ')}"`;
          }

          results.push({
            id: `res-${doc.id}-${sec.id}`,
            documentId: doc.id,
            documentTitle: doc.title,
            pageNumber: pageNum,
            sectionTitle: sec.title,
            matchedText: sec.content.slice(0, 200) + '...',
            relevanceScore: totalScore,
            relevanceReason,
            matchedConcepts: Array.from(new Set(matchedConcepts)),
            citation
          });
        }
      }
    }

    // Sort by relevance score descending
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
