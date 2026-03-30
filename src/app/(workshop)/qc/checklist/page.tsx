import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function QcChecklistIndexPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('job_cards')
    .select('id, reg_number, status, bay_number, customers(full_name)')
    .in('status', ['pending_qc', 'rework_scheduled'])
    .order('created_at', { ascending: true })

  const jobs = (data ?? []) as {
    id: string; reg_number: string; status: string; bay_number: string | null
    customers: { full_name: string } | null
  }[]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Checklists</h1>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">No jobs require QC at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const cust = j.customers as { full_name: string } | null
            return (
              <Link key={j.id} href={`/qc/${j.id}`} className="block">
                <Card className="active:bg-muted/50 transition-colors">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold tracking-wide">{j.reg_number}</span>
                          <Badge
                            variant={j.status === 'rework_scheduled' ? 'destructive' : 'warning'}
                            className="text-xs"
                          >
                            {j.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {cust && <p className="text-sm text-muted-foreground">{cust.full_name}</p>}
                        {j.bay_number && <p className="text-xs text-muted-foreground">Bay {j.bay_number}</p>}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
