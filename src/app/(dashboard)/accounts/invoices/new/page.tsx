import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { InvoiceBuilder } from '@/components/invoices/invoice-builder'

type InitialItem = {
  id: string
  vertical_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_pct: number
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ job_card_id?: string }>
}) {
  const { job_card_id } = await searchParams
  if (!job_card_id) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Redirect if invoice already exists for this job
  const { data: existing } = await db
    .from('invoices')
    .select('id')
    .eq('job_card_id', job_card_id)
    .maybeSingle()
  if (existing) redirect(`/accounts/invoices/${existing.id}`)

  // Fetch job card with booking + customer (fall back to lead when no customer record yet)
  const { data: jobData } = await db
    .from('job_cards')
    .select('id, reg_number, status, customer_id, booking_id, customers(full_name, phone), bookings(id, advance_amount, advance_payment_method, quotation_id, leads(contact_name, customer_name, contact_phone))')
    .eq('id', job_card_id)
    .single()

  if (!jobData) notFound()

  const job = jobData as {
    id: string; reg_number: string; status: string
    customer_id: string | null; booking_id: string
    customers: { full_name: string; phone: string } | null
    bookings: {
      id: string; advance_amount: number
      advance_payment_method: string | null; quotation_id: string | null
      leads: { contact_name: string | null; customer_name: string | null; contact_phone: string | null } | null
    } | null
  }

  // Pre-fill items from quotation
  const quotationId = job.bookings?.quotation_id
  let initialItems: InitialItem[] = []

  if (quotationId) {
    const { data: qItems } = await db
      .from('quotation_items')
      .select('description, quantity, unit_price, discount_pct, vertical_id')
      .eq('quotation_id', quotationId)
      .order('sort_order')

    let counter = 0
    initialItems = ((qItems ?? []) as {
      description: string; quantity: number; unit_price: number
      discount_pct: number; vertical_id: string | null
    }[]).map((item) => ({
      id: `item-${++counter}-${Date.now()}`,
      vertical_id: item.vertical_id ?? null,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      discount_pct: Number(item.discount_pct ?? 0),
    }))
  }

  const lead = job.bookings?.leads
  const custName = job.customers?.full_name ?? lead?.contact_name ?? lead?.customer_name ?? 'Customer'
  const advance = Number(job.bookings?.advance_amount ?? 0)
  const advanceMethod = job.bookings?.advance_payment_method ?? null

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Create Invoice</h1>
        <p className="text-sm text-muted-foreground">
          {custName}
          &nbsp;&middot;&nbsp;
          <span className="font-mono">{job.reg_number}</span>
          &nbsp;&middot;&nbsp;Job&nbsp;{job.id.slice(0, 8).toUpperCase()}
        </p>
        {!job.bookings?.quotation_id && (
          <p className="text-xs text-amber-600 mt-1">
            No quotation linked — add items manually below.
          </p>
        )}
      </div>

      <InvoiceBuilder
        jobCardId={job_card_id}
        customerName={custName}
        regNumber={job.reg_number}
        advanceAmount={advance}
        advanceMethod={advanceMethod}
        initialItems={initialItems}
      />
    </div>
  )
}
