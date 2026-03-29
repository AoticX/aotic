'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { approveDiscount } from '@/lib/actions/quotations'
import { AlertTriangle } from 'lucide-react'

type PendingApproval = {
  id: string
  quotation_id: string
  requested_pct: number
  reason_notes: string | null
  quotations: { leads: { contact_name: string } | null } | null
  discount_reasons: { label: string } | null
}

export function DiscountApprovalPanel({ items }: { items: PendingApproval[] }) {
  if (!items.length) return null

  return (
    <Card className="border-amber-300/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Pending Discount Approvals
          <Badge variant="warning">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ApprovalRow key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  )
}

function ApprovalRow({ item }: { item: PendingApproval }) {
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const customerName = (item.quotations as { leads: { contact_name: string } | null } | null)?.leads?.contact_name ?? 'Unknown'
  const reasonLabel = (item.discount_reasons as { label: string } | null)?.label ?? '—'

  function handle(approved: boolean) {
    startTransition(async () => {
      await approveDiscount(item.id, item.quotation_id, approved, notes)
    })
  }

  return (
    <div className="rounded-md border p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{customerName}</p>
          <p className="text-xs text-muted-foreground">{item.requested_pct}% discount — {reasonLabel}</p>
          {item.reason_notes && <p className="text-xs text-muted-foreground mt-0.5">{item.reason_notes}</p>}
        </div>
        <Badge variant="warning" className="text-xs">{item.requested_pct}% off</Badge>
      </div>
      <Textarea
        placeholder="Review notes (optional)..."
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => handle(true)} disabled={isPending} className="h-7 text-xs">Approve</Button>
        <Button size="sm" variant="destructive" onClick={() => handle(false)} disabled={isPending} className="h-7 text-xs">Reject</Button>
      </div>
    </div>
  )
}
