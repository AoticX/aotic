'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFault(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()

  const jobCardId = formData.get('job_card_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const categoryId = formData.get('category_id') as string || null
  const severity = formData.get('severity') as string || 'medium'

  if (!jobCardId || !title) return { error: 'Job card and title are required' }

  const { error } = await db.from('job_issues').insert({
    job_card_id: jobCardId,
    title,
    description: description || null,
    category_id: categoryId,
    severity,
    status: 'open',
    reported_by: user!.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/manager/faults')
  revalidatePath(`/manager/jobs/${jobCardId}`)
  return { success: true }
}

export async function updateFaultStatus(faultId: string, status: string, resolutionNotes?: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const update: Record<string, unknown> = { status }
  if (resolutionNotes) update.resolution_notes = resolutionNotes
  if (status === 'resolved') update.resolved_at = new Date().toISOString()

  const { error } = await db.from('job_issues').update(update).eq('id', faultId)
  if (error) return { error: error.message }

  revalidatePath('/manager/faults')
  return { success: true }
}
