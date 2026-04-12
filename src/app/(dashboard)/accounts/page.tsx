import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TallyExportButton } from '@/components/invoices/tally-export-button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileText, IndianRupee, Clock, ArrowRight } from 'lucide-react'

type RecentPayment = {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  is_advance: boolean
  bookings: { leads: { customer_name: string } | null } | null
  invoices: { invoice_number: string } | null
}

export default async function AccountsDashboard() {
  // Service client required — accounts_finance role is blocked by RLS on invoices/payments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [totalRes, dueRes, paidRes, collectedRes, paymentsRes] = await Promise.all([
    // Total billed across all finalized/paid invoices
    db.from('invoices').select('total_amount').in('status', ['finalized', 'partially_paid', 'paid']),
    // Sum of outstanding balances
    db.from('invoices').select('amount_due').in('status', ['finalized', 'partially_paid']),
    // Count of fully paid invoices
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    // All-time total collected (aggregate over full payments table)
    db.from('payments').select('amount'),
    // Recent 8 payments for the timeline
    db.from('payments')
      .select('id, amount, payment_method, payment_date, is_advance, bookings(leads(customer_name)), invoices(invoice_number)')
      .order('payment_date', { ascending: false })
      .limit(8),
  ])

  const totalBilled = (totalRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + Number(r.total_amount), 0)
  const totalDue = (dueRes.data ?? []).reduce((s: number, r: { amount_due: number }) => s + Number(r.amount_due), 0)
  const paidCount = paidRes.count ?? 0
  // Use the dedicated all-payments query for an accurate total — not just last 8
  const totalCollected = ((collectedRes.data ?? []) as { amount: number }[])
    .reduce((s, r) => s + Number(r.amount), 0)
  const recentPayments = (paymentsRes.data ?? []) as RecentPayment[]

  const stats = [
    { label: 'Total Billed',   value: `Rs. ${totalBilled.toLocaleString('en-IN')}`,     icon: IndianRupee, href: '/accounts/invoices',          warn: false },
    { label: 'Outstanding',    value: `Rs. ${totalDue.toLocaleString('en-IN')}`,         icon: Clock,       href: '/accounts/invoices',          warn: totalDue > 0 },
    { label: 'Total Collected', value: `Rs. ${totalCollected.toLocaleString('en-IN')}`,  icon: IndianRupee, href: '/accounts/payments',          warn: false },
    { label: 'Fully Paid',     value: String(paidCount),                                 icon: FileText,    href: '/accounts/invoices?status=paid', warn: false },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Invoices, payments, and Tally export</p>
        </div>
        <TallyExportButton />
      </div>

      {/* Stat cards — all clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${s.warn ? 'text-destructive' : ''}`}>{s.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/accounts/invoices" className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
          <p className="font-medium">All Invoices</p>
          <p className="text-sm text-muted-foreground">View and manage invoices</p>
        </Link>
        <Link href="/accounts/payments" className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
          <p className="font-medium">Payments</p>
          <p className="text-sm text-muted-foreground">Full payment history</p>
        </Link>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Payments</CardTitle>
            <Link href="/accounts/payments" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => {
                const name = p.bookings?.leads?.customer_name ?? '—'
                const inv = p.invoices
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{(p.payment_method ?? 'cash').replace('_', ' ')}</span>
                        {inv && <span className="text-xs text-muted-foreground font-mono">{inv.invoice_number}</span>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={p.is_advance ? 'warning' : 'secondary'} className="text-[10px]">
                        {p.is_advance ? 'Advance' : 'Payment'}
                      </Badge>
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                        Rs. {Number(p.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
