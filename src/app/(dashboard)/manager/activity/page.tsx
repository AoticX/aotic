import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Phone, Mail, MapPin, FileText, FileCheck, Pencil, Activity } from 'lucide-react'
import Link from 'next/link'

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  call: { label: 'Call', icon: Phone, color: 'text-blue-600' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-600' },
  visit: { label: 'Visit', icon: MapPin, color: 'text-orange-600' },
  note: { label: 'Note', icon: FileText, color: 'text-gray-600' },
  quotation: { label: 'Quotation', icon: FileCheck, color: 'text-indigo-600' },
  status_change: { label: 'Status', icon: Pencil, color: 'text-yellow-600' },
}

export default async function ActivityLogPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch all communications across all leads
  const { data: commsData } = await db
    .from('communications')
    .select('id, lead_id, type, notes, created_at, created_by, leads(contact_name, contact_phone), profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const comms = (commsData ?? []) as {
    id: string
    lead_id: string
    type: string
    notes: string | null
    created_at: string
    created_by: string
    leads: { contact_name: string; contact_phone: string } | null
    profiles: { full_name: string } | null
  }[]

  // Group by date
  const grouped: Record<string, typeof comms> = {}
  for (const c of comms) {
    const dateKey = new Date(c.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(c)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">All communications and interactions across all leads</p>
      </div>

      {comms.length === 0 ? (
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
                {items.map((c) => {
                  const meta = TYPE_META[c.type] ?? TYPE_META.note
                  const Icon = meta.icon
                  const lead = c.leads as { contact_name: string; contact_phone: string } | null
                  const profile = c.profiles as { full_name: string } | null
                  return (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`mt-0.5 flex-shrink-0 ${meta.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">{meta.label}</Badge>
                          {lead && (
                            <Link
                              href={`/sales/leads/${c.lead_id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {lead.contact_name}
                            </Link>
                          )}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{lead?.contact_phone}</span>
                        </div>
                        {c.notes && (
                          <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap line-clamp-3">{c.notes}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {profile?.full_name ?? 'Staff'} · {new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
