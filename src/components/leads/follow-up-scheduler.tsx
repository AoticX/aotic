'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Bell } from 'lucide-react'
import { scheduleFollowUp } from '@/lib/actions/communications'

export function FollowUpScheduler({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const scheduledAt = fd.get('scheduled_at') as string
    const notes = (fd.get('notes') as string) || undefined
    if (!scheduledAt) { setError('Date/time is required'); return }
    setError(null)
    startTransition(async () => {
      const result = await scheduleFollowUp(leadId, scheduledAt, notes)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  // Minimum datetime: now (local)
  const minDate = new Date()
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset())
  const minStr = minDate.toISOString().slice(0, 16)

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Bell className="h-3.5 w-3.5 mr-1.5" />
        Schedule Follow-up
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>Set a reminder to follow up with this lead.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="scheduled_at">Follow-up Date & Time *</Label>
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                min={minStr}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="What to discuss / check on..."
                className="min-h-[60px]"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Scheduling...' : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
