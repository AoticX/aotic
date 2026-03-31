'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Wrench, CheckSquare, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Stats = {
  openLeads: number
  activeJobs: number
  awaitingQc: number
  pendingApprovals: number
}

export function ManagerRealtimeStats({ initial }: { initial: Stats }) {
  const [stats, setStats] = useState<Stats>(initial)

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const [leadsRes, jobsRes, qcRes, approvalsRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'lost'),
        db.from('job_cards').select('id', { count: 'exact', head: true }).in('status', ['created', 'in_progress']),
        db.from('job_cards').select('id', { count: 'exact', head: true }).eq('status', 'pending_qc'),
        supabase.from('discount_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({
        openLeads: leadsRes.count ?? 0,
        activeJobs: jobsRes.count ?? 0,
        awaitingQc: qcRes.count ?? 0,
        pendingApprovals: approvalsRes.count ?? 0,
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

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(jobsChannel)
      supabase.removeChannel(approvalsChannel)
    }
  }, [])

  const statItems = [
    { label: 'Open Leads', value: stats.openLeads, icon: Users, href: '/manager/leads' },
    { label: 'Active Jobs', value: stats.activeJobs, icon: Wrench, href: '/manager/jobs' },
    { label: 'Awaiting QC', value: stats.awaitingQc, icon: CheckSquare, href: '/manager/jobs?status=pending_qc' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, href: '/owner' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat) => (
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
  )
}
