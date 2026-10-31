export interface BatchPageItem {
  pageNumber: number;
  slideNumber?: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'unreadable';
  attempts: number;
  error?: string;
}

export interface DocumentBatchProgress {
  totalPagesOrSlides: number;
  successfullyProcessedPages: number;
  pagesCurrentlyProcessing: number[];
  failedPages: number[];
  remainingPages: number;
  overallCompletionPercentage: number;
  batchSize: number;
  currentBatchIndex: number;
  totalBatches: number;
  isComplete: boolean;
  statusMessage: string;
  unreadablePages?: number[];
  pageStatuses?: Record<number, 'success' | 'processing' | 'failed' | 'unreadable'>;
}

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

  /**
   * Initializes a batch progress state for a document
   */
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

  /**
   * Divide total pages into sequential batches
   */
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

  /**
   * Updates batch progress state incrementally as batches complete
   */
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

  /**
   * Process a sequence of page batches with progress updates and failure retries
   */
  public static async processAllBatches<T>(
    totalPages: number,
    processBatchFn: (pageBatch: number[], batchIndex: number) => Promise<{ results: T[]; failedPages?: number[]; unreadablePages?: number[] }>,
    onProgress?: (progress: DocumentBatchProgress) => void,
    batchSize = this.DEFAULT_BATCH_SIZE
  ): Promise<{ allResults: T[]; finalProgress: DocumentBatchProgress; completeness: CompletenessVerificationResult }> {
    const batches = this.createBatches(totalPages, batchSize);
    const progress = this.initProgress(totalPages, batchSize);

    const allResults: T[] = [];
    const allUnreadable: number[] = [];
    const allFailed: number[] = [];

    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      const currentBatch = batches[bIdx];
      progress.currentBatchIndex = bIdx + 1;
      progress.pagesCurrentlyProcessing = [...currentBatch];
      progress.statusMessage = `Processing batch ${bIdx + 1} of ${batches.length} (Pages ${currentBatch[0]}–${currentBatch[currentBatch.length - 1]})...`;

      if (onProgress) onProgress({ ...progress });

      let batchSuccess = false;
      let attempts = 0;

      while (!batchSuccess && attempts <= this.MAX_PAGE_RETRIES) {
        attempts++;
        try {
          const res = await processBatchFn(currentBatch, bIdx);
          allResults.push(...res.results);

          if (res.unreadablePages && res.unreadablePages.length > 0) {
            allUnreadable.push(...res.unreadablePages);
            res.unreadablePages.forEach(p => {
              if (progress.pageStatuses) progress.pageStatuses[p] = 'unreadable';
            });
          }

          const successPages = currentBatch.filter(p => !res.failedPages?.includes(p) && !res.unreadablePages?.includes(p));
          successPages.forEach(p => {
            if (progress.pageStatuses) progress.pageStatuses[p] = 'success';
          });

          progress.successfullyProcessedPages += successPages.length;
          batchSuccess = true;
        } catch (batchErr: any) {
          if (attempts > this.MAX_PAGE_RETRIES) {
            allFailed.push(...currentBatch);
            currentBatch.forEach(p => {
              if (progress.pageStatuses) progress.pageStatuses[p] = 'failed';
            });
          }
        }
      }

      progress.pagesCurrentlyProcessing = [];
      progress.remainingPages = Math.max(0, totalPages - (progress.successfullyProcessedPages + allFailed.length + allUnreadable.length));
      progress.overallCompletionPercentage = Math.round(
        ((progress.successfullyProcessedPages + allUnreadable.length + allFailed.length) / totalPages) * 100
      );
      progress.failedPages = [...allFailed];
      progress.unreadablePages = [...allUnreadable];

      if (onProgress) onProgress({ ...progress });
    }

    // Verify completeness across entire document
    const completeness = this.verifyCompleteness(totalPages, allResults as any, allUnreadable, allFailed);
    progress.isComplete = completeness.isFullyComplete;
    progress.statusMessage = completeness.statusMessage;

    return {
      allResults,
      finalProgress: progress,
      completeness
    };
  }

  /**
   * Verify document completeness before marking as complete:
   * 1. Compares original page count with processed page count.
   * 2. Verifies that every single page (1 through N) has an extraction status.
   * 3. Identifies missing or unreadable pages.
   * 4. NEVER marks an incomplete document as fully processed.
   */
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

    const verifiedPageCount = presentPageCount(presentPageSet, unreadableSet, failedSet, expectedPageCount);

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

function presentPageCount(present: Set<number>, unreadable: Set<number>, failed: Set<number>, total: number): number {
  let count = 0;
  for (let p = 1; p <= total; p++) {
    if (present.has(p) || unreadable.has(p) || failed.has(p)) count++;
  }
  return count;
}
