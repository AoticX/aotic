import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, Calendar } from 'lucide-react'

export default async function SalesDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [myLeadsRes, quotationsRes] = await Promise.all([
    supabase.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', user!.id)
      .neq('status', 'lost'),
    supabase.from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user!.id),
  ])

  const stats = [
    { label: 'My Active Leads', value: myLeadsRes.count ?? 0, icon: Users },
    { label: 'Quotations Created', value: quotationsRes.count ?? 0, icon: FileText },
    { label: 'Bookings This Month', value: '—', icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Pipeline</h1>
          <p className="text-muted-foreground text-sm">Your leads, quotations, and bookings</p>
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
