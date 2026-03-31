'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createJobTask(jobCardId: string, title: string, assignedTo?: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Get max order_index for this job
  const { data: existing } = await db
    .from('job_tasks')
    .select('order_index')
    .eq('job_card_id', jobCardId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1

  const { error } = await db.from('job_tasks').insert({
    job_card_id: jobCardId,
    title,
    status: 'pending',
    assigned_to: assignedTo || null,
    order_index: nextOrder,
  })

  if (error) return { error: error.message }

  revalidatePath(`/manager/jobs/${jobCardId}`)
  revalidatePath(`/technician`)
  return { success: true }
}

export async function updateJobTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'done', jobCardId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const update: Record<string, unknown> = { status }
  if (status === 'done') update.completed_at = new Date().toISOString()

  const { error } = await db.from('job_tasks').update(update).eq('id', taskId)
  if (error) return { error: error.message }

  revalidatePath(`/manager/jobs/${jobCardId}`)
  revalidatePath(`/technician`)
  return { success: true }
}
