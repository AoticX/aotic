'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type CommType = 'call' | 'whatsapp' | 'visit' | 'email' | 'note'

export async function logCommunication(leadId: string, type: CommType, notes: string) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  if (!notes.trim()) return { error: 'Notes are required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service.from('communications').insert({
    lead_id: leadId,
    type,
    notes: notes.trim(),
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/sales/leads/${leadId}`)
  return { success: true }
}

export async function scheduleFollowUp(leadId: string, scheduledAt: string, notes?: string) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service.from('lead_activities').insert({
    lead_id: leadId,
    type: 'follow_up',
    content: notes || 'Follow-up scheduled',
    scheduled_at: scheduledAt,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/sales/leads/${leadId}`)
  return { success: true }
}
