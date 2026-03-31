'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateFaultStatus } from '@/lib/actions/faults'

const STATUS_FLOW: Record<string, { next: string; label: string }[]> = {
  open:              [{ next: 'under_review', label: 'Start Review' }, { next: 'resolved', label: 'Mark Resolved' }],
  under_review:      [{ next: 'rework_scheduled', label: 'Schedule Rework' }, { next: 'resolved', label: 'Mark Resolved' }],
  rework_scheduled:  [{ next: 'resolved', label: 'Mark Resolved' }],
}

export function FaultResolutionForm({ faultId, currentStatus }: { faultId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const actions = STATUS_FLOW[currentStatus] ?? []
  if (actions.length === 0) return null

  function runAction(nextStatus: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateFaultStatus(faultId, nextStatus, notes || undefined)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes (optional)"
        className="text-sm min-h-[60px]"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        {actions.map(({ next, label }) => (
          <Button
            key={next}
            size="sm"
            variant={next === 'resolved' ? 'default' : 'outline'}
            disabled={isPending}
            onClick={() => runAction(next)}
          >
            {isPending ? 'Updating...' : label}
          </Button>
        ))}
      </div>
    </div>
  )
}
