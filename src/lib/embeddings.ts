/**
 * Embedding utility that prefers Hugging Face's Free Inference API
 * to prevent Vercel Free Plan cold boot timeouts.
 * Falls back to local @xenova/transformers if no API key is set.
 */

// Dynamic import keeps this out of the client bundle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any = null

async function getPipeline() {
  if (_pipeline) return _pipeline
  // @xenova/transformers is server-only; dynamic import avoids bundling issues
  const { pipeline, env } = await import('@xenova/transformers')
  // On Vercel, /tmp is writable; cache the model there
  env.cacheDir = '/tmp/transformers_cache'
  env.allowLocalModels = false
  _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  return _pipeline
}

/**
 * Returns a normalised 384-dimensional embedding for the given text.
 */
export async function embed(text: string): Promise<number[]> {
  // Use Hugging Face API if available (Instant, Best for Vercel Free)
  if (process.env.HUGGINGFACE_API_KEY) {
    const { HfInference } = await import('@huggingface/inference')
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)
    
    try {
      const output = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: text,
      })
      // hf.featureExtraction returns a 1D array of numbers or nested arrays.
      const vector = Array.isArray(output[0]) ? output[0] : output
      return vector as number[]
    } catch (err: any) {
      console.error('[embeddings] HF API failed:', err)
      throw new Error(`HF API Error: ${err?.message || 'Unknown Hugging Face SDK Error'}`)
    }
  }

  // Fallback to local execution (slow cold boot, might timeout on Vercel)
  console.log('[embeddings] HUGGINGFACE_API_KEY not found. Using local Xenova model.')
  const extractor = await getPipeline()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}
