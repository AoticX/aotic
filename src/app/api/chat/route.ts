import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { embed } from '@/lib/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(context: string): string {
  return `You are the AOTIC Assistant — the built-in helper for staff at AOTIC automotive service centre.

You answer questions from staff: sales executives, front desk, managers, technicians, QC inspectors, and accounts team. Explain things in plain, practical language — not technical code or developer terms.

Your ONLY knowledge source is the documentation context provided below.

STRICT RULES:
- Answer from the context. If not there, say: "I don't have that information. Please check with your manager."
- Never mention code, functions, TypeScript, APIs, or developer tools — you are talking to non-technical staff.
- "Client" and "customer" mean the same thing as "lead" in AOTIC — explain it that way.
- Be concise and practical. Get to the point.
- Use Markdown: **bold** key terms, bullet lists for steps, numbered lists for workflows.
- For role questions: state exactly which role can do what.
- For workflow questions: give clear numbered steps.
- Never invent rules, prices, or percentages not in the context.

--- RELEVANT DOCUMENTATION ---
${context || 'No relevant documentation found for this query.'}
--- END OF DOCUMENTATION ---`
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body
  let message: string
  try {
    const body = await req.json()
    message = (body?.message ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!message) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  // Embed query locally (no external API)
  let queryEmbedding: number[]
  try {
    queryEmbedding = await embed(message)
  } catch (err: any) {
    console.error('[chat] embedding error:', err)
    return NextResponse.json({ error: `Embedding failed: ${err?.message || 'Unknown error'}` }, { status: 500 })
  }

  // Similarity search in Supabase pgvector
  const service = createServiceClient()
  const { data: docs, error: rpcErr } = await (service as any).rpc(
    'match_rag_documents',
    { query_embedding: JSON.stringify(queryEmbedding), match_threshold: 0.3, match_count: 8 }
  )
  if (rpcErr) console.error('[chat] Supabase RAG error:', rpcErr)
  console.log('[chat] RAG results:', docs?.length ?? 0, 'docs | top similarities:', (docs ?? []).slice(0, 3).map((d: any) => d.similarity?.toFixed(3)))

  const context = ((docs ?? []) as { content: string }[])
    .map((d) => d.content)
    .join('\n\n---\n\n')

  // Stream answer from Groq
  const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      temperature: 0.15,
      max_tokens: 900,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: message },
      ],
    }),
  })

  if (!groqResp.ok || !groqResp.body) {
    const errText = await groqResp.text()
    console.error('[chat] Groq error:', groqResp.status, errText)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
  }

  // Transform Groq SSE → plain text stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader  = groqResp.body!.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const data = trimmed.slice(6)
            if (data === '[DONE]') { controller.close(); return }
            try {
              const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
              const token = parsed.choices?.[0]?.delta?.content
              if (token) controller.enqueue(encoder.encode(token))
            } catch { /* skip malformed chunk */ }
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
