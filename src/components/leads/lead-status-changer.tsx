'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LostReasonModal } from './lost-reason-modal'
import { updateLeadStatus } from '@/lib/actions/leads'
import type { LeadStatus } from '@/types/database'

type LostReason = { id: string; label: string }

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
]

export function LeadStatusChanger({
  leadId,
  current,
  reasons,
}: {
  leadId: string
  current: LeadStatus
  reasons: LostReason[]
}) {
  const [status, setStatus] = useState<LeadStatus>(current)
  const [showLostModal, setShowLostModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleChange(val: LeadStatus) {
    if (val === 'lost') { setShowLostModal(true); return }
    setStatus(val)
    startTransition(async () => { await updateLeadStatus(leadId, val) })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => handleChange(v as LeadStatus)} disabled={status === 'lost' || isPending}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <span className="text-xs text-muted-foreground">Saving...</span>}
      </div>

      <LostReasonModal
        leadId={leadId}
        open={showLostModal}
        onClose={() => setShowLostModal(false)}
        reasons={reasons}
      />
    </>
  )
}
