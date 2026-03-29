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

  const raw = {
    contact_name: formData.get('contact_name') as string,
    contact_phone: formData.get('contact_phone') as string,
    contact_email: formData.get('contact_email') as string || undefined,
    car_model: formData.get('car_model') as string || undefined,
    car_reg_no: formData.get('car_reg_no') as string || undefined,
    service_interest: formData.get('service_interest') as string || undefined,
    vertical_id: formData.get('vertical_id') as string || undefined,
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
    redirect(`/dashboard/sales/leads/new?error=${encodeURIComponent(msg)}`)
  }

  const { data: profileData } = await supabase
    .from('profiles').select('branch_id').eq('id', user.id).single()
  const profile = profileData as { branch_id: string | null } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lead, error } = await (supabase.from('leads') as any)
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

  if (error) redirect(`/dashboard/sales/leads/new?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/dashboard/sales/leads')
  redirect(`/dashboard/sales/leads/${(lead as { id: string }).id}`)
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

  revalidatePath(`/dashboard/sales/leads/${leadId}`)
  revalidatePath('/dashboard/sales/leads')
  return { success: true }
}

export async function assignLead(leadId: string, assignedTo: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('leads') as any)
    .update({ assigned_to: assignedTo })
    .eq('id', leadId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/sales/leads/${leadId}`)
  return { success: true }
}
