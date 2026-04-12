import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DiscountApprovalPanel } from '@/components/quotations/discount-approval-panel'
import { Users, FileText, Wrench, BarChart3, ArrowRight } from 'lucide-react'
import { buildActivityMessage, fetchRecentActivity, formatActor, TABLE_LABEL } from '@/lib/activity'
import Link from 'next/link'

type RecentPayment = {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  is_advance: boolean
  bookings: { leads: { customer_name: string } | null } | null
  invoices: { invoice_number: string } | null
}

export default async function OwnerDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const [leadsRes, quotationsRes, jobsRes, approvalsRes, revenueRes, activity, paymentsRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('quotations').select('id', { count: 'exact', head: true }),
    service.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress', 'pending_qc']),
    service.from('discount_approvals')
      .select('id, quotation_id, requested_pct, reason_notes, quotations(total_amount, subtotal, leads(contact_name)), discount_reasons(label)')
      .eq('status', 'pending'),
    service.from('revenue_summary_view').select('*').maybeSingle(),
    fetchRecentActivity(8),
    service.from('payments')
      .select('id, amount, payment_method, payment_date, is_advance, bookings(leads(customer_name)), invoices(invoice_number)')
      .order('payment_date', { ascending: false })
      .limit(6),
  ])

  const revenue = revenueRes.data as {
    total_revenue: number | null
    total_collected: number | null
    total_outstanding: number | null
    total_completed_jobs: number | null
  } | null

  const revenueMTD = revenue?.total_collected != null
    ? `Rs. ${Number(revenue.total_collected).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '—'

  const stats = [
    { label: 'Total Leads', value: leadsRes.count ?? 0, icon: Users, color: 'text-blue-600', href: '/sales/leads' },
    { label: 'Quotations', value: quotationsRes.count ?? 0, icon: FileText, color: 'text-purple-600', href: '/sales/quotations' },
    { label: 'Active Jobs', value: jobsRes.count ?? 0, icon: Wrench, color: 'text-orange-600', href: '/manager/jobs' },
    { label: 'Total Collected', value: revenueMTD, icon: BarChart3, color: 'text-green-600', href: '/accounts/payments' },
  ]

  const recentPayments = (paymentsRes.data ?? []) as RecentPayment[]

  const pendingApprovals = (approvalsRes.data ?? []) as {
    id: string; quotation_id: string; requested_pct: number; reason_notes: string | null
    quotations: { total_amount: number; subtotal: number; leads: { contact_name: string } | null } | null
    discount_reasons: { label: string } | null
  }[]

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Overview</h1>

      {/* Top stat cards — all clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Revenue breakdown — shown once view exists */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/accounts/invoices">
          <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold">Rs. {Number(revenue?.total_revenue ?? 0).toLocaleString('en-IN')}</p></CardContent>
          </Card>
        </Link>
        <Link href="/accounts/invoices?status=partially_paid">
          <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Outstanding</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold text-destructive">Rs. {Number(revenue?.total_outstanding ?? 0).toLocaleString('en-IN')}</p></CardContent>
          </Card>
        </Link>
        <Link href="/manager/jobs?status=delivered">
          <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Completed Jobs</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold">{revenue?.total_completed_jobs ?? 0}</p></CardContent>
          </Card>
        </Link>
      </div>

      <DiscountApprovalPanel items={pendingApprovals} />

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Activity (All Departments)</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a) => (
                <div key={a.id} className="rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{String(a.action).replace('_', ' ')}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{TABLE_LABEL[a.table_name] ?? a.table_name}</span>
                  </div>
                  <p className="text-sm">{buildActivityMessage(a)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatActor(a)} · {new Date(a.performed_at).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
