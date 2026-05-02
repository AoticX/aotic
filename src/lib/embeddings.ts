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
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      }
    )
    if (response.ok) {
      const output = await response.json()
      const vector = Array.isArray(output[0]) ? output[0] : output
      return vector
    }
    
    const errText = await response.text()
    console.error('[embeddings] HF API failed:', response.status, errText)
    throw new Error(`HF API Error: ${response.status} - ${errText}`)
  }

  // Fallback to local execution (slow cold boot, might timeout on Vercel)
  console.log('[embeddings] HUGGINGFACE_API_KEY not found. Using local Xenova model.')
  const extractor = await getPipeline()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}
