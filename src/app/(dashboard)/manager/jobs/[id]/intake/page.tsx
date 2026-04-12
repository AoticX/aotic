import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Car, Droplets, Gauge, Package2 } from 'lucide-react'

const CONDITION_COLORS: Record<string, string> = {
  ok: 'bg-green-100 text-green-800',
  scratch: 'bg-yellow-100 text-yellow-800',
  dent: 'bg-orange-100 text-orange-800',
  both: 'bg-red-100 text-red-800',
}

export default async function JobIntakePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Service client — managers who didn't create the job card are RLS-blocked on job_cards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data } = await db
    .from('job_cards')
    .select('id, status, reg_number, odometer_reading, fuel_level_pct, bay_number, customer_concerns, belongings_inventory, spare_parts_check, body_condition_map, intake_signature_url, intake_signed_at, estimated_completion, notes, created_at, customers(full_name, phone)')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const j = data as {
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
  }

  const cust = j.customers
  const bodyMap = j.body_condition_map ?? {}

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/manager/jobs/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Vehicle Intake Record</h1>
          <p className="text-sm text-muted-foreground">
            Job {j.id.slice(0, 8).toUpperCase()} &middot;{' '}
            <span className="capitalize">{j.status.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      {/* Customer + Vehicle */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{cust?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{cust?.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Car className="h-3 w-3" />Registration
            </p>
            <p className="font-mono font-semibold">{j.reg_number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3" />Odometer
            </p>
            <p>{j.odometer_reading != null ? `${j.odometer_reading.toLocaleString('en-IN')} km` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Droplets className="h-3 w-3" />Fuel Level
            </p>
            <p>{j.fuel_level_pct != null ? `${j.fuel_level_pct}%` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bay</p>
            <p>{j.bay_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Completion</p>
            <p>
              {j.estimated_completion
                ? new Date(j.estimated_completion).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Package2 className="h-3 w-3" />Spare Parts in Vehicle
            </p>
            <Badge variant={j.spare_parts_check ? 'success' : 'secondary'} className="text-xs mt-0.5">
              {j.spare_parts_check ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Check-in Date</p>
            <p>{new Date(j.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Body Condition */}
      {Object.keys(bodyMap).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Body Condition Map</CardTitle></CardHeader>
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
          <CardContent><p className="text-sm">{j.customer_concerns}</p></CardContent>
        </Card>
      )}

      {/* Internal Notes */}
      {j.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Internal Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{j.notes}</p></CardContent>
        </Card>
      )}

      {/* Intake Signature */}
      {j.intake_signature_url && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Signature at Check-in</CardTitle></CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={j.intake_signature_url}
              alt="Customer intake signature"
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
    </div>
  )
}
