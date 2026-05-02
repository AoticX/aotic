/**
 * Local embedding utility using @xenova/transformers.
 * Runs all-MiniLM-L6-v2 directly in Node.js — no external API, no token limits.
 * Model (~23 MB) is downloaded once from HuggingFace Hub and cached in /tmp.
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
 * Safe to call multiple times — pipeline is initialised once and reused.
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getPipeline()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}
