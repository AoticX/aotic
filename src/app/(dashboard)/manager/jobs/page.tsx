import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClickableJobRow } from '@/components/job-cards/clickable-job-row'

type JobCard = {
  id: string
  status: string
  reg_number: string
  bay_number: string | null
  estimated_completion: string | null
  created_at: string
  customers: { full_name: string } | null
  profiles: { full_name: string } | null
}

const STATUS_VARIANT: Record<string, string> = {
  created: 'secondary',
  in_progress: 'info',
  pending_qc: 'warning',
  qc_passed: 'success',
  rework_scheduled: 'destructive',
  ready_for_delivery: 'success',
  delivered: 'info',
}

export default async function JobCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  // Use service client — manager/owner RLS policy may not cover all branches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  let query = db
    .from('job_cards')
    .select('id, status, reg_number, bay_number, estimated_completion, created_at, customers(full_name), profiles!job_cards_assigned_to_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query.limit(100)
  const jobs = (data ?? []) as JobCard[]

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Created', value: 'created' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'QC Pending', value: 'pending_qc' },
    { label: 'QC Passed', value: 'qc_passed' },
    { label: 'Rework', value: 'rework_scheduled' },
    { label: 'Ready', value: 'ready_for_delivery' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Job Cards</h1>
        <p className="text-sm text-muted-foreground">{jobs.length} result{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-1 border-b flex-wrap">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/manager/jobs?status=${tab.value}` : '/manager/jobs'}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              (status ?? '') === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Reg No.</TableHead>
              <TableHead>Bay</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Est. Completion</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No job cards found.
                </TableCell>
              </TableRow>
            )}
            {jobs.map((j) => {
              const cust = j.customers as { full_name: string } | null
              const tech = j.profiles as { full_name: string } | null
              return (
                <ClickableJobRow key={j.id} id={j.id}>
                  <TableCell className="font-mono text-xs font-medium">{j.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell className="font-medium">{cust?.full_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{j.reg_number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{j.bay_number ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{tech?.full_name ?? 'Unassigned'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {j.estimated_completion
                      ? new Date(j.estimated_completion).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(STATUS_VARIANT[j.status] ?? 'secondary') as 'secondary' | 'info' | 'warning' | 'success' | 'destructive'}
                      className="text-xs capitalize"
                    >
                      {j.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(j.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                </ClickableJobRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
