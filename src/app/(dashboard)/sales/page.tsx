import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, FileText, Calendar, Plus } from 'lucide-react'

export default async function SalesDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [myLeadsRes, quotationsRes, bookingsRes] = await Promise.all([
    supabase.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', user!.id)
      .neq('status', 'lost'),
    supabase.from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user!.id),
    supabase.from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user!.id),
  ])

  const stats = [
    { label: 'My Active Leads', value: myLeadsRes.count ?? 0, icon: Users, href: '/sales/leads' },
    { label: 'Quotations Created', value: quotationsRes.count ?? 0, icon: FileText, href: '/sales/quotations' },
    { label: 'Bookings', value: bookingsRes.count ?? 0, icon: Calendar, href: '/sales/bookings' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My Pipeline</h1>
          <p className="text-muted-foreground text-sm">Your leads, quotations, and bookings</p>
        </div>
        <Button asChild size="sm">
          <Link href="/sales/leads/new"><Plus className="h-4 w-4 mr-1" />New Lead</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
