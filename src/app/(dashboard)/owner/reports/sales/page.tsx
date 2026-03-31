import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function SalesReportsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [funnelRes, techRes, salesRes] = await Promise.all([
    db.from('conversion_funnel_view').select('*').maybeSingle(),
    db.from('technician_performance_view').select('*').order('jobs_completed', { ascending: false }),
    db.from('leads')
      .select('id, status, source, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const funnel = funnelRes.data as {
    total_leads: number; leads_with_quotation: number; leads_with_booking: number
    leads_with_job: number; leads_lost: number
    quotation_rate: number; booking_rate: number; job_rate: number
  } | null

  const techPerf = (techRes.data ?? []) as {
    technician_name: string; jobs_completed: number; avg_completion_hours: number | null; comeback_rate: number | null
  }[]

  const allLeads = (salesRes.data ?? []) as { id: string; status: string; source: string; created_at: string; profiles: { full_name: string } | null }[]

  // Group leads by salesperson
  const bySalesperson: Record<string, { name: string; leads: number; won: number; lost: number }> = {}
  for (const lead of allLeads) {
    const name = (lead.profiles as { full_name: string } | null)?.full_name ?? 'Unassigned'
    if (!bySalesperson[name]) bySalesperson[name] = { name, leads: 0, won: 0, lost: 0 }
    bySalesperson[name].leads++
    if (lead.status === 'won' || lead.status === 'booked') bySalesperson[name].won++
    if (lead.status === 'lost') bySalesperson[name].lost++
  }

  // Lead source breakdown
  const bySource: Record<string, number> = {}
  for (const lead of allLeads) {
    bySource[lead.source] = (bySource[lead.source] ?? 0) + 1
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Sales Reports</h1>
        <p className="text-muted-foreground text-sm">Conversion funnel, salesperson performance, and lead sources</p>
      </div>

      {/* Conversion Funnel */}
      {funnel && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Leads', value: funnel.total_leads },
                { label: 'Quoted', value: funnel.leads_with_quotation, sub: `${(funnel.quotation_rate ?? 0).toFixed(1)}%` },
                { label: 'Booked', value: funnel.leads_with_booking, sub: `${(funnel.booking_rate ?? 0).toFixed(1)}%` },
                { label: 'Job Created', value: funnel.leads_with_job, sub: `${(funnel.job_rate ?? 0).toFixed(1)}%` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold">{value ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {sub && <Badge variant="secondary" className="text-[10px] mt-1">{sub}</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salesperson Performance */}
      {Object.keys(bySalesperson).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Salesperson Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Total Leads</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Lost</TableHead>
                  <TableHead className="text-right">Conv. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(bySalesperson).sort((a, b) => b.leads - a.leads).map((sp) => (
                  <TableRow key={sp.name}>
                    <TableCell className="font-medium">{sp.name}</TableCell>
                    <TableCell className="text-right">{sp.leads}</TableCell>
                    <TableCell className="text-right text-green-600">{sp.won}</TableCell>
                    <TableCell className="text-right text-destructive">{sp.lost}</TableCell>
                    <TableCell className="text-right">
                      {sp.leads > 0 ? `${((sp.won / sp.leads) * 100).toFixed(1)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Technician Performance */}
      {techPerf.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Technician Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Jobs Done</TableHead>
                  <TableHead className="text-right">Avg Hours</TableHead>
                  <TableHead className="text-right">Comeback Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {techPerf.map((t) => (
                  <TableRow key={t.technician_name}>
                    <TableCell className="font-medium">{t.technician_name}</TableCell>
                    <TableCell className="text-right">{t.jobs_completed}</TableCell>
                    <TableCell className="text-right">{t.avg_completion_hours != null ? `${Number(t.avg_completion_hours).toFixed(1)}h` : '—'}</TableCell>
                    <TableCell className="text-right">
                      {t.comeback_rate != null ? (
                        <Badge variant={Number(t.comeback_rate) > 10 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {Number(t.comeback_rate).toFixed(1)}%
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Lead Source */}
      {Object.keys(bySource).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lead Sources</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                  <TableRow key={source}>
                    <TableCell className="capitalize font-medium">{source.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {allLeads.length > 0 ? `${((count / allLeads.length) * 100).toFixed(1)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
