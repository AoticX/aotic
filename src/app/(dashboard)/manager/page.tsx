import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Wrench, CheckSquare, Clock } from 'lucide-react'

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

  const stats = [
    { label: 'Open Leads', value: leadsRes.count ?? 0, icon: Users, href: '/manager/leads' },
    { label: 'Active Jobs', value: activeJobsRes.count ?? 0, icon: Wrench, href: '/manager/jobs' },
    { label: 'Awaiting QC', value: pendingQcRes.count ?? 0, icon: CheckSquare, href: '/manager/jobs?status=pending_qc' },
    { label: 'Pending Approvals', value: pendingApprovalRes.count ?? 0, icon: Clock, href: '/owner' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground text-sm">Daily operations and team oversight</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
