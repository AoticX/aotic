import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LeadEditForm } from '@/components/leads/lead-edit-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Vertical, LeadSource, LeadStatus } from '@/types/database'

export default async function EditLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [leadRes, verticalsRes, leadVerticalsRes] = await Promise.all([
    db.from('leads').select('*').eq('id', id).single(),
    supabase.from('verticals').select('id, name').eq('is_active', true).order('sort_order'),
    db.from('lead_verticals').select('vertical_id').eq('lead_id', id),
  ])

  if (!leadRes.data) notFound()

  const lead = leadRes.data as {
    id: string
    contact_name: string
    contact_phone: string
    contact_email: string | null
    car_brand: string | null
    car_model: string | null
    car_reg_no: string | null
    estimated_budget: number | null
    source: LeadSource
    status: LeadStatus
    vertical_id: string | null
    notes: string | null
  }

  const verticals = (verticalsRes.data ?? []) as Pick<Vertical, 'id' | 'name'>[]
  const initialVerticalIds = ((leadVerticalsRes.data ?? []) as { vertical_id: string }[]).map((r) => r.vertical_id)
  // Fallback: if no junction rows exist but lead has vertical_id, pre-select it
  const effectiveVerticalIds = initialVerticalIds.length > 0
    ? initialVerticalIds
    : lead.vertical_id ? [lead.vertical_id] : []

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/sales/leads/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Edit Lead</h1>
          <p className="text-sm text-muted-foreground">{lead.contact_name}</p>
        </div>
      </div>
      <LeadEditForm
        lead={lead}
        verticals={verticals}
        initialVerticalIds={effectiveVerticalIds}
        errorMsg={error ? decodeURIComponent(error) : undefined}
      />
    </div>
  )
}
