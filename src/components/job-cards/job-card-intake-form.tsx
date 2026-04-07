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
import { Loader2 } from 'lucide-react'

type ConditionMap = Record<string, { condition: string; notes: string }>

type QuotationItem = {
  id: string
  description: string
  quantity: number
  line_total: number
  service_vertical: string | null
  tier: string | null
  segment: string | null
}

type Props = {
  bookingId: string
  regNumber?: string
  errorMsg?: string
  technicians: Array<{ id: string; full_name: string }>
  qcInspectors: Array<{ id: string; full_name: string }>
  quotationItems?: QuotationItem[]
  prefillNotes?: string | null
}

export function JobCardIntakeForm({
  bookingId, regNumber, errorMsg,
  technicians, qcInspectors,
  quotationItems = [], prefillNotes,
}: Props) {
  const [bodyCondition, setBodyCondition] = useState<ConditionMap>({})
  const [signatureUrl, setSignatureUrl] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('body_condition_map', JSON.stringify(bodyCondition))
    fd.set('intake_signature_url', signatureUrl)
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

      {/* Quoted Services */}
      {quotationItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Services to Perform ({quotationItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {quotationItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between px-4 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.description}</p>
                    {(item.service_vertical || item.tier || item.segment) && (
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {[item.service_vertical, item.tier, item.segment].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="font-medium">Rs. {Number(item.line_total).toLocaleString('en-IN')}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Assignments <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>
              Technician <span className="text-destructive">*</span>
            </Label>
            <select
              name="assigned_to"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                {technicians.length === 0 ? 'No technicians available' : 'Select technician'}
              </option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
            {technicians.length === 0 && (
              <p className="text-xs text-destructive">All technicians are busy with active jobs.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>
              QC Inspector / Supervisor <span className="text-destructive">*</span>
            </Label>
            <select
              name="supervised_by"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                {qcInspectors.length === 0 ? 'No QC inspectors available' : 'Select QC assignee'}
              </option>
              {qcInspectors.map((q) => (
                <option key={q.id} value={q.id}>{q.full_name}</option>
              ))}
            </select>
            {qcInspectors.length === 0 && (
              <p className="text-xs text-destructive">All QC inspectors are busy with active jobs.</p>
            )}
          </div>
        </CardContent>
      </Card>

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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Workshop Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            defaultValue={prefillNotes ?? ''}
            placeholder="Internal notes for the workshop team..."
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Signature</CardTitle></CardHeader>
        <CardContent>
          <SignaturePad onCapture={setSignatureUrl} value={signatureUrl} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating Job Card...</>
          : 'Create Job Card'}
      </Button>
    </form>
  )
}
