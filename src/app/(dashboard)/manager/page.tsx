import { createClient } from '@/lib/supabase/server'
import { ManagerRealtimeStats } from '@/components/dashboard/manager-realtime-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildActivityMessage, fetchRecentActivity, formatActor, TABLE_LABEL } from '@/lib/activity'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const today = new Date().toISOString().split('T')[0]

  const [leadsRes, activeJobsRes, pendingQcRes, pendingApprovalRes, attendanceRes, paymentsRes, activity] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'lost'),
    db.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress']),
    db.from('job_cards').select('id', { count: 'exact', head: true }).eq('status', 'pending_qc'),
    supabase.from('discount_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
    db.from('payments').select('amount').eq('payment_date', today),
    fetchRecentActivity(8),
  ])

  const todayRevenue = ((paymentsRes.data ?? []) as { amount: number }[])
    .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

  const initial = {
    openLeads: leadsRes.count ?? 0,
    activeJobs: activeJobsRes.count ?? 0,
    awaitingQc: pendingQcRes.count ?? 0,
    pendingApprovals: pendingApprovalRes.count ?? 0,
    presentToday: attendanceRes.count ?? 0,
    todayRevenue,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground text-sm">Daily operations and team oversight — updates in real-time</p>
      </div>
      <ManagerRealtimeStats initial={initial} />

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
