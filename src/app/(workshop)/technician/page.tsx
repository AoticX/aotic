// MOBILE-FIRST — Technician view: only assigned jobs
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'secondary'> = {
  created: 'info',
  in_progress: 'warning',
  pending_qc: 'secondary',
}

type AssignedJob = {
  id: string
  reg_number: string
  status: string
  bay_number: string | null
  estimated_completion: string | null
  customers: { full_name: string } | null
}

export default async function TechnicianDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('job_cards')
    .select('id, reg_number, status, bay_number, estimated_completion, customers(full_name)')
    .eq('assigned_to', user!.id)
    .in('status', ['created', 'in_progress', 'pending_qc'])
    .order('created_at', { ascending: true })

  const jobs = (data ?? []) as AssignedJob[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">My Jobs</h1>
        <p className="text-muted-foreground text-sm">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {jobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No jobs assigned yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back after your supervisor assigns work.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {jobs.map((job) => {
          const cust = job.customers as { full_name: string } | null
          return (
            <Link key={job.id} href={`/workshop/technician/${job.id}`} className="block">
              <Card className="active:bg-muted/50 transition-colors">
                <CardContent className="py-4 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-base tracking-wide">{job.reg_number}</span>
                        <Badge
                          variant={STATUS_VARIANT[job.status] ?? 'secondary'}
                          className="text-xs capitalize"
                        >
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {cust && <p className="text-sm text-muted-foreground">{cust.full_name}</p>}
                      {job.bay_number && (
                        <p className="text-xs text-muted-foreground">Bay {job.bay_number}</p>
                      )}
                      {job.estimated_completion && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(job.estimated_completion).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
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
