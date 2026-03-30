import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LeadStatusChanger } from '@/components/leads/lead-status-changer'
import { FileText, Plus } from 'lucide-react'
import type { LeadStatus, LeadSource } from '@/types/database'

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: 'Walk-in', phone: 'Phone', whatsapp: 'WhatsApp',
  instagram: 'Instagram', facebook: 'Facebook', referral: 'Referral',
  website: 'Website', other: 'Other',
}

const QUOTATION_STATUS_VARIANT: Record<string, string> = {
  draft: 'secondary', pending_approval: 'warning', approved: 'info',
  sent: 'info', accepted: 'success', rejected: 'destructive',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [leadRes, reasonsRes, quotationsRes] = await Promise.all([
    db.from('leads').select('*, verticals(name)').eq('id', id).single(),
    supabase.from('lost_reasons').select('id, label').eq('is_active', true).order('sort_order'),
    db.from('quotations').select('id, version, status, total_amount, created_at').eq('lead_id', id).order('created_at', { ascending: false }),
  ])

  if (!leadRes.data) notFound()

  const lead = leadRes.data as {
    id: string; contact_name: string; contact_phone: string; contact_email: string | null
    car_model: string | null; car_reg_no: string | null; service_interest: string | null
    estimated_budget: number | null; source: LeadSource; status: LeadStatus
    notes: string | null; lost_notes: string | null; created_at: string
    verticals: { name: string } | null
  }

  const reasons = (reasonsRes.data ?? []) as { id: string; label: string }[]
  const quotations = (quotationsRes.data ?? []) as {
    id: string; version: number; status: string; total_amount: number; created_at: string
  }[]

  const fields: [string, string | null | undefined][] = [
    ['Email', lead.contact_email],
    ['Car Model', lead.car_model],
    ['Reg No.', lead.car_reg_no],
    ['Vertical', (lead.verticals as { name: string } | null)?.name],
    ['Source', SOURCE_LABELS[lead.source]],
    ['Budget', lead.estimated_budget ? `Rs. ${Number(lead.estimated_budget).toLocaleString('en-IN')}` : null],
    ['Created', new Date(lead.created_at).toLocaleDateString('en-IN')],
  ]

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{lead.contact_name}</h1>
          <p className="text-sm text-muted-foreground">{lead.contact_phone}</p>
        </div>
        <LeadStatusChanger leadId={lead.id} current={lead.status} reasons={reasons} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contact & Vehicle</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {fields.map(([label, value]) =>
              value ? (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lead.notes ?? <span className="italic">No notes.</span>}
            {lead.status === 'lost' && lead.lost_notes && (
              <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                Lost note: {lead.lost_notes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Quotations</CardTitle>
          {lead.status !== 'lost' && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/sales/quotations/new?lead=${lead.id}`}>
                <Plus className="h-3.5 w-3.5 mr-1" />New Quotation
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotations yet.</p>
          ) : (
            <div className="space-y-2">
              {quotations.map((q) => (
                <Link
                  key={q.id}
                  href={`/sales/quotations/${q.id}`}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Version {q.version}</p>
                      <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Rs. {Number(q.total_amount).toLocaleString('en-IN')}</span>
                    <Badge
                      variant={QUOTATION_STATUS_VARIANT[q.status] as 'secondary' | 'warning' | 'info' | 'success' | 'destructive' ?? 'outline'}
                      className="text-xs capitalize"
                    >
                      {q.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
