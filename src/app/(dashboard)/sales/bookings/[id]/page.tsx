import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type BookingDetail = {
  id: string
  created_by: string | null
  status: string
  advance_amount: number
  advance_pct: number
  advance_payment_method: string
  promised_delivery_at: string | null
  notes: string | null
  advance_override_by: string | null
  advance_override_note: string | null
  created_at: string
  quotations: { id: string; total_amount: number; version: number } | null
  customers: { full_name: string; phone: string } | null
  job_cards: { id: string; status: string; qc_signed_off_by: string | null }[] | null
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null
  const canCreateByRole = ['owner', 'branch_manager', 'sales_executive', 'front_desk'].includes(profile?.role ?? '')

  const { data } = await db
    .from('bookings')
    .select('id, created_by, status, advance_amount, advance_pct, advance_payment_method, promised_delivery_at, notes, advance_override_by, advance_override_note, created_at, quotations(id, total_amount, version), customers(full_name, phone), job_cards(id, status, qc_signed_off_by)')
    .eq('id', id)
    .single()

  if (!data) notFound()
  const b = data as BookingDetail

  const cust = b.customers as { full_name: string; phone: string } | null
  const quot = b.quotations as { id: string; total_amount: number; version: number } | null
  const jobCards = (b.job_cards ?? []) as { id: string; status: string; qc_signed_off_by: string | null }[]
  const hasJobCard = jobCards.length > 0
  // Jobs where QC is done and no invoice yet
  const QC_DONE_STATUSES = ['qc_passed', 'ready_for_billing', 'ready_for_delivery', 'delivered']
  const qcDoneJobs = jobCards.filter(jc => QC_DONE_STATUSES.includes(jc.status) || !!jc.qc_signed_off_by)
  const advancePct = Number(b.advance_pct)
  const meetsMinimum = advancePct >= 50
  const hasOverride = !!b.advance_override_by
  const canCreateJobCard = canCreateByRole || user?.id === b.created_by

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Booking — {cust?.full_name}</h1>
          <p className="text-sm text-muted-foreground">{cust?.phone}</p>
        </div>
        <Badge
          variant={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'destructive' : 'info'}
          className="text-xs capitalize"
        >
          {b.status}
        </Badge>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Advance Status */}
      <div className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        meetsMinimum || hasOverride
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        {meetsMinimum || hasOverride
          ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          : <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
        <div>
          <p className="font-medium">
            Advance: Rs. {Number(b.advance_amount).toLocaleString('en-IN')} ({advancePct.toFixed(1)}%)
            {hasOverride && <span className="ml-2 text-xs font-normal">(Manager Override)</span>}
          </p>
          {hasOverride && b.advance_override_note && (
            <p className="text-xs mt-0.5 opacity-80">Override reason: {b.advance_override_note}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Booking Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Total Job Value</p>
              <p className="font-medium">
                {quot ? `Rs. ${Number(quot.total_amount).toLocaleString('en-IN')}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quotation</p>
              {quot ? (
                <Link href={`/sales/quotations/${quot.id}`} className="font-medium hover:underline">
                  v{quot.version}
                </Link>
              ) : <p>—</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Method</p>
              <p className="capitalize">{b.advance_payment_method}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Promised Delivery</p>
              <p>{b.promised_delivery_at ? new Date(b.promised_delivery_at).toLocaleDateString('en-IN') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Booked On</p>
              <p>{new Date(b.created_at).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          {b.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{b.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Cards */}
      {hasJobCard ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Job Cards</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {jobCards.map((jc) => (
              <div key={jc.id} className="flex items-center justify-between gap-2">
                <Link href={`/manager/jobs/${jc.id}`} className="text-sm font-medium hover:underline">
                  {jc.id.slice(0, 8).toUpperCase()}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-xs capitalize">{jc.status.replace(/_/g, ' ')}</Badge>
                  {(QC_DONE_STATUSES.includes(jc.status) || !!jc.qc_signed_off_by) && jc.status !== 'delivered' && (
                    <Button asChild size="sm" variant="outline" className="h-6 text-xs px-2">
                      <Link href={`/accounts/invoices/new?job_card_id=${jc.id}`}>Invoice</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        canCreateJobCard && (meetsMinimum || hasOverride) && b.status === 'confirmed' && (
          <div className="flex items-center gap-3 rounded-md bg-muted/50 border px-4 py-3">
            <div className="flex-1 text-sm">
              <p className="font-medium">Ready to create job card</p>
              <p className="text-muted-foreground text-xs">Advance requirement satisfied. Vehicle can be taken in.</p>
            </div>
            <Button asChild size="sm">
              <Link href={`/manager/jobs/new?booking=${b.id}`}>Create Job Card</Link>
            </Button>
          </div>
        )
      )}
    </div>
  )
}
