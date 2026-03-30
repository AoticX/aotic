import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeliverySignOff } from '@/components/job-cards/delivery-sign-off'
import { markReadyForDelivery, createInvoice } from '@/lib/actions/invoices'
import { CheckCircle2 } from 'lucide-react'

export default async function JobDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('job_cards')
    .select('id, status, reg_number, qc_signed_off_by, qc_signed_off_at, customers(full_name)')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const j = data as {
    id: string; status: string; reg_number: string
    qc_signed_off_by: string | null; qc_signed_off_at: string | null
    customers: { full_name: string } | null
  }

  if (['created', 'in_progress', 'pending_qc', 'rework_scheduled'].includes(j.status)) {
    redirect(`/manager/jobs/${id}`)
  }

  const cust = j.customers as { full_name: string } | null

  // Check invoice status
  const { data: invData } = await db
    .from('invoices')
    .select('id, status, amount_due, is_locked')
    .eq('job_card_id', id)
    .maybeSingle()
  const inv = invData as { id: string; status: string; amount_due: number; is_locked: boolean } | null

  const isQcDone = !!j.qc_signed_off_by
  const hasInvoice = !!inv
  const isInvoicePaid = inv ? Number(inv.amount_due) <= 0 : false
  const isReadyForDelivery = j.status === 'ready_for_delivery'
  const isDelivered = j.status === 'delivered'

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Delivery — {j.reg_number}</h1>
          <p className="text-sm text-muted-foreground">{cust?.full_name}</p>
        </div>
        <Badge variant={isDelivered ? 'success' : 'info'} className="text-xs capitalize">
          {j.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step tracker */}
      <div className="space-y-2">
        {[
          { label: 'QC Sign-off', done: isQcDone },
          { label: 'Invoice Created', done: hasInvoice },
          { label: 'Payment Cleared', done: isInvoicePaid },
          { label: 'Marked Ready for Delivery', done: isReadyForDelivery || isDelivered },
          { label: 'Delivered', done: isDelivered },
        ].map((step) => (
          <div key={step.label} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${step.done ? 'text-green-700' : 'text-muted-foreground'}`}>
            <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${step.done ? 'text-green-500' : 'text-muted-foreground/30'}`} />
            {step.label}
          </div>
        ))}
      </div>

      {/* Create invoice if not exists */}
      {isQcDone && !hasInvoice && (
        <form action={async () => {
          'use server'
          const result = await createInvoice(id)
          if (result.error) redirect(`/manager/jobs/${id}/delivery?error=${encodeURIComponent(result.error)}`)
          redirect(`/accounts/invoices/${result.id}`)
        }}>
          <Button type="submit">Create Invoice</Button>
        </form>
      )}

      {/* Invoice link */}
      {hasInvoice && (
        <div className="text-sm">
          Invoice:{' '}
          <a href={`/accounts/invoices/${inv!.id}`} className="hover:underline font-medium">
            View / Record Payment
          </a>
          {!isInvoicePaid && (
            <span className="ml-2 text-destructive text-xs">
              Rs. {Number(inv!.amount_due).toLocaleString('en-IN')} outstanding
            </span>
          )}
        </div>
      )}

      {/* Mark ready for delivery */}
      {hasInvoice && isInvoicePaid && !isReadyForDelivery && !isDelivered && (
        <form action={async () => {
          'use server'
          const result = await markReadyForDelivery(id)
          if (result?.error) redirect(`/manager/jobs/${id}/delivery?error=${encodeURIComponent(result.error)}`)
          redirect(`/manager/jobs/${id}/delivery`)
        }}>
          <Button type="submit">Mark Ready for Delivery</Button>
        </form>
      )}

      {/* Delivery sign-off */}
      {isReadyForDelivery && !isDelivered && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Delivery Handover Checklist</CardTitle></CardHeader>
          <CardContent>
            <DeliverySignOff jobCardId={id} />
          </CardContent>
        </Card>
      )}

      {isDelivered && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-4 text-center">
          <p className="text-green-800 font-bold text-lg">Vehicle Delivered</p>
          <p className="text-green-700 text-sm mt-1">All steps complete.</p>
        </div>
      )}
    </div>
  )
}
