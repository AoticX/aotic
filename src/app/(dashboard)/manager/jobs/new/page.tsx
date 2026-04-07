import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobCardIntakeForm } from '@/components/job-cards/job-card-intake-form'

const ACTIVE_JOB_STATUSES = [
  'created', 'in_progress', 'pending_qc',
  'qc_passed', 'rework_scheduled',
  'ready_for_billing', 'ready_for_delivery',
]

export default async function NewJobCardPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; error?: string }>
}) {
  const { booking: bookingId, error } = await searchParams
  if (!bookingId) redirect('/manager/jobs')

  const supabase = await createClient()
  // Use service client to bypass RLS — explicit permission check below
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profileData as { role: string } | null)?.role ?? ''

  const { data } = await service
    .from('bookings')
    .select('id, status, created_by, advance_pct, advance_override_by, notes, quotation_id, customers(full_name, car_model), quotations(total_amount, notes), leads(car_reg_no)')
    .eq('id', bookingId)
    .single()

  if (!data) notFound()

  const b = data as {
    id: string
    status: string
    created_by: string | null
    advance_pct: number
    advance_override_by: string | null
    notes: string | null
    quotation_id: string | null
    customers: { full_name: string; car_model: string | null } | null
    quotations: { total_amount: number; notes: string | null } | null
    leads: { car_reg_no: string | null } | null
  }

  const canCreate = ['owner', 'branch_manager'].includes(role) || b.created_by === user.id
  if (!canCreate) {
    redirect(`/sales/bookings/${bookingId}?error=Only+booking+creator%2C+manager+or+owner+can+create+job+card`)
  }

  const hasOverride = !!b.advance_override_by
  const meetsMinimum = Number(b.advance_pct) >= 50

  if (!meetsMinimum && !hasOverride) {
    redirect(`/sales/bookings/${bookingId}?error=Cannot+create+job+card:+50%25+advance+not+met`)
  }

  const cust = b.customers as { full_name: string; car_model: string | null } | null
  const quot = b.quotations as { total_amount: number; notes: string | null } | null

  // Fetch all queries in parallel
  const [techsRes, qcRes, activeTechJobsRes, activeQcJobsRes, quotationItemsRes] = await Promise.all([
    // All active technicians
    service.from('profiles')
      .select('id, full_name')
      .eq('role', 'workshop_technician')
      .eq('is_active', true)
      .order('full_name'),
    // All active QC / supervisors
    service.from('profiles')
      .select('id, full_name')
      .in('role', ['qc_inspector', 'branch_manager', 'owner'])
      .eq('is_active', true)
      .order('full_name'),
    // Active job assignments for technicians
    service.from('job_cards')
      .select('assigned_to')
      .in('status', ACTIVE_JOB_STATUSES)
      .not('assigned_to', 'is', null),
    // Active job assignments for QC
    service.from('job_cards')
      .select('supervised_by')
      .in('status', ACTIVE_JOB_STATUSES)
      .not('supervised_by', 'is', null),
    // Quotation items if quotation_id available
    b.quotation_id
      ? service.from('quotation_items')
          .select('id, description, quantity, line_total, service_vertical, tier, segment')
          .eq('quotation_id', b.quotation_id)
          .order('sort_order')
      : Promise.resolve({ data: [] }),
  ])

  const allTechs = (techsRes.data ?? []) as Array<{ id: string; full_name: string }>
  const allQc = (qcRes.data ?? []) as Array<{ id: string; full_name: string }>

  // Build sets of busy IDs
  const busyTechIds = new Set(
    ((activeTechJobsRes.data ?? []) as Array<{ assigned_to: string }>)
      .map((r) => r.assigned_to)
  )
  const busyQcIds = new Set(
    ((activeQcJobsRes.data ?? []) as Array<{ supervised_by: string }>)
      .map((r) => r.supervised_by)
  )

  // Filter to only available staff
  const technicians = allTechs.filter((t) => !busyTechIds.has(t.id))
  const qcInspectors = allQc.filter((q) => !busyQcIds.has(q.id))

  const quotationItems = (quotationItemsRes.data ?? []) as Array<{
    id: string
    description: string
    quantity: number
    line_total: number
    service_vertical: string | null
    tier: string | null
    segment: string | null
  }>

  // Combine booking notes + quotation notes for prefill
  const combinedNotes = [b.notes, quot?.notes].filter(Boolean).join('\n').trim() || null

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">New Job Card</h1>
        <p className="text-sm text-muted-foreground">
          {cust?.full_name}
          {quot ? ` — Rs. ${Number(quot.total_amount).toLocaleString('en-IN')}` : ''}
          {cust?.car_model ? ` · ${cust.car_model}` : ''}
        </p>
      </div>

      {technicians.length === 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">No technicians available</p>
          <p className="text-xs mt-0.5">All technicians are currently assigned to active jobs. Complete a current job to free up a technician.</p>
        </div>
      )}
      {qcInspectors.length === 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">No QC inspectors available</p>
          <p className="text-xs mt-0.5">All QC inspectors are currently assigned to active jobs.</p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Vehicle Intake</CardTitle>
        </CardHeader>
        <CardContent>
          <JobCardIntakeForm
            bookingId={bookingId}
            errorMsg={error}
            technicians={technicians}
            qcInspectors={qcInspectors}
            quotationItems={quotationItems}
            prefillNotes={combinedNotes}
            regNumber={(b.leads as { car_reg_no: string | null } | null)?.car_reg_no ?? undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}
