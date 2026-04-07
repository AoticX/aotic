'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function generateInvoiceNumber(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `INV-${ymd}-${suffix}`
}

export async function createInvoice(jobCardId: string): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // Service client — RLS blocks accounts/manager from reading job_cards, invoices, payments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Fetch job card with booking + quotation
  const { data: jobData } = await db
    .from('job_cards')
    .select('id, status, qc_signed_off_by, customer_id, booking_id, branch_id, bookings(id, quotation_id, advance_amount, advance_payment_method, advance_paid_at)')
    .eq('id', jobCardId)
    .single()
  if (!jobData) return { error: 'Job card not found.' }

  const job = jobData as {
    id: string; status: string; qc_signed_off_by: string | null
    customer_id: string; booking_id: string; branch_id: string | null
    bookings: { id: string; quotation_id: string; advance_amount: number; advance_payment_method: string | null; advance_paid_at: string | null } | null
  }

  if (!job.qc_signed_off_by) return { error: 'QC sign-off required before creating invoice.' }

  const quotationId = job.bookings?.quotation_id
  if (!quotationId) return { error: 'No quotation linked to this job.' }

  // Check no invoice already exists
  const { data: existing } = await db
    .from('invoices').select('id').eq('job_card_id', jobCardId).maybeSingle()
  if (existing) return { error: 'Invoice already exists for this job.' }

  // Fetch quotation totals
  const { data: quotData } = await db
    .from('quotations')
    .select('subtotal, discount_amount, tax_amount, total_amount')
    .eq('id', quotationId)
    .single()
  if (!quotData) return { error: 'Quotation not found.' }

  const q = quotData as {
    subtotal: number; discount_amount: number
    tax_amount: number; total_amount: number
  }

  // Fetch quotation items
  const { data: itemsData } = await db
    .from('quotation_items')
    .select('description, quantity, unit_price, discount_pct, line_total, vertical_id, sort_order')
    .eq('quotation_id', quotationId)
    .order('sort_order')
  const qItems = (itemsData ?? []) as {
    description: string; quantity: number; unit_price: number
    discount_pct: number; line_total: number; vertical_id: string | null; sort_order: number
  }[]

  // Advance already paid becomes amount_paid
  const advancePaid = Number(job.bookings?.advance_amount ?? 0)

  const { data: invData, error: invError } = await db
    .from('invoices')
    .insert({
      job_card_id: jobCardId,
      booking_id: job.booking_id,
      customer_id: job.customer_id,
      invoice_number: generateInvoiceNumber(),
      status: 'draft',
      subtotal: q.subtotal,
      discount_amount: q.discount_amount,
      tax_amount: q.tax_amount,
      total_amount: q.total_amount,
      amount_paid: advancePaid,
      branch_id: job.branch_id ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (invError) return { error: invError.message }
  const invoiceId = (invData as { id: string }).id

  // Insert invoice items
  if (qItems.length > 0) {
    await db.from('invoice_items').insert(
      qItems.map((item, i) => ({
        invoice_id: invoiceId,
        description: item.description,
        vertical_id: item.vertical_id ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_pct: item.discount_pct,
        line_total: item.line_total,
        sort_order: i,
      }))
    )
  }

  // Record advance as an is_advance=true payment so it appears in payment history
  // and is correctly reconciled at delivery
  if (advancePaid > 0) {
    const advanceDate = job.bookings?.advance_paid_at
      ? job.bookings.advance_paid_at.split('T')[0]
      : new Date().toISOString().split('T')[0]
    await db.from('payments').insert({
      invoice_id: invoiceId,
      booking_id: job.booking_id,
      customer_id: job.customer_id,
      amount: advancePaid,
      payment_method: job.bookings?.advance_payment_method ?? 'cash',
      payment_date: advanceDate,
      is_advance: true,
      notes: 'Advance payment received at booking',
      recorded_by: user.id,
    })
  }

  // Move job to ready_for_billing
  await db.from('job_cards').update({ status: 'ready_for_billing' }).eq('id', jobCardId)

  revalidatePath(`/manager/jobs/${jobCardId}`)
  revalidatePath('/accounts/invoices')
  return { id: invoiceId }
}

export async function finalizeInvoice(invoiceId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data } = await db.from('invoices').select('is_locked, status').eq('id', invoiceId).single()
  const inv = data as { is_locked: boolean; status: string } | null
  if (!inv) return { error: 'Invoice not found.' }
  if (inv.is_locked) return { error: 'Invoice is locked and cannot be finalized.' }

  const { error } = await db
    .from('invoices')
    .update({ status: 'finalized', finalized_at: new Date().toISOString(), finalized_by: user.id })
    .eq('id', invoiceId)
  if (error) return { error: error.message }
  revalidatePath(`/accounts/invoices/${invoiceId}`)
  return {}
}

export async function recordPayment(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const invoiceId = formData.get('invoice_id') as string
  const amount = Number(formData.get('amount'))
  const method = formData.get('payment_method') as string
  const refNo = formData.get('reference_no') as string || null
  const notes = formData.get('notes') as string || null

  if (!amount || amount <= 0) return { error: 'Amount must be greater than zero.' }

  const { data: invData } = await db
    .from('invoices')
    .select('id, customer_id, booking_id, total_amount, amount_paid, amount_due')
    .eq('id', invoiceId)
    .single()
  if (!invData) return { error: 'Invoice not found.' }

  const inv = invData as {
    id: string; customer_id: string; booking_id: string
    total_amount: number; amount_paid: number; amount_due: number
  }

  if (amount > Number(inv.amount_due)) {
    return { error: `Amount exceeds outstanding balance of Rs. ${Number(inv.amount_due).toLocaleString('en-IN')}.` }
  }

  const { error } = await db.from('payments').insert({
    invoice_id: invoiceId,
    booking_id: inv.booking_id ?? null,
    customer_id: inv.customer_id,
    amount,
    payment_method: method,
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: refNo,
    notes,
    is_advance: false,
    recorded_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath(`/accounts/invoices/${invoiceId}`)
  return {}
}

/** Mark job as ready_for_delivery — enforces invoice payment at app layer */
export async function markReadyForDelivery(jobCardId: string): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: invData } = await db
    .from('invoices')
    .select('id, status, amount_due, is_locked')
    .eq('job_card_id', jobCardId)
    .maybeSingle()

  if (!invData) return { error: 'No invoice found. Create and finalize invoice first.' }
  const inv = invData as { id: string; status: string; amount_due: number; is_locked: boolean }

  if (Number(inv.amount_due) > 0) {
    return { error: `Outstanding balance of Rs. ${Number(inv.amount_due).toLocaleString('en-IN')} must be cleared before delivery.` }
  }

  // DB trigger enforce_qc_before_delivery will catch missing QC sign-off
  const { error } = await db
    .from('job_cards')
    .update({ status: 'ready_for_delivery' })
    .eq('id', jobCardId)
  if (error) return { error: error.message.replace('HARD_LOCK: ', '') }

  revalidatePath(`/manager/jobs/${jobCardId}`)
  return {}
}

export async function markDelivered(
  jobCardId: string,
  signatureUrl: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { error } = await db
    .from('job_cards')
    .update({
      status: 'delivered',
      delivery_signature_url: signatureUrl || null,
      delivery_signed_at: new Date().toISOString(),
      delivered_by: user.id,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', jobCardId)
  if (error) return { error: error.message.replace('HARD_LOCK: ', '') }

  revalidatePath(`/manager/jobs/${jobCardId}`)
  return {}
}

/** Export invoices as Tally-compatible CSV */
export async function exportTallyCsv(invoiceIds?: string[]): Promise<{ csv: string; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  let query = db
    .from('invoices')
    .select('invoice_number, status, subtotal, discount_amount, tax_amount, total_amount, amount_paid, amount_due, created_at, customers(full_name, phone), payments(amount, payment_method, payment_date, reference_number)')
    .in('status', ['finalized', 'partially_paid', 'paid'])
    .order('created_at', { ascending: false })

  if (invoiceIds && invoiceIds.length > 0) {
    query = query.in('id', invoiceIds)
  }

  const { data, error } = await query.limit(500)
  if (error) return { csv: '', error: error.message }

  const rows = (data ?? []) as {
    invoice_number: string; status: string
    subtotal: number; discount_amount: number; tax_amount: number
    total_amount: number; amount_paid: number; amount_due: number
    created_at: string
    customers: { full_name: string; phone: string } | null
    payments: { amount: number; payment_method: string; payment_date: string; reference_number: string | null }[]
  }[]

  const header = 'Invoice No,Date,Customer,Phone,Subtotal,Discount,Tax,Total,Paid,Due,Status,Payment Method,Ref No\n'
  const lines = rows.map((r) => {
    const cust = r.customers
    const lastPayment = r.payments?.[r.payments.length - 1]
    return [
      r.invoice_number,
      new Date(r.created_at).toLocaleDateString('en-IN'),
      cust?.full_name ?? '',
      cust?.phone ?? '',
      r.subtotal,
      r.discount_amount,
      r.tax_amount,
      r.total_amount,
      r.amount_paid,
      r.amount_due,
      r.status,
      lastPayment?.payment_method ?? '',
      lastPayment?.reference_number ?? '',
    ].join(',')
  })

  return { csv: header + lines.join('\n') }
}
