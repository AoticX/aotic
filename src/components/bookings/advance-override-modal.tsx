'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBookingWithOverride } from '@/lib/actions/bookings'
import { AlertTriangle } from 'lucide-react'

type Props = {
  quotationId: string
  leadId: string
  customerId: string
  totalValue: number
  advanceAmount: number
  paymentMethod: string
  onClose: () => void
  promisedDelivery?: string
  proofUrl?: string
  referenceNumber?: string
  notes?: string
}

export function AdvanceOverrideModal({
  quotationId, leadId, customerId, totalValue,
  advanceAmount, paymentMethod, onClose,
  promisedDelivery, proofUrl, referenceNumber, notes,
}: Props) {
  const [reason, setReason] = useState('')
  const [delivery, setDelivery] = useState(promisedDelivery ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const advancePct = totalValue > 0 ? (advanceAmount / totalValue) * 100 : 0

  function handleSubmit() {
    if (reason.length < 20) { setError('Reason must be at least 20 characters.'); return }
    if (!delivery) { setError('Promised delivery date is required.'); return }
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('quotation_id', quotationId)
      fd.set('lead_id', leadId)
      fd.set('customer_id', customerId)
      fd.set('total_value', String(totalValue))
      fd.set('advance_amount', String(advanceAmount))
      fd.set('advance_payment_method', paymentMethod)
      fd.set('promised_delivery_at', delivery)
      fd.set('override_reason', reason)
      fd.set('proof_url', proofUrl ?? '')
      fd.set('reference_number', referenceNumber ?? '')
      fd.set('notes', notes ?? '')
      const result = await createBookingWithOverride(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Advance Override — Manager Authorization
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Advance collected: <span className="font-semibold text-foreground">Rs. {advanceAmount.toLocaleString('en-IN')} ({advancePct.toFixed(1)}%)</span></p>
          <p>This override is audit-logged with your credentials.</p>
        </div>
        <div className="space-y-4 py-2">
          {!promisedDelivery && (
            <div className="space-y-1.5">
              <Label>Promised Delivery Date <span className="text-destructive">*</span></Label>
              <input
                type="date"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Override Reason <span className="text-destructive">*</span> <span className="text-muted-foreground text-xs">(min 20 chars)</span></Label>
            <Textarea
              placeholder="Explain why the advance requirement is being waived..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{reason.length} chars</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isPending || reason.length < 20 || !delivery}
          >
            {isPending ? 'Saving...' : 'Override & Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
