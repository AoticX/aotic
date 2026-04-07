'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function startTimer(jobCardId: string): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // Service client needed to update job_cards — RLS blocks technician writes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Block if an open timer already exists for this job+tech
  const { data: existing } = await db
    .from('technician_time_logs')
    .select('id')
    .eq('job_card_id', jobCardId)
    .eq('technician_id', user.id)
    .is('ended_at', null)
    .maybeSingle()
  if (existing) return { error: 'A timer is already running for this job.' }

  // Transition job status to in_progress if still created (service client — RLS blocks technician update)
  await service
    .from('job_cards')
    .update({ status: 'in_progress' })
    .eq('id', jobCardId)
    .eq('status', 'created')

  const { data, error } = await db
    .from('technician_time_logs')
    .insert({ job_card_id: jobCardId, technician_id: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/technician/${jobCardId}`)
  revalidatePath('/technician/timer')
  return { id: (data as { id: string }).id }
}

export async function stopTimer(logId: string, notes?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch the log including started_at so we can compute duration
  const { data: logData } = await db
    .from('technician_time_logs')
    .select('id, job_card_id, technician_id, started_at')
    .eq('id', logId)
    .eq('technician_id', user.id)
    .single()
  if (!logData) return { error: 'Timer not found or not yours.' }

  const log = logData as { id: string; job_card_id: string; technician_id: string; started_at: string }

  const endedAt = new Date()
  const startedAt = new Date(log.started_at)
  const durationMins = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))

  const { error } = await db
    .from('technician_time_logs')
    .update({
      ended_at: endedAt.toISOString(),
      duration_mins: durationMins,
      notes: notes ?? null,
    })
    .eq('id', logId)
  if (error) return { error: error.message }

  revalidatePath(`/technician/${log.job_card_id}`)
  revalidatePath('/technician/timer')
  return {}
}

export async function getActiveTimer(jobCardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('technician_time_logs')
    .select('id, started_at')
    .eq('job_card_id', jobCardId)
    .eq('technician_id', user.id)
    .is('ended_at', null)
    .maybeSingle()
  return data as { id: string; started_at: string } | null
}

export async function getTimeLogs(jobCardId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('technician_time_logs')
    .select('id, started_at, ended_at, duration_mins, notes, profiles(full_name)')
    .eq('job_card_id', jobCardId)
    .order('started_at', { ascending: false })
  return (data ?? []) as {
    id: string; started_at: string; ended_at: string | null
    duration_mins: number | null; notes: string | null
    profiles: { full_name: string } | null
  }[]
}
