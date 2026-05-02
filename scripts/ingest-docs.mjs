#!/usr/bin/env node
/**
 * RAG Ingestion Script — AOTIC Assistant
 *
 * Chunks docs/Requirements.md + claudeContext.md, embeds each chunk using
 * @xenova/transformers (all-MiniLM-L6-v2, runs locally — no API key needed),
 * and stores the 384-dim vectors in Supabase pgvector.
 *
 * Run once from project root (re-run whenever docs change):
 *   node scripts/ingest-docs.mjs
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The embedding model (~23 MB) is downloaded automatically on first run
 * from HuggingFace Hub and cached in ./node_modules/.cache/transformers.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌  Missing env vars.\n' +
    '    Required: NEXT_PUBLIC_SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DOCS = [
  { file: 'docs/UserGuide.md',     title: 'AOTIC User Guide' },
  { file: 'docs/Requirements.md',  title: 'AOTIC Requirements' },
]

const CHUNK_SIZE    = 900
const CHUNK_OVERLAP = 120

// ── Chunking ──────────────────────────────────────────────────────────────────

function chunkText(text, docTitle) {
  const chunks = []
  const sections = text.split(/\n(?=## )/)

  for (const section of sections) {
    const trimmed = section.trim()
    if (trimmed.length < 40) continue

    const titleMatch = trimmed.match(/^#+\s*(.+)/)
    const sectionName = titleMatch ? titleMatch[1].trim() : 'General'

    if (trimmed.length <= CHUNK_SIZE) {
      chunks.push({
        title: docTitle, content: trimmed, section: sectionName,
        chunk_index: chunks.length,
        metadata: { source: docTitle, section: sectionName },
      })
      continue
    }

    let start = 0, localIdx = 0
    while (start < trimmed.length) {
      const end   = Math.min(start + CHUNK_SIZE, trimmed.length)
      const chunk = trimmed.slice(start, end).trim()
      if (chunk.length > 40) {
        chunks.push({
          title: docTitle, content: chunk, section: sectionName,
          chunk_index: chunks.length,
          metadata: { source: docTitle, section: sectionName, part: localIdx++ },
        })
      }
      if (end >= trimmed.length) break
      start = end - CHUNK_OVERLAP
    }
  }

  return chunks
}

// ── Local embedding (all-MiniLM-L6-v2, 384-dim, no API key) ──────────────────

let _pipeline = null

async function getEmbedder() {
  if (_pipeline) return _pipeline
  const { pipeline, env } = await import('@xenova/transformers')
  env.cacheDir = resolve(process.cwd(), 'node_modules/.cache/transformers')
  env.allowLocalModels = false
  console.log('  Downloading / loading all-MiniLM-L6-v2 (first run: ~23 MB)…')
  _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  console.log('  Model ready.')
  return _pipeline
}

async function embed(text) {
  const extractor = await getEmbedder()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🗑️   Clearing existing RAG documents…')
  await supabase
    .from('rag_documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // Pre-load model before processing docs
  await getEmbedder()

  let totalChunks = 0

  for (const doc of DOCS) {
    const filePath = resolve(process.cwd(), doc.file)
    if (!existsSync(filePath)) {
      console.warn(`⚠️   Not found: ${filePath} — skipping`)
      continue
    }

    const text   = readFileSync(filePath, 'utf-8')
    const chunks = chunkText(text, doc.title)
    console.log(`\n📄  ${doc.file}  →  ${chunks.length} chunks`)

    const BATCH = 16  // local model can handle larger batches
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      process.stdout.write(
        `    Embedding ${i + 1}–${Math.min(i + BATCH, chunks.length)} / ${chunks.length}…\r`
      )

      // Embed sequentially (pipeline isn't batched in @xenova/transformers v2)
      const rows = []
      for (const chunk of batch) {
        const embedding = await embed(chunk.content)
        rows.push({
          title: chunk.title, content: chunk.content, section: chunk.section,
          chunk_index: chunk.chunk_index, metadata: chunk.metadata,
          embedding: JSON.stringify(embedding),
        })
      }

      const { error } = await supabase.from('rag_documents').insert(rows)
      if (error) console.error(`\n    ❌  Insert error:`, error.message)
    }

    totalChunks += chunks.length
    console.log(`    ✅  "${doc.title}" done (${chunks.length} chunks)              `)
  }

  console.log(`\n✅  Ingestion complete — ${totalChunks} chunks stored in Supabase`)
}

main().catch((err) => {
  console.error('\n💥  Fatal:', err.message)
  process.exit(1)
})
