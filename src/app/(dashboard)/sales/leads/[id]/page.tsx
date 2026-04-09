import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LeadStatusChanger } from '@/components/leads/lead-status-changer'
import { CommunicationLog } from '@/components/leads/communication-log'
import { FollowUpScheduler } from '@/components/leads/follow-up-scheduler'
import { FileText, Plus, Pencil, Wrench, Receipt, CreditCard, Banknote, Landmark, Smartphone } from 'lucide-react'
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

const JOB_STATUS_VARIANT: Record<string, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
  created: 'secondary',
  in_progress: 'info',
  pending_qc: 'warning',
  qc_passed: 'info',
  rework_scheduled: 'destructive',
  ready_for_billing: 'warning',
  ready_for_delivery: 'success',
  delivered: 'success',
}

const INVOICE_STATUS_VARIANT: Record<string, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
  draft: 'secondary', finalized: 'info', partially_paid: 'warning', paid: 'success', void: 'destructive',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // Service client for job_cards + invoices — RLS blocks these for sales/front_desk
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const userRole = (profileData as { role: string } | null)?.role ?? ''

  const [leadRes, reasonsRes, quotationsRes, commsRes, templates, salesExecsRes, leadVerticalsRes, jobCardsRes] = await Promise.all([
    db.from('leads').select('*, verticals:verticals!leads_vertical_id_fkey(name), assigned_profile:profiles!leads_assigned_to_fkey(full_name)').eq('id', id).single(),
    supabase.from('lost_reasons').select('id, label').eq('is_active', true).order('sort_order'),
    db.from('quotations').select('id, version, status, total_amount, created_at').eq('lead_id', id).order('created_at', { ascending: false }),
    db.from('communications').select('id, type, notes, created_at, profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    getWhatsAppTemplates(),
    ['owner', 'branch_manager'].includes(userRole)
      ? supabase.from('profiles').select('id, full_name').eq('role', 'sales_executive').eq('is_active', true).order('full_name')
      : Promise.resolve({ data: [] }),
    db.from('lead_verticals').select('verticals(name)').eq('lead_id', id),
    // No nested joins — invoices.job_card_id has no FK constraint so PostgREST rejects nested selects.
    // Fetch job_cards only; invoices + payments are fetched separately below.
    svc.from('job_cards')
      .select('id, status, reg_number, created_at, booking_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
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

  type RawJobCard = { id: string; status: string; reg_number: string; created_at: string; booking_id: string | null }
  type InvoicePayment = { id: string; amount: number; payment_method: string; payment_date: string; is_advance: boolean }
  type JobInvoice = {
    id: string; invoice_number: string; status: string
    total_amount: number; amount_paid: number; amount_due: number
    payments: InvoicePayment[]
  }
  type JobCardInfo = RawJobCard & { invoice: JobInvoice | null }

  const rawJobCards = (jobCardsRes.data ?? []) as RawJobCard[]

  // Fetch invoices for these job cards separately (no FK constraint → can't use nested join)
  let jobCards: JobCardInfo[] = rawJobCards.map((jc) => ({ ...jc, invoice: null }))

  if (rawJobCards.length > 0) {
    const jcIds = rawJobCards.map((jc) => jc.id)
    const bookingIds = rawJobCards.map((jc) => jc.booking_id).filter(Boolean) as string[]

    // Try by job_card_id first, fallback to booking_id
    const [invByJobCard, invByBooking] = await Promise.all([
      svc.from('invoices')
        .select('id, invoice_number, status, total_amount, amount_paid, amount_due, job_card_id, booking_id')
        .in('job_card_id', jcIds),
      bookingIds.length > 0
        ? svc.from('invoices')
          .select('id, invoice_number, status, total_amount, amount_paid, amount_due, job_card_id, booking_id')
          .in('booking_id', bookingIds)
        : Promise.resolve({ data: [] }),
    ])

    // Merge: prefer job_card_id match, fallback to booking_id match
    const allInvoices = [
      ...((invByJobCard.data ?? []) as (JobInvoice & { job_card_id: string | null; booking_id: string | null })[]),
      ...((invByBooking.data ?? []) as (JobInvoice & { job_card_id: string | null; booking_id: string | null })[]),
    ]
    // Deduplicate by invoice id
    const seenInv = new Set<string>()
    const uniqueInvoices = allInvoices.filter((inv) => { if (seenInv.has(inv.id)) return false; seenInv.add(inv.id); return true })

    // Fetch payments for all invoices
    let paymentsMap: Record<string, InvoicePayment[]> = {}
    if (uniqueInvoices.length > 0) {
      const { data: paymentsData } = await svc
        .from('payments')
        .select('id, amount, payment_method, payment_date, is_advance, invoice_id')
        .in('invoice_id', uniqueInvoices.map((inv) => inv.id))
        .order('payment_date', { ascending: true })
      const payments = (paymentsData ?? []) as (InvoicePayment & { invoice_id: string })[]
      for (const p of payments) {
        if (!paymentsMap[p.invoice_id]) paymentsMap[p.invoice_id] = []
        paymentsMap[p.invoice_id].push(p)
      }
    }

    // Map invoices + payments back to job cards
    jobCards = rawJobCards.map((jc) => {
      const inv = uniqueInvoices.find(
        (i) => i.job_card_id === jc.id || (!i.job_card_id && i.booking_id === jc.booking_id)
      ) ?? null
      return {
        ...jc,
        invoice: inv ? { ...inv, payments: paymentsMap[inv.id] ?? [] } : null,
      }
    })
  }

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

      {/* Pipeline Status — job card + invoice + payments */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          {jobCards.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No job card yet for this lead.</p>
          ) : (
            <div className="space-y-4">
              {jobCards.map((jc) => {
                const inv = jc.invoice

                return (
                  <div key={jc.id} className="rounded-md border overflow-hidden">
                    {/* Job header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <Link
                            href={`/manager/jobs/${jc.id}`}
                            className="text-sm font-medium hover:underline font-mono"
                          >
                            {jc.id.slice(0, 8).toUpperCase()}
                          </Link>
                          {jc.reg_number && (
                            <span className="ml-2 text-xs text-muted-foreground">{jc.reg_number}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={JOB_STATUS_VARIANT[jc.status] ?? 'secondary'}
                        className="text-xs capitalize"
                      >
                        {jc.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {/* Invoice info */}
                    {inv ? (
                      <div className="px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                            <Link
                              href={`/accounts/invoices/${inv.id}`}
                              className="text-sm font-medium font-mono hover:underline"
                            >
                              {inv.invoice_number}
                            </Link>
                          </div>
                          <Badge
                            variant={INVOICE_STATUS_VARIANT[inv.status] ?? 'secondary'}
                            className="text-xs capitalize"
                          >
                            {inv.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Amount summary */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold mt-0.5">
                              Rs.&nbsp;{Number(inv.total_amount).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="rounded bg-green-50 border border-green-100 px-3 py-2">
                            <p className="text-muted-foreground">Paid</p>
                            <p className="font-semibold text-green-700 mt-0.5">
                              Rs.&nbsp;{Number(inv.amount_paid).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className={`rounded px-3 py-2 ${Number(inv.amount_due) > 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                            <p className="text-muted-foreground">Due</p>
                            <p className={`font-semibold mt-0.5 ${Number(inv.amount_due) > 0 ? 'text-destructive' : 'text-green-700'}`}>
                              Rs.&nbsp;{Number(inv.amount_due).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>

                        {/* Payments timeline */}
                        {inv.payments && inv.payments.length > 0 && (
                          <div className="space-y-1.5 border-t pt-2.5">
                            <p className="text-xs text-muted-foreground font-medium">Payments</p>
                            {inv.payments.map((p) => {
                              let PayIcon = CreditCard
                              if (p.payment_method === 'cash') PayIcon = Banknote
                              else if (p.payment_method === 'bank_transfer') PayIcon = Landmark
                              else if (['upi', 'gpay'].includes(p.payment_method)) PayIcon = Smartphone

                              return (
                                <div key={p.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <PayIcon className="h-3 w-3" />
                                    <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                                    {p.is_advance && (
                                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Advance</span>
                                    )}
                                    <span>{new Date(p.payment_date).toLocaleDateString('en-IN')}</span>
                                  </div>
                                  <span className="font-medium text-green-700">
                                    Rs.&nbsp;{Number(p.amount).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 text-xs text-muted-foreground italic">
                        No invoice yet.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
