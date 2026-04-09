import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeliverySignOff } from '@/components/job-cards/delivery-sign-off'
import { markReadyForDelivery } from '@/lib/actions/invoices'
import { CheckCircle2, FileText } from 'lucide-react'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Service client for all data — RLS blocks branch_manager on job_cards and invoices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

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
          {decodeURIComponent(error)}
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
          <div
            key={step.label}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${step.done ? 'text-green-700' : 'text-muted-foreground'}`}
          >
            <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${step.done ? 'text-green-500' : 'text-muted-foreground/30'}`} />
            {step.label}
          </div>
        ))}
      </div>

      {/* Create Invoice — links to interactive builder */}
      {isQcDone && !hasInvoice && (
        <div className="flex items-center gap-3 rounded-md bg-muted/50 border px-4 py-3">
          <div className="flex-1 text-sm">
            <p className="font-medium">Invoice not yet created</p>
            <p className="text-muted-foreground text-xs">
              Items pre-filled from quotation — review and confirm before creating.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/accounts/invoices/new?job_card_id=${id}`}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Create Invoice
            </Link>
          </Button>
        </div>
      )}

      {/* Invoice link */}
      {hasInvoice && (
        <div className="text-sm flex items-center gap-3 rounded-md border px-4 py-3">
          <div className="flex-1">
            <p className="font-medium">Invoice</p>
            <a href={`/accounts/invoices/${inv!.id}`} className="hover:underline text-primary text-xs">
              View / Record Payment
            </a>
          </div>
          {!isInvoicePaid && (
            <span className="text-destructive text-xs font-medium">
              Rs.&nbsp;{Number(inv!.amount_due).toLocaleString('en-IN')} outstanding
            </span>
          )}
          {isInvoicePaid && (
            <span className="text-green-600 text-xs font-medium">Paid</span>
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
