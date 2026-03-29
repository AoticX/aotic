'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createBooking(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const quotationId = formData.get('quotation_id') as string
  const leadId = formData.get('lead_id') as string
  const customerId = formData.get('customer_id') as string
  const totalValue = Number(formData.get('total_value'))
  const advanceAmount = Number(formData.get('advance_amount') || 0)
  const advancePct = totalValue > 0 ? (advanceAmount / totalValue) * 100 : 0
  const promisedDelivery = formData.get('promised_delivery_at') as string
  const paymentMethod = formData.get('advance_payment_method') as string || null

  if (!promisedDelivery) {
    redirect(`/dashboard/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent('Promised delivery date is required')}`)
  }

  // 70% advance hard lock — no override here, manager override handled separately
  if (advancePct < 70) {
    redirect(`/dashboard/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent(`Minimum 70% advance required. Current: ${advancePct.toFixed(1)}%`)}`)
  }

  const { data: profileData } = await supabase
    .from('profiles').select('branch_id').eq('id', user.id).single()
  const profile = profileData as { branch_id: string | null } | null

  const { data: booking, error } = await db.from('bookings').insert({
    lead_id: leadId,
    quotation_id: quotationId,
    customer_id: customerId,
    status: 'confirmed',
    promised_delivery_at: promisedDelivery,
    total_value: totalValue,
    advance_amount: advanceAmount,
    advance_paid_at: advanceAmount > 0 ? new Date().toISOString() : null,
    advance_payment_method: paymentMethod,
    branch_id: profile?.branch_id ?? null,
    notes: formData.get('notes') as string || null,
    created_by: user.id,
  }).select('id').single()

  if (error) redirect(`/dashboard/sales/bookings/new?quote=${quotationId}&error=${encodeURIComponent(error.message)}`)

  // Mark quotation as accepted if not already
  await db.from('quotations').update({ status: 'accepted' }).eq('id', quotationId)

  revalidatePath('/dashboard/sales/bookings')
  redirect(`/dashboard/sales/bookings/${(booking as { id: string }).id}`)
}

export async function createBookingWithOverride(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role, branch_id').eq('id', user.id).single()
  const profile = profileData as { role: string; branch_id: string | null } | null

  if (!['owner', 'branch_manager'].includes(profile?.role ?? '')) {
    return { error: 'Only Owner or Branch Manager can override the 70% advance requirement.' }
  }

  const overrideReason = formData.get('override_reason') as string
  if (!overrideReason || overrideReason.length < 20) {
    return { error: 'Override reason must be at least 20 characters.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const quotationId = formData.get('quotation_id') as string
  const { data: booking, error } = await db.from('bookings').insert({
    lead_id: formData.get('lead_id') as string,
    quotation_id: quotationId,
    customer_id: formData.get('customer_id') as string,
    status: 'confirmed',
    promised_delivery_at: formData.get('promised_delivery_at') as string,
    total_value: Number(formData.get('total_value')),
    advance_amount: Number(formData.get('advance_amount') || 0),
    advance_paid_at: Number(formData.get('advance_amount') || 0) > 0 ? new Date().toISOString() : null,
    advance_payment_method: formData.get('advance_payment_method') as string || null,
    advance_override_by: user.id,
    advance_override_note: overrideReason,
    branch_id: profile?.branch_id ?? null,
    notes: formData.get('notes') as string || null,
    created_by: user.id,
  }).select('id').single()

  if (error) return { error: error.message }

  // Audit log
  await db.from('audit_logs').insert({
    action: 'override',
    table_name: 'bookings',
    record_id: (booking as { id: string }).id,
    new_data: { override_type: 'advance_waiver', reason: overrideReason },
    performed_by: user.id,
    notes: `70% advance override: ${overrideReason}`,
  })

  revalidatePath('/dashboard/sales/bookings')
  redirect(`/dashboard/sales/bookings/${(booking as { id: string }).id}`)
}
