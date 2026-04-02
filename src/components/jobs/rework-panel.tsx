'use client'

import { useState, useTransition } from 'react'
import { startReworkCycle } from '@/lib/actions/job-cards'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'

export function ReworkPanel({ jobCardId }: { jobCardId: string }) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notes.trim()) {
      setError('Rework notes are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await startReworkCycle(jobCardId, notes, deadline || null)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <p className="text-sm font-semibold">Rework Required — QC Failed</p>
      </div>
      <p className="text-xs text-amber-700">
        Add rework notes and a new target completion date, then dispatch back to the technician.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Rework Notes <span className="text-destructive">*</span></Label>
          <Textarea
            placeholder="Describe what needs to be reworked..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">New Completion Deadline</Label>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Dispatching...' : 'Start Rework'}
        </Button>
      </form>
    </div>
  )
}
