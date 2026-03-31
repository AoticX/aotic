'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { logCommunication, type CommType } from '@/lib/actions/communications'
import { Phone, MessageCircle, MapPin, Mail, FileText, Plus } from 'lucide-react'

const COMM_TYPES: { value: CommType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'call',      label: 'Phone Call',  icon: Phone },
  { value: 'whatsapp',  label: 'WhatsApp',    icon: MessageCircle },
  { value: 'visit',     label: 'Visit',       icon: MapPin },
  { value: 'email',     label: 'Email',       icon: Mail },
  { value: 'note',      label: 'Note',        icon: FileText },
]

type CommEntry = {
  id: string
  type: CommType
  notes: string
  created_at: string
  profiles: { full_name: string | null } | null
}

export function CommunicationLog({
  leadId,
  entries,
}: {
  leadId: string
  entries: CommEntry[]
}) {
  const [type, setType] = useState<CommType>('call')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const result = await logCommunication(leadId, type, notes)
      if (result?.error) { setError(result.error); return }
      setNotes('')
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Activity Log</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((p) => !p)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Log Activity
        </Button>
      </div>

      {showForm && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Select value={type} onValueChange={(v) => setType(v as CommType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Textarea
                placeholder="What happened? Key points discussed..."
                rows={2}
                className="text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" disabled={isPending || !notes.trim()} onClick={handleSubmit}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground italic">No activity logged yet.</p>
      )}

      <div className="space-y-2">
        {entries.map((entry) => {
          const commType = COMM_TYPES.find((t) => t.value === entry.type)
          const Icon = commType?.icon ?? FileText
          return (
            <div key={entry.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs capitalize">{commType?.label ?? entry.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {entry.profiles?.full_name && (
                    <span className="text-xs text-muted-foreground">· {entry.profiles.full_name}</span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5">{entry.notes}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
