import { createClient } from '@/lib/supabase/server'
import { ManagerRealtimeStats } from '@/components/dashboard/manager-realtime-stats'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [leadsRes, activeJobsRes, pendingQcRes, pendingApprovalRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'lost'),
    db.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress']),
    db.from('job_cards').select('id', { count: 'exact', head: true }).eq('status', 'pending_qc'),
    supabase.from('discount_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const initial = {
    openLeads: leadsRes.count ?? 0,
    activeJobs: activeJobsRes.count ?? 0,
    awaitingQc: pendingQcRes.count ?? 0,
    pendingApprovals: pendingApprovalRes.count ?? 0,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground text-sm">Daily operations and team oversight — updates in real-time</p>
      </div>
      <ManagerRealtimeStats initial={initial} />
    </div>
  )
}
