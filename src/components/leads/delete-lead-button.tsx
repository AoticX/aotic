'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteLead } from '@/lib/actions/leads'

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLead(leadId)
      if (result?.error) setError(result.error)
    })
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive max-w-xs">{error}</span>
        <Button size="sm" variant="ghost" onClick={() => { setError(null); setConfirming(false) }}>Dismiss</Button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete this lead?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Deleting…' : 'Yes, Delete'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>Cancel</Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
      <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
    </Button>
  )
}
