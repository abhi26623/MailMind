import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;

class Embedder {
  static task = 'feature-extraction' as const;
  static model = 'Xenova/nomic-embed-text-v1';
  static instance: Promise<FeatureExtractionPipeline> | null = null;

  static async getInstance() {
    if (this.instance === null) {
      // Lazy load to prevent blocking cold starts
      this.instance = pipeline(this.task, this.model) as Promise<FeatureExtractionPipeline>;
    }
    return this.instance;
  }
}

/**
 * Generate a 768-dimensional embedding for a given text using nomic-embed-text.
 * Uses Transformers.js to run locally in the Node process.
 */
export async function embedText(text: string): Promise<number[]> {
  const embedder = await Embedder.getInstance();
  // Nomic requires the 'search_document: ' prefix for documents 
  // (we'll just use it directly for everything here to keep it simple, or 'search_query: ' for queries)
  
  // We specify pooling mean and normalize true as typical for Nomic
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  // output.data is a Float32Array, convert to standard number array
  return Array.from(output.data);
}
