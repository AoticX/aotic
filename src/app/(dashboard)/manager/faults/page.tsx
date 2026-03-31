import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FaultResolutionForm } from '@/components/faults/fault-resolution-form'
import { AlertTriangle } from 'lucide-react'

const SEVERITY_VARIANT: Record<string, string> = {
  low: 'secondary', medium: 'warning', high: 'destructive', critical: 'destructive',
}

const STATUS_VARIANT: Record<string, string> = {
  open: 'destructive', under_review: 'warning', rework_scheduled: 'warning',
  resolved: 'success', closed: 'secondary',
}

export default async function FaultsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: faults } = await db
    .from('job_issues')
    .select('id, title, description, severity, status, resolution_notes, created_at, resolved_at, job_cards(reg_number, customers(full_name)), issue_categories(name), profiles!job_issues_reported_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const issues = (faults ?? []) as {
    id: string
    title: string
    description: string | null
    severity: string
    status: string
    resolution_notes: string | null
    created_at: string
    resolved_at: string | null
    job_cards: { reg_number: string; customers: { full_name: string } | null } | null
    issue_categories: { name: string } | null
    profiles: { full_name: string } | null
  }[]

  const openCount = issues.filter(i => !['resolved', 'closed'].includes(i.status)).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Fault / Comeback Tracking</h1>
          <p className="text-muted-foreground text-sm">
            {openCount} open &middot; {issues.length} total
          </p>
        </div>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No faults reported yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card key={issue.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold">{issue.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {issue.job_cards?.customers?.full_name} &middot;{' '}
                      <span className="font-mono">{issue.job_cards?.reg_number}</span>
                      {issue.issue_categories && <> &middot; {issue.issue_categories.name}</>}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Badge
                      variant={(SEVERITY_VARIANT[issue.severity] ?? 'secondary') as 'secondary' | 'warning' | 'destructive'}
                      className="text-[10px] capitalize"
                    >
                      {issue.severity}
                    </Badge>
                    <Badge
                      variant={(STATUS_VARIANT[issue.status] ?? 'secondary') as 'secondary' | 'warning' | 'destructive' | 'success'}
                      className="text-[10px] capitalize"
                    >
                      {issue.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {(issue.description || issue.resolution_notes || !['resolved', 'closed'].includes(issue.status)) && (
                <CardContent className="pt-0 space-y-3">
                  {issue.description && (
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  )}
                  {issue.resolution_notes && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                      <strong>Resolution:</strong> {issue.resolution_notes}
                    </div>
                  )}
                  {!['resolved', 'closed'].includes(issue.status) && (
                    <FaultResolutionForm faultId={issue.id} currentStatus={issue.status} />
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Reported: {new Date(issue.created_at).toLocaleDateString('en-IN')}
                    {issue.profiles && ` by ${issue.profiles.full_name}`}
                    {issue.resolved_at && ` · Resolved: ${new Date(issue.resolved_at).toLocaleDateString('en-IN')}`}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
