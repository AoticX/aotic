import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'
import { buildActivityMessage, fetchRecentActivity, formatActor, TABLE_LABEL } from '@/lib/activity'

export default async function ActivityLogPage() {
  const activity = await fetchRecentActivity(200)

  // Group by date
  const grouped: Record<string, typeof activity> = {}
  for (const a of activity) {
    const dateKey = new Date(a.performed_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(a)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">All cross-department actions: leads, quotations, bookings, jobs, QC, invoices, payments, inventory, HR and communications</p>
      </div>

      {activity.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No activity recorded yet.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{date}</p>
            <Card>
              <CardContent className="p-0 divide-y">
                {items.map((a) => {
                  const label = TABLE_LABEL[a.table_name] ?? a.table_name
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 capitalize">{String(a.action).replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{label}</Badge>
                        </div>
                        <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap line-clamp-3">{buildActivityMessage(a)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatActor(a)} · {new Date(a.performed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
