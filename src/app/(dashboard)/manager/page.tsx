import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Wrench, Calendar } from 'lucide-react'

export default async function ManagerDashboard() {
  const supabase = await createClient()

  const [leadsRes, jobsRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('job_cards')
      .select('id', { count: 'exact', head: true })
      .in('status', ['created', 'in_progress', 'pending_qc']),
  ])

  const stats = [
    { label: 'Open Leads', value: leadsRes.count ?? 0, icon: Users },
    { label: 'Active Jobs', value: jobsRes.count ?? 0, icon: Wrench },
    { label: "Today's Schedule", value: '—', icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager Dashboard</h1>
          <p className="text-muted-foreground text-sm">Daily operations, scheduling, and team oversight</p>
        </div>
        <Badge variant="outline">Phase 1 — Schema Ready</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
