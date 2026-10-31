import { DocumentBatchProgress } from '../types';

export interface CompletenessVerificationResult {
  isFullyComplete: boolean;
  expectedPageCount: number;
  verifiedPageCount: number;
  missingPages: number[];
  unreadablePages: number[];
  verdict: 'completed' | 'warning' | 'failed';
  statusMessage: string;
}

export class BatchProcessingEngine {
  public static DEFAULT_BATCH_SIZE = 10;
  public static MAX_PAGE_RETRIES = 2;

  public static initProgress(totalPages: number, batchSize = this.DEFAULT_BATCH_SIZE): DocumentBatchProgress {
    const totalBatches = Math.max(1, Math.ceil(totalPages / batchSize));
    const pageStatuses: Record<number, 'success' | 'processing' | 'failed' | 'unreadable'> = {};
    for (let p = 1; p <= totalPages; p++) {
      pageStatuses[p] = 'processing';
    }

    return {
      totalPagesOrSlides: totalPages,
      successfullyProcessedPages: 0,
      pagesCurrentlyProcessing: [],
      failedPages: [],
      remainingPages: totalPages,
      overallCompletionPercentage: 0,
      batchSize,
      currentBatchIndex: 0,
      totalBatches,
      isComplete: false,
      statusMessage: `Initialized batch processing plan for ${totalPages} pages in ${totalBatches} batch(es).`,
      pageStatuses
    };
  }

  public static createBatches(totalPages: number, batchSize = this.DEFAULT_BATCH_SIZE): number[][] {
    const batches: number[][] = [];
    for (let i = 1; i <= totalPages; i += batchSize) {
      const batch: number[] = [];
      for (let p = i; p < Math.min(totalPages + 1, i + batchSize); p++) {
        batch.push(p);
      }
      batches.push(batch);
    }
    return batches;
  }

  public static updateBatchProgress(
    current: DocumentBatchProgress,
    batchIndex: number,
    processedPages: number[],
    failedPages: number[] = [],
    unreadablePages: number[] = []
  ): DocumentBatchProgress {
    const newlyProcessed = processedPages.length;
    const totalProcessed = Math.min(current.totalPagesOrSlides, current.successfullyProcessedPages + newlyProcessed);
    const allFailed = [...new Set([...current.failedPages, ...failedPages])];
    const allUnreadable = [...new Set([...(current.unreadablePages || []), ...unreadablePages])];
    const remaining = Math.max(0, current.totalPagesOrSlides - totalProcessed);
    const overallPct = Math.min(100, Math.round((totalProcessed / current.totalPagesOrSlides) * 100));
    const nextBatch = Math.min(current.totalBatches, batchIndex + 1);

    return {
      ...current,
      successfullyProcessedPages: totalProcessed,
      remainingPages: remaining,
      overallCompletionPercentage: overallPct,
      currentBatchIndex: nextBatch,
      failedPages: allFailed,
      unreadablePages: allUnreadable,
      isComplete: remaining === 0,
      statusMessage: remaining === 0
        ? 'All document pages and slides verified complete.'
        : `Processed batch ${batchIndex} of ${current.totalBatches} (${totalProcessed}/${current.totalPagesOrSlides} pages complete)...`
    };
  }

  public static verifyCompleteness(
    expectedPageCount: number,
    processedSections: { pageNumber?: number; slideNumber?: number }[],
    knownUnreadablePages: number[] = [],
    failedPages: number[] = []
  ): CompletenessVerificationResult {
    const presentPageSet = new Set<number>();
    processedSections.forEach(s => {
      const p = s.pageNumber || s.slideNumber;
      if (p !== undefined) presentPageSet.add(p);
    });

    const unreadableSet = new Set<number>(knownUnreadablePages);
    const failedSet = new Set<number>(failedPages);

    const missingPages: number[] = [];
    for (let p = 1; p <= expectedPageCount; p++) {
      if (!presentPageSet.has(p) && !unreadableSet.has(p) && !failedSet.has(p)) {
        missingPages.push(p);
      }
    }

    let verifiedPageCount = 0;
    for (let p = 1; p <= expectedPageCount; p++) {
      if (presentPageSet.has(p) || unreadableSet.has(p) || failedSet.has(p)) {
        verifiedPageCount++;
      }
    }

    let verdict: CompletenessVerificationResult['verdict'] = 'completed';
    let statusMessage = `Verified 100% complete: All ${expectedPageCount} pages and slides have been successfully extracted in sequence.`;

    if (missingPages.length > 0 || failedPages.length > 0) {
      verdict = 'failed';
      statusMessage = `Document processing incomplete: ${missingPages.length} missing page(s) [${missingPages.join(', ')}] and ${failedPages.length} failed page(s) [${failedPages.join(', ')}].`;
    } else if (knownUnreadablePages.length > 0) {
      verdict = 'warning';
      statusMessage = `Document processed with warnings: ${knownUnreadablePages.length} unreadable/low-contrast page(s) identified on [${knownUnreadablePages.join(', ')}].`;
    }

    const isFullyComplete = verdict === 'completed' && verifiedPageCount === expectedPageCount;

    return {
      isFullyComplete,
      expectedPageCount,
      verifiedPageCount,
      missingPages,
      unreadablePages: knownUnreadablePages,
      verdict,
      statusMessage
    };
  }
}
