'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { recordPayment } from '@/lib/actions/invoices'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'emi', label: 'EMI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

type Props = {
  invoiceId: string
  amountDue: number
}

export function PaymentForm({ invoiceId, amountDue }: Props) {
  const [method, setMethod] = useState('cash')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('invoice_id', invoiceId)
    fd.set('payment_method', method)
    setError('')
    startTransition(async () => {
      const result = await recordPayment(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Amount <span className="text-destructive">*</span></Label>
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={amountDue}
            defaultValue={amountDue}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="payment_method" value={method} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Reference No. <span className="text-xs text-muted-foreground">(UPI/bank/cheque)</span></Label>
        <Input name="reference_no" placeholder="Optional" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input name="notes" placeholder="Optional" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Recording...' : 'Record Payment'}
      </Button>
    </form>
  )
}
