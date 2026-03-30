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

  const { data } = await db
    .from('bookings')
    .select('id, status, advance_pct, advance_override_by, customers(full_name), quotations(total_amount)')
    .eq('id', bookingId)
    .single()

  if (!data) notFound()

  const b = data as {
    id: string
    status: string
    advance_pct: number
    advance_override_by: string | null
    customers: { full_name: string } | null
    quotations: { total_amount: number } | null
  }

  const hasOverride = !!b.advance_override_by
  const meetsMinimum = Number(b.advance_pct) >= 70

  if (!meetsMinimum && !hasOverride) {
    redirect(`/sales/bookings/${bookingId}?error=Cannot+create+job+card:+70%25+advance+not+met`)
  }

  const cust = b.customers as { full_name: string } | null
  const quot = b.quotations as { total_amount: number } | null

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
          <JobCardIntakeForm bookingId={bookingId} errorMsg={error} />
        </CardContent>
      </Card>
    </div>
  )
}
