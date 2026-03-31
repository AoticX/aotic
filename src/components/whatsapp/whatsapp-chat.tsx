'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, ChevronDown, Search, User, Phone, CheckCheck } from 'lucide-react'
import { sendWhatsAppMessage } from '@/lib/actions/whatsapp'
import { cn } from '@/lib/utils'

type Lead = {
  id: string
  contact_name: string
  contact_phone: string
  status: string
  vertical_id: string | null
  verticals: { name: string } | null
  lastMessage?: { notes: string | null; created_at: string; type: string } | null
}

type Message = {
  id: string
  lead_id: string
  type: string
  notes: string | null
  created_by: string
  created_at: string
  profiles?: { full_name: string } | null
}

type Template = {
  id: string; name: string; category: string; label: string; body: string; variables: string[]
}

export function WhatsAppChat({
  leads,
  templates,
  initialLeadId,
  currentUserId,
}: {
  leads: Lead[]
  templates: Template[]
  initialLeadId?: string
  currentUserId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages when lead selected
  useEffect(() => {
    if (!selectedLeadId) return

    async function loadMessages() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('communications')
        .select('id, lead_id, type, notes, created_by, created_at, profiles(full_name)')
        .eq('lead_id', selectedLeadId)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
    }
    loadMessages()

    // Realtime subscription for new messages
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`chat-${selectedLeadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'communications', filter: `lead_id=eq.${selectedLeadId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId])

  function selectLead(leadId: string) {
    setSelectedLeadId(leadId)
    setMessages([])
    setSendError('')
    setMessage('')
    setShowTemplates(false)
    const params = new URLSearchParams(searchParams.toString())
    params.set('lead', leadId)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  function applyTemplate(tpl: Template) {
    let body = tpl.body
    if (selectedLead) {
      body = body
        .replace(/\{\{1\}\}/g, selectedLead.contact_name)
        .replace(/\{name\}/gi, selectedLead.contact_name)
        .replace(/\{\{name\}\}/gi, selectedLead.contact_name)
    }
    setMessage(body)
    setShowTemplates(false)
  }

  async function handleSend() {
    if (!selectedLead || !message.trim()) return
    setSending(true)
    setSendError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('to', selectedLead.contact_phone)
      fd.set('message', message.trim())
      fd.set('lead_id', selectedLead.id)
      const result = await sendWhatsAppMessage(fd)
      setSending(false)
      if (result.error) {
        setSendError(result.error)
      } else {
        setMessage('')
      }
    })
  }

  const filtered = leads.filter(
    (l) =>
      l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      l.contact_phone.includes(search)
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-xl overflow-hidden bg-background">
      {/* ─── Left: Lead list ─── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Leads */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No contacts found</p>
          ) : (
            filtered.map((lead) => {
              const isSelected = selectedLeadId === lead.id
              const lastMsg = lead.lastMessage
              return (
                <button
                  key={lead.id}
                  onClick={() => selectLead(lead.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50',
                    isSelected && 'bg-green-50 border-l-2 border-l-green-600'
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
                    {lead.contact_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm font-medium truncate', isSelected && 'text-green-800')}>
                        {lead.contact_name}
                      </p>
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(lastMsg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg?.notes ?? lead.contact_phone}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── Right: Chat pane ─── */}
      {!selectedLead ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <MessageCircle className="h-12 w-12 opacity-20" />
          <p className="text-sm">Select a contact to start chatting</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="h-14 px-4 border-b flex items-center justify-between bg-muted/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-800">
                {selectedLead.contact_name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">{selectedLead.contact_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="h-2.5 w-2.5" />
                  {selectedLead.contact_phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedLead.verticals && (
                <Badge variant="secondary" className="text-xs">{(selectedLead.verticals as { name: string }).name}</Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs capitalize',
                  selectedLead.status === 'new' && 'border-blue-300 text-blue-700',
                  selectedLead.status === 'qualified' && 'border-green-300 text-green-700',
                  selectedLead.status === 'lost' && 'border-red-300 text-red-700',
                )}
              >
                {selectedLead.status}
              </Badge>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#f0fdf4]/30">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <User className="h-8 w-8 opacity-20" />
                <p className="text-sm">No messages yet. Send your first message.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.created_by === currentUserId
                const isWhatsApp = msg.type === 'whatsapp'
                return (
                  <div
                    key={msg.id}
                    className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm',
                        isMine
                          ? 'bg-green-600 text-white rounded-br-sm'
                          : 'bg-white border rounded-bl-sm'
                      )}
                    >
                      {!isMine && (
                        <p className="text-[10px] font-semibold mb-1 opacity-60">
                          {(msg.profiles as { full_name: string } | null)?.full_name ?? 'Staff'}
                        </p>
                      )}
                      {!isWhatsApp && (
                        <Badge className="text-[9px] mb-1 py-0 h-4" variant="secondary">
                          {msg.type}
                        </Badge>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.notes}</p>
                      <div className={cn('flex items-center justify-end gap-1 mt-1', isMine ? 'text-green-200' : 'text-muted-foreground')}>
                        <span className="text-[10px]">
                          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && isWhatsApp && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Template picker dropdown */}
          {showTemplates && (
            <div className="border-t bg-background max-h-52 overflow-y-auto">
              <p className="text-[10px] font-semibold text-muted-foreground px-4 pt-2 pb-1 uppercase tracking-wide">Templates</p>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0"
                >
                  <p className="text-xs font-medium">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{tpl.body}</p>
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="border-t p-3 bg-background flex-shrink-0">
            {sendError && (
              <p className="text-xs text-destructive mb-2 px-1">{sendError}</p>
            )}
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates((v) => !v)}
                className={cn('gap-1 h-9 flex-shrink-0', showTemplates && 'bg-muted')}
              >
                Templates
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showTemplates && 'rotate-180')} />
              </Button>
              <Textarea
                placeholder={`Message ${selectedLead.contact_name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={1}
                className="flex-1 resize-none min-h-9 max-h-32 text-sm py-2"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="h-9 w-9 p-0 flex-shrink-0 bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              Press Enter to send · Shift+Enter for new line · Messages sent via WhatsApp
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
