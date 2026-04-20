import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateJobCardStatus, assignTechnician } from '@/lib/actions/job-cards'
import { CertificateButton } from '@/components/jobs/certificate-button'
import { FaultForm } from '@/components/faults/fault-form'
import { TaskList } from '@/components/jobs/task-list'
import { ReworkPanel } from '@/components/jobs/rework-panel'
import { CommunicationLog } from '@/components/leads/communication-log'
import { MaterialReservationForm } from '@/components/jobs/material-reservation-form'
import { FileText, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

type JobCardDetail = {
  id: string
  status: string
  reg_number: string
  odometer_reading: number | null
  bay_number: string | null
  customer_concerns: string | null
  body_condition_map: Record<string, { condition: string; notes: string }> | null
  intake_signature_url: string | null
  intake_signed_at: string | null
  estimated_completion: string | null
  notes: string | null
  created_at: string
  customers: { full_name: string; phone: string } | null
  profiles_assigned: { id: string; full_name: string } | null
  bookings: { id: string; advance_pct: number; lead_id: string } | null
}

const STATUS_ORDER = ['created', 'in_progress', 'pending_qc', 'qc_passed', 'ready_for_delivery', 'delivered']

const CONDITION_COLORS: Record<string, string> = {
  ok: 'bg-green-100 text-green-800',
  scratch: 'bg-yellow-100 text-yellow-800',
  dent: 'bg-orange-100 text-orange-800',
  both: 'bg-red-100 text-red-800',
}

export default async function JobCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Use service client — regular client RLS may block reads for manager/profiles joins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  // Still need auth client for user session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [jobRes, techsRes, categoriesRes, tasksRes, photosRes, qcRes] = await Promise.all([
    db.from('job_cards')
      .select('id, status, reg_number, odometer_reading, bay_number, customer_concerns, body_condition_map, intake_signature_url, intake_signed_at, estimated_completion, notes, created_at, customers(full_name, phone), profiles_assigned:profiles!job_cards_assigned_to_fkey(id, full_name), bookings(id, advance_pct, lead_id)')
      .eq('id', id)
      .single(),
    db.from('profiles')
      .select('id, full_name')
      .eq('role', 'workshop_technician')
      .eq('is_active', true)
      .order('full_name'),
    db.from('issue_categories').select('id, name').order('name'),
    db.from('job_tasks').select('id, title, status, assigned_to, order_index, profiles!job_tasks_assigned_to_fkey(full_name)').eq('job_card_id', id).order('order_index'),
    db.from('job_photos').select('id, stage, r2_url, file_name, created_at').eq('job_card_id', id).order('created_at', { ascending: true }),
    db.from('qc_records')
      .select('id, overall_result, rework_required, rework_notes, signed_off_at, profiles!qc_records_inspector_id_fkey(full_name), qc_checklist_results(check_point, result, notes)')
      .eq('job_card_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!jobRes.data) notFound()

  const j = jobRes.data as JobCardDetail
  const technicians = (techsRes.data ?? []) as { id: string; full_name: string }[]
  const categories = (categoriesRes.data ?? []) as { id: string; name: string }[]
  const tasks = (tasksRes.data ?? []) as { id: string; title: string; status: 'pending' | 'in_progress' | 'completed'; assigned_to: string | null; order_index: number; profiles: { full_name: string } | null }[]

  type Photo = { id: string; stage: string; r2_url: string; file_name: string | null; created_at: string }
  const photos = (photosRes.data ?? []) as Photo[]
  const photosByStage = photos.reduce<Record<string, Photo[]>>((acc, p) => {
    acc[p.stage] = acc[p.stage] ?? []
    acc[p.stage].push(p)
    return acc
  }, {})

  type ChecklistItem = { check_point: string; result: string; notes: string | null }
  const qcRecord = qcRes.data as {
    id: string
    overall_result: string
    rework_required: boolean
    rework_notes: string | null
    signed_off_at: string | null
    profiles: { full_name: string } | null
    qc_checklist_results: ChecklistItem[]
  } | null

  const leadId = j.bookings?.lead_id ?? null
  const { data: commsData } = leadId ? await db.from('communications').select('id, type, notes, created_at, profiles(full_name)').eq('lead_id', leadId).order('created_at', { ascending: false }) : { data: [] }
  const comms = (commsData ?? []) as {
    id: string; type: 'call' | 'whatsapp' | 'visit' | 'email' | 'note'
    notes: string; created_at: string
    profiles: { full_name: string | null } | null
  }[]

  const cust = j.customers as { full_name: string; phone: string } | null
  const assignedTech = j.profiles_assigned as { id: string; full_name: string } | null
  const bodyMap = j.body_condition_map ?? {}

  const currentStatusIdx = STATUS_ORDER.indexOf(j.status)
  const nextStatus = STATUS_ORDER[currentStatusIdx + 1] ?? null

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono">{j.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">{cust?.full_name} &middot; {j.reg_number}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline">
            <Link href={`/manager/jobs/${id}/intake`}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />Intake Record
            </Link>
          </Button>
          <Badge variant="info" className="text-xs capitalize">{j.status.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      {/* Rework Panel — shown when QC has failed and rework is scheduled */}
      {j.status === 'rework_scheduled' && (
        <ReworkPanel jobCardId={id} />
      )}

      {/* Status Progression — skip for rework_scheduled (handled by ReworkPanel) */}
      {nextStatus && j.status !== 'delivered' && j.status !== 'rework_scheduled' && (
        <form action={async () => { 'use server'; await updateJobCardStatus(id, nextStatus) }}>
          <Button type="submit" size="sm">
            Move to: {nextStatus.replace(/_/g, ' ')}
          </Button>
        </form>
      )}

      {/* Assign Technician */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Technician Assignment</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              {assignedTech ? (
                <span className="text-foreground font-medium">{assignedTech.full_name}</span>
              ) : 'Unassigned'}
            </p>
            <form className="flex gap-2" action={async (fd: FormData) => {
              'use server'
              const techId = fd.get('technician_id') as string
              if (techId) await assignTechnician(id, techId)
            }}>
              <select
                name="technician_id"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue={assignedTech?.id ?? ''}
              >
                <option value="">Select technician</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">Assign</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Task Breakdown */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Task Breakdown</CardTitle>
          <div className="flex items-center gap-3">
            {['created', 'in_progress', 'pending_qc'].includes(j.status) && (
              <MaterialReservationForm jobCardId={id} />
            )}
            {tasks.length > 0 && (() => {
              const doneCnt = tasks.filter(t => t.status === 'completed').length
              const pct = Math.round((doneCnt / tasks.length) * 100)
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{pct}% complete</span>
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <TaskList jobCardId={id} tasks={tasks} canCreate={!['delivered'].includes(j.status)} />
        </CardContent>
      </Card>

      {/* Job Photos */}
      {photos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Job Photos ({photos.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['before', 'during', 'after', 'qc', 'delivery'] as const).map((stage) => {
              const stagePics = photosByStage[stage]
              if (!stagePics?.length) return null
              return (
                <div key={stage}>
                  <p className="text-xs text-muted-foreground capitalize mb-1.5">{stage}</p>
                  <div className="flex flex-wrap gap-2">
                    {stagePics.map((p) => (
                      <a key={p.id} href={p.r2_url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.r2_url}
                          alt={p.file_name ?? stage}
                          className="h-20 w-20 object-cover rounded-md border hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* QC Inspection Record */}
      {qcRecord && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">QC Inspection</CardTitle>
              <Badge
                variant={qcRecord.overall_result === 'pass' ? 'success' : 'destructive'}
                className="text-xs capitalize"
              >
                {qcRecord.overall_result === 'pass' ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {qcRecord.profiles && (
              <p className="text-xs text-muted-foreground">
                Inspector: <span className="text-foreground font-medium">{qcRecord.profiles.full_name}</span>
                {qcRecord.signed_off_at && (
                  <span className="ml-2">
                    · {new Date(qcRecord.signed_off_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </p>
            )}
            {qcRecord.rework_notes && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                Rework notes: {qcRecord.rework_notes}
              </div>
            )}
            {qcRecord.qc_checklist_results.length > 0 && (
              <div className="space-y-1 pt-1">
                {qcRecord.qc_checklist_results.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {item.result === 'pass'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      : item.result === 'fail'
                        ? <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                        : <MinusCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />}
                    <span className={item.result === 'fail' ? 'text-destructive' : ''}>{item.check_point}</span>
                    {item.notes && <span className="text-muted-foreground ml-1">— {item.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Registration</p>
            <p className="font-mono font-medium">{j.reg_number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Odometer</p>
            <p>{j.odometer_reading != null ? `${j.odometer_reading.toLocaleString('en-IN')} km` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bay</p>
            <p>{j.bay_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Completion</p>
            <p>{j.estimated_completion ? new Date(j.estimated_completion).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Body Condition */}
      {Object.keys(bodyMap).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Body Condition</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(bodyMap).map(([zone, data]) => (
                <div key={zone} className={`px-3 py-2 rounded-md text-xs font-medium ${CONDITION_COLORS[data.condition] ?? 'bg-muted'}`}>
                  <p className="capitalize font-semibold">{zone}</p>
                  <p className="capitalize opacity-80">{data.condition}</p>
                  {data.notes && <p className="mt-0.5 opacity-70">{data.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Concerns */}
      {j.customer_concerns && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Concerns</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{j.customer_concerns}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {j.intake_signature_url && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Signature</CardTitle></CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={j.intake_signature_url}
              alt="Customer signature"
              className="border rounded-md bg-white max-h-32 max-w-xs"
            />
            {j.intake_signed_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Signed: {new Date(j.intake_signed_at).toLocaleString('en-IN')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {j.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{j.notes}</p></CardContent>
        </Card>
      )}

      {/* Activity Log */}
      {leadId && (
        <Card>
          <CardContent className="p-4">
            <CommunicationLog leadId={leadId} entries={comms} />
          </CardContent>
        </Card>
      )}

      {/* Delivery / Post-QC actions */}
      {['qc_passed', 'ready_for_billing', 'ready_for_delivery', 'delivered'].includes(j.status) && (
        <div className="flex items-center gap-3 rounded-md bg-muted/50 border px-4 py-3">
          <div className="flex-1 text-sm">
            <p className="font-medium">Delivery &amp; Invoice</p>
            <p className="text-muted-foreground text-xs">Create invoice, record payment, and complete handover</p>
          </div>
          <Button asChild size="sm">
            <Link href={`/manager/jobs/${id}/delivery`}>
              {j.status === 'delivered' ? 'View Delivery' : 'Manage Delivery'}
            </Link>
          </Button>
        </div>
      )}

      {/* Certificate */}
      {j.status === 'delivered' && (
        <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex-1 text-sm">
            <p className="font-medium text-green-800">Quality Certificate</p>
            <p className="text-xs text-green-700">Job delivered and QC passed — generate customer certificate</p>
          </div>
          <CertificateButton jobCardId={id} />
        </div>
      )}

      {/* Report fault (delivered jobs only) */}
      {j.status === 'delivered' && (
        <div className="flex items-center gap-3 rounded-md border px-4 py-3">
          <div className="flex-1 text-sm">
            <p className="font-medium">Customer Comeback?</p>
            <p className="text-xs text-muted-foreground">Log if customer returns with an issue after delivery</p>
          </div>
          <FaultForm jobCardId={id} categories={categories} />
        </div>
      )}

      {/* Booking link */}
      {j.bookings && (
        <div className="text-sm text-muted-foreground">
          Booking:{' '}
          <Link
            href={`/sales/bookings/${(j.bookings as { id: string }).id}`}
            className="hover:underline text-foreground"
          >
            {(j.bookings as { id: string }).id.slice(0, 8).toUpperCase()}
          </Link>
        </div>
      )}
    </div>
  )
}
