import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, Wrench, BarChart3 } from 'lucide-react'

export default async function OwnerDashboard() {
  const supabase = await createClient()

  // Aggregate counts — Phase 2 will expand these
  const [leadsRes, quotationsRes, jobsRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('quotations').select('id', { count: 'exact', head: true }),
    supabase.from('job_cards').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Leads', value: leadsRes.count ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Quotations', value: quotationsRes.count ?? 0, icon: FileText, color: 'text-purple-600' },
    { label: 'Active Jobs', value: jobsRes.count ?? 0, icon: Wrench, color: 'text-orange-600' },
    { label: 'Revenue (MTD)', value: '—', icon: BarChart3, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-muted-foreground text-sm">Full system visibility across all modules</p>
        </div>
        <Badge variant="outline">Phase 1 — Schema Ready</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase 2 Coming Next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Desktop sidebar navigation with role-filtered items</p>
          <p>• Full lead pipeline board (Hot → Warm → Cold → Lost)</p>
          <p>• Quotation builder with discount approval workflow</p>
        </CardContent>
      </Card>
    </div>
  )
}
