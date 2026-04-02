'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createJobCard } from '@/lib/actions/job-cards'
import { SignaturePad } from './signature-pad'
import { BodyConditionMap } from './body-condition-map'

type ConditionMap = Record<string, { condition: string; notes: string }>

type Props = {
  bookingId: string
  regNumber?: string
  errorMsg?: string
}

export function JobCardIntakeForm({ bookingId, regNumber, errorMsg }: Props) {
  const [bodyCondition, setBodyCondition] = useState<ConditionMap>({})
  const [signatureUrl, setSignatureUrl] = useState('')
  const [spareParts, setSpareParts] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('body_condition_map', JSON.stringify(bodyCondition))
    fd.set('intake_signature_url', signatureUrl)
    fd.set('spare_parts_check', String(spareParts))
    startTransition(async () => { await createJobCard(fd) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <input type="hidden" name="booking_id" value={bookingId} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Registration Number <span className="text-destructive">*</span></Label>
            <Input
              name="reg_number"
              defaultValue={regNumber ?? ''}
              required
              placeholder="MH 01 AB 1234"
              className="uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Odometer Reading <span className="text-xs text-muted-foreground">(km)</span></Label>
            <Input name="odometer_reading" type="number" min={0} placeholder="e.g. 12000" />
          </div>
          <div className="space-y-1.5">
            <Label>Bay Number</Label>
            <Input name="bay_number" placeholder="e.g. Bay 3" />
          </div>
          <div className="space-y-1.5">
            <Label>Estimated Completion</Label>
            <Input
              name="estimated_completion"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Body Condition Map</CardTitle></CardHeader>
        <CardContent>
          <BodyConditionMap onChange={setBodyCondition} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <input
              id="spare_parts_check"
              type="checkbox"
              checked={spareParts}
              onChange={(e) => setSpareParts(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="spare_parts_check" className="font-normal cursor-pointer">
              Spare parts / tools present in vehicle
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Concerns</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            name="customer_concerns"
            placeholder="Describe what the customer wants done or any specific requests..."
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea name="notes" placeholder="Internal notes for the workshop team..." rows={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Signature</CardTitle></CardHeader>
        <CardContent>
          <SignaturePad onCapture={setSignatureUrl} value={signatureUrl} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating Job Card...' : 'Create Job Card'}
      </Button>
    </form>
  )
}
