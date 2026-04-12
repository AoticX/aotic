'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFault(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // Service client — managers may be RLS-blocked from writing to job_issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

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
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/manager/faults')
  revalidatePath(`/manager/jobs/${jobCardId}`)
  return { success: true }
}

export async function updateFaultStatus(faultId: string, status: string, resolutionNotes?: string) {
  // Service client — managers may be RLS-blocked from updating job_issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const update: Record<string, unknown> = { status }
  if (resolutionNotes) update.resolution_notes = resolutionNotes
  if (status === 'resolved') update.resolved_at = new Date().toISOString()

  const { error } = await db.from('job_issues').update(update).eq('id', faultId)
  if (error) return { error: error.message }

  revalidatePath('/manager/faults')
  return { success: true }
}
