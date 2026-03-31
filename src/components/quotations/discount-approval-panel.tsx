'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { approveDiscount } from '@/lib/actions/quotations'
import { AlertTriangle, ExternalLink } from 'lucide-react'

type PendingApproval = {
  id: string
  quotation_id: string
  requested_pct: number
  reason_notes: string | null
  quotations: { total_amount: number; subtotal: number; leads: { contact_name: string } | null } | null
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

  const customerName = item.quotations?.leads?.contact_name ?? 'Unknown'
  const reasonLabel = item.discount_reasons?.label ?? '—'
  const subtotal = item.quotations?.subtotal ?? 0
  const total = item.quotations?.total_amount ?? 0
  const savedAmount = subtotal * (item.requested_pct / 100)

  function handle(approved: boolean) {
    startTransition(async () => {
      await approveDiscount(item.id, item.quotation_id, approved, notes)
    })
  }

  return (
    <div className="rounded-md border p-3 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-medium">{customerName}</p>
          <p className="text-xs text-muted-foreground">{item.requested_pct}% discount — {reasonLabel}</p>
          {item.reason_notes && <p className="text-xs text-muted-foreground italic">{item.reason_notes}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="warning" className="text-xs">{item.requested_pct}% off</Badge>
          <Link href={`/sales/quotations/${item.quotation_id}`} className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="rounded bg-muted/50 px-3 py-2 text-xs space-y-0.5">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>Rs. {Number(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span>Discount ({item.requested_pct}%)</span>
          <span>- Rs. {Number(savedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-0.5">
          <span>After Discount</span>
          <span>Rs. {Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
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
