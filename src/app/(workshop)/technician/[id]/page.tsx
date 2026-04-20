import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JobTimer } from '@/components/workshop/job-timer'
import { PhotoUploader } from '@/components/workshop/photo-uploader'
import { MaterialLog } from '@/components/workshop/material-log'
import { ItemsUsedLog } from '@/components/workshop/items-used-log'
import { getActiveTimer, getTimeLogs } from '@/lib/actions/time-logs'
import { getJobPhotos } from '@/lib/actions/photos'
import { getReservedMaterials, getJobPartsUsed } from '@/lib/actions/materials'
import { moveToQcPending } from '@/lib/actions/photos'
import { TechnicianChecklist } from '@/components/workshop/technician-checklist'
import { ChevronLeft, AlertTriangle, CheckCircle2, Clock, Camera } from 'lucide-react'

const CONDITION_COLORS: Record<string, string> = {
  ok: 'bg-green-100 text-green-800',
  scratch: 'bg-yellow-100 text-yellow-800',
  dent: 'bg-orange-100 text-orange-800',
  both: 'bg-red-100 text-red-800',
}

export default async function TechnicianJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Use service client — RLS blocks technician reads via is_assigned_to_job()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data } = await service
    .from('job_cards')
    .select('id, status, reg_number, bay_number, odometer_reading, customer_concerns, body_condition_map, estimated_completion, customers(full_name)')
    .eq('id', id)
    .eq('assigned_to', user!.id)
    .single()

  if (!data) notFound()

  const j = data as {
    id: string; status: string; reg_number: string; bay_number: string | null
    odometer_reading: number | null
    customer_concerns: string | null
    body_condition_map: Record<string, { condition: string; notes: string }> | null
    estimated_completion: string | null
    customers: { full_name: string } | null
  }

  const cust = j.customers as { full_name: string } | null
  const bodyMap = j.body_condition_map ?? {}

  // Fetch tasks alongside other data
  const [activeTimer, photos, materials, timeLogs, tasksRes, partsUsed] = await Promise.all([
    getActiveTimer(id),
    getJobPhotos(id),
    getReservedMaterials(id),
    getTimeLogs(id),
    service.from('job_tasks')
      .select('id, title, status')
      .eq('job_card_id', id)
      .order('order_index'),
    getJobPartsUsed(id),
  ])

  const tasks = (tasksRes.data ?? []) as Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>

  const photoCount = photos.filter((p) => ['before', 'during', 'after'].includes(p.stage)).length
  const stageCounts = {
    before: photos.filter((p) => p.stage === 'before').length,
    during: photos.filter((p) => p.stage === 'during').length,
    after: photos.filter((p) => p.stage === 'after').length,
  }
  const missingStages = (['before', 'during', 'after'] as const).filter((s) => stageCounts[s] === 0)
  const meetsPhotoMinimum = photoCount >= 4
  const canMoveToQc = j.status === 'in_progress' && meetsPhotoMinimum && missingStages.length === 0

  const totalMinutes = timeLogs
    .filter((l) => l.duration_mins != null)
    .reduce((sum, l) => sum + (l.duration_mins ?? 0), 0)

  // Build QC gate checklist items
  const qcGateItems = [
    {
      label: j.status === 'created' ? 'Start timer to begin work' : 'Work started',
      done: j.status !== 'created',
      icon: Clock,
    },
    {
      label: meetsPhotoMinimum
        ? `${photoCount} photos uploaded`
        : `${photoCount}/4 photos (need ${4 - photoCount} more)`,
      done: meetsPhotoMinimum,
      icon: Camera,
    },
    ...(['before', 'during', 'after'] as const).map((stage) => ({
      label: stageCounts[stage] > 0
        ? `${stage.charAt(0).toUpperCase() + stage.slice(1)} photo ✓`
        : `Missing ${stage} photo`,
      done: stageCounts[stage] > 0,
      icon: Camera,
    })),
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/technician" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{j.reg_number}</h1>
          <p className="text-sm text-muted-foreground">{cust?.full_name}</p>
        </div>
        <Badge variant="info" className="text-xs capitalize flex-shrink-0">
          {j.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* QC Progress / Submit Panel — always visible at the top */}
      {j.status !== 'pending_qc' && j.status !== 'delivered' && (
        <div className={`rounded-xl border-2 p-4 space-y-3 ${canMoveToQc ? 'border-green-400 bg-green-50' : 'border-border bg-muted/30'}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {canMoveToQc ? '✅ Ready for QC' : 'Complete these to submit for QC'}
            </p>
            {canMoveToQc && (
              <span className="text-xs text-green-700 font-medium">All done!</span>
            )}
          </div>

          <div className="space-y-1.5">
            {qcGateItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {canMoveToQc && (
            <form action={async () => { 'use server'; await moveToQcPending(id) }}>
              <Button type="submit" className="w-full h-12 text-base font-semibold">
                Submit for QC Inspection
              </Button>
            </form>
          )}
        </div>
      )}

      {j.status === 'pending_qc' && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-center">
          <p className="text-sm font-semibold text-amber-800">Waiting for QC Inspection</p>
          <p className="text-xs text-amber-600 mt-0.5">Your job has been submitted. The QC inspector will review it.</p>
        </div>
      )}

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-muted/50 px-2 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bay</p>
          <p className="text-sm font-bold">{j.bay_number ?? '—'}</p>
        </div>
        <div className="rounded-md bg-muted/50 px-2 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Odometer</p>
          <p className="text-sm font-bold">{j.odometer_reading != null ? `${j.odometer_reading.toLocaleString('en-IN')}km` : '—'}</p>
        </div>
      </div>

      {/* Customer concerns */}
      {j.customer_concerns && (
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Customer Concerns</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{j.customer_concerns}</p>
          </CardContent>
        </Card>
      )}

      {/* Body condition — damages only */}
      {Object.entries(bodyMap).some(([, d]) => d.condition !== 'ok') && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Pre-existing Damage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(bodyMap)
                .filter(([, d]) => d.condition !== 'ok')
                .map(([zone, d]) => (
                  <div key={zone} className={`px-3 py-1.5 rounded text-xs font-medium ${CONDITION_COLORS[d.condition] ?? 'bg-muted'}`}>
                    <span className="capitalize font-semibold">{zone}</span>
                    {' — '}
                    <span className="capitalize">{d.condition}</span>
                    {d.notes && <span className="ml-1 font-normal opacity-80">({d.notes})</span>}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Time Tracking</span>
            {totalMinutes > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobTimer jobCardId={id} activeLog={activeTimer} />
          {timeLogs.filter((l) => l.ended_at).length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-3">
              {timeLogs
                .filter((l) => l.ended_at)
                .slice(0, 5)
                .map((l) => (
                  <div key={l.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(l.started_at).toLocaleTimeString('en-IN', { timeStyle: 'short' })}</span>
                    <span>{l.duration_mins != null ? `${l.duration_mins}m` : '—'}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Job Photos</span>
            <span className={`text-xs font-normal ${meetsPhotoMinimum ? 'text-green-600' : 'text-amber-600'}`}>
              {photoCount}/4 minimum
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUploader jobCardId={id} existingPhotos={photos} />
        </CardContent>
      </Card>

      {/* Reserved inventory consumption (manager pre-reserved items) */}
      {materials.some((m) => m.transaction_type === 'reserve') && (
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Reserved Material Usage</CardTitle></CardHeader>
          <CardContent>
            <MaterialLog jobCardId={id} reservedItems={materials} />
          </CardContent>
        </Card>
      )}

      {/* Items used — always visible, free-text logging by technician */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Items Used</span>
            {partsUsed.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {partsUsed.length} logged
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsUsedLog jobCardId={id} initialParts={partsUsed} />
        </CardContent>
      </Card>

      {/* Technician Checklist */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Work Checklist</span>
            {tasks.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} done
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TechnicianChecklist jobCardId={id} initialTasks={tasks} />
        </CardContent>
      </Card>
    </div>
  )
}
