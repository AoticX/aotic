'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { SignaturePad } from './signature-pad'
import { markDelivered } from '@/lib/actions/invoices'
import { CheckCircle2 } from 'lucide-react'

const DELIVERY_CHECKLIST = [
  'Car is cleaned and detailed',
  'Demo of installed items given to customer',
  'Invoice explained and copy handed over',
  'Warranty card / documentation handed over',
  'Old parts / removed items returned to customer (if applicable)',
]

type Props = {
  jobCardId: string
}

export function DeliverySignOff({ jobCardId }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [signature, setSignature] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const allChecked = DELIVERY_CHECKLIST.every((_, i) => checked[i])

  function toggle(i: number) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  function handleDeliver() {
    if (!allChecked) { setError('Complete all delivery checklist items.'); return }
    if (!signature) { setError('Customer signature is required.'); return }
    setError('')
    startTransition(async () => {
      const result = await markDelivered(jobCardId, signature)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {DELIVERY_CHECKLIST.map((item, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer">
            <div
              className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                checked[i] ? 'border-green-500 bg-green-500' : 'border-input'
              }`}
              onClick={() => toggle(i)}
            >
              {checked[i] && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
            <span
              className={`text-sm ${checked[i] ? 'line-through text-muted-foreground' : ''}`}
              onClick={() => toggle(i)}
            >
              {item}
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Customer Signature at Handover <span className="text-destructive">*</span></p>
        <SignaturePad onCapture={setSignature} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full"
        onClick={handleDeliver}
        disabled={isPending || !allChecked}
      >
        {isPending ? 'Processing...' : 'Confirm Delivery'}
      </Button>
    </div>
  )
}
