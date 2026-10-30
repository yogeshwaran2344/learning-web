import { AcademicDocument } from '../types';

export const SAMPLE_DOCUMENTS: AcademicDocument[] = [
  {
    id: 'doc-transformer-attention',
    title: 'Attention Is All You Need',
    author: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, et al. (Google Brain & Research)',
    institution: 'Google Research / NeurIPS 2017',
    year: '2017',
    fileType: 'pdf',
    fileSizeMb: 2.4,
    category: 'Computer Science',
    uploadDate: '2026-10-24',
    pageCount: 15,
    wordCount: 5420,
    summary: 'Proposes the Transformer network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Achieves superior translation quality while being more parallelizable and requiring significantly less training time.',
    processingStatus: 'ready',
    lastStudiedAt: '2 hours ago',
    studyProgressPercent: 78,
    sections: [
      {
        id: 'sec-intro',
        pageNumber: 1,
        chapterTitle: '1. Introduction',
        title: 'Recurrent Models vs. Self-Attention',
        content: `Recurrent neural networks, long short-term memory (LSTM) and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems. Recurrent models inherently factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} and the input for position t.

This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples. Attention mechanisms have become an integral part of compelling sequence modeling, allowing modeling of dependencies without regard to their distance in the input or output sequences.`,
        definitions: [
          {
            term: 'Sequential Computation Bottleneck',
            definition: 'The constraint in recurrent networks where step t requires the result of step t-1, preventing GPU parallel processing across the sequence length.'
          }
        ],
        conditions: [
          'Computation cannot proceed in parallel across sequence positions in standard RNNs.',
          'Memory constraints severely limit batch size at longer sequence lengths.'
        ]
      },
      {
        id: 'sec-scaled-dot-product',
        pageNumber: 3,
        chapterTitle: '3. Model Architecture',
        title: '3.2.1 Scaled Dot-Product Attention',
        content: `We call our particular attention 'Scaled Dot-Product Attention'. The input consists of queries and keys of dimension d_k, and values of dimension d_v. We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function to obtain the weights on the values.

In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed into matrices K and V.

We compute the matrix of outputs as:
Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V

The two most commonly used attention functions are additive attention and dot-product (multiplicative) attention. Dot-product attention is identical to our algorithm, except for the scaling factor of 1 / sqrt(d_k). Additive attention computes the compatibility function using a feed-forward network with a single hidden layer. While the two are similar in theoretical complexity, dot-product attention is much faster and more space-efficient in practice, because it can be implemented using highly optimized matrix multiplication code.

We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).`,
        equations: [
          {
            latex: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
            label: 'Equation (1)',
            meaning: 'Computes matrix product of queries Q and transposed keys K, scaled by inverse square root of key dimension d_k, normalized via softmax, multiplied by value matrix V.'
          }
        ],
        conditions: [
          'Keys and queries must share identical dimensionality d_k.',
          'Scaling factor 1 / sqrt(d_k) is mandatory when d_k is large to prevent vanishing softmax gradients.',
          'Input queries, keys, and values must be packed into matrices Q, K, and V for GPU batch matrix multiplication.'
        ],
        examples: [
          'If d_k = 64, sqrt(d_k) = 8. A raw dot product of 96 scales down to 12 before softmax, avoiding numerical saturation.'
        ]
      },
      {
        id: 'sec-multihead',
        pageNumber: 4,
        chapterTitle: '3. Model Architecture',
        title: '3.2.2 Multi-Head Attention',
        content: `Instead of performing a single attention function with d_model-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to d_k, d_k and d_v dimensions, respectively.

On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding d_v-dimensional output values. These are concatenated and once again projected, resulting in the final values:

MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W^O
where head_i = Attention(Q * W_i^Q, K * W_i^K, V * W_i^V)

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.`,
        equations: [
          {
            latex: '\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O',
            label: 'Equation (2)',
            meaning: 'Projects inputs across h attention heads in parallel subspaces, concatenates the resulting vectors, and applies output linear projection W^O.'
          }
        ],
        definitions: [
          {
            term: 'Multi-Head Attention',
            definition: 'Parallel execution of h distinct scaled dot-product attention operations across projected lower-dimensional subspaces, concatenating outputs to capture distinct syntactic and semantic relationships.'
          }
        ]
      },
      {
        id: 'sec-positional-encoding',
        pageNumber: 6,
        chapterTitle: '3. Model Architecture',
        title: '3.5 Positional Encoding',
        content: `Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add 'positional encodings' to the input embeddings at the bottoms of the encoder and decoder stacks.

In this work, we use sine and cosine functions of different frequencies:
PE_{(pos, 2i)} = sin(pos / 10000^{2i / d_{model}})
PE_{(pos, 2i+1)} = cos(pos / 10000^{2i / d_{model}})

where pos is the position and i is the dimension. That is, each dimension of the positional encoding corresponds to a sinusoid. The wavelengths form a geometric progression from 2*pi to 10000 * 2*pi. We chose this version because it may allow the model to easily learn to attend by relative positions, since for any fixed offset k, PE_{pos+k} can be represented as a linear function of PE_{pos}.`,
        equations: [
          {
            latex: 'PE_{(pos, 2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d_{\\text{model}}}}\\right)',
            label: 'Equation (3)',
            meaning: 'Sinusoidal encoding for even dimensions at sequence index pos.'
          },
          {
            latex: 'PE_{(pos, 2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d_{\\text{model}}}}\\right)',
            label: 'Equation (4)',
            meaning: 'Cosines encoding for odd dimensions at sequence index pos.'
          }
        ],
        conditions: [
          'Positional encodings must share the exact dimension d_model with token embeddings so they can be summed directly.'
        ]
      }
    ],
    conceptMap: {
      nodes: [
        {
          id: 'node-self-attn',
          label: 'Self-Attention',
          category: 'core',
          summary: 'Mechanism computing relevance weights between every pair of positions in a sequence without recurrence.',
          prerequisites: [],
          importance: 'foundational',
          sourceCitation: {
            id: 'cite-sa',
            documentId: 'doc-transformer-attention',
            pageNumber: 3,
            sectionTitle: '3.2.1 Scaled Dot-Product Attention',
            exactQuote: 'We call our particular attention Scaled Dot-Product Attention. The input consists of queries and keys of dimension d_k, and values of dimension d_v.',
            contextSnippet: 'Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V'
          }
        },
        {
          id: 'node-scaling-factor',
          label: 'Scaling Factor (1 / √d_k)',
          category: 'condition',
          summary: 'Divisor that prevents dot products from growing excessively large, preserving non-zero softmax gradients.',
          prerequisites: ['node-self-attn'],
          importance: 'high',
          sourceCitation: {
            id: 'cite-sf',
            documentId: 'doc-transformer-attention',
            pageNumber: 3,
            sectionTitle: '3.2.1 Scaled Dot-Product Attention',
            exactQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).',
            contextSnippet: 'While two are similar in theoretical complexity... scale by 1 / sqrt(d_k).'
          }
        },
        {
          id: 'node-multihead',
          label: 'Multi-Head Projection',
          category: 'mechanism',
          summary: 'Runs h parallel attention heads across projected subspaces, preventing single-head averaging collapse.',
          prerequisites: ['node-self-attn', 'node-scaling-factor'],
          importance: 'high',
          sourceCitation: {
            id: 'cite-mh',
            documentId: 'doc-transformer-attention',
            pageNumber: 4,
            sectionTitle: '3.2.2 Multi-Head Attention',
            exactQuote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.',
            contextSnippet: 'MultiHead(Q,K,V) = Concat(head_1, ..., head_h) * W^O'
          }
        },
        {
          id: 'node-pos-enc',
          label: 'Sinusoidal Positional Encoding',
          category: 'equation',
          summary: 'Injects sequence order info via sine and cosine waves of geometric frequencies since attention is permutation-invariant.',
          prerequisites: [],
          importance: 'high',
          sourceCitation: {
            id: 'cite-pe',
            documentId: 'doc-transformer-attention',
            pageNumber: 6,
            sectionTitle: '3.5 Positional Encoding',
            exactQuote: 'Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence.',
            contextSnippet: 'PE_(pos, 2i) = sin(pos / 10000^(2i/d_model))'
          }
        },
        {
          id: 'node-transformer-arch',
          label: 'Full Transformer Architecture',
          category: 'application',
          summary: 'Stack of encoder and decoder layers replacing RNNs, achieving parallel O(1) path length across sequence positions.',
          prerequisites: ['node-multihead', 'node-pos-enc'],
          importance: 'foundational',
          sourceCitation: {
            id: 'cite-arch',
            documentId: 'doc-transformer-attention',
            pageNumber: 1,
            sectionTitle: '1. Introduction',
            exactQuote: 'This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths.',
            contextSnippet: 'We propose the Transformer, a model architecture eschewing recurrence...'
          }
        }
      ],
      edges: [
        { from: 'node-self-attn', to: 'node-scaling-factor', relation: 'conditioned by' },
        { from: 'node-self-attn', to: 'node-multihead', relation: 'projected in parallel by' },
        { from: 'node-scaling-factor', to: 'node-multihead', relation: 'stabilizes gradient for' },
        { from: 'node-multihead', to: 'node-transformer-arch', relation: 'powers core layer of' },
        { from: 'node-pos-enc', to: 'node-transformer-arch', relation: 'injects sequence order into' }
      ]
    },
    explanations: [
      {
        title: 'Scaled Dot-Product Attention: The Core Calculation',
        summary: 'How queries, keys, and values interact, and why the square-root scaling factor is mathematically necessary.',
        intuitiveAnalogy: 'Imagine a library retrieval system: Your question is a "Query" (Q). Every book in the library has a title card called a "Key" (K) and actual book contents called a "Value" (V). To find relevant content, you calculate the match score between your Query and all Keys. The softmax turns these match scores into percentages (weights). Then you take a weighted sum of the Values. The scaling factor √d_k is like speaking at a controlled volume so loud microphone feedback does not deafen the listener!',
        rigorousBreakdown: 'Formally, given matrices Q in R^{n x d_k}, K in R^{m x d_k}, and V in R^{m x d_v}, the compatibility score is calculated via matrix multiplication Q K^T. If entries of Q and K are independent random variables with mean 0 and variance 1, their dot product has mean 0 and variance d_k. For large d_k (e.g. 64 or 512), the dot products can grow very large in magnitude. When passed to the softmax function exp(z_i) / sum(exp(z_j)), large inputs produce probabilities extremely close to 1 or 0, where softmax derivatives shrink to near zero (vanishing gradient). Dividing by sqrt(d_k) normalizes the variance back to 1.',
        workedExample: 'Step 1: Given query vector Q = [1.2, 0.8] and key vector K = [0.9, 1.1] with d_k = 2.\nStep 2: Raw dot product = (1.2 * 0.9) + (0.8 * 1.1) = 1.08 + 0.88 = 1.96.\nStep 3: Scaling factor = √2 ≈ 1.414. Scaled score = 1.96 / 1.414 = 1.386.\nStep 4: Softmax(1.386) keeps the gradient active and avoids exponent explosion.',
        keyTakeaways: [
          'Attention matches Queries to Keys to aggregate Values.',
          'Scaling by 1 / sqrt(d_k) is required to prevent vanishing gradients in the softmax.',
          'Entire sequence attention is computed in one batch matrix multiplication on GPU.'
        ],
        citations: [
          {
            id: 'cite-exp-1',
            documentId: 'doc-transformer-attention',
            pageNumber: 3,
            sectionTitle: '3.2.1 Scaled Dot-Product Attention',
            exactQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).',
            contextSnippet: 'Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V'
          }
        ]
      },
      {
        title: 'Multi-Head Attention: Multi-Perspective Representation',
        summary: 'Why running several smaller attention heads in parallel outperforms a single massive attention head.',
        intuitiveAnalogy: 'Think of analyzing a sentence like "The animal did not cross the street because it was too tired." A single reader might only focus on the subject-verb connection. But having 8 specialized readers means Reader 1 tracks pronouns ("it" -> "animal"), Reader 2 tracks reasons ("because" -> "tired"), and Reader 3 tracks syntax. Concatenating their observations provides a 360-degree understanding.',
        rigorousBreakdown: 'Multi-Head Attention projects Q, K, and V into h lower-dimensional representations (d_k = d_model / h). For each head i, Q W_i^Q and K W_i^K interact independently. Because each head uses independently learned projection matrices, the heads attend to different positions and syntactic-semantic features simultaneously. In a single large head, weighted averaging across all words washes out localized nuances.',
        workedExample: 'With d_model = 512 and h = 8 heads, each head operates in d_k = 512 / 8 = 64 dimensions. Total computational cost is equivalent to single full-rank attention: 8 * (64 x 64) = 512 x 64.',
        keyTakeaways: [
          'Splits d_model across h independent attention heads.',
          'Prevents representation averaging from obscuring diverse grammatical/semantic relationships.',
          'Computational cost remains constant compared to single-head attention of equivalent width.'
        ],
        citations: [
          {
            id: 'cite-exp-2',
            documentId: 'doc-transformer-attention',
            pageNumber: 4,
            sectionTitle: '3.2.2 Multi-Head Attention',
            exactQuote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.',
            contextSnippet: 'MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W^O'
          }
        ]
      }
    ],
    flashcards: [
      {
        id: 'fc-1',
        front: 'What is the exact mathematical formulation of Scaled Dot-Product Attention?',
        back: 'Attention(Q, K, V) = softmax((Q * K^T) / √d_k) * V',
        category: 'equation',
        masteryLevel: 2,
        sourceCitation: {
          id: 'fc-cite-1',
          documentId: 'doc-transformer-attention',
          pageNumber: 3,
          sectionTitle: '3.2.1 Scaled Dot-Product Attention',
          exactQuote: 'We compute the matrix of outputs as: Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V',
          contextSnippet: 'In practice, we compute the attention function on a set of queries simultaneously...'
        },
        practiceOptions: [
          { text: 'Attention(Q, K, V) = softmax((Q * K^T) / √d_k) * V', isCorrect: true, explanation: 'Matches Equation (1) in Section 3.2.1.' },
          { text: 'Attention(Q, K, V) = sigmoid((Q * K^T) / d_k) * V', isCorrect: false, explanation: 'Softmax is used, not sigmoid, and divisor is square root of d_k, not d_k.' },
          { text: 'Attention(Q, K, V) = tanh((Q * V^T) / √d_k) * K', isCorrect: false, explanation: 'Keys K form the compatibility match with Queries Q, not V.' }
        ]
      },
      {
        id: 'fc-2',
        front: 'Why do the authors divide QK^T by √d_k before applying softmax?',
        back: 'For large d_k, the dot products grow large in magnitude, pushing the softmax into saturated regions with near-zero gradients (vanishing gradient problem). Scaling by 1/√d_k normalizes variance to 1.',
        category: 'condition',
        masteryLevel: 1,
        sourceCitation: {
          id: 'fc-cite-2',
          documentId: 'doc-transformer-attention',
          pageNumber: 3,
          sectionTitle: '3.2.1 Scaled Dot-Product Attention',
          exactQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).',
          contextSnippet: 'While the two are similar in theoretical complexity... scale by 1 / sqrt(d_k).'
        },
        practiceOptions: [
          { text: 'To counteract vanishing gradients caused by large dot products saturating the softmax.', isCorrect: true, explanation: 'Explicitly detailed in Section 3.2.1.' },
          { text: 'To ensure the output tensor matches the batch dimension.', isCorrect: false, explanation: 'The dimensions are already matched through matrix multiplication.' },
          { text: 'To convert additive attention to multiplicative attention.', isCorrect: false, explanation: 'Both are multiplicative; the scaling factor specifically bounds values for softmax.' }
        ]
      },
      {
        id: 'fc-3',
        front: 'Why is Positional Encoding needed in the Transformer when RNNs do not need it?',
        back: 'Because Transformers contain no recurrence or convolution and compute attention across all tokens simultaneously (permutation-invariant). Without positional encoding, word order would be completely ignored.',
        category: 'definition',
        masteryLevel: 0,
        sourceCitation: {
          id: 'fc-cite-3',
          documentId: 'doc-transformer-attention',
          pageNumber: 6,
          sectionTitle: '3.5 Positional Encoding',
          exactQuote: 'Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence.',
          contextSnippet: 'To this end, we add "positional encodings" to the input embeddings...'
        }
      },
      {
        id: 'fc-4',
        front: 'In Multi-Head Attention, how is the dimensional size of each individual head d_k calculated?',
        back: 'd_k = d_model / h (where h is the number of heads and d_model is the full representation dimension).',
        category: 'equation',
        masteryLevel: 2,
        sourceCitation: {
          id: 'fc-cite-4',
          documentId: 'doc-transformer-attention',
          pageNumber: 4,
          sectionTitle: '3.2.2 Multi-Head Attention',
          exactQuote: 'In this work we employ h = 8 parallel attention layers, or heads. For each of these we use d_k = d_v = d_model / h = 64.',
          contextSnippet: 'Due to the reduced dimension of each head, the total computational cost is similar...'
        }
      }
    ],
    audioLesson: {
      id: 'audio-transformer',
      title: 'Attention & Transformers: Verified Masterclass',
      totalDurationSeconds: 240,
      sections: [
        {
          id: 'audio-sec-1',
          sectionTitle: '1. Overcoming the Sequential Bottleneck',
          durationSeconds: 65,
          scriptText: 'Welcome to this LEARNOVA academic audio lesson on Attention Is All You Need. Prior to this research, natural language processing relied heavily on Recurrent Neural Networks like LSTMs. However, recurrent architectures process text sequentially—step t strictly depends on step t minus one. This prevents GPU parallelization across long passages. The Transformer eliminates recurrence altogether, processing all sequence tokens simultaneously.',
          sourceCitation: {
            id: 'acite-1',
            documentId: 'doc-transformer-attention',
            pageNumber: 1,
            sectionTitle: '1. Introduction',
            exactQuote: 'This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths.',
            contextSnippet: 'Recurrent models inherently factor computation along the symbol positions...'
          }
        },
        {
          id: 'audio-sec-2',
          sectionTitle: '2. The Scaled Dot-Product Engine',
          durationSeconds: 85,
          scriptText: 'Let us examine the mathematical heart of the model: Scaled Dot-Product Attention. The input consists of Queries, Keys, and Values. First, we compute the dot product between queries and transposed keys, Q times K transpose. Next, we apply a critical operation: dividing by the square root of d_k. Why? Because when key dimensionality is high, dot products explode in magnitude, causing softmax gradients to vanish. Scaling stabilizes learning.',
          sourceCitation: {
            id: 'acite-2',
            documentId: 'doc-transformer-attention',
            pageNumber: 3,
            sectionTitle: '3.2.1 Scaled Dot-Product Attention',
            exactQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).',
            contextSnippet: 'Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V'
          }
        },
        {
          id: 'audio-sec-3',
          sectionTitle: '3. Multi-Head Attention & Positional Encoding',
          durationSeconds: 90,
          scriptText: 'Next, rather than computing attention once across the entire vector space, Multi-Head Attention projects vectors into eight distinct subspaces. This allows the network to jointly attend to syntax, semantics, and reference in parallel. Finally, because the attention mechanism itself is permutation-invariant, sinusoidal positional encodings are added to token embeddings, preserving the essential order of words.',
          sourceCitation: {
            id: 'acite-3',
            documentId: 'doc-transformer-attention',
            pageNumber: 4,
            sectionTitle: '3.2.2 Multi-Head Attention',
            exactQuote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.',
            contextSnippet: 'MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W^O'
          }
        }
      ]
    },
    meaningPreservation: {
      overallFidelityScore: 99.1,
      factRetentionRate: 100,
      equationIntegrityRate: 100,
      conditionAccuracyRate: 98.2,
      terminologyConsistencyRate: 99.5,
      unsupportedClaimsDetected: 0,
      alteredEquationsDetected: 0,
      missingConditionsDetected: 0,
      lastAuditDate: '2026-10-28 19:30 UTC',
      verifiedByEngine: true,
      factChecks: [
        {
          id: 'chk-1',
          originalFact: 'RNN sequential nature precludes parallelization within training examples at long sequence lengths.',
          originalQuote: 'This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths...',
          pageNumber: 1,
          formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards', 'Audio'],
          status: 'fully_preserved',
          confidenceScore: 100,
          notes: 'Exact dependency verified across all four generated formats.'
        },
        {
          id: 'chk-2',
          originalFact: 'Scaled Dot-Product formula requires division by sqrt(d_k) to prevent vanishing softmax gradients.',
          originalQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions that have extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).',
          pageNumber: 3,
          formatFound: ['Concept Map', 'Simplified', 'Notes', 'Worked Examples', 'Flashcards', 'Audio'],
          status: 'fully_preserved',
          confidenceScore: 100,
          notes: 'Equation formula and causal condition preserved without loss.'
        },
        {
          id: 'chk-3',
          originalFact: 'Multi-head attention projects queries, keys, and values h times into d_k, d_k, d_v dimensions.',
          originalQuote: 'Instead of performing a single attention function with d_model-dimensional queries, keys and values, we found it beneficial to linearly project... h times...',
          pageNumber: 4,
          formatFound: ['Concept Map', 'Notes', 'Flashcards', 'Audio'],
          status: 'fully_preserved',
          confidenceScore: 98,
          notes: 'Projection parameter details match paper exact specification.'
        },
        {
          id: 'chk-4',
          originalFact: 'Sinusoidal positional encoding allows model to attend by relative positions because PE_(pos+k) can be represented as a linear function of PE_pos.',
          originalQuote: 'We chose this version because it may allow the model to easily learn to attend by relative positions, since for any fixed offset k, PE_{pos+k} can be represented as a linear function of PE_{pos}.',
          pageNumber: 6,
          formatFound: ['Concept Map', 'Simplified', 'Flashcards'],
          status: 'fully_preserved',
          confidenceScore: 97,
          notes: 'Mathematical justification verified in explanation and flashcard set.'
        }
      ]
    }
  },
  {
    id: 'doc-quantum-schrodinger',
    title: 'Wave Mechanics and Schrödinger Formulation',
    author: 'Erwin Schrödinger (Annalen der Physik, 1926)',
    institution: 'University of Zurich / Physical Foundations',
    year: '1926',
    fileType: 'pptx',
    fileSizeMb: 5.1,
    category: 'Physics & Quantum',
    uploadDate: '2026-10-22',
    pageCount: 18,
    wordCount: 6100,
    summary: 'Derivation of the non-relativistic time-dependent wave equation, establishing that physical states of microscopic particles are completely described by a complex probability amplitude wave function Ψ.',
    processingStatus: 'ready',
    lastStudiedAt: 'Yesterday',
    studyProgressPercent: 54,
    sections: [
      {
        id: 'sec-qm-1',
        pageNumber: 1,
        chapterTitle: '1. Wave-Particle Foundations',
        title: 'De Broglie Hypothesis and State Vectors',
        content: `Following Louis de Broglie's postulation that matter exhibits wave-like properties with wavelength lambda = h / p, the physical state of a quantum particle moving in a potential V(r, t) is described by a complex-valued wave function Psi(r, t).

The physical interpretation given by Max Born dictates that the square modulus |Psi(r, t)|^2 represents the probability density of observing the particle at position r at time t. Consequently, the total probability of finding the particle anywhere in space must equal unity at all times.`,
        definitions: [
          {
            term: 'Born Rule (Probability Interpretation)',
            definition: 'The probability P(V) of finding a quantum particle within volume V is the spatial integral of |Psi(r, t)|^2 d^3r.',
            conditions: 'Total integral over all space must be normalized to 1.'
          }
        ],
        conditions: [
          'Wave function Psi must be square-integrable (L^2 space).',
          'Normalization condition: integral_{-inf}^{inf} |Psi(r,t)|^2 d^3r = 1.'
        ]
      },
      {
        id: 'sec-qm-2',
        pageNumber: 4,
        chapterTitle: '2. The Wave Equation',
        title: 'Time-Dependent Schrödinger Equation (TDSE)',
        content: `For a single non-relativistic particle of mass m subject to a scalar potential V(r, t), the fundamental dynamical law is the Time-Dependent Schrödinger Equation:

i * hbar * dPsi(r, t)/dt = (-hbar^2 / (2m) * del^2 + V(r, t)) * Psi(r, t)

The differential operator on the right-hand side is the Hamiltonian operator H_hat, representing the total energy (kinetic plus potential) of the system:
H_hat = -hbar^2 / (2m) * del^2 + V(r, t)

Thus in compact operator notation:
i * hbar * dPsi/dt = H_hat * Psi

Because the equation is strictly linear in Psi, it obeys the Principle of Superposition: if Psi_1 and Psi_2 are valid quantum states, any linear combination c_1 * Psi_1 + c_2 * Psi_2 is also a valid physical state.`,
        equations: [
          {
            latex: 'i\\hbar \\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r}, t) = \\hat{H}\\Psi(\\mathbf{r}, t)',
            label: 'TDSE (General)',
            meaning: 'Time evolution of quantum state Psi governed by Hamiltonian operator H.'
          },
          {
            latex: '\\hat{H} = -\\frac{\\hbar^2}{2m}\\nabla^2 + V(\\mathbf{r}, t)',
            label: 'Hamiltonian Operator',
            meaning: 'Kinetic energy operator (-hbar^2/2m nabla^2) plus potential energy function V.'
          }
        ],
        conditions: [
          'Applies strictly to non-relativistic particle velocities (v << c).',
          'Hamiltonian operator H_hat must be Hermitian to guarantee real observable energy eigenvalues.',
          'Superposition principle holds unconditionally due to first-order linearity in time.'
        ]
      }
    ],
    conceptMap: {
      nodes: [
        {
          id: 'node-qm-born',
          label: 'Born Probability Rule',
          category: 'condition',
          summary: '|Ψ|² represents spatial probability density, requiring normalization to 1.',
          prerequisites: [],
          importance: 'foundational',
          sourceCitation: {
            id: 'qm-cite-1',
            documentId: 'doc-quantum-schrodinger',
            pageNumber: 1,
            sectionTitle: '1. Wave-Particle Foundations',
            exactQuote: 'The physical interpretation given by Max Born dictates that the square modulus |Psi(r, t)|^2 represents the probability density...',
            contextSnippet: 'Normalization condition: integral |Psi|^2 d^3r = 1.'
          }
        },
        {
          id: 'node-qm-tdse',
          label: 'Time-Dependent Schrödinger Equation',
          category: 'equation',
          summary: 'iℏ ∂Ψ/∂t = ĤΨ governing deterministic time evolution of quantum state amplitude.',
          prerequisites: ['node-qm-born'],
          importance: 'foundational',
          sourceCitation: {
            id: 'qm-cite-2',
            documentId: 'doc-quantum-schrodinger',
            pageNumber: 4,
            sectionTitle: '2. The Wave Equation',
            exactQuote: 'For a single non-relativistic particle of mass m subject to a scalar potential V(r, t), the fundamental dynamical law is the Time-Dependent Schrödinger Equation...',
            contextSnippet: 'i * hbar * dPsi/dt = H_hat * Psi'
          }
        },
        {
          id: 'node-qm-superpos',
          label: 'Quantum Superposition Principle',
          category: 'core',
          summary: 'Direct consequence of linear operator: any linear combination of states is a valid quantum state.',
          prerequisites: ['node-qm-tdse'],
          importance: 'high',
          sourceCitation: {
            id: 'qm-cite-3',
            documentId: 'doc-quantum-schrodinger',
            pageNumber: 4,
            sectionTitle: '2. The Wave Equation',
            exactQuote: 'Because the equation is strictly linear in Psi, it obeys the Principle of Superposition...',
            contextSnippet: 'c_1 * Psi_1 + c_2 * Psi_2 is also a valid physical state.'
          }
        }
      ],
      edges: [
        { from: 'node-qm-born', to: 'node-qm-tdse', relation: 'constrains wave solution of' },
        { from: 'node-qm-tdse', to: 'node-qm-superpos', relation: 'linearity implies' }
      ]
    },
    explanations: [
      {
        title: 'Understanding the Wave Function Ψ and Born Rule',
        summary: 'Why quantum mechanics predicts probabilities rather than deterministic classical paths.',
        intuitiveAnalogy: 'Imagine a vibrating guitar string. The string shape is the wave function Ψ. You cannot point to one single point and say "that is the string"; the wave exists everywhere simultaneously. When you touch it with your finger, that act of measurement causes the vibration to collapse into a localized vibration at that spot!',
        rigorousBreakdown: 'In quantum mechanics, particles do not possess classical trajectory coordinates (x(t), p(t)). Instead, physical states exist in a complex Hilbert space H. The wave function Psi(r, t) is a complex amplitude. The probability of detection in volume dV is dP = Psi*(r, t) Psi(r, t) dV. Normalization ensures the particle exists somewhere with probability exactly 1.',
        workedExample: 'Step 1: For a 1D particle in an infinite square well of width L: Ψ_1(x) = √(2/L) sin(πx/L).\nStep 2: Probability density P(x) = (2/L) sin²(πx/L).\nStep 3: Finding probability in middle half [L/4, 3L/4] = ∫ (2/L) sin²(πx/L) dx = 0.5 + 1/π ≈ 81.8%.\nStep 4: Confirms physical particles concentrate near center in ground state.',
        keyTakeaways: [
          'State is represented by complex probability amplitude Ψ.',
          'Square modulus |Ψ|² gives probability density (Born rule).',
          'Equation is strictly linear, enabling quantum superposition.'
        ],
        citations: [
          {
            id: 'qm-cite-exp-1',
            documentId: 'doc-quantum-schrodinger',
            pageNumber: 1,
            sectionTitle: '1. Wave-Particle Foundations',
            exactQuote: 'The physical interpretation given by Max Born dictates that the square modulus |Psi(r, t)|^2 represents the probability density...',
            contextSnippet: 'integral_{-inf}^{inf} |Psi(r,t)|^2 d^3r = 1'
          }
        ]
      }
    ],
    flashcards: [
      {
        id: 'fc-qm-1',
        front: 'What does the Born rule state regarding the wave function Ψ(r, t)?',
        back: 'The square modulus |Ψ(r, t)|² represents the probability density of finding the particle at position r at time t.',
        category: 'definition',
        masteryLevel: 1,
        sourceCitation: {
          id: 'fc-qm-c1',
          documentId: 'doc-quantum-schrodinger',
          pageNumber: 1,
          sectionTitle: '1. Wave-Particle Foundations',
          exactQuote: 'The physical interpretation given by Max Born dictates that the square modulus |Psi(r, t)|^2 represents the probability density...',
          contextSnippet: 'Total probability of finding the particle anywhere in space must equal unity...'
        }
      },
      {
        id: 'fc-qm-2',
        front: 'What mathematical property of the Schrödinger Equation guarantees the Principle of Superposition?',
        back: 'Linearity: The differential operator H_hat and the time derivative are both first-order linear operators on Ψ.',
        category: 'condition',
        masteryLevel: 2,
        sourceCitation: {
          id: 'fc-qm-c2',
          documentId: 'doc-quantum-schrodinger',
          pageNumber: 4,
          sectionTitle: '2. The Wave Equation',
          exactQuote: 'Because the equation is strictly linear in Psi, it obeys the Principle of Superposition...',
          contextSnippet: 'any linear combination c_1 Psi_1 + c_2 Psi_2 is also a valid physical state.'
        }
      }
    ],
    audioLesson: {
      id: 'audio-qm',
      title: 'Quantum Mechanics: Schrödinger & Wave Duality',
      totalDurationSeconds: 180,
      sections: [
        {
          id: 'audio-qm-sec-1',
          sectionTitle: '1. From Classical Determinism to Probability Amplitudes',
          durationSeconds: 90,
          scriptText: 'Welcome to this LEARNOVA audio module on Quantum Mechanics. In 1926, Erwin Schrödinger formalized wave mechanics. Unlike classical mechanics where particles have exact trajectories, quantum particles are described by a complex wave function, Psi. Max Born demonstrated that the square modulus of Psi represents the probability density of locating the particle in space.',
          sourceCitation: {
            id: 'acite-qm-1',
            documentId: 'doc-quantum-schrodinger',
            pageNumber: 1,
            sectionTitle: '1. Wave-Particle Foundations',
            exactQuote: 'Following Louis de Broglie postulation that matter exhibits wave-like properties...',
            contextSnippet: 'The physical state of a quantum particle is described by complex-valued wave function...'
          }
        }
      ]
    },
    meaningPreservation: {
      overallFidelityScore: 98.7,
      factRetentionRate: 99,
      equationIntegrityRate: 100,
      conditionAccuracyRate: 97.5,
      terminologyConsistencyRate: 98.8,
      unsupportedClaimsDetected: 0,
      alteredEquationsDetected: 0,
      missingConditionsDetected: 0,
      lastAuditDate: '2026-10-28 19:30 UTC',
      verifiedByEngine: true,
      factChecks: [
        {
          id: 'chk-qm-1',
          originalFact: 'Born rule defines |Psi|^2 as spatial probability density requiring normalization to 1.',
          originalQuote: 'The physical interpretation given by Max Born dictates that the square modulus |Psi(r, t)|^2 represents the probability density...',
          pageNumber: 1,
          formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards', 'Audio'],
          status: 'fully_preserved',
          confidenceScore: 100,
          notes: 'Integral normalization constraint preserved.'
        },
        {
          id: 'chk-qm-2',
          originalFact: 'Schrödinger equation is strictly non-relativistic (v << c).',
          originalQuote: 'For a single non-relativistic particle of mass m subject to a scalar potential...',
          pageNumber: 4,
          formatFound: ['Concept Map', 'Notes', 'Flashcards'],
          status: 'fully_preserved',
          confidenceScore: 98,
          notes: 'Boundary condition non-relativistic speed explicitly cited.'
        }
      ]
    }
  },
  {
    id: 'doc-raft-consensus',
    title: 'In Search of an Understandable Consensus Algorithm (Raft)',
    author: 'Diego Ongaro and John Ousterhout (Stanford University)',
    institution: 'USENIX Annual Technical Conference (ATC 2014)',
    year: '2014',
    fileType: 'pdf',
    fileSizeMb: 1.8,
    category: 'Distributed Systems',
    uploadDate: '2026-10-18',
    pageCount: 18,
    wordCount: 7800,
    summary: 'Raft is a consensus algorithm for managing a replicated log. It produces a result equivalent to Multi-Paxos, and it is as efficient as Paxos, but its structure is different: Raft separates key elements into Leader Election, Log Replication, and Safety.',
    processingStatus: 'ready',
    lastStudiedAt: '3 days ago',
    studyProgressPercent: 92,
    sections: [
      {
        id: 'sec-raft-intro',
        pageNumber: 1,
        chapterTitle: '1. Introduction',
        title: 'Understandability as a First-Class Citizen',
        content: `Consensus algorithms allow a collection of machines to work as a coherent group that can survive the failures of some of its members. Because of this, they play a key role in building reliable large-scale software systems. Paxos has dominated the discussion of consensus algorithms over the last two decades. Unfortunately, Paxos is extraordinarily difficult to understand, both for students and for seasoned implementers.

Our primary goal was understandability: could we design a consensus algorithm for practical systems that would be significantly easier to learn and implement than Paxos? Raft decomposes the consensus problem into three independent subproblems: Leader Election, Log Replication, and Safety.`,
        definitions: [
          {
            term: 'Consensus',
            definition: 'Agreement among a cluster of replicated state machines on a shared sequence of log entries, even in the presence of network partitions and node crashes.'
          }
        ],
        conditions: [
          'Can tolerate up to (N-1)/2 server failures in a cluster of N nodes.'
        ]
      },
      {
        id: 'sec-raft-basics',
        pageNumber: 3,
        chapterTitle: '5. The Raft Consensus Algorithm',
        title: '5.1 Raft Basics: Roles and Terms',
        content: `At any given time each server is in one of three states: leader, follower, or candidate. In normal operation there is exactly one leader and all of the other servers are followers. Followers are passive: they issue no requests on their own but simply respond to requests from leaders and candidates. The leader handles all client requests (if a client contacts a follower, the follower redirects it to the leader). The third state, candidate, is used to elect a new leader.

Raft divides time into terms of arbitrary length. Terms are numbered with consecutive integers. Each term begins with an election, in which one or more candidates attempt to become leader. If a candidate wins the election, then it serves as leader for the rest of the term. In some situations an election will result in a split vote. In this case the term ends with no leader; a new term (with a new election) will begin shortly. Raft ensures that there is at most one leader in any given term.`,
        conditions: [
          'Election Safety: At most one leader can be elected in a given term.',
          'Terms act as a logical clock in Raft, enabling servers to detect stale information such as obsolete leaders.'
        ]
      }
    ],
    conceptMap: {
      nodes: [
        {
          id: 'node-raft-roles',
          label: 'Server Roles (Leader / Follower / Candidate)',
          category: 'core',
          summary: 'At any point, a Raft node is in one of 3 explicit states. Normal state has 1 leader and N-1 followers.',
          prerequisites: [],
          importance: 'foundational',
          sourceCitation: {
            id: 'raft-c1',
            documentId: 'doc-raft-consensus',
            pageNumber: 3,
            sectionTitle: '5.1 Raft Basics',
            exactQuote: 'At any given time each server is in one of three states: leader, follower, or candidate.',
            contextSnippet: 'In normal operation there is exactly one leader and all of the other servers are followers.'
          }
        },
        {
          id: 'node-raft-terms',
          label: 'Numbered Terms & Logical Clock',
          category: 'condition',
          summary: 'Time is divided into monotonically increasing terms, guaranteeing at most 1 leader per term.',
          prerequisites: ['node-raft-roles'],
          importance: 'high',
          sourceCitation: {
            id: 'raft-c2',
            documentId: 'doc-raft-consensus',
            pageNumber: 3,
            sectionTitle: '5.1 Raft Basics',
            exactQuote: 'Raft divides time into terms of arbitrary length. Terms are numbered with consecutive integers.',
            contextSnippet: 'Raft ensures that there is at most one leader in any given term.'
          }
        }
      ],
      edges: [
        { from: 'node-raft-roles', to: 'node-raft-terms', relation: 'transition governed by' }
      ]
    },
    explanations: [
      {
        title: 'Raft Decomposition: How 3 States Guarantee Agreement',
        summary: 'Step-by-step breakdown of how Leader Election and Terms resolve split-brain in distributed systems.',
        intuitiveAnalogy: 'Think of a parliamentary democracy with fixed election terms. Only the elected Prime Minister (Leader) can pass laws (replicate log entries). If the Prime Minister disappears, an election term begins. Candidates ask Members of Parliament for votes. If someone gets a majority of votes, they become Leader for that term. Terms prevent two old leaders from giving conflicting orders.',
        rigorousBreakdown: 'Raft divides consensus into Leader Election, Log Replication, and Safety invariants. The Election Safety property states that for any given term T, at most one leader can be elected. Candidates must request votes using RequestVote RPCs. A node votes for at most one candidate per term on a first-come-first-served basis. Winning requires votes from a majority of servers: floor(N/2) + 1. Two separate majorities must overlap by at least one server, mathematically preventing split-brain.',
        workedExample: 'Step 1: In a 5-node cluster {S1, S2, S3, S4, S5}, majority quorum Q = floor(5/2) + 1 = 3 nodes.\nStep 2: S1 times out and becomes candidate for Term 2. Sends RequestVote to S2, S3.\nStep 3: S2 and S3 grant votes. S1 has 3 votes (itself + S2 + S3).\nStep 4: Even if S4 also seeks votes, it can at best reach {S4, S5} = 2 votes. S1 is guaranteed sole leader.',
        keyTakeaways: [
          'Three explicit states: Follower, Candidate, Leader.',
          'Election safety relies on strict majority quorum overlap.',
          'Terms act as monotonic logical clocks.'
        ],
        citations: [
          {
            id: 'raft-exp-cite',
            documentId: 'doc-raft-consensus',
            pageNumber: 3,
            sectionTitle: '5.1 Raft Basics',
            exactQuote: 'Raft ensures that there is at most one leader in any given term.',
            contextSnippet: 'Each term begins with an election... terms are numbered with consecutive integers.'
          }
        ]
      }
    ],
    flashcards: [
      {
        id: 'fc-raft-1',
        front: 'What are the 3 states a Raft server can occupy at any time?',
        back: '1. Leader\n2. Follower\n3. Candidate',
        category: 'definition',
        masteryLevel: 2,
        sourceCitation: {
          id: 'fc-rc1',
          documentId: 'doc-raft-consensus',
          pageNumber: 3,
          sectionTitle: '5.1 Raft Basics',
          exactQuote: 'At any given time each server is in one of three states: leader, follower, or candidate.',
          contextSnippet: 'In normal operation there is exactly one leader...'
        }
      },
      {
        id: 'fc-raft-2',
        front: 'What is the Election Safety invariant in Raft?',
        back: 'At most one leader can be elected in any given term. Guaranteed by requiring candidate to receive votes from a strict majority quorum (floor(N/2) + 1).',
        category: 'condition',
        masteryLevel: 1,
        sourceCitation: {
          id: 'fc-rc2',
          documentId: 'doc-raft-consensus',
          pageNumber: 3,
          sectionTitle: '5.1 Raft Basics',
          exactQuote: 'Raft ensures that there is at most one leader in any given term.',
          contextSnippet: 'Each term begins with an election in which one or more candidates attempt to become leader.'
        }
      }
    ],
    audioLesson: {
      id: 'audio-raft',
      title: 'Consensus Simplified: The Raft Architecture',
      totalDurationSeconds: 150,
      sections: [
        {
          id: 'audio-raft-1',
          sectionTitle: '1. Why Raft Replaced Paxos',
          durationSeconds: 75,
          scriptText: 'Welcome to LEARNOVA. For decades, Paxos was the gold standard for consensus in distributed systems, but it was notoriously difficult to understand and implement. Diego Ongaro and John Ousterhout designed Raft at Stanford to make consensus intuitive and mathematically verifiable. Raft breaks consensus into three clear subproblems: Leader Election, Log Replication, and Safety.',
          sourceCitation: {
            id: 'acite-raft-1',
            documentId: 'doc-raft-consensus',
            pageNumber: 1,
            sectionTitle: '1. Introduction',
            exactQuote: 'Consensus algorithms allow a collection of machines to work as a coherent group...',
            contextSnippet: 'Our primary goal was understandability...'
          }
        }
      ]
    },
    meaningPreservation: {
      overallFidelityScore: 99.4,
      factRetentionRate: 100,
      equationIntegrityRate: 100,
      conditionAccuracyRate: 99.0,
      terminologyConsistencyRate: 99.6,
      unsupportedClaimsDetected: 0,
      alteredEquationsDetected: 0,
      missingConditionsDetected: 0,
      lastAuditDate: '2026-10-28 19:30 UTC',
      verifiedByEngine: true,
      factChecks: [
        {
          id: 'chk-raft-1',
          originalFact: 'At most one leader can be elected in any given term (Election Safety).',
          originalQuote: 'Raft ensures that there is at most one leader in any given term.',
          pageNumber: 3,
          formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards', 'Audio'],
          status: 'fully_preserved',
          confidenceScore: 100,
          notes: 'Quorum overlap condition preserved.'
        }
      ]
    }
  },
  {
    id: 'doc-scanned-calculus-notes',
    title: 'Lecture 04: Vector Fields & Multivariable Calculus (Handwritten)',
    author: 'Prof. Ramesh K. (IISc Bangalore)',
    institution: 'Department of Mathematics / Lecture Series',
    year: '2026',
    fileType: 'scanned_notes',
    fileSizeMb: 8.9,
    category: 'Mathematics',
    uploadDate: '2026-10-27',
    pageCount: 6,
    wordCount: 1840,
    summary: 'Handwritten scanned lecture notes covering Green theorem, curl, and flux divergence in R^3. Contains faint pencil notations on page 4.',
    processingStatus: 'warning',
    lastStudiedAt: '4 days ago',
    studyProgressPercent: 20,
    extractionWarnings: [
      'Page 4: Optical character contrast is below 45% (faint pencil handwriting detected).',
      'Page 5: Surface equation curl(F) · n dS contains partial smudge; equation verified with confidence penalty (84%).',
      'Recommendation: Inspect Source Verification tab before final exam revision.'
    ],
    sections: [
      {
        id: 'sec-green-thm',
        pageNumber: 1,
        chapterTitle: '1. Circulation and Curl',
        title: 'Green Theorem in the Plane',
        content: `Let C be a positively oriented, piecewise-smooth, simple closed curve in the plane, and let D be the region bounded by C. If P and Q have continuous partial derivatives on an open region containing D, then:

integral_C (P dx + Q dy) = double_integral_D (dQ/dx - dP/dy) dA

Condition Invariant:
Curve C must be strictly simple (non-self-intersecting) and traversed counter-clockwise (positive orientation).`,
        equations: [
          {
            latex: '\\oint_C (P\\,dx + Q\\,dy) = \\iint_D \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dA',
            label: 'Green Theorem',
            meaning: 'Converts closed line integral of 2D vector field into area integral of curl over bounded region D.'
          }
        ],
        conditions: [
          'Curve C must be simple, closed, and oriented counter-clockwise.',
          'Partial derivatives dP/dy and dQ/dx must be continuous throughout region D.'
        ]
      }
    ],
    conceptMap: {
      nodes: [
        {
          id: 'node-calc-green',
          label: 'Green Theorem',
          category: 'equation',
          summary: 'Circulation along boundary equals double integral of curl over interior.',
          prerequisites: [],
          importance: 'foundational',
          sourceCitation: {
            id: 'calc-c1',
            documentId: 'doc-scanned-calculus-notes',
            pageNumber: 1,
            sectionTitle: 'Green Theorem',
            exactQuote: 'integral_C (P dx + Q dy) = double_integral_D (dQ/dx - dP/dy) dA',
            contextSnippet: 'Let C be a positively oriented, piecewise-smooth curve...'
          }
        }
      ],
      edges: []
    },
    explanations: [
      {
        title: 'Green Theorem: Boundary Circulation to Interior Whirlpool',
        summary: 'How adding tiny microscopic rotational swirls inside a region sums up to macroscopic circulation on the boundary.',
        intuitiveAnalogy: 'Imagine a stadium full of people each holding hands with neighbors and spinning counter-clockwise. At every interior touch point, adjacent hands move in opposite directions and cancel out! The only movement that survives cancellation is around the outer perimeter fence.',
        rigorousBreakdown: 'Green theorem is the 2-dimensional special case of the Kelvin-Stokes theorem. The line integral around boundary C computes net work done by field F = (P, Q). The scalar curl (dQ/dx - dP/dy) measures microscopic circulation density at each point dA.',
        workedExample: 'Step 1: Evaluate ∮_C (y³ dx - x³ dy) where C is circle of radius 2.\nStep 2: P = y³, Q = -x³. Then ∂Q/∂x - ∂P/∂y = -3x² - 3y² = -3(x² + y²).\nStep 3: In polar coordinates, ∬_D -3r² (r dr dθ) = -3 ∫_0^{2π} dθ ∫_0^2 r³ dr = -6π [r⁴/4]_0^2 = -24π.',
        keyTakeaways: [
          'Converts 1D boundary line integral to 2D double area integral.',
          'Orientation must be counter-clockwise.',
          'Requires continuous first partial derivatives.'
        ],
        citations: [
          {
            id: 'calc-exp-1',
            documentId: 'doc-scanned-calculus-notes',
            pageNumber: 1,
            sectionTitle: 'Green Theorem',
            exactQuote: 'integral_C (P dx + Q dy) = double_integral_D (dQ/dx - dP/dy) dA',
            contextSnippet: 'Curve C must be strictly simple and traversed counter-clockwise.'
          }
        ]
      }
    ],
    flashcards: [
      {
        id: 'fc-calc-1',
        front: 'What orientation must boundary curve C have for standard Green Theorem?',
        back: 'Counter-clockwise (positive orientation), keeping region D to the left as you traverse.',
        category: 'condition',
        masteryLevel: 1,
        sourceCitation: {
          id: 'fc-calc-c1',
          documentId: 'doc-scanned-calculus-notes',
          pageNumber: 1,
          sectionTitle: 'Green Theorem',
          exactQuote: 'Curve C must be strictly simple and traversed counter-clockwise.',
          contextSnippet: 'Let C be a positively oriented, piecewise-smooth curve...'
        }
      }
    ],
    audioLesson: {
      id: 'audio-calc',
      title: 'Multivariable Calculus: Vector Circulation',
      totalDurationSeconds: 120,
      sections: [
        {
          id: 'audio-calc-1',
          sectionTitle: '1. Green Theorem and Microscopic Rotation',
          durationSeconds: 60,
          scriptText: 'Welcome to this review of Green Theorem. In multivariable calculus, Green Theorem provides a bridge between boundary line integrals and double area integrals. By summing microscopic swirls across the interior, all internal contributions cancel, leaving only boundary circulation.',
          sourceCitation: {
            id: 'acite-calc-1',
            documentId: 'doc-scanned-calculus-notes',
            pageNumber: 1,
            sectionTitle: 'Green Theorem',
            exactQuote: 'integral_C (P dx + Q dy) = double_integral_D (dQ/dx - dP/dy) dA',
            contextSnippet: 'Let C be a positively oriented curve...'
          }
        }
      ]
    },
    meaningPreservation: {
      overallFidelityScore: 92.4,
      factRetentionRate: 94,
      equationIntegrityRate: 98,
      conditionAccuracyRate: 88.0,
      terminologyConsistencyRate: 95.0,
      unsupportedClaimsDetected: 1,
      alteredEquationsDetected: 0,
      missingConditionsDetected: 1,
      lastAuditDate: '2026-10-28 19:30 UTC',
      verifiedByEngine: false,
      factChecks: [
        {
          id: 'chk-calc-1',
          originalFact: 'Curve C must be simple, closed, and oriented counter-clockwise.',
          originalQuote: 'Curve C must be strictly simple (non-self-intersecting) and traversed counter-clockwise...',
          pageNumber: 1,
          formatFound: ['Concept Map', 'Simplified', 'Notes', 'Flashcards'],
          status: 'fully_preserved',
          confidenceScore: 98,
          notes: 'Boundary condition verified.'
        },
        {
          id: 'chk-calc-2',
          originalFact: 'Page 4 faint notation: Stokes theorem in R^3 applies to orientable open surfaces bounded by C.',
          originalQuote: 'Page 4 handwritten: Stokes generalization requires surface orientation to match curve boundary via right-hand rule.',
          pageNumber: 4,
          formatFound: ['Notes'],
          status: 'needs_review',
          confidenceScore: 78,
          notes: 'Flagged: Optical character recognition confidence is 78% due to low contrast scan.',
          flagReason: 'unsupported_claim'
        }
      ]
    }
  }
];

export const INITIAL_SAVED_ITEMS = [
  {
    id: 'saved-1',
    documentId: 'doc-transformer-attention',
    documentTitle: 'Attention Is All You Need',
    type: 'concept_map' as const,
    title: 'Self-Attention & Multi-Head Prerequisite Tree',
    content: 'Root topological tree connecting Scaled Dot-Product to 8-Head parallel projection and sinusoidal position encodings.',
    savedAt: '2026-10-27 15:40',
    citation: {
      id: 'cite-saved-1',
      documentId: 'doc-transformer-attention',
      pageNumber: 3,
      sectionTitle: '3.2.1 Scaled Dot-Product Attention',
      exactQuote: 'Attention(Q, K, V) = softmax(QK^T / √d_k)V',
      contextSnippet: 'Input queries, keys, and values packed into matrices...'
    }
  },
  {
    id: 'saved-2',
    documentId: 'doc-transformer-attention',
    documentTitle: 'Attention Is All You Need',
    type: 'flashcard' as const,
    title: 'Why divide by √d_k in Attention?',
    content: 'For large key dimension d_k, dot products grow large pushing softmax into regions with vanishing gradients.',
    savedAt: '2026-10-27 16:10',
    citation: {
      id: 'cite-saved-2',
      documentId: 'doc-transformer-attention',
      pageNumber: 3,
      sectionTitle: '3.2.1 Scaled Dot-Product Attention',
      exactQuote: 'We suspect that for large values of d_k, the dot products grow large in magnitude...',
      contextSnippet: 'To counteract this effect, we scale by 1 / √d_k.'
    }
  },
  {
    id: 'saved-3',
    documentId: 'doc-quantum-schrodinger',
    documentTitle: 'Wave Mechanics and Schrödinger Formulation',
    type: 'notes' as const,
    title: 'Born Rule & Normalization Proof',
    content: 'Spatial probability density requires square-integrable L^2 Hilbert space with total volume integral = 1.',
    savedAt: '2026-10-26 11:20',
    citation: {
      id: 'cite-saved-3',
      documentId: 'doc-quantum-schrodinger',
      pageNumber: 1,
      sectionTitle: '1. Wave-Particle Foundations',
      exactQuote: 'The physical interpretation given by Max Born dictates that the square modulus |Ψ|² represents probability density...',
      contextSnippet: 'Total probability of finding particle anywhere equals unity.'
    }
  },
  {
    id: 'saved-4',
    documentId: 'doc-raft-consensus',
    documentTitle: 'In Search of an Understandable Consensus Algorithm (Raft)',
    type: 'source_passage' as const,
    title: 'Election Safety Invariant (§5.1)',
    content: 'Raft ensures that there is at most one leader in any given term via overlapping majority quorums.',
    savedAt: '2026-10-25 18:05',
    citation: {
      id: 'cite-saved-4',
      documentId: 'doc-raft-consensus',
      pageNumber: 3,
      sectionTitle: '5.1 Raft Basics',
      exactQuote: 'Raft ensures that there is at most one leader in any given term.',
      contextSnippet: 'Each term begins with an election... terms are numbered with consecutive integers.'
    }
  }
];

export const INITIAL_COURSES = [
  {
    id: 'course-cs101',
    code: 'CS 482 / 682',
    title: 'Deep Learning & Neural Architectures',
    studentCount: 142,
    documentIds: ['doc-transformer-attention'],
    isPublished: true,
    averageQuizScore: 88.5
  },
  {
    id: 'course-phys202',
    code: 'PHYS 301',
    title: 'Quantum Mechanics & Hilbert Spaces',
    studentCount: 86,
    documentIds: ['doc-quantum-schrodinger'],
    isPublished: true,
    averageQuizScore: 91.2
  },
  {
    id: 'course-dist301',
    code: 'CS 541',
    title: 'Distributed Systems & Fault Tolerance',
    studentCount: 110,
    documentIds: ['doc-raft-consensus'],
    isPublished: false,
    averageQuizScore: 84.0
  }
];
