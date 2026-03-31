import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LeadStatusChanger } from '@/components/leads/lead-status-changer'
import { CommunicationLog } from '@/components/leads/communication-log'
import { FollowUpScheduler } from '@/components/leads/follow-up-scheduler'
import { FileText, Plus, Pencil } from 'lucide-react'
import type { LeadStatus, LeadSource } from '@/types/database'
import { WhatsAppCompose } from '@/components/whatsapp/whatsapp-compose'
import { getWhatsAppTemplates } from '@/lib/actions/whatsapp'
import { LeadAssignSelect } from '@/components/leads/lead-assign-select'

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

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const userRole = (profileData as { role: string } | null)?.role ?? ''

  const [leadRes, reasonsRes, quotationsRes, commsRes, templates, salesExecsRes, leadVerticalsRes] = await Promise.all([
    db.from('leads').select('*, verticals(name), assigned_profile:profiles!leads_assigned_to_fkey(full_name)').eq('id', id).single(),
    supabase.from('lost_reasons').select('id, label').eq('is_active', true).order('sort_order'),
    db.from('quotations').select('id, version, status, total_amount, created_at').eq('lead_id', id).order('created_at', { ascending: false }),
    db.from('communications').select('id, type, notes, created_at, profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    getWhatsAppTemplates(),
    ['owner', 'branch_manager'].includes(userRole)
      ? supabase.from('profiles').select('id, full_name').eq('role', 'sales_executive').eq('is_active', true).order('full_name')
      : Promise.resolve({ data: [] }),
    db.from('lead_verticals').select('verticals(name)').eq('lead_id', id),
  ])

  if (!leadRes.data) notFound()

  const lead = leadRes.data as {
    id: string; contact_name: string; contact_phone: string; contact_email: string | null
    car_model: string | null; car_reg_no: string | null; service_interest: string | null
    estimated_budget: number | null; source: LeadSource; status: LeadStatus
    notes: string | null; lost_notes: string | null; created_at: string
    assigned_to: string | null
    verticals: { name: string } | null
    assigned_profile: { full_name: string } | null
  }

  const salesExecs = (salesExecsRes.data ?? []) as { id: string; full_name: string }[]

  // All verticals from junction table; fallback to single vertical_id if junction is empty
  const leadVerticalNames = ((leadVerticalsRes.data ?? []) as { verticals: { name: string } | null }[])
    .map((r) => r.verticals?.name)
    .filter(Boolean) as string[]
  const verticalDisplay = leadVerticalNames.length > 0
    ? leadVerticalNames.join(', ')
    : (lead.verticals as { name: string } | null)?.name ?? null

  const reasons = (reasonsRes.data ?? []) as { id: string; label: string }[]
  const comms = (commsRes.data ?? []) as {
    id: string; type: 'call' | 'whatsapp' | 'visit' | 'email' | 'note'
    notes: string; created_at: string
    profiles: { full_name: string | null } | null
  }[]
  const quotations = (quotationsRes.data ?? []) as {
    id: string; version: number; status: string; total_amount: number; created_at: string
  }[]

  const fields: [string, string | null | undefined][] = [
    ['Email', lead.contact_email],
    ['Car Model', lead.car_model],
    ['Reg No.', lead.car_reg_no],
    ['Vertical', verticalDisplay],
    ['Source', SOURCE_LABELS[lead.source]],
    ['Budget', lead.estimated_budget ? `Rs. ${Number(lead.estimated_budget).toLocaleString('en-IN')}` : null],
    ['Assigned To', (lead.assigned_profile as { full_name: string } | null)?.full_name ?? 'Unassigned'],
    ['Created', new Date(lead.created_at).toLocaleDateString('en-IN')],
  ]

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{lead.contact_name}</h1>
          <p className="text-sm text-muted-foreground">{lead.contact_phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== 'lost' && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={`/sales/leads/${lead.id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Link>
              </Button>
              <WhatsAppCompose
                phone={lead.contact_phone}
                leadId={lead.id}
                contactName={lead.contact_name}
                templates={templates}
              />
              <FollowUpScheduler leadId={lead.id} />
            </>
          )}
          <LeadStatusChanger leadId={lead.id} current={lead.status} reasons={reasons} />
        </div>
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
            {['owner', 'branch_manager'].includes(userRole) && salesExecs.length > 0 && (
              <div className="pt-2 border-t">
                <LeadAssignSelect
                  leadId={lead.id}
                  currentAssignedTo={lead.assigned_to}
                  salesExecs={salesExecs}
                />
              </div>
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
        <CardContent className="py-4">
          <CommunicationLog leadId={lead.id} entries={comms} />
        </CardContent>
      </Card>

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
