'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LeadSchema, type LeadInput } from '@/lib/validations'
import { updateLead } from '@/lib/actions/leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Vertical = { id: string; name: string }

const SOURCES = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
]

type LeadDefaults = {
  id: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  car_model: string | null
  car_reg_no: string | null
  estimated_budget: number | null
  source: LeadInput['source']
  status: LeadInput['status']
  vertical_id: string | null
  notes: string | null
}

export function LeadEditForm({
  lead,
  verticals,
  initialVerticalIds,
  errorMsg,
}: {
  lead: LeadDefaults
  verticals: Vertical[]
  initialVerticalIds: string[]
  errorMsg?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>(initialVerticalIds)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LeadInput>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      contact_name: lead.contact_name,
      contact_phone: lead.contact_phone,
      contact_email: lead.contact_email ?? '',
      car_model: lead.car_model ?? '',
      car_reg_no: lead.car_reg_no ?? '',
      estimated_budget: lead.estimated_budget ?? undefined,
      source: lead.source,
      status: lead.status,
      vertical_id: initialVerticalIds[0] ?? lead.vertical_id ?? undefined,
      notes: lead.notes ?? '',
    },
  })

  function toggleVertical(id: string) {
    const next = selectedVerticals.includes(id)
      ? selectedVerticals.filter((v) => v !== id)
      : [...selectedVerticals, id]
    setSelectedVerticals(next)
    setValue('vertical_id', next[0] ?? undefined)
  }

  function onSubmit(data: LeadInput) {
    startTransition(async () => {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.set(k, String(v))
      })
      fd.set('vertical_ids', JSON.stringify(selectedVerticals))
      await updateLead(lead.id, fd)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name <span className="text-destructive">*</span></Label>
          <Input placeholder="Customer name" {...register('contact_name')} />
          {errors.contact_name && <p className="text-xs text-destructive">{errors.contact_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Phone <span className="text-destructive">*</span></Label>
          <Input placeholder="+91 98765 43210" {...register('contact_phone')} />
          {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" placeholder="customer@email.com" {...register('contact_email')} />
        </div>
        <div className="space-y-1.5">
          <Label>Car Model</Label>
          <Input placeholder="e.g. Hyundai Creta" {...register('car_model')} />
        </div>
        <div className="space-y-1.5">
          <Label>Registration No.</Label>
          <Input placeholder="MH 01 AB 1234" {...register('car_reg_no')} />
        </div>
        <div className="space-y-1.5">
          <Label>Estimated Budget</Label>
          <Input type="number" placeholder="0.00" step="0.01" {...register('estimated_budget', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Source <span className="text-destructive">*</span></Label>
          <Select defaultValue={lead.source} onValueChange={(v) => setValue('source', v as LeadInput['source'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Multi-vertical picker */}
      {verticals.length > 0 && (
        <div className="space-y-2">
          <Label>Service Verticals <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
          <div className="flex flex-wrap gap-2">
            {verticals.map((v) => {
              const selected = selectedVerticals.includes(v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVertical(v.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  )}
                >
                  {v.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea placeholder="Additional notes..." rows={3} {...register('notes')} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
