'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Wrench, CheckSquare, Clock, UserCheck, IndianRupee } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Stats = {
  openLeads: number
  activeJobs: number
  awaitingQc: number
  pendingApprovals: number
  presentToday: number
  todayRevenue: number
}

export function ManagerRealtimeStats({ initial }: { initial: Stats }) {
  const [stats, setStats] = useState<Stats>(initial)

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const today = new Date().toISOString().split('T')[0]
      const [leadsRes, jobsRes, qcRes, approvalsRes, attRes, paymentsRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'lost'),
        db.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress']),
        db.from('job_cards').select('id', { count: 'exact', head: true }).eq('status', 'pending_qc'),
        supabase.from('discount_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        db.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
        db.from('payments').select('amount').eq('payment_date', today),
      ])
      const todayRevenue = ((paymentsRes.data ?? []) as { amount: number }[])
        .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
      setStats({
        openLeads: leadsRes.count ?? 0,
        activeJobs: jobsRes.count ?? 0,
        awaitingQc: qcRes.count ?? 0,
        pendingApprovals: approvalsRes.count ?? 0,
        presentToday: attRes.count ?? 0,
        todayRevenue,
      })
    }

    // Subscribe to real-time changes on leads and job_cards
    const leadsChannel = supabase
      .channel('manager-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => refresh())
      .subscribe()

    const jobsChannel = supabase
      .channel('manager-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_cards' }, () => refresh())
      .subscribe()

    const approvalsChannel = supabase
      .channel('manager-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discount_approvals' }, () => refresh())
      .subscribe()

    const attendanceChannel = supabase
      .channel('manager-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => refresh())
      .subscribe()

    const paymentsChannel = supabase
      .channel('manager-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(jobsChannel)
      supabase.removeChannel(approvalsChannel)
      supabase.removeChannel(attendanceChannel)
      supabase.removeChannel(paymentsChannel)
    }
  }, [])

  const statItems = [
    { label: 'Open Leads', value: stats.openLeads, icon: Users, href: '/manager/leads', display: stats.openLeads.toString() },
    { label: 'Active Jobs', value: stats.activeJobs, icon: Wrench, href: '/manager/jobs', display: stats.activeJobs.toString() },
    { label: 'Awaiting QC', value: stats.awaitingQc, icon: CheckSquare, href: '/manager/jobs?status=pending_qc', display: stats.awaitingQc.toString() },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, href: '/owner', display: stats.pendingApprovals.toString() },
    { label: 'Present Today', value: stats.presentToday, icon: UserCheck, href: '/manager/attendance', display: stats.presentToday.toString() },
    { label: "Today's Revenue", value: stats.todayRevenue, icon: IndianRupee, href: '/accounts/invoices', display: `₹${stats.todayRevenue.toLocaleString('en-IN')}` },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {statItems.map((stat) => (
        <Link key={stat.label} href={stat.href}>
          <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.display}</div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
