'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createJobCard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role, branch_id').eq('id', user.id).single()
  const profile = profileData as { role: string; branch_id: string | null } | null

  if (!['owner', 'branch_manager'].includes(profile?.role ?? '')) {
    redirect('/manager?error=Only+managers+can+create+job+cards')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const bookingId = formData.get('booking_id') as string

  // Re-validate 70% advance at DB action level
  const { data: bookingData } = await db
    .from('bookings').select('advance_pct, advance_override_by, advance_override_note, quotation_id, customer_id').eq('id', bookingId).single()
  const booking = bookingData as {
    advance_pct: number; advance_override_by: string | null
    advance_override_note: string | null; quotation_id: string; customer_id: string
  } | null

  if (!booking) redirect('/manager?error=Booking+not+found')

  const hasOverride = !!booking.advance_override_by && !!booking.advance_override_note
  if (booking.advance_pct < 70 && !hasOverride) {
    redirect(`/sales/bookings/${bookingId}?error=${encodeURIComponent('Cannot create job card: 70% advance not met and no manager override exists.')}`)
  }

  const bodyConditionRaw = formData.get('body_condition_map') as string
  const bodyCondition = bodyConditionRaw ? JSON.parse(bodyConditionRaw) : {}

  const belongingsRaw = formData.get('belongings_inventory') as string
  const belongings = belongingsRaw
    ? belongingsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  const { data: jobCard, error } = await db.from('job_cards').insert({
    booking_id: bookingId,
    quotation_id: booking.quotation_id,
    customer_id: booking.customer_id,
    status: 'created',
    reg_number: formData.get('reg_number') as string,
    odometer_reading: formData.get('odometer_reading') ? Number(formData.get('odometer_reading')) : null,
    fuel_level_pct: formData.get('fuel_level_pct') ? Number(formData.get('fuel_level_pct')) : null,
    body_condition_map: bodyCondition,
    belongings_inventory: belongings.length ? belongings : null,
    spare_parts_check: formData.get('spare_parts_check') === 'true',
    customer_concerns: formData.get('customer_concerns') as string || null,
    intake_signature_url: formData.get('intake_signature_url') as string || null,
    intake_signed_at: formData.get('intake_signature_url') ? new Date().toISOString() : null,
    supervised_by: user.id,
    branch_id: profile?.branch_id ?? null,
    bay_number: formData.get('bay_number') as string || null,
    estimated_completion: formData.get('estimated_completion') as string || null,
    notes: formData.get('notes') as string || null,
    created_by: user.id,
  }).select('id').single()

  if (error) {
    redirect(`/sales/bookings/${bookingId}?error=${encodeURIComponent(error.message)}`)
  }

  // Reserve materials if any items specified
  const itemsJson = formData.get('items_json') as string
  if (itemsJson) {
    const items = JSON.parse(itemsJson) as { inventory_item_id: string; qty: number }[]
    for (const item of items) {
      await db.from('inventory_transactions').insert({
        item_id: item.inventory_item_id,
        job_card_id: (jobCard as { id: string }).id,
        transaction_type: 'reserve',
        qty: item.qty,
        created_by: user.id,
      })
    }
  }

  revalidatePath('/manager/jobs')
  revalidatePath(`/sales/bookings/${bookingId}`)
  redirect(`/manager/jobs/${(jobCard as { id: string }).id}`)
}

export async function updateJobCardStatus(jobCardId: string, status: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('job_cards')
    .update({ status })
    .eq('id', jobCardId)

  if (error) return { error: error.message }
  revalidatePath(`/manager/jobs/${jobCardId}`)
  return { success: true }
}

export async function assignTechnician(jobCardId: string, technicianId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('job_cards')
    .update({ assigned_to: technicianId })
    .eq('id', jobCardId)

  if (error) return { error: error.message }
  revalidatePath(`/manager/jobs/${jobCardId}`)
  return { success: true }
}
