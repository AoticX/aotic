'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type CommType = 'call' | 'whatsapp' | 'visit' | 'email' | 'note'

export async function logCommunication(leadId: string, type: CommType, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!notes.trim()) return { error: 'Notes are required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('communications').insert({
    lead_id: leadId,
    type,
    notes: notes.trim(),
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/sales/leads/${leadId}`)
  revalidatePath(`/manager/leads`)
  return { success: true }
}

export async function scheduleFollowUp(leadId: string, scheduledAt: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('lead_activities').insert({
    lead_id: leadId,
    type: 'follow_up',
    content: notes || 'Follow-up scheduled',
    scheduled_at: scheduledAt,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/sales/leads/${leadId}`)
  revalidatePath('/manager')
  return { success: true }
}
