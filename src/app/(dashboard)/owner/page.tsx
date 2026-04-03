import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DiscountApprovalPanel } from '@/components/quotations/discount-approval-panel'
import { Users, FileText, Wrench, BarChart3 } from 'lucide-react'
import { buildActivityMessage, formatActor, TABLE_LABEL, type ActivityEntry } from '@/lib/activity'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [leadsRes, quotationsRes, jobsRes, approvalsRes, revenueRes, activityRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('quotations').select('id', { count: 'exact', head: true }),
    supabase.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress', 'pending_qc']),
    supabase.from('discount_approvals')
      .select('id, quotation_id, requested_pct, reason_notes, quotations(total_amount, subtotal, leads(contact_name)), discount_reasons(label)')
      .eq('status', 'pending'),
    db.from('revenue_summary_view').select('*').maybeSingle(),
    db.from('audit_logs').select('id, action, table_name, record_id, old_data, new_data, performed_at, notes, profiles(full_name)').order('performed_at', { ascending: false }).limit(8),
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
    { label: 'Total Leads', value: leadsRes.count ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Quotations', value: quotationsRes.count ?? 0, icon: FileText, color: 'text-purple-600' },
    { label: 'Active Jobs', value: jobsRes.count ?? 0, icon: Wrench, color: 'text-orange-600' },
    { label: 'Total Collected', value: revenueMTD, icon: BarChart3, color: 'text-green-600' },
  ]

  const pendingApprovals = (approvalsRes.data ?? []) as {
    id: string; quotation_id: string; requested_pct: number; reason_notes: string | null
    quotations: { total_amount: number; subtotal: number; leads: { contact_name: string } | null } | null
    discount_reasons: { label: string } | null
  }[]

  const activity = (activityRes.data ?? []) as ActivityEntry[]

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {revenue && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold">Rs. {Number(revenue.total_revenue ?? 0).toLocaleString('en-IN')}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Outstanding</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold text-destructive">Rs. {Number(revenue.total_outstanding ?? 0).toLocaleString('en-IN')}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Completed Jobs</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold">{revenue.total_completed_jobs ?? 0}</p></CardContent>
          </Card>
        </div>
      )}

      <DiscountApprovalPanel items={pendingApprovals} />

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
