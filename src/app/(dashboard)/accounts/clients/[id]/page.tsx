import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Car, Phone, User, IndianRupee, CreditCard, Banknote, Landmark,
  Smartphone, FileArchive, FileText, CheckCircle2, Clock, ArrowLeft,
} from 'lucide-react'

const STATUS_VARIANT: Record<string, string> = {
  draft: 'secondary',
  finalized: 'info',
  partially_paid: 'warning',
  paid: 'success',
  void: 'destructive',
}

function paymentIcon(method: string) {
  if (method === 'cash')         return Banknote
  if (method === 'bank_transfer') return Landmark
  if (['upi', 'gpay'].includes(method)) return Smartphone
  if (method === 'cheque')       return FileArchive
  return CreditCard
}

type ActivityEntry =
  | { kind: 'booking';   date: string; label: string; meta: string; amount: number }
  | { kind: 'invoice';   date: string; label: string; meta: string; href: string }
  | { kind: 'payment';   date: string; label: string; method: string; is_advance: boolean; amount: number; ref: string | null }
  | { kind: 'finalized'; date: string; label: string; meta: string }
  | { kind: 'cleared';   date: string; label: string; meta: string }

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Load all data in parallel
  const [customerRes, invoicesRes, paymentsRes, bookingsRes] = await Promise.all([
    db.from('customers').select('id, full_name, phone, email, car_brand, car_model, car_year').eq('id', id).single(),
    db.from('invoices')
      .select('id, invoice_number, status, total_amount, amount_paid, amount_due, created_at, finalized_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    db.from('payments')
      .select('id, amount, payment_method, payment_date, is_advance, reference_number, notes, invoice_id, created_at')
      .eq('customer_id', id)
      .order('payment_date', { ascending: true }),
    db.from('bookings')
      .select('id, total_amount, advance_amount, advance_payment_method, advance_paid_at, scheduled_date, created_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!customerRes.data) notFound()

  const customer = customerRes.data as {
    id: string; full_name: string | null; phone: string | null; email: string | null
    car_brand: string | null; car_model: string | null; car_year: number | null
  }

  const invoices = (invoicesRes.data ?? []) as {
    id: string; invoice_number: string; status: string
    total_amount: number; amount_paid: number; amount_due: number
    created_at: string; finalized_at: string | null
  }[]

  const payments = (paymentsRes.data ?? []) as {
    id: string; amount: number; payment_method: string
    payment_date: string; is_advance: boolean
    reference_number: string | null; notes: string | null
    invoice_id: string | null; created_at: string
  }[]

  const bookings = (bookingsRes.data ?? []) as {
    id: string; total_amount: number; advance_amount: number
    advance_payment_method: string | null; advance_paid_at: string | null
    scheduled_date: string | null; created_at: string
  }[]

  // Summary stats
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPaid   = invoices.reduce((s, i) => s + Number(i.amount_paid),  0)
  const totalDue    = invoices.reduce((s, i) => s + Number(i.amount_due),   0)

  // Build chronological activity timeline
  const activity: ActivityEntry[] = []

  // Booking advance events
  for (const b of bookings) {
    const date = b.advance_paid_at ?? b.created_at
    if (Number(b.advance_amount) > 0) {
      activity.push({
        kind: 'booking',
        date,
        label: 'Advance paid at booking',
        meta: b.advance_payment_method ?? 'cash',
        amount: Number(b.advance_amount),
      })
    }
  }

  // Invoice creation events
  for (const inv of [...invoices].reverse()) {
    activity.push({
      kind: 'invoice',
      date: inv.created_at,
      label: `Invoice ${inv.invoice_number} created`,
      meta: `Rs. ${Number(inv.total_amount).toLocaleString('en-IN')}`,
      href: `/accounts/invoices/${inv.id}`,
    })
    if (inv.finalized_at) {
      activity.push({
        kind: 'finalized',
        date: inv.finalized_at,
        label: `Invoice ${inv.invoice_number} finalized`,
        meta: `Rs. ${Number(inv.total_amount).toLocaleString('en-IN')}`,
      })
    }
    if (inv.status === 'paid') {
      activity.push({
        kind: 'cleared',
        date: inv.finalized_at ?? inv.created_at,
        label: `Invoice ${inv.invoice_number} fully cleared`,
        meta: `Rs. ${Number(inv.total_amount).toLocaleString('en-IN')} — all dues settled`,
      })
    }
  }

  // Individual payment events
  for (const p of payments) {
    // Skip advance payments that are already represented by booking entries
    if (!p.is_advance) {
      activity.push({
        kind: 'payment',
        date: p.payment_date,
        label: 'Payment recorded',
        method: p.payment_method,
        is_advance: false,
        amount: Number(p.amount),
        ref: p.reference_number,
      })
    }
  }

  // Sort by date ascending
  activity.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/accounts/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All Clients
      </Link>

      {/* Customer header */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-xl font-bold">{customer.full_name ?? '—'}</h1>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{customer.phone}</span>
              </div>
            )}
            {(customer.car_brand || customer.car_model) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Car className="h-3.5 w-3.5" />
                <span>
                  {[customer.car_brand, customer.car_model, customer.car_year].filter(Boolean).join(' ')}
                </span>
              </div>
            )}
          </div>

          {/* Summary badges */}
          <div className="text-right space-y-1 flex-shrink-0">
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-lg font-bold">Rs. {totalBilled.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Invoices</p>
            <p className="font-semibold">{invoices.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Paid</p>
            <p className="font-semibold text-green-600">Rs. {totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Balance Due</p>
            <p className={`font-semibold ${totalDue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              Rs. {totalDue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Invoices table */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/accounts/invoices/${inv.id}`} className="font-mono text-sm font-medium hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      Rs. {Number(inv.total_amount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600">
                      Rs. {Number(inv.amount_paid).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${Number(inv.amount_due) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      {activity.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="h-4 w-4" /> Activity & Payment Log
            </CardTitle>
            {totalDue <= 0 && invoices.length > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 font-medium mt-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                All dues cleared — account fully settled.
              </div>
            )}
            {totalDue > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive font-medium mt-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                Rs. {totalDue.toLocaleString('en-IN')} outstanding across {invoices.filter(i => Number(i.amount_due) > 0).length} invoice(s).
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-muted ml-3 space-y-6 pb-2">
              {activity.map((entry, i) => {
                if (entry.kind === 'booking') {
                  const Icon = paymentIcon(entry.meta)
                  return (
                    <div key={`booking-${i}`} className="relative pl-6">
                      <div className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background bg-amber-100 text-amber-600">
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <p className="text-sm font-medium">{entry.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="warning" className="text-[10px]">Advance</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{entry.meta.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <p className="text-base font-bold text-amber-600 shrink-0">
                          Rs. {entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )
                }

                if (entry.kind === 'invoice') {
                  return (
                    <div key={`invoice-${i}`} className="relative pl-6">
                      <div className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background bg-blue-100 text-blue-600">
                        <FileText className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          <Link href={entry.href} className="hover:underline">{entry.label}</Link>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{entry.meta}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (entry.kind === 'finalized') {
                  return (
                    <div key={`finalized-${i}`} className="relative pl-6">
                      <div className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background bg-sky-100 text-sky-600">
                        <FileText className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{entry.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{entry.meta}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (entry.kind === 'payment') {
                  const Icon = paymentIcon(entry.method)
                  return (
                    <div key={`payment-${i}`} className="relative pl-6">
                      <div className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background bg-green-100 text-green-600">
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <p className="text-sm font-medium">{entry.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] capitalize font-normal text-muted-foreground">
                              {entry.method.replace('_', ' ')}
                            </Badge>
                            {entry.ref && (
                              <span className="text-xs text-muted-foreground font-mono">Ref: {entry.ref}</span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <p className="text-base font-bold text-green-600 shrink-0">
                          Rs. {entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )
                }

                if (entry.kind === 'cleared') {
                  return (
                    <div key={`cleared-${i}`} className="relative pl-6">
                      <div className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-700">{entry.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.meta}</p>
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {invoices.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No invoices found for this client.
        </Card>
      )}
    </div>
  )
}
