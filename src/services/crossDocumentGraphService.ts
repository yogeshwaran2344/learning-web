import { AcademicDocument, CrossDocumentKnowledgeGraphData, CrossDocGraphNode, CrossDocGraphEdge } from '../types';

export class CrossDocumentGraphService {
  /**
   * Builds an interconnected cross-document knowledge graph across all documents in the user's library
   */
  public static buildCrossDocGraph(documents: AcademicDocument[]): CrossDocumentKnowledgeGraphData {
    const nodes: CrossDocGraphNode[] = [];
    const edges: CrossDocGraphEdge[] = [];
    const documentsCovered: { id: string; title: string; count: number }[] = [];

    const categoryColorMap: Record<string, string> = {
      'computer science': '#38bdf8',
      'medicine': '#f43f5e',
      'biology': '#10b981',
      'mathematics': '#818cf8',
      'physics': '#fbbf24',
      'humanities': '#ec4899',
      'economics': '#a855f7'
    };

    documents.forEach((doc, docIdx) => {
      const sections = doc.sections || [];
      let docNodeCount = 0;

      sections.forEach((sec, sIdx) => {
        const nodeId = `cross-node-${doc.id}-${sec.id || sIdx}`;
        nodes.push({
          id: nodeId,
          documentId: doc.id,
          documentTitle: doc.title,
          label: sec.title,
          category: doc.category,
          pageNumber: sec.pageNumber || 1,
          summary: sec.content.slice(0, 160) + '...',
          citation: {
            id: `cite-${nodeId}`,
            documentId: doc.id,
            pageNumber: sec.pageNumber || 1,
            sectionTitle: sec.title,
            exactQuote: sec.content.slice(0, 120),
            contextSnippet: sec.content.slice(0, 180)
          }
        });
        docNodeCount++;
      });

      documentsCovered.push({
        id: doc.id,
        title: doc.title,
        count: docNodeCount
      });
    });

    // Create intra-document and inter-document conceptual edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        // If same document, create sequential or structural prerequisite link
        if (nodeA.documentId === nodeB.documentId) {
          if (Math.abs(nodeA.pageNumber - nodeB.pageNumber) === 1 || j === i + 1) {
            edges.push({
              id: `edge-${nodeA.id}-${nodeB.id}`,
              sourceId: nodeA.id,
              targetId: nodeB.id,
              relationshipType: 'prerequisite',
              label: 'Prerequisite for',
              description: `Foundational topic preceding "${nodeB.label}" in ${nodeA.documentTitle}.`
            });
          }
        } else {
          // Cross-document conceptual connection
          const wordsA = nodeA.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const wordsB = nodeB.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const common = wordsA.filter(w => wordsB.includes(w));

          if (common.length > 0 || nodeA.category === nodeB.category) {
            edges.push({
              id: `cross-edge-${nodeA.id}-${nodeB.id}`,
              sourceId: nodeA.id,
              targetId: nodeB.id,
              relationshipType: common.length > 0 ? 'shares_formula' : 'applies',
              label: common.length > 0 ? 'Shared Concept' : 'Cross-Disciplinary Bridge',
              description: `Connects "${nodeA.label}" (${nodeA.documentTitle}) with "${nodeB.label}" (${nodeB.documentTitle}).`
            });
          }
        }
      }
    }

    return {
      nodes,
      edges,
      documentsCovered
    };
  }
}
