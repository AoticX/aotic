'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeadSchema } from '@/lib/validations'
import type { LeadStatus } from '@/types/database'

export async function createLead(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parse multi-vertical IDs (submitted as JSON array)
  const verticalIdsRaw = formData.get('vertical_ids') as string | null
  const verticalIds: string[] = verticalIdsRaw ? JSON.parse(verticalIdsRaw) : []

  const raw = {
    contact_name: formData.get('contact_name') as string,
    contact_phone: formData.get('contact_phone') as string,
    contact_email: formData.get('contact_email') as string || undefined,
    car_brand: formData.get('car_brand') as string || undefined,
    car_model: formData.get('car_model') as string || undefined,
    car_reg_no: formData.get('car_reg_no') as string || undefined,
    service_interest: formData.get('service_interest') as string || undefined,
    vertical_id: verticalIds[0] || undefined,
    estimated_budget: formData.get('estimated_budget')
      ? Number(formData.get('estimated_budget'))
      : undefined,
    source: formData.get('source') as string,
    status: (formData.get('status') as LeadStatus) || 'hot',
    notes: formData.get('notes') as string || undefined,
  }

  const parsed = LeadSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Validation error'
    redirect(`/sales/leads/new?error=${encodeURIComponent(msg)}`)
  }

  const { data: profileData } = await supabase
    .from('profiles').select('branch_id').eq('id', user.id).single()
  const profile = profileData as { branch_id: string | null } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: lead, error } = await db
    .from('leads')
    .insert({
      ...parsed.data,
      contact_email: parsed.data.contact_email || null,
      car_model: parsed.data.car_model || null,
      car_reg_no: parsed.data.car_reg_no || null,
      service_interest: parsed.data.service_interest || null,
      vertical_id: parsed.data.vertical_id || null,
      estimated_budget: parsed.data.estimated_budget ?? null,
      notes: parsed.data.notes || null,
      assigned_to: user.id,
      branch_id: profile?.branch_id ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) redirect(`/sales/leads/new?error=${encodeURIComponent(error.message)}`)

  const newLeadId = (lead as { id: string }).id

  // Insert all selected verticals into junction table
  if (verticalIds.length > 0) {
    await db.from('lead_verticals').insert(
      verticalIds.map((vid: string) => ({ lead_id: newLeadId, vertical_id: vid }))
    )
  }

  revalidatePath('/sales/leads')
  redirect(`/sales/leads/${newLeadId}`)
}

export async function updateLeadStatus(leadId: string, status: LeadStatus, lostReasonId?: string, lostNotes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (status === 'lost' && !lostReasonId) {
    return { error: 'A reason code is required when marking a lead as lost.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('leads') as any)
    .update({
      status,
      lost_reason_id: lostReasonId ?? null,
      lost_notes: lostNotes ?? null,
      lost_at: status === 'lost' ? new Date().toISOString() : null,
    })
    .eq('id', leadId)

  if (error) return { error: error.message }

  revalidatePath(`/sales/leads/${leadId}`)
  revalidatePath('/sales/leads')
  return { success: true }
}

export async function updateLead(leadId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parse multi-vertical IDs
  const verticalIdsRaw = formData.get('vertical_ids') as string | null
  const verticalIds: string[] = verticalIdsRaw ? JSON.parse(verticalIdsRaw) : []

  const raw = {
    contact_name: formData.get('contact_name') as string,
    contact_phone: formData.get('contact_phone') as string,
    contact_email: formData.get('contact_email') as string || undefined,
    car_brand: formData.get('car_brand') as string || undefined,
    car_model: formData.get('car_model') as string || undefined,
    car_reg_no: formData.get('car_reg_no') as string || undefined,
    vertical_id: verticalIds[0] || undefined,
    estimated_budget: formData.get('estimated_budget')
      ? Number(formData.get('estimated_budget'))
      : undefined,
    source: formData.get('source') as string,
    status: (formData.get('status') as LeadStatus) || 'hot',
    notes: formData.get('notes') as string || undefined,
  }

  const parsed = LeadSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Validation error'
    redirect(`/sales/leads/${leadId}/edit?error=${encodeURIComponent(msg)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('leads')
    .update({
      contact_name: parsed.data.contact_name,
      contact_phone: parsed.data.contact_phone,
      contact_email: parsed.data.contact_email || null,
      car_brand: parsed.data.car_brand || null,
      car_model: parsed.data.car_model || null,
      car_reg_no: parsed.data.car_reg_no || null,
      vertical_id: parsed.data.vertical_id || null,
      estimated_budget: parsed.data.estimated_budget ?? null,
      source: parsed.data.source,
      notes: parsed.data.notes || null,
    })
    .eq('id', leadId)

  if (error) redirect(`/sales/leads/${leadId}/edit?error=${encodeURIComponent(error.message)}`)

  // Replace junction table rows for this lead
  await db.from('lead_verticals').delete().eq('lead_id', leadId)
  if (verticalIds.length > 0) {
    await db.from('lead_verticals').insert(
      verticalIds.map((vid: string) => ({ lead_id: leadId, vertical_id: vid }))
    )
  }

  revalidatePath(`/sales/leads/${leadId}`)
  revalidatePath('/sales/leads')
  redirect(`/sales/leads/${leadId}`)
}

export async function deleteLead(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profileData as { role: string } | null)?.role !== 'owner') {
    return { error: 'Only the owner can delete leads.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = (await import('@/lib/supabase/server')).createServiceClient() as any

  const { data: jobCards } = await svc.from('job_cards').select('id').eq('lead_id', leadId).limit(1)
  if (jobCards && jobCards.length > 0) {
    return { error: 'Cannot delete a lead that has job cards. Close or delete the job cards first.' }
  }

  const { error } = await svc.from('leads').delete().eq('id', leadId)
  if (error) return { error: error.message }

  redirect('/owner/leads')
}

export async function assignLead(leadId: string, assignedTo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profileData as { role: string } | null)?.role
  if (!['owner', 'branch_manager'].includes(role ?? '')) {
    return { error: 'Only Owner or Branch Manager can assign leads.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('leads') as any)
    .update({ assigned_to: assignedTo })
    .eq('id', leadId)

  if (error) return { error: error.message }
  revalidatePath(`/sales/leads/${leadId}`)
  return { success: true }
}
