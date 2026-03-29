'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateLeadStatus } from '@/lib/actions/leads'

type LostReason = { id: string; label: string }

type Props = {
  leadId: string
  open: boolean
  onClose: () => void
  reasons: LostReason[]
}

export function LostReasonModal({ leadId, open, onClose, reasons }: Props) {
  const [reasonId, setReasonId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!reasonId) { setError('Select a reason'); return }
    setError('')
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, 'lost', reasonId, notes)
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Lead as Lost</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          A reason is required. This action is logged and cannot be undone without an override.
        </p>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Additional notes</Label>
            <Textarea
              placeholder="Optional context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending || !reasonId}>
            {isPending ? 'Saving...' : 'Mark as Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
