'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function createBooking(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const quotationId = formData.get('quotation_id') as string
  const leadId = formData.get('lead_id') as string
  const customerId = formData.get('customer_id') as string
  const totalValue = Number(formData.get('total_value'))
  const advanceAmount = Number(formData.get('advance_amount') || 0)
  const advancePct = totalValue > 0 ? (advanceAmount / totalValue) * 100 : 0  // for validation only
  const promisedDelivery = formData.get('promised_delivery_at') as string
  const paymentMethod = formData.get('advance_payment_method') as string || 'cash'
  const proofUrl = formData.get('proof_url') as string || null
  const referenceNumber = formData.get('reference_number') as string || null

  if (!promisedDelivery) {
    redirect(`/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent('Promised delivery date is required')}`)
  }

  // 50% advance hard lock — no override here, manager override handled separately
  if (advancePct < 50) {
    redirect(`/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent(`Minimum 50% advance required. Current: ${advancePct.toFixed(1)}%`)}`)
  }

  const [{ data: profileData }, { data: quotationData }] = await Promise.all([
    supabase.from('profiles').select('role, branch_id').eq('id', user.id).single(),
    // Use service client to bypass RLS — explicit permission check below
    service.from('quotations').select('id, status, lead_id, leads(created_by, assigned_to)').eq('id', quotationId).maybeSingle(),
  ])

  const profile = profileData as { role: string; branch_id: string | null } | null
  const quotation = quotationData as {
    id: string
    status: string
    lead_id: string
    leads: { created_by: string | null; assigned_to: string | null } | null
  } | null

  if (!quotation) {
    redirect(`/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent('Quotation not found')}`)
  }

  const isPrivileged = ['owner', 'branch_manager'].includes(profile?.role ?? '')
  const canBook = isPrivileged
    || quotation?.leads?.created_by === user.id
    || quotation?.leads?.assigned_to === user.id

  if (!canBook) {
    redirect(`/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent('Only lead owner/assignee, manager, or owner can create booking.')}`)
  }

  if (!['accepted', 'approved'].includes(quotation?.status ?? '')) {
    redirect(`/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent('Quotation must be accepted by the customer before booking.')}`)
  }

  const { data: booking, error } = await db.from('bookings').insert({
    lead_id: leadId,
    quotation_id: quotationId,
    customer_id: customerId || null,
    status: 'confirmed',
    promised_delivery_at: promisedDelivery,
    total_amount: totalValue,
    advance_amount: advanceAmount,
    // advance_pct is GENERATED ALWAYS — do not insert
    advance_paid_at: advanceAmount > 0 ? new Date().toISOString() : null,
    advance_payment_method: paymentMethod,
    branch_id: profile?.branch_id ?? null,
    notes: formData.get('notes') as string || null,
    created_by: user.id,
  }).select('id').single()

  if (error) redirect(`/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent(error.message)}`)

  const bookingId = (booking as { id: string }).id

  // Record advance payment in payments table
  if (advanceAmount > 0) {
    await service.from('payments').insert({
      booking_id: bookingId,
      customer_id: customerId || null,
      amount: advanceAmount,
      payment_mode: paymentMethod,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      proof_url: proofUrl,
      is_advance: true,
      type: 'payment',
      recorded_by: user.id,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Advance payment at booking. Method: ${paymentMethod}`,
    })
  }

  // Mark quotation as accepted if not already
  await db.from('quotations').update({ status: 'accepted' }).eq('id', quotationId)

  revalidatePath('/sales/bookings')
  revalidatePath('/accounts/payments')
  revalidatePath('/accounts')
  revalidatePath('/owner')
  revalidatePath('/manager/activity')
  redirect(`/manager/jobs/new?booking=${bookingId}`)
}

export async function createBookingWithOverride(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role, branch_id').eq('id', user.id).single()
  const profile = profileData as { role: string; branch_id: string | null } | null

  if (!['owner', 'branch_manager'].includes(profile?.role ?? '')) {
    return { error: 'Only Owner or Branch Manager can override the advance requirement.' }
  }

  const overrideReason = formData.get('override_reason') as string
  if (!overrideReason || overrideReason.length < 20) {
    return { error: 'Override reason must be at least 20 characters.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const quotationId = formData.get('quotation_id') as string
  const { data: quotationData } = await service
    .from('quotations')
    .select('id, status, lead_id, leads(created_by, assigned_to)')
    .eq('id', quotationId)
    .maybeSingle()

  const quotation = quotationData as {
    id: string
    status: string
    lead_id: string
    leads: { created_by: string | null; assigned_to: string | null } | null
  } | null

  if (!quotation) return { error: 'Quotation not found.' }
  if (!['accepted', 'approved'].includes(quotation.status)) {
    return { error: 'Quotation must be accepted by the customer before booking.' }
  }

  const advanceAmount = Number(formData.get('advance_amount') || 0)
  const totalValue = Number(formData.get('total_value'))
  const advancePct = totalValue > 0 ? (advanceAmount / totalValue) * 100 : 0
  const customerId = formData.get('customer_id') as string
  const paymentMethod = formData.get('advance_payment_method') as string || 'cash'
  const proofUrl = formData.get('proof_url') as string || null
  const referenceNumber = formData.get('reference_number') as string || null

  const { data: booking, error } = await db.from('bookings').insert({
    lead_id: formData.get('lead_id') as string,
    quotation_id: quotationId,
    customer_id: customerId || null,
    status: 'confirmed',
    promised_delivery_at: formData.get('promised_delivery_at') as string,
    total_amount: totalValue,
    advance_amount: advanceAmount,
    // advance_pct is GENERATED ALWAYS — do not insert
    advance_paid_at: advanceAmount > 0 ? new Date().toISOString() : null,
    advance_payment_method: paymentMethod,
    advance_override_by: user.id,
    advance_override_note: overrideReason,
    branch_id: profile?.branch_id ?? null,
    notes: formData.get('notes') as string || null,
    created_by: user.id,
  }).select('id').single()

  if (error) return { error: error.message }

  const bookingId = (booking as { id: string }).id

  // Record advance payment
  if (advanceAmount > 0) {
    await service.from('payments').insert({
      booking_id: bookingId,
      customer_id: customerId || null,
      amount: advanceAmount,
      payment_mode: paymentMethod,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      proof_url: proofUrl,
      is_advance: true,
      type: 'payment',
      recorded_by: user.id,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Advance payment at booking (manager override). Method: ${paymentMethod}`,
    })
  }

  await db.from('quotations').update({ status: 'accepted' }).eq('id', quotationId)

  // Audit log
  await service.from('audit_logs').insert({
    action: 'override',
    table_name: 'bookings',
    record_id: bookingId,
    new_data: { override_type: 'advance_waiver', reason: overrideReason },
    performed_by: user.id,
    notes: `Advance override at booking: ${overrideReason}`,
  })

  revalidatePath('/sales/bookings')
  revalidatePath('/accounts/payments')
  revalidatePath('/accounts')
  revalidatePath('/owner')
  revalidatePath('/manager/activity')
  redirect(`/manager/jobs/new?booking=${bookingId}`)
}
