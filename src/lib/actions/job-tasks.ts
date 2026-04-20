'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createJobTask(jobCardId: string, title: string, assignedTo?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }
  // Use service client — RLS may block technician inserts on job_tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: existing } = await service
    .from('job_tasks')
    .select('order_index')
    .eq('job_card_id', jobCardId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1

  const { error } = await service.from('job_tasks').insert({
    job_card_id: jobCardId,
    title,
    status: 'pending',
    assigned_to: assignedTo || null,
    order_index: nextOrder,
  })

  if (error) return { error: error.message }

  revalidatePath(`/manager/jobs/${jobCardId}`)
  revalidatePath(`/technician/${jobCardId}`)
  return { success: true }
}

export async function updateJobTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed', jobCardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { status }
  if (status === 'completed') update.completed_at = new Date().toISOString()

  const { error } = await service.from('job_tasks').update(update).eq('id', taskId)
  if (error) return { error: error.message }

  revalidatePath(`/manager/jobs/${jobCardId}`)
  revalidatePath(`/technician/${jobCardId}`)
  return { success: true }
}

/** Technician posts a progress update — notifies booking creator + all owners/managers */
export async function postTechnicianUpdate(jobCardId: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Fetch technician name + job context in parallel
  const [techRes, jobRes] = await Promise.all([
    service.from('profiles').select('full_name').eq('id', user.id).single(),
    service
      .from('job_cards')
      .select('id, reg_number, status, customer_id, customers(full_name), bookings(id, created_by, lead_id, leads(contact_name, car_reg_no))')
      .eq('id', jobCardId)
      .single(),
  ])

  const techName = (techRes.data as { full_name: string } | null)?.full_name ?? 'Technician'
  const job = jobRes.data as {
    id: string
    reg_number: string
    status: string
    customers: { full_name: string } | null
    bookings: {
      id: string
      created_by: string | null
      lead_id: string | null
      leads: { contact_name: string; car_reg_no: string | null } | null
    } | null
  } | null

  if (!job) return { error: 'Job not found' }

  // Fetch current checklist tasks
  const { data: tasksData } = await service
    .from('job_tasks')
    .select('title, status')
    .eq('job_card_id', jobCardId)
    .order('order_index')

  const tasks = (tasksData ?? []) as Array<{ title: string; status: string }>
  const doneCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length

  const customerName = (job.customers as { full_name: string } | null)?.full_name
    ?? (job.bookings?.leads as { contact_name: string } | null)?.contact_name
    ?? 'Customer'
  const carReg = job.reg_number
  const bookingCreatedBy = job.bookings?.created_by ?? null

  // Build notification message
  const checklistSummary = totalCount > 0
    ? `Checklist: ${doneCount}/${totalCount} items done.`
    : 'No checklist items yet.'

  const doneTitles = tasks.filter((t) => t.status === 'completed').map((t) => `✓ ${t.title}`)
  const pendingTitles = tasks.filter((t) => t.status !== 'completed').map((t) => `○ ${t.title}`)
  const checklistLines = [...doneTitles, ...pendingTitles].join('\n')

  const title = `Job Update: ${carReg}`
  const message = `${techName} posted a progress update for ${customerName} (${carReg}).\n${checklistSummary}${checklistLines ? `\n\n${checklistLines}` : ''}`

  // Collect recipient IDs: booking creator + all owners + all branch_managers
  const recipientSet = new Set<string>()
  if (bookingCreatedBy) recipientSet.add(bookingCreatedBy)

  const { data: managersData } = await service
    .from('profiles')
    .select('id')
    .in('role', ['owner', 'branch_manager'])
    .eq('is_active', true)

  for (const m of (managersData ?? []) as Array<{ id: string }>) {
    recipientSet.add(m.id)
  }

  // Remove the technician themselves from recipients
  recipientSet.delete(user.id)

  const recipients = Array.from(recipientSet)

  if (recipients.length > 0) {
    await service.from('internal_notifications').insert(
      recipients.map((uid) => ({
        user_id: uid,
        title,
        message,
        entity_type: 'job_card',
        entity_id: jobCardId,
        is_read: false,
      })),
    )
  }

  revalidatePath(`/technician/${jobCardId}`)
  revalidatePath(`/manager/jobs/${jobCardId}`)
  return { success: true }
}
