'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function createJobCard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role, branch_id').eq('id', user.id).single()
  const profile = profileData as { role: string; branch_id: string | null } | null

  const userRole = profile?.role ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const service = createServiceClient() as any

  const bookingId = formData.get('booking_id') as string

  const assignedTechnician = (formData.get('assigned_to') as string) || null
  const assignedQc = (formData.get('supervised_by') as string) || null

  if (!assignedTechnician || !assignedQc) {
    redirect(`/manager/jobs/new?booking=${bookingId}&error=${encodeURIComponent('Technician and QC assignment are required while creating job card.')}`)
  }

  // Use service client — regular auth client can't read other users' profiles (RLS)
  const [{ data: techProfile }, { data: qcProfile }] = await Promise.all([
    service.from('profiles').select('id, role, is_active').eq('id', assignedTechnician).maybeSingle(),
    service.from('profiles').select('id, role, is_active').eq('id', assignedQc).maybeSingle(),
  ])

  const tech = techProfile as { id: string; role: string; is_active: boolean } | null
  const qc = qcProfile as { id: string; role: string; is_active: boolean } | null

  if (!tech || tech.role !== 'workshop_technician' || !tech.is_active) {
    redirect(`/manager/jobs/new?booking=${bookingId}&error=${encodeURIComponent('Please assign an active workshop technician.')}`)
  }

  if (!qc || !['qc_inspector', 'branch_manager', 'owner'].includes(qc.role) || !qc.is_active) {
    redirect(`/manager/jobs/new?booking=${bookingId}&error=${encodeURIComponent('Please assign an active QC inspector/supervisor.')}`)
  }

  // Re-validate 50% advance — use service client to bypass RLS
  const { data: bookingData } = await service
    .from('bookings').select('id, lead_id, created_by, advance_amount, advance_pct, advance_override_by, advance_override_note, quotation_id, customer_id').eq('id', bookingId).single()
  const booking = bookingData as {
    id: string; lead_id: string; created_by: string | null; advance_amount: number
    advance_pct: number; advance_override_by: string | null
    advance_override_note: string | null; quotation_id: string; customer_id: string
  } | null

  if (!booking) redirect('/sales?error=Booking+not+found')

  const canCreate = ['owner', 'branch_manager'].includes(userRole) || booking.created_by === user.id
  if (!canCreate) {
    redirect(`/sales/bookings/${bookingId}?error=${encodeURIComponent('Only booking creator, manager, or owner can create this job card.')}`)
  }

  const hasOverride = !!booking.advance_override_by && !!booking.advance_override_note
  if (booking.advance_pct < 50 && !hasOverride) {
    redirect(`/sales/bookings/${bookingId}?error=${encodeURIComponent('Cannot create job card: 50% advance not met and no manager override exists.')}`)
  }

  const bodyConditionRaw = formData.get('body_condition_map') as string
  const bodyCondition = bodyConditionRaw ? JSON.parse(bodyConditionRaw) : {}

  const { data: jobCard, error } = await service.from('job_cards').insert({
    booking_id: bookingId,
    lead_id: booking.lead_id,
    quotation_id: booking.quotation_id,
    customer_id: booking.customer_id || null,
    status: 'created',
    reg_number: formData.get('reg_number') as string,
    odometer_reading: formData.get('odometer_reading') ? Number(formData.get('odometer_reading')) : null,
    fuel_level_pct: null,
    body_condition_map: bodyCondition,
    belongings_inventory: null,
    spare_parts_check: false,
    customer_concerns: formData.get('customer_concerns') as string || null,
    intake_signature_url: formData.get('intake_signature_url') as string || null,
    intake_signed_at: formData.get('intake_signature_url') ? new Date().toISOString() : null,
    assigned_to: assignedTechnician,
    supervised_by: assignedQc,
    branch_id: profile?.branch_id ?? null,
    bay_number: formData.get('bay_number') as string || null,
    estimated_completion: formData.get('estimated_completion') as string || null,
    notes: formData.get('notes') as string || null,
    created_by: user.id,
  }).select('id').single()

  if (error) {
    redirect(`/sales/bookings/${bookingId}?error=${encodeURIComponent(error.message)}`)
  }

  const createdJobCardId = (jobCard as { id: string }).id

  // Notify all accounts users immediately when job card is created.
  const { data: accountsProfiles } = await service
    .from('profiles')
    .select('id')
    .eq('role', 'accounts_finance')
    .eq('is_active', true)

  const recipients = ((accountsProfiles ?? []) as Array<{ id: string }>).map((p) => p.id)
  if (recipients.length > 0) {
    await service.from('internal_notifications').insert(
      recipients.map((accountId) => ({
        user_id: accountId,
        title: 'New Job Card Created',
        message: `Job card ${createdJobCardId.slice(0, 8).toUpperCase()} created. Booking advance received: Rs. ${Number(booking.advance_amount ?? 0).toLocaleString('en-IN')}.`,
        entity_type: 'job_card',
        entity_id: createdJobCardId,
        is_read: false,
      })),
    )
  }

  // Reserve materials if any items specified
  const itemsJson = formData.get('items_json') as string
  if (itemsJson) {
    const items = JSON.parse(itemsJson) as { inventory_item_id: string; qty: number }[]
    for (const item of items) {
      await db.from('inventory_transactions').insert({
        item_id: item.inventory_item_id,
        job_card_id: createdJobCardId,
        transaction_type: 'reserve',
        qty: item.qty,
        created_by: user.id,
      })
    }
  }

  revalidatePath('/manager/jobs')
  revalidatePath('/accounts')
  revalidatePath('/owner')
  revalidatePath('/manager/activity')
  revalidatePath(`/sales/bookings/${bookingId}`)
  if (['owner', 'branch_manager'].includes(userRole)) {
    redirect(`/manager/jobs/${createdJobCardId}`)
  }
  redirect(`/sales/bookings/${bookingId}?success=${encodeURIComponent(`Job card ${createdJobCardId.slice(0, 8).toUpperCase()} created and accounts notified.`)}`)
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

/** Supervisor acknowledges rework, adds notes + deadline, moves job back to in_progress */
export async function startReworkCycle(
  jobCardId: string,
  reworkNotes: string,
  reworkDeadline: string | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('job_cards')
    .update({
      status: 'in_progress',
      notes: reworkNotes || null,
      estimated_completion: reworkDeadline || null,
    })
    .eq('id', jobCardId)
    .eq('status', 'rework_scheduled')

  if (error) return { error: error.message }
  revalidatePath(`/manager/jobs/${jobCardId}`)
  return {}
}
