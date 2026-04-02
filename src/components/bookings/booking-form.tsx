'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBooking, createBookingWithOverride } from '@/lib/actions/bookings'
import { AdvanceOverrideModal } from './advance-override-modal'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  quotationId: string
  leadId: string
  customerId: string
  totalValue: number
  customerName: string
  isManager: boolean
  errorMsg?: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'gpay', label: 'GPay' },
  { value: 'bajaj', label: 'Bajaj Finserv EMI' },
]

export function BookingForm({ quotationId, leadId, customerId, totalValue, customerName, isManager, errorMsg }: Props) {
  const [advanceAmount, setAdvanceAmount] = useState(Math.ceil(totalValue * 0.5))
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showOverride, setShowOverride] = useState(false)
  const [isPending, startTransition] = useTransition()

  const advancePct = totalValue > 0 ? (advanceAmount / totalValue) * 100 : 0
  const meetsMinimum = advancePct >= 50
  const minAdvance = Math.ceil(totalValue * 0.5)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { await createBooking(fd) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <input type="hidden" name="quotation_id" value={quotationId} />
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="total_value" value={totalValue} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Customer</Label>
          <Input value={customerName} readOnly className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label>Total Job Value</Label>
          <Input value={`Rs. ${totalValue.toLocaleString('en-IN')}`} readOnly className="bg-muted font-medium" />
        </div>
        <div className="space-y-1.5">
          <Label>
            Promised Delivery Date <span className="text-destructive">*</span>
          </Label>
          <Input type="date" name="promised_delivery_at" required min={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="hidden" name="advance_payment_method" value={paymentMethod} />
        </div>
      </div>

      {/* Advance amount — 50% lock */}
      <Card className={cn(!meetsMinimum && 'border-destructive/40 bg-destructive/5')}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>
              Advance Amount <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium', meetsMinimum ? 'text-green-600' : 'text-destructive')}>
                {advancePct.toFixed(1)}%
              </span>
              {meetsMinimum
                ? <Badge variant="success" className="text-xs">Meets 50% minimum</Badge>
                : <Badge variant="destructive" className="text-xs">Below 50% minimum</Badge>
              }
            </div>
          </div>
          <Input
            type="number"
            name="advance_amount"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            min={0}
            max={totalValue}
            step={0.01}
            className={cn(!meetsMinimum && 'border-destructive focus-visible:ring-destructive')}
          />
          {!meetsMinimum && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Minimum advance required: Rs. {minAdvance.toLocaleString('en-IN')} (50%).{' '}
                {isManager
                  ? <button type="button" onClick={() => setShowOverride(true)} className="underline font-medium">Apply manager override</button>
                  : 'Contact your manager to override this requirement.'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea name="notes" placeholder="Any special instructions or notes..." rows={2} />
      </div>

      <Button type="submit" disabled={isPending || !meetsMinimum}>
        {isPending ? 'Confirming...' : 'Confirm Booking'}
      </Button>

      {isManager && showOverride && (
        <AdvanceOverrideModal
          quotationId={quotationId}
          leadId={leadId}
          customerId={customerId}
          totalValue={totalValue}
          advanceAmount={advanceAmount}
          paymentMethod={paymentMethod}
          onClose={() => setShowOverride(false)}
        />
      )}
    </form>
  )
}
