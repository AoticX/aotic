'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, X, Send, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

// ── Inline renderer: bold, italic, inline code ─────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-[12px] font-mono text-orange-300">
          {part.slice(1, -1)}
        </code>
      )
    return part
  })
}

// ── Full block-level Markdown renderer ────────────────────────────────────

function MarkdownMessage({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push(
        <pre key={`cb${i}`} className="bg-black/50 border border-white/10 rounded-xl p-3 my-2 overflow-x-auto">
          <code className="text-[12px] font-mono text-emerald-300 leading-relaxed whitespace-pre">
            {codeLines.join('\n')}
          </code>
        </pre>
      )
      i++
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push(<hr key={`hr${i}`} className="border-white/10 my-3" />)
      i++
      continue
    }

    // H1
    if (/^# [^#]/.test(line)) {
      blocks.push(
        <h1 key={`h1${i}`} className="text-[15px] font-bold text-white mt-3 mb-1.5 first:mt-0 leading-snug">
          {renderInline(line.slice(2))}
        </h1>
      )
      i++
      continue
    }

    // H2
    if (/^## [^#]/.test(line)) {
      blocks.push(
        <h2 key={`h2${i}`} className="text-[13px] font-bold text-white mt-3 mb-1 first:mt-0 pb-1 border-b border-white/10">
          {renderInline(line.slice(3))}
        </h2>
      )
      i++
      continue
    }

    // H3
    if (/^### [^#]/.test(line)) {
      blocks.push(
        <h3 key={`h3${i}`} className="text-[12px] font-semibold text-[#FF7000] uppercase tracking-wide mt-2.5 mb-1 first:mt-0">
          {renderInline(line.slice(4))}
        </h3>
      )
      i++
      continue
    }

    // H4
    if (/^#### /.test(line)) {
      blocks.push(
        <h4 key={`h4${i}`} className="text-[12px] font-semibold text-white/80 mt-2 mb-0.5 first:mt-0">
          {renderInline(line.slice(5))}
        </h4>
      )
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push(
        <blockquote key={`bq${i}`} className="border-l-2 border-[#FF7000]/50 pl-3 my-1.5 text-white/65 italic text-[12px]">
          {renderInline(line.slice(2))}
        </blockquote>
      )
      i++
      continue
    }

    // Bullet list — collect consecutive items
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push(
        <ul key={`ul${i}`} className="space-y-1.5 my-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5 items-start">
              <span className="mt-[7px] shrink-0 h-1.5 w-1.5 rounded-full bg-[#FF7000]/70" />
              <span className="text-[13px] leading-relaxed text-white/85">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list — collect consecutive items
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s*/, ''))
        i++
      }
      blocks.push(
        <ol key={`ol${i}`} className="space-y-1.5 my-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5 items-start">
              <span className="shrink-0 text-[#FF7000]/80 text-[12px] font-bold min-w-[1.4rem] leading-relaxed">
                {j + 1}.
              </span>
              <span className="text-[13px] leading-relaxed text-white/85">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Table
    if (line.trim().startsWith('|') && line.includes('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
      if (rows.length > 0) {
        const parseRow = (r: string) => r.split('|').map((c) => c.trim()).filter(Boolean)
        const header = parseRow(rows[0])
        const body = rows.slice(1)
        blocks.push(
          <div key={`tbl${i}`} className="overflow-x-auto my-2.5 rounded-xl border border-white/8">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {header.map((h, j) => (
                    <th key={j} className="px-3 py-2 text-left font-semibold text-[#FF7000] whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-white/75 align-top leading-relaxed">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Empty line → small spacer
    if (!line.trim()) {
      blocks.push(<div key={`sp${i}`} className="h-1.5" />)
      i++
      continue
    }

    // Regular paragraph
    blocks.push(
      <p key={`p${i}`} className="text-[13px] leading-relaxed text-white/85">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className="space-y-0.5">{blocks}</div>
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center h-5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[#FF7000]/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  )
}

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'How do I create a lead?',
  'What is the advance payment rule?',
  'How does QC work?',
  'What can a Sales Executive do?',
]

// ── Main Widget ───────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm the **AOTIC Assistant**.\n\nAsk me anything about the platform — roles, workflows, modules, permissions, or how to use any feature.",
}

export function ChatbotWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const messagesEndRef           = useRef<HTMLDivElement>(null)
  const inputRef                 = useRef<HTMLTextAreaElement>(null)
  const abortRef                 = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    setLoading(true)

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg }
    const botId = crypto.randomUUID()
    const botMsg: Message = { id: botId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, botMsg])

    abortRef.current = new AbortController()

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
        signal: abortRef.current.signal,
      })

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const snap = accumulated
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, content: snap, streaming: true } : m))
        )
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { ...m, content: accumulated, streaming: false } : m))
      )
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const errText = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId ? { ...m, content: `*Error: ${errText}*`, streaming: false } : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleClose() {
    abortRef.current?.abort()
    setOpen(false)
  }

  function clearChat() {
    abortRef.current?.abort()
    setLoading(false)
    setMessages([WELCOME])
  }

  const showSuggestions = messages.length === 1

  return (
    <>
      {/* ── Floating trigger ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AOTIC Assistant"
        className={cn(
          'fixed bottom-[4.5rem] right-5 z-50 flex items-center gap-2 rounded-full',
          'bg-[#FF7000] text-white shadow-xl px-4 py-2.5 text-[13px] font-semibold',
          'hover:bg-[#e66500] active:scale-95 transition-all duration-200',
          open ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100',
        )}
      >
        <Bot className="h-4 w-4" />
        Ask AI
      </button>

      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Sidebar drawer ── */}
      <div
        className={cn(
          'fixed top-0 right-0 z-[70] h-screen flex flex-col',
          'bg-[#141414] border-l border-white/8 shadow-2xl',
          'w-[420px] max-w-[100vw]',
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#FF7000] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-white leading-none">AOTIC Assistant</p>
              <p className="text-[11px] text-white/70 leading-none mt-0.5">Powered by your docs</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              title="New conversation"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            >
              <RotateCcw className="h-[15px] w-[15px]" />
            </button>
            <button
              onClick={handleClose}
              aria-label="Close assistant"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            >
              <X className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start items-start')}
            >
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-[#FF7000]/15 border border-[#FF7000]/25 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-[#FF7000]" />
                </div>
              )}
              <div
                className={cn(
                  'rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-[#FF7000] text-white rounded-tr-sm max-w-[80%] text-[13px] leading-relaxed'
                    : 'bg-[#1e1e1e] text-white/90 rounded-tl-sm border border-white/8 flex-1 min-w-0',
                )}
              >
                {msg.role === 'assistant' && msg.streaming && !msg.content ? (
                  <TypingDots />
                ) : (
                  <MarkdownMessage content={msg.content || ''} />
                )}
                {msg.role === 'assistant' && msg.streaming && msg.content && (
                  <span className="inline-block w-0.5 h-3.5 bg-[#FF7000]/60 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          ))}

          {/* Suggested prompts — shown only when chat is fresh */}
          {showSuggestions && (
            <div className="pt-2">
              <p className="text-[11px] text-white/30 mb-2 px-0.5 uppercase tracking-wide font-medium">
                Suggested questions
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className={cn(
                      'text-left text-[12px] text-white/60 px-3 py-2 rounded-xl',
                      'bg-white/4 border border-white/8 hover:border-[#FF7000]/40',
                      'hover:text-white hover:bg-[#FF7000]/8 transition-all',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-white/8 flex-shrink-0 bg-[#0e0e0e]">
          <div className="flex items-end gap-2 bg-[#1e1e1e] border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#FF7000]/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any feature, role, or workflow…"
              rows={1}
              className={cn(
                'flex-1 resize-none bg-transparent',
                'text-[13px] text-white placeholder:text-white/25',
                'focus:outline-none leading-relaxed',
                'max-h-28',
              )}
              style={{ scrollbarWidth: 'none' }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send"
              className={cn(
                'flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-all mb-0.5',
                input.trim() && !loading
                  ? 'bg-[#FF7000] text-white hover:bg-[#e66500] active:scale-95'
                  : 'text-white/20 cursor-not-allowed',
              )}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-1.5 px-0.5">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </>
  )
}
