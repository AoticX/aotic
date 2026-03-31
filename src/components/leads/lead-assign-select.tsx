'use client'

import { useState, useTransition } from 'react'
import { assignLead } from '@/lib/actions/leads'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type SalesExec = { id: string; full_name: string }

export function LeadAssignSelect({
  leadId,
  currentAssignedTo,
  salesExecs,
}: {
  leadId: string
  currentAssignedTo: string | null
  salesExecs: SalesExec[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(userId: string) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await assignLead(leadId, userId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Assigned To</Label>
      <Select
        defaultValue={currentAssignedTo ?? undefined}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          {salesExecs.map((exec) => (
            <SelectItem key={exec.id} value={exec.id}>
              {exec.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-600">Lead reassigned.</p>}
    </div>
  )
}
