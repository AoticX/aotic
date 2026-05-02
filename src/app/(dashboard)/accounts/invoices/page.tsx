import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TallyExportButton } from '@/components/invoices/tally-export-button'
import { FilePlus, AlertCircle } from 'lucide-react'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_paid: number
  amount_due: number
  created_at: string
  customer_name: string | null
  customer_phone: string | null
  customer_id: string | null
}

type PendingJob = {
  id: string
  reg_number: string | null
  status: string
  contact_name: string | null
  advance_amount: number
  advance_payment_method: string | null
}

const STATUS_VARIANT: Record<string, string> = {
  draft: 'secondary',
  finalized: 'info',
  partially_paid: 'warning',
  paid: 'success',
  void: 'destructive',
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Fetch invoices and pending jobs in parallel
  let invoiceQuery = db
    .from('invoices')
    .select('id, invoice_number, status, total_amount, amount_paid, amount_due, created_at, customer_name, customer_phone, customer_id')
    .order('created_at', { ascending: false })
  if (status) invoiceQuery = invoiceQuery.eq('status', status)

  // Jobs that have passed QC (or are ready_for_billing) but have no invoice yet
  const [{ data: invoiceData }, { data: jobData }] = await Promise.all([
    invoiceQuery.limit(200),
    db
      .from('job_cards')
      .select('id, reg_number, status, bookings(lead_id, advance_amount, advance_payment_method, leads(contact_name, customer_name))')
      .in('status', ['qc_passed', 'ready_for_billing'])
      .is('invoices.id', null)
      .order('created_at', { ascending: false }),
  ])

  const invoices = (invoiceData ?? []) as Invoice[]

  // Filter to jobs that genuinely have no invoice
  const allJobIds = ((jobData ?? []) as { id: string }[]).map(j => j.id)
  let pendingJobs: PendingJob[] = []

  if (allJobIds.length > 0) {
    const { data: invoicedJobIds } = await db
      .from('invoices')
      .select('job_card_id')
      .in('job_card_id', allJobIds)
      .not('job_card_id', 'is', null)

    const invoicedSet = new Set(((invoicedJobIds ?? []) as { job_card_id: string }[]).map(r => r.job_card_id))

    pendingJobs = ((jobData ?? []) as {
      id: string
      reg_number: string | null
      status: string
      bookings: {
        lead_id: string | null
        advance_amount: number
        advance_payment_method: string | null
        leads: { contact_name: string | null; customer_name: string | null } | null
      } | null
    }[])
      .filter(j => !invoicedSet.has(j.id))
      .map(j => ({
        id: j.id,
        reg_number: j.reg_number,
        status: j.status,
        contact_name: j.bookings?.leads?.contact_name ?? j.bookings?.leads?.customer_name ?? null,
        advance_amount: Number(j.bookings?.advance_amount ?? 0),
        advance_payment_method: j.bookings?.advance_payment_method ?? null,
      }))
  }

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Finalized', value: 'finalized' },
    { label: 'Partial', value: 'partially_paid' },
    { label: 'Paid', value: 'paid' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} result{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <TallyExportButton />
      </div>

      {/* Ready for billing banner */}
      {pendingJobs.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {pendingJobs.length} job{pendingJobs.length !== 1 ? 's' : ''} ready for billing — invoice not yet created
          </div>
          <div className="space-y-2">
            {pendingJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 bg-white rounded-md border border-amber-100 px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{job.contact_name ?? 'Unknown Customer'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {job.reg_number && (
                        <span className="text-xs font-mono text-muted-foreground">{job.reg_number}</span>
                      )}
                      <Badge variant="warning" className="text-[10px]">{job.status.replace('_', ' ')}</Badge>
                      {job.advance_amount > 0 && (
                        <span className="text-xs text-muted-foreground capitalize">
                          Advance: Rs. {job.advance_amount.toLocaleString('en-IN')} ({job.advance_payment_method?.replace('_', ' ')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/accounts/invoices/new?job_card_id=${job.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 shrink-0">
                    <FilePlus className="h-3.5 w-3.5" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b flex-wrap">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/accounts/invoices?status=${tab.value}` : '/accounts/invoices'}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              (status ?? '') === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link href={`/accounts/invoices/${inv.id}`} className="font-mono text-sm font-medium hover:underline">
                    {inv.invoice_number}
                  </Link>
                </TableCell>
                <TableCell>
                  {inv.customer_id ? (
                    <Link href={`/accounts/clients/${inv.customer_id}`} className="hover:underline">
                      <p className="font-medium">{inv.customer_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{inv.customer_phone}</p>
                    </Link>
                  ) : (
                    <>
                      <p className="font-medium">{inv.customer_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{inv.customer_phone}</p>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right">Rs. {Number(inv.total_amount).toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-right text-green-600">Rs. {Number(inv.amount_paid).toLocaleString('en-IN')}</TableCell>
                <TableCell className={`text-right ${Number(inv.amount_due) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  Rs. {Number(inv.amount_due).toLocaleString('en-IN')}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={(STATUS_VARIANT[inv.status] ?? 'secondary') as 'secondary' | 'info' | 'warning' | 'success' | 'destructive'}
                    className="text-xs capitalize"
                  >
                    {inv.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(inv.created_at).toLocaleDateString('en-IN')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
