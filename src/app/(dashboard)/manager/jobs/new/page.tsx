import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobCardIntakeForm } from '@/components/job-cards/job-card-intake-form'

export default async function NewJobCardPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; error?: string }>
}) {
  const { booking: bookingId, error } = await searchParams
  if (!bookingId) redirect('/manager/jobs')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profileData as { role: string } | null)?.role ?? ''

  const { data } = await db
    .from('bookings')
    .select('id, status, created_by, advance_pct, advance_override_by, customers(full_name), quotations(total_amount)')
    .eq('id', bookingId)
    .single()

  if (!data) notFound()

  const b = data as {
    id: string
    status: string
    created_by: string | null
    advance_pct: number
    advance_override_by: string | null
    customers: { full_name: string } | null
    quotations: { total_amount: number } | null
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

  const cust = b.customers as { full_name: string } | null
  const quot = b.quotations as { total_amount: number } | null

  const [techsRes, qcRes] = await Promise.all([
    db.from('profiles').select('id, full_name').eq('role', 'workshop_technician').eq('is_active', true).order('full_name'),
    db.from('profiles').select('id, full_name').in('role', ['qc_inspector', 'branch_manager', 'owner']).eq('is_active', true).order('full_name'),
  ])

  const technicians = (techsRes.data ?? []) as Array<{ id: string; full_name: string }>
  const qcInspectors = (qcRes.data ?? []) as Array<{ id: string; full_name: string }>

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">New Job Card</h1>
        <p className="text-sm text-muted-foreground">
          {cust?.full_name}
          {quot ? ` — Rs. ${Number(quot.total_amount).toLocaleString('en-IN')}` : ''}
        </p>
      </div>

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
          />
        </CardContent>
      </Card>
    </div>
  )
}
