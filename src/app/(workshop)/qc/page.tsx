// MOBILE-FIRST — QC Inspector: jobs pending QC sign-off
// (docs: roles-and-permissions.md §5, core-workflows.md §5)
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare, ChevronRight } from 'lucide-react'

type PendingQcJob = {
  id: string
  reg_number: string
  status: string
  bay_number: string | null
  created_at: string
}

export default async function QcDashboard() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('job_cards')
    .select('id, reg_number, status, bay_number, created_at')
    .eq('status', 'pending_qc')
    .order('created_at', { ascending: true })

  const jobs = (data ?? []) as PendingQcJob[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">QC Queue</h1>
        <p className="text-muted-foreground text-sm">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} pending QC inspection
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
        {jobs.map((job) => (
          <a key={job.id} href={`/workshop/qc/${job.id}`} className="block">
            <Card className="border-orange-200 active:bg-muted/50 transition-colors">
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-base tracking-wide">{job.reg_number}</span>
                      <Badge variant="warning" className="text-xs">Pending QC</Badge>
                    </div>
                    {job.bay_number && (
                      <p className="text-sm text-muted-foreground">Bay {job.bay_number}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Button size="xl" className="w-full gap-2" disabled>
        <CheckSquare className="h-5 w-5" />
        Start QC Checklist (Phase 6)
      </Button>
    </div>
  )
}
