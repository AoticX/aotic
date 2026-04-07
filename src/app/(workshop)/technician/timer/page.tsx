import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobTimer } from '@/components/workshop/job-timer'
import { getActiveTimer, getTimeLogs } from '@/lib/actions/time-logs'
import Link from 'next/link'

type ActiveJob = {
  id: string
  reg_number: string
  status: string
  bay_number: string | null
}

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>
}) {
  const { job: jobId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Use service client — RLS blocks technician reads on job_cards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: jobsData } = await service
    .from('job_cards')
    .select('id, reg_number, status, bay_number')
    .eq('assigned_to', user!.id)
    .in('status', ['in_progress', 'created'])
    .order('created_at', { ascending: true })

  const jobs = (jobsData ?? []) as ActiveJob[]
  const selectedJobId = jobId ?? jobs[0]?.id ?? null
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null

  const [activeTimer, timeLogs] = selectedJobId
    ? await Promise.all([getActiveTimer(selectedJobId), getTimeLogs(selectedJobId)])
    : [null, []]

  const completedLogs = timeLogs.filter((l) => l.ended_at)
  const totalMinutes = completedLogs.reduce((sum, l) => sum + (l.duration_mins ?? 0), 0)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Time Tracker</h1>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">No active jobs to track time for.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {jobs.length > 1 && (
            <div className="space-y-2">
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/technician/timer?job=${j.id}`}
                  className={`block px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                    j.id === selectedJobId
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {j.reg_number}
                  {j.bay_number && <span className="ml-2 text-xs opacity-60">Bay {j.bay_number}</span>}
                </Link>
              ))}
            </div>
          )}

          {selectedJobId && selectedJob && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{selectedJob.reg_number}</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTimer jobCardId={selectedJobId} activeLog={activeTimer} />
                </CardContent>
              </Card>

              {completedLogs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Session History</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {completedLogs.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                          <div>
                            <p className="font-medium">
                              {new Date(l.started_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                            {l.notes && <p className="text-xs text-muted-foreground">{l.notes}</p>}
                          </div>
                          <span className="text-sm font-mono font-medium">
                            {l.duration_mins != null ? `${l.duration_mins}m` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
