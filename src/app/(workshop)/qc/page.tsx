// MOBILE-FIRST — QC Inspector: jobs pending QC sign-off
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type PendingQcJob = {
  id: string
  reg_number: string
  status: string
  bay_number: string | null
  created_at: string
  customers: { full_name: string } | null
}

export default async function QcDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('job_cards')
    .select('id, reg_number, status, bay_number, created_at, customers(full_name)')
    .in('status', ['pending_qc', 'rework_scheduled'])
    .order('created_at', { ascending: true })

  const jobs = (data ?? []) as PendingQcJob[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">QC Queue</h1>
        <p className="text-muted-foreground text-sm">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} pending inspection
        </p>
      </div>

      {jobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No jobs pending QC.</p>
            <p className="text-xs text-muted-foreground mt-1">All clear!</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {jobs.map((job) => {
          const cust = job.customers as { full_name: string } | null
          return (
            <Link key={job.id} href={`/workshop/qc/${job.id}`} className="block">
              <Card className={`active:bg-muted/50 transition-colors ${job.status === 'rework_scheduled' ? 'border-red-200' : 'border-orange-200'}`}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-base tracking-wide">{job.reg_number}</span>
                        <Badge
                          variant={job.status === 'rework_scheduled' ? 'destructive' : 'warning'}
                          className="text-xs"
                        >
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {cust && <p className="text-sm text-muted-foreground">{cust.full_name}</p>}
                      {job.bay_number && (
                        <p className="text-xs text-muted-foreground">Bay {job.bay_number}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
