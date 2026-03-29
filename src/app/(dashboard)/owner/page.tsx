import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DiscountApprovalPanel } from '@/components/quotations/discount-approval-panel'
import { Users, FileText, Wrench, BarChart3 } from 'lucide-react'

export default async function OwnerDashboard() {
  const supabase = await createClient()

  const [leadsRes, quotationsRes, jobsRes, approvalsRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('quotations').select('id', { count: 'exact', head: true }),
    supabase.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress', 'pending_qc']),
    supabase.from('discount_approvals')
      .select('id, quotation_id, requested_pct, reason_notes, quotations(leads(contact_name)), discount_reasons(label)')
      .eq('status', 'pending'),
  ])

  const stats = [
    { label: 'Total Leads', value: leadsRes.count ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Quotations', value: quotationsRes.count ?? 0, icon: FileText, color: 'text-purple-600' },
    { label: 'Active Jobs', value: jobsRes.count ?? 0, icon: Wrench, color: 'text-orange-600' },
    { label: 'Revenue MTD', value: '—', icon: BarChart3, color: 'text-green-600' },
  ]

  const pendingApprovals = (approvalsRes.data ?? []) as {
    id: string; quotation_id: string; requested_pct: number; reason_notes: string | null
    quotations: { leads: { contact_name: string } | null } | null
    discount_reasons: { label: string } | null
  }[]

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

      <DiscountApprovalPanel items={pendingApprovals} />
    </div>
  )
}
