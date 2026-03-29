import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateJobCardStatus, assignTechnician } from '@/lib/actions/job-cards'

type JobCardDetail = {
  id: string
  status: string
  reg_number: string
  odometer_reading: number | null
  fuel_level_pct: number | null
  bay_number: string | null
  customer_concerns: string | null
  belongings_inventory: string[] | null
  spare_parts_check: boolean
  body_condition_map: Record<string, { condition: string; notes: string }> | null
  intake_signature_url: string | null
  intake_signed_at: string | null
  estimated_completion: string | null
  notes: string | null
  created_at: string
  customers: { full_name: string; phone: string } | null
  profiles_assigned: { id: string; full_name: string } | null
  bookings: { id: string; advance_pct: number } | null
}

const STATUS_ORDER = ['created', 'in_progress', 'qc_pending', 'qc_passed', 'qc_failed', 'ready_for_delivery', 'delivered']

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
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [jobRes, techsRes] = await Promise.all([
    db.from('job_cards')
      .select('id, status, reg_number, odometer_reading, fuel_level_pct, bay_number, customer_concerns, belongings_inventory, spare_parts_check, body_condition_map, intake_signature_url, intake_signed_at, estimated_completion, notes, created_at, customers(full_name, phone), profiles!job_cards_assigned_to_fkey(id, full_name), bookings(id, advance_pct)')
      .eq('id', id)
      .single(),
    db.from('profiles')
      .select('id, full_name')
      .eq('role', 'workshop_technician')
      .eq('is_active', true)
      .order('full_name'),
  ])

  if (!jobRes.data) notFound()

  const j = jobRes.data as JobCardDetail
  const technicians = (techsRes.data ?? []) as { id: string; full_name: string }[]

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
        <Badge variant="info" className="text-xs capitalize">{j.status.replace(/_/g, ' ')}</Badge>
      </div>

      {/* Status Progression */}
      {nextStatus && j.status !== 'delivered' && (
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
            <p className="text-xs text-muted-foreground">Fuel Level</p>
            <p>{j.fuel_level_pct != null ? `${j.fuel_level_pct}%` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bay</p>
            <p>{j.bay_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Completion</p>
            <p>{j.estimated_completion ? new Date(j.estimated_completion).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spare Parts</p>
            <p>{j.spare_parts_check ? 'Yes' : 'No'}</p>
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

      {/* Belongings */}
      {j.belongings_inventory && j.belongings_inventory.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Belongings Inventory</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
              {j.belongings_inventory.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
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

      {/* Booking link */}
      {j.bookings && (
        <div className="text-sm text-muted-foreground">
          Booking:{' '}
          <Link
            href={`/dashboard/sales/bookings/${(j.bookings as { id: string }).id}`}
            className="hover:underline text-foreground"
          >
            {(j.bookings as { id: string }).id.slice(0, 8).toUpperCase()}
          </Link>
        </div>
      )}
    </div>
  )
}
